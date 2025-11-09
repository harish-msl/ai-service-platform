#!/bin/bash

echo "Installing AI SDK packages..."

cd packages/frontend

# Try npm first
if command -v npm &> /dev/null; then
    echo "Using npm..."
    npm install --legacy-peer-deps
elif command -v pnpm &> /dev/null; then
    echo "Using pnpm..."
    pnpm install
elif command -v yarn &> /dev/null; then
    echo "Using yarn..."
    yarn install
else
    echo "Error: No package manager found (npm, pnpm, or yarn)"
    exit 1
fi

echo "✅ AI SDK packages installed successfully!"
echo ""
echo "Next steps:"
echo "1. Replace app/dashboard/chat/page.tsx with modern-page.tsx"
echo "2. Restart your development server"
echo "3. Test the new AI chat interface"
