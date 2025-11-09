@echo off
echo Installing AI SDK packages...

cd packages\frontend

echo Using npm...
npm install --legacy-peer-deps

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ AI SDK packages installed successfully!
    echo.
    echo Next steps:
    echo 1. Replace app/dashboard/chat/page.tsx with modern-page.tsx
    echo 2. Restart your development server
    echo 3. Test the new AI chat interface
) else (
    echo.
    echo ❌ Installation failed. Please check the errors above.
    exit /b 1
)
