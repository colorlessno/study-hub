@echo off
setlocal
title IdeaForge
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 goto nopython

if not exist "backend\requirements.txt" goto noreq

if not exist "venv\Scripts\python.exe" (
  echo [1/3] Creating virtual env "venv" ... ^(first run only^)
  python -m venv venv
)
if not exist "venv\Scripts\python.exe" goto venvfail

call "venv\Scripts\activate.bat"

echo [2/3] Installing packages ...
python -m pip install --disable-pip-version-check -r backend\requirements.txt
if errorlevel 1 goto pipfail

echo [3/3] Starting IdeaForge - http://localhost:8000
start "" http://localhost:8000
cd backend
python -m uvicorn main:app --port 8000
goto end

:nopython
echo [ERROR] Python not found. Install it from https://www.python.org/ and add to PATH.
goto end

:noreq
echo [ERROR] backend\requirements.txt not found.
echo         Current folder: %~dp0
goto end

:venvfail
echo [ERROR] Failed to create venv.
goto end

:pipfail
echo [ERROR] pip install failed. Check your network connection.
goto end

:end
echo.
pause
