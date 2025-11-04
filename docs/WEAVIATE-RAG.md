# Weaviate Vector Search & RAG Documentation

## Overview

The AI Service Platform uses **Weaviate** as a vector database to enable **Retrieval Augmented Generation (RAG)**. This allows AI services to retrieve relevant context from project schemas, documentation, and conversation history to provide more accurate and contextually aware responses.

## Architecture

```
┌─────────────────┐
│   User Query    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│   AI Service    │─────▶│  Weaviate Search │
│ (Query/Chat)    │      │  (Semantic)      │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         │                        ▼
         │               ┌──────────────────┐
         │               │ Relevant Context │
         │               │  (Top 5-10 docs) │
         │               └────────┬─────────┘
         │                        │
         ▼                        ▼
┌─────────────────────────────────┐
│    Enhanced Prompt with RAG     │
│  (Original Query + Context)     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│   LLM (vLLM)    │
│  Generate SQL   │
│   or Answer     │
└─────────────────┘
```

## Automatic Schema Indexing

### When Schemas are Indexed

Schemas are **automatically indexed** to Weaviate when:

1. **Manual Upload**: POST /schema/upload
2. **Auto-Discovery**: POST /schema/sync

### What Gets Indexed

For each project schema, the system creates **3 types of documents**:

| Document Type | Content | Purpose |
|---------------|---------|---------|
| **Full Schema** | Complete DDL with all tables | Comprehensive context |
| **Schema Summary** | Human-readable markdown | Quick understanding |
| **Table Chunks** | Individual table definitions | Precise table-level retrieval |

### Example Indexed Documents

```typescript
// Document 1: Full Schema
{
  projectId: "abc-123",
  content: "CREATE TABLE users (id UUID PRIMARY KEY, email VARCHAR(255)...);\nCREATE TABLE posts (id UUID PRIMARY KEY...)...",
  metadata: {
    type: "schema",
    subType: "full",
    projectName: "MyProject"
  }
}

// Document 2: Schema Summary
{
  projectId: "abc-123",
  content: "Database Schema Summary:\n- users table: Stores user authentication...\n- posts table: User-generated content...",
  metadata: {
    type: "schema",
    subType: "summary"
  }
}

// Document 3: Table Chunk
{
  projectId: "abc-123",
  content: "CREATE TABLE users (id UUID PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL...);",
  metadata: {
    type: "schema",
    subType: "table",
    tableName: "users"
  }
}
```

## API Endpoints

### 1. Manual Document Indexing

**POST /weaviate/index**

Index any content manually (documentation, queries, notes).

```bash
curl -X POST http://localhost:3001/api/v1/weaviate/index \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-uuid",
    "content": "The users table implements OAuth 2.0 authentication with refresh tokens stored in user_sessions...",
    "metadata": {
      "projectId": "project-uuid",
      "projectName": "MyProject",
      "type": "documentation",
      "subType": "auth-docs",
      "author": "John Doe",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }'
```

Response:
```json
{
  "success": true,
  "documentId": "d3e8f4a2-1b5c-4d6e-9f7a-8c3e2d1b0a9f"
}
```

### 2. Semantic Search

**GET /weaviate/search**

Search across all indexed documents using natural language.

**Query Parameters:**
- `query` (required): Search query
- `projectId` (optional): Filter by project
- `type` (optional): Filter by document type (`schema`, `conversation`, `query`, `documentation`)
- `limit` (optional): Number of results (default: 5, max: 20)

**Examples:**

