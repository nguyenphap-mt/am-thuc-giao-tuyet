"""Test API login using requests"""
import requests

url = "http://localhost:8000/api/v1/auth/login"
data = {
    "username": "nguyenphap.mt@gmail.com",
    "password": "password"
}

print(f"POST {url}")
print(f"Data: {data}")
print()

try:
    response = requests.post(url, data=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"Error: {e}")
