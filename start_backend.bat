@echo off
echo Starting Person Identity System Backend...
echo.
cd /d "%~dp0"
call venv\Scripts\activate.bat 2>nul
python -m pip install -r requirements.txt
cd app\api
python -m uvicorn main:app --host 0.0.0.0 --port 8000
pause