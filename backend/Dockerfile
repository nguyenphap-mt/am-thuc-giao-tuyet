# Dockerfile for Backend (Cloud Run)
# Fixes "ModuleNotFoundError: No module named 'backend'" by preserving package structure

FROM python:3.12-slim

# Set working directory to a parent folder
WORKDIR /service

# 1. Install dependencies
# requirements.txt is in the build context root (backend/)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Copy application code into 'backend' subdirectory
# This ensures 'from backend.core...' imports work
COPY . backend/

# 3. Set PYTHONPATH to the parent folder
ENV PYTHONPATH=/service

# 4. Run application
# Cloud Run sets PORT env var (default 8080)
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
