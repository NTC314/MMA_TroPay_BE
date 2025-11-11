@echo off
echo ================================================
echo    TroPay Backend - Firebase Deploy Script
echo ================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Firebase CLI...
where firebase >nul 2>nul
if errorlevel 1 (
    echo ERROR: Firebase CLI not found!
    echo Install: npm install -g firebase-tools
    pause
    exit /b 1
)

echo [2/4] Linting code...
cd functions
call npm run lint
if errorlevel 1 (
    echo.
    echo ERROR: Lint failed! Fix errors first.
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [3/4] Deploying to Firebase...
call firebase deploy --only functions
if errorlevel 1 (
    echo.
    echo ERROR: Deploy failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Deployment successful!
echo.
echo View logs with: firebase functions:log --only api
echo.
pause
