# 🚀 Quick Fix: Using Ollama Instead of vLLM (CPU Mode)

## Problem
vLLM's CPU mode has compatibility issues in Docker on Windows. The container crashes with device detection errors.

## Solution: Use Ollama
Ollama is designed for CPU and works perfectly on Windows/WSL2/Docker.

---

## 🎯 Option 1: Simple Ollama (Recommended for CPU)

### Step 1: Stop vLLM
```bash
docker-compose -f docker-compose.vllm.yml down
```

### Step 2: Start Ollama
```bash
# Start Ollama
docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  --restart unless-stopped \
  ollama/ollama:latest

# Wait 10 seconds for startup
sleep 10

# Pull the model (Qwen2.5 7B - similar to vLLM model)
docker exec ollama ollama pull qwen2.5:7b
```

### Step 3: Start OpenAI-Compatible Wrapper
```bash
cd scripts

# Install dependencies
pip install fastapi uvicorn httpx pydantic

# Run the wrapper (this makes Ollama compatible with your backend)
python ollama-api.py
```

**That's it!** Your chat will now work on http://localhost:8003 🎉

---

## 🎯 Option 2: Docker Compose with Ollama

### Step 1: Start Ollama services
```bash
# Start Ollama
docker-compose -f docker-compose.ollama.yml --profile cpu up -d ollama

# Wait for Ollama to be ready
sleep 15

# Pull the model
docker-compose -f docker-compose.ollama.yml --profile cpu run --rm ollama-pull
```

### Step 2: Start the API wrapper
```bash
cd scripts
python ollama-api.py
```

---

## 🎯 Option 3: Use Mock Mode (Quickest)

If you just want to test the UI without AI:

### Keep mock mode enabled
```bash
# In packages/backend/.env
USE_MOCK_CHAT=true
```

### Restart backend
```bash
cd packages/backend
pnpm run start:dev
```

Chat will work immediately with mock responses!

---

## ⚙️ Configure Backend for Ollama

### Update backend .env
```bash
# Edit packages/backend/.env

# Comment out vLLM
# VLLM_QWEN_7B_URL=http://localhost:8003/v1

# Add Ollama (via wrapper)
VLLM_QWEN_7B_URL=http://localhost:8003/v1

# Disable mock mode
USE_MOCK_CHAT=false
```

### Restart backend
```bash
cd packages/backend
pnpm run start:dev
```

---

## 🧪 Test It Works

### Test Ollama directly
```bash
# Check health
curl http://localhost:11434/api/tags

# Test completion
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:7b",
  "prompt": "Hello! Who are you?",
  "stream": false
}'
```

### Test OpenAI-compatible API
```bash
# Check health
curl http://localhost:8003/health

# List models
curl http://localhost:8003/v1/models

# Test chat
curl http://localhost:8003/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:7b",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

### Test from frontend
1. Go to http://localhost:3000/dashboard/chat
2. Send a message: "Hi!"
3. You should get a real AI response! 🎉

---

## 📊 Performance Comparison

| Mode | Speed | Memory | Best For |
|------|-------|--------|----------|
| vLLM GPU | ⚡⚡⚡⚡⚡ 50-100 tok/s | 8GB VRAM | Production |
| vLLM CPU | ❌ Doesn't work in Docker | - | Not recommended |
| **Ollama CPU** | ⚡⚡ 5-15 tok/s | 8GB RAM | **Development/Testing** |
| Ollama GPU | ⚡⚡⚡⚡ 30-50 tok/s | 8GB VRAM | Production (easy setup) |
| Mock Mode | ⚡⚡⚡⚡⚡ Instant | 0 | UI testing only |

---

## 🎯 Recommended Setup

### For Development (Your Laptop)
```bash
✅ Use Ollama CPU mode (Option 1)
✅ Responses in 5-15 seconds
✅ Works perfectly on Windows
✅ Easy to setup (3 commands)
```

### For Staging (Server with GPU)
```bash
✅ Install Ollama with GPU support
OR
✅ Use vLLM GPU mode (faster but complex)
✅ Responses in 1-2 seconds
```

---

## 🐛 Troubleshooting

### Ollama not responding
```bash
# Check if running
docker ps | grep ollama

# Check logs
docker logs ollama

# Restart
docker restart ollama
```

### Model not found
```bash
# List installed models
docker exec ollama ollama list

# Pull model
docker exec ollama ollama pull qwen2.5:7b
```

### Wrapper API not starting
```bash
# Check Python version (need 3.8+)
python --version

# Install dependencies
pip install fastapi uvicorn httpx pydantic

# Run with debug
cd scripts
python ollama-api.py
```

### Backend still using mock mode
```bash
# Check .env file
cat packages/backend/.env | grep USE_MOCK

# Should show: USE_MOCK_CHAT=false

# Restart backend
cd packages/backend
pnpm run start:dev
```

---

## 💡 Why Ollama?

✅ **Designed for CPU** - Works perfectly without GPU  
✅ **Easy to use** - 3 commands to get started  
✅ **Docker-friendly** - No compatibility issues  
✅ **Model library** - Easy to switch models  
✅ **Memory efficient** - Uses less RAM than vLLM  
✅ **Windows compatible** - Works on WSL2/Docker Desktop  
✅ **OpenAI format** - Our wrapper makes it compatible  

---

## 🚀 Next Steps

1. **Run Option 1** (simplest):
   ```bash
   docker run -d --name ollama -p 11434:11434 ollama/ollama:latest
   docker exec ollama ollama pull qwen2.5:7b
   cd scripts && python ollama-api.py
   ```

2. **Update backend .env**:
   ```bash
   USE_MOCK_CHAT=false
   VLLM_QWEN_7B_URL=http://localhost:8003/v1
   ```

3. **Test chat** at http://localhost:3000/dashboard/chat

4. **Enjoy real AI responses!** 🎉

---

**Questions? Run into issues? Let me know!** 💬
