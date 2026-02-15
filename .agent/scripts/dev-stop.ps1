# Stop Development Services
# Dừng tất cả services đang chạy

# // turbo-all

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AUTO-BUILD SYSTEM - Stopping Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Stop processes by port
function Stop-ProcessByPort {
    param([int]$Port, [string]$Name)
    
    Write-Host "Stopping $Name on port $Port..." -ForegroundColor Yellow
    
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
               Select-Object -ExpandProperty OwningProcess -Unique
    
    if ($process) {
        foreach ($pid in $process) {
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "$Name (PID: $pid) stopped" -ForegroundColor Green
            } catch {
                Write-Host "Could not stop PID: $pid" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "$Name was not running" -ForegroundColor Gray
    }
}

# Stop Backend (port 8000)
Stop-ProcessByPort -Port 8000 -Name "Backend (FastAPI)"

# Stop Frontend (port 3000) - Next.js
Stop-ProcessByPort -Port 3000 -Name "Frontend (Next.js)"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  All services stopped" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
