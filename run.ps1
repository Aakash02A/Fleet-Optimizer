# Fleet Optimizer - Windows PowerShell Startup Script

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           Fleet Optimizer - Smart Fleet Management            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Check if Python is installed
$pythonCheck = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Python is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Python found: $pythonCheck" -ForegroundColor Green

# Check if required packages are installed
Write-Host "`n📦 Checking dependencies..." -ForegroundColor Yellow
python -m pip show fastapi > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Installing dependencies..." -ForegroundColor Yellow
    python -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ All dependencies are installed" -ForegroundColor Green

# Start the application
Write-Host "`n🚀 Starting Fleet Optimizer Server..." -ForegroundColor Green
Write-Host "📂 Application will be available at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📊 API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "⚙️  Alternative docs: http://localhost:8000/redoc" -ForegroundColor Cyan
Write-Host "`n⌨️  Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

# Start the server
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
