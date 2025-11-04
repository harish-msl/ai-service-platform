# Running vLLM Models with Docker

This guide explains how to run AI models for the chat feature using vLLM in Docker.

## Prerequisites

### For GPU Mode (Recommended)
- NVIDIA GPU with at least 8GB VRAM (16GB recommended)
- NVIDIA Container Toolkit installed
- Docker with GPU support

### For CPU Mode (Fallback)
- At least 16GB RAM
- 4+ CPU cores
- ⚠️ **Much slower** than GPU mode (responses take 30-60 seconds)

## Quick Start

### Option 1: GPU Mode (Fast - Recommended)

```bash
# Start chat model only (Qwen2.5-7B-Instruct on port 8003)
docker-compose -f docker-compose.vllm.yml --profile gpu up -d vllm-chat

# Check if it's running
docker logs -f ai-service-vllm-chat

# Wait for "Uvicorn running on http://0.0.0.0:8000" message
```

### Option 2: CPU Mode (Slow but works without GPU)

```bash
# Start chat model in CPU mode
docker-compose -f docker-compose.vllm.yml --profile cpu up -d vllm-chat-cpu

# Check logs
docker logs -f ai-service-vllm-chat-cpu

# ⚠️ First start downloads model (~14GB) - takes 5-10 minutes
# ⚠️ Responses will be slower (30-60 seconds per message)
```

### Option 3: All Models (GPU required)

```bash
# Start all AI models (chat, query generation, analytics)
docker-compose -f docker-compose.vllm.yml --profile full up -d

# Requires: 2+ GPUs with 24GB+ total VRAM
```

## After Starting

1. **Disable mock mode** in backend `.env`:
   ```bash
   # Edit packages/backend/.env
   USE_MOCK_CHAT=false
   ```

2. **Restart backend**:
   ```bash
   cd packages/backend
   pnpm run start:dev
   ```

3. **Test chat** - Send a message in the frontend!

## Verify It's Working

### Check Container Status
```bash
# Should show "healthy" status
docker ps | grep vllm-chat

# View logs
docker logs ai-service-vllm-chat
```

### Test API Directly
```bash
# Health check
curl http://localhost:8003/health

# Test completion
curl http://localhost:8003/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-7B-Instruct",
    "prompt": "Hello, who are you?",
    "max_tokens": 50
  }'
```

### Expected Response
You should see JSON with generated text like:
```json
{
  "choices": [{
    "text": "I am an AI assistant..."
  }]
}
```

## Troubleshooting

### Container Exits Immediately
```bash
# Check error logs
docker logs ai-service-vllm-chat

# Common issues:
# 1. Out of memory (GPU or RAM)
# 2. CUDA/GPU not detected
# 3. Model download failed
```

### GPU Not Detected
```bash
# Test NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi

# If this fails, install NVIDIA Container Toolkit:
# https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html
```

### Model Download Slow
```bash
# Models are large (7B = ~14GB, 32B = ~64GB)
# First download takes 5-30 minutes depending on internet speed

# Monitor download progress
docker logs -f ai-service-vllm-chat | grep -i download
```

### Out of Memory
```bash
# For GPU: Reduce max-model-len
# Edit docker-compose.vllm.yml:
command:
  - --max-model-len=2048  # Reduce from 4096

# For CPU: Increase Docker memory limit
# Edit Docker Desktop: Settings → Resources → Memory → 16GB+
```

## Port Mappings

| Service | Port | Model |
|---------|------|-------|
| vllm-chat | 8003 | Qwen2.5-7B-Instruct (Chat) |
| vllm-coder | 8001 | Qwen2.5-Coder-32B (SQL Generation) |
| vllm-analytics | 8002 | DeepSeek-R1-7B (Analytics) |

## Performance Tips

### GPU Mode
- **First request**: 10-20 seconds (model loading)
- **Subsequent requests**: 1-3 seconds
- **Tokens/second**: 50-100 (depends on GPU)

### CPU Mode
- **First request**: 60-120 seconds
- **Subsequent requests**: 30-60 seconds
- **Tokens/second**: 2-5

### Optimization
```bash
# For better performance on multiple GPUs:
command:
  - --tensor-parallel-size=2  # Use 2 GPUs
  - --gpu-memory-utilization=0.9  # Use 90% of VRAM
```

## Model Details

### Qwen2.5-7B-Instruct (Chat)
- **Size**: ~14GB download, ~8GB VRAM
- **Context**: 4096 tokens (~3000 words)
- **Speed**: 50-100 tokens/sec (GPU), 2-5 tokens/sec (CPU)
- **Use**: General chat, Q&A about database

### Qwen2.5-Coder-32B (SQL Generation)
- **Size**: ~64GB download, ~24GB VRAM  
- **Context**: 4096 tokens
- **Speed**: 30-50 tokens/sec (requires 2 GPUs)
- **Use**: SQL query generation from natural language

### DeepSeek-R1-Distill-Qwen-7B (Analytics)
- **Size**: ~14GB download, ~8GB VRAM
- **Context**: 4096 tokens
- **Speed**: 40-80 tokens/sec
- **Use**: Data analysis, predictions, insights

## Stopping vLLM

```bash
# Stop specific service
docker-compose -f docker-compose.vllm.yml down vllm-chat

# Stop all vLLM services
docker-compose -f docker-compose.vllm.yml --profile gpu down
docker-compose -f docker-compose.vllm.yml --profile cpu down

# Stop and remove volumes (free disk space)
docker-compose -f docker-compose.vllm.yml down -v
```

## Alternative: Run Without Docker

If Docker doesn't work, you can run vLLM directly:

```bash
# Install vLLM
pip install vllm

# Run chat model
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --port 8003 \
  --host 0.0.0.0 \
  --api-key EMPTY \
  --dtype auto

# For CPU only
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --port 8003 \
  --device cpu \
  --dtype float16
```

## FAQ

**Q: Do I need all 3 models?**  
A: No! Just start `vllm-chat` for the chat feature. Other models are optional.

**Q: Can I use a different model?**  
A: Yes! Edit `docker-compose.vllm.yml` and change the `--model=` parameter.

**Q: How much disk space needed?**  
A: ~15GB per 7B model, ~65GB per 32B model (first download only)

**Q: Can I run on Windows without WSL?**  
A: For GPU, you need WSL2 + NVIDIA drivers. CPU mode works natively.

**Q: Model downloads every time?**  
A: No, models are cached in Docker volume `vllm_cache` and reused.

---

**Need help?** Check the logs: `docker logs -f ai-service-vllm-chat`
