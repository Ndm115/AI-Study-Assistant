
require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const { GoogleGenAI } = require("@google/genai");
const os = require("os");
const fs = require("fs");

const app = express();
const PORT = 3000;

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET is missing from .env");
    process.exit(1);
}

// ============================================================
// GEMINI SETUP
// ============================================================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

async function generateWithGemini(prompt) {
    const models = [
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.8-flash"
    ];

    let lastError;

    for (const model of models) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(
                    `Gemini request: ${model}, attempt ${attempt}`
                );

                return await ai.models.generateContent({
                    model,
                    contents: prompt
                });

            } catch (error) {
                lastError = error;

                const status = Number(
                    error.status || error.statusCode || error.code
                );

                if (![408, 429, 500, 502, 503, 504].includes(status)) {
                    throw error;
                }

                if (attempt < 3) {
                    await sleep(
                        1000 * Math.pow(2, attempt - 1)
                    );
                }
            }
        }
    }

    throw lastError;
}

// ============================================================
// MIDDLEWARE
// ============================================================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

app.use(cors({
    origin: function (origin, callback) {
        if (
            !origin ||
            origin === "null" ||
            /^http:\/\/localhost(?::\d+)?$/.test(origin) ||
            /^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)
        ) {
            return callback(null, true);
        }

        callback(new Error("Origin not allowed."));
    },
    credentials: true
}));

app.use(express.json({
    limit: "10mb"
}));

app.use(session({
    name: "marco.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ============================================================
// SERVE MARCO FRONTEND
// ============================================================

// Only serve the frontend files, not the database or .env.

const frontendFiles = [
    "index.html",
    "landing.html",
    "dashboard.html",
    "admin.html",
    "upload.html",
    "summary.html",
    "quiz.html",
    "flashcards.html",
    "planner.html",
    "tutor.html",
    "feedback.html",
    "script.js",
    "style.css"
];

frontendFiles.forEach(file => {
    app.get("/" + file, (req, res) => {
        res.sendFile(path.join(__dirname, file));
    });
});

// Open the login page at localhost:3000.

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ============================================================
// DATABASE
// ============================================================

const db = new sqlite3.Database(
    "./study_assistant.db",
    err => {
        if (err) {
            console.error(
                "Database connection failed:",
                err.message
            );
        } else {
            console.log(
                "Connected to Marco SQLite database."
            );
        }
    }
);

// ============================================================
// DATABASE HELPER FUNCTIONS
// ============================================================

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    lastID: this.lastID,
                    changes: this.changes
                });
            }
        });
    });
}

function asyncRoute(handler) {
    return (req, res, next) => {
        Promise.resolve(
            handler(req, res, next)
        ).catch(next);
    };
}

// ============================================================
// AUTHENTICATION HELPERS
// ============================================================

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }

    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }

    if (req.session.role !== "admin") {
        return res.status(403).json({
            message: "Administrator access required."
        });
    }

    next();
}

function requireStudent(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }

    if (req.session.role !== "student") {
        return res.status(403).json({
            message: "This feature is for students."
        });
    }

    next();
}

function requireOwnUser(req, res, next) {
    const requestedUserId = Number(req.params.userId);

    if (
        !Number.isInteger(requestedUserId) ||
        requestedUserId !== req.session.userId
    ) {
        return res.status(403).json({
            message: "You cannot access another student's information."
        });
    }

    next();
}

async function getOwnedNote(noteId, userId) {
    return await dbGet(
        `SELECT *
         FROM Notes
         WHERE NoteID = ? AND UserID = ?`,
        [noteId, userId]
    );
}

// ============================================================
// REGISTER
// ============================================================

app.post("/register", asyncRoute(async (req, res) => {
    const { fullName, email, password } = req.body;

    if (
        typeof fullName !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        !fullName.trim() ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            message: "Please complete all fields."
        });
    }

    if (fullName.trim().length < 2) {
        return res.status(400).json({
            message: "Full name must contain at least 2 characters."
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({
            message: "Please enter a valid email address."
        });
    }

    if (
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password)
    ) {
        return res.status(400).json({
            message: "Password must contain at least 8 characters, an uppercase letter, a lowercase letter and a number."
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const result = await dbRun(
            `INSERT INTO Users
             (FullName, Email, Password, Role)
             VALUES (?, ?, ?, 'student')`,
            [
                fullName.trim(),
                email.trim().toLowerCase(),
                hashedPassword
            ]
        );

        res.status(201).json({
            message: "Account created successfully!",
            userId: result.lastID
        });

    } catch (error) {
        if (error.message.includes("UNIQUE")) {
            return res.status(400).json({
                message: "An account with this email already exists."
            });
        }

        throw error;
    }
}));

// ============================================================
// LOGIN - STUDENT AND ADMIN
// ============================================================

app.post("/login", asyncRoute(async (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            message: "Please enter your email and password."
        });
    }

    const user = await dbGet(
        "SELECT * FROM Users WHERE LOWER(Email) = ?",
        [email.trim().toLowerCase()]
    );

    if (!user) {
        return res.status(401).json({
            message: "Incorrect email or password."
        });
    }

    const passwordMatches = await bcrypt.compare(
        password,
        user.Password
    );

    if (!passwordMatches) {
        return res.status(401).json({
            message: "Incorrect email or password."
        });
    }

    // Create a fresh session after successful login.

    req.session.regenerate(err => {
        if (err) {
            return res.status(500).json({
                message: "Unable to start login session."
            });
        }

        req.session.userId = user.UserID;
        req.session.role = user.Role || "student";

        req.session.save(saveErr => {
            if (saveErr) {
                return res.status(500).json({
                    message: "Unable to save login session."
                });
            }

            res.json({
                message: "Login successful!",
                userId: user.UserID,
                fullName: user.FullName,
                role: req.session.role
            });
        });
    });
}));

