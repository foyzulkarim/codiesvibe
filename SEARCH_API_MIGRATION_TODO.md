# Search API Migration TODO List

This is a comprehensive, step-by-step checklist for migrating the search-api from VPS to Cloudflare Workers.

---

## 📋 Pre-Migration Setup

### Account Setup
- [ ] Create Cloudflare account (if not exists)
- [ ] Enable Cloudflare Workers (free tier)
- [ ] Enable Cloudflare Workflows (beta access if required)
- [ ] Set up Clerk account for authentication
- [ ] Verify MongoDB Atlas account has Data API enabled
- [ ] Verify Qdrant Cloud account (or keep existing setup)

### Repository Setup
- [ ] Create new directory: `search-api-workers/`
- [ ] Initialize git repository
- [ ] Set up `.gitignore` for Workers project
- [ ] Create `wrangler.toml` configuration file
- [ ] Set up development branch strategy

---

## 🔧 Phase 1: Foundation (Week 1)

### 1.1 Initialize Cloudflare Workers Project

- [ ] Install Wrangler CLI
  ```bash
  npm install -g wrangler
  ```

- [ ] Create new Workers project
  ```bash
  npm create cloudflare@latest search-api-workers
  # Choose:
  # - Template: "Hello World" Worker
  # - TypeScript: Yes
  # - Git: Yes
  # - Deploy: No (we'll deploy later)
  cd search-api-workers
  ```

- [ ] Install required dependencies
  ```bash
  npm install @qdrant/js-client-rest
  npm install together-ai
  npm install @clerk/backend
  npm install zod
  ```

- [ ] Install dev dependencies
  ```bash
  npm install -D @cloudflare/workers-types
  npm install -D vitest
  npm install -D @types/node
  ```

### 1.2 Configure Wrangler

- [ ] Update `wrangler.toml` with basic configuration
  ```toml
  name = "search-api"
  main = "src/index.ts"
  compatibility_date = "2024-11-30"
  node_compat = true

  [vars]
  ENVIRONMENT = "development"
  MONGODB_DATABASE = "toolsearch"
  MONGODB_DATA_SOURCE = "Cluster0"

  [[workflows]]
  binding = "SEARCH_WORKFLOW"
  name = "agentic-search-workflow"
  class_name = "AgenticSearchWorkflow"
  ```

- [ ] Set up environment variables for local development
  ```bash
  # Create .dev.vars file (gitignored)
  touch .dev.vars
  ```

- [ ] Add secrets to `.dev.vars` (local development)
  ```
  MONGODB_DATA_API_KEY=your-key-here
  QDRANT_API_KEY=your-key-here
  TOGETHER_API_KEY=your-key-here
  CLERK_SECRET_KEY=your-key-here
  ```

- [ ] Set production secrets (when ready to deploy)
  ```bash
  wrangler secret put MONGODB_DATA_API_KEY
  wrangler secret put QDRANT_API_KEY
  wrangler secret put TOGETHER_API_KEY
  wrangler secret put CLERK_SECRET_KEY
  ```

### 1.3 Set Up Project Structure

- [ ] Create directory structure
  ```bash
  mkdir -p src/{adapters,services,workflow/{steps},types,utils,middleware}
  mkdir -p test/{unit,integration}
  ```

- [ ] Create TypeScript configuration
  ```bash
  # tsconfig.json already created by Wrangler
  # Verify it includes:
  # - "target": "ES2022"
  # - "module": "ES2022"
  # - "moduleResolution": "bundler"
  ```

- [ ] Create `src/types/env.d.ts` for environment types
  ```typescript
  export interface Env {
    // Bindings
    SEARCH_WORKFLOW: Workflow;

    // Secrets
    MONGODB_DATA_API_KEY: string;
    QDRANT_API_KEY: string;
    TOGETHER_API_KEY: string;
    CLERK_SECRET_KEY: string;

    // Variables
    ENVIRONMENT: string;
    MONGODB_DATABASE: string;
    MONGODB_DATA_SOURCE: string;
  }
  ```

### 1.4 MongoDB Data API Adapter

- [ ] Create MongoDB Data API client interface
  ```bash
  touch src/adapters/mongodb-data-api.ts
  ```

- [ ] Implement `MongoDBDataAPI` class with methods:
  - [ ] `findOne(collection, filter)`
  - [ ] `find(collection, filter, options)`
  - [ ] `insertOne(collection, document)`
  - [ ] `updateOne(collection, filter, update)`
  - [ ] `deleteOne(collection, filter)`
  - [ ] `aggregate(collection, pipeline)` (if needed)

- [ ] Create test file for MongoDB adapter
  ```bash
  touch test/unit/mongodb-data-api.test.ts
  ```

- [ ] Write unit tests for MongoDB adapter
  - [ ] Test successful API calls
  - [ ] Test error handling
  - [ ] Test request/response transformation
  - [ ] Test ObjectId handling

- [ ] Test MongoDB adapter against real API
  - [ ] Connect to MongoDB Atlas
  - [ ] Enable Data API in Atlas UI
  - [ ] Create API key
  - [ ] Test find operations
  - [ ] Test insert operations
  - [ ] Test update operations

### 1.5 Qdrant Client Setup

- [ ] Create Qdrant client wrapper
  ```bash
  touch src/adapters/qdrant-client.ts
  ```

- [ ] Implement Qdrant client factory
  ```typescript
  export function createQdrantClient(env: Env): QdrantClient {
    return new QdrantClient({
      url: env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY,
    });
  }
  ```

- [ ] Test Qdrant client in Workers environment
  - [ ] Test connection
  - [ ] Test vector search
  - [ ] Test point upsert
  - [ ] Verify performance (cold start, latency)

