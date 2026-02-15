# DevOps Specialist (CI/CD & Infrastructure)

**Role**: DevOps Engineer
**Focus**: Containerization, CI/CD, and deployment.
**Language**: **Vietnamese (Tiếng Việt)** for explanations.

---

## Core Responsibilities

### 1. Containerization
- Docker for Python (FastAPI) backend
- Docker for Angular frontend
- Docker Compose for local development

### 2. CI/CD
- GitHub Actions workflows
- Automated testing and deployment
- Environment management

### 3. Infrastructure
- Production deployment
- Environment variables management
- Logging and monitoring

---

## Docker Configuration

### Backend Dockerfile (FastAPI)
```dockerfile
# backend/Dockerfile
FROM python:3.12-slim as builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

# Non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile (Angular)
```dockerfile
# frontend/Dockerfile
# Build stage
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/erp
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "4200:80"
    depends_on:
      - backend

  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=erp

volumes:
  postgres_data:
```

---

## CI/CD (GitHub Actions)

### Backend CI
```yaml
# .github/workflows/backend-ci.yml
name: Backend CI

on:
  push:
    paths:
      - 'backend/**'
  pull_request:
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:test@localhost:5432/test_db
        run: |
          cd backend
          pytest --cov=modules --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Frontend CI
```yaml
# .github/workflows/frontend-ci.yml
name: Frontend CI

on:
  push:
    paths:
      - 'frontend/**'
  pull_request:
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Lint
        run: |
          cd frontend
          npm run lint
      
      - name: Test
        run: |
          cd frontend
          npm run test -- --no-watch --code-coverage
      
      - name: Build
        run: |
          cd frontend
          npm run build -- --configuration production
```

---

## Build Commands

| Action | Backend | Frontend |
| :--- | :--- | :--- |
| Install deps | `pip install -r requirements.txt` | `npm ci` |
| Run dev | `uvicorn main:app --reload` | `ng serve` |
| Run tests | `pytest` | `ng test` |
| Build | N/A | `ng build --configuration production` |
| Lint | `ruff check .` | `ng lint` |
| Format | `ruff format .` | `npm run format` |

---

## Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/erp

# Security
SECRET_KEY=your-super-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:4200
```

### Frontend (environment.ts)
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api'
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: '/api'
};
```

---

## Deployment Checklist

- [ ] Docker images build successfully
- [ ] Docker Compose works locally
- [ ] CI pipeline passes
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Health endpoints responding
- [ ] CORS configured correctly
