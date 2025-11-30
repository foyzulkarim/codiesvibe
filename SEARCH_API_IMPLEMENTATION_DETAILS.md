# Search API Implementation Details & Migration Plan

## Executive Summary

This document provides a comprehensive analysis of the existing AI search API implementation and a detailed migration plan to Cloudflare's serverless stack.

**Current State**: VPS-hosted Express server with LangGraph orchestration ($24/month)
**Target State**: Cloudflare Workers + Workflows with Clerk authentication ($0/month for current usage)

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Detailed Component Analysis](#detailed-component-analysis)
3. [Dependencies Analysis](#dependencies-analysis)
4. [Migration Strategy](#migration-strategy)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Risk Assessment](#risk-assessment)

---

## Current Architecture

### System Overview

```
┌─────────────────────────────────────────────────┐
│         Express Server (VPS)                    │
│         Port: 4003                              │
│                                                 │
│  POST /api/search                               │
│    └→ searchWithAgenticPipeline()               │
│                                                 │
│  POST /api/tools (JWT protected)                │
│  PATCH /api/tools/:id (JWT protected)           │
│  GET /api/tools                                 │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│      LangGraph StateGraph Orchestration         │
│                                                 │
│  Node 1: cache-check                            │
│    └→ MongoDB vector search for cached plans    │
│                                                 │
│  Node 2: intent-extractor (conditional)         │
│    └→ Together AI + LangChain                   │
│                                                 │
│  Node 3: query-planner (conditional)            │
│    └→ Together AI + LangChain                   │
│                                                 │
│  Node 4: query-executor                         │
│    └→ Qdrant vector search + MongoDB filters    │
│                                                 │
│  Node 5: cache-store                            │
│    └→ Store successful results in MongoDB       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│              Data Layer                         │
│                                                 │
│  MongoDB                                        │
│    - tools collection                           │
│    - plans collection (semantic cache)          │
│    - users collection                           │
│                                                 │
│  Qdrant                                         │
│    - tools collection (768-dim vectors)         │
│    - Enhanced multi-vector support              │
└─────────────────────────────────────────────────┘
```

### Key Files Structure

```
search-api/
├── src/
│   ├── server.ts                          # Express server entry point
│   ├── graphs/
│   │   ├── agentic-search.graph.ts        # LangGraph orchestration
│   │   └── nodes/
│   │       ├── cache-check.node.ts        # Cache lookup node
│   │       ├── intent-extractor.node.ts   # LLM intent extraction
│   │       ├── query-planner.node.ts      # LLM query planning
│   │       ├── query-executor.node.ts     # Database execution
│   │       └── cache-store.node.ts        # Cache storage
│   ├── services/
│   │   ├── llm.service.ts                 # Together AI integration
│   │   ├── embedding.service.ts           # Vector embedding generation
│   │   ├── mongodb.service.ts             # MongoDB operations
│   │   ├── qdrant.service.ts              # Qdrant operations
│   │   ├── plan-cache.service.ts          # Semantic caching
│   │   └── auth.service.ts                # JWT authentication
│   ├── types/
│   │   ├── state.ts                       # LangGraph state definition
│   │   ├── intent-state.ts                # Intent extraction types
│   │   ├── query-plan.ts                  # Query planning types
│   │   └── candidate.ts                   # Search result types
│   └── config/
│       ├── database.ts                    # MongoDB + Qdrant config
│       └── constants.ts                   # Application constants
└── package.json
```

---

## Detailed Component Analysis

### 1. LangGraph Orchestration (`agentic-search.graph.ts`)

**Purpose**: Orchestrates the 5-node search pipeline with state management

**Key Components**:
- **StateGraph**: Manages state transitions between nodes
- **MemorySaver**: Provides state persistence (for multi-turn conversations)
- **Conditional Routing**: Skips LLM nodes on cache hits

**Entry Point**:
```typescript
export async function searchWithAgenticPipeline(
  query: string,
  options: {
    threadId?: string;
    enableCheckpoints?: boolean;
    metadata?: Record<string, any>;
  } = {}
): Promise<Partial<typeof StateAnnotation.State>>
```

**State Flow**:
```
START → cache-check
  ├─ [cache hit] → query-executor → cache-store → END
  └─ [cache miss] → intent-extractor → query-planner → query-executor → cache-store → END
```

**Migration Impact**: 🔴 HIGH
- LangGraph is Node.js-specific and not Workers-compatible
- Need to replace with Cloudflare Workflows
- State management logic can be preserved

---

### 2. Node Implementations

#### **cache-check.node.ts**

**Purpose**: Check MongoDB for cached results using vector similarity

**Key Operations**:
1. Generate query hash (MD5)
2. Lookup exact match by hash
3. If no exact match, perform vector similarity search
4. Return cached plan if similarity ≥ 0.90

**External Dependencies**:
- MongoDB (via `plan-cache.service.ts`)
- Embedding service (for vector generation)

**Migration Impact**: 🟡 MEDIUM
- MongoDB operations need Workers-compatible client
- Vector similarity search logic is portable
- Caching strategy remains the same

---

#### **intent-extractor.node.ts**

**Purpose**: Extract user intent using LLM (Together AI)

**Key Operations**:
1. Generate prompt from domain schema
2. Call Together AI via LangChain
3. Parse structured JSON output
4. Return IntentState object

**External Dependencies**:
- `llmService.createTogetherAILangchainClient()`
- `@langchain/core` - JsonOutputParser
- Together AI API

**Migration Impact**: 🟢 LOW
- Together AI calls work in Workers
- LangChain core components work in Workers
- Prompt generation logic is portable

**Code Structure**:
```typescript
const systemPrompt = generateIntentExtractionPrompt(schema);
const llmClient = llmService.createTogetherAILangchainClient();
const intentState = await llmClient.invoke({
  system_prompt: systemPrompt,
  format_instructions: parser.getFormatInstructions(),
  query: userPrompt,
});
```

---

#### **query-planner.node.ts**

**Purpose**: Generate query execution plan using LLM

**Key Operations**:
1. Generate planning prompt from intent + schema
2. Call Together AI via LangChain
3. Parse structured QueryPlan JSON
4. Validate plan using domain handlers

**External Dependencies**:
- `llmService.createTogetherAILangchainClient()`
- Together AI API
- Schema validation logic

**Migration Impact**: 🟢 LOW
- Same as intent-extractor
- Validation logic is pure TypeScript

---

#### **query-executor.node.ts**

**Purpose**: Execute search queries against Qdrant and MongoDB

**Key Operations**:
1. Execute structured searches (MongoDB filters)
2. Execute vector searches (Qdrant similarity)
3. Determine adaptive score threshold
4. Apply fusion (RRF or weighted)
5. Enrich candidates with full MongoDB data

**External Dependencies**:
- `QdrantService` - Vector search
- `MongoDBService` - Structured queries
- `EmbeddingService` - Generate query embeddings
- Fusion utilities

**Migration Impact**: 🟡 MEDIUM
- Qdrant client should work in Workers
- MongoDB client needs adaptation
- Business logic is portable

**Critical Logic**:
```typescript
// Adaptive thresholding
const adaptiveThreshold = hasStructuredResults
  ? 0.7  // Higher threshold if structured results exist
  : 0.5; // Lower threshold for vector-only searches

// Result fusion
const finalCandidates = fuseResults(
  candidatesBySource,
  executionPlan.fusion || 'rrf'
);
```

---

#### **cache-store.node.ts**

**Purpose**: Store successful pipeline results for future reuse

**Key Operations**:
1. Generate query embedding
2. Create plan document
3. Store in MongoDB plans collection
4. Update cache statistics

**External Dependencies**:
- `plan-cache.service.ts`
- MongoDB
- Embedding service

**Migration Impact**: 🟡 MEDIUM
- MongoDB operations need Workers-compatible client
- Embedding generation works in Workers

---

### 3. Services Analysis

#### **llm.service.ts**

**Current Implementation**:
```typescript
createTogetherAILangchainClient() {
  const parser = new JsonOutputParser();
  const prompt = PromptTemplate.fromTemplate(
    `{system_prompt}\n\n{format_instructions}\n\nUser query: {query}`
  );
  const model = new ChatOpenAI({
    configuration: {
      baseURL: 'https://api.together.xyz/v1',
      apiKey: process.env.TOGETHER_API_KEY,
    },
    modelName: 'openai/gpt-oss-20b',
  });
  const chain = prompt.pipe(model).pipe(parser);
  return chain;
}
```

**Migration Strategy**:
- ✅ LangChain `ChatOpenAI` works in Workers
- ✅ Together AI API accessible via fetch
- ⚠️ May need to replace chain syntax with direct fetch calls for better control

---

#### **embedding.service.ts**

**Current Implementation**:
```typescript
async generateEmbedding(text: string): Promise<number[]> {
  const response = await this.togetherClient.embeddings.create({
    model: "togethercomputer/m2-bert-80M-32k-retrieval",
    input: text,
  });
  return response.data[0].embedding;
}
```

**Features**:
- In-memory cache (Map) for embeddings
- Batch processing support
- Together AI integration

**Migration Strategy**:
- ✅ Together AI SDK works in Workers
- ⚠️ Replace in-memory Map cache with Durable Objects or KV
- ✅ Business logic is portable

---

#### **mongodb.service.ts**

**Current Operations**:
```typescript
async getToolById(id: string): Promise<any | null>
async getToolsByIds(ids: string[]): Promise<any[]>
async searchTools(query: any, limit: number): Promise<any[]>
async countTools(query: any): Promise<number>
```

**Migration Strategy**:
- 🔴 Native MongoDB driver doesn't work in Workers
- ✅ Use MongoDB Data API (REST/GraphQL) or Atlas Data API
- ✅ All queries are simple (no aggregation pipelines)

**Example Data API Migration**:
```typescript
// Before (Node.js driver)
await collection.find({ _id: new ObjectId(id) }).toArray();

// After (Workers - Data API)
const response = await fetch(
  `https://data.mongodb-api.com/app/${APP_ID}/endpoint/data/v1/action/find`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': env.MONGODB_API_KEY,
    },
    body: JSON.stringify({
      dataSource: 'Cluster0',
      database: 'toolsearch',
      collection: 'tools',
      filter: { _id: { $oid: id } },
    }),
  }
);
```

---

#### **qdrant.service.ts**

**Current Operations**:
```typescript
async searchByEmbedding(
  queryVector: number[],
  limit: number,
  filter?: any,
  vectorType?: string,
  collection?: string,
  scoreThreshold?: number
): Promise<any[]>