- [ ] Create test file for Qdrant adapter
  ```bash
  touch test/unit/qdrant-client.test.ts
  ```

### 1.6 Copy Type Definitions

- [ ] Copy type files from `search-api/src/types/` to `search-api-workers/src/types/`
  - [ ] `state.ts` (adapt for Workflows)
  - [ ] `intent-state.ts`
  - [ ] `query-plan.ts`
  - [ ] `candidate.ts`
  - [ ] `tool.types.ts`

- [ ] Remove LangGraph-specific imports from types
  - [ ] Replace `Annotation` from `@langchain/langgraph`
  - [ ] Use plain TypeScript interfaces

- [ ] Create new `workflow-state.ts` for Workflows
  ```typescript
  export interface WorkflowState {
    query: string;
    schema: DomainSchema;
    domainHandlers: any;
    intentState: IntentState | null;
    executionPlan: QueryPlan | null;
    candidates: Candidate[];
    results: ToolData[];
    executionStats: ExecutionStats;
    errors: ErrorInfo[];
    metadata: Metadata;
  }
  ```

### 1.7 Copy Utility Functions

- [ ] Copy utility files from `search-api/src/utils/`
  - [ ] `fusion.ts` (RRF algorithm)
  - [ ] `cosine-similarity.ts`
  - [ ] Pattern matchers and validators

- [ ] Remove Node.js-specific utilities
  - [ ] Remove any `fs`, `path`, or `crypto` native modules
  - [ ] Replace with Web Crypto API where needed

- [ ] Test utilities work in Workers environment
  ```bash
  npm run test:unit
  ```

### 1.8 Initial Deployment Test

- [ ] Create minimal "Hello World" endpoint
  ```typescript
  export default {
    async fetch(request: Request, env: Env): Promise<Response> {
      return Response.json({
        message: 'Search API Workers - Phase 1 Complete',
        timestamp: new Date().toISOString()
      });
    }
  };
  ```

- [ ] Test locally
  ```bash
  wrangler dev
  ```

- [ ] Deploy to Cloudflare (development)
  ```bash
  wrangler deploy --env development
  ```

- [ ] Verify deployment
  ```bash
  curl https://search-api-dev.your-account.workers.dev
  ```

### 1.9 Phase 1 Validation

- [ ] MongoDB Data API adapter works in Workers
- [ ] Qdrant client works in Workers
- [ ] All type definitions compile without errors
- [ ] Utilities work without Node.js dependencies
- [ ] Can deploy successfully to Cloudflare
- [ ] Environment variables accessible
- [ ] Basic logging works

**Checkpoint**: Phase 1 complete when all items checked ✅

---

## 🧩 Phase 2: Node Migration (Week 2)

### 2.1 Set Up Services Layer

- [ ] Create base service structure
  ```bash
  touch src/services/embedding.service.ts
  touch src/services/plan-cache.service.ts
  touch src/services/schema.service.ts
  ```

- [ ] Create prompt generation utilities
  ```bash
  mkdir -p src/prompts
  touch src/prompts/intent-extraction.ts
  touch src/prompts/query-planning.ts
  ```

### 2.2 Migrate Embedding Service

- [ ] Copy embedding logic from `search-api/src/services/embedding.service.ts`

- [ ] Adapt for Workers:
  - [ ] Replace in-memory Map cache with KV (optional) or Durable Objects
  - [ ] Test Together AI embeddings API in Workers
  - [ ] Add retry logic for API failures
  - [ ] Add request batching if needed

- [ ] Implement caching strategy
  - [ ] Option A: Use Workers KV for persistent cache
  - [ ] Option B: Use Durable Objects for hot cache
  - [ ] Option C: Simple in-memory cache per request

- [ ] Create tests
  ```bash
  touch test/unit/embedding.service.test.ts
  ```

- [ ] Test embedding generation
  - [ ] Single embedding
  - [ ] Batch embeddings
  - [ ] Cache hit/miss
  - [ ] Error handling

### 2.3 Migrate Plan Cache Service

- [ ] Copy cache logic from `search-api/src/services/plan-cache.service.ts`

- [ ] Adapt MongoDB operations to use Data API adapter
  - [ ] `storePlan()` → use `mongoAPI.insertOne()`
  - [ ] `lookupPlan()` → use `mongoAPI.find()` with vector search
  - [ ] Hash generation (MD5 → Web Crypto API)

- [ ] Implement vector similarity search
  - [ ] Use MongoDB Atlas Vector Search (if available)
  - [ ] Or implement in-memory similarity calculation
  - [ ] Set threshold at 0.90 (same as original)

- [ ] Create tests
  ```bash
  touch test/unit/plan-cache.service.test.ts
  ```

### 2.4 Migrate Cache Check Node

- [ ] Create workflow step file
  ```bash
  touch src/workflow/steps/cache-check.ts
  ```

- [ ] Port logic from `search-api/src/graphs/nodes/cache-check.node.ts`

- [ ] Adapt to Workers function signature
  ```typescript
  export async function cacheCheckStep(
    state: WorkflowState,
    env: Env
  ): Promise<Partial<WorkflowState>>
  ```

- [ ] Remove LangGraph dependencies
  - [ ] Replace `StateAnnotation.State` with `WorkflowState`
  - [ ] Keep business logic identical

- [ ] Add error handling
  - [ ] Graceful degradation on cache errors
  - [ ] Logging for debugging

- [ ] Create tests
  ```bash
  touch test/unit/cache-check.step.test.ts
  ```

- [ ] Test scenarios:
  - [ ] Cache hit (exact match)
  - [ ] Cache hit (similar match)
  - [ ] Cache miss
  - [ ] Cache error (fallback to full pipeline)

### 2.5 Migrate Intent Extractor Node

