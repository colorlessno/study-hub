CREATE TABLE IF NOT EXISTS tasks (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO tasks (title)
SELECT 'Docker ComposeでWeb/API/DBを接続する'
WHERE NOT EXISTS (SELECT 1 FROM tasks);
