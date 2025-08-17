# backend/run_dev.ps1

Write-Host "🛡️  Sentinel Backend Development Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Copy .env.example to .env and fill with your values:" -ForegroundColor Yellow
    Write-Host "   - ZIRCUIT_WS=wss://your-zircuit-websocket" -ForegroundColor Yellow
    Write-Host "   - ZIRCUIT_HTTP=https://your-zircuit-rpc" -ForegroundColor Yellow
    Write-Host "   - SENDER_PRIVATE_KEY=0x..." -ForegroundColor Yellow
    Write-Host "   - GUARDIAN_CONTROLLER_ADDR=0x..." -ForegroundColor Yellow
    Write-Host "   - APPROVAL_REVOKE_HELPER_ADDR=0x..." -ForegroundColor Yellow
    Write-Host ""
}

# Create virtual environment
Write-Host "🐍 Creating virtual environment..." -ForegroundColor Green
python -m venv venv

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Green
& "venv\Scripts\Activate.ps1"

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Green
pip install -r requirements.txt

Write-Host ""
Write-Host "🚀 Starting Sentinel services..." -ForegroundColor Green
Write-Host "   - API Server: http://localhost:8000" -ForegroundColor Cyan
Write-Host "   - API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "   - Blockchain Monitor: Background process" -ForegroundColor Cyan
Write-Host ""

# Start both processes in parallel
Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & "venv\Scripts\Activate.ps1"
    Write-Host "🌐 Starting FastAPI server..." -ForegroundColor Blue
    uvicorn app.main:app --reload --port 8000
} -Name "SentinelAPI"

Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & "venv\Scripts\Activate.ps1"
    Write-Host "👂 Starting blockchain listener..." -ForegroundColor Blue
    python -m app.zircuit_listener
} -Name "SentinelListener"

Write-Host "✅ Both services started!" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

# Wait for user to stop
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "🛑 Stopping services..." -ForegroundColor Red
    Stop-Job -Name "SentinelAPI" -ErrorAction SilentlyContinue
    Stop-Job -Name "SentinelListener" -ErrorAction SilentlyContinue
    Remove-Job -Name "SentinelAPI" -ErrorAction SilentlyContinue
    Remove-Job -Name "SentinelListener" -ErrorAction SilentlyContinue
    Write-Host "✅ Services stopped" -ForegroundColor Green
}