- [ ] Create workflow step file
  ```bash
  touch src/workflow/steps/intent-extractor.ts
  ```

- [ ] Port logic from `search-api/src/graphs/nodes/intent-extractor.node.ts`

- [ ] Replace LangChain with direct Together AI API calls
  ```typescript
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
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })
  });
  ```

- [ ] Port prompt generation
  - [ ] Copy from `search-api/src/core/prompts/prompt.generator.ts`
  - [ ] Ensure schema-driven prompts work

- [ ] Add response validation
  - [ ] Use Zod schema validation
  - [ ] Handle malformed JSON responses
  - [ ] Retry on failures

- [ ] Create tests
  ```bash
  touch test/unit/intent-extractor.step.test.ts
  ```

- [ ] Test scenarios:
  - [ ] Valid intent extraction
  - [ ] Invalid JSON response
  - [ ] API timeout
  - [ ] API error

### 2.6 Migrate Query Planner Node

- [ ] Create workflow step file
  ```bash
  touch src/workflow/steps/query-planner.ts
  ```

- [ ] Port logic from `search-api/src/graphs/nodes/query-planner.node.ts`

- [ ] Replace LangChain with direct API calls (same as intent-extractor)

- [ ] Port query plan validation
  - [ ] Copy from `search-api/src/core/validators/`
  - [ ] Ensure plan safety checks work

- [ ] Create tests
  ```bash
  touch test/unit/query-planner.step.test.ts
  ```

- [ ] Test scenarios:
  - [ ] Valid query plan
  - [ ] Invalid query plan
  - [ ] Plan validation failures
  - [ ] API errors

### 2.7 Migrate Query Executor Node

- [ ] Create workflow step file
  ```bash
  touch src/workflow/steps/query-executor.ts
  ```

- [ ] Port logic from `search-api/src/graphs/nodes/query-executor.node.ts`

- [ ] Implement structured search execution
  - [ ] MongoDB filter queries via Data API
  - [ ] Handle multiple structured sources
  - [ ] Query operator translation (=, contains, in, etc.)

- [ ] Implement vector search execution
  - [ ] Qdrant similarity search
  - [ ] Generate query embeddings
  - [ ] Handle multiple vector sources
  - [ ] Adaptive score thresholding

- [ ] Implement result fusion
  - [ ] Copy RRF algorithm from `utils/fusion.ts`
  - [ ] Implement weighted fusion
  - [ ] Deduplication logic

- [ ] Implement result enrichment
  - [ ] Fetch full tool documents from MongoDB
  - [ ] Preserve candidate order
  - [ ] Handle missing documents

- [ ] Create tests
  ```bash
  touch test/unit/query-executor.step.test.ts
  ```

- [ ] Test scenarios:
  - [ ] Structured search only
  - [ ] Vector search only
  - [ ] Combined search with fusion
  - [ ] Empty results
  - [ ] Database errors

### 2.8 Migrate Cache Store Node

- [ ] Create workflow step file
  ```bash
  touch src/workflow/steps/cache-store.ts
  ```

- [ ] Port logic from `search-api/src/graphs/nodes/cache-store.node.ts`

- [ ] Adapt MongoDB operations for Workers
  - [ ] Use Data API for insertOne
  - [ ] Generate query hash (Web Crypto API)
  - [ ] Store embeddings with plan

- [ ] Add cache statistics tracking
  - [ ] Update usage counts
  - [ ] Track hit rates
  - [ ] Store metadata

- [ ] Create tests
  ```bash
  touch test/unit/cache-store.step.test.ts
  ```

### 2.9 Phase 2 Validation

- [ ] All 5 workflow steps implemented
- [ ] All steps work independently in Workers
- [ ] No LangGraph dependencies remain
- [ ] No Node.js-specific code remains
- [ ] All unit tests pass
- [ ] MongoDB Data API integration works
- [ ] Qdrant client integration works
- [ ] Together AI API calls work
- [ ] Embedding generation works
- [ ] Cache operations work

**Checkpoint**: Phase 2 complete when all items checked ✅

---

## 🔄 Phase 3: Workflow Creation (Week 3)

### 3.1 Create Workflow Class

- [ ] Create workflow file
  ```bash
  touch src/workflow/agentic-search.workflow.ts
  ```

- [ ] Implement `AgenticSearchWorkflow` class extending `WorkflowEntrypoint`

- [ ] Import all workflow steps
  ```typescript
  import { cacheCheckStep } from './steps/cache-check';
  import { intentExtractorStep } from './steps/intent-extractor';
  import { queryPlannerStep } from './steps/query-planner';
  import { queryExecutorStep } from './steps/query-executor';
  import { cacheStoreStep } from './steps/cache-store';
  ```

### 3.2 Implement Workflow Orchestration

- [ ] Implement `run()` method with all 5 steps
  ```typescript
  async run(event: WorkflowEvent<WorkflowState>, step: WorkflowStep) {
    // Step 1: Cache Check
    const afterCacheCheck = await step.do('cache-check', async () => {
      return await cacheCheckStep(event.payload, this.env);
    });

    // Conditional routing...
  }
  ```

- [ ] Implement conditional routing logic
  - [ ] Check `metadata.skipToExecutor` flag
  - [ ] Skip intent-extractor and query-planner on cache hits
  - [ ] Execute full pipeline on cache miss

- [ ] Add step timing tracking
  - [ ] Record start/end time for each step
  - [ ] Add to `executionStats.nodeTimings`

- [ ] Add error handling for each step
  - [ ] Catch step failures
  - [ ] Add to `errors` array
  - [ ] Determine if recoverable
  - [ ] Continue or abort pipeline

### 3.3 Implement State Management