```bash
# Search all documents
curl "http://localhost:3001/api/v1/weaviate/search?query=user+authentication&limit=5" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Search within specific project
curl "http://localhost:3001/api/v1/weaviate/search?query=users+table&projectId=abc-123&limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Search only schemas
curl "http://localhost:3001/api/v1/weaviate/search?query=primary+key&type=schema" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Response:
```json
{
  "query": "user authentication",
  "results": [
    {
      "id": "d3e8f4a2-1b5c-4d6e-9f7a-8c3e2d1b0a9f",
      "content": "CREATE TABLE users (id UUID PRIMARY KEY, email VARCHAR(255)...)",
      "metadata": {
        "projectId": "abc-123",
        "projectName": "MyProject",
        "type": "schema",
        "subType": "table",
        "tableName": "users",
        "createdAt": "2025-01-01T00:00:00Z"
      },
      "score": 0.94,
      "distance": 0.06
    },
    {
      "id": "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6",
      "content": "The users table implements OAuth 2.0 authentication...",
      "metadata": {
        "projectId": "abc-123",
        "type": "documentation",
        "subType": "auth-docs"
      },
      "score": 0.87,
      "distance": 0.13
    }
  ],
  "count": 2
}
```

**Score Interpretation:**
- **0.9 - 1.0**: Highly relevant (exact match)
- **0.8 - 0.9**: Very relevant
- **0.7 - 0.8**: Moderately relevant
- **< 0.7**: Low relevance

### 3. Get RAG Context

**GET /weaviate/context**

Retrieves formatted context for AI prompts (used internally by AI services).

**Query Parameters:**
- `query` (required): User's question or query
- `projectId` (required): Project UUID
- `maxTokens` (optional): Maximum tokens (default: 2000, max: 8000)

```bash
curl "http://localhost:3001/api/v1/weaviate/context?query=show+active+users&projectId=abc-123&maxTokens=2000" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Response:
```json
{
  "query": "show active users",
  "projectId": "abc-123",
  "context": "--- schema (relevance: 95.2%) ---\nCREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email VARCHAR(255) UNIQUE NOT NULL,\n  status VARCHAR(20) DEFAULT 'active',\n  created_at TIMESTAMP DEFAULT NOW()\n);\n\n--- documentation (relevance: 88.1%) ---\nUser Status Values:\n- active: User is currently active\n- inactive: User has been deactivated\n- suspended: User account is temporarily suspended",
  "characterCount": 312,
  "estimatedTokens": 78
}
```

### 4. Get Document by ID

**GET /weaviate/document/:id**

Retrieve a specific indexed document.

```bash
curl http://localhost:3001/api/v1/weaviate/document/d3e8f4a2-1b5c-4d6e-9f7a-8c3e2d1b0a9f \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 5. Delete Document

**DELETE /weaviate/document/:id**

Delete a specific document from Weaviate.

```bash
curl -X DELETE http://localhost:3001/api/v1/weaviate/document/d3e8f4a2-1b5c-4d6e-9f7a-8c3e2d1b0a9f \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 6. Delete All Project Documents

**DELETE /weaviate/project/:projectId**

Delete all indexed documents for a project (useful when deleting a project).

```bash
curl -X DELETE http://localhost:3001/api/v1/weaviate/project/abc-123 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Response:
```json
{
  "success": true,
  "deletedCount": 15
}
```

### 7. Get Statistics

**GET /weaviate/stats**

Get Weaviate collection statistics.

```bash
curl http://localhost:3001/api/v1/weaviate/stats \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Response:
```json
{
  "totalDocuments": 245,
  "className": "AIServicePlatform",
  "isHealthy": true
}
```

## RAG in AI Services

### SQL Query Generation with RAG

**How it works:**

1. User asks: "Show me all active users registered in the last 30 days"
2. System searches Weaviate for relevant schema information
3. Retrieves top 5 relevant documents (tables, schema summaries)
4. Combines retrieved context with user question in prompt
5. LLM generates SQL with enhanced accuracy

**Request:**

```bash
curl -X POST http://localhost:3001/api/v1/ai/query/generate \
  -H "X-API-Key: proj_abc123_development_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Show me all active users registered in the last 30 days",
    "projectId": "abc-123"
  }'
```

**Response:**

```json
{
  "query": "SELECT * FROM users WHERE status = 'active' AND created_at >= NOW() - INTERVAL '30 days'",
  "explanation": "This query retrieves all users with an 'active' status who were created within the last 30 days.",
  "dialect": "POSTGRESQL",
  "confidence": 0.92,
  "usedVectorContext": true
}
```

**Key Indicator**: `usedVectorContext: true` means the query was enhanced with RAG.

### Chatbot with RAG

**How it works:**

1. User asks: "What tables are related to user authentication?"
2. System searches Weaviate for relevant context
3. Retrieves schemas, documentation, previous conversations
4. Chatbot responds with context-aware answer

**Request:**

```bash
curl -X POST http://localhost:3001/api/v1/ai/chat \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What tables are related to user authentication?",
    "projectId": "abc-123"
  }'
```