// ============================================================
// CHECK CURRENT SESSION
// ============================================================

app.get("/auth/me", requireLogin, asyncRoute(async (req, res) => {
    const user = await dbGet(
        `SELECT UserID, FullName, Email, Role
         FROM Users
         WHERE UserID = ?`,
        [req.session.userId]
    );

    if (!user) {
        return res.status(401).json({
            message: "Account no longer exists."
        });
    }

    res.json({
        userId: user.UserID,
        fullName: user.FullName,
        email: user.Email,
        role: user.Role
    });
}));

// ============================================================
// LOGOUT
// ============================================================

app.post("/logout", requireLogin, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({
                message: "Unable to log out."
            });
        }

        res.clearCookie("marco.sid");

        res.json({
            message: "Logged out successfully."
        });
    });
});

// ============================================================
// SAVE STUDY NOTE
// ============================================================

app.post("/notes", requireStudent, asyncRoute(async (req, res) => {
    const { moduleName, noteContent } = req.body;

    if (
        typeof moduleName !== "string" ||
        typeof noteContent !== "string" ||
        !moduleName.trim() ||
        !noteContent.trim()
    ) {
        return res.status(400).json({
            message: "Please enter a module name and study notes."
        });
    }

    const result = await dbRun(
        `INSERT INTO Notes
         (UserID, ModuleName, NoteContent, UploadDate)
         VALUES (?, ?, ?, datetime('now'))`,
        [
            req.session.userId,
            moduleName.trim(),
            noteContent
        ]
    );

    res.status(201).json({
        message: "Study material saved successfully!",
        noteId: result.lastID
    });
}));

// ============================================================
// GET USER STUDY MATERIALS
// ============================================================

app.get(
    "/notes/:userId",
    requireStudent,
    requireOwnUser,
    asyncRoute(async (req, res) => {

        const userId = req.session.userId;

        const notes = await dbAll(
            `SELECT NoteID, ModuleName, UploadDate
             FROM Notes
             WHERE UserID = ?
             ORDER BY UploadDate DESC`,
            [userId]
        );

        const summaryCount = await dbGet(
            `SELECT COUNT(*) AS SummaryCount
             FROM AIResults ar
             INNER JOIN Notes n ON ar.NoteID = n.NoteID
             WHERE n.UserID = ?
               AND ar.Summary IS NOT NULL`,
            [userId]
        );

        res.json({
            notes,
            notesCount: notes.length,
            summaryCount: summaryCount.SummaryCount
        });
    })
);

// ============================================================
// GET SAVED SUMMARIES
// ============================================================

app.get(
    "/summaries/:userId",
    requireStudent,
    requireOwnUser,
    asyncRoute(async (req, res) => {

        const summaries = await dbAll(
            `SELECT
                ar.ResultID,
                ar.NoteID,
                ar.Summary,
                ar.CreatedAt,
                n.ModuleName
             FROM AIResults ar
             INNER JOIN Notes n ON ar.NoteID = n.NoteID
             WHERE n.UserID = ?
               AND ar.Summary IS NOT NULL
             ORDER BY ar.CreatedAt DESC, ar.ResultID DESC`,
            [req.session.userId]
        );

        res.json({ summaries });
    })
);

// ============================================================
// DELETE STUDY MATERIAL
// ============================================================

