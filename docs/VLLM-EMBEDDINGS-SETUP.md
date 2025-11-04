# vLLM Embeddings Setup Guide

## Overview

This guide helps you set up embeddings support for Weaviate indexing. You have two options:
1. **GPU-accelerated** (vLLM with NVIDIA GPU) - Fast but requires GPU
2. **CPU-only** (Hugging Face TEI) - Slower but works on any machine

## Prerequisites

### For GPU Setup
- NVIDIA GPU with CUDA support
- Docker with NVIDIA Container Toolkit
- At least 4GB GPU VRAM

### For CPU Setup
- At least 4GB RAM
- Docker installed

## Quick Start (Choose One)

### Option A: GPU Setup (Recommended if you have GPU)

1. **Install NVIDIA Container Toolkit** (if not already installed)

```bash
# Windows with WSL2
# Make sure you have NVIDIA drivers installed on Windows
# Then in WSL2:
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

2. **Verify GPU Access**

```bash
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

3. **Start vLLM Embeddings Server**

```bash
cd d:/Work/ai-service-platform

# Start with GPU support
docker-compose -f docker-compose.yml -f docker-compose.embeddings.yml --profile with-gpu up -d vllm-embeddings

# Check logs
docker-compose logs -f vllm-embeddings
```

4. **Wait for Model Download** (first time only, ~500MB)

The first startup will download the BGE-small-en-v1.5 model. Watch the logs:

```bash
docker-compose logs -f vllm-embeddings
```

Wait until you see:
```
INFO:     Application startup complete.
Uvicorn running on http://0.0.0.0:8000
```

5. **Test the Endpoint**

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test embeddings
curl -X POST http://localhost:8000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello world",
    "model": "BAAI/bge-small-en-v1.5"
  }'
```

### Option B: CPU Setup (No GPU Required)

1. **Start CPU Embeddings Server**

```bash
cd d:/Work/ai-service-platform

# Start CPU-only embeddings
docker-compose -f docker-compose.yml -f docker-compose.embeddings.yml --profile cpu-only up -d embeddings-cpu

# Check logs
docker-compose logs -f embeddings-cpu
```

2. **Wait for Model Download** (first time only, ~500MB)

```bash
docker-compose logs -f embeddings-cpu
```

Wait until you see:
```
Server started successfully
```

3. **Update Backend Configuration**

Since CPU service runs on port 8001, update your `.env`:

```env
VLLM_BASE_URL=http://localhost:8001
```

Or in Docker environment:

```env
VLLM_BASE_URL=http://embeddings-cpu:8000
```

4. **Test the Endpoint**

```bash
# Test health
curl http://localhost:8001/health

# Test embeddings
curl -X POST http://localhost:8001/embed \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": "Hello world"
  }'
```

## Backend Configuration

### Update Environment Variables

Edit `packages/backend/.env`:

```env
# For GPU vLLM (default)
VLLM_BASE_URL=http://localhost:8000/v1

# Or for Docker backend
VLLM_BASE_URL=http://vllm-embeddings:8000/v1

# For CPU-only setup
VLLM_BASE_URL=http://localhost:8001
# Or Docker: http://embeddings-cpu:8000
```

### Update Weaviate Service (if using CPU embeddings)

If using the CPU embeddings service, you need to update the Weaviate service to use the correct API format.

Edit `packages/backend/src/modules/weaviate/weaviate.service.ts`:

For CPU embeddings (Hugging Face TEI), the API is different:

```typescript
// Option 1: Keep using OpenAI-compatible format (vLLM GPU)
this.embeddings = new OpenAIEmbeddings({
  modelName: 'BAAI/bge-small-en-v1.5',
  openAIApiKey: 'EMPTY',
  configuration: {
    baseURL: this.configService.get('VLLM_BASE_URL') || 'http://localhost:8000/v1',
    apiKey: 'EMPTY',
  },
});

// Option 2: For CPU embeddings, use direct HTTP calls
// (requires custom implementation)
```

## Verify Everything Works

### 1. Check All Services

```bash
docker-compose ps
```

Expected output:
```
ai-service-postgres     Up (healthy)
ai-service-mongodb      Up (healthy)
ai-service-redis        Up (healthy)
ai-service-weaviate     Up (healthy)
ai-service-vllm-embeddings  Up (healthy)  # or embeddings-cpu
```

### 2. Test End-to-End

1. **Start Backend**

```bash
cd packages/backend
pnpm run start:dev
```

Watch for:
```
[WeaviateService] Connected to Weaviate version: ...
[WeaviateService] Weaviate service initialized successfully
```

2. **Start Frontend**

```bash
cd packages/frontend
pnpm run dev
```

3. **Test Schema Import**

- Go to `http://localhost:3000/dashboard/schema`
- Select a project
- Use "Database Connection" tab
- Connect to a database
- Click "Connect & Import Schema"

