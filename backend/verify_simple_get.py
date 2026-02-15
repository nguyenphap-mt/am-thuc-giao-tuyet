
import httpx
import asyncio

BASE_URL = "http://localhost:8000/api/v1/procurement"

async def verify_gets():
    async with httpx.AsyncClient() as client:
        print("Checking GET /suppliers...")
        res = await client.get(f"{BASE_URL}/suppliers")
        print(f"Suppliers Status: {res.status_code}")
        if res.status_code != 200:
            print(res.text)

        print("Checking GET /orders...")
        res = await client.get(f"{BASE_URL}/orders")
        print(f"Orders Status: {res.status_code}")
        if res.status_code != 200:
            print(res.text)

if __name__ == "__main__":
    asyncio.run(verify_gets())
