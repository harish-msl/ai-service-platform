# Staging Server Requirements - AI Service Platform

**Last Updated:** November 4, 2025  
**Project:** AI-as-a-Service Platform v2.0  
**Target Load:** 100+ projects, 500+ concurrent users

---

## 📋 Server Specifications

### Minimum (Development/Testing)

```yaml
CPU: 8 cores (Intel Xeon/AMD EPYC)
RAM: 32GB DDR4
Storage: 500GB SSD
GPU: None (CPU mode only - SLOW)
Network: 100Mbps
OS: Ubuntu 22.04 LTS
```

**Performance:**
- ⚠️ Chat responses: 30-60 seconds
- ⚠️ Concurrent users: 5-10
- ⚠️ Not suitable for staging
- ✅ Good for: Local development, testing

---

### Recommended (Staging - Single GPU)

```yaml
CPU: 16 cores @ 3.0GHz+ (Intel Xeon Gold/AMD EPYC)
RAM: 64GB DDR4/DDR5
Storage: 
  - OS: 250GB NVMe SSD
  - Data: 1TB NVMe SSD (PostgreSQL, MongoDB, Redis)
  - Models: 500GB SSD (vLLM cache)
GPU: 1x NVIDIA A10 (24GB VRAM) or RTX 4090 (24GB)
Network: 1Gbps
OS: Ubuntu 22.04 LTS
Docker: 27.3.1+
NVIDIA Driver: 535+ with CUDA 12.2+
```

**Performance:**
- ✅ Chat responses: 1-3 seconds
- ✅ Concurrent users: 50-100
- ✅ Query generation: 2-5 seconds
- ✅ Cost: ~$1-2/hour (cloud)

**Recommended Cloud Providers:**
```
AWS: g5.4xlarge (1x A10G 24GB) - $1.62/hr
GCP: n1-standard-16 + 1x NVIDIA T4 - $1.35/hr
Azure: NC6s_v3 (1x V100 16GB) - $3.06/hr
Hetzner: GPU Server (RTX 4000) - €0.80/hr (~$0.85/hr) ⭐ Best Value
```

---

### Optimal (Production-Ready - Multi-GPU)

```yaml
CPU: 32 cores @ 3.5GHz+ (AMD EPYC 7543/Intel Xeon Platinum)
RAM: 128GB DDR4 ECC
Storage:
  - OS: 500GB NVMe SSD (RAID 1)
  - Data: 2TB NVMe SSD RAID 10 (databases)
  - Models: 1TB NVMe SSD (vLLM cache)
  - Backups: 5TB HDD/Object Storage
GPU: 2x NVIDIA A100 (40GB VRAM each) or 2x RTX A6000 (48GB each)
Network: 10Gbps
OS: Ubuntu 22.04 LTS
Load Balancer: Nginx/HAProxy
```

**Performance:**
- ✅ Chat responses: 0.5-1 second
- ✅ Concurrent users: 500+
- ✅ Query generation: 1-2 seconds
- ✅ Analytics: Real-time
- ✅ Multi-model parallel serving
- ✅ Cost: ~$5-10/hour (cloud)

**Cloud Options:**
```
AWS: p4d.24xlarge (8x A100 40GB) - $32.77/hr
  └─> Overkill, use p3.8xlarge (4x V100) - $12.24/hr
GCP: a2-highgpu-2g (2x A100 40GB) - $5.95/hr ⭐
Azure: ND96asr_v4 (8x A100) - $27.20/hr
Lambda Labs: 2x A100 - $3.20/hr ⭐⭐ BEST VALUE
```

---

## 🐳 Docker Services Resource Allocation

### Core Infrastructure (Always Running)

| Service | CPU | RAM | Storage | Notes |
|---------|-----|-----|---------|-------|
| PostgreSQL | 2 cores | 4GB | 50GB | Metadata, users, projects |
| MongoDB | 2 cores | 4GB | 100GB | Logs, analytics data |
| Redis | 1 core | 2GB | 10GB | Cache, sessions, queues |
| Weaviate | 2 cores | 8GB | 50GB | Vector database (RAG) |
| HF TEI Embeddings | 4 cores | 4GB | 10GB | Text → vectors (CPU) |
| **Subtotal** | **11 cores** | **22GB** | **220GB** | |

