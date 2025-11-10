# 🚀 Quick Start: Linux Server Deployment

**Use this guide for rapid deployment on your company Linux server.**

---

## ⚡ 3-Step Deployment

### Step 1️⃣: Check Your Server (5 minutes)

```bash
# SSH into your Linux server
ssh user@your-server-ip

# Download and run spec checker
wget https://raw.githubusercontent.com/your-repo/scripts/check-server-specs.sh
chmod +x check-server-specs.sh
./check-server-specs.sh

# ✅ Review the output - it will tell you EXACTLY what to do next
```

**The script will recommend:**
- Which AI backend to use (Ollama CPU vs vLLM GPU)
- Which model size fits your hardware
- Expected performance metrics

### Step 2️⃣: Install & Configure (15 minutes)

```bash
# Install Docker (if needed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Clone project
cd /opt
sudo mkdir ai-service-platform && sudo chown $USER:$USER ai-service-platform
cd ai-service-platform
git clone <your-repo-url> .

# Generate secure passwords
openssl rand -base64 32  # Save this for JWT_SECRET
openssl rand -base64 32  # Save this for JWT_REFRESH_SECRET
openssl rand -base64 24  # Save this for POSTGRES_PASSWORD
openssl rand -base64 24  # Save this for MONGO_ROOT_PASSWORD
openssl rand -base64 24  # Save this for REDIS_PASSWORD

# Configure environment files
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.local.example packages/frontend/.env.local

# Edit .env files with your passwords and server IP
vim .env  # Update passwords, change NODE_ENV=production
vim packages/backend/.env  # Update based on spec check recommendation
vim packages/frontend/.env.local  # Update API URLs with server IP
```

### Step 3️⃣: Deploy & Verify (10 minutes)

**Choose ONE based on your server specs:**

#### Option A: CPU-Only Server (No GPU or GPU < 8GB)

```bash
# Start Ollama
docker run -d --name ollama -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  --restart unless-stopped ollama/ollama:latest

# Pull model (wait 2-5 min)
docker exec ollama ollama pull qwen2.5-coder:3b

# Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec backend npx prisma generate
docker-compose exec backend npx prisma migrate deploy
```

#### Option B: GPU Server (8GB+ VRAM)

```bash
# Install NVIDIA Docker (one-time setup)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt update && sudo apt install -y nvidia-container-toolkit
sudo systemctl restart docker

# Test GPU
nvidia-smi
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi

# Start vLLM (takes 2-5 min to load model)
docker-compose -f docker-compose.vllm.yml up -d

# Wait and monitor
docker logs -f vllm-qwen-coder-7b
# Wait for: "Uvicorn running on..."

# Start main services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec backend npx prisma generate
docker-compose exec backend npx prisma migrate deploy
```

#### Verify Deployment

```bash
# Check all services running
docker-compose ps

# Test backend
curl http://localhost:3001/api/v1/health

# Test frontend
curl http://localhost:3000

# Test AI (Ollama)
curl http://localhost:11434/api/tags

# Test AI (vLLM)
curl http://localhost:8001/v1/models

# Open in browser
echo "Open: http://YOUR_SERVER_IP:3000"
```

---

## 📊 Configuration Quick Reference

### Based on Your Hardware:

| Your GPU | Model to Use | Config Setting | Expected Performance |
|----------|-------------|----------------|---------------------|
| **None (CPU only)** | qwen2.5-coder:3b | `USE_OLLAMA=true`<br>`OLLAMA_MODEL=qwen2.5-coder:3b` | 15-25s response<br>5-10 users |
| **8-12GB VRAM** | Qwen2.5-Coder-7B (INT8) | `USE_OLLAMA=false`<br>`VLLM_BASE_URL=http://vllm-qwen-coder-7b:8001/v1`<br>Add: `--quantization int8` | 2-5s response<br>10-20 users |
| **16-24GB VRAM** | Qwen2.5-Coder-7B (FP16) | `USE_OLLAMA=false`<br>`VLLM_BASE_URL=http://vllm-qwen-coder-7b:8001/v1` | 1-3s response<br>30-50 users |
| **24GB+ VRAM** | Qwen2.5-14B or multiple 7B | Multiple vLLM instances | <1s response<br>100+ users |

