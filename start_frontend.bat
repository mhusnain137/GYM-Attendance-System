@echo off
echo Starting GYM Attendance System Frontend...
echo.
cd /d "%~dp0frontend"
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)
npm run dev
pause