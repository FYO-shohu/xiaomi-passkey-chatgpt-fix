@echo off
chcp 65001 >nul
title 小米通行密钥一键修复
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [错误] 未找到 Node.js。
  echo 请安装 Node.js 22 或更高版本，然后重新双击本文件。
  echo.
  pause
  exit /b 1
)

node "xiaomi-passkey-fix.mjs"
set EXITCODE=%ERRORLEVEL%

echo.
if not "%EXITCODE%"=="0" (
  echo 脚本退出，代码：%EXITCODE%
  echo 请查看上方错误信息。
) else (
  echo 脚本已结束。
)
echo.
pause
exit /b %EXITCODE%