### Essential .env Settings:

```bash
# Root .env
NODE_ENV=production
POSTGRES_PASSWORD=<your-secure-password>
MONGO_ROOT_PASSWORD=<your-secure-password>
REDIS_PASSWORD=<your-secure-password>
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>

# packages/backend/.env
DATABASE_URL="postgresql://ai_service_prod:<PASSWORD>@postgres:5432/ai_service_production"

# For CPU (Ollama):
USE_OLLAMA=true
OLLAMA_MODEL=qwen2.5-coder:3b

# For GPU (vLLM):
USE_OLLAMA=false
VLLM_BASE_URL=http://vllm-qwen-coder-7b:8001/v1

# packages/frontend/.env.local
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://YOUR_SERVER_IP:3001
```

---

## 🆘 Common Issues & Quick Fixes

### Issue: Backend restart loop (Prisma error)

```bash
docker-compose exec backend npx prisma generate
docker-compose restart backend
```

### Issue: AI not responding

```bash
# Check AI service
docker logs ollama  # or vllm-qwen-coder-7b

# Restart
docker-compose restart ollama  # or restart vllm service
```

### Issue: Frontend can't connect to backend

```bash
# Check CORS in packages/backend/.env
CORS_ORIGIN=http://YOUR_SERVER_IP:3000

# Restart backend
docker-compose restart backend
```

### Issue: Out of memory (vLLM)

```bash
# Edit docker-compose.vllm.yml, add to command:
--gpu-memory-utilization 0.75
--quantization int8

# Restart
docker-compose -f docker-compose.vllm.yml restart
```

---

## 📚 Full Documentation

For detailed information, see:

1. **Complete Deployment Guide:** [docs/LINUX-SERVER-DEPLOYMENT.md](docs/LINUX-SERVER-DEPLOYMENT.md)
   - All installation steps
   - Hardware requirements
   - Model selection guide
   - Production configuration
   - Security hardening
   - Backup setup
   - Monitoring configuration

2. **Deployment Checklist:** [docs/DEPLOYMENT-CHECKLIST.md](docs/DEPLOYMENT-CHECKLIST.md)
   - Step-by-step checklist
   - Verification procedures
   - Sign-off template
   - Troubleshooting reference

3. **AI Quality Guide:** [docs/AI-QUALITY-IMPROVEMENTS.md](docs/AI-QUALITY-IMPROVEMENTS.md)
   - Prompt engineering
   - Model optimization
   - Performance tuning

---

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ All containers show "Up" or "healthy": `docker-compose ps`
- ✅ Health endpoint returns OK: `curl http://localhost:3001/api/v1/health`
- ✅ Frontend loads in browser: `http://YOUR_SERVER_IP:3000`
- ✅ Can register, login, create project
- ✅ Can upload schema
- ✅ AI chat responds to messages
- ✅ No errors in logs: `docker-compose logs backend | grep ERROR`

**Typical deployment time:** 30-45 minutes including model download

---

## 📞 Need Help?

1. **Check logs:**
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   docker logs ollama  # or vllm-qwen-coder-7b
   ```

2. **Run verification script:**
   ```bash
   chmod +x scripts/verify-deployment.sh
   ./scripts/verify-deployment.sh
   ```

3. **Review full documentation:**
   - [LINUX-SERVER-DEPLOYMENT.md](docs/LINUX-SERVER-DEPLOYMENT.md)
   - [DEPLOYMENT-CHECKLIST.md](docs/DEPLOYMENT-CHECKLIST.md)

4. **Contact your DevOps/Backend team**

---

## 🔄 Update Procedure (Future)

```bash
cd /opt/ai-service-platform
git pull origin main
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose exec backend npx prisma migrate deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

**Last Updated:** November 10, 2025  
**Version:** 2.0.0  
**Status:** Production Ready ✅
