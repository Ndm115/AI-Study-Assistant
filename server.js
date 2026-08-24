const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const app = express();
const PORT = 3000;


// --------------------
// GEMINI
// --------------------

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// Keep uploaded PDF in memory temporarily
const upload = multer({
    storage: multer.memoryStorage()
});

app.use(cors());
app.use(express.json());


// --------------------
// DATABASE
// --------------------

const db = new sqlite3.Database("./study_assistant.db", (err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
    } else {
        console.log("Connected to Marco SQLite database.");
    }
});


// --------------------
// TEST ROUTE
// --------------------

app.get("/", (req, res) => {
    res.send("Marco AI Study Assistant backend is running!");
});


// --------------------
// REGISTER
// --------------------

app.post("/register", async (req, res) => {

    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({
            message: "Please complete all fields."
        });
    }

    try {

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO Users (FullName, Email, Password)
            VALUES (?, ?, ?)
        `;

        db.run(sql, [fullName, email, hashedPassword], function (err) {

            if (err) {

                if (err.message.includes("UNIQUE")) {
                    return res.status(400).json({
                        message: "An account with this email already exists."
                    });
                }

                console.error("Registration error:", err.message);

                return res.status(500).json({
                    message: "Unable to create account."
                });
            }

            res.status(201).json({
                message: "Account created successfully!",
                userId: this.lastID
            });
        });

    } catch (error) {

        console.error("Registration error:", error);

        res.status(500).json({
            message: "Unable to create account."
        });
    }
});


// --------------------
// LOGIN
// --------------------

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Please enter your email and password."
        });
    }

    const sql = `
        SELECT *
        FROM Users
        WHERE Email = ?
    `;

    db.get(sql, [email], async (err, user) => {

        if (err) {
            console.error("Login error:", err.message);

            return res.status(500).json({
                message: "Unable to log in."
            });
        }

        if (!user) {
            return res.status(401).json({
                message: "Incorrect email or password."
            });
        }

        try {

            const passwordMatches = await bcrypt.compare(
                password,
                user.Password
            );

            if (!passwordMatches) {
                return res.status(401).json({
                    message: "Incorrect email or password."
                });
            }

            res.json({
                message: "Login successful!",
                userId: user.UserID,
                fullName: user.FullName
            });

        } catch (error) {

            console.error("Password check error:", error);

            res.status(500).json({
                message: "Unable to log in."
            });
        }
    });
});


// --------------------
// SAVE STUDY NOTE
// --------------------

app.post("/notes", (req, res) => {

    const { userId, moduleName, noteContent } = req.body;

    if (!userId || !moduleName || !noteContent) {
        return res.status(400).json({
            message: "Please enter a module name and study notes."
        });
    }

    const sql = `
        INSERT INTO Notes
        (UserID, ModuleName, NoteContent, UploadDate)
        VALUES (?, ?, ?, datetime('now'))
    `;

    db.run(
        sql,
        [userId, moduleName, noteContent],
        function (err) {

            if (err) {
                console.error("Save note error:", err.message);

                return res.status(500).json({
                    message: "Unable to save study material."
                });
            }

            res.status(201).json({
                message: "Study material saved successfully!",
                noteId: this.lastID
            });
        }
    );
});


// --------------------
// GENERATE AI SUMMARY
// --------------------

app.post("/generate-summary", (req, res) => {

    const { noteId } = req.body;

    if (!noteId) {
        return res.status(400).json({
            message: "No study material was selected."
        });
    }

    const sql = `
        SELECT *
        FROM Notes
        WHERE NoteID = ?
    `;

    db.get(sql, [noteId], async (err, note) => {

        if (err) {

            console.error("Retrieve note error:", err.message);

            return res.status(500).json({
                message: "Unable to retrieve study material."
            });
        }

        if (!note) {
            return res.status(404).json({
                message: "Study material was not found."
            });
        }

        try {

            const prompt = `
You are an AI study assistant for university students.

Create a clear and useful study summary from the notes below.

Keep the important facts and concepts.
Use simple language.
Organize the summary so that it is easy to revise from.
Do not add information that is not contained in the student's notes.

Module: ${note.ModuleName}

Study Notes:
${note.NoteContent}
            `;

            const response = await ai.models.generateContent({
                model: "gemini-3.6-flash",
                contents: prompt
            });

            const summary = response.text;

            if (!summary) {
                return res.status(500).json({
                    message: "Gemini did not generate a summary."
                });
            }


            // --------------------
            // SAVE SUMMARY
            // --------------------

            const saveSql = `
                INSERT INTO AIResults
                (NoteID, Summary, CreatedAt)
                VALUES (?, ?, datetime('now'))
            `;

            db.run(
                saveSql,
                [noteId, summary],
                function (saveErr) {

                    if (saveErr) {

                        console.error(
                            "Save summary error:",
                            saveErr.message
                        );

                        return res.status(500).json({
                            message:
                                "Summary generated but could not be saved."
                        });
                    }

                    res.json({
                        message: "Summary generated successfully!",
                        resultId: this.lastID,
                        moduleName: note.ModuleName,
                        summary: summary
                    });
                }
            );

        } catch (error) {

            console.error("Gemini error:", error);

            res.status(500).json({
                message: "Unable to generate AI summary."
            });
        }
    });
});


// --------------------
// PDF TEXT EXTRACTION
// --------------------

app.post("/extract-pdf", upload.single("pdf"), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({
            message: "Please select a PDF file."
        });
    }

    try {

        const parser = new PDFParse({
            data: req.file.buffer
        });

        const result = await parser.getText();

        await parser.destroy();

        if (!result.text || !result.text.trim()) {
            return res.status(400).json({
                message: "No readable text was found in this PDF."
            });
        }

        res.json({
            message: "PDF loaded successfully.",
            text: result.text
        });

    } catch (error) {

        console.error("PDF extraction error:", error);

        res.status(500).json({
            message: "Unable to read this PDF."
        });
    }
});


// --------------------
// START SERVER
// --------------------

app.listen(PORT, () => {

    console.log(
        `Marco server running on http://localhost:${PORT}`
    );

    if (process.env.GEMINI_API_KEY) {
        console.log("Gemini API key loaded successfully.");
    } else {
        console.log("WARNING: Gemini API key was not found.");
    }
});