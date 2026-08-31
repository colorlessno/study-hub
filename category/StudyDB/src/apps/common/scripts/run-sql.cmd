@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "COMMON_DIR=%SCRIPT_DIR%.."

if "%~1"=="" (
  echo Usage: run-sql.cmd db02 sql\001_schema.sql
  exit /b 1
)

if "%~2"=="" (
  echo Usage: run-sql.cmd db02 sql\001_schema.sql [compose-project]
  exit /b 1
)

set "TOPIC=%~1"
set "SQL_PATH=%~2"
if /I "%TOPIC%"=="db02" set "TOPIC_DIR=db02_sql_crud_schema"
if /I "%TOPIC%"=="db04" set "TOPIC_DIR=db04_transaction_lock_isolation"
if /I "%TOPIC%"=="db05" set "TOPIC_DIR=db05_index_explain_performance"
if /I "%TOPIC%"=="db06" set "TOPIC_DIR=db06_backup_restore_migration"

if "%TOPIC_DIR%"=="" (
  echo Unknown topic: %TOPIC%
  exit /b 1
)

set "SQL_IN_CONTAINER=/work/%TOPIC_DIR%/%SQL_PATH:\=/%"

if not "%~3"=="" (
  docker compose -p "%~3" -f "%COMMON_DIR%\docker-compose.yml" exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d studydb -f "%SQL_IN_CONTAINER%"
  if errorlevel 1 exit /b 1
  exit /b 0
)

docker compose -f "%COMMON_DIR%\docker-compose.yml" exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d studydb -f "%SQL_IN_CONTAINER%"
endlocal
