#!/bin/bash

# AI Service Platform - Quick Start Script
# This script helps you get the platform running quickly

set -e

echo "🚀 AI Service Platform - Quick Start"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Docker
echo -e "${YELLOW}Step 1: Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker Desktop"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Start databases
echo -e "${YELLOW}Step 2: Starting databases...${NC}"
docker-compose up -d postgres mongodb redis weaviate

echo "Waiting for databases to be healthy (this may take 30-60 seconds)..."
sleep 10

# Check if databases are healthy
MAX_ATTEMPTS=12
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    HEALTHY=$(docker-compose ps | grep -c "healthy" || echo "0")
    if [ "$HEALTHY" -ge "4" ]; then
        echo -e "${GREEN}✅ All databases are healthy${NC}"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo "Waiting... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 5
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}⚠️  Timeout waiting for databases${NC}"
    echo "Check status with: docker-compose ps"
fi

echo ""

# Setup backend
echo -e "${YELLOW}Step 3: Setting up backend...${NC}"
cd packages/backend

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
fi

# Run migrations
echo "Running database migrations..."
npx prisma migrate dev --name init

# Seed database
echo "Seeding database with admin user..."
pnpm run seed

echo -e "${GREEN}✅ Backend setup complete${NC}"
echo ""

# Start backend
echo -e "${YELLOW}Step 4: Starting backend server...${NC}"
echo "Backend will start on http://localhost:3001"
echo "Swagger docs will be available at http://localhost:3001/api/docs"
echo ""
echo "To start the backend, run: pnpm run start:dev"
echo "To start the frontend, run in another terminal:"
echo "  cd packages/frontend"
echo "  pnpm run dev"
echo ""

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo "Next steps:"
echo "1. Start backend:  cd packages/backend && pnpm run start:dev"
echo "2. Start frontend: cd packages/frontend && pnpm run dev"
echo "3. Login with:     admin@example.com / Admin@123456"
echo ""
echo "Services:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001"
echo "  Swagger:   http://localhost:3001/api/docs"
echo ""
