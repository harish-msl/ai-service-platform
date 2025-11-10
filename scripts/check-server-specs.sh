#!/bin/bash

# ============================================
# AI Service Platform - Server Specification Checker
# Run this on your Linux server to determine optimal configuration
# ============================================

echo "============================================"
echo "AI SERVICE PLATFORM"
echo "Server Specification Check"
echo "============================================"
echo ""
echo "Collecting hardware information..."
echo ""

# Create output file
OUTPUT_FILE="server-specs-$(date +%Y%m%d_%H%M%S).txt"

{
echo "========================================="
echo "AI Service Platform - Server Specifications"
echo "Report Generated: $(date)"
echo "========================================="
echo ""

# 1. Operating System
echo "=== OPERATING SYSTEM ==="
if [ -f /etc/os-release ]; then
    cat /etc/os-release | grep -E "PRETTY_NAME|VERSION"
else
    echo "OS: $(uname -s)"
fi
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo ""

# 2. CPU Information
echo "=== CPU DETAILS ==="
if command -v lscpu &> /dev/null; then
    echo "Model: $(lscpu | grep 'Model name' | cut -d':' -f2 | xargs)"
    echo "Architecture: $(lscpu | grep 'Architecture' | cut -d':' -f2 | xargs)"
    echo "CPU(s): $(lscpu | grep '^CPU(s):' | cut -d':' -f2 | xargs)"
    echo "Cores per socket: $(lscpu | grep 'Core(s) per socket' | cut -d':' -f2 | xargs)"
    echo "Threads per core: $(lscpu | grep 'Thread(s) per core' | cut -d':' -f2 | xargs)"
    echo "CPU MHz: $(lscpu | grep 'CPU MHz' | cut -d':' -f2 | xargs)"
    CPU_COUNT=$(lscpu | grep '^CPU(s):' | cut -d':' -f2 | xargs)
else
    echo "CPU count: $(nproc)"
    CPU_COUNT=$(nproc)
fi
echo ""

# 3. RAM Information
echo "=== MEMORY DETAILS ==="
if command -v free &> /dev/null; then
    free -h
    echo ""
    TOTAL_RAM=$(free -h | awk '/^Mem:/{print $2}')
    AVAILABLE_RAM=$(free -h | awk '/^Mem:/{print $7}')
    echo "Total RAM: $TOTAL_RAM"
    echo "Available RAM: $AVAILABLE_RAM"
    
    # Extract numeric value for comparison
    RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
else
    echo "Memory information not available"
    RAM_GB=0
fi
echo ""

# 4. GPU Information (CRITICAL for AI workloads)
echo "=== GPU DETAILS ==="
GPU_PRESENT=0
if command -v nvidia-smi &> /dev/null; then
    echo "✓ NVIDIA GPU DETECTED"
    echo ""
    nvidia-smi --query-gpu=index,name,memory.total,driver_version,cuda_version --format=csv
    echo ""
    nvidia-smi
    GPU_PRESENT=1
    
    # Extract VRAM
    VRAM_MB=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -1)
    VRAM_GB=$((VRAM_MB / 1024))
else
    echo "✗ No NVIDIA GPU detected (nvidia-smi not found)"
    echo ""
    echo "Checking for other GPUs..."
    lspci | grep -i vga
    lspci | grep -i '3d'
    VRAM_GB=0
fi
echo ""

# 5. Storage Information
echo "=== STORAGE DETAILS ==="
df -h | grep -E "Filesystem|/$|/home|/opt"
echo ""
echo "Total Disk Space:"
df -h --total | grep 'total'
echo ""

# 6. Docker Information
echo "=== DOCKER STATUS ==="
DOCKER_INSTALLED=0
if command -v docker &> /dev/null; then
    echo "✓ Docker installed: $(docker --version)"
    if command -v docker-compose &> /dev/null; then
        echo "✓ Docker Compose: $(docker-compose --version 2>/dev/null)"
    elif docker compose version &> /dev/null; then
        echo "✓ Docker Compose: $(docker compose version)"
    else
        echo "✗ Docker Compose NOT installed"
    fi
    
    if systemctl is-active docker &> /dev/null; then
        echo "✓ Docker service: Running"
    else
        echo "⚠ Docker service: Not running"
    fi
    DOCKER_INSTALLED=1
else
    echo "✗ Docker NOT installed"
fi
echo ""

# 7. Network Information
echo "=== NETWORK DETAILS ==="
echo "Hostname: $(hostname)"
if command -v hostname &> /dev/null; then
    echo "Internal IP: $(hostname -I | awk '{print $1}')"
fi
echo "External IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unable to fetch')"
echo ""