async upsertPoint(
  toolId: string,
  embedding: number[],
  payload: any,
  collection: string
): Promise<void>
```

**Migration Strategy**:
- ✅ `@qdrant/js-client-rest` should work in Workers (REST-based)
- ✅ All operations are simple HTTP calls
- ⚠️ Test thoroughly in Workers environment

---

#### **plan-cache.service.ts**

**Caching Strategy**:
1. **Exact Match**: MD5 hash lookup (fast)
2. **Similar Match**: Vector similarity search with threshold 0.90
3. **Cache Store**: Store with embedding + metadata

**MongoDB Schema**:
```typescript
{
  _id: ObjectId,
  originalQuery: string,
  queryEmbedding: number[],      // 768-dim vector
  intentState: IntentState,
  executionPlan: QueryPlan,
  candidates: Candidate[],
  executionTime: number,
  usageCount: number,
  lastUsed: Date,
  createdAt: Date,
  queryHash: string,             // MD5 hash
  confidence: number,
  metadata: {
    executionPath: string[],
    totalNodesExecuted: number,
    pipelineVersion: string
  }
}
```

**Migration Strategy**:
- ✅ Hashing logic is portable
- ✅ Vector similarity can use MongoDB Atlas Vector Search
- 🔴 Need MongoDB Data API for Workers

---

### 4. Type System

**State Types** (`state.ts`):
```typescript
StateAnnotation = {
  query: string,
  schema: DomainSchema,
  domainHandlers: { buildFilters, validateQueryPlan },
  intentState: IntentState | null,
  executionPlan: QueryPlan | null,
  candidates: Candidate[],
  results: ToolData[],
  executionStats: { ... },
  errors: [ ... ],
  metadata: { ... }
}
```

**Migration Impact**: 🟢 LOW
- All types are pure TypeScript
- No runtime dependencies
- Fully portable to Workers

---

## Dependencies Analysis

### Workers Compatibility Matrix

| Dependency | Current Use | Workers Compatible? | Migration Strategy |
|------------|-------------|---------------------|-------------------|
| `@langchain/langgraph` | Orchestration | ❌ No | Replace with Cloudflare Workflows |
| `@langchain/core` | Utilities | ✅ Partial | Use compatible parts or replace |
| `@langchain/openai` | LLM client | ✅ Yes | Keep or replace with fetch |
| `together-ai` | Embeddings/LLM | ✅ Yes | Keep |
| `mongodb` (native) | Database | ❌ No | Use MongoDB Data API |
| `@qdrant/js-client-rest` | Vector DB | ✅ Likely | Test in Workers |
| `express` | HTTP server | ❌ No | Use Workers request handlers |
| `winston` | Logging | ❌ No | Use console or Workers logging |
| `jsonwebtoken` | JWT auth | ✅ Yes | Or use Clerk |
| `axios` | HTTP client | ✅ Yes | Or use native fetch |

### Critical Path Dependencies

**For Search Pipeline**:
1. Together AI API → ✅ Works in Workers
2. MongoDB → 🔴 Needs Data API adapter
3. Qdrant → ✅ Should work (needs testing)
4. LangGraph → 🔴 Replace with Workflows

**For Authentication**:
1. JWT verification → ✅ Works or use Clerk
2. MongoDB user storage → 🔴 Needs Data API

---

## Migration Strategy

### Phase 1: Foundation (Week 1)

**Objective**: Set up Cloudflare infrastructure and verify database connectivity

**Tasks**:
1. Initialize Cloudflare Workers project
   ```bash
   npm create cloudflare@latest search-api-workers
   cd search-api-workers
   ```

2. Configure wrangler.toml
   ```toml
   name = "search-api"
   main = "src/index.ts"
   compatibility_date = "2024-11-30"

   [vars]
   ENVIRONMENT = "development"

   [[workflows]]
   binding = "SEARCH_WORKFLOW"
   name = "agentic-search-workflow"
   class_name = "AgenticSearchWorkflow"
   ```

3. Set up secrets
   ```bash
   wrangler secret put MONGODB_DATA_API_KEY
   wrangler secret put QDRANT_API_KEY
   wrangler secret put TOGETHER_API_KEY
   wrangler secret put CLERK_SECRET_KEY
   ```

4. Create MongoDB Data API wrapper
   ```typescript
   // src/adapters/mongodb-data-api.ts
   export class MongoDBDataAPI {
     private baseUrl: string;
     private apiKey: string;

     async findOne(collection: string, filter: any) {
       const response = await fetch(`${this.baseUrl}/action/findOne`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'api-key': this.apiKey,
         },
         body: JSON.stringify({
           dataSource: 'Cluster0',
           database: 'toolsearch',
           collection,
           filter,
         }),
       });
       return response.json();
     }

     async find(collection: string, filter: any, limit?: number) { ... }
     async insertOne(collection: string, document: any) { ... }
     async updateOne(collection: string, filter: any, update: any) { ... }
   }
   ```

5. Test Qdrant connectivity
   ```typescript
   // src/adapters/qdrant-client.ts
   import { QdrantClient } from '@qdrant/js-client-rest';

   export function createQdrantClient(env: Env) {
     return new QdrantClient({
       url: env.QDRANT_URL,
       apiKey: env.QDRANT_API_KEY,
     });
   }
   ```

**Success Criteria**:
- ✅ Workers project deploys successfully
- ✅ Can query MongoDB via Data API
- ✅ Can query Qdrant from Workers
- ✅ Environment variables accessible

---

### Phase 2: Node Migration (Week 2)

**Objective**: Port node business logic to Workers-compatible functions

**Tasks**:

1. **Create Workflow Step Functions**

   Each LangGraph node becomes a Workflow step:

   ```typescript
   // src/workflow/steps/cache-check.ts
   export async function cacheCheckStep(
     state: WorkflowState,
     env: Env
   ): Promise<Partial<WorkflowState>> {
     const mongoAPI = new MongoDBDataAPI(env);
     const planCache = new PlanCacheService(mongoAPI);

     const result = await planCache.lookupPlan(state.query);

     if (result.found && result.similarity >= 0.90) {
       return {
         ...state,
         intentState: result.plan.intentState,
         executionPlan: result.plan.executionPlan,
         candidates: result.plan.candidates,
         metadata: {
           ...state.metadata,
           cacheHit: true,
           skipToExecutor: true,
         },
       };
     }

     return {
       ...state,
       metadata: {
         ...state.metadata,
         cacheHit: false,
       },
     };
   }
   ```

2. **Port Intent Extractor**

   ```typescript
   // src/workflow/steps/intent-extractor.ts
   export async function intentExtractorStep(
     state: WorkflowState,
     env: Env
   ): Promise<Partial<WorkflowState>> {
     const systemPrompt = generateIntentExtractionPrompt(state.schema);

     const response = await fetch('https://api.together.xyz/v1/chat/completions', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${env.TOGETHER_API_KEY}`,
       },
       body: JSON.stringify({
         model: 'openai/gpt-oss-20b',
         messages: [
           { role: 'system', content: systemPrompt },
           { role: 'user', content: `Extract intent: "${state.query}"` },
         ],
         response_format: { type: 'json_object' },
       }),
     });

     const data = await response.json();
     const intentState = JSON.parse(data.choices[0].message.content);

     return {
       ...state,
       intentState,
     };
   }
   ```

3. **Port Query Planner** (similar to intent-extractor)

4. **Port Query Executor**

   ```typescript
   // src/workflow/steps/query-executor.ts
   export async function queryExecutorStep(
     state: WorkflowState,
     env: Env
   ): Promise<Partial<WorkflowState>> {
     const mongoAPI = new MongoDBDataAPI(env);
     const qdrantClient = createQdrantClient(env);
     const embeddingService = new EmbeddingService(env);

     // Execute structured searches
     const structuredResults = await executeStructuredSearches(
       state.executionPlan.structuredSources,
       mongoAPI
     );

     // Execute vector searches
     const vectorResults = await executeVectorSearches(
       state.executionPlan.vectorSources,
       state.query,
       qdrantClient,
       embeddingService
     );

     // Fuse results
     const candidates = fuseResults(
       { ...structuredResults, ...vectorResults },
       state.executionPlan.fusion
     );

     return {
       ...state,
       candidates,
     };
   }
   ```

5. **Port Cache Store** (similar to cache-check)

**Success Criteria**:
- ✅ All 5 step functions execute in Workers
- ✅ No Node.js-specific dependencies
- ✅ Tests pass for each step

---

### Phase 3: Workflow Creation (Week 3)

**Objective**: Create Cloudflare Workflow to replace LangGraph

**Tasks**:

1. **Define Workflow Class**

   ```typescript
   // src/workflow/agentic-search.workflow.ts
   import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

   export class AgenticSearchWorkflow extends WorkflowEntrypoint {
     async run(event: WorkflowEvent<WorkflowState>, step: WorkflowStep) {
       // Step 1: Cache Check
       const afterCacheCheck = await step.do('cache-check', async () => {
         return await cacheCheckStep(event.payload, this.env);
       });

       // Conditional: Skip to executor if cache hit
       if (afterCacheCheck.metadata?.skipToExecutor) {
         const afterExecutor = await step.do('query-executor', async () => {
           return await queryExecutorStep(afterCacheCheck, this.env);
         });

         const afterStore = await step.do('cache-store', async () => {
           return await cacheStoreStep(afterExecutor, this.env);
         });

         return afterStore;
       }

       // Step 2: Intent Extraction
       const afterIntent = await step.do('intent-extractor', async () => {
         return await intentExtractorStep(afterCacheCheck, this.env);
       });

       // Step 3: Query Planning
       const afterPlanning = await step.do('query-planner', async () => {
         return await queryPlannerStep(afterIntent, this.env);
       });

       // Step 4: Query Execution
       const afterExecutor = await step.do('query-executor', async () => {
         return await queryExecutorStep(afterPlanning, this.env);
       });

       // Step 5: Cache Storage
       const afterStore = await step.do('cache-store', async () => {
         return await cacheStoreStep(afterExecutor, this.env);
       });

       return afterStore;
     }
   }
   ```

2. **Create Worker Entry Point**

   ```typescript
   // src/index.ts
   export default {
     async fetch(request: Request, env: Env, ctx: ExecutionContext) {
       const url = new URL(request.url);

       if (url.pathname === '/api/search' && request.method === 'POST') {
         const body = await request.json();

         // Trigger workflow
         const instance = await env.SEARCH_WORKFLOW.create({
           params: {
             query: body.query,
             schema: getPipelineSchema(),
             domainHandlers: getDomainHandlers(),
             // ... initial state
           },
         });

         // Wait for completion (or return instance ID for async)
         const result = await instance.result();

         return Response.json({
           query: body.query,
           candidates: result.candidates,
           executionStats: result.executionStats,
           metadata: result.metadata,
         });
       }

       return new Response('Not Found', { status: 404 });
     },
   };
   ```

**Success Criteria**:
- ✅ Workflow executes all 5 steps
- ✅ Conditional routing works (cache hits skip steps)
- ✅ State persistence between steps
- ✅ Error handling works

---

### Phase 4: Authentication (Week 4)

**Objective**: Integrate Clerk for protected endpoints

**Tasks**:

1. **Set up Clerk**

   ```bash
   npm install @clerk/backend
   ```

2. **Create Auth Middleware**

   ```typescript
   // src/middleware/auth.ts
   import { createClerkClient } from '@clerk/backend';

   export async function authenticateRequest(
     request: Request,
     env: Env
   ): Promise<{ userId: string } | null> {
     const clerk = createClerkClient({
       secretKey: env.CLERK_SECRET_KEY,
     });

     const authHeader = request.headers.get('Authorization');
     if (!authHeader?.startsWith('Bearer ')) {
       return null;
     }

     const token = authHeader.substring(7);

     try {
       const verified = await clerk.verifyToken(token);
       return { userId: verified.sub };
     } catch (error) {
       return null;
     }
   }
   ```

3. **Protect Tool Endpoints**

   ```typescript
   // src/index.ts
   if (url.pathname === '/api/tools' && request.method === 'POST') {
     const auth = await authenticateRequest(request, env);
     if (!auth) {
       return new Response('Unauthorized', { status: 401 });
     }

     const body = await request.json();
     const mongoAPI = new MongoDBDataAPI(env);

     const result = await mongoAPI.insertOne('tools', {
       ...body,
       createdBy: auth.userId,
       status: 'pending',
       createdAt: new Date(),
     });

     return Response.json(result);
   }
   ```

**Success Criteria**:
- ✅ Clerk authentication works in Workers
- ✅ Protected endpoints reject unauthenticated requests
- ✅ User ID captured for audit trail

---

### Phase 5: Testing & Optimization (Week 5)

**Objective**: Comprehensive testing and performance optimization

**Tasks**:

1. **Unit Tests**

   ```typescript
   // test/steps/cache-check.test.ts
   import { describe, it, expect } from 'vitest';

   describe('cacheCheckStep', () => {
     it('should return cached plan on exact match', async () => {
       const mockEnv = createMockEnv();
       const state = { query: 'test query', ... };

       const result = await cacheCheckStep(state, mockEnv);

       expect(result.metadata?.cacheHit).toBe(true);
     });
   });
   ```

2. **Integration Tests**

   ```typescript
   // test/integration/workflow.test.ts
   describe('AgenticSearchWorkflow', () => {
     it('should execute full pipeline on cache miss', async () => {
       // Test complete workflow
     });

     it('should skip LLM steps on cache hit', async () => {
       // Verify step skipping
     });
   });
   ```

3. **Load Testing**

   Use Artillery or k6:
   ```yaml
   config:
     target: 'https://search-api.workers.dev'
     phases:
       - duration: 60
         arrivalRate: 10
   scenarios:
     - name: 'Search Requests'
       flow:
         - post:
             url: '/api/search'
             json:
               query: 'AI code generation tools'
   ```

4. **Performance Optimization**

   - Add caching headers
   - Minimize cold start time
   - Optimize MongoDB queries
   - Use Durable Objects for hot data

**Success Criteria**:
- ✅ All tests pass
- ✅ P95 latency < 2s
- ✅ Cold start < 500ms
- ✅ Cost remains $0 for projected usage

---

### Phase 6: Deployment & Migration (Week 6)

**Objective**: Deploy to production and migrate traffic

**Tasks**:

1. **Deploy to Cloudflare**

   ```bash
   wrangler deploy
   ```

2. **Set up Custom Domain**

   ```bash
   wrangler domains add search-api.codiesvibe.com
   ```

3. **Gradual Traffic Migration**

   - Week 1: 10% traffic to Workers
   - Week 2: 50% traffic to Workers
   - Week 3: 100% traffic to Workers

4. **Monitor Metrics**

   - Error rates
   - Response times
   - Cost
   - Cache hit rates

5. **Decommission VPS**

   Once 100% traffic is on Workers for 1 week:
   - Archive VPS data
   - Cancel VPS subscription
   - Update DNS if needed

**Success Criteria**:
- ✅ Zero downtime migration
- ✅ No increase in error rates
- ✅ Cost reduced to $0/month
- ✅ Performance maintained or improved

---

## Risk Assessment

### High Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| MongoDB Data API limitations | 🔴 HIGH | Test all queries early; have fallback plan |
| Qdrant client compatibility | 🟡 MEDIUM | Test in Workers; fallback to REST API |
| Workflow execution limits | 🟡 MEDIUM | Monitor usage; optimize step durations |
| LangChain removal breaks logic | 🟡 MEDIUM | Comprehensive testing; gradual migration |

### Medium Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cache performance degradation | 🟡 MEDIUM | Benchmark; use KV or Durable Objects |
| Authentication migration issues | 🟡 MEDIUM | Test Clerk thoroughly; have JWT fallback |
| Embedding service reliability | 🟡 MEDIUM | Add retries; cache aggressively |

### Low Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| Type system incompatibilities | 🟢 LOW | All types are pure TypeScript |
| Business logic bugs | 🟢 LOW | Comprehensive testing |
| Cost overruns | 🟢 LOW | Monitor usage; free tier has high limits |

---

## Cost Analysis

### Current Costs (VPS)

- VPS: $24/month
- Total: **$24/month = $288/year**

### Projected Costs (Cloudflare)

**Assuming 10,000 searches/month**:

| Service | Usage | Cost |
|---------|-------|------|
| Workers | 10,000 requests | $0 (included in free tier: 100k/day) |
| Workflows | 10,000 executions × 5 steps | $0 (included in free tier: 30k/month) |
| Durable Objects | Minimal usage | $0 (included in free tier: 1M reads) |
| KV | Cache storage | $0 (included in free tier: 100k reads) |
| **Total** | | **$0/month** |

**Note**: Even at 100,000 searches/month, costs would be ~$5-10/month

**Savings**: $24/month = **$288/year**

---

## Success Metrics

### Performance Metrics

- **P50 Latency**: < 1s (cache hit) / < 2s (cache miss)
- **P95 Latency**: < 2s (cache hit) / < 4s (cache miss)
- **Cache Hit Rate**: > 60%
- **Error Rate**: < 0.1%

### Business Metrics

- **Cost Reduction**: $288/year saved
- **Uptime**: > 99.9%
- **User Satisfaction**: No degradation from current

---

## Next Steps

1. **Review this document** with stakeholders
2. **Approve migration plan** and timeline
3. **Set up Cloudflare account** and development environment
4. **Begin Phase 1** (Foundation)
5. **Weekly progress reviews** during migration

---

## Appendix

### A. Environment Variables

**Required Secrets**:
```bash
MONGODB_DATA_API_KEY=<from MongoDB Atlas>
QDRANT_API_KEY=<from Qdrant Cloud>
TOGETHER_API_KEY=<from Together AI>
CLERK_SECRET_KEY=<from Clerk Dashboard>
```

**Public Variables**:
```toml
[vars]
MONGODB_DATA_SOURCE = "Cluster0"
MONGODB_DATABASE = "toolsearch"
QDRANT_URL = "https://your-cluster.qdrant.io"
ENVIRONMENT = "production"
```

---

### B. Monitoring Setup

**Cloudflare Analytics**:
- Workers Analytics dashboard
- Real-time request logs
- Error tracking

**External Monitoring** (optional):
- Sentry for error tracking
- Grafana Cloud for metrics
- Uptime monitoring (UptimeRobot)

---

### C. Rollback Plan

**If migration fails**:
1. Route traffic back to VPS (DNS/load balancer)
2. Keep VPS active for 1 month after migration
3. Have data sync strategy (MongoDB + Qdrant)

**Rollback Triggers**:
- Error rate > 1%
- P95 latency > 5s
- Cost > $50/month
- Critical bug found

---

### D. Contact Information

**Project Lead**: [Your Name]
**Timeline**: 6 weeks
**Start Date**: TBD
**Review Schedule**: Weekly on Fridays

---

*Last Updated: 2024-11-30*
*Version: 1.0*
