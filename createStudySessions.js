
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./study_assistant.db");

db.run(`
    CREATE TABLE IF NOT EXISTS StudySessions (
        SessionID INTEGER PRIMARY KEY AUTOINCREMENT,
        UserID INTEGER NOT NULL,
        ModuleName TEXT NOT NULL,
        StudyDate TEXT NOT NULL,
        StartTime TEXT NOT NULL,
        Duration INTEGER NOT NULL,
        Completed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (UserID) REFERENCES Users(UserID)
    )
`, (error) => {

    if (error) {
        console.error("Error creating StudySessions table:", error.message);
    } else {
        console.log("StudySessions table created successfully!");
    }

    db.close();
});