4. **Check Backend Logs**

You should now see:
```
[SchemaService] Schema synced for project {id}
[SchemaService] Schema indexing job queued for project {id}
[SchemaIndexingProcessor] Processing schema indexing job... (Attempt 1/3)
[WeaviateService] Indexed document: {uuid} for project {id}
[SchemaIndexingProcessor] Successfully indexed schema for project {id}
```

**No more errors!** ✅

### 3. Verify in Redis

```bash
docker exec -it ai-service-redis redis-cli -a redis_password_123

# Check completed jobs
LRANGE bull:schema-indexing:completed 0 -1

# Should show successful jobs
```

### 4. Verify in Weaviate

```bash
# Check document count
curl http://localhost:8080/v1/objects | jq '.objects | length'

# Should show indexed documents
```

## Troubleshooting

### GPU: CUDA Out of Memory

```bash
# Use smaller batch size or reduce max-model-len
docker-compose -f docker-compose.embeddings.yml stop vllm-embeddings

# Edit docker-compose.embeddings.yml
# Change: --max-model-len 512 to --max-model-len 256

docker-compose -f docker-compose.embeddings.yml --profile with-gpu up -d vllm-embeddings
```

### CPU: Too Slow

```bash
# Use smaller model
# Edit docker-compose.embeddings.yml
# Change model to: sentence-transformers/all-MiniLM-L6-v2 (faster, less accurate)
```

### Connection Refused

```bash
# Check if service is running
docker-compose ps

# Check logs
docker-compose logs vllm-embeddings
# or
docker-compose logs embeddings-cpu

# Restart service
docker-compose restart vllm-embeddings
```

### Model Download Fails

```bash
# Set Hugging Face token if model requires authentication
export HUGGING_FACE_HUB_TOKEN=your_token_here

# Or add to .env
echo "HUGGING_FACE_HUB_TOKEN=your_token" >> .env

# Restart service
docker-compose down vllm-embeddings
docker-compose --profile with-gpu up -d vllm-embeddings
```

## Performance Comparison

| Setup | Speed | Hardware | Use Case |
|-------|-------|----------|----------|
| vLLM GPU | ~100 docs/sec | NVIDIA GPU + 4GB VRAM | Production, high volume |
| CPU TEI | ~10 docs/sec | 4GB RAM | Development, low volume |

## Switching Between GPU and CPU

### Stop GPU, Start CPU

```bash
docker-compose -f docker-compose.embeddings.yml --profile with-gpu down vllm-embeddings
docker-compose -f docker-compose.embeddings.yml --profile cpu-only up -d embeddings-cpu

# Update .env
# VLLM_BASE_URL=http://localhost:8001
```

### Stop CPU, Start GPU

```bash
docker-compose -f docker-compose.embeddings.yml --profile cpu-only down embeddings-cpu
docker-compose -f docker-compose.embeddings.yml --profile with-gpu up -d vllm-embeddings

# Update .env
# VLLM_BASE_URL=http://localhost:8000/v1
```

## Production Recommendations

1. **Use GPU** if available (10x faster)
2. **Set resource limits** in docker-compose
3. **Monitor memory usage** with `docker stats`
4. **Set up health checks** in backend to verify embeddings availability
5. **Cache embeddings** if possible (future enhancement)

## What's Next?

After embeddings are working:

1. ✅ Schema indexing will complete successfully
2. ✅ No more error logs
3. ✅ RAG-enhanced chatbot will work
4. ✅ Semantic search available
5. ✅ Better query generation with context

## Alternative: Use OpenAI Embeddings

If you don't want to run local embeddings:

1. Get OpenAI API key from https://platform.openai.com
2. Update `.env`:

```env
OPENAI_API_KEY=sk-your-key-here
```

3. Update `weaviate.service.ts`:

```typescript
this.embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-ada-002',
  openAIApiKey: this.configService.get('OPENAI_API_KEY'),
});
```

**Cost**: ~$0.0001 per 1K tokens (very cheap for embeddings)

---

**Choose your setup and follow the steps above. Let me know if you encounter any issues!**
