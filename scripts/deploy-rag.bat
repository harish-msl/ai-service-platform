@echo off
REM RAG Deployment Script for Windows - Apply database migration and restart services

echo.
echo ============================================
echo   RAG Phase 1 Deployment (Windows)
echo ============================================
echo.

REM Check if we're in the right directory
if not exist "docker-compose.yml" (
    echo ERROR: Must run from project root ^(ai-service-platform/^)
    exit /b 1
)

REM Step 1: Stop backend
echo.
echo [1/6] Stopping backend service...
docker-compose stop backend

REM Step 2: Apply migration manually via PostgreSQL
echo.
echo [2/6] Applying database migration...
docker-compose exec -T postgres psql -U ai_service -d ai_service < packages\backend\prisma\migrations\20250102000000_add_rag_training_tables\migration.sql

if %errorlevel% neq 0 (
    echo ERROR: Migration failed. Check PostgreSQL connection.
    echo Try: docker-compose logs postgres
    exit /b 1
)

echo Migration applied successfully!

REM Step 3: Kill Node processes and regenerate Prisma
echo.
echo [3/6] Regenerating Prisma client...

REM Kill Node processes that might lock DLL
taskkill /F /IM node.exe 2>nul

REM Wait a moment
timeout /t 2 /nobreak >nul

cd packages\backend

REM Try to generate Prisma client
npx prisma generate

if %errorlevel% neq 0 (
    echo WARNING: Prisma generate failed (DLL lock). Will retry after restart.
)

cd ..\..

REM Step 4: Rebuild backend Docker image
echo.
echo [4/6] Rebuilding backend Docker image...
docker-compose build backend

REM Step 5: Start backend
echo.
echo [5/6] Starting backend service...
docker-compose up -d backend

REM Wait for backend to be healthy
echo.
echo [6/6] Waiting for backend to be healthy...
timeout /t 5 /nobreak >nul

REM Check health (simple version for Windows)
set /a count=0
:healthcheck
set /a count+=1
curl -s http://localhost:3001/api/v1/health >nul 2>&1
if %errorlevel% equ 0 (
    echo Backend is healthy!
    goto :healthy
)

if %count% geq 30 (
    echo ERROR: Backend health check timeout
    echo Check logs: docker-compose logs backend
    exit /b 1
)

echo Attempt %count%/30...
timeout /t 2 /nobreak >nul
goto :healthcheck

:healthy

REM Display Weaviate schema logs
echo.
echo Checking Weaviate schema initialization...
timeout /t 3 /nobreak >nul
docker-compose logs backend | findstr /I "weaviate schema"

REM Success message
echo.
echo ============================================
echo   RAG DEPLOYMENT COMPLETE!
echo ============================================
echo.
echo Next Steps:
echo.
echo 1. Test RAG with a conversation:
echo    - Open http://localhost:3000/dashboard/chat
echo    - Select a project with schema uploaded
echo    - Ask: "Show me total records by month"
echo    - Check logs: docker-compose logs -f backend
echo.
echo 2. Verify RAG storage:
echo    curl http://localhost:8080/v1/objects?class=ConversationExamples
echo.
echo 3. Monitor examples:
echo    docker-compose exec postgres psql -U ai_service -d ai_service
echo    SELECT COUNT^(*^) FROM training_examples;
echo.
echo 4. Check similarity retrieval:
echo    - Ask a similar question again
echo    - Look for logs: "Retrieved X similar examples"
echo.
echo Expected Results:
echo    - First question: No examples ^(baseline^)
echo    - Second similar question: 1 example retrieved
echo    - Third similar question: 2+ examples retrieved
echo    - Week 1: 10-20 examples per active project
echo.
echo Happy learning!
echo.
pause
