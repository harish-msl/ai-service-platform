# Staging Server Requirements - AI Service Platform

**Last Updated:** November 4, 2025  
**Project:** AI-as-a-Service Platform v2.0  
**Target Load:** 2 projects (development & testing), 5 concurrent users

---

## 📋 Minimal Setup (Current Needs)

### Your Current Requirements
- **Users:** 5 concurrent (internal team)
- **Projects:** 2 active projects
- **Usage:** Development and testing
- **Response Time:** < 10 seconds (acceptable for dev)
- **Uptime:** 95% (business hours only)

---

## 💻 Recommended Server Specs (Budget-Friendly)

### Option 1: Development Laptop/Desktop (FREE)
**Perfect for: Getting started immediately**

```yaml
Minimum Specs:
  CPU: 4 cores @ 2.5GHz+ (Intel i5/i7, AMD Ryzen 5/7)
  RAM: 16GB DDR4
  Storage: 256GB SSD (100GB free)
  GPU: Not required (use Ollama CPU mode)
  OS: Windows 10/11, WSL2 enabled
  
Docker Requirements:
  Docker Desktop: Latest version
  WSL2: Enabled with Ubuntu 22.04
  Memory allocated: 8GB minimum
  CPUs allocated: 4 cores

Performance:
  ✅ Chat responses: 5-15 seconds
  ✅ Concurrent users: 5-10
  ✅ API calls: 100-200/day
  ✅ Cost: $0 (use existing hardware)
```

**This is what you have now!** ✅

---

### Option 2: Cloud VM (Low-Cost)
**Perfect for: Remote team access**

#### AWS EC2
```yaml
Instance: t3.xlarge
Specs:
  CPU: 4 vCPUs
  RAM: 16GB
  Storage: 100GB gp3 SSD
  Network: Up to 5 Gbps
  
Cost: $0.1664/hour = $120/month (24/7)
      $40/month (8hrs/day, weekdays only)

Setup:
  - Ubuntu 22.04 LTS
  - Docker + Docker Compose
  - Ollama for AI models
```

#### Hetzner Cloud (Best Value)
```yaml
Instance: CX31
Specs:
  CPU: 2 vCPUs (AMD EPYC)
  RAM: 8GB
  Storage: 80GB SSD
  Network: 20TB traffic
  
Cost: €5.83/month (~$6.20/month) ⭐ BEST VALUE

Setup:
  - Ubuntu 22.04 LTS
  - Docker + Docker Compose
  - Ollama CPU mode
```

#### DigitalOcean
```yaml
Droplet: Basic 16GB
Specs:
  CPU: 2 vCPUs
  RAM: 16GB
  Storage: 100GB SSD
  Transfer: 5TB

Cost: $84/month

Setup:
  - Ubuntu 22.04 LTS
  - Docker + Docker Compose
```

---

## 🐳 Docker Services Resource Allocation

### Core Infrastructure (Always Running)

| Service | CPU | RAM | Storage | Purpose |
|---------|-----|-----|---------|---------|
| PostgreSQL | 1 core | 2GB | 20GB | User data, projects |
| MongoDB | 1 core | 2GB | 30GB | Logs, analytics |
| Redis | 0.5 core | 1GB | 5GB | Cache, sessions |
| Weaviate | 1 core | 2GB | 20GB | Vector search (RAG) |
| Embeddings (CPU) | 2 cores | 2GB | 5GB | Text to vectors |
| **Subtotal** | **5.5 cores** | **9GB** | **80GB** | |

### Application Services

| Service | CPU | RAM | Storage | Purpose |
|---------|-----|-----|---------|---------|
| Backend (NestJS) | 2 cores | 2GB | 5GB | API server |
| Frontend (Next.js) | 1 core | 1GB | 3GB | Web interface |
| **Subtotal** | **3 cores** | **3GB** | **8GB** | |

### AI Models (Choose One)

| Service | CPU | RAM | Storage | Speed |
|---------|-----|-----|---------|-------|
| Ollama (Qwen2.5 7B) | 4 cores | 8GB | 10GB | 5-15 sec ✅ |
| Mock Mode | 0 cores | 0GB | 0GB | Instant ⚡ |

### Total Resources Required

