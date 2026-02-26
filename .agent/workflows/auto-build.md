---
description: Tự động build và chạy Frontend (Next.js), Backend (FastAPI) cho development/testing
---

# Auto-Build Workflow

// turbo-all

## Mục đích
Workflow này tự động khởi động các services **trong terminal của AI** để dễ debug và monitor.

---

## Khi nào sử dụng
- Trước khi chạy Browser Test
- Khi User yêu cầu "chạy", "test", "verify", "build"
- Trước Integration Test
- Khi bắt đầu session development mới

---

## Steps

### Step 1: Check Port Status (// turbo)
Kiểm tra services đang chạy trên port 8000 và 3000:
```powershell
$be = Test-NetConnection -ComputerName localhost -Port 8000 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue; $fe = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue; Write-Host "Backend (8000): $(if ($be.TcpTestSucceeded) {'RUNNING'} else {'STOPPED'})"; Write-Host "Frontend (3000): $(if ($fe.TcpTestSucceeded) {'RUNNING'} else {'STOPPED'})"
```

- Nếu **cả hai RUNNING** → Skip to Step 4
- Nếu Backend STOPPED → Tiếp Step 2
- Nếu Frontend STOPPED → Tiếp Step 3

---

### Step 2: Start Backend trong terminal AI (// turbo)
**QUAN TRỌNG**: 
- Phải chạy từ **project root** (`D:\PROJECT\AM THUC GIAO TUYET`) 
- Dùng `backend.main:app` (KHÔNG phải `main:app`)
- Phải load `backend\.env` trước khi start

```powershell
Get-Content "D:\PROJECT\AM THUC GIAO TUYET\backend\.env" | ForEach-Object { if ($_ -and !$_.StartsWith('#') -and $_.Contains('=')) { $i = $_.IndexOf('='); [Environment]::SetEnvironmentVariable($_.Substring(0,$i).Trim(), $_.Substring($i+1).Trim(), 'Process') } }; python -m uvicorn backend.main:app --reload --port 8000
```

**CWD**: `D:\PROJECT\AM THUC GIAO TUYET` (project root)
**IMPORTANT**: Command này chạy async (background). Đợi 5s rồi verify port 8000.

---

### Step 3: Start Frontend trong terminal AI (// turbo)
Frontend chạy từ folder `frontend/`:
```powershell
Set-Location "D:\PROJECT\AM THUC GIAO TUYET\frontend"; npm run dev
```

**IMPORTANT**: Command này chạy async (background). Đợi 10s rồi verify port 3000.

---

### Step 4: Verify Health (// turbo)
Verify Backend bằng health endpoint:
```powershell
try { $r = Invoke-RestMethod -Uri http://localhost:8000/health -Method GET -TimeoutSec 5; Write-Host "Backend HEALTHY: $($r | ConvertTo-Json -Compress)" -ForegroundColor Green } catch { Write-Host "Backend NOT responding" -ForegroundColor Red }
```

Verify Frontend:
```powershell
try { $r = Invoke-WebRequest -Uri http://localhost:3000 -Method GET -TimeoutSec 5; Write-Host "Frontend HEALTHY: HTTP $($r.StatusCode)" -ForegroundColor Green } catch { Write-Host "Frontend NOT responding" -ForegroundColor Red }
```

**Expected output**: 
- Backend: `HEALTHY: {"status":"ok"}`
- Frontend: `HEALTHY: HTTP 200`

Nếu FAIL → Report error, do NOT proceed to testing.

---

### Step 5: Open Browser (// turbo)
Mở browser để test:
```powershell
Start-Process "http://localhost:3000"
```

---

## URLs Reference
| Service | URL |
| :--- | :--- |
| Frontend (Next.js) | http://localhost:3000 |
| Backend API (FastAPI) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |

---

## Troubleshooting

### Backend không start
1. Đảm bảo `.env` file tồn tại: `Test-Path backend\.env`
2. Check port 8000: `netstat -ano | findstr :8000`
3. Kill process cũ: `Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`

### Frontend không start
1. Check node_modules: `Test-Path frontend\node_modules`
2. Check port 3000: `netstat -ano | findstr :3000`

### Database connection failed
1. Check PostgreSQL: `Test-NetConnection localhost -Port 5432`
2. Check DATABASE_URL trong `backend\.env`

### Khác biệt so với dev-start.ps1
- `dev-start.ps1` mở **PowerShell windows mới** (tách biệt, khó debug)
- Workflow này chạy **trong terminal AI** (dễ monitor output, tự động debug lỗi)
