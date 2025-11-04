# 🚀 Quick Start - Embeddings Integration

## Start Backend & Test

```bash
# 1. Start backend
cd packages/backend
pnpm run start:dev

# 2. Watch for these logs:
# ✅ "Initializing CPU embeddings (Hugging Face TEI)"
# ✅ "Connected to Weaviate version: 1.27.5"
# ✅ "Weaviate service initialized successfully"

# 3. Open frontend
# http://localhost:3000/dashboard/schema

# 4. Import a schema and watch backend logs for:
# ✅ "Schema indexing job queued for project {id}"
# ✅ "Processing schema indexing job... (Attempt 1/3)"
# ✅ "Indexed document: {uuid} for project {id}"
# ✅ "Successfully indexed schema for project {id}"
```

## Service Status

| Service | Port | Status |
|---------|------|--------|
| Embeddings CPU | 8001 | ✅ Running |
| Weaviate | 8080 | ✅ Running |
| Redis | 6379 | ✅ Running |
| PostgreSQL | 5432 | ✅ Running |
| Backend | 3001 | ⏳ Start now |
| Frontend | 3000 | ⏳ Start now |

## Troubleshooting

**Backend won't start:**
```bash
# Check embeddings service
docker ps | grep embeddings
# Should show: ai-service-embeddings-cpu (Up)

# Test API
curl -X POST http://localhost:8001/embed \
  -H "Content-Type: application/json" \
  -d '{"inputs": ["test"]}'
# Should return: [[numbers array]]
```

**Wrong configuration:**
```bash
# Check .env
grep VLLM_BASE_URL packages/backend/.env
# Should be: VLLM_BASE_URL=http://localhost:8001
```

## Documentation

- **Integration Details:** `docs/EMBEDDINGS-INTEGRATION-COMPLETE.md`
- **Summary:** `docs/EMBEDDINGS-SUMMARY.md`
- **Setup Guide:** `docs/VLLM-EMBEDDINGS-SETUP.md`

## What Changed

✅ **Added Files:**
- `packages/backend/src/modules/weaviate/huggingface-embeddings.ts`
- `docs/EMBEDDINGS-INTEGRATION-COMPLETE.md`
- `docs/EMBEDDINGS-SUMMARY.md`
- `scripts/test-embeddings-integration.sh`

✅ **Modified Files:**
- `packages/backend/src/modules/weaviate/weaviate.service.ts`
- `packages/backend/.env`
- `packages/backend/package.json` (added axios)

✅ **Services:**
- Started: `ai-service-embeddings-cpu` on port 8001

## Success Indicators

When you start the backend, you should see:
1. ✅ No "Failed to index document" errors
2. ✅ "Weaviate service initialized successfully"
3. ✅ Schema imports complete quickly (< 2 seconds)
4. ✅ Indexing jobs succeed without retries

---

**Ready to test! Start the backend now.** 🚀
