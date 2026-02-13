@echo off
echo ========================================
echo   Spring Legal Consultancy
echo   Frontend Server Setup
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is installed
echo.

REM Install dependencies
echo 📦 Installing Node.js dependencies...
cd frontend
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully!
echo.

echo 🚀 Starting frontend server...
echo 📊 Clean URLs (no .html extension)
echo 🔗 API proxy: http://localhost:3001/api -> http://localhost:8000/api
echo 🌐 Visit: http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo.

npm start
