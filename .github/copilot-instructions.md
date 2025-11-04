# AI-as-a-Service Platform: Complete Project Context for GitHub Copilot

**Project Name:** Internal AI-as-a-Service Platform  
**Version:** 2.0.0 (Production-Safe Stack)  
**Date:** November 2, 2025  
**Architecture:** Monorepo with Backend (NestJS), Frontend (Next.js), SDK (TypeScript)  
**Target:** Enterprise-grade, production-ready, zero-compromise implementation  
**Deployment:** Fully Dockerized with Docker Compose

---

## 🎯 Project Overview

### Purpose

Build a self-hosted AI-as-a-Service platform that allows all company projects (existing and new) to integrate AI capabilities through a simple API key. The platform provides:

- Automated database schema discovery
- SQL query generation from natural language
- AI-powered chatbots with project context
- Data analytics and predictions
- Centralized usage tracking and management

### Business Context

- **Problem:** Multiple projects implementing AI independently, costly external APIs (₹22L/month)
- **Solution:** Centralized self-hosted platform with 93% cost reduction
- **ROI:** Break-even in 1-2 months, ₹2.7 Crore annual savings
- **Scale:** Support 100+ internal projects, 500+ concurrent users

---

## 🏗️ Technical Architecture

### System Design Pattern

```
Monorepo Structure:
├── Backend (NestJS microservices)
├── Frontend (Next.js admin portal)
├── SDK (TypeScript client library)
└── Shared (types, utilities, configs)

Architecture Style:
- Microservices with API Gateway
- Event-driven with message queues
- RESTful + GraphQL APIs
- Real-time with WebSockets
- Fully containerized with Docker
```

### Core Components

1. **API Gateway Layer** - Kong/Traefik for routing, rate limiting, authentication
2. **Backend Services** - NestJS modules for business logic
3. **AI Orchestration** - LangChain.js for prompt engineering and model routing
4. **Data Layer** - PostgreSQL (metadata), MongoDB (logs), Redis (cache), Weaviate (vectors)
5. **Model Serving** - vLLM on remote GPU servers (OpenAI-compatible API)
6. **Frontend** - Next.js 15 with App Router and React Server Components

---

## 📦 Tech Stack (Production-Safe Versions - November 2, 2025)

### Backend Stack

```yaml
Runtime & Framework:
  - Node.js: 22.11.0 LTS (Stable, supported until April 2027)
  - NestJS: 11.1.7 (Latest stable, released Jan 2025)
  - TypeScript: 5.6.3

Core Dependencies:
  API & Communication:
    - express: 5.0.1
    - @nestjs/platform-express: 11.1.7
    - @nestjs/graphql: 12.2.3
    - @apollo/server: 4.11.2
    - socket.io: 4.8.1

  Database & ORM:
    - @prisma/client: 6.0.1
    - prisma: 6.0.1
    - mongodb: 8.0.3
    - redis: 7.4.1
    - ioredis: 5.4.1

  Authentication & Security:
    - @nestjs/passport: 10.0.3
    - @nestjs/jwt: 10.2.0
    - passport: 0.7.0
    - passport-jwt: 4.0.1
    - bcrypt: 5.1.1
    - helmet: 8.0.0
    - class-validator: 0.14.1
    - class-transformer: 0.5.1

  AI & ML:
    - langchain: 0.3.5
    - @langchain/community: 0.3.5
    - @langchain/openai: 0.3.5
    - openai: 4.73.0
    - zod: 3.23.8

  Queue & Jobs:
    - @nestjs/bull: 10.2.1
    - bull: 4.16.3

  Monitoring & Logging:
    - pino: 9.5.0
    - pino-http: 10.3.0
    - pino-pretty: 11.3.0
    - @nestjs/terminus: 11.0.0

  Testing:
    - jest: 29.7.0
    - @nestjs/testing: 11.1.7
    - supertest: 7.0.0

Database Configuration:
  PostgreSQL: 17.2 (primary database)
  MongoDB: 8.0.3 (logs and analytics)
  Redis: 7.4.1 (caching, sessions, queues)
  Weaviate: 1.27.5 (vector database for RAG)
```

### Frontend Stack

