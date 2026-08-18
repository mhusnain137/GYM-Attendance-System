@echo off
cd /d "%~dp0"

call venv\Scripts\activate.bat

python .\app\recognition\webcam.py

pause