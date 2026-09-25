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

    const userId =
        localStorage.getItem("userId");

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

            localStorage.setItem(
                "currentNoteId",
                data.noteId
            );

            localStorage.setItem(
                "currentModuleName",
                moduleName
            );

            // Clear the upload draft after it has been saved.
            localStorage.removeItem("marco_upload_module");
            localStorage.removeItem("marco_upload_notes");

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

    const fileInput =
        document.getElementById("noteFile");

    const file = fileInput.files[0];

    const message =
        document.getElementById("uploadMessage");

    if (!file) {
        return;
    }

    const fileName =
        file.name.toLowerCase();


    // TXT FILE

    if (fileName.endsWith(".txt")) {

        const reader = new FileReader();

        reader.onload = function (event) {

            document.getElementById("noteContent").value =
                event.target.result;

            saveUploadDraft();

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

        message.textContent =
            "Reading PDF...";

        const formData =
            new FormData();

        formData.append(
            "pdf",
            file
        );

        try {

            const response = await fetch(
                "http://localhost:3000/extract-pdf",
                {
                    method: "POST",
                    body: formData
                }
            );

            const data =
                await response.json();

            if (!response.ok) {

                message.textContent =
                    data.message;

                return;
            }

            document.getElementById("noteContent").value =
                data.text;

            saveUploadDraft();

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

        // Remove escaped Markdown characters
        .replace(/\\\*/g, "*")
        .replace(/\\\|/g, "|")
        .replace(/\\\\/g, "\\")

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


// ============================================================
// PAGE CONTENT PERSISTENCE
// ============================================================

function getStudyStorageKey(type) {

    const noteId =
        localStorage.getItem("currentNoteId");

    if (!noteId) {
        return null;
    }

    return "marco_" + type + "_" + noteId;
}


// --------------------
// SUMMARY STORAGE
// --------------------

function saveSummaryState(moduleName, summary) {

    const key =
        getStudyStorageKey("summary");

    if (!key) {
        return;
    }

    localStorage.setItem(
        key,
        JSON.stringify({
            moduleName: moduleName,
            summary: summary
        })
    );
}


function loadSummaryState() {

    const summaryText =
        document.getElementById("summaryText");

    // We are not on summary.html
    if (!summaryText) {
        return;
    }

    const key =
        getStudyStorageKey("summary");

    if (!key) {
        return;
    }

    const saved =
        localStorage.getItem(key);

    if (!saved) {
        return;
    }

    try {

        const data =
            JSON.parse(saved);

        const summaryTitle =
            document.getElementById("summaryTitle");

        const summaryMessage =
            document.getElementById("summaryMessage");

        summaryTitle.textContent =
            data.moduleName + " Summary";

        summaryText.innerHTML =
            formatMarkdown(data.summary);

        summaryMessage.textContent =
            "Saved summary restored.";

    } catch (error) {

        console.error(
            "Unable to restore summary:",
            error
        );
    }
}


function clearSummary() {

    const key =
        getStudyStorageKey("summary");

    if (key) {
        localStorage.removeItem(key);
    }

    const summaryTitle =
        document.getElementById("summaryTitle");

    const summaryText =
        document.getElementById("summaryText");

    const summaryMessage =
        document.getElementById("summaryMessage");

    if (summaryTitle) {
        summaryTitle.textContent = "Summary";
    }

    if (summaryText) {

        summaryText.textContent =
            "Click the button below to generate a summary from your study material.";
    }

    if (summaryMessage) {

        summaryMessage.textContent =
            "Summary cleared.";
    }
}


// --------------------
// QUIZ STORAGE
// --------------------

function saveQuizState(moduleName) {

    const key =
        getStudyStorageKey("quiz");

    if (!key) {
        return;
    }

    localStorage.setItem(
        key,
        JSON.stringify({
            moduleName: moduleName,
            questions: currentQuiz
        })
    );
}


function loadQuizState() {

    const quizContainer =
        document.getElementById("quizContainer");

    // We are not on quiz.html
    if (!quizContainer) {
        return;
    }

    const key =
        getStudyStorageKey("quiz");

    if (!key) {
        return;
    }

    const saved =
        localStorage.getItem(key);

    if (!saved) {
        return;
    }

    try {

        const data =
            JSON.parse(saved);

        if (
            !data.questions ||
            !Array.isArray(data.questions)
        ) {
            return;
        }

        currentQuiz =
            data.questions;

        document.getElementById(
            "quizTitle"
        ).textContent =
            data.moduleName + " Quiz";

        document.getElementById(
            "quizMessage"
        ).textContent =
            "Choose one answer for each question.";

        displayQuiz();

        document.getElementById(
            "submitQuizButton"
        ).style.display =
            "inline-block";

    } catch (error) {

        console.error(
            "Unable to restore quiz:",
            error
        );
    }
}


function clearQuiz() {

    const key =
        getStudyStorageKey("quiz");

    if (key) {
        localStorage.removeItem(key);
    }

    currentQuiz = [];

    const quizTitle =
        document.getElementById("quizTitle");

    const quizMessage =
        document.getElementById("quizMessage");

    const quizContainer =
        document.getElementById("quizContainer");

    const quizResult =
        document.getElementById("quizResult");

    const submitButton =
        document.getElementById(
            "submitQuizButton"
        );

    if (quizTitle) {
        quizTitle.textContent =
            "Quiz Questions";
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


// --------------------
// TUTOR STORAGE
// --------------------

function saveTutorState(question, answer) {

    const key =
        getStudyStorageKey("tutor");

    if (!key) {
        return;
    }

    localStorage.setItem(
        key,
        JSON.stringify({
            question: question,
            answer: answer
        })
    );
}


function loadTutorState() {

    const tutorAnswer =
        document.getElementById("tutorAnswer");

    // We are not on tutor.html
    if (!tutorAnswer) {
        return;
    }

    const key =
        getStudyStorageKey("tutor");

    if (!key) {
        return;
    }

    const saved =
        localStorage.getItem(key);

    if (!saved) {
        return;
    }

    try {

        const data =
            JSON.parse(saved);

        document.getElementById(
            "tutorQuestion"
        ).value =
            data.question;

        tutorAnswer.innerHTML =
            formatMarkdown(data.answer);

        document.getElementById(
            "tutorMessage"
        ).textContent =
            "Saved answer restored.";

    } catch (error) {

        console.error(
            "Unable to restore tutor answer:",
            error
        );
    }
}


function clearTutor() {

    const key =
        getStudyStorageKey("tutor");

    if (key) {
        localStorage.removeItem(key);
    }

    const tutorQuestion =
        document.getElementById(
            "tutorQuestion"
        );

    const tutorAnswer =
        document.getElementById(
            "tutorAnswer"
        );

    const tutorMessage =
        document.getElementById(
            "tutorMessage"
        );

    if (tutorQuestion) {
        tutorQuestion.value = "";
    }

    if (tutorAnswer) {

        tutorAnswer.textContent =
            "Ask Marco a question about your saved study material.";
    }

    if (tutorMessage) {

        tutorMessage.textContent =
            "Tutor cleared.";
    }
}


// --------------------
// UPLOAD FORM STORAGE
// --------------------

function saveUploadDraft() {

    const moduleName =
        document.getElementById("moduleName");

    const noteContent =
        document.getElementById("noteContent");

    // We are not on upload.html
    if (!moduleName || !noteContent) {
        return;
    }

    localStorage.setItem(
        "marco_upload_module",
        moduleName.value
    );

    localStorage.setItem(
        "marco_upload_notes",
        noteContent.value
    );
}


function loadUploadDraft() {

    const moduleName =
        document.getElementById("moduleName");

    const noteContent =
        document.getElementById("noteContent");

    // We are not on upload.html
    if (!moduleName || !noteContent) {
        return;
    }

    moduleName.value =
        localStorage.getItem(
            "marco_upload_module"
        ) || "";

    noteContent.value =
        localStorage.getItem(
            "marco_upload_notes"
        ) || "";

    moduleName.addEventListener(
        "input",
        saveUploadDraft
    );

    noteContent.addEventListener(
        "input",
        saveUploadDraft
    );
}


function clearUploadForm() {

    localStorage.removeItem(
        "marco_upload_module"
    );

    localStorage.removeItem(
        "marco_upload_notes"
    );

    const moduleName =
        document.getElementById("moduleName");

    const noteContent =
        document.getElementById("noteContent");

    const noteFile =
        document.getElementById("noteFile");

    const uploadMessage =
        document.getElementById("uploadMessage");

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
        uploadMessage.textContent =
            "Form cleared.";
    }
}


// --------------------
// GENERATE AI SUMMARY
// --------------------

async function generateSummary(event) {

    if (event) {
        event.preventDefault();
    }

    const noteId =
        localStorage.getItem("currentNoteId");

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

        const data =
            await response.json();

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

        // Save the visible result so it remains
        // when the user changes pages.
        saveSummaryState(
            data.moduleName,
            data.summary
        );

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
// QUIZ
// --------------------

let currentQuiz = [];

async function generateQuiz() {

    const noteId =
        localStorage.getItem("currentNoteId");

    const quizMessage =
        document.getElementById("quizMessage");

    const quizContainer =
        document.getElementById("quizContainer");

    const quizResult =
        document.getElementById("quizResult");

    const submitButton =
        document.getElementById(
            "submitQuizButton"
        );

    const quizTitle =
        document.getElementById("quizTitle");

    if (!noteId) {

        quizMessage.textContent =
            "Please upload and save study material first.";

        return;
    }

    quizMessage.textContent =
        "Generating your quiz...";

    quizContainer.innerHTML = "";
    quizResult.innerHTML = "";

    submitButton.style.display =
        "none";

    try {

        const response = await fetch(
            "http://localhost:3000/generate-quiz",
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

        const data =
            await response.json();

        if (!response.ok) {

            quizMessage.textContent =
                data.message;

            return;
        }

        currentQuiz =
            data.questions;

        quizTitle.textContent =
            data.moduleName + " Quiz";

        quizMessage.textContent =
            "Choose one answer for each question.";

        displayQuiz();

        // Save generated quiz for this note.
        saveQuizState(
            data.moduleName
        );

        submitButton.style.display =
            "inline-block";

    } catch (error) {

        console.error(error);

        quizMessage.textContent =
            "Could not connect to the server.";
    }
}


// --------------------
// DISPLAY QUIZ
// --------------------

function displayQuiz() {

    const quizContainer =
        document.getElementById(
            "quizContainer"
        );

    quizContainer.innerHTML = "";

    currentQuiz.forEach(
        (question, questionIndex) => {

            const questionBox =
                document.createElement("div");

            questionBox.className =
                "quiz-question";


            const questionHeading =
                document.createElement("h3");

            questionHeading.textContent =
                (questionIndex + 1) +
                ". " +
                question.question;

            questionBox.appendChild(
                questionHeading
            );


            question.options.forEach(
                (option, optionIndex) => {

                    const label =
                        document.createElement(
                            "label"
                        );

                    label.className =
                        "quiz-option";


                    const radio =
                        document.createElement(
                            "input"
                        );

                    radio.type =
                        "radio";

                    radio.name =
                        "question-" +
                        questionIndex;

                    radio.value =
                        optionIndex;


                    label.appendChild(
                        radio
                    );

                    label.appendChild(
                        document.createTextNode(
                            " " + option
                        )
                    );

                    questionBox.appendChild(
                        label
                    );

                    questionBox.appendChild(
                        document.createElement(
                            "br"
                        )
                    );
                }
            );

            quizContainer.appendChild(
                questionBox
            );
        }
    );
}


// --------------------
// SUBMIT QUIZ
// --------------------

function submitQuiz() {

    if (currentQuiz.length === 0) {
        return;
    }

    let score = 0;
    let unanswered = 0;


    // First check that every question has an answer

    currentQuiz.forEach(
        (question, questionIndex) => {

            const selected =
                document.querySelector(
                    `input[name="question-${questionIndex}"]:checked`
                );

            if (!selected) {
                unanswered++;
            }
        }
    );


    const quizResult =
        document.getElementById(
            "quizResult"
        );

    if (unanswered > 0) {

        quizResult.textContent =
            `Please answer all questions. ${unanswered} question(s) are unanswered.`;

        return;
    }


    // Mark each question

    currentQuiz.forEach(
        (question, questionIndex) => {

            const selected =
                document.querySelector(
                    `input[name="question-${questionIndex}"]:checked`
                );

            const selectedAnswer =
                Number(selected.value);

            const questionBox =
                document.querySelectorAll(
                    ".quiz-question"
                )[questionIndex];


            // Remove old feedback if quiz is submitted again

            const oldFeedback =
                questionBox.querySelector(
                    ".question-feedback"
                );

            if (oldFeedback) {
                oldFeedback.remove();
            }


            const feedback =
                document.createElement("p");

            feedback.className =
                "question-feedback";


            if (
                selectedAnswer ===
                question.correctAnswer
            ) {

                score++;

                feedback.textContent =
                    "Correct!";

                feedback.classList.add(
                    "correct-feedback"
                );

            } else {

                feedback.innerHTML =
                    "Incorrect. Correct answer: <strong>" +
                    question.options[
                        question.correctAnswer
                    ] +
                    "</strong>";

                feedback.classList.add(
                    "incorrect-feedback"
                );
            }

            questionBox.appendChild(
                feedback
            );


            // Stop answers being changed after submission

            const radioButtons =
                questionBox.querySelectorAll(
                    'input[type="radio"]'
                );

            radioButtons.forEach(
                radio => {
                    radio.disabled = true;
                }
            );
        }
    );


    const percentage =
        Math.round(
            (score / currentQuiz.length) *
            100
        );


    quizResult.innerHTML = `
        <h2>Quiz Result</h2>

        <p>
            You scored
            <strong>${score}/${currentQuiz.length}</strong>
            (${percentage}%)
        </p>
    `;


    // Stop the quiz being submitted twice

    document.getElementById(
        "submitQuizButton"
    ).style.display =
        "none";
}


// --------------------
// AI TUTOR
// --------------------

async function askTutor() {

    const noteId =
        localStorage.getItem(
            "currentNoteId"
        );

    const questionInput =
        document.getElementById(
            "tutorQuestion"
        );

    const tutorMessage =
        document.getElementById(
            "tutorMessage"
        );

    const tutorAnswer =
        document.getElementById(
            "tutorAnswer"
        );

    const question =
        questionInput.value.trim();


    if (!noteId) {

        tutorMessage.textContent =
            "Please upload and save study material first.";

        return;
    }


    if (!question) {

        tutorMessage.textContent =
            "Please enter a question.";

        return;
    }


    tutorMessage.textContent =
        "Marco is thinking...";

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


        const data =
            await response.json();


        if (!response.ok) {

            tutorMessage.textContent =
                data.message;

            return;
        }


        tutorAnswer.innerHTML =
            formatMarkdown(
                data.answer
            );

        tutorMessage.textContent =
            "Answer generated successfully.";


        // Keep the question and answer when
        // moving between pages.
        saveTutorState(
            question,
            data.answer
        );


    } catch (error) {

        console.error(error);

        tutorMessage.textContent =
            "Could not connect to the server.";
    }
}

// --------------------
// DASHBOARD
// --------------------

async function loadDashboard() {

    const userId =
        localStorage.getItem("userId");

    const fullName =
        localStorage.getItem("fullName");

    const materialsContainer =
        document.getElementById("studyMaterials");


    // Only run this code on the Dashboard

    if (!materialsContainer) {
        return;
    }


    if (!userId) {

        window.location.href = "index.html";
        return;
    }


    // Show student's name

    const welcomeMessage =
        document.getElementById("welcomeMessage");

    if (fullName) {

        welcomeMessage.textContent =
            "Welcome Back, " + fullName;
    }


    try {

        const response = await fetch(
            `http://localhost:3000/notes/${userId}`
        );

        const data =
            await response.json();


        if (!response.ok) {

            materialsContainer.innerHTML =
                "<p>Unable to load study materials.</p>";

            return;
        }


        // Dashboard counts

        document.getElementById(
            "notesCount"
        ).textContent =
            data.notesCount;

        document.getElementById(
            "summaryCount"
        ).textContent =
            data.summaryCount;


        // Clear loading message

        materialsContainer.innerHTML = "";


        if (data.notes.length === 0) {

            materialsContainer.innerHTML =
                "<p>No study materials uploaded yet.</p>";

            return;
        }


        // Create a card for every saved study material

        data.notes.forEach(note => {

            const card =
                document.createElement("div");

            card.className = "card";


            const title =
                document.createElement("h3");

            title.textContent =
                note.ModuleName;


            const date =
                document.createElement("p");

            const uploadDate =
                new Date(
                    note.UploadDate + "Z"
                );

            date.textContent =
                "Uploaded: " +
                uploadDate.toLocaleDateString();


            // Study This button

            const button =
                document.createElement("button");

            button.type = "button";

            button.textContent =
                "Study This";

            button.onclick =
                function () {

                    selectStudyMaterial(
                        note.NoteID,
                        note.ModuleName
                    );
                };


            // Delete button

            const deleteButton =
                document.createElement("button");

            deleteButton.type =
                "button";

            deleteButton.textContent =
                "Delete";

            deleteButton.onclick =
                function () {

                    deleteStudyMaterial(
                        note.NoteID,
                        note.ModuleName
                    );
                };


            // Add everything to card

            card.appendChild(title);
            card.appendChild(date);
            card.appendChild(button);
            card.appendChild(deleteButton);

            materialsContainer.appendChild(
                card
            );
        });


        // Show currently selected material

        const currentModule =
            localStorage.getItem(
                "currentModuleName"
            );

        if (currentModule) {

            document.getElementById(
                "currentStudyMaterial"
            ).textContent =
                currentModule;
        }


    } catch (error) {

        console.error(error);

        materialsContainer.innerHTML =
            "<p>Could not connect to the server.</p>";
    }
}


// --------------------
// SELECT STUDY MATERIAL
// --------------------

function selectStudyMaterial(
    noteId,
    moduleName
) {

    localStorage.setItem(
        "currentNoteId",
        noteId
    );

    localStorage.setItem(
        "currentModuleName",
        moduleName
    );


    const currentStudyMaterial =
        document.getElementById(
            "currentStudyMaterial"
        );

    if (currentStudyMaterial) {

        currentStudyMaterial.textContent =
            moduleName;
    }


    alert(
        moduleName +
        " is now your selected study material."
    );
}


// --------------------
// DELETE STUDY MATERIAL
// --------------------

async function deleteStudyMaterial(
    noteId,
    moduleName
) {

    // Ask before deleting

    const confirmed =
        confirm(
            "Are you sure you want to delete " +
            moduleName +
            "?"
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

        const data =
            await response.json();


        if (!response.ok) {

            alert(data.message);
            return;
        }


        // Remove locally stored AI content
        // belonging to this study material.

        localStorage.removeItem(
            "marco_summary_" + noteId
        );

        localStorage.removeItem(
            "marco_quiz_" + noteId
        );

        localStorage.removeItem(
            "marco_tutor_" + noteId
        );


        // Check whether the deleted note
        // is currently selected.

        const currentNoteId =
            localStorage.getItem(
                "currentNoteId"
            );


        // If it was selected,
        // clear the selection.

        if (
            String(currentNoteId) ===
            String(noteId)
        ) {

            localStorage.removeItem(
                "currentNoteId"
            );

            localStorage.removeItem(
                "currentModuleName"
            );

            localStorage.removeItem(
                "currentResultId"
            );


            const currentStudyMaterial =
                document.getElementById(
                    "currentStudyMaterial"
                );

            if (currentStudyMaterial) {

                currentStudyMaterial.textContent =
                    "None selected";
            }
        }


        alert(
            "Study material deleted successfully!"
        );


        // Reload dashboard

        loadDashboard();


    } catch (error) {

        console.error(error);

        alert(
            "Could not connect to the server."
        );
    }
}


// --------------------
// LOGOUT
// --------------------

function logoutUser() {

    localStorage.removeItem("userId");
    localStorage.removeItem("fullName");

    localStorage.removeItem(
        "currentNoteId"
    );

    localStorage.removeItem(
        "currentResultId"
    );

    localStorage.removeItem(
        "currentModuleName"
    );


    // Remove unfinished upload draft.

    localStorage.removeItem(
        "marco_upload_module"
    );

    localStorage.removeItem(
        "marco_upload_notes"
    );


    /*
        Generated summaries, quizzes and
        tutor answers are intentionally
        stored per study material.

        We remove all Marco temporary
        content on logout so another user
        using the browser cannot see the
        previous user's generated content.
    */

    const keysToRemove = [];

    for (
        let i = 0;
        i < localStorage.length;
        i++
    ) {

        const key =
            localStorage.key(i);

        if (
            key &&
            (
                key.startsWith(
                    "marco_summary_"
                ) ||

                key.startsWith(
                    "marco_quiz_"
                ) ||

                key.startsWith(
                    "marco_tutor_"
                )
            )
        ) {

            keysToRemove.push(key);
        }
    }


    keysToRemove.forEach(key => {

        localStorage.removeItem(key);
    });


    window.location.href =
        "index.html";
}


// --------------------
// THEME
// --------------------

function toggleTheme() {

    document.body.classList.toggle(
        "dark-mode"
    );


    if (
        document.body.classList.contains(
            "dark-mode"
        )
    ) {

        localStorage.setItem(
            "theme",
            "dark"
        );

    } else {

        localStorage.setItem(
            "theme",
            "light"
        );
    }
}


// --------------------
// PAGE LOAD
// --------------------

window.onload = function () {

    const savedTheme =
        localStorage.getItem("theme");


    if (savedTheme === "dark") {

        document.body.classList.add(
            "dark-mode"
        );
    }


    // Load Dashboard information
    // if this is dashboard.html

    loadDashboard();


    // Restore Summary if this
    // is summary.html

    loadSummaryState();


    // Restore Quiz if this
    // is quiz.html

    loadQuizState();


    // Restore Tutor answer if this
    // is tutor.html

    loadTutorState();


    // Restore unfinished Upload form
    // if this is upload.html

    loadUploadDraft();
};