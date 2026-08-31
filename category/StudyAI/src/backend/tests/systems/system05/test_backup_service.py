from pathlib import Path
from types import SimpleNamespace

from studyai.systems.system05.services.backup_service import BackupService


def test_backup_uses_environment_password_and_custom_dump(tmp_path, monkeypatch) -> None:
    service = BackupService()
    service.settings = SimpleNamespace(
        upload_dir=tmp_path,
        database_url="postgresql+asyncpg://backup_user:secret%20value@db.example:5544/studyai",
    )
    observed = {}

    monkeypatch.setattr(
        "studyai.systems.system05.services.backup_service.shutil.which",
        lambda command: "/usr/bin/pg_dump" if command == "pg_dump" else None,
    )

    def fake_run(args, *, check, capture_output, env):
        observed.update(args=args, check=check, capture_output=capture_output, env=env)
        return SimpleNamespace(returncode=0, stdout=b"custom-dump", stderr=b"")

    monkeypatch.setattr(
        "studyai.systems.system05.services.backup_service.subprocess.run",
        fake_run,
    )

    archive = Path(service._create_backup_archive())

    assert archive.suffix == ".dump"
    assert archive.read_bytes() == b"custom-dump"
    assert "secret value" not in observed["args"]
    assert observed["env"]["PGPASSWORD"] == "secret value"
    assert observed["args"] == [
        "/usr/bin/pg_dump",
        "--host",
        "db.example",
        "--port",
        "5544",
        "--username",
        "backup_user",
        "--dbname",
        "studyai",
        "--format",
        "custom",
    ]
