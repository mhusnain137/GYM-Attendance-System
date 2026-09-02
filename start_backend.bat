@echo off
echo Starting GYM Attendance System Backend...
echo.
cd /d "%~dp0"
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat 2>nul
echo Checking Python packages...
python -m pip install -r requirements.txt
cd app\api
echo Starting FastAPI Server on http://localhost:8000 ...
python -m uvicorn main:app --host 0.0.0.0 --port 8000
pause