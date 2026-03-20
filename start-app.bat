@echo off
chcp 65001 >nul

echo ========================================
echo   Job Application Tracker - Start Script
echo ========================================
echo.

REM Get the directory where the batch file is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo Working directory: %CD%
echo.

REM Check if we're in the right directory
if not exist "backend\package.json" (
    echo [ERROR] backend\package.json not found!
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

echo [OK] Backend found

REM Check if .env exists for backend
if not exist "backend\.env" (
    echo [INFO] Creating backend .env file...
    copy backend\.env.example backend\.env 2>nul
    if not exist "backend\.env" (
        (
            echo DATABASE_URL="file:./dev.db"
            echo JWT_SECRET="your-super-secret-jwt-key-change-in-production"
            echo JWT_EXPIRES_IN="24h"
            echo OPENAI_API_KEY=""
            echo PORT=5000
            echo NODE_ENV=development
            echo FRONTEND_URL="http://localhost:3000"
        ) > backend\.env
    )
)

REM Check if .env.local exists for frontend
if not exist "frontend\.env.local" (
    echo [INFO] Creating frontend .env.local file...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:5000/api
    ) > frontend\.env.local
)

REM Check if node_modules exist
if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd /d "%SCRIPT_DIR%backend"
    call npm install
    cd /d "%SCRIPT_DIR%"
)

if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd /d "%SCRIPT_DIR%frontend"
    call npm install
    cd /d "%SCRIPT_DIR%"
)

REM Check if Prisma client exists
if not exist "backend\node_modules\.prisma" (
    echo [INFO] Setting up database...
    cd /d "%SCRIPT_DIR%backend"
    call npx prisma generate
    call npx prisma db push
    cd /d "%SCRIPT_DIR%"
)

echo.
echo [OK] Setup complete!
echo.
echo Starting servers...
echo    Backend:  http://localhost:5000
echo    Frontend: http://localhost:3000
echo.

REM Start backend server
echo [1/2] Starting Backend server...
start "JobTracker-Backend" cmd /k "cd /d "%SCRIPT_DIR%backend" && npm run dev"

REM Wait for backend to start
timeout /t 4 /nobreak >nul

REM Start frontend server
echo [2/2] Starting Frontend server...
start "JobTracker-Frontend" cmd /k "cd /d "%SCRIPT_DIR%frontend" && npm run dev"

echo.
echo ========================================
echo   Servers started successfully!
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo.
echo   Open http://localhost:3000 in your browser
echo ========================================
echo.

REM Keep window open for a few seconds so user can see the output
timeout /t 15 /nobreak >nul
