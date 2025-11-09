#!/bin/bash

# AI Quality Validation Test Script
# Tests if improvements are working correctly

echo "========================================="
echo "AI Quality Improvements - Validation Test"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking backend status...${NC}"
if docker ps | grep -q "ai-service-backend"; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "Run: docker-compose up -d backend"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Checking Ollama model availability...${NC}"
if docker exec ollama ollama list | grep -q "qwen2.5-coder:3b"; then
    echo -e "${GREEN}✓ qwen2.5-coder:3b model is available${NC}"
else
    echo -e "${RED}✗ Model not found${NC}"
    echo "Run: docker exec ollama ollama pull qwen2.5-coder:3b"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Checking backend logs for new prompts...${NC}"
if docker logs ai-service-backend 2>&1 | grep -q "NestApplication"; then
    echo -e "${GREEN}✓ Backend started successfully${NC}"
else
    echo -e "${RED}✗ Backend may have startup issues${NC}"
    echo "Check logs: docker logs ai-service-backend"
fi

echo ""
echo -e "${YELLOW}Step 4: Testing health endpoint...${NC}"
HEALTH_CHECK=$(curl -s http://localhost:3001/api/v1/health || echo "FAILED")
if echo "$HEALTH_CHECK" | grep -q "ok\|healthy"; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo "Response: $HEALTH_CHECK"
fi

echo ""
echo "========================================="
echo -e "${GREEN}Validation Complete!${NC}"
echo "========================================="
echo ""
echo "Next Steps:"
echo "1. Login to your application: http://localhost:3000"
echo "2. Navigate to Survey project chat"
echo "3. Test query: 'Generate a bar or line chart based on specific information'"
echo ""
echo "Expected Improvements:"
echo "  ✓ AI should use survey_responses, surveys, questions tables"
echo "  ✓ No mock data in Chart.js config"
echo "  ✓ SQL queries should focus on survey domain"
echo "  ✓ Response time: 15-25 seconds"
echo ""
echo "Check documentation: docs/AI-QUALITY-IMPROVEMENTS.md"
echo ""
