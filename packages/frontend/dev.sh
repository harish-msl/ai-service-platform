#!/bin/bash
# Development startup script for Linux/Mac
# Fixes Node.js 22 webstorage issue with Next.js 15.3.0

echo "Starting Next.js development server with Node.js 22 fix..."
export NODE_OPTIONS="--no-experimental-webstorage"
pnpm run dev
