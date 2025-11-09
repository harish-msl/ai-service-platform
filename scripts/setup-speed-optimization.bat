@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 🚀 Speed Optimization Setup Script
echo ========================================
echo.

REM Step 1: Pull qwen2.5:0.5b model using Docker
echo 📥 Step 1: Pulling qwen2.5:0.5b model via Ollama Docker...
echo.

REM Check if Ollama container is running
docker ps | findstr "ai-service-ollama" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ⚠️  Ollama container not running. Starting it...
    docker-compose -f docker-compose.ollama.yml --profile cpu up -d ollama
    timeout /t 10 /nobreak >nul
)

REM Pull the 0.5b model
echo Pulling qwen2.5:0.5b model...
docker exec ai-service-ollama ollama pull qwen2.5:0.5b

if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to pull model. Is Ollama container running?
    echo 💡 Try: docker-compose -f docker-compose.ollama.yml --profile cpu up -d
    pause
    exit /b 1
)

echo ✅ Model pulled successfully
echo.

REM Step 2: Update .env file
echo 📝 Step 2: Updating .env file...
cd packages\backend

REM Backup existing .env
if exist .env (
    copy .env .env.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul
    echo ✅ Backed up existing .env
)

REM Update or add OLLAMA_MODEL
findstr /C:"OLLAMA_MODEL=" .env >nul 2>&1
if %ERRORLEVEL% equ 0 (
    powershell -Command "(gc .env) -replace 'OLLAMA_MODEL=.*', 'OLLAMA_MODEL=qwen2.5:0.5b' | Out-File -encoding ASCII .env"
    echo ✅ Updated OLLAMA_MODEL to qwen2.5:0.5b
) else (
    echo OLLAMA_MODEL=qwen2.5:0.5b >> .env
    echo ✅ Added OLLAMA_MODEL=qwen2.5:0.5b to .env
)

REM Update or add ENABLE_RAG
findstr /C:"ENABLE_RAG=" .env >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ENABLE_RAG=true >> .env
    echo ✅ Added ENABLE_RAG=true to .env
)

REM Update or add USE_DIRECT_OLLAMA
findstr /C:"USE_DIRECT_OLLAMA=" .env >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo USE_DIRECT_OLLAMA=true >> .env
    echo ✅ Added USE_DIRECT_OLLAMA=true to .env
)

echo.

REM Step 3: Generate Prisma client
echo 🔧 Step 3: Generating Prisma client...
echo ⚠️  If you see EPERM errors, please:
echo    1. Stop the backend server (Ctrl+C)
echo    2. Close VSCode/any IDE with files open
echo    3. Run this script again
echo.
echo Attempting to generate Prisma client...

npx prisma generate

if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to generate Prisma client
    echo 💡 Try manually:
    echo    1. Stop all Node processes
    echo    2. cd packages\backend
    echo    3. npx prisma generate
    pause
    exit /b 1
)

echo ✅ Prisma client generated successfully
echo.

REM Step 4: Verify setup
echo 🔍 Step 4: Verifying setup...

echo Checking Ollama models in Docker...
docker exec ai-service-ollama ollama list | findstr "qwen2.5:0.5b"

if %ERRORLEVEL% equ 0 (
    echo ✅ Model qwen2.5:0.5b is available
) else (
    echo ⚠️  Model qwen2.5:0.5b not found in ollama list
)

echo.
echo Current configuration:
findstr "OLLAMA_MODEL" .env 2>nul || echo ⚠️  OLLAMA_MODEL not set
findstr "ENABLE_RAG" .env 2>nul || echo ⚠️  ENABLE_RAG not set
findstr "USE_DIRECT_OLLAMA" .env 2>nul || echo ⚠️  USE_DIRECT_OLLAMA not set

echo.
echo ==================================
echo ✨ Setup Complete!
echo ==================================
echo.
echo 📋 Next Steps:
echo    1. Restart your backend:
echo       cd packages\backend ^&^& pnpm run start:dev
echo.
echo    2. Test the speed:
echo       - Simple query should be ^<0.5s
echo       - Complex query should be ^<2s
echo.
echo    3. Generate project context:
echo       POST /api/v1/projects/:projectId/context/generate
echo.
echo 📖 Full documentation: docs\SPEED-OPTIMIZATION-COMPLETE.md
echo.

pause
