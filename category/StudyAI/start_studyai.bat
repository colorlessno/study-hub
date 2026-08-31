@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
chcp 65001 >nul
title StudyAI 起動メニュー

where docker >nul 2>&1 || (echo [エラー] docker が見つかりません。Docker Desktop をインストール/起動してください。& pause & exit /b 1)
docker info >nul 2>&1 || (echo [エラー] Docker デーモンに接続できません。Docker Desktop を起動してください。& pause & exit /b 1)

echo === LM Studio 到達チェック (http://localhost:5858) ===
curl -s -m 3 http://localhost:5858/v1/models >nul 2>&1 && (echo   OK : LM Studio 応答あり) || (echo   注意: LM Studio に到達できません。LLMを使うシステムは動作しません。)
echo.

:menu
echo ===============================================
echo   StudyAI 起動メニュー
echo ===============================================
echo   1^) コア起動   db -^> migrate -^> backend + frontend
echo   2^) 全部起動   docker compose up -d
echo   3^) 個別システム起動 ^(2桁 例 02 / 14^)
echo   4^) 状態確認   docker compose ps
echo   5^) ログ表示   backend ^(Ctrl+C で戻る^)
echo   6^) テスト実行 backend-test
echo   7^) 停止       docker compose down
echo   0^) 終了
echo.
set /p sel="番号を入力: "

if "%sel%"=="1" goto core
if "%sel%"=="2" goto all
if "%sel%"=="3" goto one
if "%sel%"=="4" goto ps
if "%sel%"=="5" goto logs
if "%sel%"=="6" goto test
if "%sel%"=="7" goto down
if "%sel%"=="0" goto end
goto menu

:core
echo --- db 起動 ---
docker compose up -d db
echo --- migrate ^(alembic upgrade head^) ---
docker compose up migrate
echo --- backend + frontend 起動 ---
docker compose up -d backend frontend
goto urls

:all
docker compose up -d
goto urls

:one
set /p n="システム番号 ^(2桁 例 02 / 14^): "
docker compose up -d db
docker compose up migrate
docker compose up -d system!n!
echo   -^> http://localhost:180!n!
echo.
goto menu

:ps
docker compose ps
echo.
goto menu

:logs
echo ^(Ctrl+C で戻る^)
docker compose logs -f backend
goto menu

:test
docker compose run --rm backend-test
echo.
goto menu

:down
docker compose down
echo 停止しました。
echo.
goto menu

:urls
echo.
echo === アクセス先 ===
echo   画面      : http://localhost:15173
echo   メインAPI : http://localhost:18000
echo   system14  : http://localhost:18014
echo   状態確認  : メニュー 4
echo.
goto menu

:end
endlocal
