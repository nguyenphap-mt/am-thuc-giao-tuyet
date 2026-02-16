---
description: Deploy Frontend (Vercel) và Backend (Cloud Run) lên production
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

## PHASE 2: DEPLOY BACKEND (Google Cloud Run)

### Step 2.1: Deploy lên Cloud Run
```bash
gcloud run deploy am-thuc-api --source . --region asia-southeast1 --allow-unauthenticated --port 8080
```
- Chờ build + deploy hoàn tất (~2-3 phút)
- Verify output: `Service URL: https://am-thuc-api-321822391174.asia-southeast1.run.app`

### Step 2.2: Health check backend
```bash
curl -s https://am-thuc-api-321822391174.asia-southeast1.run.app/health
```
- Expected: `{"status": "healthy"}`
- Nếu fail → kiểm tra logs (Step 2.3)

### Step 2.3: Kiểm tra logs (chỉ khi lỗi)
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=am-thuc-api AND severity>=ERROR" --limit 5 --format="value(textPayload)" --freshness=10m
```

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
- Expected: `{"status": "healthy"}` (proxy từ Vercel → Cloud Run)

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

# 2. Deploy
gcloud run deploy am-thuc-api --source . --region asia-southeast1 --allow-unauthenticated --port 8080

# 3. Health check
curl -s https://am-thuc-api-321822391174.asia-southeast1.run.app/health
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

```bash
# ⚠️ PHẢI dùng --update-env-vars (KHÔNG dùng --set-env-vars vì sẽ xóa hết env vars khác!)
gcloud run services update am-thuc-api \
  --region asia-southeast1 \
  --update-env-vars "KEY=VALUE"
```

---

## TROUBLESHOOTING

| Triệu chứng | Kiểm tra | Fix |
|---|---|---|
| Backend 500 | Cloud Run logs | Xem error trong logs |
| Frontend 405 | Vercel deploy status | Verify `vercel` remote đúng |
| Login fail | Backend logs + DB | Check search_path, RLS |
| CORS error | Cloud Run env vars | Update `CORS_ORIGINS` |
| Slow cold start | Cloud Run config | Thêm `--min-instances 1` |
