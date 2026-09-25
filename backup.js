// Import the Node.js file system library
const fs = require("fs");

// The database file we want to back up
const databaseFile = "study_assistant.db";

// Where the backup will be saved
const backupFile = "backups/study_assistant_backup.db";

// Copy the database into the backups folder
fs.copyFile(databaseFile, backupFile, (err) => {

    // If something goes wrong
    if (err) {
        console.log("Backup failed:", err);
        return;
    }

    // If everything worked
    console.log("Database backup created successfully.");
});