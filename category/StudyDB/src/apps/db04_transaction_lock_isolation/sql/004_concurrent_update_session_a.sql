SET search_path TO db04;

BEGIN;
UPDATE products
SET stock = stock - 1, updated_at = now()
WHERE id = 1
RETURNING id, name, stock;

SELECT locktype, mode, granted
FROM pg_locks
WHERE pid = pg_backend_pid()
ORDER BY locktype, mode;

ROLLBACK;
