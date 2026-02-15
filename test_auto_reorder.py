import requests

# Login
login_resp = requests.post('http://localhost:8000/api/v1/auth/login', data={'username': 'nguyenphap.mt@gmail.com', 'password': 'password'})
print('Login status:', login_resp.status_code)
if login_resp.status_code != 200:
    print('Login response:', login_resp.text)
    exit()

token = login_resp.json()['access_token']
print('Token obtained!')

# Test low-stock
headers = {'Authorization': f'Bearer {token}'}
low_stock = requests.get('http://localhost:8000/api/v1/inventory/low-stock', headers=headers)
print('Low stock status:', low_stock.status_code)
if low_stock.status_code == 200:
    data = low_stock.json()
    print(f"Critical: {data['critical_count']}, Warning: {data['warning_count']}, Low: {data['low_count']}")
    print(f"Total items: {len(data['items'])}")

# Test auto-reorder
reorder = requests.post('http://localhost:8000/api/v1/inventory/low-stock/auto-reorder', headers=headers, json={'multiplier': 1.5})
print('Auto-reorder status:', reorder.status_code)
print('Auto-reorder response:', reorder.text)
