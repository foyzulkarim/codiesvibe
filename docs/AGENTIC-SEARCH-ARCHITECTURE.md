# CodiesVibe Agentic Search Architecture

Technical reference documentation for the LangGraph-based semantic search system.

**Version**: 3.0 (Schema-Driven Architecture)
**Last Updated**: December 2024

---

## Overview

CodiesVibe implements an **agentic search system** that separates intent understanding, query planning, and execution into distinct LLM-powered and deterministic nodes. This architecture enables:

- **Interpretability**: Each stage produces inspectable, human-readable output
- **Debuggability**: Execution plans can be examined and modified
- **Optimization**: Each stage can be optimized independently
- **Extensibility**: New domains can be added via schema configuration

### Core Principle

> **Schema → Collections → Query Planning → Agentic Search**
>
> The schema architecture is the foundation. Without schema identifying which attributes deserve separate embeddings, there would be no multi-vector collections. Without collections, no intelligent routing. Without routing, basic keyword search.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CODIESVIBE SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DATA INGESTION (Admin UI)                                  │
│  Tool Create/Update → MongoDB → Async Sync → Qdrant (4x)    │
│                                                              │
│  SEARCH PIPELINE (User Queries)                             │
│  Query → LangGraph → Multi-Vector Search → Fused Results    │
│          ├─ Cache Check (Deterministic)                     │
│          ├─ Intent Extractor (LLM)                          │
│          ├─ Query Planner (LLM)                             │
│          ├─ Query Executor (Deterministic)                  │
│          └─ Cache Store (Deterministic)                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| MongoDB | Source of truth, structured data | Document store |
| Qdrant | Vector search | 4 specialized collections |
| LangGraph | Pipeline orchestration | State machine |
| Together AI | LLM inference | Intent + Planning |
| Plan Cache | Query plan reuse | MongoDB (exact-match) |

---

## The 3-Node LLM Pipeline

### Node 1: Intent Extractor

**File**: `search-api/src/graphs/nodes/intent-extractor.node.ts`

Transforms natural language queries into structured intent using schema-driven prompts.

**Input**: Raw user query
**Output**: Structured `IntentState` with controlled vocabulary values

```typescript
// Example transformation
Input: "AI code completion tools that work locally"
Output: {
  primaryGoal: "find",
  functionality: "Code Completion",
  deployment: "Local",
  confidence: 0.9
}
```

**Key Features**:
- Schema-driven prompts with controlled vocabularies
- Prevents hallucination via constrained output space
- Confidence scoring for fallback handling

### Node 2: Query Planner

**File**: `search-api/src/graphs/nodes/query-planner.node.ts`

Determines optimal retrieval strategy based on extracted intent.

**Input**: `IntentState`
**Output**: `QueryPlan` with collection routing and fusion method

```typescript
// Example plan
{
  strategy: "capability-focused",
  vectorSources: [
    { collection: "functionality", topK: 20 },
    { collection: "tools", topK: 15 }
  ],
  structuredSources: [
    { source: "mongodb", filters: [...] }
  ],
  fusion: "rrf",  // LLM decides: 'rrf' | 'weighted_sum' | 'none'
  confidence: 0.85
}
```

**Strategy Selection**:
- `identity-focused`: Reference tool queries → tools collection
- `capability-focused`: Feature queries → functionality collection
- `usecase-focused`: Problem queries → usecases collection
- `multi-collection-hybrid`: Complex queries → multiple collections

**Dynamic Fusion Selection**:
- 3+ sources → RRF (rank-based, scale-invariant)
- 2 sources → Weighted Sum
- 1 source → No fusion needed

### Node 3: Query Executor

**File**: `search-api/src/graphs/nodes/query-executor.node.ts`

Executes the plan deterministically against databases.

**Input**: `QueryPlan`
**Output**: Ranked `Candidate[]` results

**Operations**:
1. Parallel vector queries to Qdrant collections
2. Structured filtering via MongoDB
3. Result fusion (method determined by planner)
4. Deduplication and final ranking

---

## Multi-Vector Search Strategy

### Vector Collections

| Collection | Embedding Type | Use Case |
|------------|---------------|----------|
| `tools` | Semantic | General tool descriptions |
| `functionality` | Functional | Feature-focused queries |
| `usecases` | Use-case | Problem-oriented queries |
| `interface` | Technical | Deployment/platform queries |

### Result Fusion

The **Query Planner** (LLM) selects the fusion method based on the number and type of sources:

```typescript
// query-executor.node.ts
finalCandidates = fuseResults(
  candidatesBySource,
  executionPlan.fusion || 'rrf'  // Fallback to RRF
);
```

**Reciprocal Rank Fusion (RRF)**:
```
RRF(d) = Σ(r∈R) 1 / (k + r(d))

where:
- d = document
- R = set of rankers (collections)
- r(d) = rank of document d in ranker r
- k = constant (default: 60)
```

