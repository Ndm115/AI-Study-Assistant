
const sqlite3 = require("sqlite3").verbose();

// Connect to the existing Marco database.
const db = new sqlite3.Database("./study_assistant.db");

// Create the Feedback table if it doesn't already exist.
db.run(`
    CREATE TABLE IF NOT EXISTS Feedback (
        FeedbackID INTEGER PRIMARY KEY AUTOINCREMENT,
        UserID INTEGER NOT NULL,
        Rating INTEGER NOT NULL CHECK (Rating BETWEEN 1 AND 5),
        Comment TEXT NOT NULL,
        CreatedAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (UserID) REFERENCES Users(UserID)
    )
`, (err) => {

    if (err) {
        console.log("Error:", err.message);
    } else {
        console.log("Feedback table created successfully!");
    }

    db.close();
});
