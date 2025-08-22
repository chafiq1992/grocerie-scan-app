# Multi-stage build: build frontend, then run FastAPI serving static frontend
# Stage 1: Frontend build
FROM node:20 AS frontend-build
WORKDIR /app
COPY package.json package-lock.json* vite.config.js index.html ./
RUN npm ci --no-audit --no-fund
COPY src ./src
RUN npm run build


# Stage 2: Backend runtime
FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
PYTHONUNBUFFERED=1 \
PIP_NO_CACHE_DIR=1 \
PORT=8080


# System deps for psycopg
RUN apt-get update && apt-get install -y --no-install-recommends \
libpq5 curl && \
rm -rf /var/lib/apt/lists/*


WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt


# Copy backend code
COPY backend ./backend


# Copy built frontend from stage 1
COPY --from=frontend-build /app/dist ./frontend/dist


# Default: run Uvicorn on PORT (Cloud Run uses PORT env)
EXPOSE 8080
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]