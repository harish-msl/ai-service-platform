#!/bin/bash

# AI Service Platform - Setup Script
# This script initializes the development environment

set -e

echo "🚀 AI Service Platform - Initial Setup"
echo "======================================"
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing..."
    npm install -g pnpm@9.14.2
    echo "✅ pnpm installed successfully"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
pnpm --filter backend prisma generate

# Build packages
echo "🔨 Building packages..."
pnpm build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start Docker services: docker-compose up -d"
echo "2. Run migrations: docker-compose exec backend npx prisma migrate dev"
echo "3. Access services:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:3001"
echo "   - API Docs: http://localhost:3001/api/docs"