**Response:**

```json
{
  "conversationId": "conv-uuid",
  "message": "Based on your database schema, there are three main tables related to user authentication:\n\n1. **users** - Stores user credentials including email and hashed passwords\n2. **user_sessions** - Manages active user sessions and refresh tokens\n3. **user_roles** - Defines user permissions and access levels\n\nThese tables work together to provide OAuth 2.0 authentication with role-based access control.",
  "timestamp": "2025-01-01T12:00:00Z",
  "usedVectorContext": true
}
```

## Document Types

### Supported Types

| Type | Auto-Indexed | Description | Example Use Case |
|------|--------------|-------------|------------------|
| **schema** | ✅ Yes | Database DDL, table definitions | SQL generation, schema questions |
| **conversation** | ❌ No | Chat message history | Conversation context retrieval |
| **query** | ❌ No | Previously generated SQL queries | Query recommendations |
| **documentation** | ❌ Manual | Project documentation, notes | General Q&A, onboarding |

### Metadata Structure

All indexed documents include standardized metadata:

```typescript
interface DocumentMetadata {
  projectId: string;        // Required
  projectName: string;      // Required
  type: 'schema' | 'conversation' | 'query' | 'documentation';  // Required
  createdAt: string;        // ISO 8601 timestamp
  
  // Optional custom fields
  subType?: string;         // e.g., 'table', 'summary', 'auth-docs'
  tableName?: string;       // For schema type
  author?: string;          // Document creator
  version?: string;         // Document version
  tags?: string[];          // Search tags
  [key: string]: any;       // Additional custom fields
}
```

## Best Practices

### 1. Schema Management

✅ **DO:**
- Always upload schemas to enable RAG for SQL generation
- Keep schemas up-to-date by re-syncing after database changes
- Include meaningful table and column comments in DDL

❌ **DON'T:**
- Don't index test or temporary schemas
- Don't forget to delete schema documents when removing projects

### 2. Document Indexing

✅ **DO:**
- Index comprehensive documentation for better Q&A
- Use descriptive `subType` fields for categorization
- Include relevant metadata for filtering

❌ **DON'T:**
- Don't index sensitive data (passwords, API keys, PII)
- Don't index duplicate content
- Don't index very large documents (> 10,000 characters)

### 3. Search Optimization

✅ **DO:**
- Use specific queries ("users table authentication") vs vague ("data")
- Filter by `projectId` for project-specific searches
- Use `type` filter when searching specific document categories
- Set appropriate `limit` based on context window (5-10 for prompts)

❌ **DON'T:**
- Don't use single-word queries (too broad)
- Don't retrieve too many results (context window limit)
- Don't ignore relevance scores (< 0.7 is often noise)

### 4. Context Length Management

✅ **DO:**
- Use `maxTokens` parameter to control context size
- Default 2000 tokens works for most SQL generation tasks
- Increase to 4000-8000 for complex documentation Q&A
- Respect LLM context window limits

❌ **DON'T:**
- Don't exceed 8000 tokens (diminishing returns + cost)
- Don't include irrelevant context just to fill tokens

### 5. Maintenance

✅ **DO:**
- Monitor Weaviate stats regularly
- Clean up old documents when projects are deleted
- Re-index schemas after major database changes
- Keep Weaviate version updated

❌ **DON'T:**
- Don't let total documents grow unbounded
- Don't ignore failed indexing attempts (check logs)

## Complete Example Workflow

### Step 1: Upload Schema (Auto-Indexed)

```bash
curl -X POST http://localhost:3001/api/v1/schema/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc-123",
    "schemaText": "CREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email VARCHAR(255) UNIQUE NOT NULL,\n  password_hash VARCHAR(255) NOT NULL,\n  status VARCHAR(20) DEFAULT '\''active'\'',\n  created_at TIMESTAMP DEFAULT NOW()\n);\n\nCREATE TABLE posts (\n  id UUID PRIMARY KEY,\n  user_id UUID REFERENCES users(id),\n  title VARCHAR(500) NOT NULL,\n  content TEXT,\n  published BOOLEAN DEFAULT FALSE,\n  created_at TIMESTAMP DEFAULT NOW()\n);",
    "dialect": "POSTGRESQL"
  }'
```

### Step 2: Index Additional Documentation

