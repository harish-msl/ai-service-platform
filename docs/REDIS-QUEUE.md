# Redis Queue for Schema Indexing

## Overview
Implemented Redis/Bull queue for reliable background Weaviate schema indexing with automatic retries.

## What Changed

### 1. New Files Created
- `packages/backend/src/modules/schema/schema-indexing.processor.ts`
  - Bull processor that handles schema indexing jobs
  - Automatic retries on failure (up to 3 attempts)
  - Exponential backoff starting at 5 seconds

### 2. Modified Files

#### `packages/backend/src/app.module.ts`
- Added `BullModule.forRootAsync()` to configure Redis connection
- Uses environment variables: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Configured default job options (keep last 100 completed, retain failed jobs)

#### `packages/backend/src/modules/schema/schema.module.ts`
- Imported `BullModule` and registered `schema-indexing` queue
- Added `SchemaIndexingProcessor` to providers

#### `packages/backend/src/modules/schema/schema.service.ts`
- Injected `schema-indexing` queue in constructor
- Replaced direct indexing calls with `queueSchemaIndexing()` method
- New method adds jobs to queue with retry configuration:
  - 3 retry attempts
  - Exponential backoff (5s, 10s, 20s)
  - Failed jobs kept for debugging
  - Completed jobs auto-removed

## Benefits

### ✅ Non-Blocking
- API responses return immediately after schema sync/upload
- No frontend timeouts even if Weaviate is slow or down

### ✅ Automatic Retries
- Failed indexing attempts retry automatically (3x)
- Exponential backoff prevents overwhelming failing services

### ✅ Resilient
- If Redis is unavailable, queuing failure is logged but doesn't block the main flow
- If Weaviate is down, jobs stay in queue and retry

### ✅ Observable
- Failed jobs remain in Redis for debugging
- Clear logs for each attempt and outcome

## Queue Configuration

```typescript
{
  attempts: 3,              // Retry up to 3 times
  backoff: {
    type: 'exponential',
    delay: 5000,           // Start with 5s, then 10s, 20s
  },
  removeOnComplete: true,  // Auto-cleanup successful jobs
  removeOnFail: false,     // Keep failed jobs for inspection
}
```

## Environment Variables Required

```env
REDIS_HOST=localhost       # Or redis container name in Docker
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

## Testing

### Test Normal Flow
1. Start Redis (already in docker-compose)
2. Start backend
3. Connect & import schema via UI
4. Verify:
   - Quick response (no 30s timeout)
   - Backend logs: "Schema indexing job queued for project {id}"
   - Processor logs: "Processing schema indexing job..."
   - Success log: "Successfully indexed schema..."

### Test Weaviate Failure
1. Stop Weaviate: `docker-compose stop weaviate`
2. Connect & import schema
3. Verify:
   - Still get quick success response
   - Job fails and retries (3 attempts with backoff)
   - Error logged after final failure
   - Failed job visible in Bull Dashboard (if installed)

### Test Redis Failure
1. Stop Redis: `docker-compose stop redis`
2. Connect & import schema
3. Verify:
   - Still get success response
   - Log: "Failed to queue schema indexing..." (non-fatal)
   - Schema stored in database successfully

## Optional: Bull Dashboard

To monitor jobs visually:

```bash
npm install -g bull-board
# Or add to backend as an endpoint
```

## Migration Notes

- All existing code paths unchanged
- Queue is a drop-in replacement for direct indexing
- Backward compatible - if Redis unavailable, logs error but continues

## Next Steps (Optional)

1. **Add Bull Dashboard Endpoint** - Visual monitoring of queue status
2. **Implement Dead Letter Queue** - Move permanently failed jobs to separate queue
3. **Add Metrics** - Track indexing success/failure rates
4. **Webhook Notifications** - Alert when indexing consistently fails
