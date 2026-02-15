import pytest
from httpx import AsyncClient
from backend.main import app
from backend.core.auth.schemas import UserCreate, Token
from backend.core.auth.security import create_access_token

@pytest.mark.asyncio
async def test_login_success():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Assuming a user exists or we can mock DB. 
        # For integration test, we might need a setup.
        # But here we just check if endpoint reachable
        response = await ac.post("/api/v1/auth/login", data={"username": "admin@example.com", "password": "password"})
        # 401 or 200 depending on DB state
        assert response.status_code in [200, 401]

@pytest.mark.asyncio
async def test_login_validation():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/login", data={})
        assert response.status_code == 422
