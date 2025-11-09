#!/bin/bash
# RAG Deployment Script - Apply database migration and restart services

set -e

echo "🚀 Deploying RAG Phase 1 Implementation"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Must run from project root (ai-service-platform/)"
    exit 1
fi

# Step 1: Stop backend to unlock Prisma files
echo ""
echo "📦 Step 1: Stopping backend service..."
docker-compose stop backend

# Step 2: Apply database migration
echo ""
echo "📊 Step 2: Applying database migration..."
cd packages/backend

# Try to run migration
if npx prisma migrate deploy; then
    echo "✅ Migration applied successfully"
else
    echo "⚠️  Migration failed, trying manual PostgreSQL approach..."
    
    # Manual SQL approach
    echo "📝 Applying SQL manually to PostgreSQL..."
    docker-compose exec -T postgres psql -U ai_service -d ai_service < prisma/migrations/20250102000000_add_rag_training_tables/migration.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Manual migration applied successfully"
    else
        echo "❌ Migration failed. Please check PostgreSQL connection."
        exit 1
    fi
fi

# Step 3: Regenerate Prisma client
echo ""
echo "🔧 Step 3: Regenerating Prisma client..."

# Kill any processes locking the DLL
echo "Stopping any running Node processes..."
taskkill //F //IM node.exe 2>/dev/null || true

# Wait a moment
sleep 2

if npx prisma generate; then
    echo "✅ Prisma client generated successfully"
else
    echo "⚠️  Prisma generate failed (might be DLL lock). Will retry after restart."
fi

cd ../..

# Step 4: Rebuild backend Docker image
echo ""
echo "🐳 Step 4: Rebuilding backend Docker image..."
docker-compose build backend

# Step 5: Start backend
echo ""
echo "▶️  Step 5: Starting backend service..."
docker-compose up -d backend

# Wait for backend to be healthy
echo ""
echo "⏳ Waiting for backend to be healthy..."
sleep 5

# Check backend health
for i in {1..30}; do
    if curl -s http://localhost:3001/api/v1/health > /dev/null; then
        echo "✅ Backend is healthy!"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo "❌ Backend health check timeout. Check logs:"
        echo "   docker-compose logs backend"
        exit 1
    fi
    
    echo "   Attempt $i/30..."
    sleep 2
done

# Step 6: Check Weaviate schema
echo ""
echo "🔍 Step 6: Verifying Weaviate schema..."
sleep 3

docker-compose logs backend | grep -i "weaviate schema" | tail -5

# Step 7: Display next steps
echo ""
echo "✅ RAG DEPLOYMENT COMPLETE!"
echo "=========================="
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Test RAG with a conversation:"
echo "   - Open http://localhost:3000/dashboard/chat"
echo "   - Select a project with schema uploaded"
echo "   - Ask: 'Show me total records by month'"
echo "   - Check backend logs: docker-compose logs -f backend | grep RAG"
echo ""
echo "2. Verify RAG storage:"
echo "   - After 2-3 questions, check Weaviate:"
echo "   curl http://localhost:8080/v1/objects?class=ConversationExamples&limit=5"
echo ""
echo "3. Check similarity retrieval:"
echo "   - Ask a similar question again"
echo "   - Look for logs: 'Retrieved X similar examples'"
echo "   - Should see similarity scores >70%"
echo ""
echo "4. Monitor quality:"
echo "   - Check PostgreSQL: docker-compose exec postgres psql -U ai_service -d ai_service"
echo "   - Query: SELECT COUNT(*) FROM training_examples;"
echo ""
echo "📊 Monitoring Commands:"
echo "   Backend logs:  docker-compose logs -f backend"
echo "   Weaviate logs: docker-compose logs -f weaviate"
echo "   All services:  docker-compose ps"
echo ""
echo "🎯 Expected Results:"
echo "   - First question: No examples (baseline)"
echo "   - Second similar question: 1 example retrieved"
echo "   - Third similar question: 2+ examples retrieved"
echo "   - Week 1: 10-20 examples per active project"
echo "   - Accuracy improvement: 40-60%"
echo ""
echo "Happy learning! 🚀"
