#!/bin/bash

echo "========================================"
echo "   Spring Legal Consultancy"
echo "   Frontend Server Setup"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js is installed"
echo ""

# Install dependencies
echo "📦 Installing Node.js dependencies..."
cd frontend
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully!"
echo ""

echo "🚀 Starting frontend server..."
echo "📊 Clean URLs (no .html extension)"
echo "🔗 API proxy: http://localhost:3001/api -> http://localhost:8000/api"
echo "🌐 Visit: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