### Application Services

| Service | CPU | RAM | Storage | Notes |
|---------|-----|-----|---------|-------|
| Backend (NestJS) | 4 cores | 4GB | 10GB | API, business logic |
| Frontend (Next.js) | 2 cores | 2GB | 5GB | Admin portal |
| Nginx | 1 core | 1GB | 1GB | Reverse proxy |
| Prometheus | 1 core | 2GB | 20GB | Metrics collection |
| Grafana | 1 core | 1GB | 10GB | Dashboards |
| **Subtotal** | **9 cores** | **10GB** | **46GB** | |

### AI Models (vLLM - GPU Mode)

| Service | CPU | RAM | GPU VRAM | Storage | Notes |
|---------|-----|-----|----------|---------|-------|
| vLLM Chat (7B) | 4 cores | 8GB | 8GB | 15GB | Qwen2.5-7B-Instruct |
| vLLM Coder (32B) | 8 cores | 16GB | 24GB | 65GB | Qwen2.5-Coder-32B |
| vLLM Analytics (7B) | 4 cores | 8GB | 8GB | 15GB | DeepSeek-R1-7B |
| **Subtotal** | **16 cores** | **32GB** | **40GB VRAM** | **95GB** | |

### Total Resources (Full Stack)

```yaml
Staging (1 GPU - Chat only):
  CPU: 24 cores minimum (11 + 9 + 4)
  RAM: 36GB minimum (22 + 10 + 4)
  GPU: 1x 24GB VRAM (for chat model)
  Storage: 300GB SSD
  
Production (2 GPUs - All models):
  CPU: 36 cores minimum (11 + 9 + 16)
  RAM: 64GB minimum (22 + 10 + 32)
  GPU: 2x 24GB VRAM or 1x 48GB VRAM
  Storage: 400GB SSD
```

---

## 📊 Staging vs Production Comparison

| Aspect | Staging | Production |
|--------|---------|------------|
| **Purpose** | Testing, QA, demos | Live customer traffic |
| **Uptime** | 95% (8am-6pm weekdays) | 99.9% (24/7) |
| **Users** | Internal team (10-20) | 100+ projects, 500+ users |
| **Data** | Test/dummy data | Real production data |
| **Backups** | Daily | Hourly + real-time replication |
| **Monitoring** | Basic Grafana | Full observability stack |
| **Security** | Standard SSL | Advanced (WAF, DDoS, encryption) |
| **Cost/Month** | $500-1000 | $3000-5000 |

---

## 🚀 Recommended Staging Setup (BEST VALUE)

### Option 1: Hetzner Dedicated Server (Best Price/Performance)

```yaml
Server: AX102 or similar
CPU: AMD Ryzen 9 7950X (16 cores, 32 threads)
RAM: 128GB DDR5
Storage: 2x 1.92TB NVMe (RAID 1)
GPU: 1x NVIDIA RTX 4090 (24GB VRAM)
Network: 1Gbit/s
Cost: ~€180/month (~$190/month) ⭐⭐⭐
Setup: €199 one-time

Performance:
✅ Handles all 3 vLLM models simultaneously
✅ 100+ concurrent users
✅ Sub-2-second responses
✅ Room to grow
```

**Why This?**
- 🎯 Perfect for staging (overkill is good)
- 💰 Cheapest option (10x cheaper than AWS)
- 🚀 Better than cloud GPU instances
- 🛡️ Owned hardware (predictable costs)
- 📍 EU-based (GDPR compliant)

---

### Option 2: Lambda Labs GPU Cloud (Development/Testing)

```yaml
Instance: 1x RTX A6000 (48GB)
CPU: 14 cores
RAM: 46GB
Storage: 512GB SSD
Cost: $0.80/hour = $576/month (if 24/7)
       $192/month (if 8hrs/day, weekdays only)

Performance:
✅ Runs all models
✅ Good for testing
⚠️ Pay-per-use (can get expensive)
```

---

### Option 3: AWS (Enterprise/Compliance)