- [ ] Define initial state structure
  ```typescript
  const initialState: WorkflowState = {
    query: event.payload.query,
    schema: event.payload.schema,
    domainHandlers: event.payload.domainHandlers,
    intentState: null,
    executionPlan: null,
    candidates: [],
    results: [],
    executionStats: {
      totalTimeMs: 0,
      nodeTimings: {},
      vectorQueriesExecuted: 0,
      structuredQueriesExecuted: 0
    },
    errors: [],
    metadata: {
      startTime: new Date(),
      executionPath: [],
      nodeExecutionTimes: {},
      totalNodesExecuted: 0,
      pipelineVersion: "3.0-cloudflare-workflows"
    }
  };
  ```

- [ ] Implement state merging between steps
  - [ ] Merge partial state updates
  - [ ] Preserve previous state
  - [ ] Update execution path

- [ ] Add state validation
  - [ ] Validate required fields after each step
  - [ ] Handle missing data gracefully

### 3.4 Create Worker Entry Point

- [ ] Update `src/index.ts` with search endpoint

- [ ] Implement POST `/api/search` handler
  ```typescript
  if (url.pathname === '/api/search' && request.method === 'POST') {
    const body = await request.json<{ query: string; limit?: number }>();

    // Trigger workflow
    const instance = await env.SEARCH_WORKFLOW.create({
      params: {
        query: body.query,
        schema: getPipelineSchema(),
        domainHandlers: getDomainHandlers(),
      }
    });

    // Wait for result
    const result = await instance.result();

    return Response.json({
      query: body.query,
      candidates: result.candidates,
      executionStats: result.executionStats,
      metadata: result.metadata
    });
  }
  ```

- [ ] Add request validation
  - [ ] Validate query parameter
  - [ ] Check query length (1-1000 chars)
  - [ ] Sanitize input

- [ ] Add error handling
  - [ ] Catch workflow errors
  - [ ] Return appropriate HTTP status codes
  - [ ] Log errors for debugging

### 3.5 Copy Schema and Domain Handlers

- [ ] Copy schema initialization from `search-api/src/core/pipeline.init.ts`

- [ ] Create `src/config/schema.ts`
  - [ ] Define domain schema
  - [ ] Define vocabularies
  - [ ] Define entity types

- [ ] Create `src/config/domain-handlers.ts`
  - [ ] Implement `buildFilters()`
  - [ ] Implement `validateQueryPlan()`

- [ ] Make schema and handlers available to workflow
  ```typescript
  export function getPipelineSchema(): DomainSchema { ... }
  export function getDomainHandlers() { ... }
  ```

### 3.6 Test Workflow Locally

- [ ] Create test workflow invocation script
  ```bash
  touch test/integration/workflow-local.test.ts
  ```

- [ ] Test with sample queries
  - [ ] Simple query: "AI code generation tools"
  - [ ] Complex query: "Free CLI tools for developers"
  - [ ] Query with filters: "Open source analytics platforms"

- [ ] Test conditional routing
  - [ ] First request (cache miss → full pipeline)
  - [ ] Second request (cache hit → skip LLM steps)

- [ ] Test error scenarios
  - [ ] Invalid query
  - [ ] MongoDB connection failure
  - [ ] Qdrant connection failure
  - [ ] LLM API failure

- [ ] Verify state persistence between steps
  - [ ] State accumulates correctly
  - [ ] No data loss between steps

### 3.7 Add Observability

- [ ] Add structured logging to each step
  ```typescript
  console.log(JSON.stringify({
    step: 'cache-check',
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    cacheHit: result.metadata.cacheHit
  }));
  ```

- [ ] Add execution path tracking
  - [ ] Record which steps executed
  - [ ] Record execution order
  - [ ] Record step durations

- [ ] Add metrics collection
  - [ ] Cache hit rate
  - [ ] LLM call count
  - [ ] Database query count
  - [ ] Total execution time

### 3.8 Optimize Performance

- [ ] Minimize step execution time
  - [ ] Parallel API calls where possible
  - [ ] Optimize database queries
  - [ ] Reduce unnecessary data transfers

- [ ] Optimize cold start time
  - [ ] Minimize imports
  - [ ] Lazy load heavy dependencies
  - [ ] Use code splitting if needed

- [ ] Add timeout protection
  - [ ] Set per-step timeouts
  - [ ] Set overall workflow timeout
  - [ ] Handle timeout gracefully

### 3.9 Phase 3 Validation

- [ ] Workflow executes all 5 steps successfully
- [ ] Conditional routing works (cache hit path)
- [ ] State persists between steps
- [ ] Error handling works for each step
- [ ] Can retrieve workflow results
- [ ] Execution path matches LangGraph behavior
- [ ] Performance is acceptable (< 5s end-to-end)
- [ ] Logging provides visibility
- [ ] Can test locally with `wrangler dev`

**Checkpoint**: Phase 3 complete when all items checked ✅

---

## 🔐 Phase 4: Authentication (Week 4)

### 4.1 Set Up Clerk

- [ ] Create Clerk account at clerk.com

- [ ] Create new application in Clerk Dashboard

- [ ] Copy API keys
  - [ ] Secret Key (for backend)
  - [ ] Publishable Key (for frontend)

- [ ] Configure allowed origins
  - [ ] Add your frontend domain
  - [ ] Add localhost for development

- [ ] Add Clerk secret to Workers
  ```bash
  wrangler secret put CLERK_SECRET_KEY
  ```

### 4.2 Install Clerk SDK

- [ ] Install Clerk backend SDK
  ```bash
  npm install @clerk/backend
  ```

- [ ] Update `src/types/env.d.ts`
  ```typescript
  export interface Env {
    CLERK_SECRET_KEY: string;
    CLERK_PUBLISHABLE_KEY: string;
    // ... other vars
  }
  ```

### 4.3 Create Authentication Middleware

