# =========================================
# Dockerfile for Ẩm Thực Giao Tuyết Backend
# Target: Google Cloud Run
# =========================================
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies (cache layer)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Set Python path for module imports (from backend.xxx import yyy)
ENV PYTHONPATH=/app

# Cloud Run injects PORT env var (default 8080)
EXPOSE 8080

# Start uvicorn server
# --proxy-headers: Trust X-Forwarded-Proto header from reverse proxy (Vercel/Cloud Run)
# --forwarded-allow-ips='*': Allow proxy headers from any IP (Cloud Run load balancer)
# BUGFIX: BUG-20260216-004 - Without these, FastAPI's trailing slash redirects use
#         http:// scheme internally, causing Mixed Content blocking on HTTPS frontends.
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips='*'"]
