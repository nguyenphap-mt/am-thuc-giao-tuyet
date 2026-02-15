# Health Check Script
# Kiểm tra trạng thái của các services

# // turbo-all

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HEALTH CHECK - Service Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Function to check port
function Test-ServicePort {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

# Function to test HTTP endpoint
function Test-HttpEndpoint {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Check Database (PostgreSQL - Port 5432)
Write-Host "`n[Database - PostgreSQL]" -ForegroundColor White
$dbStatus = Test-ServicePort -Port 5432
if ($dbStatus) {
    Write-Host "  Status: RUNNING (Port 5432)" -ForegroundColor Green
} else {
    Write-Host "  Status: STOPPED" -ForegroundColor Red
}

# Check Backend (FastAPI - Port 8000)
Write-Host "`n[Backend - FastAPI]" -ForegroundColor White
$bePortStatus = Test-ServicePort -Port 8000
if ($bePortStatus) {
    Write-Host "  Port 8000: OPEN" -ForegroundColor Green
    
    # Test health endpoint
    $healthStatus = Test-HttpEndpoint -Url "http://localhost:8000/health"
    if ($healthStatus) {
        Write-Host "  Health: HEALTHY" -ForegroundColor Green
    } else {
        Write-Host "  Health: DEGRADED (port open but health endpoint failed)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Status: STOPPED" -ForegroundColor Red
}

# Check Frontend (Next.js - Port 3000)
Write-Host "`n[Frontend - Next.js]" -ForegroundColor White
$fePortStatus = Test-ServicePort -Port 3000
if ($fePortStatus) {
    Write-Host "  Port 3000: OPEN" -ForegroundColor Green
    
    # Test homepage
    $feStatus = Test-HttpEndpoint -Url "http://localhost:3000"
    if ($feStatus) {
        Write-Host "  Status: SERVING" -ForegroundColor Green
    } else {
        Write-Host "  Status: WARMING UP" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Status: STOPPED" -ForegroundColor Red
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$allRunning = $bePortStatus -and $fePortStatus
if ($allRunning) {
    Write-Host "  All core services are RUNNING" -ForegroundColor Green
    Write-Host "  Ready for development/testing" -ForegroundColor Green
} else {
    Write-Host "  Some services are NOT RUNNING" -ForegroundColor Yellow
    Write-Host "  Run: .\.agent\scripts\dev-start.ps1" -ForegroundColor Yellow
}

# Return exit code for automation
if ($allRunning) { exit 0 } else { exit 1 }
