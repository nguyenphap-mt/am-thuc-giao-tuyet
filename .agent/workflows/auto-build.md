---
description: Tự động build và chạy Frontend (Next.js), Backend (FastAPI) cho development/testing
---

# Auto-Build Workflow

// turbo-all

## Mục đích
Workflow này tự động khởi động các services cần thiết để phát triển và test ứng dụng.

---

## Khi nào sử dụng
- Trước khi chạy Browser Test
- Khi User yêu cầu "chạy", "test", "verify", "build"
- Trước Integration Test
- Khi bắt đầu session development mới

---

## Steps

### Step 1: Health Check (// turbo)
Kiểm tra services đang chạy:
```powershell
.\.agent\scripts\health-check.ps1
```

Nếu output hiện "All core services are RUNNING" → **Skip to Step 4**.

---

### Step 2: Start Backend (// turbo)
Nếu Backend chưa chạy:
```powershell
cd backend
python -m uvicorn main:app --reload --port 8000
```

**Wait**: 5 seconds cho service khởi động.

---

### Step 3: Start Frontend (// turbo)
Nếu Frontend (Next.js) chưa chạy:
```powershell
cd frontend
npm run dev
```

**Wait**: 10 seconds cho service khởi động và compile.

---

### Step 4: Verify Health (// turbo)
Verify tất cả services đã ready:
```powershell
.\.agent\scripts\health-check.ps1
```

**Expected output**: 
- Backend: RUNNING (Port 8000)
- Frontend: RUNNING (Port 3000)

Nếu FAIL → Report error, do NOT proceed to testing.

---

### Step 5: Open Browser (// turbo)
Mở browser để test:
```powershell
Start-Process "http://localhost:3000"
```

---

## Quick Start (All-in-One)
Sử dụng script tiện lợi để start tất cả:
```powershell
.\.agent\scripts\dev-start.ps1
```

---

## Stop Services
Khi cần dừng services:
```powershell
.\.agent\scripts\dev-stop.ps1
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
1. Check Python virtual environment activated
2. Check dependencies: `pip install -r requirements.txt`
3. Check port 8000 not in use: `netstat -ano | findstr :8000`

### Frontend không start  
1. Check Node.js installed: `node --version`
2. Check dependencies: `npm install`
3. Check port 3000 not in use: `netstat -ano | findstr :3000`

### Database connection failed
1. Check PostgreSQL running: `Test-NetConnection localhost -Port 5432`
2. Check connection string trong `.env`
