# Auto-Build & Auto-Run Development Services
# Tự động khởi động Frontend (Next.js), Backend (FastAPI)

# // turbo-all

param(
    [switch]$SkipDatabase,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Continue"
$ProjectRoot = "D:\PROJECT\AM THUC GIAO TUYET"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AUTO-BUILD SYSTEM - Starting Services" -ForegroundColor Cyan
Write-Host "  Frontend: Next.js (Port 3000)" -ForegroundColor Cyan
Write-Host "  Backend:  FastAPI (Port 8000)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

# Function to wait for service
function Wait-ForService {
    param([string]$Name, [int]$Port, [int]$TimeoutSeconds = 30)
    
    Write-Host "Waiting for $Name on port $Port..." -ForegroundColor Yellow
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        if (Test-Port -Port $Port) {
            Write-Host "$Name is ready!" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
    Write-Host "$Name failed to start within $TimeoutSeconds seconds" -ForegroundColor Red
    return $false
}

# Check and start Backend
if (-not $FrontendOnly) {
    Write-Host "`n[1/2] Checking Backend (Port 8000)..." -ForegroundColor Cyan
    
    if (Test-Port -Port 8000) {
        Write-Host "Backend already running on port 8000" -ForegroundColor Green
    } else {
        Write-Host "Starting Backend (FastAPI)..." -ForegroundColor Yellow
        $backendPath = Join-Path $ProjectRoot "backend"
        
        if (Test-Path $backendPath) {
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; python -m uvicorn backend.main:app --reload --port 8000" -WindowStyle Normal
            Wait-ForService -Name "Backend" -Port 8000 -TimeoutSeconds 30
        } else {
            Write-Host "Backend directory not found: $backendPath" -ForegroundColor Red
        }
    }
}

# Check and start Frontend (Next.js)
if (-not $BackendOnly) {
    Write-Host "`n[2/2] Checking Frontend (Port 3000)..." -ForegroundColor Cyan
    
    if (Test-Port -Port 3000) {
        Write-Host "Frontend already running on port 3000" -ForegroundColor Green
    } else {
        Write-Host "Starting Frontend (Next.js)..." -ForegroundColor Yellow
        $frontendPath = Join-Path $ProjectRoot "frontend"
        
        if (Test-Path $frontendPath) {
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal
            Wait-ForService -Name "Frontend" -Port 3000 -TimeoutSeconds 60
        } else {
            Write-Host "Frontend directory not found: $frontendPath" -ForegroundColor Red
        }
    }
}

# Health Check Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Health Check Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$backendStatus = if (Test-Port -Port 8000) { "RUNNING" } else { "STOPPED" }
$frontendStatus = if (Test-Port -Port 3000) { "RUNNING" } else { "STOPPED" }

Write-Host "Backend  (8000): $backendStatus" -ForegroundColor $(if ($backendStatus -eq "RUNNING") { "Green" } else { "Red" })
Write-Host "Frontend (3000): $frontendStatus" -ForegroundColor $(if ($frontendStatus -eq "RUNNING") { "Green" } else { "Red" })

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  URLs:" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor Gray
Write-Host "  - Backend:  http://localhost:8000" -ForegroundColor Gray
Write-Host "  - API Docs: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
