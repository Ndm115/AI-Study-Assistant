const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./study_assistant.db");

db.run(`
    ALTER TABLE Users
    ADD COLUMN Role TEXT NOT NULL DEFAULT 'student'
    CHECK (Role IN ('student', 'admin'))
`, function (err) {

    if (err) {
        console.error("Error:", err.message);
    } else {
        console.log("Role column added successfully!");
    }

    db.close();
});