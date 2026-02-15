import requests

try:
    response = requests.options(
        "http://localhost:8000/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:4502",
            "Access-Control-Request-Method": "POST"
        }
    )
    print("Status Code:", response.status_code)
    print("Headers:")
    for k, v in response.headers.items():
        print(f"{k}: {v}")
except Exception as e:
    print(e)
