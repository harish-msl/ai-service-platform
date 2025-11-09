#!/bin/bash

echo "🎬 Testing Ollama Streaming Response"
echo "======================================"
echo ""

# Test streaming with qwen2.5:1.5b
echo "📡 Sending streaming request to Ollama..."
echo ""

curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:1.5b",
    "messages": [
      {
        "role": "user",
        "content": "Count from 1 to 5 slowly"
      }
    ],
    "stream": true,
    "options": {
      "num_predict": 50
    }
  }' \
  --no-buffer

echo ""
echo ""
echo "✅ Streaming test complete!"
echo ""
echo "Expected behavior:"
echo "  - Tokens should appear one by one (not all at once)"
echo "  - Each line is a JSON object with 'message.content'"
echo "  - Last line has 'done: true'"
