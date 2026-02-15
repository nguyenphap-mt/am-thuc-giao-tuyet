# Dev Server Manager

# Purpose: Auto-manage dev servers with health checks
# Usage: .\dev-manager.ps1 [-Start] [-Stop] [-Status] [-Health]

param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Health,
    [switch]$AutoStart  # Auto-start if not running
)

$ErrorActionPreference = "Continue"
$ProjectRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName

# Configuration
$Config = @{
    Backend = @{
        Port = 8080
        Path = Join-Path $ProjectRoot "backend"
        Command = "go run cmd/api/main.go"
        HealthEndpoint = "http://localhost:8080/health"
    }
    Frontend = @{
        Port = 3000
        Path = Join-Path $ProjectRoot "frontend"
        Command = "npm run dev"
        HealthEndpoint = "http://localhost:3000"
    }
    Database = @{
        Port = 5432
        HealthCommand = "pg_isready -h localhost -p 5432"
    }
}

# ============================================
# Helper Functions
# ============================================

function Write-Status($Message, $Type = "Info") {
    $colors = @{
        "Info" = "White"
        "Success" = "Green"
        "Warning" = "Yellow"
        "Error" = "Red"
    }
    Write-Host "[$Type] $Message" -ForegroundColor $colors[$Type]
}

function Test-PortOpen($Port) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    } catch {
        return $false
    }
}

function Test-HealthEndpoint($Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Get-ServerStatus {
    $status = @{
        Database = @{
            Running = Test-PortOpen -Port $Config.Database.Port
            Healthy = $false
        }
        Backend = @{
            Running = Test-PortOpen -Port $Config.Backend.Port
            Healthy = $false
        }
        Frontend = @{
            Running = Test-PortOpen -Port $Config.Frontend.Port
            Healthy = $false
        }
    }
    
    # Check health endpoints
    if ($status.Backend.Running) {
        $status.Backend.Healthy = Test-HealthEndpoint -Url $Config.Backend.HealthEndpoint
    }
    if ($status.Frontend.Running) {
        $status.Frontend.Healthy = Test-HealthEndpoint -Url $Config.Frontend.HealthEndpoint
    }
    
    return $status
}

# ============================================
# Start Servers
# ============================================

function Start-DevServers {
    Write-Status "Starting development servers..." "Info"
    
    $status = Get-ServerStatus
    
    # Check Database
    if (-not $status.Database.Running) {
        Write-Status "PostgreSQL not running on port 5432" "Error"
        Write-Status "Please start PostgreSQL manually" "Warning"
        return $false
    }
    Write-Status "PostgreSQL: Running" "Success"
    
    # Start Backend
    if (-not $status.Backend.Running) {
        Write-Status "Starting Backend server..." "Info"
        $backendPath = $Config.Backend.Path
        
        if (Test-Path $backendPath) {
            Start-Process -FilePath "powershell" -ArgumentList @(
                "-NoExit",
                "-Command",
                "cd '$backendPath'; go run cmd/api/main.go"
            ) -WindowStyle Minimized
            
            # Wait for startup
            Start-Sleep -Seconds 3
            
            if (Test-PortOpen -Port $Config.Backend.Port) {
                Write-Status "Backend: Started on http://localhost:8080" "Success"
            } else {
                Write-Status "Backend: Failed to start" "Error"
            }
        } else {
            Write-Status "Backend path not found: $backendPath" "Error"
        }
    } else {
        Write-Status "Backend: Already running" "Success"
    }
    
    # Start Frontend
    if (-not $status.Frontend.Running) {
        Write-Status "Starting Frontend server..." "Info"
        $frontendPath = $Config.Frontend.Path
        
        if (Test-Path $frontendPath) {
            Start-Process -FilePath "powershell" -ArgumentList @(
                "-NoExit",
                "-Command",
                "cd '$frontendPath'; npm run dev"
            ) -WindowStyle Minimized
            
            # Wait for startup
            Start-Sleep -Seconds 5
            
            if (Test-PortOpen -Port $Config.Frontend.Port) {
                Write-Status "Frontend: Started on http://localhost:3000" "Success"
            } else {
                Write-Status "Frontend: Still starting... (may take longer)" "Warning"
            }
        } else {
            Write-Status "Frontend path not found: $frontendPath" "Error"
        }
    } else {
        Write-Status "Frontend: Already running" "Success"
    }
    
    return $true
}

# ============================================
# Stop Servers
# ============================================

function Stop-DevServers {
    Write-Status "Stopping development servers..." "Info"
    
    # Kill Go processes
    Get-Process -Name "go" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "main" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Status "Backend: Stopped" "Success"
    
    # Kill Node processes on port 3000
    $nodeProcesses = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
                     Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $nodeProcesses) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Write-Status "Frontend: Stopped" "Success"
}

# ============================================
# Show Status
# ============================================

function Show-Status {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Dev Server Status" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $status = Get-ServerStatus
    
    # Database
    $dbStatus = if ($status.Database.Running) { "✅ Running" } else { "❌ Not Running" }
    Write-Host "  PostgreSQL (5432): $dbStatus"
    
    # Backend
    $beStatus = if ($status.Backend.Running) {
        if ($status.Backend.Healthy) { "✅ Healthy" } else { "⚠️ Running (unhealthy)" }
    } else { "❌ Not Running" }
    Write-Host "  Backend (8080):    $beStatus"
    
    # Frontend
    $feStatus = if ($status.Frontend.Running) {
        if ($status.Frontend.Healthy) { "✅ Healthy" } else { "⚠️ Running (checking...)" }
    } else { "❌ Not Running" }
    Write-Host "  Frontend (3000):   $feStatus"
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Return overall status
    return ($status.Database.Running -and $status.Backend.Running -and $status.Frontend.Running)
}

# ============================================
# Health Check (For Browser Test Integration)
# ============================================

function Test-AllHealthy {
    $status = Get-ServerStatus
    
    $result = @{
        AllHealthy = $true
        Details = @()
    }
    
    if (-not $status.Database.Running) {
        $result.AllHealthy = $false
        $result.Details += "Database not running"
    }
    
    if (-not $status.Backend.Running) {
        $result.AllHealthy = $false
        $result.Details += "Backend not running"
    } elseif (-not $status.Backend.Healthy) {
        $result.AllHealthy = $false
        $result.Details += "Backend unhealthy"
    }
    
    if (-not $status.Frontend.Running) {
        $result.AllHealthy = $false
        $result.Details += "Frontend not running"
    }
    
    return $result
}

# ============================================
# Auto-Start for Browser Test
# ============================================

function Invoke-AutoStart {
    Write-Status "Auto-checking server status..." "Info"
    
    $health = Test-AllHealthy
    
    if ($health.AllHealthy) {
        Write-Status "All servers healthy, ready for testing!" "Success"
        return $true
    }
    
    Write-Status "Some servers not ready: $($health.Details -join ', ')" "Warning"
    Write-Status "Attempting to start..." "Info"
    
    return Start-DevServers
}

# ============================================
# Main Logic
# ============================================

if ($Start) {
    Start-DevServers
} elseif ($Stop) {
    Stop-DevServers
} elseif ($Status) {
    Show-Status
} elseif ($Health) {
    $health = Test-AllHealthy
    if ($health.AllHealthy) {
        exit 0
    } else {
        Write-Status ($health.Details -join "; ") "Error"
        exit 1
    }
} elseif ($AutoStart) {
    $result = Invoke-AutoStart
    if ($result) { exit 0 } else { exit 1 }
} else {
    # Default: show status
    Show-Status
}