```yaml
Instance: g5.4xlarge
CPU: 16 vCPUs
RAM: 64GB
GPU: 1x NVIDIA A10G (24GB)
Storage: 500GB gp3 SSD
Cost: $1.62/hour = $1,166/month (24/7)
      $389/month (8hrs/day, weekdays)

+ RDS PostgreSQL: $150/month
+ DocumentDB (MongoDB): $200/month
+ ElastiCache (Redis): $100/month
+ S3 Backups: $50/month

Total: ~$900-1,600/month

Performance:
✅ Enterprise-grade
✅ Easy scaling
✅ Managed services
⚠️ Expensive
```

---

## 🔧 Network Requirements

### Bandwidth Estimation

```yaml
Per Chat Message:
  Request: ~500 bytes (prompt)
  Response: ~2-5KB (text)
  Total: ~5KB per exchange

Per SQL Query:
  Request: ~1KB (natural language)
  Response: ~2KB (SQL + explanation)
  Total: ~3KB per query

Analytics Request:
  Request: ~10KB (data payload)
  Response: ~20KB (insights + charts)
  Total: ~30KB

Concurrent Users:
  Light (50 users): ~5Mbps sustained, 20Mbps peak
  Medium (200 users): ~20Mbps sustained, 80Mbps peak
  Heavy (500 users): ~50Mbps sustained, 200Mbps peak

Recommended: 1Gbps connection (overhead, updates, monitoring)
```

### Ports to Open

```yaml
Public (Internet-facing):
  80/tcp   - HTTP (redirect to HTTPS)
  443/tcp  - HTTPS (main application)
  22/tcp   - SSH (restrict to office IP)

Internal (Docker network):
  3000/tcp - Frontend
  3001/tcp - Backend API
  5432/tcp - PostgreSQL
  27017/tcp - MongoDB
  6379/tcp - Redis
  8080/tcp - Weaviate
  8001-8003/tcp - vLLM models (internal only)
  9090/tcp - Prometheus
  3030/tcp - Grafana

Firewall Rules:
  - Allow: Office IPs → SSH
  - Allow: 0.0.0.0/0 → 80, 443
  - Deny: 0.0.0.0/0 → All other ports
  - Allow: Internal Docker network → All services
```

---

## 💾 Storage Breakdown

### Initial Setup (Fresh Install)

```yaml
OS & System:
  Ubuntu 22.04: 20GB
  Docker + Images: 30GB
  Logs: 10GB
  Subtotal: 60GB

Databases (Empty):
  PostgreSQL: 5GB
  MongoDB: 5GB
  Weaviate: 5GB
  Redis: 2GB
  Subtotal: 17GB

AI Models (First Download):
  Qwen2.5-7B-Instruct: 14GB
  Qwen2.5-Coder-32B: 64GB
  DeepSeek-R1-7B: 14GB
  Embedding Model: 1GB
  Subtotal: 93GB

Total Day 1: ~170GB
```

### After 3 Months (Staging)

```yaml
Databases:
  PostgreSQL: 20GB (metadata grows slowly)
  MongoDB: 100GB (logs accumulate)
  Weaviate: 30GB (vectors for RAG)
  Redis: 5GB (cache)
  Subtotal: 155GB

Logs & Backups:
  Application logs: 50GB
  Database backups: 100GB
  Model cache: 10GB
  Subtotal: 160GB

Total After 3 Months: ~480GB

Recommendation: Start with 1TB SSD
```

---

## 🔍 Monitoring & Observability

### Metrics to Track

```yaml
System Metrics:
  - CPU usage per container
  - RAM usage per container
  - GPU utilization (nvidia-smi)
  - GPU memory usage
  - Disk I/O
  - Network I/O

Application Metrics:
  - API response times
  - Request rate (req/sec)
  - Error rate
  - Token generation speed (tokens/sec)
  - Queue depth (Bull queues)
  - Cache hit rate (Redis)
  - Active connections

Business Metrics:
  - Total API calls per project
  - Tokens used per project
  - Cost per request
  - User satisfaction (response time)
  - Model accuracy (if feedback available)
```

### Alerting Thresholds

```yaml
Critical (Page on-call):
  - API error rate > 5%
  - GPU memory > 90% (OOM risk)
  - Database down
  - Disk > 95% full
  - Response time > 30 seconds

Warning (Slack notification):
  - CPU > 80% for 5 minutes
  - RAM > 85%
  - GPU utilization < 10% (idle waste)
  - Queue depth > 100
  - Cache hit rate < 60%
```

