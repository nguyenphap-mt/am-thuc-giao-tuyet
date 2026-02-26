import requests
import traceback

# Login
login_resp = requests.post(
    'http://localhost:8000/api/v1/auth/login',
    data={'username': 'nguyenphap.mt@gmail.com', 'password': '123Password'}
)
token = login_resp.json().get('access_token')
headers = {'Authorization': 'Bearer ' + token}

# Get user info  
me_resp = requests.get('http://localhost:8000/api/v1/auth/me', headers=headers)
user = me_resp.json()
print("User tenant_id:", user.get('tenant_id'))

# List assignments
list_resp = requests.get('http://localhost:8000/api/v1/hr/assignments', headers=headers)
assignments = list_resp.json()
print("Found", len(assignments), "assignments")

for a in assignments[:2]:
    print("  Assignment:", a.get('id', '')[:12])
    print("    tenant_id:", a.get('tenant_id', 'N/A'))
    print("    event_id:", a.get('event_id', 'N/A'))
    print("    employee_id:", a.get('employee_id', 'N/A'))
    print("    status:", a.get('status', 'N/A'))

# Try delete
if assignments:
    target = assignments[0]
    aid = target['id']
    print("\n--- Deleting:", aid, "---")
    del_resp = requests.delete(
        'http://localhost:8000/api/v1/hr/assignments/' + aid,
        headers=headers
    )
    print("Status:", del_resp.status_code)
    print("Headers:", dict(del_resp.headers))
    print("Body:", del_resp.text[:1000])
