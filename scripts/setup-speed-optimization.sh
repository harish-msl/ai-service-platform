#!/bin/bash

echo "🚀 Speed Optimization Setup Script"
echo "===================================="
echo ""

# Step 1: Pull qwen2.5:0.5b model using Docker
echo "📥 Step 1: Pulling qwen2.5:0.5b model via Ollama Docker..."
echo ""

# Check if Ollama container is running
if ! docker ps | grep -q "ai-service-ollama"; then
    echo "⚠️  Ollama container not running. Starting it..."
    docker-compose -f docker-compose.ollama.yml --profile cpu up -d ollama
    sleep 10
fi

# Pull the 0.5b model
echo "Pulling qwen2.5:0.5b model..."
docker exec ai-service-ollama ollama pull qwen2.5:0.5b

if [ $? -eq 0 ]; then
    echo "✅ Model pulled successfully"
else
    echo "❌ Failed to pull model. Is Ollama container running?"
    echo "💡 Try: docker-compose -f docker-compose.ollama.yml --profile cpu up -d"
    exit 1
fi

echo ""

# Step 2: Update .env file
echo "📝 Step 2: Updating .env file..."
cd packages/backend

# Backup existing .env
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up existing .env"
fi

# Update OLLAMA_MODEL if exists, otherwise add it
if grep -q "OLLAMA_MODEL=" .env 2>/dev/null; then
    sed -i 's/OLLAMA_MODEL=.*/OLLAMA_MODEL=qwen2.5:0.5b/' .env
    echo "✅ Updated OLLAMA_MODEL to qwen2.5:0.5b"
else
    echo "OLLAMA_MODEL=qwen2.5:0.5b" >> .env
    echo "✅ Added OLLAMA_MODEL=qwen2.5:0.5b to .env"
fi

# Ensure ENABLE_RAG is set
if ! grep -q "ENABLE_RAG=" .env 2>/dev/null; then
    echo "ENABLE_RAG=true" >> .env
    echo "✅ Added ENABLE_RAG=true to .env"
fi

# Ensure USE_DIRECT_OLLAMA is set
if ! grep -q "USE_DIRECT_OLLAMA=" .env 2>/dev/null; then
    echo "USE_DIRECT_OLLAMA=true" >> .env
    echo "✅ Added USE_DIRECT_OLLAMA=true to .env"
fi

echo ""

# Step 3: Generate Prisma client
echo "🔧 Step 3: Generating Prisma client..."
echo "⚠️  If you see EPERM errors, please:"
echo "   1. Stop the backend server (Ctrl+C)"
echo "   2. Close VSCode/any IDE with files open"
echo "   3. Run this script again"
echo ""
echo "Attempting to generate Prisma client..."

npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated successfully"
else
    echo "❌ Failed to generate Prisma client"
    echo "💡 Try manually:"
    echo "   1. Stop all Node processes"
    echo "   2. cd packages/backend"
    echo "   3. npx prisma generate"
    exit 1
fi

echo ""

# Step 4: Verify setup
echo "🔍 Step 4: Verifying setup..."

# Check if model is loaded
echo "Checking Ollama models in Docker..."
docker exec ai-service-ollama ollama list | grep "qwen2.5:0.5b"

if [ $? -eq 0 ]; then
    echo "✅ Model qwen2.5:0.5b is available"
else
    echo "⚠️  Model qwen2.5:0.5b not found in ollama list"
fi

# Check .env file
echo ""
echo "Current configuration:"
grep "OLLAMA_MODEL" .env 2>/dev/null || echo "⚠️  OLLAMA_MODEL not set"
grep "ENABLE_RAG" .env 2>/dev/null || echo "⚠️  ENABLE_RAG not set"
grep "USE_DIRECT_OLLAMA" .env 2>/dev/null || echo "⚠️  USE_DIRECT_OLLAMA not set"

echo ""
echo "=================================="
echo "✨ Setup Complete!"
echo "=================================="
echo ""
echo "📋 Next Steps:"
echo "   1. Restart your backend:"
echo "      cd packages/backend && pnpm run start:dev"
echo ""
echo "   2. Test the speed:"
echo "      - Simple query should be <0.5s"
echo "      - Complex query should be <2s"
echo ""
echo "   3. Generate project context:"
echo "      POST /api/v1/projects/:projectId/context/generate"
echo ""
echo "📖 Full documentation: docs/SPEED-OPTIMIZATION-COMPLETE.md"
echo ""
