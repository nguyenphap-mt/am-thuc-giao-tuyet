---
description: Deploy Frontend (Vercel) và Backend (Render.com) lên production
---

# /deploy — Production Deployment Workflow

// turbo-all

> **Ref:** `.agent/DEPLOYMENT.md` chứa đầy đủ credentials & config

---

## PHASE 1: PRE-DEPLOY CHECKS

### Step 1.1: Kiểm tra Git status
```bash
git status
```
- Nếu có uncommitted changes → commit trước khi deploy
- Nếu có conflict → resolve trước

### Step 1.2: Kiểm tra branch
```bash
git branch --show-current
```
- PHẢI ở branch `main`
- Nếu ở branch khác → merge vào `main` trước

### Step 1.3: Quick backend syntax check
```bash
cd backend && python -c "import main; print('Backend OK')"
```
- Nếu lỗi import → fix trước khi deploy

---

## PHASE 2: DEPLOY BACKEND (Render.com)

### Step 2.1: Push code lên GitHub
```bash
git push origin main
```
- Render auto-deploy khi push lên `main` branch
- Chờ build + deploy hoàn tất (~3-5 phút, xem trên Render Dashboard)
- Dashboard: https://dashboard.render.com/

### Step 2.2: Health check backend
```bash
curl -s https://am-thuc-api.onrender.com/health
```
- Expected: `{"status": "healthy"}`
- ⚠️ Nếu backend đang cold start, chờ ~50s rồi thử lại
- Nếu fail → kiểm tra logs (Step 2.3)

### Step 2.3: Kiểm tra logs (chỉ khi lỗi)
- Mở Render Dashboard → Service `am-thuc-api` → Logs tab
- URL: https://dashboard.render.com/

---

## PHASE 3: DEPLOY FRONTEND (Vercel)

### Step 3.1: Push code lên cả 2 remotes
```bash
git push origin main
git push vercel main
```
- Vercel tự động deploy khi push lên `vercel` remote
- Chờ ~1-2 phút cho Vercel build

### Step 3.2: Verify Vercel deployment
- Mở browser: `https://amthucgiaotuyet.vercel.app`
- Kiểm tra trang load thành công (HTTP 200)

---

## PHASE 4: POST-DEPLOY VERIFICATION

### Step 4.1: Test login
- Mở browser: `https://amthucgiaotuyet.vercel.app/login`
- Login: `nguyenphap.mt@gmail.com` / `123Password`
- Expected: Redirect → `/dashboard` với "Xin chào, Nguyễn Pháp!"

### Step 4.2: Test API proxy
```bash
curl -s https://amthucgiaotuyet.vercel.app/api/v1/health
```
- Expected: `{"status": "healthy"}` (proxy từ Vercel → Render)

### Step 4.3: Report kết quả
```
✅ Backend: [URL] — healthy
✅ Frontend: [URL] — loaded
✅ Login: OK — redirect to /dashboard
```

---

## QUICK DEPLOY (Backend only)

Khi chỉ thay đổi backend code:
```bash
# 1. Commit
git add backend/ && git commit -m "fix(backend): <mô tả>"

# 2. Push (Render auto-deploy từ GitHub)
git push origin main

# 3. Health check (chờ ~3-5 phút cho build hoàn tất)
curl -s https://am-thuc-api.onrender.com/health
```

## QUICK DEPLOY (Frontend only)

Khi chỉ thay đổi frontend code:
```bash
# 1. Commit
git add frontend/ && git commit -m "fix(frontend): <mô tả>"

# 2. Push (Vercel auto-deploy)
git push origin main && git push vercel main
```

---

## ENV VARS UPDATE (khi cần)

### Render Backend
1. Mở https://dashboard.render.com/
2. Chọn service `am-thuc-api`
3. Environment tab → Add/Edit variable
4. Save → Service tự động redeploy

### Vercel Frontend
1. Mở https://vercel.com/dashboard
2. Chọn project → Settings → Environment Variables
3. Add/Edit variable → Redeploy

---

## TROUBLESHOOTING

| Triệu chứng | Kiểm tra | Fix |
|---|---|---|
| Backend 500 | Render Logs tab | Xem error trong logs |
| Frontend 405 | Vercel deploy status | Verify `vercel` remote đúng |
| Login fail | Backend logs + DB | Check search_path, RLS |
| CORS error | Render env vars | Update `CORS_ORIGINS` trong Render Dashboard |
| Slow cold start (~50s) | Render Free tier | Upgrade plan hoặc dùng cron keep-alive |
| Backend 502 | Render đang cold start | Chờ ~50s rồi thử lại |