---

## 🎯 My Recommendation for Your Staging Server

### 🥇 Best Choice: Hetzner AX102 + RTX 4090

```yaml
Server: Hetzner Dedicated (AX102 or custom)
Cost: €180/month (~$190/month)

Specs:
  CPU: AMD Ryzen 9 7950X (16 cores)
  RAM: 128GB DDR5
  Storage: 2x 2TB NVMe RAID 1
  GPU: 1x RTX 4090 24GB
  Network: 1Gbit/s unmetered

Why Perfect for You:
  ✅ Runs ALL models simultaneously
  ✅ 10x cheaper than AWS
  ✅ Predictable monthly cost
  ✅ No "surprise" cloud bills
  ✅ Fast NVMe for database performance
  ✅ Enough RAM for future growth
  ✅ Can handle production load if needed
  ✅ EU-based (good for GDPR)

Total Monthly Cost:
  Server: $190
  Domain: $10
  Backups (S3): $20
  Monitoring (optional): $0 (self-hosted)
  Total: ~$220/month

ROI: Breaks even vs AWS in first month!
```

---

## 📋 Setup Checklist (Day 1)

### Server Provisioning
- [ ] Order server (Hetzner/AWS/Lambda)
- [ ] Install Ubuntu 22.04 LTS
- [ ] Configure SSH keys (disable password auth)
- [ ] Setup firewall (ufw/iptables)
- [ ] Install Docker + Docker Compose
- [ ] Install NVIDIA drivers + CUDA
- [ ] Install nvidia-docker2
- [ ] Configure swap (32GB)

### Application Deployment
- [ ] Clone repository
- [ ] Copy `.env` files
- [ ] Start core services (postgres, mongo, redis, weaviate)
- [ ] Run database migrations
- [ ] Start backend + frontend
- [ ] Start vLLM (chat model only first)
- [ ] Configure Nginx reverse proxy
- [ ] Setup SSL certificates (Let's Encrypt)
- [ ] Configure Prometheus + Grafana

### Testing & Validation
- [ ] Test health endpoints
- [ ] Create test user
- [ ] Create test project
- [ ] Upload test schema
- [ ] Test chat (REST mode)
- [ ] Test chat (SSE streaming)
- [ ] Test SQL query generation
- [ ] Check logs (no errors)
- [ ] Monitor GPU usage
- [ ] Load test (50 concurrent users)

### Security Hardening
- [ ] Update all packages
- [ ] Configure fail2ban
- [ ] Setup automated backups
- [ ] Configure log rotation
- [ ] Enable rate limiting
- [ ] Setup monitoring alerts
- [ ] Document access procedures
- [ ] Create runbook for incidents

---

## 🚨 Common Pitfalls to Avoid

### ❌ Don't:
- Use CPU-only in staging (too slow, not realistic)
- Undersize RAM (<64GB with all models)
- Skip monitoring (you'll be blind)
- Use shared hosting (noisy neighbors)
- Forget backups (test restores!)
- Expose vLLM ports publicly (security risk)

### ✅ Do:
- Start with 1 model, add more gradually
- Monitor GPU memory closely
- Use Docker volumes for persistence
- Setup automated backups
- Load test before production
- Document everything
- Have rollback plan

---

## 📞 Quick Reference

```bash
# Check if GPU detected
nvidia-smi

# Start staging environment
docker-compose up -d
docker-compose -f docker-compose.vllm.yml --profile gpu up -d vllm-chat

# Monitor resources
docker stats
nvidia-smi -l 1  # GPU usage every second

# Check logs
docker logs -f ai-service-backend
docker logs -f ai-service-vllm-chat

# Backup databases
docker exec ai-service-postgres pg_dump -U ai_service ai_service > backup.sql
docker exec ai-service-mongodb mongodump --out=/backup

# Restart services
docker-compose restart backend
docker-compose restart vllm-chat
```

---

**Summary:**
- **Development**: Your laptop (CPU mode, slow but works)
- **Staging**: Hetzner AX102 + RTX 4090 (~$190/month) ⭐
- **Production**: 2x GPU server or cloud (scale as needed)

**Next Step:** Order staging server and I'll help you deploy! 🚀
