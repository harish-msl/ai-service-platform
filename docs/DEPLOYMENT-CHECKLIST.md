# Linux Server Deployment - Quick Checklist

**Date:** November 10, 2025  
**Project:** AI Service Platform

---

## 📋 Pre-Deployment Checklist

### Phase 1: Server Preparation

- [ ] **Access Linux server via SSH**
  ```bash
  ssh user@your-server-ip
  ```

- [ ] **Run server specification check**
  ```bash
  chmod +x scripts/check-server-specs.sh
  ./scripts/check-server-specs.sh
  ```

- [ ] **Review specification report**
  - Save output: `server-specs-YYYYMMDD_HHMMSS.txt`
  - Check recommended configuration
  - Note GPU availability and VRAM

- [ ] **Verify minimum requirements met**
  - [ ] CPU: 8+ cores (16+ recommended)
  - [ ] RAM: 16GB+ (32GB+ recommended)
  - [ ] Storage: 100GB+ SSD
  - [ ] OS: Ubuntu 20.04+ or similar Linux

### Phase 2: Software Installation

- [ ] **Update system packages**
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

- [ ] **Install Docker**
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  # Log out and back in for group changes
  ```

- [ ] **Install Docker Compose**
  ```bash
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  ```

- [ ] **Install NVIDIA Docker (if GPU available)**
  ```bash
  # Follow instructions in docs/LINUX-SERVER-DEPLOYMENT.md
  # Section 2.1, Step 5
  ```

- [ ] **Verify installations**
  ```bash
  docker --version
  docker-compose --version
  nvidia-smi  # If GPU
  ```

---

## 📁 Phase 3: Project Setup

### Clone Repository

- [ ] **Create project directory**
  ```bash
  sudo mkdir -p /opt/ai-service-platform
  sudo chown $USER:$USER /opt/ai-service-platform
  cd /opt/ai-service-platform
  ```

- [ ] **Clone from repository**
  ```bash
  git clone <your-repo-url> .
  # OR upload files via SCP/SFTP
  ```

- [ ] **Verify all files present**
  ```bash
  ls -la
  # Should see: docker-compose.yml, packages/, docs/, etc.
  ```

### Configure Environment Files

- [ ] **Create .env file (root)**
  ```bash
  cp .env.example .env
  vim .env  # or nano .env
  ```
  
  **Update these values:**
  - [ ] `NODE_ENV=production`
  - [ ] `POSTGRES_PASSWORD=` (use strong password)
  - [ ] `MONGO_ROOT_PASSWORD=` (use strong password)
  - [ ] `REDIS_PASSWORD=` (use strong password)
  - [ ] `JWT_SECRET=` (64+ char random string)
  - [ ] `JWT_REFRESH_SECRET=` (64+ char random string)

- [ ] **Create backend .env**
  ```bash
  cp packages/backend/.env.example packages/backend/.env
  vim packages/backend/.env
  ```
  
  **Based on server specs, choose ONE:**
  
  **Option A: CPU-Only (No GPU or GPU < 8GB)**
  - [ ] `USE_OLLAMA=true`
  - [ ] `OLLAMA_MODEL=qwen2.5-coder:3b`
  - [ ] `ENABLE_RAG=false`
  
  **Option B: GPU (8-16GB VRAM)**
  - [ ] `USE_OLLAMA=false`
  - [ ] `VLLM_BASE_URL=http://vllm-qwen-coder-7b:8001/v1`
  - [ ] `ENABLE_RAG=true`
  
  **Option C: GPU (16GB+ VRAM)**
  - [ ] `USE_OLLAMA=false`
  - [ ] `VLLM_BASE_URL=http://vllm-qwen-coder-7b:8001/v1`
  - [ ] `VLLM_QWEN_7B_URL=http://vllm-qwen-7b:8003/v1`
  - [ ] `ENABLE_RAG=true`

- [ ] **Create frontend .env.local**
  ```bash
  cp packages/frontend/.env.local.example packages/frontend/.env.local
  vim packages/frontend/.env.local
  ```
  
  **Update:**
  - [ ] `NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3001/api/v1`
  - [ ] `NEXT_PUBLIC_WS_URL=ws://YOUR_SERVER_IP:3001`

- [ ] **Generate secure passwords**
  ```bash
  # Run this to generate random passwords
  openssl rand -base64 32  # For JWT_SECRET
  openssl rand -base64 32  # For JWT_REFRESH_SECRET
  openssl rand -base64 24  # For database passwords
  ```

---

## 🚀 Phase 4: Deployment

### Option A: CPU-Only Deployment (Ollama)

- [ ] **Start Ollama container**
  ```bash
  docker run -d \
    --name ollama \
    -p 11434:11434 \
    -v ollama_data:/root/.ollama \
    --restart unless-stopped \
    ollama/ollama:latest
  ```

