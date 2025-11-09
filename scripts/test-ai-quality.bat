@echo off
REM AI Quality Validation Test Script (Windows)
REM Tests if improvements are working correctly

echo =========================================
echo AI Quality Improvements - Validation Test
echo =========================================
echo.

echo Step 1: Checking backend status...
docker ps | findstr "ai-service-backend" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [32m✓ Backend is running[0m
) else (
    echo [31m✗ Backend is not running[0m
    echo Run: docker-compose up -d backend
    exit /b 1
)

echo.
echo Step 2: Checking Ollama model availability...
docker exec ollama ollama list | findstr "qwen2.5-coder:3b" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [32m✓ qwen2.5-coder:3b model is available[0m
) else (
    echo [31m✗ Model not found[0m
    echo Run: docker exec ollama ollama pull qwen2.5-coder:3b
    exit /b 1
)

echo.
echo Step 3: Checking backend logs...
docker logs ai-service-backend 2>&1 | findstr "NestApplication" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [32m✓ Backend started successfully[0m
) else (
    echo [33m⚠ Backend may have startup issues[0m
    echo Check logs: docker logs ai-service-backend
)

echo.
echo Step 4: Testing health endpoint...
curl -s http://localhost:3001/api/v1/health | findstr "ok healthy" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [32m✓ Backend health check passed[0m
) else (
    echo [33m⚠ Backend health check failed (may need time to start)[0m
)

echo.
echo =========================================
echo [32mValidation Complete![0m
echo =========================================
echo.
echo Next Steps:
echo 1. Login to your application: http://localhost:3000
echo 2. Navigate to Survey project chat
echo 3. Test query: 'Generate a bar or line chart based on specific information'
echo.
echo Expected Improvements:
echo   ✓ AI should use survey_responses, surveys, questions tables
echo   ✓ No mock data in Chart.js config
echo   ✓ SQL queries should focus on survey domain
echo   ✓ Response time: 15-25 seconds
echo.
echo Check documentation: docs\AI-QUALITY-IMPROVEMENTS.md
echo.
pause
