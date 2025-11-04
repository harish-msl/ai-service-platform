#!/bin/bash

# Test Embeddings Integration
# Verifies that all components are working together

set -e

echo "🔍 Testing Embeddings Integration..."
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check CPU embeddings service
echo "1️⃣  Checking CPU embeddings service..."
if docker ps | grep -q ai-service-embeddings-cpu; then
    echo -e "${GREEN}✅ CPU embeddings container running${NC}"
else
    echo -e "${RED}❌ CPU embeddings container not running${NC}"
    exit 1
fi

# 2. Test embeddings API
echo ""
echo "2️⃣  Testing embeddings API..."
RESPONSE=$(curl -s -X POST http://localhost:8001/embed \
    -H "Content-Type: application/json" \
    -d '{"inputs": ["Hello world"]}')

if [ ! -z "$RESPONSE" ]; then
    # Check if response contains array of numbers
    if echo "$RESPONSE" | grep -q "\[.*\["; then
        # Count dimensions by getting first few numbers
        SAMPLE=$(echo "$RESPONSE" | head -c 500)
        echo -e "${GREEN}✅ Embeddings API responding correctly${NC}"
        echo "   Sample: ${SAMPLE:0:100}..."
    else
        echo -e "${RED}❌ Unexpected response format${NC}"
        echo "   Response: $RESPONSE"
        exit 1
    fi
else
    echo -e "${RED}❌ Embeddings API not responding${NC}"
    exit 1
fi

# 3. Check backend configuration
echo ""
echo "3️⃣  Checking backend configuration..."
if [ -f "packages/backend/.env" ]; then
    VLLM_URL=$(grep "^VLLM_BASE_URL=" packages/backend/.env | cut -d '=' -f2)
    if [[ "$VLLM_URL" == *"8001"* ]]; then
        echo -e "${GREEN}✅ Backend configured for CPU embeddings (port 8001)${NC}"
    elif [[ "$VLLM_URL" == *"/v1"* ]]; then
        echo -e "${YELLOW}⚠️  Backend configured for GPU embeddings${NC}"
        echo "   To use CPU embeddings, update VLLM_BASE_URL to: http://localhost:8001"
    else
        echo -e "${YELLOW}⚠️  Unexpected VLLM_BASE_URL: $VLLM_URL${NC}"
    fi
else
    echo -e "${RED}❌ Backend .env file not found${NC}"
    exit 1
fi

# 4. Check Weaviate service
echo ""
echo "4️⃣  Checking Weaviate service..."
if docker ps | grep -q weaviate; then
    WEAVIATE_VERSION=$(curl -s http://localhost:8080/v1/meta | jq -r '.version' 2>/dev/null || echo "unknown")
    if [ "$WEAVIATE_VERSION" != "unknown" ]; then
        echo -e "${GREEN}✅ Weaviate running (version: $WEAVIATE_VERSION)${NC}"
    else
        echo -e "${YELLOW}⚠️  Weaviate container running but API not responding${NC}"
    fi
else
    echo -e "${RED}❌ Weaviate container not running${NC}"
    exit 1
fi

# 5. Check Redis (queue service)
echo ""
echo "5️⃣  Checking Redis service..."
if docker ps | grep -q redis; then
    echo -e "${GREEN}✅ Redis container running${NC}"
else
    echo -e "${RED}❌ Redis container not running${NC}"
    exit 1
fi

# 6. Check PostgreSQL
echo ""
echo "6️⃣  Checking PostgreSQL service..."
if docker ps | grep -q postgres; then
    echo -e "${GREEN}✅ PostgreSQL container running${NC}"
else
    echo -e "${RED}❌ PostgreSQL container not running${NC}"
    exit 1
fi

# Summary
echo ""
echo "===================================="
echo -e "${GREEN}✅ All integration checks passed!${NC}"
echo ""
echo "📋 Next Steps:"
echo "   1. Start backend: cd packages/backend && pnpm run start:dev"
echo "   2. Check logs for: 'Initializing CPU embeddings (Hugging Face TEI)'"
echo "   3. Check logs for: 'Weaviate service initialized successfully'"
echo "   4. Test schema import through UI"
echo "   5. Verify indexing in backend logs"
echo ""
echo "📚 Documentation:"
echo "   - Integration guide: docs/EMBEDDINGS-INTEGRATION-COMPLETE.md"
echo "   - Setup guide: docs/VLLM-EMBEDDINGS-SETUP.md"
echo ""
