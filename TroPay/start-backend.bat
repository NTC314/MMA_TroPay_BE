@echo off
echo ========================================
echo Starting TroPay Backend Server
echo ========================================
echo.

cd /d "%~dp0"

if exist node_modules (
    echo Node modules found. Skipping npm install...
) else (
    echo Installing dependencies...
    call npm install
)

echo.
echo Starting backend server...
echo Server will be available at http://localhost:5000
echo API Documentation at http://localhost:5000/api-docs
echo.

call npm start

pause





