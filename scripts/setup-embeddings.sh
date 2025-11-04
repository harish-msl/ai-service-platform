#!/bin/bash

# Quick Setup Script for vLLM Embeddings
# This script helps you set up embeddings service for Weaviate indexing

set -e

echo "=========================================="
echo "vLLM Embeddings Quick Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect GPU
echo "Checking for NVIDIA GPU..."
if command -v nvidia-smi &> /dev/null; then
    echo -e "${GREEN}✓${NC} NVIDIA GPU detected"
    HAS_GPU=true
    nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
else
    echo -e "${YELLOW}⚠${NC} No NVIDIA GPU detected"
    HAS_GPU=false
fi
echo ""

# Choose setup type
if [ "$HAS_GPU" = true ]; then
    echo "Choose embeddings setup:"
    echo "1) GPU-accelerated (vLLM) - Recommended, requires NVIDIA GPU"
    echo "2) CPU-only (Hugging Face TEI) - Slower but works everywhere"
    echo ""
    read -p "Enter choice (1 or 2): " CHOICE
else
    echo -e "${YELLOW}No GPU detected. Using CPU-only setup.${NC}"
    CHOICE=2
fi
echo ""

cd "$(dirname "$0")/.."

if [ "$CHOICE" = "1" ]; then
    echo "=========================================="
    echo "Setting up GPU-accelerated embeddings"
    echo "=========================================="
    echo ""
    
    # Check for nvidia-docker
    if ! docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi &> /dev/null; then
        echo -e "${RED}Error: Docker GPU access not working${NC}"
        echo ""
        echo "Please install NVIDIA Container Toolkit:"
        echo "https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html"
        exit 1
    fi
    
    echo -e "${GREEN}✓${NC} Docker GPU access verified"
    echo ""
    
    # Update .env
    echo "Updating .env configuration..."
    if grep -q "^VLLM_BASE_URL=" .env; then
        sed -i 's|^VLLM_BASE_URL=.*|VLLM_BASE_URL=http://localhost:8000/v1|' .env
    else
        echo "VLLM_BASE_URL=http://localhost:8000/v1" >> .env
    fi
    echo -e "${GREEN}✓${NC} Configuration updated"
    echo ""
    
    # Start vLLM embeddings
    echo "Starting vLLM embeddings server..."
    echo -e "${YELLOW}Note: First startup will download ~500MB model${NC}"
    echo ""
    
    docker-compose -f docker-compose.yml -f docker-compose.embeddings.yml --profile with-gpu up -d vllm-embeddings
    
    echo ""
    echo "Waiting for service to be ready..."
    echo -e "${YELLOW}This may take 2-5 minutes on first run...${NC}"
    echo ""
    
    # Wait for health check
    MAX_WAIT=300
    WAITED=0
    while [ $WAITED -lt $MAX_WAIT ]; do
        if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} vLLM embeddings service is ready!"
            break
        fi
        echo -n "."
        sleep 5
        WAITED=$((WAITED + 5))
    done
    echo ""
    
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo -e "${RED}Service did not become ready in time${NC}"
        echo "Check logs: docker-compose logs vllm-embeddings"
        exit 1
    fi
    
    # Test embeddings
    echo ""
    echo "Testing embeddings endpoint..."
    RESPONSE=$(curl -s -X POST http://localhost:8000/v1/embeddings \
      -H "Content-Type: application/json" \
      -d '{"input": "Hello world", "model": "BAAI/bge-small-en-v1.5"}' \
      | jq -r '.data[0].embedding | length')
    
    if [ "$RESPONSE" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} Embeddings working! (dimension: $RESPONSE)"
    else
        echo -e "${RED}✗${NC} Embeddings test failed"
        exit 1
    fi
    
elif [ "$CHOICE" = "2" ]; then
    echo "=========================================="
    echo "Setting up CPU-only embeddings"
    echo "=========================================="
    echo ""
    
    # Update .env
    echo "Updating .env configuration..."
    if grep -q "^VLLM_BASE_URL=" .env; then
        sed -i 's|^VLLM_BASE_URL=.*|VLLM_BASE_URL=http://localhost:8001|' .env
    else
        echo "VLLM_BASE_URL=http://localhost:8001" >> .env
    fi
    echo -e "${GREEN}✓${NC} Configuration updated"
    echo ""
    
    # Start CPU embeddings
    echo "Starting CPU embeddings server..."
    echo -e "${YELLOW}Note: First startup will download ~500MB model${NC}"
    echo ""
    
    docker-compose -f docker-compose.yml -f docker-compose.embeddings.yml --profile cpu-only up -d embeddings-cpu
    
    echo ""
    echo "Waiting for service to be ready..."
    echo -e "${YELLOW}This may take 1-3 minutes on first run...${NC}"
    echo ""
    
    # Wait for health check
    MAX_WAIT=180
    WAITED=0
    while [ $WAITED -lt $MAX_WAIT ]; do
        if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} CPU embeddings service is ready!"
            break
        fi
        echo -n "."
        sleep 5
        WAITED=$((WAITED + 5))
    done
    echo ""
    
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo -e "${RED}Service did not become ready in time${NC}"
        echo "Check logs: docker-compose logs embeddings-cpu"
        exit 1
    fi
    
    # Test embeddings
    echo ""
    echo "Testing embeddings endpoint..."
    RESPONSE=$(curl -s -X POST http://localhost:8001/embed \
      -H "Content-Type: application/json" \
      -d '{"inputs": "Hello world"}' \
      | jq -r 'length')
    
    if [ "$RESPONSE" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} Embeddings working! (got response)"
    else
        echo -e "${RED}✗${NC} Embeddings test failed"
        exit 1
    fi
    
else
    echo -e "${RED}Invalid choice${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Restart your backend:"
echo "   cd packages/backend"
echo "   pnpm run start:dev"
echo ""
echo "2. Test schema import:"
echo "   - Go to http://localhost:3000/dashboard/schema"
echo "   - Import a schema"
echo "   - Check logs for successful indexing"
echo ""
echo "3. Monitor the service:"
echo "   docker-compose logs -f $([ "$CHOICE" = "1" ] && echo "vllm-embeddings" || echo "embeddings-cpu")"
echo ""
echo -e "${GREEN}Embeddings service is now running!${NC}"
echo ""