**Why RRF**:
- No score normalization required
- Handles different score scales across collections
- Robust to outliers
- Works well without training data

---

## Schema-Driven Architecture

### The Foundation

The schema defines:
1. Which attributes get separate embeddings
2. Which vector collections exist
3. What vocabularies constrain LLM output
4. How the planner routes queries

```
NO SCHEMA                          WITH SCHEMA
    ↓                                  ↓
Single blob embedding             Distinct semantic aspects
    ↓                                  ↓
1 generic collection              4 specialized collections
    ↓                                  ↓
No routing possible               Intelligent query routing
    ↓                                  ↓
Basic keyword search              Agentic multi-vector search
```

### Schema Structure

**File**: `search-api/src/domains/tools/tools.schema.ts`

```typescript
interface DomainSchema {
  name: string;
  version: string;
  vocabularies: {
    categories: string[];      // e.g., "Code Completion", "AI Assistant"
    functionality: string[];   // e.g., "Code Generation", "Debugging"
    pricingModels: string[];   // "Free", "Paid"
    deployment: string[];      // "Cloud", "Local", "Hybrid"
    interface: string[];       // "CLI", "Web", "IDE Extension"
    industries: string[];
    userTypes: string[];
  };
  intentFields: IntentFieldDefinition[];
  vectorCollections: VectorCollectionDefinition[];
  structuredDatabase: StructuredDatabaseDefinition;
}
```

### Layer Separation

```
Core Framework (Domain-Agnostic)
  ├─ schema.types.ts      → Interface definitions
  ├─ schema.validator.ts  → Validation logic
  ├─ prompt.generator.ts  → Dynamic prompt generation
  └─ pipeline.init.ts     → Schema loading

Domain Layer (Tools-Specific)
  ├─ tools.schema.ts      → Vocabularies, collections
  ├─ tools.filters.ts     → MongoDB filter building
  └─ tools.validators.ts  → Query plan validation
```

---

## Plan Caching

**Files**:
- `search-api/src/graphs/nodes/cache-check.node.ts`
- `search-api/src/services/llm/plan-cache.service.ts`

### How It Works

```
Query → MD5 Hash → Cache Lookup → [HIT] → Skip LLM nodes → Execute
                               → [MISS] → Full pipeline → Cache Store
```

### Why Exact-Match Only

We intentionally avoid semantic similarity matching:

```typescript
/**
 * Semantically similar queries may require different execution plans.
 * Example: "free code editors" ≈ "paid code editors" have similar
 * embeddings but need opposite filters!
 */
```

### Cache Benefits

- Skip 2 LLM calls per cache hit
- 5-10x faster response times
- 60-80% cost reduction after warmup

---

## MongoDB-Qdrant Sync System

### The Problem

- User creates/updates tool via Admin UI
- MongoDB persists immediately
- Qdrant vectors become stale
- Search returns outdated information

### Architecture

```
User Action (Create/Update/Delete)
    ↓
MongoDB Write (ALWAYS succeeds)
    ↓
Async Sync Trigger (fire-and-forget)
    ↓
Tool Sync Service
    ├─ Calculate SHA-256 hash per collection
    ├─ Detect which collections need updates
    ├─ Generate embeddings for changed fields
    └─ Upsert to Qdrant (4 collections in parallel)
    ↓
Update syncMetadata per collection
    ↓
Background Worker (every 60s)
    ├─ Find failed/pending syncs
    ├─ Retry with exponential backoff
    └─ Update retry counts
```

### Per-Collection Status Tracking

```typescript
syncMetadata: {
  collections: {
    tools: {
      status: "synced",
      contentHash: "abc123def456",
      lastSyncedAt: Date,
      vectorId: "tool_123"
    },
    functionality: {
      status: "pending",
      contentHash: "old_hash",
      retryCount: 2,
      lastError: "Qdrant timeout"
    }
  }
}
```

### Smart Change Detection

- SHA-256 hash per collection's relevant fields
- Only syncs collections where hash changed
- Example: Changing `pricing` doesn't re-embed `functionality`
- Reduces unnecessary embedding API calls by ~60%

### Retry Strategy

```
Attempt 1: Immediate (during async trigger)
Attempt 2: After 1 minute
Attempt 3: After 2 minutes
Attempt 4: After 4 minutes
Attempt 5: After 8 minutes
Max backoff: 1 hour
Max retries: 5
```

### Sync API Endpoints

```
GET  /api/sync/status          Overall sync health
GET  /api/sync/stats           Aggregated statistics
GET  /api/sync/worker          Worker status
POST /api/sync/sweep           Trigger manual sweep
POST /api/sync/retry/:toolId   Retry specific tool
POST /api/sync/retry-all       Retry all failed
POST /api/sync/reset/:toolId   Reset sync status
GET  /api/sync/tool/:toolId    Get tool sync status
GET  /api/sync/failed          List failed syncs
GET  /api/sync/pending         List pending syncs
```

