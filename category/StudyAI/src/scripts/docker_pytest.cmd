@echo off
setlocal

set "ROOT=%~dp0..\.."
set "COMPOSE_FILE=%ROOT%\docker-compose.yml"

if "%~1"=="" (
  docker compose -f "%COMPOSE_FILE%" run --rm backend-test
  exit /b %ERRORLEVEL%
)

docker compose -f "%COMPOSE_FILE%" run --rm backend-test python -m pytest -q %*
exit /b %ERRORLEVEL%

