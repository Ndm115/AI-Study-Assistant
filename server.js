const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");

const app = express();
const PORT = 3000;

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
    console.log(`Marco server running on http://localhost:${PORT}`);
});