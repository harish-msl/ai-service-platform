# Linux Server Deployment Guide - AI Service Platform

**Target:** Production deployment on company Linux server  
**Date:** November 10, 2025  
**Stack:** Docker + vLLM (GPU) or Ollama (CPU fallback)

---

## 📋 Table of Contents

1. [Pre-Deployment: Server Specification Check](#1-pre-deployment-server-specification-check)
2. [Installation Steps](#2-installation-steps)
3. [vLLM vs Ollama Configuration](#3-vllm-vs-ollama-configuration)
4. [Model Selection Based on Hardware](#4-model-selection-based-on-hardware)
5. [Production Configuration](#5-production-configuration)
6. [Deployment Commands](#6-deployment-commands)
7. [Post-Deployment Verification](#7-post-deployment-verification)
8. [Monitoring & Maintenance](#8-monitoring--maintenance)

---

## 1. Pre-Deployment: Server Specification Check

### Step 1.1: Check Server Hardware Specifications

Run these commands on your Linux server to gather complete hardware info:

```bash
# === COMPLETE SERVER SPECIFICATION SCRIPT ===
# Save as: check-server-specs.sh

#!/bin/bash

echo "========================================="
echo "AI Service Platform - Server Specifications"
echo "========================================="
echo ""

# 1. Operating System
echo "=== OPERATING SYSTEM ==="
cat /etc/os-release | grep -E "PRETTY_NAME|VERSION"
uname -r
echo ""

# 2. CPU Information
echo "=== CPU DETAILS ==="
echo "Model: $(lscpu | grep 'Model name' | cut -d':' -f2 | xargs)"
echo "Architecture: $(lscpu | grep 'Architecture' | cut -d':' -f2 | xargs)"
echo "CPU(s): $(lscpu | grep '^CPU(s):' | cut -d':' -f2 | xargs)"
echo "Cores per socket: $(lscpu | grep 'Core(s) per socket' | cut -d':' -f2 | xargs)"
echo "Threads per core: $(lscpu | grep 'Thread(s) per core' | cut -d':' -f2 | xargs)"
echo "CPU MHz: $(lscpu | grep 'CPU MHz' | cut -d':' -f2 | xargs)"
echo "CPU max MHz: $(lscpu | grep 'CPU max MHz' | cut -d':' -f2 | xargs)"
echo ""

# 3. RAM Information
echo "=== MEMORY DETAILS ==="
free -h
echo ""
echo "Total RAM: $(free -h | awk '/^Mem:/{print $2}')"
echo "Available RAM: $(free -h | awk '/^Mem:/{print $7}')"
echo ""

# 4. GPU Information (CRITICAL for AI workloads)
echo "=== GPU DETAILS ==="
if command -v nvidia-smi &> /dev/null; then
    echo "NVIDIA GPU DETECTED:"
    nvidia-smi --query-gpu=name,memory.total,driver_version,cuda_version --format=csv,noheader
    echo ""
    nvidia-smi
else
    echo "No NVIDIA GPU detected (nvidia-smi not found)"
    echo "Checking for other GPUs..."
    lspci | grep -i vga
    lspci | grep -i '3d'
fi
echo ""

# 5. Storage Information
echo "=== STORAGE DETAILS ==="
df -h | grep -E "Filesystem|/dev/"
echo ""
echo "Total Disk Space:"
df -h --total | grep 'total'
echo ""

# 6. Docker Information
echo "=== DOCKER STATUS ==="
if command -v docker &> /dev/null; then
    echo "Docker version: $(docker --version)"
    echo "Docker Compose version: $(docker-compose --version 2>/dev/null || docker compose version 2>/dev/null || echo 'Not installed')"
    echo "Docker status: $(systemctl is-active docker 2>/dev/null || echo 'Unknown')"
else
    echo "Docker NOT installed"
fi
echo ""

# 7. Network Information
echo "=== NETWORK DETAILS ==="
echo "Hostname: $(hostname)"
echo "Internal IP: $(hostname -I | awk '{print $1}')"
echo "External IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unable to fetch')"
echo ""

# 8. Available Ports Check
echo "=== PORT AVAILABILITY ==="
echo "Checking required ports..."
for port in 3000 3001 5432 27017 6379 8080 11434 8000 8001 8002 8003; do
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo "Port $port: IN USE ⚠"
    else
        echo "Port $port: Available ✓"
    fi
done
echo ""

# 9. System Resources Summary
echo "=== RESOURCE SUMMARY ==="
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo "Running Processes: $(ps aux | wc -l)"
echo "Logged in Users: $(who | wc -l)"
echo ""

echo "========================================="
echo "Specification Check Complete!"
echo "========================================="
echo ""
echo "SHARE THIS OUTPUT with your deployment team"
echo "Save to file: ./check-server-specs.sh > server-specs.txt"
```

**Run on server:**

```bash
# Make executable
chmod +x check-server-specs.sh

# Run and save output
./check-server-specs.sh | tee server-specs.txt

# Share server-specs.txt with your team
cat server-specs.txt
```

### Step 1.2: Minimum Requirements

| Component | Minimum (Ollama CPU) | Recommended (vLLM GPU) | Enterprise (High Load) |
|-----------|---------------------|------------------------|------------------------|
| **CPU** | 8 cores (3+ GHz) | 16 cores (3.5+ GHz) | 32+ cores |
| **RAM** | 16 GB | 32 GB | 64+ GB |
| **GPU** | None (CPU only) | NVIDIA GPU 16GB VRAM | NVIDIA GPU 24-48GB VRAM |
| **Storage** | 100 GB SSD | 250 GB SSD | 500+ GB NVMe SSD |
| **Network** | 100 Mbps | 1 Gbps | 10 Gbps |
| **OS** | Ubuntu 20.04+ | Ubuntu 22.04+ | Ubuntu 22.04 LTS |

### Step 1.3: GPU Requirements for vLLM

| Model Size | Min VRAM | Recommended VRAM | GPU Examples |
|------------|----------|------------------|--------------|
| 1.5B params | 4 GB | 8 GB | GTX 1070, RTX 3060 |
| 3B params | 8 GB | 12 GB | RTX 3060 Ti, RTX 4060 |
| 7B params | 16 GB | 24 GB | RTX 3090, RTX 4090, A5000 |
| 14B params | 24 GB | 32 GB | A6000, A100 40GB |
| 32B+ params | 40 GB | 80 GB | A100 80GB, H100 |

---

## 2. Installation Steps

### Step 2.1: Prepare Linux Server

```bash
# === STEP 1: Update System ===
sudo apt update && sudo apt upgrade -y

# === STEP 2: Install Essential Tools ===
sudo apt install -y \
    git \
    curl \
    wget \
    vim \
    htop \
    net-tools \
    build-essential \
    software-properties-common

# === STEP 3: Install Docker ===
# Remove old versions
sudo apt remove -y docker docker-engine docker.io containerd runc

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (no sudo needed)
sudo usermod -aG docker $USER

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify Docker
docker --version
docker run hello-world

# === STEP 4: Install Docker Compose ===
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version

# === STEP 5: Install NVIDIA Docker (If you have GPU) ===
# Skip this if no GPU or using CPU-only setup

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt update
sudo apt install -y nvidia-container-toolkit

# Restart Docker
sudo systemctl restart docker

# Test GPU in Docker
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi

# === STEP 6: Install Node.js (for local development only) ===
# Install Node.js 22.x LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v22.x.x
npm --version

# Install pnpm
npm install -g pnpm
pnpm --version
```

### Step 2.2: Clone and Setup Project

```bash
# === STEP 1: Clone Repository ===
cd /opt  # Or your preferred directory
sudo mkdir -p ai-service-platform
sudo chown $USER:$USER ai-service-platform
cd ai-service-platform

# Clone from your repository
git clone https://github.com/your-company/ai-service-platform.git .
# OR if using GitLab/Bitbucket
# git clone <your-repo-url> .

# === STEP 2: Create Environment Files ===
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.local.example packages/frontend/.env.local

# === STEP 3: Configure Environment Variables ===
# Edit files based on your server specs (see section 3 & 5)
vim .env
vim packages/backend/.env
vim packages/frontend/.env.local
```

---

## 3. vLLM vs Ollama Configuration

### Decision Matrix

| Criteria | Use Ollama | Use vLLM |
|----------|-----------|----------|
| **GPU Available** | ❌ No GPU | ✅ NVIDIA GPU (8GB+ VRAM) |
| **Model Size** | ≤ 3B params | 7B+ params |
| **Concurrent Users** | < 10 | 10+ |
| **Response Time** | 15-30s acceptable | Need < 5s |
| **Setup Complexity** | Simple (1 command) | Moderate (GPU drivers) |
| **Production Grade** | Development/Small | Enterprise/Scale |
| **Cost** | Lower (CPU) | Higher (GPU server) |

### Configuration A: Ollama (CPU-Only or Small GPU)

**When to use:**
- No dedicated GPU or GPU < 8GB VRAM
- Small team (< 10 concurrent users)
- Development/staging environment
- Budget constraints

**Setup:**

```bash
# Install Ollama in Docker
docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  --restart unless-stopped \
  ollama/ollama:latest

# Pull recommended model (3B for CPU)
docker exec ollama ollama pull qwen2.5-coder:3b

# Verify
docker exec ollama ollama list
curl http://localhost:11434/api/tags
```

**Backend .env configuration:**

```bash
# packages/backend/.env

# AI Model Configuration
USE_OLLAMA=true
USE_DIRECT_OLLAMA=true
OLLAMA_BASE_URL=http://ollama:11434/v1
OLLAMA_MODEL=qwen2.5-coder:3b

# Disable vLLM
VLLM_BASE_URL=
VLLM_QWEN_CODER_URL=
VLLM_DEEPSEEK_R1_URL=
VLLM_QWEN_7B_URL=

# Performance
ENABLE_RAG=false  # Disable for speed
```

### Configuration B: vLLM (GPU-Accelerated)

**When to use:**
- NVIDIA GPU with 16GB+ VRAM
- Production environment with 10+ users
- Need sub-5 second response times
- Enterprise-grade performance

**Setup:**

```bash
# === STEP 1: Verify GPU ===
nvidia-smi

# === STEP 2: Create vLLM Docker Compose ===
# File: docker-compose.vllm.yml (already exists in your project)

# === STEP 3: Pull models (do this BEFORE starting vLLM) ===
# Option A: Use Hugging Face directly (vLLM will download)
# No pre-download needed, vLLM downloads on first start

# Option B: Pre-download models (faster startup)
docker run --rm -it \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  python:3.11-slim bash -c "
  pip install huggingface_hub &&
  python -c \"
from huggingface_hub import snapshot_download
snapshot_download('Qwen/Qwen2.5-Coder-7B-Instruct')
snapshot_download('Qwen/Qwen2.5-7B-Instruct')
  \"
"

# === STEP 4: Start vLLM Services ===
docker-compose -f docker-compose.vllm.yml up -d

# === STEP 5: Monitor startup (takes 2-5 minutes first time) ===
docker logs -f vllm-qwen-coder-7b

# Wait for: "Uvicorn running on http://0.0.0.0:8001"

# === STEP 6: Test vLLM ===
curl http://localhost:8001/v1/models
```

**Backend .env configuration:**

```bash
# packages/backend/.env

# AI Model Configuration
USE_OLLAMA=false
USE_DIRECT_OLLAMA=false

# vLLM Endpoints
VLLM_BASE_URL=http://vllm-qwen-coder-7b:8001/v1
VLLM_QWEN_CODER_URL=http://vllm-qwen-coder-7b:8001/v1
VLLM_QWEN_7B_URL=http://vllm-qwen-7b:8003/v1

# Performance
ENABLE_RAG=true  # Can enable with GPU
```

### Configuration C: Hybrid (Ollama + vLLM)

**When to use:**
- GPU available but limited VRAM (8-12GB)
- Want fallback for high load
- Testing before full vLLM migration

**Setup:**

```bash
# Run BOTH Ollama and vLLM
docker-compose -f docker-compose.yml -f docker-compose.vllm.yml up -d

# Configure backend to prefer vLLM, fallback to Ollama
```

**Backend .env:**

```bash
USE_OLLAMA=true
OLLAMA_MODEL=qwen2.5-coder:3b  # Fallback

USE_VLLM_PRIMARY=true
VLLM_BASE_URL=http://vllm-qwen-coder-7b:8001/v1
```

---

## 4. Model Selection Based on Hardware

### Scenario 1: CPU Only (No GPU)

**Server Specs:**
- CPU: 16+ cores
- RAM: 32 GB
- GPU: None

**Recommended Configuration:**

```bash
# Use Ollama with 3B model
OLLAMA_MODEL=qwen2.5-coder:3b

# Expected Performance:
# - Response time: 15-25 seconds
# - Concurrent users: 5-10
# - Quality: 8/10
```

**Alternative models if 3B is slow:**

```bash
# Faster but lower quality
OLLAMA_MODEL=qwen2.5:1.5b  # 8-12s response, 7/10 quality

# Best quality (slower)
OLLAMA_MODEL=qwen2.5-coder:7b  # 60-90s response, 9/10 quality
```

### Scenario 2: GPU 8-12 GB VRAM (RTX 3060, RTX 4060)

**Server Specs:**
- GPU: NVIDIA RTX 3060 (12GB)
- RAM: 32 GB
- CPU: 12+ cores

**Recommended Configuration:**

```bash
# vLLM with 7B model (INT8 quantization)
VLLM_QWEN_CODER_URL=http://vllm-qwen-coder-7b:8001/v1

# vLLM startup options (in docker-compose.vllm.yml)
--quantization int8  # Reduces VRAM usage by 50%
--max-model-len 4096  # Shorter context for less memory

# Expected Performance:
# - Response time: 2-5 seconds
# - Concurrent users: 10-20
# - Quality: 9/10
```

### Scenario 3: GPU 16-24 GB VRAM (RTX 3090, RTX 4090, A5000)

**Server Specs:**
- GPU: NVIDIA RTX 3090 (24GB)
- RAM: 64 GB
- CPU: 16+ cores

**Recommended Configuration:**

```bash
# vLLM with 7B model (FP16 - full precision)
VLLM_QWEN_CODER_URL=http://vllm-qwen-coder-7b:8001/v1

# Can run MULTIPLE models simultaneously
VLLM_QWEN_7B_URL=http://vllm-qwen-7b:8003/v1

# vLLM startup options
--dtype float16
--max-model-len 8192  # Longer context
--gpu-memory-utilization 0.85

# Expected Performance:
# - Response time: 1-3 seconds
# - Concurrent users: 30-50
# - Quality: 9.5/10
```

### Scenario 4: Enterprise GPU (A100, H100)

**Server Specs:**
- GPU: NVIDIA A100 (40GB or 80GB)
- RAM: 128+ GB
- CPU: 32+ cores

**Recommended Configuration:**

```bash
# Can run 14B or even 32B models
VLLM_MODEL=Qwen/Qwen2.5-14B-Instruct

# Multiple model instances for load balancing
# vLLM startup options
--tensor-parallel-size 2  # Use 2 GPUs if available
--dtype float16
--max-model-len 16384

# Expected Performance:
# - Response time: 0.5-2 seconds
# - Concurrent users: 100+
# - Quality: 10/10
```

---

## 5. Production Configuration

### Step 5.1: Update .env Files

**Root .env:**

```bash
# .env

# === ENVIRONMENT ===
NODE_ENV=production
PROJECT_NAME=ai-service-platform

# === DATABASE PASSWORDS (CHANGE THESE!) ===
POSTGRES_USER=ai_service_prod
POSTGRES_PASSWORD=CHANGE_THIS_SECURE_PASSWORD_123456
POSTGRES_DB=ai_service_production
POSTGRES_PORT=5432

MONGO_ROOT_USER=admin_prod
MONGO_ROOT_PASSWORD=CHANGE_THIS_MONGO_PASSWORD_123456
MONGO_DB=ai_service_logs_prod
MONGO_PORT=27017

REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD_123456
REDIS_PORT=6379

# === SECURITY ===
JWT_SECRET=CHANGE_THIS_TO_64_CHARACTER_RANDOM_STRING_FOR_PRODUCTION_USE
JWT_REFRESH_SECRET=CHANGE_THIS_TO_ANOTHER_64_CHARACTER_RANDOM_STRING
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# === AI MODEL (Choose based on your hardware - see section 4) ===
# Option A: Ollama (CPU or small GPU)
VLLM_BASE_URL=http://ollama:11434/v1

# Option B: vLLM (GPU)
# VLLM_BASE_URL=http://vllm-qwen-coder-7b:8001/v1

# === FRONTEND ===
FRONTEND_PORT=3000
BACKEND_PORT=3001

# === MONITORING (Optional) ===
GRAFANA_USER=admin
GRAFANA_PASSWORD=CHANGE_THIS_GRAFANA_PASSWORD
```

**Backend .env:**

```bash
# packages/backend/.env

NODE_ENV=production
PORT=3001
API_PREFIX=api/v1

# === DATABASE (Use Docker service names for internal communication) ===
DATABASE_URL="postgresql://ai_service_prod:CHANGE_THIS_SECURE_PASSWORD_123456@postgres:5432/ai_service_production?schema=public"
MONGODB_URI="mongodb://admin_prod:CHANGE_THIS_MONGO_PASSWORD_123456@mongodb:27017/ai_service_logs_prod?authSource=admin"

# === REDIS ===
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD_123456

# === WEAVIATE ===
WEAVIATE_URL=http://weaviate:8080
WEAVIATE_API_KEY=

# === JWT (Must match root .env) ===
JWT_SECRET=CHANGE_THIS_TO_64_CHARACTER_RANDOM_STRING_FOR_PRODUCTION_USE
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=CHANGE_THIS_TO_ANOTHER_64_CHARACTER_RANDOM_STRING
JWT_REFRESH_EXPIRATION=30d

# === AI MODEL CONFIGURATION ===
# CHOOSE ONE BASED ON YOUR HARDWARE:

# Option A: Ollama (CPU or small GPU)
USE_OLLAMA=true
USE_DIRECT_OLLAMA=true
OLLAMA_BASE_URL=http://ollama:11434/v1
OLLAMA_MODEL=qwen2.5-coder:3b
ENABLE_RAG=false

# Option B: vLLM (GPU 16GB+)
# USE_OLLAMA=false
# USE_DIRECT_OLLAMA=false
# VLLM_BASE_URL=http://vllm-qwen-coder-7b:8001/v1
# VLLM_QWEN_CODER_URL=http://vllm-qwen-coder-7b:8001/v1
# VLLM_QWEN_7B_URL=http://vllm-qwen-7b:8003/v1
# ENABLE_RAG=true

# === RATE LIMITING ===
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# === CORS (Update with your domain) ===
CORS_ORIGIN=https://ai-service.yourcompany.com

# === LOGGING ===
LOG_LEVEL=info  # Use 'info' in production, 'debug' for troubleshooting
```

**Frontend .env.local:**

```bash
# packages/frontend/.env.local

# === API URLs (Update with your server domain) ===
NEXT_PUBLIC_API_URL=https://api.ai-service.yourcompany.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.ai-service.yourcompany.com

# OR for internal deployment:
# NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3001/api/v1
# NEXT_PUBLIC_WS_URL=ws://YOUR_SERVER_IP:3001

NEXT_PUBLIC_APP_NAME=AI Service Platform
NEXT_TELEMETRY_DISABLED=1
```

### Step 5.2: Generate Secure Passwords

```bash
# Generate random passwords
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
openssl rand -base64 24  # For DATABASE passwords

# Or use this script
cat > generate-secrets.sh << 'EOF'
#!/bin/bash
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "MONGO_ROOT_PASSWORD=$(openssl rand -base64 24)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24)"
echo "GRAFANA_PASSWORD=$(openssl rand -base64 16)"
EOF

chmod +x generate-secrets.sh
./generate-secrets.sh
```

---

## 6. Deployment Commands

### Step 6.1: Build and Start Services

```bash
# === OPTION A: CPU-Only Deployment (Ollama) ===

# 1. Start Ollama first
docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  --restart unless-stopped \
  ollama/ollama:latest

# 2. Pull model
docker exec ollama ollama pull qwen2.5-coder:3b

# 3. Start main services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 4. Check status
docker-compose ps

# === OPTION B: GPU Deployment (vLLM) ===

# 1. Verify GPU
nvidia-smi

# 2. Start vLLM services
docker-compose -f docker-compose.vllm.yml up -d

# 3. Wait for vLLM to load (check logs)
docker logs -f vllm-qwen-coder-7b
# Wait for: "Uvicorn running on..."

# 4. Start main services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# === OPTION C: Full Production (with monitoring) ===

docker-compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --profile monitoring \
  up -d
```

### Step 6.2: Database Initialization

```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Seed initial data (optional)
docker-compose exec backend pnpm run seed

# Check database
docker-compose exec postgres psql -U ai_service_prod -d ai_service_production -c "\dt"
```

### Step 6.3: Verify Deployment

```bash
# Check all services are healthy
docker-compose ps

# Should see:
# ✓ postgres (healthy)
# ✓ mongodb (healthy)
# ✓ redis (healthy)
# ✓ weaviate (healthy)
# ✓ backend (running)
# ✓ frontend (running)
# ✓ ollama or vllm (running)

# Test health endpoints
curl http://localhost:3001/api/v1/health
curl http://localhost:3000

# Test AI endpoint (if using Ollama)
curl http://localhost:11434/api/tags

# Test AI endpoint (if using vLLM)
curl http://localhost:8001/v1/models
```

---

## 7. Post-Deployment Verification

### Automated Test Script

```bash
# Save as: verify-deployment.sh

#!/bin/bash

echo "========================================="
echo "AI Service Platform - Deployment Verification"
echo "========================================="
echo ""

FAIL_COUNT=0

# Test 1: Docker Services
echo "TEST 1: Docker Services Status"
if docker-compose ps | grep -q "Up"; then
    echo "✓ Docker services are running"
else
    echo "✗ Some Docker services are down"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 2: Database Connection
echo "TEST 2: PostgreSQL Connection"
if docker-compose exec -T postgres pg_isready -U ai_service_prod &>/dev/null; then
    echo "✓ PostgreSQL is ready"
else
    echo "✗ PostgreSQL connection failed"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 3: Backend Health
echo "TEST 3: Backend API Health"
HEALTH=$(curl -s http://localhost:3001/api/v1/health)
if echo "$HEALTH" | grep -q "ok\|healthy"; then
    echo "✓ Backend API is healthy"
else
    echo "✗ Backend API health check failed"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 4: Frontend Access
echo "TEST 4: Frontend Accessibility"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "✓ Frontend is accessible"
else
    echo "✗ Frontend is not accessible"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 5: AI Model Service
echo "TEST 5: AI Model Service"
if curl -s http://localhost:11434/api/tags &>/dev/null; then
    echo "✓ Ollama is running"
elif curl -s http://localhost:8001/v1/models &>/dev/null; then
    echo "✓ vLLM is running"
else
    echo "✗ No AI model service detected"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Summary
echo "========================================="
if [ $FAIL_COUNT -eq 0 ]; then
    echo "✓ ALL TESTS PASSED - Deployment Successful!"
else
    echo "✗ $FAIL_COUNT TESTS FAILED - Check logs"
fi
echo "========================================="

exit $FAIL_COUNT
```

### Manual Verification Checklist

- [ ] All Docker containers running: `docker-compose ps`
- [ ] Backend health check: `curl http://localhost:3001/api/v1/health`
- [ ] Frontend loads: Open `http://YOUR_SERVER_IP:3000` in browser
- [ ] Can create account and login
- [ ] Can create project
- [ ] Can upload schema
- [ ] AI chat responds (test with simple query)
- [ ] Database persists data (restart containers, data remains)
- [ ] Logs are being written: `docker-compose logs backend`
- [ ] Resource usage acceptable: `docker stats`

---

## 8. Monitoring & Maintenance

### Step 8.1: Setup Monitoring

```bash
# Start with monitoring profile
docker-compose -f docker-compose.yml --profile monitoring up -d

# Access dashboards:
# Prometheus: http://YOUR_SERVER_IP:9090
# Grafana: http://YOUR_SERVER_IP:3030
```

### Step 8.2: Resource Monitoring

```bash
# Monitor resource usage in real-time
docker stats

# Check GPU usage (if using vLLM)
nvidia-smi -l 1  # Update every second

# Check disk usage
df -h

# Check logs
docker-compose logs -f backend
docker-compose logs -f vllm-qwen-coder-7b
```

### Step 8.3: Backup Strategy

```bash
# === Database Backups ===

# PostgreSQL backup
docker-compose exec postgres pg_dump -U ai_service_prod ai_service_production > backup-$(date +%Y%m%d).sql

# MongoDB backup
docker-compose exec mongodb mongodump --out=/backup --authenticationDatabase admin -u admin_prod -p YOUR_PASSWORD

# === Automated Daily Backup Script ===
cat > /opt/ai-service-platform/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/ai-service-backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose exec -T postgres pg_dump -U ai_service_prod ai_service_production > $BACKUP_DIR/postgres_$DATE.sql

# Backup MongoDB
docker-compose exec -T mongodb mongodump --archive=$BACKUP_DIR/mongo_$DATE.archive --authenticationDatabase admin -u admin_prod -p YOUR_PASSWORD

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.archive" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/ai-service-platform/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/ai-service-platform/backup.sh") | crontab -
```

### Step 8.4: Update Strategy

```bash
# === Update Procedure ===

# 1. Pull latest code
cd /opt/ai-service-platform
git pull origin main

# 2. Backup database (see above)

# 3. Rebuild containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# 4. Run migrations
docker-compose exec backend npx prisma migrate deploy

# 5. Restart services (zero-downtime if using load balancer)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 6. Verify
curl http://localhost:3001/api/v1/health
```

---

## 🎯 Quick Decision Guide

### "I have these specs, what should I use?"

**Copy this decision tree to your server specs output:**

```
├─ GPU Available?
│  ├─ YES → GPU VRAM?
│  │  ├─ 24GB+ → vLLM with 7B model (FP16) ⭐ BEST PERFORMANCE
│  │  ├─ 16GB → vLLM with 7B model (INT8 quantization)
│  │  ├─ 12GB → vLLM with 3B model OR Ollama 7B
│  │  └─ 8GB → Ollama with 3B model
│  └─ NO → CPU Cores?
│     ├─ 16+ cores → Ollama with 3B model (15-25s response)
│     ├─ 8-16 cores → Ollama with 1.5B model (8-12s response)
│     └─ < 8 cores → Not recommended for production
```

---

## 📞 Troubleshooting

### Common Issues

**Issue 1: Backend won't start - Prisma error**

```bash
# Solution:
docker-compose exec backend npx prisma generate
docker-compose restart backend
```

**Issue 2: vLLM OOM (Out of Memory)**

```bash
# Solution: Reduce model size or use quantization
# In docker-compose.vllm.yml, add:
--quantization int8
--gpu-memory-utilization 0.75
```

**Issue 3: Slow AI responses**

```bash
# Check:
1. GPU usage: nvidia-smi
2. Model size: Too large for hardware?
3. Concurrent requests: Too many users?
4. Network latency: Check Docker network

# Solutions:
- Use smaller model
- Add more GPUs
- Enable caching
- Use vLLM instead of Ollama
```

**Issue 4: Port already in use**

```bash
# Find what's using the port
sudo netstat -tulpn | grep :3001

# Kill process
sudo kill -9 <PID>

# Or change port in .env
```

---

## 🎓 Summary

1. **Check server specs** using the provided script
2. **Choose configuration** based on GPU availability
3. **Install Docker** and NVIDIA toolkit (if GPU)
4. **Clone project** and configure .env files
5. **Start services** with appropriate docker-compose files
6. **Run migrations** and seed data
7. **Verify deployment** with test script
8. **Setup monitoring** and backups

**Recommended Configurations by Hardware:**

| Your Hardware | Use This | Expected Performance |
|---------------|----------|---------------------|
| No GPU, 16+ CPU cores | Ollama + 3B model | 15-25s, 5-10 users |
| GPU 8-12GB VRAM | vLLM + 7B (INT8) | 2-5s, 10-20 users |
| GPU 16-24GB VRAM | vLLM + 7B (FP16) | 1-3s, 30-50 users |
| GPU 40GB+ VRAM | vLLM + 14B model | <2s, 100+ users |

---

**Next Steps:**
1. Run `check-server-specs.sh` on your Linux server
2. Share the output with your team
3. Choose configuration based on the decision guide
4. Follow deployment steps for your chosen setup

**Need Help?**
- Check logs: `docker-compose logs -f backend`
- Test AI: `curl http://localhost:11434/api/tags` (Ollama) or `curl http://localhost:8001/v1/models` (vLLM)
- Monitor resources: `docker stats` and `nvidia-smi`
