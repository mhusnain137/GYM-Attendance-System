@echo off
title Titan Gym System - 1-Click Local Launcher
color 0A
cls
echo ======================================================================
echo           TITAN GYM SYSTEM - LOCAL FULL LAUNCHER
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Python Virtual Environment...
if not exist venv (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat 2>nul

echo [2/4] Starting Local Backend (FastAPI on Port 8000)...
start "Titan Gym - Backend Server" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && cd app\api && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

timeout /t 2 >nul

echo [3/4] Starting Local Frontend (Vite on Port 3001)...
start "Titan Gym - Frontend UI" cmd /k "cd /d %~dp0\frontend && npm run dev"

timeout /t 3 >nul

echo [4/4] Opening Gym Dashboard in your browser...
start http://localhost:3001

echo.
echo ======================================================================
echo   ✅ Local Backend:  http://localhost:8000
echo   ✅ Local Frontend: http://localhost:3001
echo   🌐 Cloud Version:  https://gym-attendance-system-three.vercel.app
echo ======================================================================
echo.
echo Both Frontend and Backend are running locally on your computer!
echo Press any key to close this launcher window (servers will stay running).
pause >nul
