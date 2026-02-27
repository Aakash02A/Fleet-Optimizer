#!/bin/bash

# Fleet Optimizer - Bash Startup Script

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           Fleet Optimizer - Smart Fleet Management            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1)
echo "✓ Python found: $PYTHON_VERSION"
echo ""

# Check if required packages are installed
echo "📦 Checking dependencies..."
python3 -m pip show fastapi > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  Installing dependencies..."
    python3 -m pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install dependencies"
        exit 1
    fi
fi

echo "✓ All dependencies are installed"
echo ""

# Start the application
echo "🚀 Starting Fleet Optimizer Server..."
echo "📂 Application will be available at: http://localhost:8000"
echo "📊 API Documentation: http://localhost:8000/docs"
echo "⚙️  Alternative docs: http://localhost:8000/redoc"
echo ""
echo "⌨️  Press Ctrl+C to stop the server"
echo ""

# Start the server
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
