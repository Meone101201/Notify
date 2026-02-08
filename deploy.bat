@echo off
REM Deployment script for Agile Task Board (Windows)
REM This script deploys Firestore rules, indexes, and hosting to Firebase

echo.
echo 🚀 Starting Firebase Deployment...
echo.

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Firebase CLI is not installed
    echo    Install it with: npm install -g firebase-tools
    exit /b 1
)

echo ✅ Firebase CLI found
echo.

REM Check if logged in
echo 🔐 Checking Firebase authentication...
firebase projects:list >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Not logged in to Firebase
    echo    Run: firebase login
    exit /b 1
)

echo ✅ Authenticated
echo.

REM Confirm project
echo 📋 Current project:
firebase use
echo.

set /p CONFIRM="Is this the correct project? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo ❌ Deployment cancelled
    echo    Switch project with: firebase use ^<project-id^>
    exit /b 1
)

REM Deploy Firestore Rules
echo.
echo 📜 Deploying Firestore Security Rules...
firebase deploy --only firestore:rules
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy security rules
    exit /b 1
)
echo ✅ Security rules deployed

REM Deploy Firestore Indexes
echo.
echo 📊 Deploying Firestore Indexes...
firebase deploy --only firestore:indexes
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy indexes
    exit /b 1
)
echo ✅ Indexes deployed (may take 5-10 minutes to build)

REM Deploy Hosting (optional)
echo.
set /p DEPLOY_HOSTING="Deploy hosting? (y/n): "
if /i "%DEPLOY_HOSTING%"=="y" (
    echo 🌐 Deploying Hosting...
    firebase deploy --only hosting
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Failed to deploy hosting
        exit /b 1
    )
    echo ✅ Hosting deployed
)

echo.
echo 🎉 Deployment complete!
echo.
echo 📱 Next steps:
echo    1. Check Firebase Console: https://console.firebase.google.com/project/agile-task-board
echo    2. Verify security rules are active
echo    3. Wait for indexes to finish building (5-10 minutes)
echo    4. Test the application
echo.

pause
