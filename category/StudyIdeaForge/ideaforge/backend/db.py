import os
import sqlite3

DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ideaforge.db")
DB_PATH = os.environ.get("IDEAFORGE_DB_PATH") or DEFAULT_DB_PATH


def conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init():
    c = conn()
    c.executescript(
        """
        CREATE TABLE IF NOT EXISTS providers(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          base_url TEXT NOT NULL,
          api_key TEXT DEFAULT '',
          model TEXT DEFAULT '',
          is_default INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS workflows(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          graph TEXT NOT NULL,
          is_preset INTEGER DEFAULT 0,
          created_at REAL,
          updated_at REAL
        );
        CREATE TABLE IF NOT EXISTS sessions(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workflow_id INTEGER,
          name TEXT,
          graph TEXT NOT NULL,
          state TEXT NOT NULL,
          status TEXT DEFAULT 'running',
          created_at REAL,
          updated_at REAL
        );
        CREATE TABLE IF NOT EXISTS settings(
          key TEXT PRIMARY KEY,
          value TEXT
        );
        """
    )
    if c.execute("SELECT COUNT(*) FROM providers").fetchone()[0] == 0:
        c.execute(
            "INSERT INTO providers(name, base_url, api_key, model, is_default) VALUES(?,?,?,?,?)",
            ("LM Studio (ローカル)", "http://localhost:1234/v1", "lm-studio", "", 1),
        )
        c.execute(
            "INSERT INTO providers(name, base_url, api_key, model, is_default) VALUES(?,?,?,?,?)",
            ("商用API (OpenAI互換)", "https://api.openai.com/v1", "", "gpt-4o", 0),
        )
    c.commit()
    c.close()


def get_provider(pid=None):
    c = conn()
    row = None
    if pid:
        row = c.execute("SELECT * FROM providers WHERE id=?", (pid,)).fetchone()
    if row is None:
        row = c.execute("SELECT * FROM providers WHERE is_default=1").fetchone()
    if row is None:
        row = c.execute("SELECT * FROM providers LIMIT 1").fetchone()
    c.close()
    return dict(row) if row else None


def get_settings():
    c = conn()
    rows = c.execute("SELECT key, value FROM settings").fetchall()
    c.close()
    return {r["key"]: r["value"] for r in rows}


def set_settings(d):
    c = conn()
    for k, v in d.items():
        c.execute(
            "INSERT INTO settings(key,value) VALUES(?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (k, str(v)),
        )
    c.commit()
    c.close()
