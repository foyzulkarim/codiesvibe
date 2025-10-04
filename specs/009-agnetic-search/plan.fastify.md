# Adjusted Implementation Plan: Agentic Search (Standalone Fastify Service on 4002)

## Project Overview
- Build a standalone Fastify-based API that handles natural-language queries to discover AI tools, running independently from the NestJS backend.
- The service listens on port `4002`, loads the full tools dataset into memory at startup from MongoDB, and exposes endpoints for query, health, and optional metrics.
- Do not integrate with the existing UI or NestJS API initially; this runs as a sibling service for isolated testing.

## Stack Decisions
- Runtime: `Node.js 18+`, `TypeScript 5+`
- Web framework: `Fastify 4` with `@fastify/cors`, `@fastify/swagger` (optional), `pino` logging
- Database: `MongoDB Node.js driver` (lightweight) to fetch all documents at startup
- LLM: `Ollama` (e.g., Llama 3.1/Mistral) via HTTP for AI reasoning
- Testing: `Jest` or `Vitest` + `supertest` for HTTP

## Service Layout (new sibling directory)
- `search-api/` (top-level sibling to `backend/`)
  - `src/`
    - `server.ts`: Fastify app bootstrap (port 4002), plugins, routes
    - `config/agentic.ts`: feature flags, limits, iterations, model settings
    - `config/fields.ts`: allowed field paths, array fields, field types, operators
    - `data/loader.ts`: Mongo connect + in-memory dataset load (on startup)
    - `graph/{planner.ts, executor.ts, evaluator.ts, response.ts, context.ts, ambiguity.ts, confidence.ts}`
    - `tools/{filterByField.ts, filterByArrayContains.ts, sortByField.ts, searchByText.ts, limitResults.ts, validators.ts, base.ts}`
    - `prompts/{system.md, templates/*.md}` (LLM mode only)
    - `routes/{health.ts, query.ts, metrics.ts}`
    - `types/index.ts`: Tool interfaces (aligned with existing AITool model)
  - `tsconfig.json`, `package.json`, `jest.config.ts` (or `vitest.config.ts`)
- Root-level: `Dockerfile.search` (dedicated image for this service)

## API Surface (initial)
- `GET /health` → `{ status: 'ok', uptime, datasetLoaded: boolean, count }`
- `POST /query` → body `{ query: string, limit?: number, offset?: number, mode?: 'llm'|'rules' }`
  - response `{ results: Tool[], total: number, history: Step[], summary: {...}, reasoningChain: ReasoningStep[], confidence: number, disambiguationOptions?: string[] }`
- `GET /metrics` (optional) → Prometheus text format or JSON

## Data Loading Strategy
- On startup:
  - Read `MONGO_URI`, `DB_NAME`, and `COLLECTION_NAME` from env
  - Connect with MongoDB driver, fetch all docs (estimated ~500), and store in `originalDataset`
  - Set `currentResults = originalDataset.slice()` per request, not globally
  - Consider a `POST /reload` (admin-only) to re-fetch data manually when needed

## Tool Layer (enhanced with AI reasoning)
- Pure functions with validation and reasoning:
  - `filterByField(field, operator, value, data)` - includes selection rationale
  - `filterByArrayContains(field, values, mode, data)` - explains why items matched
  - `sortByField(field, order, data)` - includes sorting justification
  - `searchByText(query, fields, mode, data)` - provides search relevance scoring
  - `limitResults(limit, offset, data)` - explains pagination logic
- Central validation: `tools/validators.ts` referencing `config/fields.ts`
- Base tool interface: `tools/base.ts` with reasoning and confidence support

## Orchestration & State (AI-Enhanced)
- State per request:
  - `originalDataset` (immutable reference), `currentResults`, `userQuery`, `toolHistory`, `iterationCount`, `isComplete`, `metadata`
  - `queryContext`: Maintains intent, entities, and constraints across iterations
  - `confidenceScores`: Tracks confidence for each reasoning step
  - `disambiguationState`: Stores clarification requests and options
- Planner:
  - Rules-based default (deterministic mappings for "free", "API access", "popular", "affordable")
  - LLM-based planner via Ollama with JSON tool selection outputs
  - Context-aware planning that considers previous steps and user intent
- Executor: validate tool + params, run tool, update `currentResults`, append `toolHistory`, update confidence scores
- Evaluator: stop on completion signal, iteration cap (`MAX_ITERATIONS=10`), empty results, satisfactory size/relevance, or low confidence threshold
- Response: format top N results (default `20`) with key fields, summary, reasoning chain, confidence metrics, and disambiguation options

## AI Reasoning Features
- **Reasoning Explanation**: Each tool application includes a `reasoning` field explaining why it was chosen
- **Context Preservation**: Maintain `queryContext` object across iterations storing intent, entities, and constraints
- **Ambiguity Resolution**: Detect ambiguous queries using confidence scoring and entity recognition, implement clarification request mechanism
- **Reasoning Confidence**: Each reasoning step includes confidence score (0.0-1.0), overall query confidence calculated from step confidences

## Prompt Engineering Strategy
- Unified Reference: See `specs/009-agnetic-search/prompt.fastify.md` for consolidated system and template guidance
- **System Prompt Architecture**: Multi-layered prompt system with role definition, context awareness, and output formatting
  - `prompts/system/base.md`: Core system role and behavior guidelines
  - `prompts/system/reasoning.md`: Reasoning methodology and confidence scoring instructions
  - `prompts/system/tools.md`: Available tools documentation and usage patterns
  - `prompts/system/output-format.md`: Strict JSON schema requirements and examples
