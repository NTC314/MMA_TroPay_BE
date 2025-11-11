@echo off
echo ================================================
echo    TroPay Backend - Deploy to Render.com
echo ================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Git status...
git status
echo.

echo [2/4] Adding files to Git...
git add .
if errorlevel 1 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)

echo.
echo [3/4] Committing changes...
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=feat: update for Render deployment

git commit -m "%commit_msg%"
if errorlevel 1 (
    echo No changes to commit or commit failed
)

echo.
echo [4/4] Pushing to GitHub...
git push origin dev
if errorlevel 1 (
    echo ERROR: Failed to push to GitHub
    echo.
    echo Make sure:
    echo - You have internet connection
    echo - GitHub credentials are configured
    echo - Remote repository exists
    pause
    exit /b 1
)

echo.
echo ================================================
echo ✅ SUCCESS! Code pushed to GitHub
echo ================================================
echo.
echo Next steps:
echo 1. Go to: https://dashboard.render.com/
echo 2. Click "New +" -^> "Web Service"
echo 3. Connect repo: NTC314/MMA_TroPay_BE
echo 4. Render will auto-detect render.yaml
echo 5. Add environment variables (MONGODB_URI, JWT_SECRET)
echo 6. Click "Create Web Service"
echo.
echo Your API will be at:
echo https://tropay-backend.onrender.com
echo.
pause
