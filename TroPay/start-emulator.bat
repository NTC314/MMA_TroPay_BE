@echo off
echo ================================================
echo   TroPay Backend - Firebase Emulator (Local)
echo ================================================
echo.

cd /d "%~dp0"

echo Starting Firebase Emulators...
echo.
echo API will be available at:
echo http://localhost:5001/YOUR_PROJECT_ID/us-central1/api
echo.
echo Press Ctrl+C to stop
echo.

firebase emulators:start --only functions

pause