```bash
curl -X POST http://localhost:3001/api/v1/weaviate/index \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc-123",
    "content": "User Status Field:\n- active: User can log in and use the system\n- inactive: User account is disabled\n- suspended: Temporary ban due to policy violation\n\nPosts Table:\n- published=true means post is visible to all users\n- published=false means post is in draft mode",
    "metadata": {
      "projectId": "abc-123",
      "projectName": "MyProject",
      "type": "documentation",
      "subType": "field-descriptions",
      "author": "System Admin",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }'
```

### Step 3: Verify Indexing

```bash
curl "http://localhost:3001/api/v1/weaviate/search?query=user+status&projectId=abc-123" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Step 4: Generate SQL with RAG

```bash
curl -X POST http://localhost:3001/api/v1/ai/query/generate \
  -H "X-API-Key: proj_abc123_development_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Count all active users",
    "projectId": "abc-123"
  }'
```

Response:
```json
{
  "query": "SELECT COUNT(*) FROM users WHERE status = 'active'",
  "explanation": "This query counts all users with an active status",
  "dialect": "POSTGRESQL",
  "confidence": 0.95,
  "usedVectorContext": true
}
```

### Step 5: Chat with RAG-Enhanced Context

```bash
curl -X POST http://localhost:3001/api/v1/ai/chat \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain the relationship between users and posts",
    "projectId": "abc-123"
  }'
```

Response:
```json
{
  "conversationId": "conv-uuid",
  "message": "The users and posts tables have a **one-to-many relationship**:\n\n- Each user can create multiple posts\n- The posts table has a foreign key 'user_id' that references users.id\n- Posts can be in draft mode (published=false) or published (published=true)\n- When a user is deleted, you should handle orphaned posts according to your ON DELETE policy",
  "timestamp": "2025-01-01T12:00:00Z",
  "usedVectorContext": true
}
```

## Troubleshooting

### Issue: Documents not being indexed

**Check:**
1. Weaviate service is running: `docker ps | grep weaviate`
2. Schema upload succeeded (check API response)
3. Backend logs for indexing errors: `docker logs ai-service-backend | grep Weaviate`

**Solution:**
```bash
# Restart Weaviate
docker-compose restart weaviate

# Manually re-index schema
curl -X POST http://localhost:3001/api/v1/schema/upload ...
```

### Issue: Low relevance scores

**Possible Causes:**
- Query too vague (e.g., "data" vs "user authentication data")
- Wrong document type (searching conversations when you need schemas)
- No matching content indexed

**Solution:**
- Make queries more specific
- Use correct type filters
- Index more relevant documentation

### Issue: Context too large for LLM

**Solution:**
```bash
# Reduce maxTokens
curl "http://localhost:3001/api/v1/weaviate/context?query=...&maxTokens=1000"

# Or reduce search limit
curl "http://localhost:3001/api/v1/weaviate/search?query=...&limit=3"
```

### Issue: Weaviate connection failed

**Check:**
```bash
# Check Weaviate health
curl http://localhost:8080/v1/.well-known/ready

# Check environment variables
cat .env | grep WEAVIATE

# Check Docker network
docker network inspect ai-service-platform_ai-service-network
```

## Configuration

### Environment Variables

```bash
# .env
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=  # Optional, leave empty for anonymous access
VLLM_BASE_URL=http://localhost:8000/v1  # For embeddings
```

### Weaviate Schema

Collection: `AIServicePlatform`

Properties:
- `content` (text): Document content
- `projectId` (text): Project UUID
- `projectName` (text): Project name
- `type` (text): Document type
- `metadata` (text): JSON string of additional metadata
- `createdAt` (text): ISO 8601 timestamp

Vector: 1536 dimensions (OpenAI text-embedding-ada-002 compatible)

## Performance Considerations

- **Indexing Speed**: ~100ms per document (depends on content length)
- **Search Speed**: ~50-100ms for semantic search (5-10 results)
- **Storage**: ~10KB per schema, ~1KB per documentation chunk
- **Embedding Model**: Configurable (default: OpenAI-compatible endpoint via vLLM)

## Next Steps

- [View AI Module Documentation](./AI-MODULE.md)
- [View Schema Module Documentation](./SCHEMA-MODULE.md)
- [View Complete API Reference](./API-REFERENCE.md)
