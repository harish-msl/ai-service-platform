#!/usr/bin/env python3
"""
Ollama OpenAI-Compatible API Wrapper
Runs Ollama with OpenAI-compatible endpoints on port 8003
"""

import os
import json
import time
import uuid
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import uvicorn

# Configuration
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "qwen2.5:7b")
PORT = int(os.getenv("PORT", 8003))

app = FastAPI(title="Ollama OpenAI API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class Message(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str = DEFAULT_MODEL
    messages: List[Message]
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    stream: bool = False

class CompletionRequest(BaseModel):
    model: str = DEFAULT_MODEL
    prompt: str
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    stream: bool = False

@app.get("/")
async def root():
    return {"message": "Ollama OpenAI-Compatible API", "status": "running"}

@app.get("/health")
async def health():
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OLLAMA_HOST}/api/tags", timeout=5.0)
            if response.status_code == 200:
                return {"status": "healthy", "ollama": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama not available: {str(e)}")

@app.get("/v1/models")
async def list_models():
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OLLAMA_HOST}/api/tags")
            if response.status_code == 200:
                ollama_models = response.json().get("models", [])
                models = [
                    {
                        "id": model["name"],
                        "object": "model",
                        "created": int(time.time()),
                        "owned_by": "ollama"
                    }
                    for model in ollama_models
                ]
                return {"object": "list", "data": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    # Convert OpenAI format to Ollama format
    ollama_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    ollama_request = {
        "model": request.model,
        "messages": ollama_messages,
        "stream": request.stream,
        "options": {
            "temperature": request.temperature,
        }
    }
    
    if request.max_tokens:
        ollama_request["options"]["num_predict"] = request.max_tokens

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            if request.stream:
                return StreamingResponse(
                    stream_chat_response(client, ollama_request),
                    media_type="text/event-stream"
                )
            else:
                response = await client.post(
                    f"{OLLAMA_HOST}/api/chat",
                    json=ollama_request
                )
                ollama_response = response.json()
                
                # Convert Ollama response to OpenAI format
                return {
                    "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
                    "object": "chat.completion",
                    "created": int(time.time()),
                    "model": request.model,
                    "choices": [{
                        "index": 0,
                        "message": {
                            "role": "assistant",
                            "content": ollama_response["message"]["content"]
                        },
                        "finish_reason": "stop"
                    }],
                    "usage": {
                        "prompt_tokens": ollama_response.get("prompt_eval_count", 0),
                        "completion_tokens": ollama_response.get("eval_count", 0),
                        "total_tokens": ollama_response.get("prompt_eval_count", 0) + ollama_response.get("eval_count", 0)
                    }
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def stream_chat_response(client: httpx.AsyncClient, ollama_request: dict):
    """Stream chat completions in OpenAI format"""
    request_id = f"chatcmpl-{uuid.uuid4().hex[:8]}"
    
    async with client.stream(
        "POST",
        f"{OLLAMA_HOST}/api/chat",
        json=ollama_request
    ) as response:
        async for line in response.aiter_lines():
            if line:
                try:
                    ollama_chunk = json.loads(line)
                    if "message" in ollama_chunk:
                        content = ollama_chunk["message"].get("content", "")
                        if content:
                            # Convert to OpenAI streaming format
                            chunk = {
                                "id": request_id,
                                "object": "chat.completion.chunk",
                                "created": int(time.time()),
                                "model": ollama_request["model"],
                                "choices": [{
                                    "index": 0,
                                    "delta": {"content": content},
                                    "finish_reason": None
                                }]
                            }
                            yield f"data: {json.dumps(chunk)}\n\n"
                        
                        if ollama_chunk.get("done", False):
                            # Send final chunk
                            final_chunk = {
                                "id": request_id,
                                "object": "chat.completion.chunk",
                                "created": int(time.time()),
                                "model": ollama_request["model"],
                                "choices": [{
                                    "index": 0,
                                    "delta": {},
                                    "finish_reason": "stop"
                                }]
                            }
                            yield f"data: {json.dumps(final_chunk)}\n\n"
                            yield "data: [DONE]\n\n"
                except json.JSONDecodeError:
                    continue

@app.post("/v1/completions")
async def completions(request: CompletionRequest):
    ollama_request = {
        "model": request.model,
        "prompt": request.prompt,
        "stream": request.stream,
        "options": {
            "temperature": request.temperature,
        }
    }
    
    if request.max_tokens:
        ollama_request["options"]["num_predict"] = request.max_tokens

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            if request.stream:
                return StreamingResponse(
                    stream_completion_response(client, ollama_request),
                    media_type="text/event-stream"
                )
            else:
                response = await client.post(
                    f"{OLLAMA_HOST}/api/generate",
                    json=ollama_request
                )
                ollama_response = response.json()
                
                return {
                    "id": f"cmpl-{uuid.uuid4().hex[:8]}",
                    "object": "text_completion",
                    "created": int(time.time()),
                    "model": request.model,
                    "choices": [{
                        "text": ollama_response["response"],
                        "index": 0,
                        "finish_reason": "stop"
                    }],
                    "usage": {
                        "prompt_tokens": ollama_response.get("prompt_eval_count", 0),
                        "completion_tokens": ollama_response.get("eval_count", 0),
                        "total_tokens": ollama_response.get("prompt_eval_count", 0) + ollama_response.get("eval_count", 0)
                    }
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def stream_completion_response(client: httpx.AsyncClient, ollama_request: dict):
    """Stream completions in OpenAI format"""
    request_id = f"cmpl-{uuid.uuid4().hex[:8]}"
    
    async with client.stream(
        "POST",
        f"{OLLAMA_HOST}/api/generate",
        json=ollama_request
    ) as response:
        async for line in response.aiter_lines():
            if line:
                try:
                    ollama_chunk = json.loads(line)
                    text = ollama_chunk.get("response", "")
                    if text:
                        chunk = {
                            "id": request_id,
                            "object": "text_completion",
                            "created": int(time.time()),
                            "model": ollama_request["model"],
                            "choices": [{
                                "text": text,
                                "index": 0,
                                "finish_reason": None
                            }]
                        }
                        yield f"data: {json.dumps(chunk)}\n\n"
                    
                    if ollama_chunk.get("done", False):
                        yield "data: [DONE]\n\n"
                except json.JSONDecodeError:
                    continue

if __name__ == "__main__":
    print(f"🚀 Starting Ollama OpenAI-Compatible API on port {PORT}")
    print(f"📡 Ollama host: {OLLAMA_HOST}")
    print(f"🤖 Default model: {DEFAULT_MODEL}")
    print(f"🌐 Access at: http://localhost:{PORT}")
    print(f"📖 Docs at: http://localhost:{PORT}/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
