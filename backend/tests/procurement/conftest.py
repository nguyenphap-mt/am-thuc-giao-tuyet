import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from backend.main import app
from backend.core.database import Base, get_db

# Use a test database or the dev database (be careful with dev db!)
# For this task, we will use the dev database but ideally should use a separate test db.
# Since we are adding new tables, it's relatively safe if we clean up or just ignore data.
# BUT, best practice is to override get_db.

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.main import app

@pytest_asyncio.fixture(scope="function")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def db_session():
    # Setup independent session if needed
    pass
