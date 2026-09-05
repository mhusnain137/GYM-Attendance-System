@echo off
title Titan Gym Attendance System (Backend + Tunnel)
color 0B
cls
echo ======================================================================
echo           TITAN GYM SYSTEM - AUTO STARTUP LAUNCHER
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Python Virtual Environment...
if not exist venv (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat 2>nul

echo [2/3] Checking Dependencies...
python -m pip install -r requirements.txt --quiet

echo [3/3] Starting FastAPI Backend on Port 8000...
start "Titan Gym Backend (FastAPI)" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && cd app\api && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

timeout /t 3 >nul

echo.
echo ======================================================================
echo   FastAPI Backend is running on: http://localhost:8000
echo   Frontend is live on: https://gym-attendance-system-three.vercel.app
echo ======================================================================
echo.
echo [Tunnel Options]:
echo 1. Cloudflare Quick Tunnel (Free)
echo 2. Ngrok Tunnel (if you have an ngrok account)
echo.
echo Starting Cloudflare Tunnel...
if exist "tools\cloudflared.exe" (
    start "Cloudflare Tunnel" cmd /k "cd /d %~dp0 && tools\cloudflared.exe tunnel --url http://localhost:8000"
) else (
    echo tools\cloudflared.exe not found!
)

echo System started successfully!
pause
