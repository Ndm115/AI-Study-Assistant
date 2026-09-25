const fs = require("fs");

const backupFile = "backups/study_assistant_backup.db";
const databaseFile = "study_assistant.db";

fs.copyFile(backupFile, databaseFile, (err) => {
    if (err) {
        console.log("Database restore failed:", err);
        return;
    }

    console.log("Database restored successfully.");
});