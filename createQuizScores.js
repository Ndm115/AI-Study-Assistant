const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./study_assistant.db");

db.run(`
    CREATE TABLE IF NOT EXISTS QuizScores (
        ScoreID INTEGER PRIMARY KEY AUTOINCREMENT,
        UserID INTEGER NOT NULL,
        NoteID INTEGER NOT NULL,
        QuizType TEXT NOT NULL,
        Chapter TEXT NOT NULL,
        Score INTEGER NOT NULL,
        TotalQuestions INTEGER NOT NULL,
        Percentage INTEGER NOT NULL,
        CompletedAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (UserID) REFERENCES Users(UserID),
        FOREIGN KEY (NoteID) REFERENCES Notes(NoteID)
    );
`, (err) => {
    if (err) {
        console.log("Error:", err.message);
    } else {
        console.log("QuizScores table created successfully!");
    }

    db.close();
});