- [ ] Create auth middleware file
  ```bash
  touch src/middleware/auth.ts
  ```

- [ ] Implement `authenticateRequest()` function
  ```typescript
  import { createClerkClient } from '@clerk/backend';

  export async function authenticateRequest(
    request: Request,
    env: Env
  ): Promise<{ userId: string; email?: string } | null> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

    try {
      const verified = await clerk.verifyToken(token);
      return {
        userId: verified.sub,
        email: verified.email
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }
  ```

- [ ] Add request helper for auth status
  ```typescript
  export function requireAuth(auth: any) {
    if (!auth) {
      throw new Response('Unauthorized', { status: 401 });
    }
    return auth;
  }
  ```

### 4.4 Implement Tool CRUD Endpoints

- [ ] Create tools router file
  ```bash
  touch src/routes/tools.ts
  ```

- [ ] Implement GET `/api/tools` (public)
  ```typescript
  export async function getTools(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const page = parseInt(url.searchParams.get('page') || '1');

    const mongoAPI = new MongoDBDataAPI(env);
    const tools = await mongoAPI.find('tools',
      { status: 'active' },
      { limit, skip: (page - 1) * limit }
    );

    return Response.json({ tools, page, limit });
  }
  ```

- [ ] Implement GET `/api/tools/:id` (public)
  ```typescript
  export async function getTool(
    toolId: string,
    env: Env
  ): Promise<Response> {
    const mongoAPI = new MongoDBDataAPI(env);
    const tool = await mongoAPI.findOne('tools', { _id: { $oid: toolId } });

    if (!tool) {
      return new Response('Tool not found', { status: 404 });
    }

    return Response.json(tool);
  }
  ```

- [ ] Implement POST `/api/tools` (protected)
  ```typescript
  export async function createTool(
    request: Request,
    env: Env
  ): Promise<Response> {
    const auth = await authenticateRequest(request, env);
    requireAuth(auth);

    const body = await request.json();

    // Validate tool data
    const validatedTool = validateToolData(body);

    const mongoAPI = new MongoDBDataAPI(env);
    const result = await mongoAPI.insertOne('tools', {
      ...validatedTool,
      createdBy: auth.userId,
      status: 'pending', // Admin approval required
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return Response.json(result, { status: 201 });
  }
  ```

- [ ] Implement PATCH `/api/tools/:id` (protected)
  ```typescript
  export async function updateTool(
    toolId: string,
    request: Request,
    env: Env
  ): Promise<Response> {
    const auth = await authenticateRequest(request, env);
    requireAuth(auth);

    const body = await request.json();
    const mongoAPI = new MongoDBDataAPI(env);

    // Verify ownership
    const tool = await mongoAPI.findOne('tools', { _id: { $oid: toolId } });
    if (tool.createdBy !== auth.userId) {
      return new Response('Forbidden', { status: 403 });
    }

    const result = await mongoAPI.updateOne(
      'tools',
      { _id: { $oid: toolId } },
      { $set: { ...body, updatedAt: new Date().toISOString() } }
    );

    return Response.json(result);
  }
  ```

- [ ] Implement DELETE `/api/tools/:id` (protected)
  ```typescript
  export async function deleteTool(
    toolId: string,
    request: Request,
    env: Env
  ): Promise<Response> {
    const auth = await authenticateRequest(request, env);
    requireAuth(auth);

    const mongoAPI = new MongoDBDataAPI(env);

    // Verify ownership
    const tool = await mongoAPI.findOne('tools', { _id: { $oid: toolId } });
    if (tool.createdBy !== auth.userId) {
      return new Response('Forbidden', { status: 403 });
    }

    await mongoAPI.deleteOne('tools', { _id: { $oid: toolId } });
    return new Response(null, { status: 204 });
  }
  ```

### 4.5 Add Validation

- [ ] Create validation utilities
  ```bash
  touch src/utils/validation.ts
  ```

- [ ] Implement tool data validation
  ```typescript
  import { z } from 'zod';

  const ToolSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(10).max(2000),
    website: z.string().url().optional(),
    categories: z.object({
      primary: z.array(z.string()).min(1).max(5),
      secondary: z.array(z.string()).max(5)
    }),
    pricingSummary: z.object({
      hasFreeTier: z.boolean(),
      pricingModel: z.array(z.enum(['free', 'freemium', 'paid']))
    }),
    // ... rest of schema
  });

  export function validateToolData(data: unknown) {
    return ToolSchema.parse(data);
  }
  ```

- [ ] Add request validation middleware
  - [ ] Validate content-type
  - [ ] Validate request body size
  - [ ] Sanitize input strings

### 4.6 Update Main Router

- [ ] Update `src/index.ts` to include all routes
  ```typescript
  export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
      const url = new URL(request.url);

      // Search endpoint (public)
      if (url.pathname === '/api/search' && request.method === 'POST') {
        return handleSearch(request, env);
      }

      // Tools endpoints
      if (url.pathname === '/api/tools') {
        if (request.method === 'GET') return getTools(request, env);
        if (request.method === 'POST') return createTool(request, env);
      }

      if (url.pathname.startsWith('/api/tools/')) {
        const toolId = url.pathname.split('/')[3];
        if (request.method === 'GET') return getTool(toolId, env);
        if (request.method === 'PATCH') return updateTool(toolId, request, env);
        if (request.method === 'DELETE') return deleteTool(toolId, request, env);
      }

      return new Response('Not Found', { status: 404 });
    }
  };
  ```

### 4.7 Add CORS Support

- [ ] Create CORS middleware
  ```bash
  touch src/middleware/cors.ts
  ```

- [ ] Implement CORS headers
  ```typescript
  export function corsHeaders(origin?: string) {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };
  }

  export function handleCors(request: Request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(request.headers.get('Origin'))
      });
    }
  }
  ```