### Implementation Files

| File | Lines | Purpose |
|------|-------|---------|
| `services/sync/tool-sync.service.ts` | ~750 | Core sync logic |
| `services/sync/sync-worker.service.ts` | ~550 | Background worker |
| `services/indexing/content-hash.service.ts` | ~220 | Hash calculation |
| `routes/sync.routes.ts` | ~600 | API endpoints |

---

## Key Algorithms

### Prompt Engineering for Structured Output

```typescript
const prompt = `
Extract intent from the query and respond with JSON.

Available Categories: ${schema.vocabularies.categories.join(', ')}
Available Functionality: ${schema.vocabularies.functionality.join(', ')}
// ... more vocabularies

Required Fields:
${schema.intentFields.map(field =>
  `- ${field.name} (${field.type}): ${field.description}`
).join('\n')}

Query: "${userQuery}"

Respond with valid JSON only.
`;
```

### Query Plan Validation

```typescript
function validateQueryPlan(plan: QueryPlan): ValidationResult {
  const errors: string[] = [];

  // Check collection availability
  const enabledCollections = getEnabledCollections(schema);
  const invalid = plan.vectorSources.filter(
    vs => !enabledCollections.includes(vs.collection)
  );

  // Check topK bounds
  const invalidTopK = plan.vectorSources.filter(
    vs => vs.topK < 1 || vs.topK > 200
  );

  // Check fusion method compatibility
  if (plan.vectorSources.length > 2 && plan.fusion !== 'rrf') {
    errors.push('RRF required for 3+ vector sources');
  }

  return { valid: errors.length === 0, errors };
}
```

---

## Design Decisions

### Challenge → Solution → Trade-off

| Challenge | Solution | Trade-off |
|-----------|----------|-----------|
| LLM cost/latency | Plan caching (exact-match) | Storage overhead |
| Multi-collection coordination | LLM query planner | Extra LLM call |
| Domain extensibility | Schema-driven architecture | Initial refactoring |
| Result diversity | Dynamic fusion selection | Tuning complexity |
| MongoDB-Qdrant sync | Async with background worker | Eventual consistency |

### Key Design Principles

1. **Async over Sync**: Don't block users waiting for embeddings
2. **Failure Isolation**: MongoDB write always succeeds; sync retries later
3. **Per-Collection Granularity**: Track status independently
4. **Content Hashing**: Only sync what actually changed
5. **LLM for Reasoning, DB for Retrieval**: Hybrid approach

---

## File Reference

### Pipeline Nodes
```
search-api/src/graphs/nodes/
├─ cache-check.node.ts       Cache lookup
├─ intent-extractor.node.ts  LLM intent extraction
├─ query-planner.node.ts     LLM query planning
├─ query-executor.node.ts    Deterministic execution
└─ cache-store.node.ts       Cache persistence
```

### Domain Schema
```
search-api/src/domains/tools/
├─ tools.schema.ts           Vocabularies & collections
├─ tools.filters.ts          MongoDB filter building
├─ tools.validators.ts       Plan validation
└─ index.ts                  Exports
```

### Sync Services
```
search-api/src/services/sync/
├─ tool-sync.service.ts      Core sync logic
└─ sync-worker.service.ts    Background worker
```

### Types
```
search-api/src/types/
├─ intent-state.ts           IntentState schema
├─ query-plan.ts             QueryPlan schema
├─ candidate.ts              Search result type
└─ tool.interfaces.ts        Tool data model
```

### Utilities
```
search-api/src/utils/
└─ fusion.ts                 RRF, weighted sum, concat
```

---

## API Reference

### Search Endpoint

```bash
POST /api/search
Content-Type: application/json

{
  "query": "AI code completion tools that work locally",
  "limit": 10
}
```

**Response** includes:
- `results`: Ranked tool candidates
- `executionPlan`: The query plan used
- `intentState`: Extracted intent
- `metadata`: Timing, cache hit status

### Health Check

```bash
GET /health

{
  "status": "healthy",
  "mongodb": "connected",
  "qdrant": "connected"
}
```

---

## Configuration

### Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/codiesvibe
QDRANT_HOST=localhost
QDRANT_PORT=6333

# LLM
TOGETHER_API_KEY=...

# Search
SEARCH_USE_MULTIVECTOR=true
SEARCH_RRF_K=60
SEARCH_DEFAULT_LIMIT=20
```

### Schema Configuration

Edit `search-api/src/domains/tools/tools.schema.ts` to:
- Add/modify controlled vocabularies
- Enable/disable collections
- Adjust intent field definitions

---

## References

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Reciprocal Rank Fusion Paper](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- [Together AI API](https://docs.together.ai/)
