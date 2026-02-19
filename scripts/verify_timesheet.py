"""Verify auto-timesheet creation by completing the order."""
import requests
import json

BASE = "https://am-thuc-api-321822391174.asia-southeast1.run.app/api/v1"
OUT = open("scripts/verify_output.txt", "w", encoding="utf-8")

def log(msg):
    print(msg, flush=True)
    OUT.write(msg + "\n")

# Login
login = requests.post(f"{BASE}/auth/login",
    data={"username": "nguyenphap.mt@gmail.com", "password": "123Password"},
    headers={"Content-Type": "application/x-www-form-urlencoded"})
t = login.json()
token = t["access_token"]

# Get user info
me = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {token}"})
user = me.json()
tid = str(user.get("tenant_id", ""))
log(f"Tenant ID: {tid}")

h = {"Authorization": f"Bearer {token}", "X-Tenant-ID": tid}

# Check order status
order_id = "e31f7018-5c2b-4db9-a0a9-697f168cf9e7"
resp = requests.get(f"{BASE}/orders/{order_id}", headers=h)
o = resp.json()
log(f"Order: {o['code']} | Status: {o['status']}")

# Check existing timesheets for Feb
ts = requests.get(f"{BASE}/hr/timesheets?start_date=2026-02-01&end_date=2026-02-28", headers=h).json()
log(f"Timesheets BEFORE: {len(ts)}")
for x in ts:
    log(f"  - {x['employee_name']} | {x['work_date']} | source={x['source']} | order={x.get('order_code','N/A')}")

# Complete the order using POST /{order_id}/complete
if o["status"] != "COMPLETED":
    log(f"\n>>> POST /orders/{order_id}/complete ...")
    complete = requests.post(f"{BASE}/orders/{order_id}/complete", headers=h)
    log(f"Response: {complete.status_code}")
    if complete.status_code == 200:
        resp_data = complete.json()
        log(f"Order new status: {resp_data.get('status')}")
    else:
        log(f"Error: {complete.text[:500]}")
    
    # Re-check timesheets
    ts2 = requests.get(f"{BASE}/hr/timesheets?start_date=2026-02-01&end_date=2026-02-28", headers=h).json()
    log(f"\nTimesheets AFTER: {len(ts2)}")
    for x in ts2:
        log(f"  - {x['employee_name']} | {x['work_date']} | source={x['source']} | order={x.get('order_code','N/A')}")
else:
    log("Order already completed.")
    
OUT.close()