- [ ] Add CORS headers to all responses

### 4.8 Test Authentication

- [ ] Create test script for auth endpoints
  ```bash
  touch test/integration/auth.test.ts
  ```

- [ ] Test public endpoints
  - [ ] GET `/api/tools` without token
  - [ ] GET `/api/tools/:id` without token
  - [ ] POST `/api/search` without token

- [ ] Test protected endpoints without auth
  - [ ] POST `/api/tools` → 401
  - [ ] PATCH `/api/tools/:id` → 401
  - [ ] DELETE `/api/tools/:id` → 401

- [ ] Test protected endpoints with valid token
  - [ ] POST `/api/tools` → 201
  - [ ] PATCH `/api/tools/:id` → 200
  - [ ] DELETE `/api/tools/:id` → 204

- [ ] Test ownership validation
  - [ ] User A creates tool
  - [ ] User B tries to update → 403
  - [ ] User B tries to delete → 403

### 4.9 Phase 4 Validation

- [ ] Clerk integration works in Workers
- [ ] JWT verification works correctly
- [ ] Public endpoints accessible without auth
- [ ] Protected endpoints require valid token
- [ ] Ownership validation works
- [ ] CORS configured correctly
- [ ] Input validation prevents bad data
- [ ] Error responses are appropriate
- [ ] All CRUD operations work

**Checkpoint**: Phase 4 complete when all items checked ✅

---

## 🧪 Phase 5: Testing & Optimization (Week 5)

### 5.1 Unit Testing Setup

- [ ] Configure Vitest for Workers
  ```bash
  # Already installed in Phase 1
  touch vitest.config.ts
  ```

- [ ] Configure test environment
  ```typescript
  // vitest.config.ts
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: {
      globals: true,
      environment: 'miniflare',
      environmentOptions: {
        bindings: {
          // Mock environment variables
        }
      }
    }
  });
  ```

### 5.2 Write Unit Tests

- [ ] Test MongoDB Data API adapter
  - [ ] All CRUD operations
  - [ ] Error handling
  - [ ] ObjectId conversions

- [ ] Test Qdrant client
  - [ ] Vector search
  - [ ] Point upsert
  - [ ] Error handling

- [ ] Test embedding service
  - [ ] Single embedding
  - [ ] Batch embeddings
  - [ ] Cache behavior

- [ ] Test plan cache service
  - [ ] Store plan
  - [ ] Lookup plan (exact match)
  - [ ] Lookup plan (similar match)
  - [ ] Cache miss

- [ ] Test each workflow step
  - [ ] cache-check
  - [ ] intent-extractor
  - [ ] query-planner
  - [ ] query-executor
  - [ ] cache-store

- [ ] Test utilities
  - [ ] RRF fusion algorithm
  - [ ] Cosine similarity
  - [ ] Validation functions

- [ ] Run all unit tests
  ```bash
  npm run test:unit
  ```

- [ ] Aim for >80% code coverage

### 5.3 Integration Testing

- [ ] Create integration test suite
  ```bash
  mkdir -p test/integration
  touch test/integration/end-to-end.test.ts
  ```

- [ ] Test complete search pipeline
  ```typescript
  describe('Search Pipeline Integration', () => {
    it('should execute full pipeline on cache miss', async () => {
      const response = await SELF.fetch(new Request('http://localhost/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'AI code generation tools' })
      }));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.candidates).toBeDefined();
      expect(data.candidates.length).toBeGreaterThan(0);
    });
  });
  ```

- [ ] Test cache hit scenario
  - [ ] First request (cache miss)
  - [ ] Second request (cache hit)
  - [ ] Verify faster response time
  - [ ] Verify execution path differs

- [ ] Test all CRUD operations
  - [ ] Create tool
  - [ ] Read tool
  - [ ] Update tool
  - [ ] Delete tool

- [ ] Test authentication flows
  - [ ] Valid token
  - [ ] Invalid token
  - [ ] Expired token
  - [ ] Missing token

- [ ] Test error scenarios
  - [ ] Invalid query
  - [ ] Database connection failure
  - [ ] LLM API failure
  - [ ] Timeout scenarios

### 5.4 Load Testing

- [ ] Install load testing tool
  ```bash
  npm install -g artillery
  # or
  brew install k6
  ```

- [ ] Create load test scenarios
  ```bash
  touch test/load/search-load-test.yml
  ```

- [ ] Configure Artillery test
  ```yaml
  config:
    target: 'https://search-api.your-workers.dev'
    phases:
      - duration: 60
        arrivalRate: 5
        name: 'Warm-up'
      - duration: 120
        arrivalRate: 20
        name: 'Sustained load'
      - duration: 60
        arrivalRate: 50
        name: 'Spike'
  scenarios:
    - name: 'Search requests'
      flow:
        - post:
            url: '/api/search'
            json:
              query: 'AI tools for developers'
  ```

- [ ] Run load tests
  ```bash
  artillery run test/load/search-load-test.yml
  ```

- [ ] Analyze results
  - [ ] P50, P95, P99 latencies
  - [ ] Error rate
  - [ ] Throughput (requests/sec)
  - [ ] Resource usage

- [ ] Test with varied query patterns
  - [ ] Cache hits vs misses
  - [ ] Simple vs complex queries
  - [ ] Concurrent requests

### 5.5 Performance Optimization

- [ ] Analyze cold start time
  - [ ] Measure initial request latency
  - [ ] Identify slow imports
  - [ ] Optimize bundle size

- [ ] Optimize database queries
  - [ ] Add indexes if needed
  - [ ] Minimize data transfers
  - [ ] Use projection to fetch only needed fields