```yaml
Framework:
  - Next.js: 15.3.0 (Stable 15.x, not 16 - production-ready)
  - React: 19.2.0 (Latest stable)
  - TypeScript: 5.6.3

UI & Styling:
  - tailwindcss: 4.0.0
  - @radix-ui/react-*: latest (primitives)
  - framer-motion: 11.11.17
  - lucide-react: 0.454.0

State & Data:
  - @tanstack/react-query: 5.60.5
  - zustand: 5.0.1
  - axios: 1.7.9

Forms & Validation:
  - react-hook-form: 7.54.2
  - zod: 3.23.8

Charts & Visualization:
  - recharts: 2.14.1
  - @apache-echarts/react: 1.0.0

Real-time:
  - socket.io-client: 4.8.1

Testing:
  - vitest: 2.1.8
  - @playwright/test: 1.49.1
```

### DevOps & Infrastructure

```yaml
Containerization:
  - Docker: 27.3.1
  - docker-compose: 2.30.3

Process Management:
  - PM2: 5.4.2 (inside Docker container)

Monitoring:
  - prometheus: latest
  - grafana: latest

Documentation:
  - swagger: 3.1.0
  - @nestjs/swagger: 8.0.7
```

---

## 🐳 Complete Docker Compose Setup

### Project Structure with Docker

```
ai-service-platform/
├── .github/
├── packages/
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   └── src/
│   ├── frontend/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   └── app/
│   └── sdk/
├── docker/
│   ├── postgres/
│   │   └── init.sql
│   ├── mongodb/
│   │   └── init-mongo.js
│   ├── nginx/
│   │   └── nginx.conf
│   └── prometheus/
│       └── prometheus.yml
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

### Main Docker Compose File

```yaml
# docker-compose.yml
version: "3.9"

