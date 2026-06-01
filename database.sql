INSERT INTO Notes (UserID, ModuleName, NoteContent, UploadDate)
VALUES (
    1,
    'Database Systems',
    'SQL is used to store and retrieve data from databases.',
    datetime('now')
);

INSERT INTO AIResults (NoteID, Summary, QuizQuestions, AIAnswer, CreatedAt)
VALUES (
    1,
    'Database summary',
    '1. What is SQL?',
    'SQL is used to manage databases.',
    datetime('now')
);