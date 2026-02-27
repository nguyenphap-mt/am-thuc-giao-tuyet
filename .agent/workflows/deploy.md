---
description: Deploy Frontend (Vercel) và Backend (Render.com) lên production
---

# /deploy — Production Deployment Workflow

// turbo-all

> **Cập nhật**: 2026-02-27 — Sửa đúng remotes, URLs, Supabase config

---

## ⚙️ Infrastructure Overview

| Component | Platform | URL / Connection |
| :--- | :--- | :--- |
| **Frontend** | Vercel | https://amthucgiaotuyet.vercel.app |
| **Backend** | Render.com | https://am-thuc-api-b9so.onrender.com |
| **Database** | Supabase (PostgreSQL) | `postgresql://postgres.udgtiyflupuxpmrtvnet:...@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres` |
| **Supabase Dashboard** | Supabase | https://supabase.com/dashboard/project/udgtiyflupuxpmrtvnet |
| **Render Dashboard** | Render | https://dashboard.render.com/web/srv-d6g67nfgi27c73cntd90 |

### Git Remotes

| Remote | URL | Dùng cho |
| :--- | :--- | :--- |
| `vercel` | `https://github.com/duanbtco-star/am-thuc-giao-tuyet.git` | **Deploy production** (Vercel + Render đều kết nối repo này) |
| `origin` | `https://github.com/duanbtco/am-thuc-giao-tuyet.git` | Repo cũ — KHÔNG dùng cho deploy |

> [!CAUTION]
> **LUÔN dùng `git push vercel main`** để deploy. KHÔNG dùng `git push origin main`.
> Remote `origin` là repo cũ, push vào đó sẽ KHÔNG trigger Vercel/Render deployment.

---

## PHASE 1: PRE-DEPLOY CHECKS

### Step 1.1: Kiểm tra Git status
```powershell
git status
```
- Nếu có uncommitted changes → commit trước khi deploy
- Nếu có conflict → resolve trước

### Step 1.2: Kiểm tra branch
```powershell
git branch --show-current
```
- PHẢI ở branch `main`

### Step 1.3: Quick frontend build check
```powershell
npx next build
```
**CWD**: `frontend/`
- Nếu build lỗi → fix trước khi deploy

---

## PHASE 2: DEPLOY (Push to GitHub)

### Step 2.1: Push code lên GitHub (trigger cả Vercel + Render)
```powershell
git push vercel main
```
- **Vercel** auto-deploy frontend (~1-2 phút)
- **Render** auto-deploy backend (~3-5 phút)
- Cả hai đều kết nối repo `duanbtco-star/am-thuc-giao-tuyet`

### Step 2.2: Health check backend
```powershell
curl -s https://am-thuc-api-b9so.onrender.com/health
```
- Expected: `{"status": "healthy"}`
- ⚠️ Nếu backend đang cold start (free tier), chờ ~50s rồi thử lại

### Step 2.3: Kiểm tra logs (chỉ khi lỗi)
- Render Dashboard → Logs tab
- URL: https://dashboard.render.com/web/srv-d6g67nfgi27c73cntd90/logs

---

## PHASE 3: POST-DEPLOY VERIFICATION

### Step 3.1: Verify Vercel deployment
- Mở: https://amthucgiaotuyet.vercel.app
- Hoặc check deployments: https://vercel.com/duanbtco-stars-projects/amthucgiaotuyet/deployments

### Step 3.2: Test login
- URL: https://amthucgiaotuyet.vercel.app/login
- Login: `nguyenphap.mt@gmail.com` / `123Password`
- Expected: Redirect → `/dashboard` với "Xin chào, Nguyễn Văn Pháp!"

### Step 3.3: Test API proxy
```powershell
curl -s https://amthucgiaotuyet.vercel.app/api/v1/health
```
- Expected: `{"status": "healthy"}` (proxy từ Vercel → Render)

### Step 3.4: Report kết quả
```
✅ Backend: https://am-thuc-api-b9so.onrender.com — healthy
✅ Frontend: https://amthucgiaotuyet.vercel.app — loaded
✅ Login: OK — redirect to /dashboard
```

---

## QUICK DEPLOY (Backend only)

```powershell
# 1. Commit
git add backend/; git commit -m "fix(backend): <mô tả>"

# 2. Push (Render auto-deploy)
git push vercel main

# 3. Health check (chờ ~3-5 phút)
curl -s https://am-thuc-api-b9so.onrender.com/health
```

## QUICK DEPLOY (Frontend only)

```powershell
# 1. Commit
git add "frontend/"; git commit -m "fix(frontend): <mô tả>"

# 2. Push (Vercel auto-deploy)
git push vercel main
```

---

## DATABASE MIGRATION (Supabase)

### Khi cần thêm columns/tables
1. Mở Supabase SQL Editor: https://supabase.com/dashboard/project/udgtiyflupuxpmrtvnet/sql
2. Viết SQL migration với `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`
3. Click **Run** để execute
4. Verify qua API endpoint tương ứng

### Connection String (cho backend .env)
```
DATABASE_URL=postgresql://postgres.udgtiyflupuxpmrtvnet:7ih1H6nZ586Mn63l@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
```

---

## ENV VARS UPDATE (khi cần)

### Render Backend
1. Mở https://dashboard.render.com/web/srv-d6g67nfgi27c73cntd90/env
2. Add/Edit variable → Save → Auto-redeploy

### Vercel Frontend
1. Mở https://vercel.com/duanbtco-stars-projects/amthucgiaotuyet/settings/environment-variables
2. Add/Edit variable → Redeploy

---

## TROUBLESHOOTING

| Triệu chứng | Kiểm tra | Fix |
|---|---|---|
| Push không deploy | `git remote -v` | Dùng `git push vercel main` (KHÔNG dùng `origin`) |
| Backend 500 | Render Logs tab | Xem error, có thể thiếu DB column → chạy migration trên Supabase |
| Frontend 405 | Vercel deploy status | Check build logs trên Vercel dashboard |
| Login fail | Backend logs + Supabase | Check DATABASE_URL, RLS policies |
| CORS error | Render env vars | Update `CORS_ORIGINS` trong Render Dashboard |
| Cold start (~50s) | Render Free tier | Chờ ~50s rồi thử lại |
| Backend 502 | Render đang cold start | Chờ ~50s rồi thử lại |
| DB column missing | Supabase SQL Editor | Chạy `ALTER TABLE ADD COLUMN IF NOT EXISTS` |