- [ ] **Pull AI model**
  ```bash
  docker exec ollama ollama pull qwen2.5-coder:3b
  # Wait 2-5 minutes for download
  ```

- [ ] **Verify Ollama**
  ```bash
  docker exec ollama ollama list
  curl http://localhost:11434/api/tags
  ```

- [ ] **Start main services**
  ```bash
  docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
  ```

### Option B: GPU Deployment (vLLM)

- [ ] **Verify GPU access**
  ```bash
  nvidia-smi
  docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
  ```

- [ ] **Start vLLM services**
  ```bash
  docker-compose -f docker-compose.vllm.yml up -d
  ```

- [ ] **Monitor vLLM startup (takes 2-5 minutes)**
  ```bash
  docker logs -f vllm-qwen-coder-7b
  # Wait for: "Uvicorn running on http://0.0.0.0:8001"
  ```

- [ ] **Verify vLLM**
  ```bash
  curl http://localhost:8001/v1/models
  ```

- [ ] **Start main services**
  ```bash
  docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
  ```

### Database Setup

- [ ] **Wait for services to start (30-60 seconds)**
  ```bash
  docker-compose ps
  # All services should show "Up" or "healthy"
  ```

- [ ] **Run database migrations**
  ```bash
  docker-compose exec backend npx prisma generate
  docker-compose exec backend npx prisma migrate deploy
  ```

- [ ] **Seed initial data (optional)**
  ```bash
  docker-compose exec backend pnpm run seed
  ```

---

## ✅ Phase 5: Verification

### Service Health Checks

- [ ] **Check all containers running**
  ```bash
  docker-compose ps
  ```
  
  **Expected services:**
  - [ ] postgres (healthy)
  - [ ] mongodb (healthy)
  - [ ] redis (healthy)
  - [ ] weaviate (healthy)
  - [ ] backend (Up)
  - [ ] frontend (Up)
  - [ ] ollama or vllm (Up)

- [ ] **Test backend health**
  ```bash
  curl http://localhost:3001/api/v1/health
  # Expected: {"status":"ok"} or similar
  ```

- [ ] **Test frontend**
  ```bash
  curl -I http://localhost:3000
  # Expected: HTTP/1.1 200 OK
  ```

- [ ] **Test AI service**
  ```bash
  # For Ollama:
  curl http://localhost:11434/api/tags
  
  # For vLLM:
  curl http://localhost:8001/v1/models
  ```

### Functional Testing

- [ ] **Open frontend in browser**
  - Visit: `http://YOUR_SERVER_IP:3000`
  - Should load login page

- [ ] **Create test account**
  - Register new user
  - Verify email field works
  - Login successful

- [ ] **Create test project**
  - Create new project
  - Upload sample schema
  - Verify schema parsed correctly

- [ ] **Test AI chat**
  - Open chat interface
  - Send test message: "Hello"
  - Verify AI responds (may take 15-30s first time)

- [ ] **Check logs for errors**
  ```bash
  docker-compose logs backend | grep ERROR
  docker-compose logs frontend | grep ERROR
  ```

---

## 🔒 Phase 6: Security & Production Readiness

### Security Hardening

- [ ] **Verify all passwords changed from defaults**
  - [ ] PostgreSQL password
  - [ ] MongoDB password
  - [ ] Redis password
  - [ ] JWT secrets
  - [ ] Grafana password (if monitoring enabled)

- [ ] **Setup firewall rules**
  ```bash
  sudo ufw allow 22/tcp      # SSH
  sudo ufw allow 80/tcp      # HTTP
  sudo ufw allow 443/tcp     # HTTPS
  sudo ufw allow 3000/tcp    # Frontend (temp)
  sudo ufw allow 3001/tcp    # Backend (temp)
  sudo ufw enable
  ```

- [ ] **Disable direct port access (after Nginx setup)**
  - Setup reverse proxy (Nginx)
  - Only expose ports 80/443
  - Remove rules for 3000/3001

- [ ] **Setup SSL/TLS certificates**
  - Use Let's Encrypt or company certificates
  - Configure Nginx with SSL
  - Force HTTPS redirect

### Backup Setup

- [ ] **Create backup directory**
  ```bash
  sudo mkdir -p /opt/ai-service-backups
  sudo chown $USER:$USER /opt/ai-service-backups
  ```

- [ ] **Copy backup script**
  ```bash
  # See docs/LINUX-SERVER-DEPLOYMENT.md
  # Section 8.3 - Automated Daily Backup Script
  ```

- [ ] **Setup automated backups**
  ```bash
  # Add to crontab (daily at 2 AM)
  crontab -e
  # Add: 0 2 * * * /opt/ai-service-platform/backup.sh
  ```

- [ ] **Test backup script**
  ```bash
  ./backup.sh
  ls -lh /opt/ai-service-backups/
  ```

### Monitoring Setup