app.delete(
    "/notes/:noteId",
    requireStudent,
    asyncRoute(async (req, res) => {

        const noteId = req.params.noteId;

        const note = await getOwnedNote(
            noteId,
            req.session.userId
        );

        if (!note) {
            return res.status(404).json({
                message: "Study material not found."
            });
        }

        await dbRun("BEGIN TRANSACTION");

        try {
            await dbRun(
                "DELETE FROM QuizScores WHERE NoteID = ?",
                [noteId]
            );

            await dbRun(
                "DELETE FROM AIResults WHERE NoteID = ?",
                [noteId]
            );

            await dbRun(
                "DELETE FROM Notes WHERE NoteID = ? AND UserID = ?",
                [noteId, req.session.userId]
            );

            await dbRun("COMMIT");

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

        res.json({
            message: "Study material deleted successfully!"
        });
    })
);

// ============================================================
// CHAPTER DETECTION
// ============================================================

function getStudyChapters(noteContent) {
    const lines = noteContent.split(/\r?\n/);

    const chapterPattern =
        /^\s*(?:#{1,6}\s*)?(chapter\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*[:.\-–]\s*.*?)?)\s*$/i;

    const numberWords = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10
    };

    const matches = [];

    lines.forEach((line, index) => {
        const match = line.match(chapterPattern);

        if (!match) return;

        const title = match[1].trim();

        const numberMatch = title.match(
            /^chapter\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i
        );

        if (!numberMatch) return;

        const numberText = numberMatch[1].toLowerCase();

        const chapterNumber = /^\d+$/.test(numberText)
            ? Number(numberText)
            : numberWords[numberText];

        matches.push({
            title,
            number: chapterNumber,
            start: index
        });
    });

    const contentsHeadingIndex = lines.findIndex(line =>
        /^\s*table\s+of\s+contents\s*$/i.test(line)
    );

    const firstChapterOne = matches.find(
        chapter => chapter.number === 1
    );

    const secondChapterOne = firstChapterOne
        ? matches.find(chapter =>
            chapter.number === 1 &&
            chapter.start > firstChapterOne.start
        )
        : null;

    let contentStart = 0;

    if (secondChapterOne) {
        contentStart = secondChapterOne.start;

    } else if (contentsHeadingIndex !== -1) {
        const firstChapter = matches.find(
            chapter => chapter.start > contentsHeadingIndex
        );

        if (firstChapter) {
            contentStart = firstChapter.start;
        }
    }

    const actualMatches = matches.filter(
        chapter => chapter.start >= contentStart
    );

    const uniqueChapters = new Map();

    actualMatches.forEach(chapter => {
        if (!uniqueChapters.has(chapter.number)) {
            uniqueChapters.set(chapter.number, chapter);
        }
    });

    const chapters = Array.from(uniqueChapters.values())
        .sort((a, b) => a.start - b.start);

    return chapters.map((chapter, index) => ({
        index,
        title: chapter.title,
        start: chapter.start,
        end: chapters[index + 1]
            ? chapters[index + 1].start
            : lines.length
    }));
}

// ============================================================
// GET CHAPTERS
// ============================================================

app.get(
    "/chapters/:noteId",
    requireStudent,
    asyncRoute(async (req, res) => {

        const note = await getOwnedNote(
            req.params.noteId,
            req.session.userId
        );

        if (!note) {
            return res.status(404).json({
                message: "Study material not found."
            });
        }

        const chapters = getStudyChapters(note.NoteContent);

        res.json({
            chapters: chapters.map(chapter => ({
                index: chapter.index,
                title: chapter.title
            }))
        });
    })
);

// ============================================================
// GET SELECTED CHAPTER CONTENT
// ============================================================

function getSelectedContent(noteContent, chapter) {
    if (chapter === "all") {
        return {
            content: noteContent,
            title: "All Chapters"
        };
    }

    const chapters = getStudyChapters(noteContent);
    const selectedIndex = Number(chapter);

    if (
        !Number.isInteger(selectedIndex) ||
        selectedIndex < 0 ||
        selectedIndex >= chapters.length
    ) {
        return null;
    }

    const selectedChapter = chapters[selectedIndex];

    const content = noteContent
        .split(/\r?\n/)
        .slice(selectedChapter.start, selectedChapter.end)
        .join("\n")
        .trim();

    if (!content) return null;

    return {
        content,
        title: selectedChapter.title
    };
}


 // ============================================================
 // GENERATE AI FLASHCARDS
 // ============================================================

 app.post(
     "/generate-flashcards",
     requireStudent,
     asyncRoute(async (req, res) => {

         const { noteId, chapter = "all" } = req.body;

         // Check that study material was selected.
         if (!noteId) {
             return res.status(400).json({
                 message: "Please select study material first."
             });
         }

         // Only allow students to use their own notes.
         const note = await getOwnedNote(
             noteId,
             req.session.userId
         );

         if (!note) {
             return res.status(404).json({
                 message: "Study material not found."
             });
         }

         // Reuse Marco's existing chapter selection.
         const selection = getSelectedContent(
             note.NoteContent,
             chapter
         );

         if (!selection) {
             return res.status(400).json({
                 message: "Invalid or empty chapter selected."
             });
         }

         // Ask Gemini to generate flashcard questions and answers.
         const prompt = `
 You are an AI study assistant for university students.

 Generate exactly 10 useful revision flashcards
 using ONLY the study notes below.

 Each flashcard must contain:
 - A clear question
 - A short but informative answer

 Cover important concepts from the selected material.
 Do not introduce information that is not in the notes.

 Return ONLY valid JSON in this format:
 {
   "flashcards": [
     {
       "question": "Example question?",
       "answer": "Example answer."
     }
   ]
 }

 Module: ${note.ModuleName}
 Selected Chapter: ${selection.title}

 Study Notes:
 ${selection.content}
         `;

         const response = await generateWithGemini(prompt);

         // Remove Markdown code fences if Gemini includes them.
         const cleaned = String(response.text || "")
             .replace(/```json/gi, "")
             .replace(/```/g, "")
             .trim();

         let result;

         try {
             result = JSON.parse(cleaned);
         } catch (error) {
             return res.status(502).json({
                 message: "Gemini returned an invalid flashcard format. Please try again."
             });
         }

         // Validate the generated flashcards.
         if (
             !Array.isArray(result.flashcards) ||
             result.flashcards.length !== 10 ||
             !result.flashcards.every(card =>
                 typeof card.question === "string" &&
                 card.question.trim() &&
                 typeof card.answer === "string" &&
                 card.answer.trim()
             )
         ) {
             return res.status(502).json({
                 message: "Flashcards could not be generated correctly. Please try again."
             });
         }

         res.json({
             message: "Flashcards generated successfully!",
             moduleName: note.ModuleName,
             chapterTitle: selection.title,
             flashcards: result.flashcards
         });
     })
 );


// ============================================================
// GENERATE AI SUMMARY
// ============================================================

app.post(
    "/generate-summary",
    requireStudent,
    asyncRoute(async (req, res) => {

        const { noteId, chapter = "all" } = req.body;

        if (!noteId) {
            return res.status(400).json({
                message: "No study material was selected."
            });
        }

        const note = await getOwnedNote(
            noteId,
            req.session.userId
        );

        if (!note) {
            return res.status(404).json({
                message: "Study material was not found."
            });
        }

        const selection = getSelectedContent(
            note.NoteContent,
            chapter
        );

        if (!selection) {
            return res.status(400).json({
                message: "Invalid or empty chapter selected."
            });
        }

        const prompt = `
You are an AI study assistant for university students.

Create a clear and useful study summary from the notes below.

Keep the important facts and concepts.
Use simple language.
Organize the summary so that it is easy to revise from.
Do not add information that is not contained in the student's notes.

IMPORTANT:
Summarize ONLY the study notes provided below.
If a specific chapter is selected, do not summarize other chapters.

Module: ${note.ModuleName}
Selected Chapter: ${selection.title}

Study Notes:
${selection.content}
        `;

        const response = await generateWithGemini(prompt);
        const summary = response.text;

        if (!summary) {
            return res.status(500).json({
                message: "Gemini did not generate a summary."
            });
        }

        const result = await dbRun(
            `INSERT INTO AIResults
             (NoteID, Summary, CreatedAt)
             VALUES (?, ?, datetime('now'))`,
            [noteId, summary]
        );

        res.json({
            message: "Summary generated successfully!",
            resultId: result.lastID,
            moduleName: note.ModuleName,
            chapter,
            chapterTitle: selection.title,
            summary
        });
    })
);

// ============================================================
// QUIZ VALIDATION
// ============================================================

function validateGeneratedQuiz(quiz, quizType) {
    if (
        !quiz ||
        !Array.isArray(quiz.questions) ||
        quiz.questions.length !== 10
    ) {
        return false;
    }

    let multipleCount = 0;
    let trueFalseCount = 0;

    for (const question of quiz.questions) {
        if (
            typeof question.question !== "string" ||
            !question.question.trim() ||
            !Array.isArray(question.options) ||
            !Number.isInteger(question.correctAnswer) ||
            question.correctAnswer < 0 ||
            question.correctAnswer >= question.options.length
        ) {
            return false;
        }

        if (
            question.options.some(option =>
                typeof option !== "string" || !option.trim()
            )
        ) {
            return false;
        }

        if (question.options.length === 4) {
            multipleCount++;

        } else if (
            question.options.length === 2 &&
            question.options[0] === "True" &&
            question.options[1] === "False"
        ) {
            trueFalseCount++;

        } else {
            return false;
        }
    }

    if (quizType === "multiple") {
        return multipleCount === 10;
    }

    if (quizType === "truefalse") {
        return trueFalseCount === 10;
    }

    if (quizType === "mixed") {
        return multipleCount === 5 && trueFalseCount === 5;
    }

    return false;
}

// ============================================================
// GENERATE AI QUIZ
// ============================================================

app.post(
    "/generate-quiz",
    requireStudent,
    asyncRoute(async (req, res) => {

        const {
            noteId,
            chapter = "all",
            quizType = "multiple"
        } = req.body;

        if (!noteId) {
            return res.status(400).json({
                message: "No study material was selected."
            });
        }

        if (!["multiple", "truefalse", "mixed"].includes(quizType)) {
            return res.status(400).json({
                message: "Invalid quiz type selected."
            });
        }

        const note = await getOwnedNote(
            noteId,
            req.session.userId
        );

        if (!note) {
            return res.status(404).json({
                message: "Study material was not found."
            });
        }

        const selection = getSelectedContent(
            note.NoteContent,
            chapter
        );

        if (!selection) {
            return res.status(400).json({
                message: "Invalid or empty chapter selected."
            });
        }

        const quizInstructions = {
            multiple: `
Create exactly 10 multiple-choice questions.
Every question MUST have exactly 4 answer options.
Do not generate True/False questions.
Each question must have exactly one correct answer.
`,
            truefalse: `
Create exactly 10 True/False questions.
Every question MUST have exactly these two options:
["True", "False"]
Do not generate multiple-choice questions with 4 options.
Use correctAnswer 0 for True and 1 for False.
`,
            mixed: `
Create exactly 10 questions.
Exactly 5 questions MUST be multiple-choice with 4 options.
Exactly 5 questions MUST be True/False with options ["True", "False"].
Mix the question types throughout the quiz.
`
        };

        const prompt = `
You are an AI study assistant for university students.

Generate a university-level revision quiz using ONLY
the study notes provided below.

${quizInstructions[quizType]}

IMPORTANT FORMAT RULES:
- Return exactly 10 questions.
- Follow the selected quiz type exactly.
- Use only information from the supplied notes.
- Each question must have one correct answer.
- Multiple-choice questions must have exactly 4 options.
- True/False questions must have exactly 2 options:
  ["True", "False"]
- correctAnswer must be a NUMBER, not a string.
- correctAnswer must be the zero-based index of the correct option.
- Return ONLY valid JSON.
- Do not include Markdown or code fences.
- Do not include explanations outside the JSON.

JSON structure:

{
    "questions": [
        {
            "question": "Question text",
            "options": [
                "Option A",
                "Option B",
                "Option C",
                "Option D"
            ],
            "correctAnswer": 0
        }
    ]
}

For True/False questions, use:
"options": ["True", "False"]

Module: ${note.ModuleName}

Study Notes:
${selection.content}
        `;

        let quiz = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(
                `Generating ${quizType} quiz - attempt ${attempt}/3`
            );

            const retryPrompt = attempt === 1
                ? prompt
                : `${prompt}

CRITICAL REMINDER:
Your previous quiz did not match the required format.
Generate a completely new quiz.
Selected quiz type: ${quizType}
${quizInstructions[quizType]}
There MUST be exactly 10 questions.
Return ONLY valid JSON.`;

            const response = await generateWithGemini(retryPrompt);
            let quizText = response.text;

            if (!quizText) continue;

            quizText = quizText
                .replace(/```json/gi, "")
                .replace(/```/g, "")
                .trim();

            try {
                const generatedQuiz = JSON.parse(quizText);

                if (validateGeneratedQuiz(generatedQuiz, quizType)) {
                    quiz = generatedQuiz;
                    break;
                }

            } catch (error) {
                console.error(
                    "Invalid quiz JSON:",
                    error.message
                );
            }
        }

        if (!quiz) {
            return res.status(500).json({
                message: "Marco could not generate a valid quiz after several attempts. Please try again."
            });
        }

        const result = await dbRun(
            `INSERT INTO AIResults
             (NoteID, QuizQuestions, CreatedAt)
             VALUES (?, ?, datetime('now'))`,
            [noteId, JSON.stringify(quiz.questions)]
        );

        res.json({
            message: "Quiz generated successfully!",
            resultId: result.lastID,
            moduleName: note.ModuleName,
            quizType,
            questions: quiz.questions
        });
    })
);

