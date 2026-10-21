
// ============================================================
// NAVIGATION
// ============================================================

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

// ============================================================
// LOGIN / REGISTER DISPLAY
// ============================================================

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

// ============================================================
// REGISTER
// ============================================================

async function registerUser() {

    const fullName = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const message = document.getElementById("message");

    if (!fullName || !email || !password) {
        message.textContent = "Please complete all fields.";
        return;
    }

    if (fullName.length < 2) {
        message.textContent = "Full name must contain at least 2 characters.";
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        message.textContent = "Please enter a valid email address.";
        return;
    }

    if (
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password)
    ) {
        message.textContent =
            "Password must contain at least 8 characters, an uppercase letter, a lowercase letter and a number.";
        return;
    }

    try {

        const response = await fetch("http://127.0.0.1:3000/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ fullName, email, password })
        });

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
        message.textContent = "Could not connect to the server.";
    }
}

// ============================================================
// LOGIN
// ============================================================

async function loginUser() {

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const message = document.getElementById("message");

    if (!email || !password) {
        message.textContent = "Please enter your email and password.";
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        message.textContent = "Please enter a valid email address.";
        return;
    }

    try {

        const response = await fetch("http://127.0.0.1:3000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

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
        message.textContent = "Could not connect to the server.";
    }
}

// ============================================================
// SAVE STUDY MATERIAL
// ============================================================

async function saveNote() {

    const userId = localStorage.getItem("userId");
    const moduleName = document.getElementById("moduleName").value.trim();
    const noteContent = document.getElementById("noteContent").value.trim();
    const message = document.getElementById("uploadMessage");

    if (!userId) {
        window.location.href = "index.html";
        return;
    }

    if (!moduleName || !noteContent) {
        message.textContent = "Please enter a module name and study notes.";
        return;
    }

    try {

        const response = await fetch("http://127.0.0.1:3000/notes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId,
                moduleName,
                noteContent
            })
        });

        const data = await response.json();

        message.textContent = data.message;

        if (response.ok) {

            localStorage.setItem("currentNoteId", data.noteId);
            localStorage.setItem("currentModuleName", moduleName);

            localStorage.removeItem("marco_upload_module");
            localStorage.removeItem("marco_upload_notes");

            message.textContent = "Study material saved successfully!";
        }

    } catch (error) {
        console.error(error);
        message.textContent = "Could not connect to the server.";
    }
}

// ============================================================
// FILE UPLOAD
// ============================================================

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

            saveUploadDraft();

            message.textContent = "TXT file loaded successfully.";
        };

        reader.onerror = function () {
            message.textContent = "Unable to read TXT file.";
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
                "http://127.0.0.1:3000/extract-pdf",
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

            document.getElementById("noteContent").value = data.text;

            saveUploadDraft();

            message.textContent = "PDF loaded successfully.";

        } catch (error) {
            console.error(error);
            message.textContent = "Could not connect to the server.";
        }

        return;
    }

    message.textContent = "Please upload a TXT or PDF file.";
}

// ============================================================
// SIMPLE MARKDOWN FORMATTER
// ============================================================

