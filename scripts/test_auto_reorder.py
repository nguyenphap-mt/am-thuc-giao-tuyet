"""Test auto-reorder API directly"""
import requests

# Get token first
login_url = "http://localhost:8000/api/v1/auth/login"
login_data = {
    "username": "nguyenphap.mt@gmail.com",
    "password": "password"
}

print("1. Login...")
login_resp = requests.post(login_url, data=login_data)
if login_resp.status_code != 200:
    print(f"Login failed: {login_resp.status_code}")
    print(login_resp.text)
    exit(1)

token = login_resp.json()["access_token"]
print(f"   Token: {token[:30]}...")

headers = {"Authorization": f"Bearer {token}"}

# Check low-stock first
print("\n2. Check low-stock items...")
low_stock_resp = requests.get(
    "http://localhost:8000/api/v1/inventory/low-stock",
    headers=headers
)
print(f"   Status: {low_stock_resp.status_code}")
if low_stock_resp.status_code == 200:
    data = low_stock_resp.json()
    print(f"   Critical: {data['critical_count']}, Warning: {data['warning_count']}")
    print(f"   Items: {len(data['items'])}")
    for item in data['items'][:3]:
        print(f"     - {item['name']}: {item['current_stock']}/{item['min_stock']} ({item['status']})")
else:
    print(f"   Error: {low_stock_resp.text}")

# Test auto-reorder
print("\n3. Test auto-reorder...")
reorder_resp = requests.post(
    "http://localhost:8000/api/v1/inventory/low-stock/auto-reorder",
    headers=headers,
    json={"multiplier": 1.5}
)
print(f"   Status: {reorder_resp.status_code}")
print(f"   Response: {reorder_resp.text}")
