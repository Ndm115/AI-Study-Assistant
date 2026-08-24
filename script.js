// --------------------
// NAVIGATION
// --------------------

function goToDashboard() {
    window.location.href = "dashboard.html";
}

function goToUpload() {
    window.location.href = "upload.html";
}

function goToSummary() {
    window.location.href = "summary.html";
}

function goToQuiz() {
    window.location.href = "quiz.html";
}

function goToTutor() {
    window.location.href = "tutor.html";
}


// --------------------
// LOGIN / REGISTER DISPLAY
// --------------------

function showRegister() {

    document.getElementById("loginSection").style.display = "none";
    document.getElementById("registerSection").style.display = "block";
    document.getElementById("message").textContent = "";
}

function showLogin() {

    document.getElementById("registerSection").style.display = "none";
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("message").textContent = "";
}


// --------------------
// REGISTER
// --------------------

async function registerUser() {

    const fullName =
        document.getElementById("registerName").value.trim();

    const email =
        document.getElementById("registerEmail").value.trim();

    const password =
        document.getElementById("registerPassword").value;

    const message =
        document.getElementById("message");

    if (!fullName || !email || !password) {
        message.textContent = "Please complete all fields.";
        return;
    }

    try {

        const response = await fetch(
            "http://localhost:3000/register",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    fullName,
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        message.textContent = data.message;

        if (response.ok) {

            document.getElementById("registerName").value = "";
            document.getElementById("registerEmail").value = "";
            document.getElementById("registerPassword").value = "";

            setTimeout(() => {

                showLogin();

                document.getElementById("message").textContent =
                    "Account created successfully. You can now log in.";

            }, 1000);
        }

    } catch (error) {

        console.error(error);

        message.textContent =
            "Could not connect to the server.";
    }
}


// --------------------
// LOGIN
// --------------------

async function loginUser() {

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    const message =
        document.getElementById("message");

    if (!email || !password) {
        message.textContent =
            "Please enter your email and password.";
        return;
    }

    try {

        const response = await fetch(
            "http://localhost:3000/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.message;
            return;
        }

        localStorage.setItem("userId", data.userId);
        localStorage.setItem("fullName", data.fullName);

        window.location.href = "dashboard.html";

    } catch (error) {

        console.error(error);

        message.textContent =
            "Could not connect to the server.";
    }
}


// --------------------
// SAVE STUDY MATERIAL
// --------------------

async function saveNote() {

    const userId = localStorage.getItem("userId");

    const moduleName =
        document.getElementById("moduleName").value.trim();

    const noteContent =
        document.getElementById("noteContent").value.trim();

    const message =
        document.getElementById("uploadMessage");

    if (!userId) {
        window.location.href = "index.html";
        return;
    }

    if (!moduleName || !noteContent) {
        message.textContent =
            "Please enter a module name and study notes.";
        return;
    }

    try {

        const response = await fetch(
            "http://localhost:3000/notes",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    userId,
                    moduleName,
                    noteContent
                })
            }
        );

        const data = await response.json();

        message.textContent = data.message;

        if (response.ok) {

          // Remember this note so we can use it for Gemini later
          localStorage.setItem("currentNoteId", data.noteId);

          message.textContent =
            "Study material saved successfully!";
        }

    } catch (error) {

        console.error(error);

        message.textContent =
            "Could not connect to the server.";
    }
}

// --------------------
// FILE UPLOAD
// --------------------

async function handleFileUpload() {

    const fileInput = document.getElementById("noteFile");
    const file = fileInput.files[0];
    const message = document.getElementById("uploadMessage");

    if (!file) {
        return;
    }

    const fileName = file.name.toLowerCase();

    // TXT FILE
    if (fileName.endsWith(".txt")) {

        const reader = new FileReader();

        reader.onload = function (event) {

            document.getElementById("noteContent").value =
                event.target.result;

            message.textContent =
                "TXT file loaded successfully.";
        };

        reader.onerror = function () {
            message.textContent =
                "Unable to read TXT file.";
        };

        reader.readAsText(file);

        return;
    }


    // PDF FILE
    if (fileName.endsWith(".pdf")) {

        message.textContent = "Reading PDF...";

        const formData = new FormData();

        formData.append("pdf", file);

        try {

            const response = await fetch(
                "http://localhost:3000/extract-pdf",
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            if (!response.ok) {
                message.textContent = data.message;
                return;
            }

            document.getElementById("noteContent").value =
                data.text;

            message.textContent =
                "PDF loaded successfully.";

        } catch (error) {

            console.error(error);

            message.textContent =
                "Could not connect to the server.";
        }

        return;
    }

    message.textContent =
        "Please upload a TXT or PDF file.";
}


// --------------------
// SIMPLE MARKDOWN FORMATTER
// --------------------

function formatMarkdown(text) {

    return text
        // Escape HTML first
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

        // Headings
        .replace(/^### (.*$)/gm, "<h4>$1</h4>")
        .replace(/^## (.*$)/gm, "<h3>$1</h3>")
        .replace(/^# (.*$)/gm, "<h2>$1</h2>")

        // Bold
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

        // Bullet points
        .replace(/^\* (.*$)/gm, "<li>$1</li>")

        // Horizontal lines
        .replace(/^---$/gm, "<hr>")

        // New lines
        .replace(/\n/g, "<br>");
}

// --------------------
// GENERATE AI SUMMARY
// --------------------

async function generateSummary(event) {

    if (event) {
        event.preventDefault();
    }

    const noteId = localStorage.getItem("currentNoteId");

    const summaryText =
        document.getElementById("summaryText");

    const summaryMessage =
        document.getElementById("summaryMessage");

    const summaryTitle =
        document.getElementById("summaryTitle");

    if (!noteId) {

        summaryMessage.textContent =
            "Please upload and save study material first.";

        return;
    }

    summaryText.textContent =
        "Generating your summary...";

    summaryMessage.textContent = "";

    try {

        const response = await fetch(
            "http://localhost:3000/generate-summary",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    noteId: noteId
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            summaryText.textContent =
                "Unable to generate summary.";

            summaryMessage.textContent =
                data.message;

            return;
        }

        summaryTitle.textContent =
            data.moduleName + " Summary";

        summaryText.innerHTML =
            formatMarkdown(data.summary);

        summaryMessage.textContent =
            "Summary generated successfully.";

        localStorage.setItem(
            "currentResultId",
            data.resultId
        );

    } catch (error) {

        console.error(error);

        summaryText.textContent =
            "Unable to generate summary.";

        summaryMessage.textContent =
            "Could not connect to the server.";
    }
}

// --------------------
// LOGOUT
// --------------------

function logoutUser() {

    localStorage.removeItem("userId");
    localStorage.removeItem("fullName");
    localStorage.removeItem("currentNoteId");

    window.location.href = "index.html";
}


// --------------------
// THEME
// --------------------

function toggleTheme() {

    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }
}


// --------------------
// PAGE LOAD
// --------------------

window.onload = function () {

    const savedTheme =
        localStorage.getItem("theme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
    }
};