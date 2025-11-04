# AI-as-a-Service Platform

**Enterprise-Grade Self-Hosted AI Platform for Internal Projects**

[![Node.js](https://img.shields.io/badge/Node.js-22.11.0-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.1.7-red)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.0-black)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

---

## 🎯 Overview

A production-ready, self-hosted AI-as-a-Service platform that enables all company projects to integrate AI capabilities through simple API keys. Features automated database schema discovery, SQL query generation, AI chatbots, and centralized usage tracking.

### Key Features

- 🤖 **Natural Language to SQL** - Generate queries from plain English
- 💬 **AI-Powered Chatbots** - Context-aware conversations with project data
- 📊 **Data Analytics** - Automated insights and predictions
- 🔑 **API Key Management** - Secure authentication and rate limiting
- 📈 **Usage Tracking** - Comprehensive analytics and cost monitoring
- 🐳 **Fully Dockerized** - One-command deployment

### Business Value

- **Cost Savings:** 93% reduction (from ₹22L/month to ₹1.5L/month)
- **ROI:** Break-even in 1-2 months
- **Annual Savings:** ₹2.7 Crore
- **Scale:** Support 100+ projects, 500+ concurrent users

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                 │
│              React 19.2 + TanStack Query                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              API Gateway (Nginx/Kong)                    │
│          Rate Limiting + Authentication                  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│               Backend API (NestJS 11)                    │
│  Auth │ Projects │ AI │ Schema │ Usage │ Chatbot       │
└─────────┬─────────┬─────────┬─────────┬───────────────┘
          │         │         │         │
          ▼         ▼         ▼         ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│PostgreSQL│ │ MongoDB  │ │  Redis   │ │ Weaviate │
│  Metadata│ │   Logs   │ │  Cache   │ │  Vectors │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## 📦 Tech Stack

### Backend
- **Runtime:** Node.js 22.11.0 LTS
- **Framework:** NestJS 11.1.7
- **Language:** TypeScript 5.6.3
- **ORM:** Prisma 6.0.1
- **AI:** LangChain 0.3.5, OpenAI 4.73.0
- **Queue:** Bull 4.16.3
- **WebSocket:** Socket.io 4.8.1

### Frontend
- **Framework:** Next.js 15.3.0 (App Router)
- **UI Library:** React 19.2.0
- **State:** Zustand 5.0.1, TanStack Query 5.60.5
- **Styling:** Tailwind CSS 4.0.0
- **Components:** Radix UI, shadcn/ui

### Databases
- **PostgreSQL:** 17.2 (Primary database)
- **MongoDB:** 8.0.3 (Logs and analytics)
- **Redis:** 7.4.1 (Caching and queues)
- **Weaviate:** 1.27.5 (Vector database for RAG)

### Infrastructure
- **Containerization:** Docker 27.3.1
- **Orchestration:** Docker Compose 2.30.3
- **Reverse Proxy:** Nginx 1.27
- **Monitoring:** Prometheus + Grafana

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22.11.0 or higher
- pnpm 9.0.0 or higher
- Docker 27.3.1 or higher
- Docker Compose 2.30.3 or higher

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd ai-service-platform

# 2. Install dependencies
pnpm install

# 3. Copy environment files
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env

# 4. Start all services with Docker
docker-compose up -d

# 5. Run database migrations
docker-compose exec backend npx prisma migrate dev

# 6. Seed initial data (optional)
docker-compose exec backend pnpm run seed
```

### Access Services

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3001
- **API Documentation:** http://localhost:3001/api/docs
- **PostgreSQL:** localhost:5432
- **MongoDB:** localhost:27017
- **Redis:** localhost:6379
- **Weaviate:** http://localhost:8080

> ⚠️ **Important for Node.js 22 Users:**  
> If you encounter `localStorage.getItem is not a function` error, use the provided startup scripts:
> - **Windows:** `cd packages/frontend && ./dev.bat`
> - **Linux/Mac:** `cd packages/frontend && ./dev.sh`
> - See `docs/FRONTEND-FIXED.md` for details

---

## 🐳 Docker Commands

### Development

```bash
# Start all services
docker-compose up -d

# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Production

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Start with monitoring
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile monitoring up -d

# Scale services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale backend=3 --scale frontend=2
```

---

## 📂 Project Structure

```
ai-service-platform/
├── .github/                    # GitHub workflows and config
├── packages/
│   ├── backend/               # NestJS backend API
│   │   ├── prisma/           # Database schema
│   │   ├── src/
│   │   │   ├── modules/      # Feature modules
│   │   │   ├── common/       # Shared utilities
│   │   │   ├── config/       # Configuration
│   │   │   └── prisma/       # Prisma service
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── frontend/             # Next.js frontend
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── lib/            # Utilities and API client
│   │   ├── Dockerfile
│   │   └── package.json
│   └── sdk/                 # TypeScript SDK
├── docker/                   # Docker configuration
│   ├── postgres/
│   ├── mongodb/
│   ├── nginx/
│   └── prometheus/
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── README.md
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` file in the root directory:

```bash
# PostgreSQL
POSTGRES_USER=ai_service
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=ai_service

# MongoDB
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=your_secure_password
MONGO_DB=ai_service_logs

# Redis
REDIS_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_minimum_64_characters
JWT_REFRESH_SECRET=your_refresh_secret_key

# AI Models
VLLM_BASE_URL=http://your-vllm-server:8000
```

See `.env.example` for complete configuration options.

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Backend tests
cd packages/backend
pnpm test

# Frontend tests
cd packages/frontend
pnpm test

# E2E tests
pnpm test:e2e
```

---

## 📚 API Documentation

API documentation is available at http://localhost:3001/api/docs when the backend is running.

### Key Endpoints

- **Authentication:** `/api/v1/auth/login`, `/api/v1/auth/register`
- **Projects:** `/api/v1/projects`
- **API Keys:** `/api/v1/api-keys`
- **Query Generation:** `/api/v1/query-generation`
- **Chatbot:** `/api/v1/chatbot`
- **Analytics:** `/api/v1/analytics`

---

## 🔐 Security

- JWT-based authentication
- API key authentication with rate limiting
- Helmet.js for HTTP security headers
- CORS configuration
- Input validation with class-validator
- SQL injection prevention with Prisma ORM

---

## 📈 Monitoring

### Prometheus + Grafana

Start monitoring stack:

```bash
docker-compose --profile monitoring up -d
```

Access:
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3030 (admin/admin_password)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is proprietary and confidential. Unauthorized copying or distribution is prohibited.

---

## 👤 Development

**Developer:** Harish Kumar S  
**Project Start:** November 2, 2025  
**Target Completion:** December 15, 2025

---

## 🆘 Support

For issues or questions:
- Create an issue in the repository
- Contact the platform team
- Check the documentation at `/docs`

---

**Built with ❤️ for enterprise-grade AI integration**