```yaml
Minimum (Mock Mode):
  CPU: 8-9 cores
  RAM: 12GB
  Storage: 90GB SSD
  Cost: $0 (laptop) or $6/month (Hetzner)

Recommended (Ollama CPU):
  CPU: 12-13 cores
  RAM: 20GB
  Storage: 100GB SSD
  Cost: $0 (laptop) or $40/month (AWS t3.xlarge part-time)
```

**Your laptop with 16GB RAM is perfect for this!** 🎉

---

## 🎯 Setup Guide for Your Laptop

### Current Status ✅
```yaml
✅ Docker Desktop installed
✅ WSL2 enabled
✅ PostgreSQL, MongoDB, Redis, Weaviate running
✅ Backend running (mock mode)
✅ Frontend running
⏳ Ollama downloading model (in progress)
```

### What You Need to Do (After Ollama Download):

#### 1. Check Ollama Status
```bash
# Wait for model download to complete (~10 minutes)
docker logs ollama -f

# You'll see: "success" when done
```

#### 2. Test Ollama
```bash
# List installed models
docker exec ollama ollama list

# Should show: qwen2.5:7b

# Test it works
docker exec -it ollama ollama run qwen2.5:7b "Hello!"
```

#### 3. Start OpenAI Wrapper
```bash
cd scripts

# Install Python dependencies (one-time)
pip install fastapi uvicorn httpx pydantic

# Start the API wrapper
python ollama-api.py
```

You'll see:
```
🚀 Starting Ollama OpenAI-Compatible API on port 8003
📡 Ollama host: http://localhost:11434
🤖 Default model: qwen2.5:7b
🌐 Access at: http://localhost:8003
```

#### 4. Update Backend Config
```bash
# Edit packages/backend/.env
# Change this line:
USE_MOCK_CHAT=false
```

#### 5. Restart Backend
```bash
cd packages/backend
pnpm run start:dev
```

#### 6. Test Chat! 🎉
```bash
# Open browser
http://localhost:3000/dashboard/chat

# Send message: "Hi!"
# You should get real AI response!
```

---

## 📊 Expected Performance (Your Setup)

### Response Times
```yaml
Login: < 1 second ✅
Dashboard load: < 2 seconds ✅
Create project: < 1 second ✅
Schema upload: 2-5 seconds ✅
AI Chat (Ollama CPU): 5-15 seconds ⚡
SQL Generation: 3-8 seconds ⚡
Analytics: < 1 second ✅
```

### Capacity
```yaml
Concurrent users: 5 ✅
Active projects: 10 ✅
API calls/day: 500 ✅
Chat messages/day: 100 ✅
Database size: 1-2GB ✅
```

**This is MORE than enough for development!** 🎯

---

## 💾 Storage Breakdown (100GB Total)

```yaml
Operating System (Windows/WSL2):
  Windows: 40GB
  WSL2 Ubuntu: 10GB
  Subtotal: 50GB

Docker Images & Volumes:
  Docker images: 15GB
  PostgreSQL data: 5GB
  MongoDB data: 10GB
  Redis cache: 2GB
  Weaviate vectors: 5GB
  Ollama model: 5GB
  Application data: 3GB
  Subtotal: 45GB

Free Space: 5GB (buffer)

Total: 100GB
```

**Recommendation:** 256GB SSD or larger for comfort

---

## 🌐 Network Requirements

### For 5 Users
```yaml
Bandwidth:
  Sustained: 2-5 Mbps
  Peak: 10-20 Mbps
  Monthly: ~50GB total

Connection:
  Home broadband: ✅ Perfect
  Office WiFi: ✅ Perfect
  Mobile hotspot: ⚠️ Slow but works
```

### Ports to Open (if remote access needed)
```yaml
Public (Internet):
  443/tcp - HTTPS (use Cloudflare Tunnel)
  
Internal (Localhost only):
  3000/tcp - Frontend
  3001/tcp - Backend API
  11434/tcp - Ollama
  8003/tcp - Ollama API wrapper
  5432/tcp - PostgreSQL (internal)
  27017/tcp - MongoDB (internal)
  6379/tcp - Redis (internal)
  8080/tcp - Weaviate (internal)
```

---

## 🔒 Security (Minimal Setup)

### For Local Development
```yaml
✅ Keep all services on localhost
✅ Don't expose Docker ports to 0.0.0.0
✅ Use strong admin password
✅ Enable Windows Firewall
✅ Update Docker Desktop regularly
```

