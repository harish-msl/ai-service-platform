@echo off
REM Development startup script for Windows
REM Fixes Node.js 22 webstorage issue with Next.js 15.3.0

echo Starting Next.js development server with Node.js 22 fix...
set NODE_OPTIONS=--no-experimental-webstorage
pnpm run dev
