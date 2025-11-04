#!/bin/bash

# Test Docker services connectivity

echo "🧪 Testing Docker Services"
echo "=========================="
echo ""

# Test PostgreSQL
echo "Testing PostgreSQL..."
if docker-compose exec -T postgres pg_isready -U ai_service > /dev/null 2>&1; then
    echo "✅ PostgreSQL is healthy"
else
    echo "❌ PostgreSQL is not responding"
fi

# Test MongoDB
echo "Testing MongoDB..."
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB is healthy"
else
    echo "❌ MongoDB is not responding"
fi

# Test Redis
echo "Testing Redis..."
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is healthy"
else
    echo "❌ Redis is not responding"
fi

# Test Weaviate
echo "Testing Weaviate..."
if curl -s http://localhost:8080/v1/.well-known/ready > /dev/null; then
    echo "✅ Weaviate is healthy"
else
    echo "❌ Weaviate is not responding"
fi

# Test Backend
echo "Testing Backend..."
if curl -s http://localhost:3001/api/v1/health/ping > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend is not responding"
fi

echo ""
echo "Test complete!"