- [ ] **Enable monitoring (optional)**
  ```bash
  docker-compose -f docker-compose.yml --profile monitoring up -d
  ```

- [ ] **Access Prometheus**
  - Visit: `http://YOUR_SERVER_IP:9090`
  - Verify metrics collecting

- [ ] **Access Grafana**
  - Visit: `http://YOUR_SERVER_IP:3030`
  - Login: admin / (password from .env)
  - Import dashboards

- [ ] **Setup resource monitoring**
  ```bash
  # Add to cron for daily resource reports
  # See docs for monitoring scripts
  ```

---

## 📊 Phase 7: Performance Optimization

### Resource Tuning

- [ ] **Monitor resource usage**
  ```bash
  docker stats
  # Check CPU, memory usage per container
  ```

- [ ] **Adjust based on hardware**
  
  **If CPU usage high:**
  - [ ] Reduce concurrent users in .env
  - [ ] Use smaller AI model
  - [ ] Enable request queuing
  
  **If memory usage high:**
  - [ ] Limit Docker memory per service
  - [ ] Reduce model context window
  - [ ] Enable aggressive caching
  
  **If GPU memory full (vLLM):**
  - [ ] Add `--gpu-memory-utilization 0.75`
  - [ ] Use INT8 quantization
  - [ ] Reduce max-model-len

- [ ] **Test concurrent load**
  ```bash
  # Use Apache Bench or similar
  ab -n 100 -c 10 http://localhost:3001/api/v1/health
  ```

### Optimization Checklist

- [ ] **Database optimization**
  - [ ] Indexes created (check Prisma migrations)
  - [ ] Connection pooling configured
  - [ ] Query performance acceptable

- [ ] **API performance**
  - [ ] Response times < 100ms for non-AI endpoints
  - [ ] AI responses < 30s (CPU) or < 5s (GPU)
  - [ ] No timeout errors

- [ ] **Caching working**
  - [ ] Redis cache hits in logs
  - [ ] Repeated queries faster
  - [ ] Cache invalidation working

---

## 🎯 Phase 8: Documentation & Handoff

### Create Server Documentation

- [ ] **Document server details**
  - Server IP address
  - SSH credentials location
  - Sudo password (secure location)
  - Docker hub credentials (if private images)

- [ ] **Document deployed configuration**
  - Which model is running (Ollama/vLLM)
  - Model size and performance
  - Resource limits set
  - Backup schedule

- [ ] **Create runbook**
  - How to restart services
  - How to check logs
  - How to update application
  - Emergency contacts

### Team Training

- [ ] **Admin access**
  - Share admin login credentials (secure method)
  - Document user management process
  - API key creation process

- [ ] **Monitoring access**
  - Grafana login
  - How to check system health
  - Alert notification setup

- [ ] **Troubleshooting guide**
  - Common errors and solutions
  - Log locations
  - Restart procedures

---

## 🆘 Troubleshooting Reference

### Issue: Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common fix: Regenerate Prisma
docker-compose exec backend npx prisma generate
docker-compose restart backend
```

### Issue: AI not responding

```bash
# Check AI service
docker logs ollama  # or vllm-qwen-coder-7b

# Check backend can reach AI
docker-compose exec backend curl http://ollama:11434/api/tags

# Restart AI service
docker-compose restart ollama
```

### Issue: Out of memory

```bash
# Check memory usage
free -h
docker stats

# Reduce model size or add swap
# See docs/LINUX-SERVER-DEPLOYMENT.md troubleshooting
```

### Issue: Port conflicts

```bash
# Find process using port
sudo netstat -tulpn | grep :3001

# Kill process or change port in .env
```

---

## ✅ Sign-Off Checklist

**Deployment Lead:** ________________  **Date:** ________

**Checklist Completion:**
- [ ] All pre-deployment checks passed
- [ ] Software installed correctly
- [ ] Environment files configured
- [ ] Services deployed successfully
- [ ] All verification tests passed
- [ ] Security hardening complete
- [ ] Backups configured and tested
- [ ] Monitoring enabled
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Team trained

**Production Ready:** ☐ YES  ☐ NO

**Notes/Issues:**
_____________________________________________
_____________________________________________
_____________________________________________

---

## 📞 Support Contacts

**Technical Issues:**
- DevOps Team: _________________
- Backend Team: _________________
- AI/ML Team: _________________

**Emergency Contact:**
- On-Call: _________________
- Escalation: _________________

**Useful Links:**
- GitHub Repo: _________________
- Documentation: docs/LINUX-SERVER-DEPLOYMENT.md
- Monitoring: http://YOUR_SERVER_IP:9090
- Application: http://YOUR_SERVER_IP:3000

---

**Deployment Date:** ____________  
**Next Review:** ____________  
**Status:** ☐ ACTIVE ☐ TESTING ☐ MAINTENANCE