function formatMarkdown(text) {

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

        .replace(/\\\*/g, "*")
        .replace(/\\\|/g, "|")
        .replace(/\\\\/g, "\\")

        .replace(/^### (.*)$/gm, "<h4>$1</h4>")
        .replace(/^## (.*)$/gm, "<h3>$1</h3>")
        .replace(/^# (.*)$/gm, "<h2>$1</h2>")

        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/^\* (.*)$/gm, "<li>$1</li>")
        .replace(/^---$/gm, "<hr>")
        .replace(/\n/g, "<br>");
}

// ============================================================
// PAGE CONTENT PERSISTENCE
// ============================================================

function getStudyStorageKey(type) {

    const noteId = localStorage.getItem("currentNoteId");

    if (!noteId) {
        return null;
    }

    return "marco_" + type + "_" + noteId;
}

// ============================================================
// SUMMARY STORAGE
// ============================================================

function saveSummaryState(moduleName, summary) {

    const key = getStudyStorageKey("summary");

    if (!key) {
        return;
    }

    localStorage.setItem(key, JSON.stringify({
        moduleName: moduleName,
        summary: summary
    }));
}

function loadSummaryState() {

    const summaryText = document.getElementById("summaryText");

    if (!summaryText) {
        return;
    }

    const key = getStudyStorageKey("summary");

    if (!key) {
        return;
    }

    const saved = localStorage.getItem(key);

    if (!saved) {
        return;
    }

    try {

        const data = JSON.parse(saved);

        document.getElementById("summaryTitle").textContent =
            data.moduleName + " Summary";

        summaryText.innerHTML = formatMarkdown(data.summary);

        document.getElementById("summaryMessage").textContent =
            "Saved summary restored.";

    } catch (error) {
        console.error("Unable to restore summary:", error);
    }
}

function clearSummary() {

    const key = getStudyStorageKey("summary");

    if (key) {
        localStorage.removeItem(key);
    }

    const summaryTitle = document.getElementById("summaryTitle");
    const summaryText = document.getElementById("summaryText");
    const summaryMessage = document.getElementById("summaryMessage");

    if (summaryTitle) {
        summaryTitle.textContent = "Summary";
    }

    if (summaryText) {
        summaryText.textContent =
            "Click the button below to generate a summary from your study material.";
    }

    if (summaryMessage) {
        summaryMessage.textContent = "Summary cleared.";
    }
}

// ============================================================
// QUIZ STORAGE
// ============================================================

let currentQuiz = [];
let currentQuizType = "multiple";
let currentQuizChapter = "all";
let quizSubmitted = false;

function saveQuizState(moduleName) {

    const key = getStudyStorageKey("quiz");

    if (!key) {
        return;
    }

    localStorage.setItem(key, JSON.stringify({
        moduleName: moduleName,
        questions: currentQuiz,
        quizType: currentQuizType,
        chapter: currentQuizChapter,
        submitted: quizSubmitted
    }));
}

function loadQuizState() {

    const quizContainer = document.getElementById("quizContainer");

    if (!quizContainer) {
        return;
    }

    const key = getStudyStorageKey("quiz");

    if (!key) {
        return;
    }

    const saved = localStorage.getItem(key);

    if (!saved) {
        return;
    }

    try {

        const data = JSON.parse(saved);

        if (!Array.isArray(data.questions)) {
            return;
        }

        currentQuiz = data.questions;
        currentQuizType = data.quizType || "multiple";
        currentQuizChapter = data.chapter ?? "all";
        quizSubmitted = data.submitted || false;

        document.getElementById("quizTitle").textContent =
            data.moduleName + " Quiz";

        document.getElementById("quizMessage").textContent =
            quizSubmitted
                ? "This quiz has already been submitted."
                : "Choose one answer for each question.";

        displayQuiz();

        if (quizSubmitted) {
            quizContainer.querySelectorAll('input[type="radio"]')
                .forEach(radio => {
                    radio.disabled = true;
                });
        }

        document.getElementById("submitQuizButton").style.display =
            quizSubmitted ? "none" : "inline-block";

    } catch (error) {
        console.error("Unable to restore quiz:", error);
    }
}

function clearQuiz() {

    const key = getStudyStorageKey("quiz");

    if (key) {
        localStorage.removeItem(key);
    }

    currentQuiz = [];
    currentQuizType = "multiple";
    currentQuizChapter = "all";
    quizSubmitted = false;

    const quizTitle = document.getElementById("quizTitle");
    const quizMessage = document.getElementById("quizMessage");
    const quizContainer = document.getElementById("quizContainer");
    const quizResult = document.getElementById("quizResult");
    const submitButton = document.getElementById("submitQuizButton");

    if (quizTitle) {
        quizTitle.textContent = "Quiz Questions";
    }

    if (quizMessage) {
        quizMessage.textContent =
            "Generate a quiz from your saved study material.";
    }

    if (quizContainer) {
        quizContainer.innerHTML = "";
    }

    if (quizResult) {
        quizResult.innerHTML = "";
    }

    if (submitButton) {
        submitButton.style.display = "none";
    }
}

// ============================================================
// TUTOR STORAGE
// ============================================================

function saveTutorState(question, answer) {

    const key = getStudyStorageKey("tutor");

    if (!key) {
        return;
    }

    localStorage.setItem(key, JSON.stringify({
        question: question,
        answer: answer
    }));
}

function loadTutorState() {

    const tutorAnswer = document.getElementById("tutorAnswer");

    if (!tutorAnswer) {
        return;
    }

    const key = getStudyStorageKey("tutor");

    if (!key) {
        return;
    }

    const saved = localStorage.getItem(key);

    if (!saved) {
        return;
    }

    try {

        const data = JSON.parse(saved);

        document.getElementById("tutorQuestion").value = data.question;

        tutorAnswer.innerHTML = formatMarkdown(data.answer);

        document.getElementById("tutorMessage").textContent =
            "Saved answer restored.";

    } catch (error) {
        console.error("Unable to restore tutor answer:", error);
    }
}

function clearTutor() {

    const key = getStudyStorageKey("tutor");

    if (key) {
        localStorage.removeItem(key);
    }

    const tutorQuestion = document.getElementById("tutorQuestion");
    const tutorAnswer = document.getElementById("tutorAnswer");
    const tutorMessage = document.getElementById("tutorMessage");

    if (tutorQuestion) {
        tutorQuestion.value = "";
    }

    if (tutorAnswer) {
        tutorAnswer.textContent =
            "Ask Marco a question about your saved study material.";
    }

    if (tutorMessage) {
        tutorMessage.textContent = "Tutor cleared.";
    }
}

// ============================================================
// UPLOAD FORM STORAGE
// ============================================================

function saveUploadDraft() {

    const moduleName = document.getElementById("moduleName");
    const noteContent = document.getElementById("noteContent");

    if (!moduleName || !noteContent) {
        return;
    }

    localStorage.setItem("marco_upload_module", moduleName.value);
    localStorage.setItem("marco_upload_notes", noteContent.value);
}

function loadUploadDraft() {

    const moduleName = document.getElementById("moduleName");
    const noteContent = document.getElementById("noteContent");

    if (!moduleName || !noteContent) {
        return;
    }

    moduleName.value =
        localStorage.getItem("marco_upload_module") || "";

    noteContent.value =
        localStorage.getItem("marco_upload_notes") || "";

    moduleName.addEventListener("input", saveUploadDraft);
    noteContent.addEventListener("input", saveUploadDraft);
}

function clearUploadForm() {

    localStorage.removeItem("marco_upload_module");
    localStorage.removeItem("marco_upload_notes");

    const moduleName = document.getElementById("moduleName");
    const noteContent = document.getElementById("noteContent");
    const noteFile = document.getElementById("noteFile");
    const uploadMessage = document.getElementById("uploadMessage");

    if (moduleName) {
        moduleName.value = "";
    }

    if (noteContent) {
        noteContent.value = "";
    }

    if (noteFile) {
        noteFile.value = "";
    }

    if (uploadMessage) {
        uploadMessage.textContent = "Form cleared.";
    }
}

// ============================================================
// LOAD SUMMARY CHAPTERS - NEW
// ============================================================

async function loadSummaryChapters() {

    const chapterSelect = document.getElementById("summaryChapter");

    // Only run this on the Summary page.
    if (!chapterSelect) {
        return;
    }

    const noteId = localStorage.getItem("currentNoteId");

    chapterSelect.innerHTML =
        '<option value="all">All Chapters</option>';

    if (!noteId) {
        return;
    }

    try {

        // Reuse the chapter endpoint from the Quiz Generator.
        const response = await fetch(
            `http://127.0.0.1:3000/chapters/${noteId}`
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(data.message);
            return;
        }

        if (!Array.isArray(data.chapters)) {
            return;
        }

        // Add detected chapters to the dropdown.
        data.chapters.forEach(chapter => {

            const option = document.createElement("option");

            option.value = chapter.index;
            option.textContent = chapter.title;

            chapterSelect.appendChild(option);
        });

        // Restore the previously selected chapter.
        const savedChapter = localStorage.getItem(
            "marco_summary_chapter_" + noteId
        );

        if (
            savedChapter !== null &&
            Array.from(chapterSelect.options).some(
                option => option.value === savedChapter
            )
        ) {
            chapterSelect.value = savedChapter;
        }

        // Remember chapter selection when changed.
        chapterSelect.addEventListener("change", function () {

            localStorage.setItem(
                "marco_summary_chapter_" + noteId,
                chapterSelect.value
            );
        });

    } catch (error) {

        console.error("Unable to load summary chapters:", error);
    }
}

// ============================================================
// GENERATE AI SUMMARY - CHAPTER SELECTION
// ============================================================

async function generateSummary(event) {

    if (event) {
        event.preventDefault();
    }

    const noteId = localStorage.getItem("currentNoteId");

    // Read the selected chapter from the new dropdown.
    const chapter =
        document.getElementById("summaryChapter")?.value || "all";

    const summaryText = document.getElementById("summaryText");
    const summaryMessage = document.getElementById("summaryMessage");
    const summaryTitle = document.getElementById("summaryTitle");

    if (!noteId) {
        summaryMessage.textContent =
            "Please upload and save study material first.";
        return;
    }

    summaryText.textContent = "Generating your summary...";
    summaryMessage.textContent = "";

    try {

        const response = await fetch(
            "http://127.0.0.1:3000/generate-summary",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    noteId: noteId,
                    chapter: chapter
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            summaryText.textContent = "Unable to generate summary.";
            summaryMessage.textContent = data.message;
            return;
        }

        // Include the chapter name when one is selected.
        if (data.chapter === "all") {

            summaryTitle.textContent =
                data.moduleName + " Summary";

        } else {

            summaryTitle.textContent =
                data.moduleName + " - " +
                data.chapterTitle + " Summary";
        }

        summaryText.innerHTML = formatMarkdown(data.summary);

        summaryMessage.textContent =
            "Summary generated successfully.";

        // Preserve summary content after refreshing the page.
        saveSummaryState(
            data.moduleName +
            (data.chapter === "all"
                ? ""
                : " - " + data.chapterTitle),
            data.summary
        );

        localStorage.setItem(
            "marco_summary_chapter_" + noteId,
            String(chapter)
        );

        localStorage.setItem("currentResultId", data.resultId);

    } catch (error) {
        console.error(error);
        summaryText.textContent = "Unable to generate summary.";
        summaryMessage.textContent = "Could not connect to the server.";
    }
}

// ============================================================
// LOAD QUIZ CHAPTERS
// ============================================================

async function loadQuizChapters() {

    const chapterSelect = document.getElementById("quizChapter");

    if (!chapterSelect) {
        return;
    }

    const noteId = localStorage.getItem("currentNoteId");

    chapterSelect.innerHTML =
        '<option value="all">All Chapters</option>';

    if (!noteId) {
        return;
    }

    try {

        const response = await fetch(
            `http://127.0.0.1:3000/chapters/${noteId}`
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(data.message);
            return;
        }

        if (!Array.isArray(data.chapters)) {
            return;
        }

        data.chapters.forEach(chapter => {

            const option = document.createElement("option");

            option.value = chapter.index;
            option.textContent = chapter.title;

            chapterSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Unable to load chapters:", error);
    }
}

// ============================================================
// GENERATE AI QUIZ
// ============================================================

async function generateQuiz() {

    const noteId = localStorage.getItem("currentNoteId");

    const chapter =
        document.getElementById("quizChapter")?.value || "all";

    const quizType =
        document.getElementById("quizType")?.value || "multiple";

    const quizMessage = document.getElementById("quizMessage");
    const quizContainer = document.getElementById("quizContainer");
    const quizResult = document.getElementById("quizResult");
    const submitButton = document.getElementById("submitQuizButton");
    const quizTitle = document.getElementById("quizTitle");

    if (!noteId) {
        quizMessage.textContent =
            "Please upload and save study material first.";
        return;
    }

    quizMessage.textContent = "Generating your quiz...";
    quizContainer.innerHTML = "";
    quizResult.innerHTML = "";
    submitButton.style.display = "none";

    try {

        const response = await fetch(
            "http://127.0.0.1:3000/generate-quiz",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    noteId: noteId,
                    chapter: chapter,
                    quizType: quizType
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            quizMessage.textContent = data.message;
            return;
        }

        currentQuiz = data.questions;

        currentQuizType = quizType;
        currentQuizChapter = chapter;
        quizSubmitted = false;

        quizTitle.textContent = data.moduleName + " Quiz";

        quizMessage.textContent =
            "Choose one answer for each question.";

        displayQuiz();

        saveQuizState(data.moduleName);

        submitButton.style.display = "inline-block";

    } catch (error) {
        console.error(error);
        quizMessage.textContent = "Could not connect to the server.";
    }
}

// ============================================================
// DISPLAY QUIZ
// ============================================================

function displayQuiz() {

    const quizContainer = document.getElementById("quizContainer");

    quizContainer.innerHTML = "";

    currentQuiz.forEach((question, questionIndex) => {

        const questionBox = document.createElement("div");
        questionBox.className = "quiz-question";

        const questionHeading = document.createElement("h3");

        questionHeading.textContent =
            (questionIndex + 1) + ". " + question.question;

        questionBox.appendChild(questionHeading);

        question.options.forEach((option, optionIndex) => {

            const label = document.createElement("label");
            label.className = "quiz-option";

            const radio = document.createElement("input");

            radio.type = "radio";
            radio.name = "question-" + questionIndex;
            radio.value = optionIndex;

            label.appendChild(radio);
            label.appendChild(document.createTextNode(" " + option));

            questionBox.appendChild(label);
            questionBox.appendChild(document.createElement("br"));
        });

        quizContainer.appendChild(questionBox);
    });
}

// ============================================================
// SUBMIT QUIZ AND SAVE SCORE
// ============================================================

async function submitQuiz() {

    if (currentQuiz.length === 0 || quizSubmitted) {
        return;
    }

    let score = 0;
    let unanswered = 0;

    currentQuiz.forEach((question, questionIndex) => {

        const selected = document.querySelector(
            `input[name="question-${questionIndex}"]:checked`
        );

        if (!selected) {
            unanswered++;
        }
    });

    const quizResult = document.getElementById("quizResult");

    if (unanswered > 0) {

        quizResult.textContent =
            `Please answer all questions. ${unanswered} question(s) are unanswered.`;

        return;
    }

    currentQuiz.forEach((question, questionIndex) => {

        const selected = document.querySelector(
            `input[name="question-${questionIndex}"]:checked`
        );

        const selectedAnswer = Number(selected.value);

        const questionBox =
            document.querySelectorAll(".quiz-question")[questionIndex];

        const oldFeedback =
            questionBox.querySelector(".question-feedback");

        if (oldFeedback) {
            oldFeedback.remove();
        }

        const feedback = document.createElement("p");
        feedback.className = "question-feedback";

        if (selectedAnswer === question.correctAnswer) {

            score++;

            feedback.textContent = "Correct!";
            feedback.classList.add("correct-feedback");

        } else {

            feedback.classList.add("incorrect-feedback");

            const correctOption =
                question.options[question.correctAnswer];

            feedback.textContent =
                "Incorrect. Correct answer: " + correctOption;
        }

        questionBox.appendChild(feedback);

        const radioButtons =
            questionBox.querySelectorAll('input[type="radio"]');

        radioButtons.forEach(radio => {
            radio.disabled = true;
        });
    });

    const percentage =
        Math.round((score / currentQuiz.length) * 100);

    quizResult.innerHTML = `
        <h2>Quiz Result</h2>
        <p>
            You scored
            <strong>${score}/${currentQuiz.length}</strong>
            (${percentage}%)
        </p>
        <p id="quizSaveMessage">Saving your score...</p>
    `;

    quizSubmitted = true;

    document.getElementById("submitQuizButton").style.display = "none";

    saveQuizState(
        localStorage.getItem("currentModuleName") || "Study Material"
    );

    const userId = localStorage.getItem("userId");
    const noteId = localStorage.getItem("currentNoteId");
    const saveMessage = document.getElementById("quizSaveMessage");

    if (!userId || !noteId) {

        saveMessage.textContent =
            "Score calculated, but no user or study material was selected.";

        return;
    }

    try {

        const response = await fetch(
            "http://127.0.0.1:3000/save-quiz-score",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: userId,
                    noteId: noteId,
                    quizType: currentQuizType,
                    chapter: currentQuizChapter,
                    score: score,
                    totalQuestions: currentQuiz.length
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to save quiz score.");
        }

        saveMessage.textContent = "Quiz score saved successfully!";

    } catch (error) {

        console.error("Save quiz score error:", error);

        saveMessage.textContent =
            "Your score was calculated, but it could not be saved.";
    }
}

// ============================================================
// AI TUTOR
// ============================================================

async function askTutor() {

    const noteId = localStorage.getItem("currentNoteId");

    const questionInput = document.getElementById("tutorQuestion");
    const tutorMessage = document.getElementById("tutorMessage");
    const tutorAnswer = document.getElementById("tutorAnswer");

    const question = questionInput.value.trim();

    if (!noteId) {
        tutorMessage.textContent =
            "Please upload and save study material first.";
        return;
    }

    if (!question) {
        tutorMessage.textContent = "Please enter a question.";
        return;
    }

    tutorMessage.textContent = "Marco is thinking...";
    tutorAnswer.textContent = "";

    try {

        const response = await fetch(
            "http://127.0.0.1:3000/ask-tutor",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    noteId: noteId,
                    question: question
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            tutorMessage.textContent = data.message;
            return;
        }

        tutorAnswer.innerHTML = formatMarkdown(data.answer);

        tutorMessage.textContent =
            "Answer generated successfully.";

        saveTutorState(question, data.answer);

    } catch (error) {
        console.error(error);
        tutorMessage.textContent = "Could not connect to the server.";
    }
}

// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {

    const userId = localStorage.getItem("userId");
    const fullName = localStorage.getItem("fullName");
    const materialsContainer = document.getElementById("studyMaterials");

    if (!materialsContainer) {
        return;
    }

    if (!userId) {
        window.location.href = "index.html";
        return;
    }

    const welcomeMessage = document.getElementById("welcomeMessage");

    if (fullName && welcomeMessage) {
        welcomeMessage.textContent = "Welcome Back, " + fullName;
    }

    try {

        const response = await fetch(
            `http://127.0.0.1:3000/notes/${userId}`
        );

        const data = await response.json();

        if (!response.ok) {
            materialsContainer.innerHTML =
                "<p>Unable to load study materials.</p>";
            return;
        }

        document.getElementById("notesCount").textContent =
            data.notesCount;

        document.getElementById("summaryCount").textContent =
            data.summaryCount;

        materialsContainer.innerHTML = "";

        if (data.notes.length === 0) {

            materialsContainer.innerHTML =
                "<p>No study materials uploaded yet.</p>";

            return;
        }

        data.notes.forEach(note => {

            const card = document.createElement("div");
            card.className = "card";

            const title = document.createElement("h3");
            title.textContent = note.ModuleName;

            const date = document.createElement("p");

            const uploadDate = new Date(note.UploadDate + "Z");

            date.textContent =
                "Uploaded: " + uploadDate.toLocaleDateString();

            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "Study This";

            button.onclick = function () {
                selectStudyMaterial(note.NoteID, note.ModuleName);
            };

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";

            deleteButton.onclick = function () {
                deleteStudyMaterial(note.NoteID, note.ModuleName);
            };

            card.appendChild(title);
            card.appendChild(date);
            card.appendChild(button);
            card.appendChild(deleteButton);

            materialsContainer.appendChild(card);
        });

        const currentModule =
            localStorage.getItem("currentModuleName");

        if (currentModule) {

            const currentStudyMaterial =
                document.getElementById("currentStudyMaterial");

            if (currentStudyMaterial) {
                currentStudyMaterial.textContent = currentModule;
            }
        }

    } catch (error) {

        console.error(error);

        materialsContainer.innerHTML =
            "<p>Could not connect to the server.</p>";
    }
}

// ============================================================
// STUDENT PROGRESS AND READINESS
// ============================================================

async function loadQuizProgress() {

    const historyContainer = document.getElementById("quizHistory");

    if (!historyContainer) {
        return;
    }

    const userId = localStorage.getItem("userId");

    if (!userId) {
        return;
    }

    historyContainer.textContent = "Loading quiz history...";

    try {

        const response = await fetch(
            `http://127.0.0.1:3000/quiz-progress/${userId}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load quiz progress.");
        }

        // UPDATE DASHBOARD STATISTICS

        document.getElementById("quizzesCompleted").textContent =
            data.quizzesCompleted;

        document.getElementById("averageQuizScore").textContent =
            data.quizzesCompleted > 0
                ? data.averageQuizScore + "%"
                : "0%";

        document.getElementById("studyReadiness").textContent =
            data.studyReadiness;

        document.getElementById("readinessMessage").textContent =
            data.readinessMessage;

        document.getElementById("quizImprovement").textContent =
            data.quizImprovement;

        document.getElementById("improvementMessage").textContent =
            data.improvementMessage;

        // DISPLAY QUIZ HISTORY

        historyContainer.innerHTML = "";

        if (!Array.isArray(data.history) || data.history.length === 0) {

            historyContainer.textContent =
                "No quizzes completed yet. Complete a quiz to begin tracking your progress.";

            displayStudyRecommendations([]);

            return;
        }

        // PERSONALIZED STUDY RECOMMENDATIONS

        displayStudyRecommendations(data.history);

        // CREATE QUIZ HISTORY TABLE

        const tableWrapper = document.createElement("div");

        tableWrapper.style.overflowX = "auto";

        const table = document.createElement("table");

        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.textAlign = "left";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        const headings = [
            "Module",
            "Chapter",
            "Quiz Type",
            "Score",
            "Percentage",
            "Date"
        ];

        headings.forEach(heading => {

            const th = document.createElement("th");

            th.textContent = heading;
            th.style.padding = "12px";
            th.style.borderBottom = "2px solid #ccc";

            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        data.history.forEach(quiz => {

            const row = document.createElement("tr");

            const moduleCell = document.createElement("td");
            moduleCell.textContent = quiz.ModuleName;

            const chapterCell = document.createElement("td");

            if (String(quiz.Chapter) === "all") {

                chapterCell.textContent = "All Chapters";

            } else {

                const chapterNumber = Number(quiz.Chapter);

                chapterCell.textContent = Number.isInteger(chapterNumber)
                    ? "Chapter " + (chapterNumber + 1)
                    : String(quiz.Chapter);
            }

            const typeCell = document.createElement("td");

            if (quiz.QuizType === "multiple") {

                typeCell.textContent = "Multiple Choice";

            } else if (quiz.QuizType === "truefalse") {

                typeCell.textContent = "True / False";

            } else {

                typeCell.textContent = "Mixed";
            }

            const scoreCell = document.createElement("td");

            scoreCell.textContent =
                quiz.Score + " / " + quiz.TotalQuestions;

            const percentageCell = document.createElement("td");

            percentageCell.textContent = quiz.Percentage + "%";

            const dateCell = document.createElement("td");

            if (quiz.CompletedAt) {

                const completedDate = new Date(
                    quiz.CompletedAt.replace(" ", "T") + "Z"
                );

                dateCell.textContent = completedDate.toLocaleString();

            } else {

                dateCell.textContent = "Unknown";
            }

            const cells = [
                moduleCell,
                chapterCell,
                typeCell,
                scoreCell,
                percentageCell,
                dateCell
            ];

            cells.forEach(cell => {

                cell.style.padding = "12px";
                cell.style.borderBottom = "1px solid #ddd";

                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);

        tableWrapper.appendChild(table);

        historyContainer.appendChild(tableWrapper);

    } catch (error) {

        console.error("Quiz progress error:", error);

        historyContainer.textContent =
            "Unable to load quiz progress. Please check that the server is running.";

        const recommendations =
            document.getElementById("studyRecommendations");

        if (recommendations) {
            recommendations.textContent =
                "Unable to load recommendations at the moment.";
        }
    }
}

// ============================================================
// PERSONALIZED STUDY RECOMMENDATIONS
// ============================================================

function displayStudyRecommendations(history) {

    const container =
        document.getElementById("studyRecommendations");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!Array.isArray(history) || history.length === 0) {

        const card = document.createElement("div");
        card.className = "card";

        const heading = document.createElement("h3");
        heading.textContent = "No Recommendations Yet";

        const message = document.createElement("p");
        message.textContent =
            "Complete a quiz to receive personalized study recommendations.";

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Take a Quiz";

        button.onclick = function () {
            window.location.href = "quiz.html";
        };

        card.appendChild(heading);
        card.appendChild(message);
        card.appendChild(button);

        container.appendChild(card);

        return;
    }

    // GROUP QUIZZES BY MODULE

    const modules = {};

    history.forEach(quiz => {

        const moduleName = quiz.ModuleName || "Unknown Module";
        const percentage = Number(quiz.Percentage);

        if (!Number.isFinite(percentage)) {
            return;
        }

        if (!modules[moduleName]) {

            modules[moduleName] = {
                name: moduleName,
                scores: [],
                chapters: {}
            };
        }

        modules[moduleName].scores.push(percentage);

        const chapter = String(quiz.Chapter);

        if (chapter !== "all") {

            if (!modules[moduleName].chapters[chapter]) {
                modules[moduleName].chapters[chapter] = [];
            }

            modules[moduleName].chapters[chapter].push(percentage);
        }
    });

    // CALCULATE MODULE AVERAGES

    const moduleResults = Object.values(modules).map(module => {

        const total = module.scores.reduce(
            (sum, score) => sum + score,
            0
        );

        const average = Math.round(
            total / module.scores.length
        );

        return {
            name: module.name,
            average: average,
            attempts: module.scores.length,
            chapters: module.chapters
        };
    });

    moduleResults.sort((a, b) => a.average - b.average);

    // CREATE RECOMMENDATION CARDS

    moduleResults.forEach(module => {

        const card = document.createElement("div");
        card.className = "card";

        const title = document.createElement("h3");
        title.textContent = module.name;

        const scoreText = document.createElement("p");
        scoreText.textContent =
            "Average Quiz Score: " + module.average + "%";

        const attemptsText = document.createElement("p");
        attemptsText.textContent =
            "Quizzes Completed: " + module.attempts;

        const status = document.createElement("h4");
        const recommendation = document.createElement("p");

        if (module.average < 50) {

            status.textContent = "Needs More Practice";

            recommendation.textContent =
                "Your quiz results suggest that this module needs more attention. " +
                "Review your study notes, generate a summary, and ask Marco " +
                "to explain difficult concepts before attempting another quiz.";

        } else if (module.average < 70) {

            status.textContent = "Keep Improving";

            recommendation.textContent =
                "You have made some progress, but there is still room " +
                "for improvement. Revise the material and practise with " +
                "another quiz to strengthen your understanding.";

        } else if (module.average < 85) {

            status.textContent = "Good Progress";

            recommendation.textContent =
                "You are performing well in this module. Continue revising " +
                "and use more practice quizzes to improve your confidence.";

        } else {

            status.textContent = "Strong Performance";

            recommendation.textContent =
                "Excellent quiz performance! Continue reviewing this module " +
                "occasionally to help maintain your understanding.";
        }

        card.appendChild(title);
        card.appendChild(scoreText);
        card.appendChild(attemptsText);
        card.appendChild(status);
        card.appendChild(recommendation);

        // IDENTIFY WEAKER CHAPTERS

        const chapterResults = [];

        Object.keys(module.chapters).forEach(chapter => {

            const scores = module.chapters[chapter];

            const total = scores.reduce(
                (sum, score) => sum + score,
                0
            );

            const average = Math.round(
                total / scores.length
            );

            chapterResults.push({
                chapter: chapter,
                average: average
            });
        });

        chapterResults.sort((a, b) => a.average - b.average);

        const weakChapters = chapterResults.filter(
            chapter => chapter.average < 70
        );

        if (weakChapters.length > 0) {

            const chapterHeading = document.createElement("h4");
            chapterHeading.textContent = "Chapters to Revise";

            card.appendChild(chapterHeading);

            weakChapters.forEach(chapter => {

                const chapterText = document.createElement("p");

                const chapterIndex = Number(chapter.chapter);

                const chapterName = Number.isInteger(chapterIndex)
                    ? "Chapter " + (chapterIndex + 1)
                    : chapter.chapter;

                chapterText.textContent =
                    chapterName +
                    " - Average Score: " +
                    chapter.average +
                    "%";

                card.appendChild(chapterText);
            });
        }

        // RECOMMENDED STUDY ACTIONS

        const actionHeading = document.createElement("h4");
        actionHeading.textContent = "Recommended Study Actions";

        card.appendChild(actionHeading);

        const actions = document.createElement("p");

        if (module.average < 70) {

            actions.textContent =
                "1. Review your study notes. " +
                "2. Generate a summary. " +
                "3. Ask Marco questions. " +
                "4. Retake a quiz.";

        } else {

            actions.textContent =
                "1. Continue practising quizzes. " +
                "2. Review important concepts regularly.";
        }

        card.appendChild(actions);

        // NAVIGATION BUTTONS

        const summaryButton = document.createElement("button");
        summaryButton.type = "button";
        summaryButton.textContent = "Study Summary";

        summaryButton.onclick = function () {
            window.location.href = "summary.html";
        };

        const quizButton = document.createElement("button");
        quizButton.type = "button";
        quizButton.textContent = "Practice Quiz";

        quizButton.onclick = function () {
            window.location.href = "quiz.html";
        };

        const tutorButton = document.createElement("button");
        tutorButton.type = "button";
        tutorButton.textContent = "Ask Marco";

        tutorButton.onclick = function () {
            window.location.href = "tutor.html";
        };

        card.appendChild(summaryButton);
        card.appendChild(quizButton);
        card.appendChild(tutorButton);

        container.appendChild(card);
    });

    if (moduleResults.length === 0) {

        const message = document.createElement("p");

        message.textContent =
            "No valid quiz results are available for recommendations.";

        container.appendChild(message);
    }
}

// ============================================================
// LOAD SAVED SUMMARIES
// ============================================================

async function loadSavedSummaries() {

    const container = document.getElementById("savedSummaries");

    if (!container) {
        return;
    }

    const userId = localStorage.getItem("userId");

    if (!userId) {
        return;
    }

    try {

        const response = await fetch(
            `http://127.0.0.1:3000/summaries/${userId}`
        );

        if (!response.ok) {
            throw new Error("Unable to load summaries.");
        }

        const data = await response.json();

        container.innerHTML = "";

        if (data.summaries.length === 0) {
            container.textContent = "No summaries generated yet.";
            return;
        }

        data.summaries.forEach(summary => {

            const card = document.createElement("div");
            card.className = "card";

            const title = document.createElement("h3");
            title.textContent = summary.ModuleName;

            const date = document.createElement("p");

            date.textContent =
                "Generated: " +
                new Date(summary.CreatedAt + "Z").toLocaleDateString();

            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "View Summary";

            button.onclick = function () {
                viewSavedSummary(summary);
            };

            card.appendChild(title);
            card.appendChild(date);
            card.appendChild(button);

            container.appendChild(card);
        });

    } catch (error) {

        console.error(error);

        container.textContent =
            "Unable to load saved summaries.";
    }
}

// ============================================================
// VIEW SAVED SUMMARY
// ============================================================

function viewSavedSummary(summary) {

    const viewer = document.getElementById("savedSummaryViewer");

    document.getElementById("savedSummaryTitle").textContent =
        summary.ModuleName + " Summary";

    document.getElementById("savedSummaryDate").textContent =
        "Generated: " +
        new Date(summary.CreatedAt + "Z").toLocaleString();

    document.getElementById("savedSummaryContent").innerHTML =
        formatMarkdown(summary.Summary);

    viewer.style.display = "block";

    viewer.scrollIntoView({
        behavior: "smooth"
    });
}

function closeSavedSummary() {

    document.getElementById("savedSummaryViewer").style.display = "none";
}

// ============================================================
// SELECT STUDY MATERIAL
// ============================================================

function selectStudyMaterial(noteId, moduleName) {

    localStorage.setItem("currentNoteId", noteId);
    localStorage.setItem("currentModuleName", moduleName);

    const currentStudyMaterial =
        document.getElementById("currentStudyMaterial");

    if (currentStudyMaterial) {
        currentStudyMaterial.textContent = moduleName;
    }

    alert(moduleName + " is now your selected study material.");
}

// ============================================================
// DELETE STUDY MATERIAL
// ============================================================

async function deleteStudyMaterial(noteId, moduleName) {

    const confirmed = confirm(
        "Are you sure you want to delete " + moduleName + "?"
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            `http://127.0.0.1:3000/notes/${noteId}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        localStorage.removeItem("marco_summary_" + noteId);
        localStorage.removeItem("marco_summary_chapter_" + noteId);
        localStorage.removeItem("marco_quiz_" + noteId);
        localStorage.removeItem("marco_tutor_" + noteId);

        const currentNoteId =
            localStorage.getItem("currentNoteId");

        if (String(currentNoteId) === String(noteId)) {

            localStorage.removeItem("currentNoteId");
            localStorage.removeItem("currentModuleName");
            localStorage.removeItem("currentResultId");

            const currentStudyMaterial =
                document.getElementById("currentStudyMaterial");

            if (currentStudyMaterial) {
                currentStudyMaterial.textContent = "None selected";
            }
        }

        alert("Study material deleted successfully!");

        loadDashboard();
        loadSavedSummaries();
        loadQuizProgress();

    } catch (error) {

        console.error(error);

        alert("Could not connect to the server.");
    }
}

// ============================================================
// LOGOUT
// ============================================================

function logoutUser() {

    localStorage.removeItem("userId");
    localStorage.removeItem("fullName");
    localStorage.removeItem("currentNoteId");
    localStorage.removeItem("currentResultId");
    localStorage.removeItem("currentModuleName");

    localStorage.removeItem("marco_upload_module");
    localStorage.removeItem("marco_upload_notes");

    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {

        const key = localStorage.key(i);

        if (
            key &&
            (
                key.startsWith("marco_summary_") ||
                key.startsWith("marco_quiz_") ||
                key.startsWith("marco_tutor_")
            )
        ) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });

    window.location.href = "index.html";
}

// ============================================================
// THEME
// ============================================================

function toggleTheme() {

    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }
}

// ============================================================
// PAGE LOAD
// ============================================================

window.onload = function () {

    if (window.location.search.includes("register=true")) {

        const registerSection =
            document.getElementById("registerSection");

        if (registerSection) {
            showRegister();
        }
    }

    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
    }

    // Dashboard.
    loadDashboard();
    loadSavedSummaries();
    loadQuizProgress();

    // Summary.
    loadSummaryChapters();
    loadSummaryState();

    // Quiz.
    loadQuizState();
    loadQuizChapters();

    // AI Tutor.
    loadTutorState();

    // Upload form.
    loadUploadDraft();
};

// ============================================================
// ADMIN AUTHENTICATION AND SESSION SUPPORT
// ============================================================

// Include the login session cookie in all requests to Marco.
const originalFetch = window.fetch.bind(window);

window.fetch = function (url, options = {}) {

    if (String(url).startsWith("http://127.0.0.1:3000/")) {

        return originalFetch(url, {
            ...options,
            credentials: "include"
        });
    }

    return originalFetch(url, options);
};


// ============================================================
// UPDATED LOGIN - STUDENT / ADMIN
// ============================================================

loginUser = async function () {

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const message = document.getElementById("message");

    if (!email || !password) {
        message.textContent = "Please enter your email and password.";
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        message.textContent = "Please enter a valid email address.";
        return;
    }

    try {

        const response = await fetch("http://127.0.0.1:3000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.message;
            return;
        }

        localStorage.setItem("userId", data.userId);
        localStorage.setItem("fullName", data.fullName);
        localStorage.setItem("userRole", data.role);

        if (data.role === "admin") {
            window.location.href = "admin.html";
        } else {
            window.location.href = "dashboard.html";
        }

    } catch (error) {

        console.error(error);
        message.textContent = "Could not connect to the server.";
    }
};


// ============================================================
// UPDATED LOGOUT
// ============================================================

const originalLogoutUser = logoutUser;

logoutUser = async function () {

    try {

        await fetch("http://127.0.0.1:3000/logout", {
            method: "POST"
        });

    } catch (error) {

        console.error("Logout error:", error);
    }

    localStorage.removeItem("userRole");

    // Reuse the existing logout cleanup.
    originalLogoutUser();
};


// ============================================================
// CHECK CURRENT LOGIN SESSION
// ============================================================

async function checkLoginSession() {

    const page = window.location.pathname.split("/").pop();

    // Login and registration page does not require a session.
    if (page === "index.html" || page === "landing.html" || page === "") {
        return;
    }

    try {

        const response = await fetch("http://127.0.0.1:3000/auth/me");

        if (!response.ok) {

            localStorage.removeItem("userId");
            localStorage.removeItem("fullName");
            localStorage.removeItem("userRole");

            window.location.href = "index.html";
            return;
        }

        const user = await response.json();

        localStorage.setItem("userId", user.userId);
        localStorage.setItem("fullName", user.fullName);
        localStorage.setItem("userRole", user.role);

        if (user.role === "admin" && page !== "admin.html") {

            window.location.href = "admin.html";
            return;
        }

        if (user.role === "student" && page === "admin.html") {

            window.location.href = "dashboard.html";
        }

    } catch (error) {

        console.error("Session check error:", error);
    }
}


// ============================================================
// ADMIN API REQUESTS
// ============================================================

async function adminFetch(endpoint, options = {}) {

    const response = await fetch(
        "http://127.0.0.1:3000" + endpoint,
        options
    );

    if (!response.ok) {

        const data = await response.json().catch(() => ({}));

        throw new Error(
            data.message || "Admin request failed."
        );
    }

    return response.json();
}


// ============================================================
// PAGE SESSION CHECK
// ============================================================

checkLoginSession();

// ============================================================
// ADMIN DASHBOARD
// ============================================================

async function loadAdminDashboard() {

    // Only run this function on the admin page.
    const adminMessage = document.getElementById("adminMessage");

    if (!adminMessage) {
        return;
    }

    adminMessage.textContent = "Loading administrator dashboard...";

    try {

        // Retrieve system statistics, users and quiz activity.
        const [stats, usersData, activityData] = await Promise.all([
            adminFetch("/admin/stats"),
            adminFetch("/admin/users"),
            adminFetch("/admin/activity")
        ]);

        // ====================================================
        // SYSTEM STATISTICS
        // ====================================================

        document.getElementById("adminTotalUsers").textContent =
            stats.totalUsers;

        document.getElementById("adminTotalStudents").textContent =
            stats.totalStudents;

        document.getElementById("adminTotalAdmins").textContent =
            stats.totalAdmins;

        document.getElementById("adminTotalNotes").textContent =
            stats.totalNotes;

        document.getElementById("adminTotalSummaries").textContent =
            stats.totalSummaries;

        document.getElementById("adminTotalQuizzes").textContent =
            stats.totalQuizzes;

        document.getElementById("adminAverageQuizScore").textContent =
            stats.averageQuizScore + "%";

        document.getElementById("adminTutorQuestions").textContent =
            stats.totalTutorQuestions;

        // ====================================================
        // STUDENT MANAGEMENT
        // ====================================================

        const usersBody = document.getElementById("adminUsersBody");

        usersBody.innerHTML = "";

        const users = usersData.users || [];

        if (users.length === 0) {

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.textContent = "No users found.";

            row.appendChild(cell);
            usersBody.appendChild(row);

        } else {

            users.forEach(user => {

                const row = document.createElement("tr");

                const values = [
                    user.FullName,
                    user.Email,
                    user.Role,
                    user.NotesCount,
                    user.QuizzesCompleted
                ];

                values.forEach(value => {

                    const cell = document.createElement("td");

                    cell.textContent = value ?? "0";
                    cell.style.padding = "12px";
                    cell.style.borderBottom = "1px solid #ddd";

                    row.appendChild(cell);
                });

                const actionCell = document.createElement("td");
                actionCell.style.padding = "12px";

                if (user.Role === "student") {

                    const viewButton = document.createElement("button");

                    viewButton.type = "button";
                    viewButton.textContent = "View Details";

                    viewButton.onclick = function () {
                        viewAdminStudentDetails(user.UserID);
                    };

                    actionCell.appendChild(viewButton);

                    const deleteButton = document.createElement("button");

                    deleteButton.type = "button";
                    deleteButton.textContent = "Delete Student";

                    deleteButton.onclick = function () {
                        deleteAdminStudent(user.UserID, user.FullName);
                    };

                    actionCell.appendChild(deleteButton);

                } else {

                    actionCell.textContent = "Administrator";
                }

                row.appendChild(actionCell);
                usersBody.appendChild(row);
            });
        }

        // ====================================================
        // RECENT QUIZ ACTIVITY
        // ====================================================

        const activityBody = document.getElementById("adminActivityBody");

        activityBody.innerHTML = "";

        const activity = activityData.activity || [];

        if (activity.length === 0) {

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 5;
            cell.textContent = "No quiz activity recorded yet.";

            row.appendChild(cell);
            activityBody.appendChild(row);

        } else {

            activity.forEach(quiz => {

                const row = document.createElement("tr");

                const values = [
                    quiz.FullName,
                    quiz.ModuleName,
                    quiz.Score + " / " + quiz.TotalQuestions,
                    quiz.Percentage + "%",
                    quiz.CompletedAt
                ];

                values.forEach(value => {

                    const cell = document.createElement("td");

                    cell.textContent = value ?? "";
                    cell.style.padding = "12px";
                    cell.style.borderBottom = "1px solid #ddd";

                    row.appendChild(cell);
                });

                activityBody.appendChild(row);
            });
        }

        adminMessage.textContent =
            "Administrator dashboard loaded successfully.";

    } catch (error) {

        console.error("Admin dashboard error:", error);

        adminMessage.textContent =
            "Unable to load administrator dashboard: " + error.message;
    }
}


// ============================================================
// DELETE STUDENT ACCOUNT
// ============================================================

async function deleteAdminStudent(userId, fullName) {

    const confirmed = confirm(
        "Are you sure you want to permanently delete " +
        fullName +
        " and their study data?"
    );

    if (!confirmed) {
        return;
    }

    try {

        await adminFetch("/admin/users/" + userId, {
            method: "DELETE"
        });

        alert("Student account deleted successfully.");

        // Refresh dashboard statistics and student list.
        loadAdminDashboard();

    } catch (error) {

        console.error("Delete student error:", error);

        alert("Unable to delete student: " + error.message);
    }
}

// ============================================================
// ADMIN - SEARCH STUDENTS
// ============================================================

function searchAdminStudents() {

    const search = document.getElementById("adminStudentSearch")
        .value.toLowerCase().trim();

    const rows = document.querySelectorAll("#adminUsersBody tr");

    rows.forEach(row => {

        const cells = row.querySelectorAll("td");

        // Skip loading or empty-state rows.
        if (cells.length < 2) {
            return;
        }

        const name = cells[0].textContent.toLowerCase();
        const email = cells[1].textContent.toLowerCase();

        row.style.display =
            name.includes(search) || email.includes(search)
                ? ""
                : "none";
    });
}

// ============================================================
// ADMIN - VIEW STUDENT DETAILS
// ============================================================

async function viewAdminStudentDetails(userId) {

    const modal = document.getElementById("adminStudentModal");
    const container = document.getElementById("adminStudentDetails");

    modal.hidden = false;
    container.textContent = "Loading student information...";

    try {

        const data = await adminFetch("/admin/students/" + userId);

        container.innerHTML = "";

        // Helper for safely displaying text.
        function addText(parent, tag, value) {
            const element = document.createElement(tag);
            element.textContent = value;
            parent.appendChild(element);
            return element;
        }

        // STUDENT INFORMATION
        addText(container, "h3", data.student.FullName);
        addText(container, "p", "Email: " + data.student.Email);
        addText(container, "p", "Role: " + data.student.Role);

        // STUDENT STATISTICS
        const stats = document.createElement("div");
        stats.className = "admin-student-stats";

        [
            ["Study Materials", data.materialsCount],
            ["Completed Quizzes", data.quizzesCount],
            ["Average Quiz Score", data.averageScore + "%"]
        ].forEach(item => {

            const card = document.createElement("div");
            card.className = "admin-student-stat";

            addText(card, "h4", item[0]);
            addText(card, "p", item[1]);

            stats.appendChild(card);
        });

        container.appendChild(stats);

        // STUDY MATERIALS
        addText(container, "h3", "Study Materials");

        if (data.materials.length === 0) {

            addText(container, "p", "No study materials uploaded.");

        } else {

            const list = document.createElement("ul");

            data.materials.forEach(material => {
                addText(list, "li", material.ModuleName);
            });

            container.appendChild(list);
        }

        // QUIZ HISTORY
        addText(container, "h3", "Quiz History");

        if (data.quizzes.length === 0) {

            addText(container, "p", "No completed quizzes yet.");

        } else {

            const scroll = document.createElement("div");
            scroll.className = "admin-table-scroll";

            const table = document.createElement("table");
            table.className = "admin-table";

            const thead = document.createElement("thead");
            const headingRow = document.createElement("tr");

            ["Module", "Quiz Type", "Score", "Percentage", "Date"]
                .forEach(heading => {
                    addText(headingRow, "th", heading);
                });

            thead.appendChild(headingRow);
            table.appendChild(thead);

            const tbody = document.createElement("tbody");

            data.quizzes.forEach(quiz => {

                const row = document.createElement("tr");

                [
                    quiz.ModuleName,
                    quiz.QuizType,
                    quiz.Score + "/" + quiz.TotalQuestions,
                    quiz.Percentage + "%",
                    quiz.CompletedAt
                ].forEach(value => {
                    addText(row, "td", value ?? "");
                });

                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            scroll.appendChild(table);
            container.appendChild(scroll);
        }

    } catch (error) {

        console.error("Student details error:", error);

        container.textContent =
            "Unable to load student details: " + error.message;
    }
}


// ============================================================
// ADMIN - CLOSE STUDENT DETAILS
// ============================================================

function closeAdminStudentDetails() {

    document.getElementById("adminStudentModal").hidden = true;
}