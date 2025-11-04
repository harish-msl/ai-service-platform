#!/bin/bash

# Schema Enhancement Testing Script
# This script helps verify the schema import improvements

echo "=================================="
echo "Schema Enhancement Testing"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if services are running
echo "Step 1: Checking Docker services..."
echo ""

POSTGRES_STATUS=$(docker ps --filter "name=ai-service-postgres" --format "{{.Status}}" 2>/dev/null)
REDIS_STATUS=$(docker ps --filter "name=ai-service-redis" --format "{{.Status}}" 2>/dev/null)
MONGODB_STATUS=$(docker ps --filter "name=ai-service-mongodb" --format "{{.Status}}" 2>/dev/null)
WEAVIATE_STATUS=$(docker ps --filter "name=ai-service-weaviate" --format "{{.Status}}" 2>/dev/null)

if [ -n "$POSTGRES_STATUS" ]; then
    echo -e "${GREEN}✓${NC} PostgreSQL: $POSTGRES_STATUS"
else
    echo -e "${RED}✗${NC} PostgreSQL: Not running"
fi

if [ -n "$REDIS_STATUS" ]; then
    echo -e "${GREEN}✓${NC} Redis: $REDIS_STATUS"
else
    echo -e "${RED}✗${NC} Redis: Not running"
fi

if [ -n "$MONGODB_STATUS" ]; then
    echo -e "${GREEN}✓${NC} MongoDB: $MONGODB_STATUS"
else
    echo -e "${RED}✗${NC} MongoDB: Not running"
fi

if [ -n "$WEAVIATE_STATUS" ]; then
    echo -e "${GREEN}✓${NC} Weaviate: $WEAVIATE_STATUS"
else
    echo -e "${YELLOW}⚠${NC} Weaviate: Not running (optional - indexing will be skipped)"
fi

echo ""
echo "=================================="
echo "Step 2: Testing Redis Queue"
echo "=================================="
echo ""

# Check Redis connectivity
if [ -n "$REDIS_STATUS" ]; then
    echo "Checking Redis queue keys..."
    docker exec ai-service-redis redis-cli -a redis_password_123 KEYS "bull:schema-indexing:*" 2>/dev/null | head -5
    echo ""
    echo "Recent queue stats:"
    docker exec ai-service-redis redis-cli -a redis_password_123 INFO stats 2>/dev/null | grep "total_commands_processed"
else
    echo -e "${RED}Cannot test Redis - service not running${NC}"
fi

echo ""
echo "=================================="
echo "Step 3: Manual Testing Instructions"
echo "=================================="
echo ""
echo "To test the schema import improvements:"
echo ""
echo "1. Start Backend (if not running):"
echo "   cd packages/backend"
echo "   pnpm run start:dev"
echo ""
echo "2. Start Frontend (in a new terminal):"
echo "   cd packages/frontend"
echo "   pnpm run dev"
echo ""
echo "3. Open browser and navigate to:"
echo "   http://localhost:3000/dashboard/schema"
echo ""
echo "4. Test the following scenarios:"
echo ""
echo "   ${GREEN}Scenario A: Normal Schema Import${NC}"
echo "   - Select a project"
echo "   - Use 'Database Connection' tab"
echo "   - Fill in database details"
echo "   - Click 'Connect & Import Schema'"
echo ""
echo "   Expected Results:"
echo "   ✓ Quick response (< 2 seconds, no timeout)"
echo "   ✓ Connection Info card appears with host, user (masked), database"
echo "   ✓ Schema preview shows first 5 tables"
echo "   ✓ 'View all (N)' button appears if > 5 tables"
echo "   ✓ Modal opens with full table list when clicked"
echo ""
echo "   Backend logs should show:"
echo "   ✓ 'Schema synced for project {id}'"
echo "   ✓ 'Schema indexing job queued for project {id}'"
echo "   ✓ 'Processing schema indexing job... (Attempt 1/3)'"
echo ""
echo "   ${YELLOW}Scenario B: Weaviate Unavailable${NC}"
echo "   - Stop Weaviate: docker-compose stop weaviate"
echo "   - Import schema again"
echo ""
echo "   Expected Results:"
echo "   ✓ Still get quick success response"
echo "   ✓ Connection info and tables display normally"
echo "   ⚠ Backend logs show indexing attempts with retries"
echo "   ⚠ After 3 attempts, job completes with error (doesn't block)"
echo ""
echo "   ${RED}Scenario C: Test UI Features${NC}"
echo "   - Import schema with 10+ tables"
echo "   - Verify only 5 tables shown initially"
echo "   - Click 'View all' button"
echo "   - Modal should open with all tables"
echo "   - Check connection info card displays correctly"
echo ""
echo "=================================="
echo "Step 4: Monitoring Queue Jobs"
echo "=================================="
echo ""
echo "View queued jobs:"
echo "  docker exec -it ai-service-redis redis-cli -a redis_password_123 LRANGE bull:schema-indexing:wait 0 -1"
echo ""
echo "View active jobs:"
echo "  docker exec -it ai-service-redis redis-cli -a redis_password_123 LRANGE bull:schema-indexing:active 0 -1"
echo ""
echo "View failed jobs:"
echo "  docker exec -it ai-service-redis redis-cli -a redis_password_123 LRANGE bull:schema-indexing:failed 0 -1"
echo ""
echo "View completed jobs (last 10):"
echo "  docker exec -it ai-service-redis redis-cli -a redis_password_123 LRANGE bull:schema-indexing:completed 0 9"
echo ""
echo "=================================="
echo "Test script complete!"
echo "=================================="
