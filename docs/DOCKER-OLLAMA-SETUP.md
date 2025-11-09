# Quick Setup Commands - Using Ollama Docker

## Method 1: Automated Setup Script

### Windows:
```bash
cd d:/Work/ai-service-platform
./scripts/setup-speed-optimization.bat
```

### Linux/Mac:
```bash
cd d:/Work/ai-service-platform
chmod +x ./scripts/setup-speed-optimization.sh
./scripts/setup-speed-optimization.sh
```

---

## Method 2: Manual Docker Commands

### Step 1: Start Ollama Container

```bash
# Start Ollama with CPU profile
docker-compose -f docker-compose.ollama.yml --profile cpu up -d ollama

# Wait for container to be healthy (about 10 seconds)
docker ps | grep ai-service-ollama
```

### Step 2: Pull qwen2.5:0.5b Model

```bash
# Pull the 0.5b model (ultra-fast)
docker exec ai-service-ollama ollama pull qwen2.5:0.5b

# Also pull 1.5b as backup (optional)
docker exec ai-service-ollama ollama pull qwen2.5:1.5b
```

### Step 3: Verify Models

```bash
# List all models in Ollama
docker exec ai-service-ollama ollama list

# Should see:
# NAME                    ID              SIZE    MODIFIED
# qwen2.5:0.5b           abc123          400MB   X minutes ago
# qwen2.5:1.5b           def456          900MB   X minutes ago
```

### Step 4: Test Model

```bash
# Test the model with a simple prompt
docker exec -it ai-service-ollama ollama run qwen2.5:0.5b "Hello, how are you?"
```

### Step 5: Generate Prisma Client

```bash
# Stop backend first (if running)
# Ctrl+C in backend terminal

# Generate Prisma client
cd packages/backend
npx prisma generate
```

### Step 6: Update Backend .env

```bash
# Edit packages/backend/.env
OLLAMA_MODEL=qwen2.5:0.5b
OLLAMA_BASE_URL=http://localhost:11434/v1
USE_DIRECT_OLLAMA=true
ENABLE_RAG=true
```

### Step 7: Restart Backend

```bash
cd packages/backend
pnpm run start:dev
```

---

## Method 3: Use Docker Compose Pull Service

This automatically pulls both models when starting:

```bash
# Start Ollama and auto-pull models
docker-compose -f docker-compose.ollama.yml --profile cpu up -d

# This will:
# 1. Start Ollama container
# 2. Wait for it to be healthy
# 3. Pull qwen2.5:0.5b (fast model)
# 4. Pull qwen2.5:1.5b (backup model)

# Check logs to see progress
docker logs ai-service-ollama-pull -f
```

---

## Useful Docker Commands

### Check Ollama Status
```bash
docker ps | grep ollama
docker logs ai-service-ollama
```

### List Models
```bash
docker exec ai-service-ollama ollama list
```

### Pull Additional Models
```bash
# Pull 1.5b model
docker exec ai-service-ollama ollama pull qwen2.5:1.5b

# Pull 7b model (if you have good CPU/GPU)
docker exec ai-service-ollama ollama pull qwen2.5:7b
```

### Remove Models (Free Space)
```bash
# Remove a model
docker exec ai-service-ollama ollama rm qwen2.5:7b
```

### Interactive Model Testing
```bash
# Chat with the model
docker exec -it ai-service-ollama ollama run qwen2.5:0.5b

# Exit: /bye
```

### Restart Ollama Container
```bash
docker restart ai-service-ollama
```

### Stop Ollama Container
```bash
docker-compose -f docker-compose.ollama.yml down
```

### View Ollama Data (Volumes)
```bash
# Check volume location
docker volume inspect ai-service-platform_ollama_data

# Backup models
docker run --rm -v ai-service-platform_ollama_data:/data -v $(pwd):/backup alpine tar czf /backup/ollama-backup.tar.gz /data
```

---

## Troubleshooting

### Model Not Found After Pull
```bash
# Verify model exists
docker exec ai-service-ollama ollama list

# If not there, pull again
docker exec ai-service-ollama ollama pull qwen2.5:0.5b
```

### Container Not Running
```bash
# Check container status
docker ps -a | grep ollama

# If stopped, start it
docker start ai-service-ollama

# If doesn't exist, create it
docker-compose -f docker-compose.ollama.yml --profile cpu up -d ollama
```

### Backend Can't Connect to Ollama
```bash
# Check Ollama is accessible
curl http://localhost:11434/api/tags

# Should return JSON with available models

# Update .env to use correct URL
OLLAMA_BASE_URL=http://localhost:11434/v1
```

### Slow Model Loading
```bash
# Keep model in memory (already set in docker-compose)
# But you can verify:
docker exec ai-service-ollama printenv | grep OLLAMA_KEEP_ALIVE

# Should show: OLLAMA_KEEP_ALIVE=24h
```

### Permission Errors on Windows
```bash
# Run PowerShell/CMD as Administrator
# Then run the setup script again
```

---

## Performance Optimization

### 1. Keep Model in Memory
Already configured in `docker-compose.ollama.yml`:
```yaml
environment:
  - OLLAMA_KEEP_ALIVE=24h  # Keep model loaded for 24 hours
```

### 2. Use Smaller Context Window
In your backend code, reduce `num_predict`:
```typescript
options: {
  temperature: 0.3,
  num_predict: 800,  // Reduced from default
}
```

### 3. Enable GPU (if available)
```bash
# For NVIDIA GPUs
docker-compose -f docker-compose.ollama.yml --profile gpu up -d

# Check GPU usage
docker exec ai-service-ollama nvidia-smi
```

---

## Expected Performance

| Model | Size | Speed (CPU) | Accuracy |
|-------|------|-------------|----------|
| qwen2.5:0.5b | 400MB | **0.3-0.5s** | Good |
| qwen2.5:1.5b | 900MB | 1-2s | Better |
| qwen2.5:7b | 4.7GB | 5-10s | Best |

**Recommended for speed**: qwen2.5:0.5b  
**Recommended for accuracy**: qwen2.5:1.5b

---

## Next Steps

1. ✅ Pull model using Docker: `docker exec ai-service-ollama ollama pull qwen2.5:0.5b`
2. ✅ Generate Prisma client: `cd packages/backend && npx prisma generate`
3. ✅ Update .env: `OLLAMA_MODEL=qwen2.5:0.5b`
4. ✅ Restart backend: `pnpm run start:dev`
5. 🎉 Test speed: Should see <1s responses!

---

**Created**: November 9, 2025  
**Status**: Ready to use with Docker Ollama 🐳
