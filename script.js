
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

        const response = await fetch("http://localhost:3000/register", {
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

        const response = await fetch("http://localhost:3000/login", {
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

        const response = await fetch("http://localhost:3000/notes", {
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

    // Use the Marked library for proper Markdown formatting.
    if (window.marked) {
        return marked.parse(String(text || ""));
    }

    // Safe fallback if the library is unavailable.
    const div = document.createElement("div");
    div.textContent = String(text || "");

    return div.innerHTML.replace(/\n/g, "<br>");
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
    updateSummaryDownloadButton();
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
        updateSummaryDownloadButton();

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

    updateSummaryDownloadButton();
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

        const downloadButton = document.getElementById("downloadQuizButton");

        if (downloadButton) {
            downloadButton.style.display = quizSubmitted
                ? "inline-block"
                : "none";
        }

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

    const downloadButton = document.getElementById("downloadQuizButton");
    if (downloadButton) downloadButton.style.display = "none";
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
            `http://localhost:3000/chapters/${noteId}`
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
            "http://localhost:3000/generate-summary",
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
            `http://localhost:3000/chapters/${noteId}`
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
    document.getElementById("downloadQuizButton").style.display = "none";
    submitButton.style.display = "none";

    try {

        const response = await fetch(
            "http://localhost:3000/generate-quiz",
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

        // Remember the student's answer for the PDF report.
        question.selectedAnswer = selectedAnswer;

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

    document.getElementById("downloadQuizButton").style.display = "inline-block";

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
            "http://localhost:3000/save-quiz-score",
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
            "http://localhost:3000/ask-tutor",
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
            `http://localhost:3000/notes/${userId}`
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
            `http://localhost:3000/quiz-progress/${userId}`
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
            `http://localhost:3000/summaries/${userId}`
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
            `http://localhost:3000/notes/${noteId}`,
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
    updateSummaryDownloadButton();

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

    if (String(url).startsWith("http://localhost:3000/")) {

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

        const response = await fetch("http://localhost:3000/login", {
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

        await fetch("http://localhost:3000/logout", {
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

    if (window.location.protocol === "file:") {
        return;
    }

    const page = window.location.pathname.split("/").pop();

    // Login and registration page does not require a session.
    if (page === "index.html" || page === "landing.html" || page === "") {
        return;
    }

    try {

        const response = await fetch("http://localhost:3000/auth/me", {
            credentials: "include"
        });

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
        "http://localhost:3000" + endpoint,
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

    searchAdminStudents();
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


        // ============================================================
        // STUDY PLANNER STATISTICS
        // ============================================================

        document.getElementById("totalStudySessions").textContent =
            stats.totalStudySessions;

        document.getElementById("completedStudySessions").textContent =
            stats.completedStudySessions;

        document.getElementById("studyCompletionRate").textContent =
            stats.studyCompletionRate + "%";


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
// ADMIN - SEARCH STUDENTS ACROSS ALL SECTIONS
// ============================================================

function searchAdminStudents() {

    const searchInput = document.getElementById("adminStudentSearch");

    if (!searchInput) {
        return;
    }

    const search = searchInput.value.toLowerCase().trim();

    // Find matching students using name or email.
    const matchingNames = new Set();

    document.querySelectorAll("#adminUsersBody tr").forEach(row => {

        const cells = row.querySelectorAll("td");

        if (cells.length < 2) {
            return;
        }

        const name = cells[0].textContent.toLowerCase();
        const email = cells[1].textContent.toLowerCase();

        const matches =
            name.includes(search) || email.includes(search);

        row.style.display = matches ? "" : "none";

        if (matches) {
            matchingNames.add(name);
        }
    });

    // Filter recent quiz activity.
    document.querySelectorAll("#adminActivityBody tr").forEach(row => {

        const cells = row.querySelectorAll("td");

        if (cells.length < 2) {
            return;
        }

        const studentName = cells[0].textContent.toLowerCase();

        row.style.display =
            matchingNames.has(studentName) ? "" : "none";
    });

    // Filter student feedback and calculate matching ratings.
    let totalReviews = 0;
    let totalRating = 0;

    document.querySelectorAll("#adminFeedbackBody tr").forEach(row => {

        const cells = row.querySelectorAll("td");

        if (cells.length < 5) {
            return;
        }

        const name = cells[0].textContent.toLowerCase();
        const email = cells[1].textContent.toLowerCase();

        const matches =
            name.includes(search) ||
            email.includes(search) ||
            matchingNames.has(name);

        row.style.display = matches ? "" : "none";

        if (matches) {

            totalReviews++;

            const stars = cells[2].textContent;
            totalRating += (stars.match(/★/g) || []).length;
        }
    });

    // Update feedback statistics to match the search.
    const reviewsElement = document.getElementById("adminTotalReviews");
    const ratingElement = document.getElementById("adminAverageRating");

    if (reviewsElement && ratingElement) {

        reviewsElement.textContent = totalReviews;

        ratingElement.textContent =
            totalReviews > 0
                ? (totalRating / totalReviews).toFixed(1) + " / 5"
                : "0 / 5";
    }
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

        // Add a PDF download button for this student.
        const oldButton = document.getElementById("downloadStudentPdf");

        if (oldButton) {
            oldButton.remove();
        }

        const downloadButton = document.createElement("button");
        downloadButton.id = "downloadStudentPdf";
        downloadButton.type = "button";
        downloadButton.textContent = "Download PDF";
        downloadButton.style.marginBottom = "15px";

        downloadButton.onclick = function () {
            downloadStudentReport(data);
        };

        container.appendChild(downloadButton);


        // Safely display text without inserting raw HTML.
        function addText(parent, tag, value) {
            const element = document.createElement(tag);
            element.textContent = value ?? "";
            parent.appendChild(element);
            return element;
        }

        // Create a table with headings and rows.
        function addTable(headings, rows) {

            const scroll = document.createElement("div");
            scroll.className = "admin-table-scroll";

            const table = document.createElement("table");
            table.className = "admin-table";

            const thead = document.createElement("thead");
            const headingRow = document.createElement("tr");

            headings.forEach(heading => {
                addText(headingRow, "th", heading);
            });

            thead.appendChild(headingRow);
            table.appendChild(thead);

            const tbody = document.createElement("tbody");

            rows.forEach(values => {

                const row = document.createElement("tr");

                values.forEach(value => {
                    addText(row, "td", value);
                });

                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            scroll.appendChild(table);
            container.appendChild(scroll);
        }

        // ----------------------------------------------------
        // STUDENT INFORMATION
        // ----------------------------------------------------

        addText(container, "h3", data.student.FullName);
        addText(container, "p", "Email: " + data.student.Email);
        addText(container, "p", "Role: " + data.student.Role);

        // ----------------------------------------------------
        // STUDENT STATISTICS
        // ----------------------------------------------------

        const stats = document.createElement("div");
        stats.className = "admin-student-stats";

        [
            ["Study Materials", data.materialsCount],
            ["Saved Summaries", data.summariesCount],
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

        // ----------------------------------------------------
        // STUDY MATERIALS
        // ----------------------------------------------------

        addText(container, "h3", "Study Materials");

        if (data.materials.length === 0) {

            addText(container, "p", "No study materials uploaded.");

        } else {

            addTable(
                ["Module", "Upload Date"],
                data.materials.map(material => [
                    material.ModuleName,
                    material.UploadDate
                ])
            );
        }

        // ----------------------------------------------------
        // SAVED AI SUMMARIES
        // ----------------------------------------------------

        addText(container, "h3", "Saved AI Summaries");

        if (data.summaries.length === 0) {

            addText(container, "p", "No AI summaries generated yet.");

        } else {

            data.summaries.forEach((summary, index) => {

                const details = document.createElement("details");
                details.className = "admin-summary-item";

                const heading = document.createElement("summary");

                heading.textContent =
                    (index + 1) + ". " + summary.ModuleName +
                    " - " + (summary.CreatedAt || "Unknown date");

                details.appendChild(heading);

                const content = document.createElement("div");
                content.className = "admin-summary-content";

                // Convert the AI summary's Markdown into formatted HTML.
                content.innerHTML = marked.parse(summary.Summary);

                details.appendChild(content);
                container.appendChild(details);
            });
        }

        // ----------------------------------------------------
        // MODULE QUIZ PERFORMANCE
        // ----------------------------------------------------

        addText(container, "h3", "Module Quiz Performance");

        if (data.modulePerformance.length === 0) {

            addText(container, "p", "No quiz performance available yet.");

        } else {

            addTable(
                ["Module", "Quizzes", "Average Score", "Highest Score"],
                data.modulePerformance.map(module => [
                    module.ModuleName,
                    module.QuizzesCompleted,
                    module.AverageScore + "%",
                    module.HighestScore + "%"
                ])
            );

            const weakest = data.modulePerformance[0];

            if (weakest.AverageScore < 60) {
                addText(
                    container,
                    "p",
                    "Recommended revision area: " +
                    weakest.ModuleName +
                    " (" + weakest.AverageScore + "% average)"
                );
            }
        }

        // ----------------------------------------------------
        // DETAILED QUIZ HISTORY
        // ----------------------------------------------------

        addText(container, "h3", "Detailed Quiz History");

        if (data.quizzes.length === 0) {

            addText(container, "p", "No completed quizzes yet.");

        } else {

            addTable(
                ["Module", "Type", "Chapter", "Score", "Percentage", "Date"],
                data.quizzes.map(quiz => [
                    quiz.ModuleName,
                    quiz.QuizType,
                    quiz.Chapter === "all"
                        ? "All Chapters"
                        : quiz.Chapter,
                    quiz.Score + "/" + quiz.TotalQuestions,
                    quiz.Percentage + "%",
                    quiz.CompletedAt
                ])
            );
        }

        // ----------------------------------------------------
        // STUDENT FEEDBACK
        // ----------------------------------------------------

        addText(container, "h3", "Student Feedback");

        if (data.feedback.length === 0) {

            addText(container, "p", "No feedback submitted yet.");

        } else {

            addTable(
                ["Rating", "Feedback", "Date"],
                data.feedback.map(review => [
                    "★".repeat(review.Rating) +
                    "☆".repeat(5 - review.Rating),
                    review.Comment,
                    review.CreatedAt
                ])
            );
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

// ============================================================
// ADMIN - DOWNLOAD DATABASE BACKUP
// ============================================================

async function backupAdminDatabase() {

    try {

        const response = await fetch(
            "http://localhost:3000/admin/backup",
            {
                method: "GET",
                credentials: "include"
            }
        );

        if (!response.ok) {
            alert("Database backup failed.");
            return;
        }

        // Convert the response into a downloadable file.
        const blob = await response.blob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "marco_database_backup.db";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        alert("Database backup downloaded successfully!");

    } catch (error) {

        console.error("Backup error:", error);
        alert("Unable to download database backup.");
    }
}


// ============================================================
// STUDENT FEEDBACK - STAR RATING
// ============================================================

// Store the rating selected by the student.
let feedbackRating = 0;

function selectFeedbackRating(rating) {

    feedbackRating = rating;

    const stars = document.querySelectorAll("#feedbackStars button");

    stars.forEach((star, index) => {
        star.classList.toggle("selected", index < rating);
    });

    document.getElementById("selectedFeedbackRating").textContent =
        `You selected ${rating} out of 5 stars`;
}


// ============================================================
// STUDENT FEEDBACK - SUBMIT REVIEW
// ============================================================

async function submitStudentFeedback() {

    const comment = document
        .getElementById("studentFeedbackComment")
        .value
        .trim();

    const message = document.getElementById("studentFeedbackMessage");

    // Make sure a rating was selected.
    if (feedbackRating === 0) {
        message.textContent = "Please select a star rating.";
        return;
    }

    // Make sure feedback was entered.
    if (!comment) {
        message.textContent = "Please enter your feedback.";
        return;
    }

    try {

        // Send the review to the backend.
        const response = await fetch("http://localhost:3000/feedback", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                rating: feedbackRating,
                comment: comment
            })
        });

        const data = await response.json();

        message.textContent = data.message || "Unable to submit feedback.";

        if (response.ok) {

            // Clear the form after successful submission.
            document.getElementById("studentFeedbackComment").value = "";

            feedbackRating = 0;

            document.querySelectorAll("#feedbackStars button")
                .forEach(star => star.classList.remove("selected"));

            document.getElementById("selectedFeedbackRating").textContent =
                "No rating selected";
        }

    } catch (error) {

        console.error("Feedback error:", error);

        message.textContent =
            "Unable to submit feedback. Please try again.";
    }
}


// ============================================================
// ADMIN - LOAD STUDENT FEEDBACK
// ============================================================

async function loadAdminFeedback() {

    const feedbackBody = document.getElementById("adminFeedbackBody");

    // Only run on the admin dashboard.
    if (!feedbackBody) {
        return;
    }

    try {

        const response = await fetch("http://localhost:3000/admin/feedback", {
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            feedbackBody.innerHTML =
                '<tr><td colspan="5">Unable to load feedback.</td></tr>';
            return;
        }

        // Update feedback statistics.
        document.getElementById("adminTotalReviews").textContent =
            data.totalReviews;

        document.getElementById("adminAverageRating").textContent =
            data.averageRating + " / 5";

        // Clear the table.
        feedbackBody.innerHTML = "";

        // No feedback submitted yet.
        if (data.feedback.length === 0) {

            feedbackBody.innerHTML =
                '<tr><td colspan="5">No student feedback submitted yet.</td></tr>';

            return;
        }

        // Display each review.
        data.feedback.forEach(review => {

            const row = document.createElement("tr");

            const nameCell = document.createElement("td");
            nameCell.textContent = review.FullName;

            const emailCell = document.createElement("td");
            emailCell.textContent = review.Email;

            const ratingCell = document.createElement("td");
            ratingCell.textContent =
                "★".repeat(review.Rating) +
                "☆".repeat(5 - review.Rating);

            const commentCell = document.createElement("td");
            commentCell.textContent = review.Comment;

            const dateCell = document.createElement("td");

            dateCell.textContent = review.CreatedAt
                ? new Date(review.CreatedAt.replace(" ", "T") + "Z").toLocaleString()
                : "Unknown";

            row.appendChild(nameCell);
            row.appendChild(emailCell);
            row.appendChild(ratingCell);
            row.appendChild(commentCell);
            row.appendChild(dateCell);

            feedbackBody.appendChild(row);
        });
        searchAdminStudents();

    } catch (error) {

        console.error("Admin feedback error:", error);

        feedbackBody.innerHTML =
            '<tr><td colspan="5">Could not connect to the server.</td></tr>';
    }
}


// ============================================================
// ADMIN - DOWNLOAD INDIVIDUAL STUDENT PDF REPORT
// ============================================================

function downloadStudentReport(data) {

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF library could not load. Check your internet connection.");
        return;
    }

    const pdf = new window.jspdf.jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let y = 20;

    // Add a new page when the current page is full.
    function checkPage(height = 12) {
        if (y + height > pageHeight - 20) {
            pdf.addPage();
            y = 20;
        }
    }

    // Add a section heading.
    function addHeading(title) {
        checkPage(18);
        y += 6;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.text(title, 15, y);
        y += 8;
    }

    // Add ordinary text, wrapping long lines.
    function addText(text) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);

        const lines = pdf.splitTextToSize(
            String(text ?? ""),
            pageWidth - 30
        );

        lines.forEach(line => {
            checkPage(6);
            pdf.text(line, 15, y);
            y += 5;
        });

        y += 3;
    }

    // Add a table using the PDF table library.
    function addTable(headings, rows) {

        if (!rows || rows.length === 0) {
            addText("No records available.");
            return;
        }

        if (typeof pdf.autoTable !== "function") {
            addText("Unable to generate report table.");
            return;
        }

        pdf.autoTable({
            startY: y,
            head: [headings],
            body: rows.map(row =>
                row.map(value => String(value ?? ""))
            ),
            margin: { left: 15, right: 15 },
            theme: "grid",
            styles: {
                fontSize: 8,
                cellPadding: 3,
                overflow: "linebreak"
            },
            headStyles: {
                fillColor: [35, 95, 180]
            }
        });

        y = pdf.lastAutoTable.finalY + 8;
    }

    // --------------------------------------------------------
    // REPORT TITLE
    // --------------------------------------------------------

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Marco AI Study Assistant", 15, y);

    y += 10;

    pdf.setFontSize(14);
    pdf.text("Student Progress Report", 15, y);

    y += 10;

    pdf.setDrawColor(35, 95, 180);
    pdf.line(15, y, pageWidth - 15, y);

    y += 12;

    // --------------------------------------------------------
    // STUDENT INFORMATION
    // --------------------------------------------------------

    addHeading("Student Information");

    addText("Name: " + data.student.FullName);
    addText("Email: " + data.student.Email);
    addText("Role: " + data.student.Role);
    addText("Report Date: " + new Date().toLocaleString());

    // --------------------------------------------------------
    // STUDENT STATISTICS
    // --------------------------------------------------------

    addHeading("Student Statistics");

    addTable(
        ["Statistic", "Value"],
        [
            ["Study Materials", data.materialsCount],
            ["Saved Summaries", data.summariesCount],
            ["Completed Quizzes", data.quizzesCount],
            ["Average Quiz Score", data.averageScore + "%"]
        ]
    );

    // --------------------------------------------------------
    // STUDY MATERIALS
    // --------------------------------------------------------

    addHeading("Study Materials");

    addTable(
        ["Module", "Upload Date"],
        data.materials.map(material => [
            material.ModuleName,
            material.UploadDate
        ])
    );

    // --------------------------------------------------------
    // SAVED AI SUMMARIES
    // --------------------------------------------------------

    addHeading("Saved AI Summaries");

    if (data.summaries.length === 0) {

        addText("No AI summaries generated yet.");

    } else {

        data.summaries.forEach((summary, index) => {

            checkPage(18);

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);

            const title = pdf.splitTextToSize(
                (index + 1) + ". " + summary.ModuleName,
                pageWidth - 30
            );

            title.forEach(line => {
                checkPage(6);
                pdf.text(line, 15, y);
                y += 5;
            });

            y += 2;

            addText("Created: " + (summary.CreatedAt || "Unknown"));

            // Include the actual saved summary content.
            // Remove Markdown formatting for readable PDF text.
            const summaryText = String(summary.Summary || "")
                .replace(/```[\s\S]*?```/g, "[Code block]")
                .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
                .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                .replace(/[#*`_~]/g, "")
                .replace(/[^\x20-\x7E\n\r\t]/g, "");

            addText(summaryText);
            y += 3;
        });
    }

    // --------------------------------------------------------
    // MODULE QUIZ PERFORMANCE
    // --------------------------------------------------------

    addHeading("Module Quiz Performance");

    addTable(
        ["Module", "Quizzes", "Average", "Highest"],
        data.modulePerformance.map(module => [
            module.ModuleName,
            module.QuizzesCompleted,
            module.AverageScore + "%",
            module.HighestScore + "%"
        ])
    );

    // --------------------------------------------------------
    // DETAILED QUIZ HISTORY
    // --------------------------------------------------------

    addHeading("Detailed Quiz History");

    addTable(
        ["Module", "Type", "Chapter", "Score", "Percentage", "Date"],
        data.quizzes.map(quiz => [
            quiz.ModuleName,
            quiz.QuizType,
            quiz.Chapter === "all" ? "All Chapters" : quiz.Chapter,
            quiz.Score + "/" + quiz.TotalQuestions,
            quiz.Percentage + "%",
            quiz.CompletedAt
        ])
    );

    // --------------------------------------------------------
    // STUDENT FEEDBACK
    // --------------------------------------------------------

    addHeading("Student Feedback");

    addTable(
        ["Rating", "Feedback", "Date"],
        data.feedback.map(review => [
            review.Rating + "/5",
            review.Comment,
            review.CreatedAt
        ])
    );

    // --------------------------------------------------------
    // PAGE NUMBERS
    // --------------------------------------------------------

    const totalPages = pdf.internal.getNumberOfPages();

    for (let page = 1; page <= totalPages; page++) {

        pdf.setPage(page);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100);

        pdf.text(
            "Marco AI Study Assistant - Page " + page + " of " + totalPages,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" }
        );
    }

    // --------------------------------------------------------
    // DOWNLOAD PDF
    // --------------------------------------------------------

    const studentName = String(data.student.FullName || "Student")
        .replace(/[^a-zA-Z0-9_-]/g, "_");

    pdf.save("Marco_Student_Report_" + studentName + ".pdf");
}



// ============================================================
// DOWNLOAD FORMATTED AI SUMMARY AS PDF
// ============================================================
function updateSummaryDownloadButton() {

    const button = document.getElementById("downloadSummaryButton");

    if (!button) return;

    const key = getStudyStorageKey("summary");
    const saved = key ? localStorage.getItem(key) : null;

    button.disabled = !saved;
    button.style.display = saved ? "inline-block" : "none";
}


function downloadSummaryPDF() {

    const key = getStudyStorageKey("summary");
    const saved = key ? localStorage.getItem(key) : null;

    if (!saved) {
        alert("Please generate a summary first.");
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF library could not load.");
        return;
    }

    const data = JSON.parse(saved);
    const pdf = new window.jspdf.jsPDF();

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 20;
    const maxWidth = pageWidth - margin * 2;

    let y = 20;

    // Add a new page when there is not enough space.
    function checkPage(height = 8) {
        if (y + height > pageHeight - 20) {
            pdf.addPage();
            y = 20;
        }
    }

    // Write text with automatic wrapping.
    function addText(text, fontSize = 11, bold = false, spacing = 6) {

        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(fontSize);

        const lines = pdf.splitTextToSize(text, maxWidth);

        lines.forEach(line => {
            checkPage(spacing);
            pdf.text(line, margin, y);
            y += spacing;
        });
    }

    // Main document heading.
    pdf.setTextColor(35, 65, 110);
    addText("MARCO AI STUDY ASSISTANT", 18, true, 9);

    y += 4;

    pdf.setTextColor(30, 30, 30);
    addText(data.moduleName + " Summary", 15, true, 8);

    y += 8;

    // Process each Markdown line.
    const contentLines = data.summary.split("\n");

    contentLines.forEach(rawLine => {

        let line = rawLine.trim();

        // Empty line.
        if (!line) {
            y += 3;
            return;
        }

        // Horizontal divider.
        if (line === "---") {
            checkPage(8);
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, y, pageWidth - margin, y);
            y += 8;
            return;
        }

        // Remove Markdown bold markers.
        line = line.replace(/\*\*/g, "");

        // Main heading.
        if (line.startsWith("# ")) {
            y += 5;
            pdf.setTextColor(35, 65, 110);
            addText(line.substring(2), 15, true, 8);
            pdf.setTextColor(30, 30, 30);
            y += 3;
        }

        // Chapter heading.
        else if (line.startsWith("## ")) {
            y += 5;
            pdf.setTextColor(35, 65, 110);
            addText(line.substring(3), 13, true, 7);
            pdf.setTextColor(30, 30, 30);
            y += 3;
        }

        // Section heading.
        else if (line.startsWith("### ")) {
            y += 4;
            addText(line.substring(4), 12, true, 7);
            y += 2;
        }

        // Bullet points.
        else if (line.startsWith("* ") || line.startsWith("- ")) {
            addText("• " + line.substring(2), 11, false, 6);
            y += 2;
        }

        // Regular text.
        else {
            addText(line, 11, false, 6);
            y += 2;
        }
    });

    // Add page numbers.
    const totalPages = pdf.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {

        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);

        pdf.text(
            "Marco AI Study Assistant | Page " + i + " of " + totalPages,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" }
        );
    }

    // Save the PDF.
    const fileName = data.moduleName.replace(/[^a-z0-9]/gi, "_");

    pdf.save("Marco_Summary_" + fileName + ".pdf");
}


// ============================================================
// DOWNLOAD QUIZ RESULTS AS PDF
// ============================================================

function downloadQuizPDF() {

    if (!quizSubmitted || currentQuiz.length === 0) {
        alert("Please complete a quiz first.");
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF library could not load.");
        return;
    }

    const pdf = new window.jspdf.jsPDF();

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 20;
    const maxWidth = pageWidth - margin * 2;

    let y = 20;

    // Start a new page when needed.
    function checkPage(height = 8) {
        if (y + height > pageHeight - 20) {
            pdf.addPage();
            y = 20;
        }
    }

    // Add wrapped text.
    function addText(text, fontSize = 11, bold = false) {

        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(fontSize);

        const lines = pdf.splitTextToSize(String(text), maxWidth);

        lines.forEach(line => {
            checkPage(7);
            pdf.text(line, margin, y);
            y += 7;
        });
    }

    // Calculate the score using saved student answers.
    let score = 0;

    currentQuiz.forEach(question => {
        if (question.selectedAnswer === question.correctAnswer) {
            score++;
        }
    });

    const percentage = Math.round(
        (score / currentQuiz.length) * 100
    );

    // PDF heading.
    pdf.setTextColor(35, 65, 110);
    addText("MARCO AI STUDY ASSISTANT", 18, true);

    y += 5;

    pdf.setTextColor(30, 30, 30);
    addText(document.getElementById("quizTitle").textContent, 15, true);

    y += 5;

    addText("Student: " + (localStorage.getItem("fullName") || "Student"));
    addText("Score: " + score + "/" + currentQuiz.length);
    addText("Percentage: " + percentage + "%");
    addText("Date: " + new Date().toLocaleDateString());

    y += 10;

    // Questions and answers.
    currentQuiz.forEach((question, index) => {

        checkPage(25);

        pdf.setTextColor(35, 65, 110);
        addText((index + 1) + ". " + question.question, 12, true);

        y += 3;

        pdf.setTextColor(30, 30, 30);

        const selected = question.selectedAnswer;

        const studentAnswer = selected === undefined
            ? "Not recorded"
            : question.options[selected];

        const correctAnswer = question.options[question.correctAnswer];

        addText("Your Answer: " + studentAnswer);
        addText("Correct Answer: " + correctAnswer);

        const isCorrect = selected === question.correctAnswer;

        addText("Result: " + (isCorrect ? "Correct" : "Incorrect"));

        y += 8;
    });

    // Page numbers.
    const totalPages = pdf.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {

        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);

        pdf.text(
            "Marco AI Study Assistant | Page " + i + " of " + totalPages,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" }
        );
    }

    const moduleName = (
        document.getElementById("quizTitle").textContent || "Quiz"
    ).replace(/[^a-z0-9]/gi, "_");

    pdf.save("Marco_Quiz_Results_" + moduleName + ".pdf");
}


// ============================================================
// AI FLASHCARDS
// ============================================================

let flashcards = [];
let flashcardIndex = 0;
let flashcardFlipped = false;

// Load available chapters for the selected study material.
async function loadFlashcardChapters() {

    const chapterSelect = document.getElementById("flashcardChapter");

    // Only run on the Flashcards page.
    if (!chapterSelect) return;

    const noteId = localStorage.getItem("currentNoteId");
    const moduleName = localStorage.getItem("currentModuleName");

    const moduleTitle = document.getElementById("flashcardModule");
    moduleTitle.textContent = moduleName || "No study material selected";

    chapterSelect.innerHTML = '<option value="all">All Chapters</option>';

    if (!noteId) {
        document.getElementById("flashcardMessage").textContent =
            "Please select study material from your dashboard first.";
        return;
    }

    try {
        // Reuse Marco's existing chapter detection endpoint.
        const response = await fetch(
            `http://localhost:3000/chapters/${noteId}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        data.chapters.forEach(chapter => {
            const option = document.createElement("option");
            option.value = chapter.index;
            option.textContent = chapter.title;
            chapterSelect.appendChild(option);
        });

    } catch (error) {
        console.error(error);
        document.getElementById("flashcardMessage").textContent =
            "Unable to load chapters.";
    }
}

// Ask Gemini to generate 10 flashcards.
async function generateFlashcards() {

    const noteId = localStorage.getItem("currentNoteId");
    const chapter = document.getElementById("flashcardChapter").value;
    const message = document.getElementById("flashcardMessage");
    const button = document.getElementById("generateFlashcardsButton");

    if (!noteId) {
        message.textContent = "Please select study material first.";
        return;
    }

    button.disabled = true;
    message.textContent = "Generating flashcards. Please wait...";

    try {
        const response = await fetch(
            "http://localhost:3000/generate-flashcards",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ noteId, chapter })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        flashcards = data.flashcards;
        flashcardIndex = 0;
        flashcardFlipped = false;

        document.getElementById("flashcardTitle").textContent =
            data.moduleName + " - " + data.chapterTitle;

        document.getElementById("flashcardSection").style.display = "block";

        showFlashcard();

        message.textContent = "Flashcards generated successfully!";

    } catch (error) {
        console.error(error);
        message.textContent = error.message || "Unable to generate flashcards.";

    } finally {
        button.disabled = false;
    }
}

// Display the current question or answer.
function showFlashcard() {

    if (flashcards.length === 0) return;

    const card = flashcards[flashcardIndex];

    document.getElementById("flashcardCounter").textContent =
        `Flashcard ${flashcardIndex + 1} of ${flashcards.length}`;

    document.getElementById("flashcardSide").textContent =
        flashcardFlipped ? "Answer" : "Question";

    document.getElementById("flashcardText").textContent =
        flashcardFlipped ? card.answer : card.question;
}

// Flip the card between question and answer.
function flipFlashcard() {
    if (flashcards.length === 0) return;

    flashcardFlipped = !flashcardFlipped;
    showFlashcard();
}

// Move to the next flashcard.
function nextFlashcard() {
    if (flashcardIndex >= flashcards.length - 1) return;

    flashcardIndex++;
    flashcardFlipped = false;
    showFlashcard();
}

// Move to the previous flashcard.
function previousFlashcard() {
    if (flashcardIndex <= 0) return;

    flashcardIndex--;
    flashcardFlipped = false;
    showFlashcard();
}

// Load chapters when the Flashcards page opens.
if (document.getElementById("flashcardChapter")) {
    loadFlashcardChapters();
}


// ============================================================
// STUDY PLANNER
// ============================================================

let plannerSessions = [];
let plannerWeekDate = new Date();
let editingSessionId = null;

// Format a date as YYYY-MM-DD using local time.
function plannerDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// Find the Monday of the selected week.
function plannerMonday() {
    const monday = new Date(plannerWeekDate);
    const day = monday.getDay();
    monday.setDate(monday.getDate() - ((day + 6) % 7));
    monday.setHours(12, 0, 0, 0);
    return monday;
}

// Load the logged-in student's saved sessions.
async function loadStudySessions() {
    const message = document.getElementById("plannerMessage");

    try {
        const response = await fetch("/study-sessions");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load sessions.");
        }

        plannerSessions = data.sessions;
        displayPlannerWeek();

    } catch (error) {
        message.textContent = error.message;
    }
}

// Save a new session or update an existing one.
async function saveStudySession(event) {
    event.preventDefault();

    const message = document.getElementById("plannerMessage");

    const session = {
        moduleName: document.getElementById("plannerModule").value.trim(),
        studyDate: document.getElementById("plannerDate").value,
        startTime: document.getElementById("plannerTime").value,
        duration: Number(document.getElementById("plannerDuration").value)
    };

    if (!session.moduleName || !session.studyDate ||
        !session.startTime || !Number.isInteger(session.duration) ||
        session.duration < 1 || session.duration > 1440) {
        message.textContent = "Please enter valid session details.";
        return;
    }

    const isEditing = editingSessionId !== null;

    try {
        const response = await fetch(
            isEditing ? `/study-sessions/${editingSessionId}` : "/study-sessions",
            {
                method: isEditing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(session)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to save session.");
        }

        cancelStudySessionEdit();

        // Show the week containing the saved session.
        plannerWeekDate = new Date(session.studyDate + "T12:00:00");

        await loadStudySessions();
        message.textContent = data.message;

    } catch (error) {
        message.textContent = error.message;
    }
}

// Fill the form with an existing session's details.
function editStudySession(id) {
    const session = plannerSessions.find(s => s.SessionID === id);
    if (!session) return;

    editingSessionId = id;

    document.getElementById("plannerModule").value = session.ModuleName;
    document.getElementById("plannerDate").value = session.StudyDate;
    document.getElementById("plannerTime").value = session.StartTime;
    document.getElementById("plannerDuration").value = session.Duration;

    document.getElementById("plannerFormTitle").textContent = "Edit Study Session";
    document.getElementById("plannerSaveButton").textContent = "Save Changes";
    document.getElementById("plannerCancelButton").style.display = "inline-block";

    document.getElementById("studySessionForm").scrollIntoView({
        behavior: "smooth"
    });
}

// Reset the form after editing or saving.
function cancelStudySessionEdit() {
    editingSessionId = null;

    document.getElementById("studySessionForm").reset();
    document.getElementById("plannerFormTitle").textContent = "Add Study Session";
    document.getElementById("plannerSaveButton").textContent = "Add Session";
    document.getElementById("plannerCancelButton").style.display = "none";
}

// Mark a session as complete or incomplete.
async function toggleStudySession(id) {
    const session = plannerSessions.find(s => s.SessionID === id);
    if (!session) return;

    try {
        const response = await fetch(`/study-sessions/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                completed: session.Completed ? 0 : 1
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        await loadStudySessions();

    } catch (error) {
        document.getElementById("plannerMessage").textContent = error.message;
    }
}

// Delete a session after confirmation.
async function deleteStudySession(id) {
    if (!confirm("Delete this study session?")) return;

    try {
        const response = await fetch(`/study-sessions/${id}`, {
            method: "DELETE"
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        await loadStudySessions();
        document.getElementById("plannerMessage").textContent = data.message;

    } catch (error) {
        document.getElementById("plannerMessage").textContent = error.message;
    }
}

// Move forward or backward by one week.
function changePlannerWeek(amount) {
    plannerWeekDate.setDate(plannerWeekDate.getDate() + amount * 7);
    displayPlannerWeek();
}

// Return to the current week.
function goToCurrentPlannerWeek() {
    plannerWeekDate = new Date();
    displayPlannerWeek();
}

// Display seven days, Monday through Sunday.
function displayPlannerWeek() {
    const container = document.getElementById("plannerWeek");
    if (!container) return;

    container.innerHTML = "";

    const monday = plannerMonday();
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    document.getElementById("plannerWeekLabel").textContent =
        `${monday.toLocaleDateString("en-GB", {
            day: "numeric", month: "short"
        })} - ${sunday.toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric"
        })}`;

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);

        const dateString = plannerDateString(date);

        const daySessions = plannerSessions.filter(
            session => session.StudyDate === dateString
        );

        const dayCard = document.createElement("div");
        dayCard.className = "planner-day";

        const heading = document.createElement("h3");
        heading.textContent = date.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "short"
        });

        dayCard.appendChild(heading);

        if (daySessions.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "No sessions planned.";
            dayCard.appendChild(empty);
        }

        daySessions.forEach(session => {
            const item = document.createElement("div");
            item.className = "planner-session";

            if (session.Completed) {
                item.classList.add("planner-completed");
            }

            const title = document.createElement("h4");
            title.textContent = session.ModuleName;

            const details = document.createElement("p");
            details.textContent =
                `${session.StartTime} | ${session.Duration} minutes`;

            const status = document.createElement("p");
            status.textContent = session.Completed
                ? "Completed"
                : "Not completed";

            const completeButton = document.createElement("button");
            completeButton.textContent = session.Completed
                ? "Mark Incomplete"
                : "Mark Complete";
            completeButton.onclick = () =>
                toggleStudySession(session.SessionID);

            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.onclick = () =>
                editStudySession(session.SessionID);

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.onclick = () =>
                deleteStudySession(session.SessionID);

            item.appendChild(title);
            item.appendChild(details);
            item.appendChild(status);
            item.appendChild(completeButton);
            item.appendChild(editButton);
            item.appendChild(deleteButton);

            dayCard.appendChild(item);
        });

        container.appendChild(dayCard);
    }
}

// Start the planner only on planner.html.
if (document.getElementById("plannerWeek")) {
    loadStudySessions();
}


 // ============================================================
 // ADMIN - QUIZ PERFORMANCE CHART
 // ============================================================

 async function loadQuizPerformanceChart() {

     const canvas = document.getElementById("quizPerformanceChart");

     // Only run on the admin page.
     if (!canvas) return;

     try {
         // Get quiz performance data from the server.
         const response = await fetch("/admin/quiz-chart");

         if (!response.ok) {
             throw new Error("Failed to load quiz performance.");
         }

         const data = await response.json();

         // Get module names and average scores.
         const modules = data.performance.map(item => item.ModuleName);
         const scores = data.performance.map(item => item.AverageScore);

         // Create the bar chart.
         new Chart(canvas, {
             type: "bar",
             data: {
                 labels: modules,
                 datasets: [{
                     label: "Average Quiz Score (%)",
                     data: scores,
                     backgroundColor: "#2563eb",
                     borderRadius: 6
                 }]
             },
             options: {
                 responsive: true,
                 scales: {
                     y: {
                         beginAtZero: true,
                         max: 100
                     }
                 }
             }
         });

     } catch (error) {
         console.error("Quiz performance chart error:", error);
     }
 }





