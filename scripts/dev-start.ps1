# Dev Server Pre-Start Script
# Purpose: Start both Backend and Frontend dev servers automatically
# Usage: .\dev-start.ps1

param(
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$All,
    [switch]$Stop
)

$ErrorActionPreference = "Continue"
$ProjectRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "=================================================="
Write-ColorOutput Green "  ERP SaaS Dev Server Manager"
Write-ColorOutput Green "=================================================="
Write-Host ""

# Check if servers are already running
function Test-ServerRunning {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    } catch {
        return $false
    }
}

# Start Backend Server
function Start-Backend {
    Write-Host "[Backend] Checking port 8080..."
    
    if (Test-ServerRunning -Port 8080) {
        Write-ColorOutput Yellow "[Backend] Already running on port 8080"
        return
    }
    
    Write-Host "[Backend] Starting Go server..."
    $backendPath = Join-Path $ProjectRoot "backend"
    
    if (Test-Path $backendPath) {
        Start-Process -FilePath "powershell" -ArgumentList @(
            "-NoExit",
            "-Command",
            "cd '$backendPath'; go run cmd/api/main.go"
        ) -WindowStyle Minimized
        
        Write-ColorOutput Green "[Backend] Started on http://localhost:8080"
    } else {
        Write-ColorOutput Red "[Backend] Directory not found: $backendPath"
    }
}

# Start Frontend Server
function Start-Frontend {
    Write-Host "[Frontend] Checking port 3000..."
    
    if (Test-ServerRunning -Port 3000) {
        Write-ColorOutput Yellow "[Frontend] Already running on port 3000"
        return
    }
    
    Write-Host "[Frontend] Starting Next.js server..."
    $frontendPath = Join-Path $ProjectRoot "frontend"
    
    if (Test-Path $frontendPath) {
        Start-Process -FilePath "powershell" -ArgumentList @(
            "-NoExit",
            "-Command",
            "cd '$frontendPath'; npm run dev"
        ) -WindowStyle Minimized
        
        Write-ColorOutput Green "[Frontend] Started on http://localhost:3000"
    } else {
        Write-ColorOutput Red "[Frontend] Directory not found: $frontendPath"
    }
}

# Stop all servers
function Stop-AllServers {
    Write-Host "[Stop] Killing dev servers..."
    
    # Kill Go processes
    Get-Process -Name "go" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "main" -ErrorAction SilentlyContinue | Stop-Process -Force
    
    # Kill Node processes on port 3000
    $nodeProcesses = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
                     Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $nodeProcesses) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    
    Write-ColorOutput Green "[Stop] All servers stopped"
}

# Main logic
if ($Stop) {
    Stop-AllServers
    exit 0
}

if ($All -or (-not $Backend -and -not $Frontend)) {
    # Default: start all
    Write-Host ""
    Write-Host "Starting all development servers..."
    Write-Host ""
    
    Start-Backend
    Start-Sleep -Seconds 2
    Start-Frontend
    
    Write-Host ""
    Write-ColorOutput Green "=================================================="
    Write-ColorOutput Green "  All servers started!"
    Write-ColorOutput Green "  Backend:  http://localhost:8080"
    Write-ColorOutput Green "  Frontend: http://localhost:3000"
    Write-ColorOutput Green "=================================================="
} else {
    if ($Backend) { Start-Backend }
    if ($Frontend) { Start-Frontend }
}

# Wait a bit and check status
Start-Sleep -Seconds 3
Write-Host ""
Write-Host "Server Status:"
Write-Host "  Backend (8080):  $(if (Test-ServerRunning -Port 8080) { 'Running' } else { 'Not Running' })"
Write-Host "  Frontend (3000): $(if (Test-ServerRunning -Port 3000) { 'Running' } else { 'Starting...' })"