- [ ] Optimize LLM calls
  - [ ] Reduce prompt size if possible
  - [ ] Consider faster models for intent extraction
  - [ ] Add aggressive caching

- [ ] Optimize vector operations
  - [ ] Batch embedding generation
  - [ ] Cache embeddings aggressively
  - [ ] Use lower precision if acceptable

- [ ] Implement connection pooling/reuse
  - [ ] Reuse database connections
  - [ ] Reuse HTTP clients

- [ ] Add caching layers
  - [ ] Use Workers KV for hot data
  - [ ] Cache common queries
  - [ ] Cache enum embeddings

### 5.6 Error Handling Improvements

- [ ] Add comprehensive error logging
  ```typescript
  export class SearchError extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode: number,
      public metadata?: any
    ) {
      super(message);
      this.name = 'SearchError';
    }
  }
  ```

- [ ] Implement error recovery strategies
  - [ ] Retry transient failures
  - [ ] Fallback to degraded service
  - [ ] Return partial results when possible

- [ ] Add error tracking
  - [ ] Log all errors with context
  - [ ] Track error rates by type
  - [ ] Alert on error rate spikes

### 5.7 Add Health Checks

- [ ] Implement health check endpoint
  ```typescript
  // GET /health
  export async function healthCheck(env: Env): Promise<Response> {
    const checks = {
      mongodb: await checkMongoDB(env),
      qdrant: await checkQdrant(env),
      together: await checkTogetherAI(env)
    };

    const allHealthy = Object.values(checks).every(c => c.healthy);

    return Response.json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks
    }, { status: allHealthy ? 200 : 503 });
  }
  ```

- [ ] Test health check endpoint
  - [ ] All services healthy → 200
  - [ ] One service down → 503
  - [ ] All services down → 503

### 5.8 Documentation

- [ ] Create API documentation
  ```bash
  touch docs/API.md
  ```

- [ ] Document all endpoints
  - [ ] Request/response formats
  - [ ] Authentication requirements
  - [ ] Error codes
  - [ ] Examples

- [ ] Create deployment guide
  ```bash
  touch docs/DEPLOYMENT.md
  ```

- [ ] Document environment variables
  - [ ] Required vs optional
  - [ ] Where to obtain values
  - [ ] Security considerations

- [ ] Create runbook for common issues
  - [ ] Troubleshooting steps
  - [ ] Common errors and solutions
  - [ ] Rollback procedures

### 5.9 Phase 5 Validation

- [ ] All unit tests pass (>80% coverage)
- [ ] All integration tests pass
- [ ] Load tests show acceptable performance
  - [ ] P95 latency < 2s
  - [ ] Error rate < 0.1%
  - [ ] Can handle 50 req/s
- [ ] Cold start time < 500ms
- [ ] Cache hit rate > 60% in real usage
- [ ] Error handling is comprehensive
- [ ] Health checks work correctly
- [ ] Documentation is complete

**Checkpoint**: Phase 5 complete when all items checked ✅

---

## 🚀 Phase 6: Deployment & Migration (Week 6)

### 6.1 Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation complete
- [ ] Secrets configured in production
- [ ] MongoDB Data API enabled and tested
- [ ] Qdrant accessible from Workers
- [ ] Clerk production app configured
- [ ] Backup plan ready

### 6.2 Initial Deployment

- [ ] Deploy to development environment
  ```bash
  wrangler deploy --env development
  ```

- [ ] Verify deployment
  ```bash
  curl https://search-api-dev.your-account.workers.dev/health
  ```

- [ ] Test all endpoints in dev environment
  - [ ] POST `/api/search`
  - [ ] GET `/api/tools`
  - [ ] POST `/api/tools` (with auth)
  - [ ] GET `/health`

- [ ] Monitor for errors
  - [ ] Check Cloudflare dashboard
  - [ ] Review logs
  - [ ] Check error rates

### 6.3 Staging Deployment

- [ ] Create staging environment
  ```toml
  # wrangler.toml
  [env.staging]
  name = "search-api-staging"
  route = "staging.search-api.example.com/*"
  ```

- [ ] Deploy to staging
  ```bash
  wrangler deploy --env staging
  ```

- [ ] Run smoke tests against staging
  - [ ] Basic search queries
  - [ ] CRUD operations
  - [ ] Authentication flows

- [ ] Run load tests against staging
  ```bash
  artillery run test/load/search-load-test.yml --target https://staging.search-api.example.com
  ```

- [ ] Monitor staging for 24-48 hours
  - [ ] Check for errors
  - [ ] Verify performance
  - [ ] Test with real-world queries

### 6.4 Production Deployment Preparation

- [ ] Set up custom domain
  ```bash
  wrangler domains add api.codiesvibe.com
  ```

- [ ] Configure DNS
  - [ ] Add CNAME record pointing to Workers
  - [ ] Verify DNS propagation

- [ ] Set up production secrets
  ```bash
  wrangler secret put MONGODB_DATA_API_KEY --env production
  wrangler secret put QDRANT_API_KEY --env production
  wrangler secret put TOGETHER_API_KEY --env production
  wrangler secret put CLERK_SECRET_KEY --env production
  ```

- [ ] Configure production environment
  ```toml
  [env.production]
  name = "search-api-production"
  routes = [
    { pattern = "api.codiesvibe.com/*", zone_name = "codiesvibe.com" }
  ]
  ```

- [ ] Create rollback plan
  - [ ] Document VPS restart procedure
  - [ ] Prepare DNS rollback
  - [ ] Keep VPS running during migration

### 6.5 Gradual Traffic Migration

**Week 1: 10% Traffic**

- [ ] Deploy to production
  ```bash
  wrangler deploy --env production
  ```

