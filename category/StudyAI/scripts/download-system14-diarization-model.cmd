@echo off
setlocal

set "STUDYAI_ROOT=%~dp0.."
if not exist "%STUDYAI_ROOT%\src\backend\.env.local" (
  echo src\backend\.env.local が見つかりません。
  exit /b 2
)

pushd "%STUDYAI_ROOT%"
docker compose --env-file src\backend\.env.local --profile system14-tools run --build --rm system14-model-download
set "DOWNLOAD_EXIT_CODE=%ERRORLEVEL%"
popd

exit /b %DOWNLOAD_EXIT_CODE%