// ============================================================
// SAVE STUDENT QUIZ SCORE
// ============================================================

app.post(
    "/save-quiz-score",
    requireStudent,
    asyncRoute(async (req, res) => {

        const {
            userId,
            noteId,
            quizType,
            chapter,
            score,
            totalQuestions
        } = req.body;

        if (
            Number(userId) !== req.session.userId ||
            !Number.isInteger(Number(noteId)) ||
            Number(noteId) <= 0 ||
            !["multiple", "truefalse", "mixed"].includes(quizType) ||
            (typeof chapter !== "string" && typeof chapter !== "number") ||
            !Number.isInteger(score) ||
            !Number.isInteger(totalQuestions) ||
            totalQuestions <= 0 ||
            score < 0 ||
            score > totalQuestions
        ) {
            return res.status(400).json({
                message: "Invalid quiz score information."
            });
        }

        const note = await getOwnedNote(
            noteId,
            req.session.userId
        );

        if (!note) {
            return res.status(404).json({
                message: "Study material not found."
            });
        }

        const percentage = Math.round(
            (score / totalQuestions) * 100
        );

        const result = await dbRun(
            `INSERT INTO QuizScores
             (UserID, NoteID, QuizType, Chapter,
              Score, TotalQuestions, Percentage)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.session.userId,
                noteId,
                quizType,
                String(chapter),
                score,
                totalQuestions,
                percentage
            ]
        );

        res.status(201).json({
            message: "Quiz score saved successfully!",
            scoreId: result.lastID,
            percentage
        });
    })
);

// ============================================================
// STUDENT PROGRESS AND READINESS
// ============================================================

app.get(
    "/quiz-progress/:userId",
    requireStudent,
    requireOwnUser,
    asyncRoute(async (req, res) => {

        const history = await dbAll(
            `SELECT
                qs.ScoreID,
                qs.NoteID,
                n.ModuleName,
                qs.QuizType,
                qs.Chapter,
                qs.Score,
                qs.TotalQuestions,
                qs.Percentage,
                qs.CompletedAt
             FROM QuizScores qs
             INNER JOIN Notes n ON n.NoteID = qs.NoteID
             WHERE qs.UserID = ?
               AND n.UserID = ?
             ORDER BY qs.CompletedAt DESC, qs.ScoreID DESC`,
            [req.session.userId, req.session.userId]
        );

        const quizzesCompleted = history.length;

        const averageQuizScore = quizzesCompleted
            ? Math.round(
                history.reduce(
                    (sum, item) => sum + item.Percentage,
                    0
                ) / quizzesCompleted
            )
            : 0;

        let studyReadiness = "Not assessed";
        let readinessMessage =
            "Complete a quiz to assess your readiness.";

        if (quizzesCompleted > 0) {
            studyReadiness = `${averageQuizScore}%`;

            if (averageQuizScore >= 80) {
                readinessMessage =
                    "Strong quiz performance. Keep revising to maintain it.";

            } else if (averageQuizScore >= 60) {
                readinessMessage =
                    "Good progress. Review weaker topics to improve.";

            } else {
                readinessMessage =
                    "More revision and practice are recommended.";
            }
        }

        let quizImprovement = "Not available";
        let improvementMessage =
            "Complete more quizzes to track improvement.";

        if (quizzesCompleted >= 2) {
            const difference =
                history[0].Percentage - history[1].Percentage;

            quizImprovement =
                `${difference > 0 ? "+" : ""}${difference}%`;

            if (difference > 0) {
                improvementMessage =
                    "Your latest quiz score improved compared with the previous quiz.";

            } else if (difference < 0) {
                improvementMessage =
                    "Your latest score was lower than the previous quiz.";

            } else {
                improvementMessage =
                    "Your last two quiz scores were equal.";
            }
        }

        res.json({
            quizzesCompleted,
            averageQuizScore,
            studyReadiness,
            readinessMessage,
            quizImprovement,
            improvementMessage,
            history
        });
    })
);

// ============================================================
// AI TUTOR
// ============================================================

app.post(
    "/ask-tutor",
    requireStudent,
    asyncRoute(async (req, res) => {

        const { noteId, question } = req.body;

        if (!noteId) {
            return res.status(400).json({
                message: "No study material was selected."
            });
        }

        if (
            typeof question !== "string" ||
            !question.trim()
        ) {
            return res.status(400).json({
                message: "Please enter a question."
            });
        }

        const note = await getOwnedNote(
            noteId,
            req.session.userId
        );

        if (!note) {
            return res.status(404).json({
                message: "Study material was not found."
            });
        }

        const prompt = `
You are Marco, an AI study tutor for university students.

The student is studying the module "${note.ModuleName}".

Answer the student's question using the study notes provided below.

Instructions:
- Use the student's study material as your source.
- Explain the answer clearly and in simple language.
- Be helpful and educational.
- Keep the answer focused on the question.
- You may use headings, bullet points and bold text where useful.
- Do not invent facts that are not supported by the study notes.
- If the study notes do not contain enough information to answer the question, clearly tell the student that the available study material does not contain enough information.

Study Notes:
${note.NoteContent}

Student Question:
${question}
        `;

        const response = await generateWithGemini(prompt);
        const answer = response.text;

        if (!answer) {
            return res.status(500).json({
                message: "Gemini did not generate an answer."
            });
        }

        const result = await dbRun(
            `INSERT INTO AIResults
             (NoteID, AIAnswer, CreatedAt)
             VALUES (?, ?, datetime('now'))`,
            [noteId, answer]
        );

        res.json({
            message: "Answer generated successfully!",
            resultId: result.lastID,
            moduleName: note.ModuleName,
            answer
        });
    })
);

// ============================================================
// PDF TEXT EXTRACTION
// ============================================================

app.post(
    "/extract-pdf",
    requireStudent,
    upload.single("pdf"),
    asyncRoute(async (req, res) => {

        if (!req.file) {
            return res.status(400).json({
                message: "Please select a PDF file."
            });
        }

        const parser = new PDFParse({
            data: req.file.buffer
        });

        try {
            const result = await parser.getText();

            if (!result.text || !result.text.trim()) {
                return res.status(400).json({
                    message: "No readable text was found in this PDF."
                });
            }

            res.json({
                message: "PDF loaded successfully.",
                text: result.text
            });

        } finally {
            await parser.destroy();
        }
    })
);

// ============================================================
// ADMIN DASHBOARD STATISTICS
// ============================================================

app.get(
    "/admin/stats",
    requireAdmin,
    asyncRoute(async (req, res) => {

        const users = await dbGet(
            `SELECT
                COUNT(*) AS totalUsers,
                SUM(CASE WHEN Role = 'student' THEN 1 ELSE 0 END) AS totalStudents,
                SUM(CASE WHEN Role = 'admin' THEN 1 ELSE 0 END) AS totalAdmins
             FROM Users`
        );

        const notes = await dbGet(
            "SELECT COUNT(*) AS totalNotes FROM Notes"
        );

        const summaries = await dbGet(
            `SELECT COUNT(*) AS totalSummaries
             FROM AIResults
             WHERE Summary IS NOT NULL`
        );

        const quizzes = await dbGet(
            "SELECT COUNT(*) AS totalQuizzes FROM QuizScores"
        );

        const average = await dbGet(
            `SELECT ROUND(AVG(Percentage)) AS averageQuizScore
             FROM QuizScores`
        );

        const tutor = await dbGet(
            `SELECT COUNT(*) AS totalTutorQuestions
             FROM AIResults
             WHERE AIAnswer IS NOT NULL`
        );

        res.json({
            totalUsers: users.totalUsers || 0,
            totalStudents: users.totalStudents || 0,
            totalAdmins: users.totalAdmins || 0,
            totalNotes: notes.totalNotes || 0,
            totalSummaries: summaries.totalSummaries || 0,
            totalQuizzes: quizzes.totalQuizzes || 0,
            averageQuizScore: average.averageQuizScore || 0,
            totalTutorQuestions: tutor.totalTutorQuestions || 0
        });
    })
);

// ============================================================
// ADMIN - VIEW REGISTERED USERS
// ============================================================

app.get(
    "/admin/users",
    requireAdmin,
    asyncRoute(async (req, res) => {

        const users = await dbAll(
            `SELECT
                u.UserID,
                u.FullName,
                u.Email,
                u.Role,
                COUNT(DISTINCT n.NoteID) AS NotesCount,
                COUNT(DISTINCT qs.ScoreID) AS QuizzesCompleted
             FROM Users u
             LEFT JOIN Notes n ON n.UserID = u.UserID
             LEFT JOIN QuizScores qs ON qs.UserID = u.UserID
             GROUP BY
                u.UserID,
                u.FullName,
                u.Email,
                u.Role
             ORDER BY u.UserID DESC`
        );

        res.json({ users });
    })
);

// ============================================================
// ADMIN - VIEW INDIVIDUAL STUDENT DETAILS
// ============================================================

app.get(
    "/admin/students/:userId",
    requireAdmin,
    asyncRoute(async (req, res) => {

        const userId = Number(req.params.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                message: "Invalid student ID."
            });
        }

        const student = await dbGet(
            `SELECT UserID, FullName, Email, Role
             FROM Users
             WHERE UserID = ? AND Role = 'student'`,
            [userId]
        );

        if (!student) {
            return res.status(404).json({
                message: "Student not found."
            });
        }

        const materials = await dbAll(
            `SELECT NoteID, ModuleName, UploadDate
             FROM Notes
             WHERE UserID = ?
             ORDER BY UploadDate DESC, NoteID DESC`,
            [userId]
        );

        const summaries = await dbAll(
            `SELECT
                ar.ResultID,
                n.ModuleName,
                ar.Summary,
                ar.CreatedAt
             FROM AIResults ar
             INNER JOIN Notes n ON ar.NoteID = n.NoteID
             WHERE n.UserID = ?
               AND ar.Summary IS NOT NULL
             ORDER BY ar.CreatedAt DESC, ar.ResultID DESC`,
            [userId]
        );

        const quizzes = await dbAll(
            `SELECT
                qs.ScoreID,
                n.ModuleName,
                qs.QuizType,
                qs.Chapter,
                qs.Score,
                qs.TotalQuestions,
                qs.Percentage,
                qs.CompletedAt
             FROM QuizScores qs
             INNER JOIN Notes n ON qs.NoteID = n.NoteID
             WHERE qs.UserID = ?
               AND n.UserID = ?
             ORDER BY qs.CompletedAt DESC, qs.ScoreID DESC`,
            [userId, userId]
        );

        const average = await dbGet(
            `SELECT ROUND(AVG(Percentage)) AS AverageScore
             FROM QuizScores
             WHERE UserID = ?`,
            [userId]
        );

        const modulePerformance = await dbAll(
            `SELECT
                n.ModuleName,
                COUNT(*) AS QuizzesCompleted,
                ROUND(AVG(qs.Percentage)) AS AverageScore,
                MAX(qs.Percentage) AS HighestScore
             FROM QuizScores qs
             INNER JOIN Notes n ON qs.NoteID = n.NoteID
             WHERE qs.UserID = ?
               AND n.UserID = ?
             GROUP BY n.ModuleName
             ORDER BY AverageScore ASC`,
            [userId, userId]
        );

        const feedback = await dbAll(
            `SELECT Rating, Comment, CreatedAt
             FROM Feedback
             WHERE UserID = ?
             ORDER BY CreatedAt DESC, FeedbackID DESC`,
            [userId]
        );

        res.json({
            student,
            materials,
            summaries,
            quizzes,
            modulePerformance,
            feedback,
            materialsCount: materials.length,
            summariesCount: summaries.length,
            quizzesCount: quizzes.length,
            averageScore: average.AverageScore ?? 0
        });
    })
);

// ============================================================
// ADMIN - VIEW STUDENT ACTIVITY
// ============================================================

app.get(
    "/admin/activity",
    requireAdmin,
    asyncRoute(async (req, res) => {

        const activity = await dbAll(
            `SELECT
                qs.ScoreID,
                u.FullName,
                n.ModuleName,
                qs.QuizType,
                qs.Chapter,
                qs.Score,
                qs.TotalQuestions,
                qs.Percentage,
                qs.CompletedAt
             FROM QuizScores qs
             INNER JOIN Users u ON qs.UserID = u.UserID
             INNER JOIN Notes n ON qs.NoteID = n.NoteID
             ORDER BY qs.CompletedAt DESC, qs.ScoreID DESC
             LIMIT 50`
        );

        res.json({ activity });
    })
);

// ============================================================
// ADMIN - DELETE STUDENT ACCOUNT
// ============================================================

app.delete(
    "/admin/users/:userId",
    requireAdmin,
    asyncRoute(async (req, res) => {

        const userId = Number(req.params.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                message: "Invalid user ID."
            });
        }

        if (userId === req.session.userId) {
            return res.status(400).json({
                message: "You cannot delete your own admin account."
            });
        }

        const user = await dbGet(
            "SELECT UserID, Role FROM Users WHERE UserID = ?",
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (user.Role === "admin") {
            return res.status(403).json({
                message: "Admin accounts cannot be deleted here."
            });
        }

        await dbRun("BEGIN TRANSACTION");

        try {
            await dbRun(
                "DELETE FROM Feedback WHERE UserID = ?",
                [userId]
            );

            await dbRun(
                "DELETE FROM QuizScores WHERE UserID = ?",
                [userId]
            );

            await dbRun(
                `DELETE FROM AIResults
                 WHERE NoteID IN (
                     SELECT NoteID
                     FROM Notes
                     WHERE UserID = ?
                 )`,
                [userId]
            );

            await dbRun(
                "DELETE FROM Notes WHERE UserID = ?",
                [userId]
            );

            await dbRun(
                `DELETE FROM Users
                 WHERE UserID = ? AND Role = 'student'`,
                [userId]
            );

            await dbRun("COMMIT");

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

        res.json({
            message: "Student account deleted successfully."
        });
    })
);

// ============================================================
// ADMIN - BACKUP DATABASE
// ============================================================

app.get(
    "/admin/backup",
    requireAdmin,
    asyncRoute(async (req, res) => {

        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-");

        const filename = `marco_backup_${timestamp}.db`;
        const backupPath = path.join(os.tmpdir(), filename);

        try {
            await db.backup(backupPath);

            res.download(backupPath, filename, err => {
                fs.unlink(backupPath, () => {});

                if (err) {
                    console.error(
                        "Backup download failed:",
                        err.message
                    );
                }
            });

        } catch (error) {
            fs.unlink(backupPath, () => {});

            console.error(
                "Database backup failed:",
                error.message
            );

            if (!res.headersSent) {
                res.status(500).json({
                    message: "Database backup failed."
                });
            }
        }
    })
);

// ============================================================
// STUDENT - SUBMIT FEEDBACK
// ============================================================

app.post(
    "/feedback",
    requireStudent,
    asyncRoute(async (req, res) => {

        const { rating, comment } = req.body;

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            return res.status(400).json({
                message: "Please select a rating between 1 and 5."
            });
        }

        if (
            typeof comment !== "string" ||
            !comment.trim()
        ) {
            return res.status(400).json({
                message: "Please enter your feedback."
            });
        }

        await dbRun(
            `INSERT INTO Feedback
             (UserID, Rating, Comment)
             VALUES (?, ?, ?)`,
            [
                req.session.userId,
                rating,
                comment.trim()
            ]
        );

        res.status(201).json({
            message: "Thank you! Your feedback has been submitted."
        });
    })
);

// ============================================================
// ADMIN - VIEW STUDENT FEEDBACK
// ============================================================

app.get(
    "/admin/feedback",
    requireAdmin,
    asyncRoute(async (req, res) => {

        const feedback = await dbAll(
            `SELECT
                f.FeedbackID,
                u.FullName,
                u.Email,
                f.Rating,
                f.Comment,
                f.CreatedAt
             FROM Feedback f
             INNER JOIN Users u ON f.UserID = u.UserID
             ORDER BY f.CreatedAt DESC, f.FeedbackID DESC`
        );

        const stats = await dbGet(
            `SELECT
                COUNT(*) AS totalReviews,
                ROUND(AVG(Rating), 1) AS averageRating
             FROM Feedback`
        );

        res.json({
            feedback,
            totalReviews: stats.totalReviews || 0,
            averageRating: stats.averageRating || 0
        });
    })
);

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
    console.error("Server error:", err);

    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            message: "PDF upload failed: " + err.message
        });
    }

    res.status(500).json({
        message: "An unexpected server error occurred."
    });
});


 // ============================================================
 // STUDY PLANNER
 // ============================================================

 // Get all study sessions for the logged-in student.
 app.get("/study-sessions", requireStudent, asyncRoute(async (req, res) => {

     const sessions = await dbAll(
         `SELECT * FROM StudySessions
          WHERE UserID = ?
          ORDER BY StudyDate, StartTime`,
         [req.session.userId]
     );

     res.json({ sessions });
 }));

 // Add a new study session.
 app.post("/study-sessions", requireStudent, asyncRoute(async (req, res) => {

     const { moduleName, studyDate, startTime, duration } = req.body;

     if (!moduleName || !studyDate || !startTime || !duration) {
         return res.status(400).json({ message: "Please complete all fields." });
     }

     await dbRun(
         `INSERT INTO StudySessions
          (UserID, ModuleName, StudyDate, StartTime, Duration)
          VALUES (?, ?, ?, ?, ?)`,
         [req.session.userId, moduleName, studyDate, startTime, duration]
     );

     res.json({ message: "Study session added successfully!" });
 }));

 // Update an existing study session.
 app.put("/study-sessions/:id", requireStudent, asyncRoute(async (req, res) => {

     const { moduleName, studyDate, startTime, duration, completed } = req.body;

     const session = await dbGet(
         "SELECT * FROM StudySessions WHERE SessionID = ? AND UserID = ?",
         [req.params.id, req.session.userId]
     );

     if (!session) {
         return res.status(404).json({ message: "Study session not found." });
     }

     const updatedModule = moduleName ?? session.ModuleName;
     const updatedDate = studyDate ?? session.StudyDate;
     const updatedTime = startTime ?? session.StartTime;
     const updatedDuration = duration ?? session.Duration;
     const updatedCompleted = completed ?? session.Completed;

     await dbRun(
         `UPDATE StudySessions
          SET ModuleName = ?, StudyDate = ?, StartTime = ?,
              Duration = ?, Completed = ?
          WHERE SessionID = ? AND UserID = ?`,
         [
             updatedModule,
             updatedDate,
             updatedTime,
             updatedDuration,
             updatedCompleted,
             req.params.id,
             req.session.userId
         ]
     );

     res.json({ message: "Study session updated successfully!" });
 }));

 // Delete a study session.
 app.delete("/study-sessions/:id", requireStudent, asyncRoute(async (req, res) => {

     const result = await dbRun(
         "DELETE FROM StudySessions WHERE SessionID = ? AND UserID = ?",
         [req.params.id, req.session.userId]
     );

     if (result.changes === 0) {
         return res.status(404).json({ message: "Study session not found." });
     }
     res.json({ message: "Study session deleted successfully!" });
 }));


// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
    console.log(
        `Marco server running on http://localhost:${PORT}`
    );

    if (process.env.GEMINI_API_KEY) {
        console.log("Gemini API key loaded successfully.");
    } else {
        console.log(
            "WARNING: Gemini API key was not found."
        );
    }

    console.log(
        "Student and admin authentication enabled."
    );
});