- [ ] Configure load balancer or DNS to send 10% traffic to Workers
  - [ ] Option A: Use Cloudflare Load Balancer
  - [ ] Option B: Use weighted DNS records
  - [ ] Option C: Frontend flag to route 10% of users

- [ ] Monitor metrics
  - [ ] Error rates
  - [ ] Response times
  - [ ] Cache hit rates
  - [ ] Cost

- [ ] Compare Workers vs VPS performance
  - [ ] Latency comparison
  - [ ] Error rate comparison
  - [ ] User feedback

- [ ] Fix any issues found
  - [ ] Deploy hotfixes if needed
  - [ ] Roll back if critical issues

**Week 2: 50% Traffic**

- [ ] Increase traffic to 50%

- [ ] Monitor for 72 hours
  - [ ] All metrics stable
  - [ ] No increase in errors
  - [ ] Performance acceptable

- [ ] Verify cost is still $0
  - [ ] Check Cloudflare billing
  - [ ] Verify within free tier limits

**Week 3: 100% Traffic**

- [ ] Increase traffic to 100%

- [ ] Monitor for 7 days
  - [ ] All systems stable
  - [ ] Users satisfied
  - [ ] No critical issues

- [ ] Verify VPS can be shut down
  - [ ] No traffic going to VPS
  - [ ] All endpoints migrated
  - [ ] All data synced

### 6.6 VPS Decommissioning

- [ ] Archive VPS data
  - [ ] Backup MongoDB data (if not already in cloud)
  - [ ] Export logs
  - [ ] Save configuration files

- [ ] Verify no dependencies on VPS
  - [ ] All API calls going to Workers
  - [ ] No hardcoded VPS URLs
  - [ ] No scheduled jobs running on VPS

- [ ] Shut down VPS services
  ```bash
  # On VPS
  pm2 stop all
  systemctl stop mongodb
  systemctl stop nginx
  ```

- [ ] Cancel VPS subscription
  - [ ] Contact provider
  - [ ] Verify cancellation
  - [ ] Get final bill

- [ ] Update documentation
  - [ ] Remove VPS references
  - [ ] Update deployment instructions
  - [ ] Update architecture diagrams

### 6.7 Post-Migration Monitoring

- [ ] Set up monitoring dashboards
  - [ ] Cloudflare Analytics
  - [ ] Custom metrics (if using external monitoring)
  - [ ] Error tracking

- [ ] Set up alerts
  - [ ] Error rate > 1%
  - [ ] P95 latency > 5s
  - [ ] Cost > $10/month
  - [ ] Health check failures

- [ ] Monitor for 30 days
  - [ ] Daily check of metrics
  - [ ] Weekly review of performance
  - [ ] Monthly cost review

### 6.8 Optimization Iteration

- [ ] Analyze real-world performance
  - [ ] Identify slow queries
  - [ ] Find bottlenecks
  - [ ] Review error logs

- [ ] Implement optimizations
  - [ ] Add caching where needed
  - [ ] Optimize slow queries
  - [ ] Improve error handling

- [ ] Monitor impact of changes
  - [ ] Performance improvements
  - [ ] Cost impact
  - [ ] User satisfaction

### 6.9 Phase 6 Validation

- [ ] 100% of traffic on Cloudflare Workers
- [ ] VPS decommissioned and subscription cancelled
- [ ] Cost is $0/month (within free tier)
- [ ] Performance meets or exceeds VPS
- [ ] Error rate < 0.1%
- [ ] No critical bugs reported
- [ ] Monitoring and alerts working
- [ ] Documentation updated
- [ ] Team trained on new system
- [ ] Rollback plan tested (not executed, just validated)

**Checkpoint**: Phase 6 complete when all items checked ✅

---

## ✅ Post-Migration Tasks

### Documentation Updates

- [ ] Update README.md with new deployment instructions
- [ ] Update architecture diagrams
- [ ] Archive old VPS documentation
- [ ] Create new runbooks for Workers environment

### Team Training

- [ ] Train team on Cloudflare dashboard
- [ ] Document debugging procedures
- [ ] Share access to Cloudflare account
- [ ] Create troubleshooting guide

### Continuous Improvement

- [ ] Set up regular performance reviews
- [ ] Monitor cost trends
- [ ] Collect user feedback
- [ ] Plan future enhancements

### Celebrate! 🎉

- [ ] Document cost savings achieved
- [ ] Share migration success story
- [ ] Recognize team contributions
- [ ] Plan next optimization project

---

## 📊 Success Metrics Tracker

Track these metrics throughout the migration:

| Metric | Baseline (VPS) | Target (Workers) | Actual (Workers) |
|--------|----------------|------------------|------------------|
| Monthly Cost | $24 | $0 | ___ |
| P95 Latency | ___ ms | < 2000 ms | ___ ms |
| Error Rate | ___ % | < 0.1% | ___ % |
| Cache Hit Rate | ___ % | > 60% | ___ % |
| Uptime | ___ % | > 99.9% | ___ % |
| Cold Start | N/A | < 500 ms | ___ ms |

---

## 🚨 Risk Mitigation Checklist

- [ ] Backup plan documented and tested
- [ ] Rollback procedure ready
- [ ] VPS kept alive during migration period
- [ ] Monitoring alerts configured
- [ ] Emergency contacts identified
- [ ] Data backup strategy in place
- [ ] Gradual rollout plan prevents big-bang risk
- [ ] Can revert DNS changes quickly if needed

---

## 📞 Support Resources

- **Cloudflare Support**: https://dash.cloudflare.com/support
- **Clerk Support**: https://clerk.com/support
- **MongoDB Support**: https://support.mongodb.com
- **Qdrant Support**: https://qdrant.tech/support

---

*Last Updated: 2024-11-30*
*Migration Start Date: ___________*
*Expected Completion Date: ___________*