- **Template System**: Dynamic prompt templates for different query types and contexts
  - `prompts/templates/query-analysis.md`: Initial query understanding and intent extraction
  - `prompts/templates/tool-selection.md`: Tool selection reasoning with confidence scoring
  - `prompts/templates/ambiguity-resolution.md`: Clarification request generation
  - `prompts/templates/iteration-planning.md`: Multi-step reasoning and context preservation
- **Context Injection**: Structured context insertion including previous steps, available tools, and current state
- **Few-Shot Examples**: Curated examples for each prompt template demonstrating expected reasoning patterns
- **Prompt Validation**: Schema validation for prompt templates and dynamic content injection

## LLM Response Processing & Error Handling
- **Response Parsing Pipeline**: Multi-stage parsing with validation and error recovery
  - Stage 1: Raw response cleaning (remove markdown, extract JSON blocks)
  - Stage 2: JSON parsing with multiple fallback strategies
  - Stage 3: Schema validation against expected response format
  - Stage 4: Semantic validation (tool existence, parameter validity)
- **Error Recovery Strategies**: Comprehensive handling of malformed LLM responses
  - **Malformed JSON**: Attempt regex-based JSON extraction, partial parsing, and structure reconstruction
  - **Missing Fields**: Default value injection and field inference from context
  - **Invalid Tool Selection**: Fallback to rules-based tool selection with reasoning explanation
  - **Confidence Degradation**: Automatic retry with simplified prompts or rules-based fallback
- **Response Validation Schema**: Strict TypeScript interfaces with runtime validation using Zod
  - `LLMPlannerResponse`: Tool selection with reasoning and confidence
  - `LLMAnalysisResponse`: Query analysis with intent and entities
  - `LLMClarificationResponse`: Disambiguation options and refinement suggestions
- **Retry Logic**: Exponential backoff with prompt simplification on repeated failures
- **Fallback Mechanisms**: Graceful degradation to rules-based processing when LLM parsing fails consistently

## Configuration
- `.env` (root or `search-api/.env`):
  - `MONGO_URI`, `DB_NAME`, `COLLECTION_NAME`
  - `OLLAMA_URL`, `OLLAMA_MODEL`, `TEMPERATURE`
  - `PORT=4002`, `DEFAULT_LIMIT=20`, `MAX_ITERATIONS=10`
  - `CONFIDENCE_THRESHOLD=0.3`, `ENABLE_REASONING_EXPLANATION=true`
- `search-api/src/config/agentic.ts`: mirrors env with sane defaults
- `search-api/src/config/fields.ts`: enums for `AllowedFields`, `ArrayFields`, `FieldTypes`, `Operators`

## Docker & Compose
- Add `Dockerfile.search` at repo root:
  - `FROM node:18-alpine`
  - Install deps, build TS, run `node dist/server.js`
  - Expose `4002`
- Update compose files to add sibling service:
  - `docker-compose.infra.yml` (if needed for dev) or `docker-compose.production.yml`:
    - Service `search-api`:
      - `build:` context `.` with `dockerfile: Dockerfile.search`
      - `environment:` `MONGO_URI`, `DB_NAME`, `COLLECTION_NAME`, `OLLAMA_URL`, `OLLAMA_MODEL`, `PORT=4002`, `CONFIDENCE_THRESHOLD`
      - `ports:` "4002:4002"
      - `depends_on:` `mongodb` (if using internal infra)
      - `networks:` `codiesvibe-network`

## Observability
- Logging: pino via Fastify logger; structured logs for each tool execution with reasoning
- Health: `/health` returns dataset status and counts
- Metrics: optional `prom-client` with `/metrics` including reasoning confidence metrics

## Testing Plan
- Integration tests against Fastify routes using `supertest`
- Seed DB via existing mechanisms or test fixtures; assert in-memory load at startup
- Scenarios:
  - "show me free tools" → filter by `pricingSummary.hasFreeTier` with reasoning
  - "most popular tools with API access" → filter + sort with confidence scoring
  - "affordable tools for data analysis" → price range + category with context preservation
  - Ambiguous queries: "show me tools" → should request clarification
- Edge cases: empty results, typos, over-filtering, pagination bounds, low confidence scenarios

## Implementation Order
1) Bootstrap Fastify server on `4002` with basic routes (`/health`, `/query`)
2) Implement Mongo loader for in-memory dataset at startup
3) Implement validation utilities and the five pure-function tools with reasoning support
4) Implement state + executor + evaluator + response with AI reasoning features
5) Implement rules-based planner with context awareness; integrate LLM planner with fallback to rules on failure
6) Add context preservation, ambiguity resolution, and confidence scoring systems
7) Wire Swagger (optional) and complete request/response schemas with reasoning metadata
8) Add `Dockerfile.search` and compose service definition; confirm container runs
9) Write integration tests and seed data for local runs

## Risks & Mitigations
- Memory footprint: ~500 docs acceptable; monitor sizes and consider pagination defaults
- Schema drift: derive field enums from actual collection schema; add startup validation
- Connectivity: ensure robust Mongo reconnect/backoff; log failures clearly
- Reasoning complexity: confidence thresholds prevent infinite loops on ambiguous queries

## Deliverables
- New service directory: `search-api/` with all source files including AI reasoning components
- `Dockerfile.search` at repo root
- Compose updates adding `search-api` on port `4002`
- Tests for core scenarios including AI reasoning validation