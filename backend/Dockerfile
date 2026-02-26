# Dockerfile for Backend (Render.com)
# Fixes "ModuleNotFoundError: No module named 'backend'" by preserving package structure

FROM python:3.12-slim

# Set working directory to a parent folder
WORKDIR /service

# 1. Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Python dependencies
# requirements.txt is in the build context root (backend/)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy application code into 'backend' subdirectory
# This ensures 'from backend.core...' imports work
COPY . backend/

# 4. Set PYTHONPATH to the parent folder
ENV PYTHONPATH=/service

# 5. Run application
# Render sets PORT env var (default 10000)
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers --forwarded-allow-ips='*'"]
