from __future__ import annotations

import json
import sys
import tempfile
import time
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import db  # noqa: E402


class DatabaseTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_db_path = db.DB_PATH
        db.DB_PATH = str(Path(self.temp_dir.name) / "ideaforge-test.db")
        db.init()

    def tearDown(self) -> None:
        db.DB_PATH = self.original_db_path
        self.temp_dir.cleanup()

    def test_init_creates_schema_and_default_providers(self) -> None:
        connection = db.conn()
        table_names = {
            row["name"]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        provider_count = connection.execute("SELECT COUNT(*) AS count FROM providers").fetchone()[
            "count"
        ]
        connection.close()

        self.assertTrue({"providers", "workflows", "sessions", "settings"} <= table_names)
        self.assertEqual(provider_count, 2)
        self.assertEqual(db.get_provider()["name"], "LM Studio (ローカル)")

    def test_settings_round_trip(self) -> None:
        db.set_settings({"search_engine": "ddg", "sound_enabled": "0"})

        self.assertEqual(
            db.get_settings(),
            {"search_engine": "ddg", "sound_enabled": "0"},
        )

    def test_workflow_and_session_json_round_trip(self) -> None:
        now = time.time()
        graph = {"nodes": [{"id": "input-1"}], "edges": []}
        state = {"completed": [], "current": "input-1"}
        connection = db.conn()
        workflow_id = connection.execute(
            "INSERT INTO workflows(name,description,graph,is_preset,created_at,updated_at) "
            "VALUES(?,?,?,?,?,?)",
            ("Test workflow", "isolated test", json.dumps(graph), 0, now, now),
        ).lastrowid
        connection.execute(
            "INSERT INTO sessions(workflow_id,name,graph,state,status,created_at,updated_at) "
            "VALUES(?,?,?,?,?,?,?)",
            (
                workflow_id,
                "Test session",
                json.dumps(graph),
                json.dumps(state),
                "running",
                now,
                now,
            ),
        )
        connection.commit()
        saved = connection.execute(
            "SELECT graph,state,status FROM sessions WHERE workflow_id=?",
            (workflow_id,),
        ).fetchone()
        connection.close()

        self.assertEqual(json.loads(saved["graph"]), graph)
        self.assertEqual(json.loads(saved["state"]), state)
        self.assertEqual(saved["status"], "running")


if __name__ == "__main__":
    unittest.main()
