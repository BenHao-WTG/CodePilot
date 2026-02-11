@echo off
REM CodePilot Launcher - Starts Next.js server and Tauri app

echo ==========================================
echo CodePilot Launcher
echo ==========================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if Next.js build exists
if not exist ".next\standalone" (
    echo Building Next.js application...
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Build failed
        pause
        exit /b 1
    )
)

REM Start Next.js server in background
echo Starting Next.js server...
start /B cmd /c "node .next\standalone\server.js > nul 2>&1"

REM Wait for server to be ready
echo Waiting for server to start...
timeout /t 3 /nobreak > nul

REM Start Tauri application  
echo Launching CodePilot...
if exist "src-tauri\target\release\app.exe" (
    start "" "src-tauri\target\release\app.exe"
) else if exist "src-tauri\target\release\CodePilot.exe" (
    start "" "src-tauri\target\release\CodePilot.exe"
) else (
    echo ERROR: Application executable not found
    echo Please run build.ps1 first to build the application
    pause
    exit /b 1
)

echo.
echo CodePilot is starting...
echo Close this window to stop the Next.js server
echo.
pause