### For Remote Access (Team)
```yaml
Option 1: Cloudflare Tunnel (Free, Secure)
  - No port forwarding needed
  - Free SSL certificates
  - DDoS protection
  - Easy setup: cloudflared tunnel

Option 2: Tailscale VPN (Free for small teams)
  - Secure P2P connection
  - No public IP needed
  - Works everywhere
  - Free for up to 20 devices

Option 3: ngrok (Quick testing)
  - Temporary public URL
  - Free tier available
  - Good for demos
```

---

## 🚀 Upgrade Path (When You Need More)

### When to Upgrade?

| Metric | Current | Upgrade When | New Target |
|--------|---------|--------------|------------|
| Users | 5 | > 10 users | 50 users |
| Projects | 2 | > 10 projects | 100 projects |
| Response Time | 5-15s | Need < 3s | 1-2s |
| Uptime | 95% | Need 99%+ | 24/7 |
| Cost | $0 | Team complains | $100-200/month |

### Upgrade Options

#### Next Level: GPU Server
```yaml
Hetzner AX41 Dedicated Server:
  CPU: AMD Ryzen 5 3600 (6 cores)
  RAM: 64GB DDR4
  Storage: 2x 512GB NVMe
  GPU: 1x RTX 3060 (12GB)
  Cost: €80/month (~$85/month)
  
Performance:
  ✅ Chat: 1-2 seconds
  ✅ Users: 50 concurrent
  ✅ Projects: 100+
  ✅ Uptime: 99.9%
```

#### Enterprise Level: Cloud Auto-Scaling
```yaml
AWS/GCP/Azure Kubernetes:
  Auto-scale: 2-10 nodes
  Load balancer: Yes
  Multi-region: Optional
  Cost: $500-2000/month
  
Performance:
  ✅ Chat: < 1 second
  ✅ Users: 500+ concurrent
  ✅ Projects: Unlimited
  ✅ Uptime: 99.99%
```

---

## 📋 Quick Reference

### Your Current Setup (Development)

```yaml
Hardware: Your Laptop (16GB RAM)
Services Running: 8 Docker containers
AI Model: Ollama Qwen2.5 7B (CPU)
Users: 5 internal team members
Projects: 2 test projects
Cost: $0/month ⭐

Performance:
  ✅ Chat: 5-15 seconds
  ✅ Fast enough for dev/testing
  ✅ Runs 24/7 if laptop on
  ✅ No cloud costs

Status: PERFECT FOR CURRENT NEEDS! 🎉
```

### Daily Commands

```bash
# Start everything
docker-compose up -d
cd packages/backend && pnpm run start:dev &
cd packages/frontend && pnpm run dev &
cd scripts && python ollama-api.py &

# Check status
docker ps
curl http://localhost:3000  # Frontend
curl http://localhost:3001/health  # Backend
curl http://localhost:8003/health  # Ollama API

# Stop everything
docker-compose down
# Ctrl+C in terminal windows
```

---

## 🎯 Summary

### ✅ Your Laptop is Perfect!

**Hardware:** Good enough for 5 users  
**Software:** All installed and running  
**AI:** Ollama downloading (10 min wait)  
**Cost:** $0  
**Setup Time:** Already 90% done!  

### Next Steps:

1. ⏳ Wait for Ollama model download (~10 min)
2. ▶️ Start API wrapper: `python scripts/ollama-api.py`
3. 🔧 Disable mock mode in backend `.env`
4. 🔄 Restart backend
5. 🎉 Test chat at http://localhost:3000/dashboard/chat

**You'll have a working AI platform in 15 minutes!** 🚀

---

## 💡 Pro Tips

1. **Leave laptop plugged in** - Docker uses CPU/memory
2. **Close unnecessary apps** - Free up RAM
3. **Use SSD not HDD** - Much faster
4. **Enable laptop "High Performance" mode** - Better speed
5. **Monitor with Task Manager** - Watch resource usage
6. **Backup your data** - Export projects regularly

---

## 📞 Quick Help

**Chat too slow?**
- Normal for CPU mode (5-15 sec)
- Use shorter messages
- Or enable mock mode for instant responses

**Out of memory?**
- Close browser tabs
- Restart Docker Desktop
- Reduce Docker memory in settings

**Container crashed?**
- Check logs: `docker logs <container_name>`
- Restart: `docker restart <container_name>`
- Or restart all: `docker-compose restart`

---

**Your setup is already 90% ready! Just waiting for Ollama model download.** ⏳🎉
