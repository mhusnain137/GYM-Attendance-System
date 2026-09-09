@echo off
title Titan Gym OS - Promotional SaaS Website (Port 3005)
cd /d "%~dp0website"
echo ===================================================
echo   TITAN GYM OS - PROMOTIONAL SAAS WEBSITE
echo   Subscriptions: Basic, Pro, Max Plans
echo   URL: http://localhost:3005
echo ===================================================
..\venv\Scripts\python.exe -m http.server 3005
pause