services:
  # PostgreSQL Database
  postgres:
    image: postgres:17.2-alpine
    container_name: ai-service-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-ai_service}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-dev_password_123}
      POSTGRES_DB: ${POSTGRES_DB:-ai_service}
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - ai-service-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-ai_service}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MongoDB Database
  mongodb:
    image: mongo:8.0.3
    container_name: ai-service-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD:-admin_password_123}
      MONGO_INITDB_DATABASE: ${MONGO_DB:-ai_service_logs}
    ports:
      - "${MONGO_PORT:-27017}:27017"
    volumes:
      - mongodb_data:/data/db
      - ./docker/mongodb/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    networks:
      - ai-service-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7.4.1-alpine
    container_name: ai-service-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD:-redis_password_123} --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
    networks:
      - ai-service-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Weaviate Vector Database
  weaviate:
    image: semitechnologies/weaviate:1.27.5
    container_name: ai-service-weaviate
    restart: unless-stopped
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: "true"
      PERSISTENCE_DATA_PATH: "/var/lib/weaviate"
      DEFAULT_VECTORIZER_MODULE: "none"
      ENABLE_MODULES: "text2vec-openai,generative-openai"
      CLUSTER_HOSTNAME: "node1"
    ports:
      - "${WEAVIATE_PORT:-8080}:8080"
      - "50051:50051"
    volumes:
      - weaviate_data:/var/lib/weaviate
    networks:
      - ai-service-network
    healthcheck:
      test:
        [
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          "http://localhost:8080/v1/.well-known/ready",
        ]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API (NestJS)
  backend:
    build:
      context: ./packages/backend
      dockerfile: Dockerfile
      args:
        NODE_VERSION: 22.11.0
    container_name: ai-service-backend
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 3001
      DATABASE_URL: postgresql://${POSTGRES_USER:-ai_service}:${POSTGRES_PASSWORD:-dev_password_123}@postgres:5432/${POSTGRES_DB:-ai_service}?schema=public
      MONGODB_URI: mongodb://${MONGO_ROOT_USER:-admin}:${MONGO_ROOT_PASSWORD:-admin_password_123}@mongodb:27017/${MONGO_DB:-ai_service_logs}?authSource=admin
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD:-redis_password_123}
      WEAVIATE_URL: http://weaviate:8080
      JWT_SECRET: ${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
      JWT_EXPIRATION: 7d
      VLLM_BASE_URL: ${VLLM_BASE_URL:-http://host.docker.internal:8000}
      CORS_ORIGIN: http://localhost:3000
    ports:
      - "3001:3001"
    volumes:
      - ./packages/backend/src:/app/src
      - ./packages/backend/prisma:/app/prisma
      - backend_node_modules:/app/node_modules
    networks:
      - ai-service-network
    depends_on:
      postgres:
        condition: service_healthy
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
      weaviate:
        condition: service_healthy
    healthcheck:
      test:
        [
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          "http://localhost:3001/api/v1/health",
        ]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend (Next.js)
  frontend:
    build:
      context: ./packages/frontend
      dockerfile: Dockerfile
      args:
        NODE_VERSION: 22.11.0
        NEXT_PUBLIC_API_URL: http://localhost:3001/api/v1
    container_name: ai-service-frontend
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      NEXT_PUBLIC_API_URL: http://localhost:3001/api/v1
      NEXT_PUBLIC_WS_URL: ws://localhost:3001
      NEXT_PUBLIC_APP_NAME: AI Service Platform
    ports:
      - "3000:3000"
    volumes:
      - ./packages/frontend/app:/app/app
      - ./packages/frontend/components:/app/components
      - ./packages/frontend/lib:/app/lib
      - frontend_node_modules:/app/node_modules
      - nextjs_cache:/app/.next
    networks:
      - ai-service-network
    depends_on:
      - backend
    healthcheck:
      test:
        [
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          "http://localhost:3000",
        ]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Reverse Proxy (Optional - for production)
  nginx:
    image: nginx:1.27-alpine
    container_name: ai-service-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
    networks:
      - ai-service-network
    depends_on:
      - backend
      - frontend
    profiles:
      - production

  # Prometheus Monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: ai-service-prometheus
    restart: unless-stopped
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
    ports:
      - "9090:9090"
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - ai-service-network
    profiles:
      - monitoring

  # Grafana Dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: ai-service-grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_USER:-admin}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin_password}
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    ports:
      - "3030:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - ai-service-network
    depends_on:
      - prometheus
    profiles:
      - monitoring

volumes:
  postgres_data:
    driver: local
  mongodb_data:
    driver: local
  redis_data:
    driver: local
  weaviate_data:
    driver: local
  backend_node_modules:
    driver: local
  frontend_node_modules:
    driver: local
  nextjs_cache:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

networks:
  ai-service-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

### Development Docker Compose Override

```yaml
# docker-compose.dev.yml
version: "3.9"

services:
  backend:
    build:
      target: development
    command: pnpm run start:dev
    environment:
      LOG_LEVEL: debug
    volumes:
      - ./packages/backend:/app
      - /app/node_modules

  frontend:
    build:
      target: development
    command: pnpm run dev
    environment:
      NODE_ENV: development
    volumes:
      - ./packages/frontend:/app
      - /app/node_modules
      - /app/.next
```

### Production Docker Compose Override

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  backend:
    build:
      target: production
    command: node dist/main.js
    environment:
      NODE_ENV: production
      LOG_LEVEL: info
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "2"
          memory: 2G
        reservations:
          cpus: "1"
          memory: 1G

  frontend:
    build:
      target: production
    command: pnpm run start
    environment:
      NODE_ENV: production
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "1"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 512M
```

---

## 🐳 Dockerfiles

### Backend Dockerfile

```dockerfile
# packages/backend/Dockerfile

# Base stage
FROM node:22.11.0-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@latest

# Dependencies stage
FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile
RUN npx prisma generate

# Development stage
FROM base AS development
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/.pnpm-store /root/.pnpm-store
COPY . .
EXPOSE 3001
CMD ["pnpm", "run", "start:dev"]

# Builder stage
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN pnpm run build
RUN pnpm prune --prod

# Production stage
FROM node:22.11.0-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

USER nestjs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["dumb-init", "node", "dist/main.js"]
```

### Backend .dockerignore

```
# packages/backend/.dockerignore
node_modules
dist
coverage
.env
.env.*
!.env.example
*.log
.git
.gitignore
README.md
.vscode
.idea
test
**/*.spec.ts
**/*.test.ts
```

### Frontend Dockerfile

```dockerfile
# packages/frontend/Dockerfile

# Base stage
FROM node:22.11.0-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@latest

# Dependencies stage
FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "run", "dev"]

# Builder stage
FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_APP_NAME

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN pnpm run build

# Production stage
FROM node:22.11.0-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy necessary files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["dumb-init", "node", "server.js"]
```

### Frontend .dockerignore

```
# packages/frontend/.dockerignore
node_modules
.next
out
coverage
.env
.env.*
!.env.example
*.log
.git
.gitignore
README.md
.vscode
.idea
**/*.test.tsx
**/*.test.ts
```

---

## 🔧 Configuration Files

### Nginx Configuration

```nginx
# docker/nginx/nginx.conf

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=500r/s;

    # Upstream backends
    upstream backend_api {
        least_conn;
        server backend:3001 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    upstream frontend_app {
        least_conn;
        server frontend:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # HTTP Server (redirect to HTTPS in production)
    server {
        listen 80;
        server_name _;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # API endpoints
        location /api/ {
            limit_req zone=api_limit burst=50 nodelay;

            proxy_pass http://backend_api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # WebSocket endpoint
        location /socket.io/ {
            proxy_pass http://backend_api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 86400;
        }

        # Frontend application
        location / {
            limit_req zone=general_limit burst=200 nodelay;

            proxy_pass http://frontend_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### Prometheus Configuration

```yaml
# docker/prometheus/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: "ai-service-platform"
    environment: "development"

scrape_configs:
  # Backend API metrics
  - job_name: "backend"
    static_configs:
      - targets: ["backend:3001"]
    metrics_path: "/metrics"

  # Postgres exporter
  - job_name: "postgres"
    static_configs:
      - targets: ["postgres:5432"]

  # Redis exporter
  - job_name: "redis"
    static_configs:
      - targets: ["redis:6379"]

  # Self monitoring
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]
```

### PostgreSQL Init Script

```sql
-- docker/postgres/init.sql

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database if not exists
SELECT 'CREATE DATABASE ai_service'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ai_service')\gexec

-- Set timezone
SET timezone = 'UTC';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ai_service TO ai_service;
```

### MongoDB Init Script

```javascript
// docker/mongodb/init-mongo.js

db = db.getSiblingDB("ai_service_logs");

// Create collections
db.createCollection("api_logs");
db.createCollection("error_logs");
db.createCollection("audit_logs");

// Create indexes
db.api_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
db.api_logs.createIndex({ projectId: 1, timestamp: -1 });
db.api_logs.createIndex({ endpoint: 1, timestamp: -1 });

db.error_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
db.error_logs.createIndex({ level: 1, timestamp: -1 });

db.audit_logs.createIndex({ timestamp: 1 });
db.audit_logs.createIndex({ userId: 1, timestamp: -1 });

// Create admin user
db.createUser({
  user: "ai_service_app",
  pwd: "app_password_123",
  roles: [{ role: "readWrite", db: "ai_service_logs" }],
});

print("MongoDB initialization complete!");
```

---

## 🔐 Environment Variables

### Root .env File

```bash
# .env (root directory)

# Project
PROJECT_NAME=ai-service-platform
NODE_ENV=development

# PostgreSQL
POSTGRES_USER=ai_service
POSTGRES_PASSWORD=dev_password_123
POSTGRES_DB=ai_service
POSTGRES_PORT=5432

# MongoDB
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=admin_password_123
MONGO_DB=ai_service_logs
MONGO_PORT=27017

# Redis
REDIS_PASSWORD=redis_password_123
REDIS_PORT=6379

# Weaviate
WEAVIATE_PORT=8080

# Backend
BACKEND_PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-with-64-char-minimum
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_REFRESH_EXPIRATION=30d

# AI Models (vLLM endpoints)
VLLM_BASE_URL=http://host.docker.internal:8000

# Frontend
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_NAME=AI Service Platform

# Monitoring (optional)
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin_password
```

### Backend .env

```bash
# packages/backend/.env

NODE_ENV=development
PORT=3001
API_PREFIX=api/v1

# Database (will be overridden by docker-compose)
DATABASE_URL="postgresql://ai_service:dev_password_123@localhost:5432/ai_service?schema=public"
MONGODB_URI="mongodb://admin:admin_password_123@localhost:27017/ai_service_logs?authSource=admin"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password_123

# Weaviate
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRATION=30d

# AI Models (vLLM endpoints)
VLLM_BASE_URL=http://localhost:8000
VLLM_QWEN_CODER_URL=http://localhost:8001/v1
VLLM_DEEPSEEK_R1_URL=http://localhost:8002/v1
VLLM_QWEN_7B_URL=http://localhost:8003/v1

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

### Frontend .env.local

```bash
# packages/frontend/.env.local

NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_NAME=AI Service Platform
NEXT_TELEMETRY_DISABLED=1
```

---

## 📂 Complete Project Structure

```
ai-service-platform/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── projects/
│   │   │   │   ├── api-keys/
│   │   │   │   ├── schema/
│   │   │   │   ├── ai/
│   │   │   │   ├── usage/
│   │   │   │   ├── weaviate/
│   │   │   │   └── admin/
│   │   │   ├── common/
│   │   │   ├── config/
│   │   │   ├── prisma/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── .env.example
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── frontend/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── types/
│   │   ├── public/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── .env.local.example
│   │   ├── next.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── sdk/
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── docker/
│   ├── postgres/
│   │   └── init.sql
│   ├── mongodb/
│   │   └── init-mongo.js
│   ├── nginx/
│   │   └── nginx.conf
│   └── prometheus/
│       └── prometheus.yml
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── DOCKER.md
├── scripts/
│   ├── setup.sh
│   ├── seed-data.ts
│   └── docker-cleanup.sh
├── .env
├── .env.example
├── .gitignore
├── .nvmrc
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## 🚀 Getting Started with Docker

### Quick Start Commands

```bash
# 1. Clone and setup
git clone <repo-url>
cd ai-service-platform

# 2. Copy environment files
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.local.example packages/frontend/.env.local

# 3. Update .env files with your values
# Edit .env, packages/backend/.env, packages/frontend/.env.local

# 4. Start all services (development)
docker-compose up -d

# 5. Check services status
docker-compose ps

# 6. View logs
docker-compose logs -f

# 7. Run database migrations
docker-compose exec backend npx prisma migrate dev

# 8. Seed initial data
docker-compose exec backend pnpm run seed

# 9. Access services
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Backend Swagger: http://localhost:3001/api/docs
# PostgreSQL: localhost:5432
# MongoDB: localhost:27017
# Redis: localhost:6379
# Weaviate: http://localhost:8080
```

### Development Workflow

```bash
# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Watch logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Rebuild a service after code changes
docker-compose build backend
docker-compose up -d backend

# Execute commands inside containers
docker-compose exec backend pnpm run test
docker-compose exec backend npx prisma studio

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Start with monitoring
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile monitoring up -d

# Scale services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale backend=3 --scale frontend=2

# View production logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Health checks
docker-compose ps
curl http://localhost:3001/api/v1/health
curl http://localhost:3000

# Backup databases
docker-compose exec postgres pg_dump -U ai_service ai_service > backup.sql
docker-compose exec mongodb mongodump --out=/backup
```

### Useful Docker Commands

```bash
# Clean up unused resources
docker system prune -a

# Remove all stopped containers
docker container prune

# Remove unused volumes
docker volume prune

# Check disk usage
docker system df

# Inspect a container
docker inspect ai-service-backend

# Execute shell in container
docker-compose exec backend sh
docker-compose exec frontend sh

# Copy files from/to container
docker cp local-file.txt ai-service-backend:/app/
docker cp ai-service-backend:/app/logs ./logs

# Monitor resource usage
docker stats
```

---

## 📦 Package.json Files

### Root package.json

```json
{
  "name": "ai-service-platform",
  "version": "1.0.0",
  "private": true,
  "description": "AI-as-a-Service Platform - Monorepo",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",
    "clean": "turbo run clean && rm -rf node_modules",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:build": "docker-compose build",
    "docker:logs": "docker-compose logs -f",
    "docker:clean": "docker-compose down -v && docker system prune -f"
  },
  "devDependencies": {
    "prettier": "^3.3.3",
    "turbo": "^2.3.0",
    "typescript": "^5.6.3"
  },
  "engines": {
    "node": ">=22.11.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.14.2"
}
```

### Backend package.json

```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "AI Service Platform - Backend API",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^11.1.7",
    "@nestjs/core": "^11.1.7",
    "@nestjs/platform-express": "^11.1.7",
    "@nestjs/config": "^3.3.1",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/swagger": "^8.0.7",
    "@nestjs/bull": "^10.2.1",
    "@nestjs/terminus": "^11.0.0",
    "@nestjs/graphql": "^12.2.3",
    "@apollo/server": "^4.11.2",
    "@prisma/client": "^6.0.1",
    "express": "^5.0.1",
    "langchain": "^0.3.5",
    "@langchain/openai": "^0.3.5",
    "@langchain/community": "^0.3.5",
    "openai": "^4.73.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "pino": "^9.5.0",
    "pino-http": "^10.3.0",
    "pino-pretty": "^11.3.0",
    "bull": "^4.16.3",
    "ioredis": "^5.4.1",
    "mongodb": "^8.0.3",
    "zod": "^3.23.8",
    "helmet": "^8.0.0",
    "socket.io": "^4.8.1",
    "node-sql-parser": "^5.3.5",
    "pg": "^8.13.1",
    "mysql2": "^3.11.5"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.1.7",
    "@types/express": "^5.0.0",
    "@types/node": "^22.9.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/bcrypt": "^5.0.2",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "typescript": "^5.6.3",
    "prisma": "^6.0.1",
    "ts-node": "^10.9.2",
    "@types/jest": "^29.5.14",
    "ts-jest": "^29.2.5",
    "eslint": "^9.15.0",
    "prettier": "^3.3.3"
  },
  "engines": {
    "node": ">=22.11.0"
  }
}
```

### Frontend package.json

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "description": "AI Service Platform - Frontend",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "15.3.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@tanstack/react-query": "^5.60.5",
    "axios": "^1.7.9",
    "zustand": "^5.0.1",
    "react-hook-form": "^7.54.2",
    "zod": "^3.23.8",
    "tailwindcss": "^4.0.0",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.2",
    "framer-motion": "^11.11.17",
    "lucide-react": "^0.454.0",
    "recharts": "^2.14.1",
    "socket.io-client": "^4.8.1",
    "sonner": "^1.7.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8",
    "@playwright/test": "^1.49.1",
    "eslint": "^9.15.0",
    "eslint-config-next": "15.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49"
  },
  "engines": {
    "node": ">=22.11.0"
  }
}
```

---

## 🗄️ Database Schema (Prisma) - Complete

```prisma
// packages/backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(USER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects  Project[]

  @@map("users")
}

enum Role {
  ADMIN
  USER
  VIEWER
}

model Project {
  id          String      @id @default(uuid())
  name        String
  description String?
  userId      String
  environment Environment @default(DEVELOPMENT)
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  apiKeys      ApiKey[]
  schema       ProjectSchema?
  usage        ApiUsage[]
  chatMessages ChatMessage[]

  @@map("projects")
}

enum Environment {
  DEVELOPMENT
  STAGING
  PRODUCTION
}

model ApiKey {
  id          String    @id @default(uuid())
  key         String    @unique
  name        String
  projectId   String
  scopes      Scope[]
  rateLimit   Int       @default(1000)
  isActive    Boolean   @default(true)
  expiresAt   DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("api_keys")
}

enum Scope {
  QUERY_GENERATION
  CHATBOT
  ANALYTICS
  PREDICTIONS
  ADMIN
}

model ProjectSchema {
  id               String          @id @default(uuid())
  projectId        String          @unique
  schemaText       String          @db.Text
  schemaSummary    String          @db.Text
  tables           Json
  dialect          DatabaseDialect
  connectionString String?         @db.Text
  isAutoDiscovery  Boolean         @default(false)
  lastSyncedAt     DateTime?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("project_schemas")
}

enum DatabaseDialect {
  POSTGRESQL
  MYSQL
  SQLITE
}

model ApiUsage {
  id           String   @id @default(uuid())
  projectId    String
  endpoint     String
  model        String?
  tokensUsed   Int      @default(0)
  responseTime Int
  success      Boolean  @default(true)
  errorMessage String?  @db.Text
  metadata     Json?
  createdAt    DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, createdAt])
  @@map("api_usage")
}

model ChatMessage {
  id             String      @id @default(uuid())
  conversationId String
  projectId      String
  role           MessageRole
  content        String      @db.Text
  metadata       Json?
  createdAt      DateTime    @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
  @@map("chat_messages")
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

---

## 🎯 Updated Implementation Priorities

### Week 1: Docker Setup & Core Backend

1. ✅ Setup complete Docker Compose environment
2. ✅ Initialize NestJS project with all modules
3. ✅ Configure Prisma with PostgreSQL
4. ✅ Implement JWT authentication
5. ✅ Build API key management system
6. ✅ Create project CRUD operations
7. ✅ Setup Redis caching and rate limiting
8. ✅ Test all services in Docker

### Week 2: AI Integration & Backend Features

1. ✅ Integrate Weaviate vector store
2. ✅ Build schema upload and parsing
3. ✅ Implement AI orchestration service
4. ✅ Add SQL query generation endpoint
5. ✅ Build chatbot service with WebSocket
6. ✅ Add analytics service
7. ✅ Create usage tracking system
8. ✅ Test AI features end-to-end

### Week 3-4: Frontend & SDK

1. ✅ Initialize Next.js 15 project in Docker
2. ✅ Setup shadcn/ui components
3. ✅ Build authentication pages
4. ✅ Create dashboard layout
5. ✅ Implement projects management UI
6. ✅ Build API keys management
7. ✅ Add analytics dashboard
8. ✅ Build TypeScript SDK
9. ✅ Create integration examples
10. ✅ Write comprehensive tests

### Week 5-6: Production Ready

1. ✅ Setup production Docker Compose
2. ✅ Configure Nginx reverse proxy
3. ✅ Setup Prometheus + Grafana monitoring
4. ✅ Implement health checks
5. ✅ Configure auto-scaling
6. ✅ Create deployment scripts
7. ✅ Setup CI/CD pipelines
8. ✅ Load testing
9. ✅ Security hardening
10. ✅ Documentation

---

## 🎓 Docker Best Practices for This Project

### Development Tips

```bash
# 1. Hot reload works automatically
# Volumes are mapped for live code changes

# 2. Debug backend inside Docker
docker-compose exec backend sh
node --inspect=0.0.0.0:9229 dist/main.js

# 3. Access database directly
docker-compose exec postgres psql -U ai_service -d ai_service
docker-compose exec mongodb mongosh -u admin -p admin_password_123

# 4. View real-time logs with filtering
docker-compose logs -f backend | grep ERROR
docker-compose logs -f --tail=100 frontend

# 5. Performance monitoring
docker stats ai-service-backend ai-service-frontend

# 6. Network debugging
docker network inspect ai-service-platform_ai-service-network
```

### Production Deployment Checklist

- [ ] Update all passwords in .env
- [ ] Configure proper SSL certificates
- [ ] Setup automatic backups
- [ ] Configure log rotation
- [ ] Setup monitoring alerts
- [ ] Test disaster recovery
- [ ] Configure auto-restart policies
- [ ] Setup firewall rules
- [ ] Enable HTTPS only
- [ ] Configure rate limiting
- [ ] Setup log aggregation
- [ ] Test failover scenarios

---

## 🚀 Final Notes

### Complete Docker Workflow

```bash
# DEVELOPMENT
# 1. Start everything
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 2. Run migrations
docker-compose exec backend npx prisma migrate dev

# 3. Seed data
docker-compose exec backend pnpm run seed

# 4. Access services
open http://localhost:3000  # Frontend
open http://localhost:3001/api/docs  # Swagger

# PRODUCTION
# 1. Build images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# 2. Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 3. Health check
curl http://localhost:3001/api/v1/health

# 4. Monitor
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile monitoring up -d
open http://localhost:9090  # Prometheus
open http://localhost:3030  # Grafana
```

### What You Get

✅ **Complete Dockerized Environment** - Everything runs in containers  
✅ **Production-Safe Versions** - Node 22 LTS, NestJS 11, Next.js 15, React 19.2  
✅ **Auto-Restart** - All services restart on failure  
✅ **Health Checks** - Built-in health monitoring  
✅ **Hot Reload** - Code changes reflect instantly  
✅ **Isolated Networks** - Secure internal communication  
✅ **Persistent Data** - Named volumes for databases  
✅ **Easy Scaling** - Scale services with one command  
✅ **Monitoring Ready** - Prometheus + Grafana included  
✅ **Production Ready** - Nginx, SSL, clustering support

---

**Project Start Date:** November 2, 2025  
**Target Completion:** December 15, 2025 (6 weeks)  
**Quality Standard:** Enterprise-grade, Production-ready, Fully Dockerized

**LET'S BUILD THIS! 🚀🐳**
