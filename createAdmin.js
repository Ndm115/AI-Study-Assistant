
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("./study_assistant.db");

async function createAdmin() {

    // Change these to your chosen admin details.
    const fullName = "Marco Administrator";
    const email = "admin@marco.gmail.com";
    const password = "admin123!";

    try {

        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(
            `INSERT INTO Users
             (FullName, Email, Password, Role)
             VALUES (?, ?, ?, 'admin')`,
            [fullName, email, hashedPassword],
            function (err) {

                if (err) {
                    console.error("Error:", err.message);
                } else {
                    console.log("Admin account created successfully!");
                }

                db.close();
            }
        );

    } catch (error) {

        console.error("Error:", error.message);
        db.close();
    }
}

createAdmin();
