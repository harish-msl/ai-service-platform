@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo vLLM Embeddings Quick Setup (Windows)
echo ==========================================
echo.

cd /d "%~dp0.."

REM Check for GPU
echo Checking for NVIDIA GPU...
nvidia-smi >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] NVIDIA GPU detected
    set HAS_GPU=1
    nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
) else (
    echo [WARN] No NVIDIA GPU detected
    set HAS_GPU=0
)
echo.

REM Choose setup
if %HAS_GPU% equ 1 (
    echo Choose embeddings setup:
    echo 1^) GPU-accelerated ^(vLLM^) - Recommended, requires NVIDIA GPU
    echo 2^) CPU-only ^(Hugging Face TEI^) - Slower but works everywhere
    echo.
    set /p CHOICE="Enter choice (1 or 2): "
) else (
    echo No GPU detected. Using CPU-only setup.
    set CHOICE=2
)
echo.

if "%CHOICE%"=="1" (
    echo ==========================================
    echo Setting up GPU-accelerated embeddings
    echo ==========================================
    echo.
    
    REM Test GPU access
    docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Docker GPU access not working
        echo.
        echo Please install NVIDIA Container Toolkit:
        echo https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html
        pause
        exit /b 1
    )
    
    echo [OK] Docker GPU access verified
    echo.
    
    REM Update .env
    echo Updating .env configuration...
    powershell -Command "(gc .env) -replace '^VLLM_BASE_URL=.*', 'VLLM_BASE_URL=http://localhost:8000/v1' | Out-File -encoding ASCII .env"
    echo [OK] Configuration updated
    echo.
    
    REM Start service
    echo Starting vLLM embeddings server...
    echo [NOTE] First startup will download ~500MB model
    echo.
    
    docker-compose -f docker-compose.yml -f docker-compose.embeddings.yml --profile with-gpu up -d vllm-embeddings
    
    echo.
    echo Waiting for service to be ready...
    echo [NOTE] This may take 2-5 minutes on first run...
    echo.
    
    REM Wait for health check (5 minute timeout)
    set /a WAITED=0
    :wait_gpu_loop
    timeout /t 5 /nobreak >nul
    curl -sf http://localhost:8000/health >nul 2>&1
    if %errorlevel% equ 0 goto gpu_ready
    
    set /a WAITED+=5
    if %WAITED% lss 300 (
        echo|set /p="."
        goto wait_gpu_loop
    )
    
    echo [ERROR] Service did not become ready in time
    echo Check logs: docker-compose logs vllm-embeddings
    pause
    exit /b 1
    
    :gpu_ready
    echo.
    echo [OK] vLLM embeddings service is ready!
    echo.
    
    REM Test embeddings
    echo Testing embeddings endpoint...
    curl -s -X POST http://localhost:8000/v1/embeddings -H "Content-Type: application/json" -d "{\"input\": \"Hello world\", \"model\": \"BAAI/bge-small-en-v1.5\"}" > test.json
    findstr /C:"embedding" test.json >nul
    if %errorlevel% equ 0 (
        echo [OK] Embeddings working!
        del test.json
    ) else (
        echo [ERROR] Embeddings test failed
        del test.json
        pause
        exit /b 1
    )
    
) else if "%CHOICE%"=="2" (
    echo ==========================================
    echo Setting up CPU-only embeddings
    echo ==========================================
    echo.
    
    REM Update .env
    echo Updating .env configuration...
    powershell -Command "(gc .env) -replace '^VLLM_BASE_URL=.*', 'VLLM_BASE_URL=http://localhost:8001' | Out-File -encoding ASCII .env"
    echo [OK] Configuration updated
    echo.
    
    REM Start service
    echo Starting CPU embeddings server...
    echo [NOTE] First startup will download ~500MB model
    echo.
    
    docker-compose -f docker-compose.yml -f docker-compose.embeddings.yml --profile cpu-only up -d embeddings-cpu
    
    echo.
    echo Waiting for service to be ready...
    echo [NOTE] This may take 1-3 minutes on first run...
    echo.
    
    REM Wait for health check (3 minute timeout)
    set /a WAITED=0
    :wait_cpu_loop
    timeout /t 5 /nobreak >nul
    curl -sf http://localhost:8001/health >nul 2>&1
    if %errorlevel% equ 0 goto cpu_ready
    
    set /a WAITED+=5
    if %WAITED% lss 180 (
        echo|set /p="."
        goto wait_cpu_loop
    )
    
    echo [ERROR] Service did not become ready in time
    echo Check logs: docker-compose logs embeddings-cpu
    pause
    exit /b 1
    
    :cpu_ready
    echo.
    echo [OK] CPU embeddings service is ready!
    echo.
    
    REM Test embeddings
    echo Testing embeddings endpoint...
    curl -s -X POST http://localhost:8001/embed -H "Content-Type: application/json" -d "{\"inputs\": \"Hello world\"}" > test.json
    findstr /C:"[" test.json >nul
    if %errorlevel% equ 0 (
        echo [OK] Embeddings working!
        del test.json
    ) else (
        echo [ERROR] Embeddings test failed
        del test.json
        pause
        exit /b 1
    )
    
) else (
    echo [ERROR] Invalid choice
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo.
echo 1. Restart your backend:
echo    cd packages\backend
echo    pnpm run start:dev
echo.
echo 2. Test schema import:
echo    - Go to http://localhost:3000/dashboard/schema
echo    - Import a schema
echo    - Check logs for successful indexing
echo.
echo 3. Monitor the service:
if "%CHOICE%"=="1" (
    echo    docker-compose logs -f vllm-embeddings
) else (
    echo    docker-compose logs -f embeddings-cpu
)
echo.
echo [SUCCESS] Embeddings service is now running!
echo.
pause
