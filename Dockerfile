# =========================================
# Dockerfile for Ẩm Thực Giao Tuyết Backend
# Target: Render.com (Web Service)
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

# Render injects PORT env var (default 10000)
EXPOSE 10000

# Start uvicorn server
# --proxy-headers: Trust X-Forwarded-Proto header from reverse proxy (Vercel/Render)
# --forwarded-allow-ips='*': Allow proxy headers from any IP (Render load balancer)
# BUGFIX: BUG-20260216-004 - Without these, FastAPI's trailing slash redirects use
#         http:// scheme internally, causing Mixed Content blocking on HTTPS frontends.
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers --forwarded-allow-ips='*'"]