# 8. Available Ports Check
echo "=== PORT AVAILABILITY ==="
echo "Checking required ports..."
PORTS_OK=1
for port in 3000 3001 5432 27017 6379 8080 11434 8000 8001 8002 8003; do
    if command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            echo "Port $port: IN USE ⚠"
            PORTS_OK=0
        else
            echo "Port $port: Available ✓"
        fi
    elif command -v ss &> /dev/null; then
        if ss -tuln 2>/dev/null | grep -q ":$port "; then
            echo "Port $port: IN USE ⚠"
            PORTS_OK=0
        else
            echo "Port $port: Available ✓"
        fi
    fi
done
echo ""

# 9. System Resources Summary
echo "=== RESOURCE SUMMARY ==="
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo "Running Processes: $(ps aux | wc -l)"
echo "Logged in Users: $(who | wc -l)"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
echo ""

# 10. RECOMMENDATION ENGINE
echo "========================================="
echo "✨ RECOMMENDED CONFIGURATION"
echo "========================================="
echo ""

RECOMMENDATION=""
DEPLOYMENT_TYPE=""
MODEL_CHOICE=""
EXPECTED_PERFORMANCE=""

if [ $GPU_PRESENT -eq 1 ]; then
    if [ $VRAM_GB -ge 24 ]; then
        DEPLOYMENT_TYPE="vLLM (GPU-Accelerated) - ENTERPRISE"
        MODEL_CHOICE="Qwen2.5-Coder-7B (FP16) or Qwen2.5-14B"
        EXPECTED_PERFORMANCE="Response: 1-3s | Users: 30-50+ | Quality: 9.5/10"
        RECOMMENDATION="⭐ BEST OPTION: Use vLLM with 7B model in FP16
Your GPU has excellent VRAM. You can run large models with high quality.

Configuration:
  - docker-compose.vllm.yml
  - VLLM_BASE_URL=http://vllm-qwen-coder-7b:8001/v1
  - Model: Qwen/Qwen2.5-Coder-7B-Instruct
  - Options: --dtype float16 --max-model-len 8192
  
Can also run MULTIPLE models simultaneously for different use cases."
    
    elif [ $VRAM_GB -ge 16 ]; then
        DEPLOYMENT_TYPE="vLLM (GPU-Accelerated) - PRODUCTION"
        MODEL_CHOICE="Qwen2.5-Coder-7B (FP16)"
        EXPECTED_PERFORMANCE="Response: 2-4s | Users: 20-30 | Quality: 9/10"
        RECOMMENDATION="✓ RECOMMENDED: Use vLLM with 7B model in FP16
Your GPU is perfect for production workloads.

Configuration:
  - docker-compose.vllm.yml
  - VLLM_BASE_URL=http://vllm-qwen-coder-7b:8001/v1
  - Model: Qwen/Qwen2.5-Coder-7B-Instruct
  - Options: --dtype float16 --gpu-memory-utilization 0.85"
    
    elif [ $VRAM_GB -ge 12 ]; then
        DEPLOYMENT_TYPE="vLLM (GPU-Accelerated) - STANDARD"
        MODEL_CHOICE="Qwen2.5-Coder-7B (INT8 quantized)"
        EXPECTED_PERFORMANCE="Response: 2-5s | Users: 15-25 | Quality: 8.5/10"
        RECOMMENDATION="✓ GOOD OPTION: Use vLLM with 7B model (INT8 quantization)
Your GPU can handle 7B with quantization for reduced memory usage.

Configuration:
  - docker-compose.vllm.yml
  - VLLM_BASE_URL=http://vllm-qwen-coder-7b:8001/v1
  - Model: Qwen/Qwen2.5-Coder-7B-Instruct
  - Options: --quantization int8 --max-model-len 4096"
    
    elif [ $VRAM_GB -ge 8 ]; then
        DEPLOYMENT_TYPE="Hybrid (vLLM 3B or Ollama 7B)"
        MODEL_CHOICE="Qwen2.5-Coder-3B via vLLM OR Qwen2.5-Coder-7B via Ollama"
        EXPECTED_PERFORMANCE="Response: 5-15s | Users: 10-15 | Quality: 8/10"
        RECOMMENDATION="⚠ CONSIDER: Either vLLM with 3B model OR Ollama with 7B
Your GPU has limited VRAM. Two options:

Option 1 (Faster): vLLM with 3B model
  - docker-compose.vllm.yml
  - Smaller model but GPU acceleration
  
