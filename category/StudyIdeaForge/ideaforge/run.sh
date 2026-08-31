#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -d venv ]; then
  echo "[1/3] 仮想環境 venv を作成中...(初回のみ)"
  python3 -m venv venv
fi
source venv/bin/activate

echo "[2/3] 依存パッケージを確認中..."
python -m pip install -q --disable-pip-version-check -r backend/requirements.txt

echo "[3/3] IdeaForge → http://localhost:8000"
cd backend
python -m uvicorn main:app --port 8000
