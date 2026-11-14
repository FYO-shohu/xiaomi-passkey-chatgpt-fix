@echo off
chcp 65001 >nul
title Xiaomi Passkey ChatGPT Fix
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js not found. Install Node.js 22 or newer.
  echo.
  pause
  exit /b 1
)

node "xiaomi-passkey-fix.mjs"
set EXITCODE=%ERRORLEVEL%

echo.
if not "%EXITCODE%"=="0" (
  echo Script exited with code %EXITCODE%.
  echo Check the error above.
) else (
  echo Script finished.
)
echo.
pause
exit /b %EXITCODE%