Option 2 (Better Quality): Ollama with 7B on GPU
  - Ollama can use GPU for better performance
  - OLLAMA_MODEL=qwen2.5-coder:7b"
    
    else
        DEPLOYMENT_TYPE="Ollama (CPU/Small GPU)"
        MODEL_CHOICE="Qwen2.5-Coder-3B"
        EXPECTED_PERFORMANCE="Response: 15-25s | Users: 5-10 | Quality: 8/10"
        RECOMMENDATION="⚠ GPU detected but VRAM very limited
Use Ollama with 3B model (will use GPU if possible, fallback to CPU)

Configuration:
  - Ollama container
  - OLLAMA_MODEL=qwen2.5-coder:3b
  - USE_OLLAMA=true"
    fi
else
    # No GPU - CPU only
    if [ $CPU_COUNT -ge 16 ] && [ $RAM_GB -ge 32 ]; then
        DEPLOYMENT_TYPE="Ollama (CPU-Only) - HIGH END"
        MODEL_CHOICE="Qwen2.5-Coder-3B"
        EXPECTED_PERFORMANCE="Response: 15-25s | Users: 8-12 | Quality: 8/10"
        RECOMMENDATION="✓ CPU-ONLY OPTION: Use Ollama with 3B model
Your CPU is powerful. Can handle 3B model reasonably well.

Configuration:
  - Ollama container
  - OLLAMA_MODEL=qwen2.5-coder:3b
  - USE_OLLAMA=true
  - USE_DIRECT_OLLAMA=true
  
For production, consider adding a GPU for better performance."
    
    elif [ $CPU_COUNT -ge 8 ] && [ $RAM_GB -ge 16 ]; then
        DEPLOYMENT_TYPE="Ollama (CPU-Only) - STANDARD"
        MODEL_CHOICE="Qwen2.5-Coder-3B or Qwen2.5-1.5B"
        EXPECTED_PERFORMANCE="Response: 20-35s | Users: 5-8 | Quality: 7.5/10"
        RECOMMENDATION="⚠ CPU-ONLY: Use Ollama with smaller model
Your CPU can run small models but will be slower.

Configuration:
  - Ollama container
  - OLLAMA_MODEL=qwen2.5-coder:3b (slower, better quality)
  - OR OLLAMA_MODEL=qwen2.5:1.5b (faster, lower quality)
  
RECOMMENDATION: Add GPU for production workloads."
    
    else
        DEPLOYMENT_TYPE="NOT RECOMMENDED FOR PRODUCTION"
        MODEL_CHOICE="N/A"
        EXPECTED_PERFORMANCE="Very Slow"
        RECOMMENDATION="⛔ WARNING: Server specs too low for production
Your server does not meet minimum requirements.

Minimum Requirements:
  - CPU: 8+ cores (you have: $CPU_COUNT)
  - RAM: 16GB+ (you have: $RAM_GB GB)
  - GPU: Recommended for production
  
This setup is only suitable for development/testing with very light load."
    fi
fi

echo "📊 Deployment Type: $DEPLOYMENT_TYPE"
echo "🤖 Model Choice: $MODEL_CHOICE"
echo "⚡ Expected Performance: $EXPECTED_PERFORMANCE"
echo ""
echo "💡 RECOMMENDATION:"
echo "$RECOMMENDATION"
echo ""

# 11. Next Steps
echo "========================================="
echo "📝 NEXT STEPS"
echo "========================================="
echo ""
echo "1. Review this report carefully"
echo "2. Choose your deployment configuration above"
echo "3. Follow the deployment guide:"
echo "   docs/LINUX-SERVER-DEPLOYMENT.md"
echo ""
echo "4. Required files to configure:"
echo "   - .env (root directory)"
echo "   - packages/backend/.env"
echo "   - packages/frontend/.env.local"
echo ""
echo "5. Install Docker (if not installed):"
if [ $DOCKER_INSTALLED -eq 0 ]; then
    echo "   curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "   sudo sh get-docker.sh"
fi
if [ $GPU_PRESENT -eq 1 ] && [ $DOCKER_INSTALLED -eq 1 ]; then
    echo ""
    echo "6. Install NVIDIA Container Toolkit (for GPU):"
    echo "   See: docs/LINUX-SERVER-DEPLOYMENT.md (Step 2.1)"
fi
echo ""
echo "📋 Save this report:"
echo "   This report saved to: $OUTPUT_FILE"
echo ""

} | tee "$OUTPUT_FILE"

echo "========================================="
echo "✅ Specification Check Complete!"
echo "========================================="
echo ""
echo "Report saved to: $OUTPUT_FILE"
echo ""
echo "Share this file with your deployment team or"
echo "refer to it when configuring your .env files."
echo ""
echo "For detailed deployment instructions, see:"
echo "  docs/LINUX-SERVER-DEPLOYMENT.md"
echo ""
