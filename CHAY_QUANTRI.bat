@echo off
title CHAY WEB QUAN TRI (LOCALHOST)
echo Dang don dep cong 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
echo Khoi dong sieu he thong Quan Tri tren Localhost...
cd /d "%~dp0"
node server.js
pause
