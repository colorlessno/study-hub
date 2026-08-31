INSERT INTO tasks (title, status)
VALUES ('seed task', 'open')
ON CONFLICT DO NOTHING;
