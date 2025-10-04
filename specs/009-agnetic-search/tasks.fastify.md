# Ultimate Sequential Task List: Agentic Search Fastify API (POC)

This list is designed for agentic, step-by-step execution to implement the standalone Fastify service on port 4002. It follows `specs/009-agnetic-search/plan.fastify.md` and ignores production load/performance concerns.

## Prerequisites
- Node.js 18+, npm
- MongoDB reachable via `MONGO_URI` (collection pre-populated)

## Phase 0: Project Skeleton

[SF001] Create sibling service directory and base files
- Create `search-api/` adjacent to `backend/` with `src/`, `package.json`, `tsconfig.json`, `.env.example`
- Acceptance: Directory exists with base files ready for install

[SF002] Initialize package.json and install dependencies
- Add dependencies: `fastify @fastify/cors mongodb dotenv zod pino`
- Dev deps: `ts-node typescript nodemon` (or `vitest`/`jest` if testing now)
- Scripts: `dev`, `build`, `start`
- Acceptance: `npm run dev` compiles and starts (will fail until server is created)

[SF003] Setup TypeScript config
- Create `search-api/tsconfig.json` with Node18 target, `outDir` `dist`
- Acceptance: TS compiles minimal file successfully

## Phase 1: Configuration & Types

[SF004] Implement agentic config loader
- File: `search-api/src/config/agentic.ts`
- Load env (PORT=4002, DEFAULT_LIMIT=20, MAX_ITERATIONS=10, Mongo settings, OLLAMA_URL, OLLAMA_MODEL, TEMPERATURE, CONFIDENCE_THRESHOLD=0.3, ENABLE_REASONING_EXPLANATION=true)
- Acceptance: Module exports config with defaults and env override

[SF005] Define field enums and operators
- File: `search-api/src/config/fields.ts`
- Export `AllowedFields`, `ArrayFields`, `FieldTypes`, `Operators`
- Acceptance: Enums/types reflect actual tool schema; basic unit import works

[SF006] Define tool and state types with AI reasoning
- File: `search-api/src/types/index.ts`
- Export `Tool`, `ToolHistoryStep`, `AgentState`, `QueryContext`, `ConfidenceScore`, `ReasoningStep`, request/response DTOs
- Acceptance: Types compile and are imported by server

## Phase 2: Fastify Server & Routes

[SF007] Bootstrap Fastify server on 4002
- File: `search-api/src/server.ts`
- Enable logger (pino), CORS; health route `/health`
- Acceptance: `GET /health` returns `{status:'ok', uptime}`

 [SF008] Add query route
 - File: `search-api/src/routes/query.ts`
 - Register under `/query` (POST)
 - Acceptance: Route is mounted; stub returns 200 with placeholder payload

## Phase 3: Data Loading (In-Memory)

[SF009] Implement Mongo connector
- File: `search-api/src/data/loader.ts`
- Connect using Mongo driver; functions: `connect()`, `loadAll()`, `reload()`
- Acceptance: On startup, service loads all docs into memory and logs count

[SF010] Wire dataset into server lifecycle
- Update `server.ts` to call `connect()` and `loadAll()` before listening
- Store `originalDataset` in app context; per-request copy for `currentResults`
- Acceptance: `/health` includes `{datasetLoaded:true, count:N}`

## Phase 4: Tool Layer (AI-Enhanced Pure Functions)

**Reference**: See `specs/009-agnetic-search/tools-reference.md` for complete tool specifications (27 tools total)

[SF011] Implement base tool interface with reasoning
- File: `search-api/src/tools/base.ts`
- Create base interface for tool responses with `reasoning: string` and `confidence: number` fields
- Acceptance: Base interface used by all tools

[SF012] Implement nested path util
- File: `search-api/src/tools/validators.ts` or `src/utils/path.ts`
- `getNestedValue(obj, path)` safe access; `assertField(field)` validation
- Acceptance: Util functions tested with sample objects

## Phase 4.1: Core Filtering Tools (7 tools)

[SF013] Implement filterByField with reasoning
- File: `search-api/src/tools/filterByField.ts`
- Params: `{field, operator, value}`; validates types; returns filtered array with selection rationale
- Acceptance: Works for boolean, number, string fields; includes why items were filtered

[SF014] Implement filterByArrayContains with explanation
- File: `search-api/src/tools/filterByArrayContains.ts`
- Params: `{field, value|values, mode:'any'|'all'}`; array field validation; explains matches
- Acceptance: Matches single/multi values correctly with reasoning

[SF014A] Implement filterByNestedField
- File: `search-api/src/tools/filterByNestedField.ts`
- Params: `{path, operator, value}`; nested object property filtering (e.g., pricing.free)
- Acceptance: Handles deep object paths with proper validation

[SF014B] Implement filterByArrayIntersection
- File: `search-api/src/tools/filterByArrayIntersection.ts`
- Params: `{field, values, minMatches?}`; finds items where arrays have overlapping values
- Acceptance: Correctly identifies intersection matches with configurable thresholds

[SF014C] Implement filterByPriceRange
- File: `search-api/src/tools/filterByPriceRange.ts`
- Params: `{minPrice?, maxPrice?, currency?, includeFreemium?}`; specialized price filtering
- Acceptance: Handles various pricing models and currency considerations

[SF014D] Implement filterByDateRange
- File: `search-api/src/tools/filterByDateRange.ts`
- Params: `{field, startDate?, endDate?, format?}`; ISO date support with flexible parsing
- Acceptance: Handles multiple date formats and timezone considerations

[SF014E] Implement filterByExists
- File: `search-api/src/tools/filterByExists.ts`
- Params: `{field, exists: boolean}`; checks field existence and null/undefined values
- Acceptance: Properly distinguishes between missing fields and null values

## Phase 4.2: Sorting Tools (3 tools)

[SF015] Implement sortByField with justification
- File: `search-api/src/tools/sortByField.ts`
- Params: `{field, order:'asc'|'desc'}`; stable sort; undefined handling; includes sorting logic
- Acceptance: Correct ordering with undefineds at end consistently with rationale

[SF015A] Implement sortByNestedField
- File: `search-api/src/tools/sortByNestedField.ts`
- Params: `{path, order, nullsLast?}`; sort by nested object properties
- Acceptance: Handles deep paths with proper null/undefined positioning

[SF015B] Implement sortByMultipleFields
- File: `search-api/src/tools/sortByMultipleFields.ts`
- Params: `{fields: [{field, order}]}`; multi-field sorting with priority order
- Acceptance: Maintains sort stability across multiple criteria

## Phase 4.3: Search and Match Tools (4 tools)

[SF016] Implement searchByText with relevance scoring
- File: `search-api/src/tools/searchByText.ts`
- Params: `{query, fields?, mode:'any'|'all'}`; case-insensitive keyword match; relevance scores
- Acceptance: Finds items across multiple fields; mode respected; includes search confidence

[SF016A] Implement searchByKeywords
- File: `search-api/src/tools/searchByKeywords.ts`
- Params: `{query, fuzzyMatch?, threshold?}`; fuzzy match across searchKeywords and aliases
- Acceptance: Handles typos and partial matches with configurable similarity

[SF016B] Implement findById
- File: `search-api/src/tools/findById.ts`
- Params: `{id}`; exact ID matching with validation
- Acceptance: Returns single result or null with clear error handling

[SF016C] Implement findBySlug
- File: `search-api/src/tools/findBySlug.ts`
- Params: `{slug}`; exact slug matching with normalization
- Acceptance: Handles slug variations and returns appropriate results

## Phase 4.4: Aggregation Tools (5 tools)

[SF016D] Implement groupBy
- File: `search-api/src/tools/groupBy.ts`
- Params: `{field, includeCount?}`; groups results by field value(s)
- Acceptance: Handles nested fields and provides group statistics

[SF016E] Implement countBy
- File: `search-api/src/tools/countBy.ts`
- Params: `{field}`; counts occurrences by field value
- Acceptance: Returns count map with proper null/undefined handling

[SF016F] Implement getUnique
- File: `search-api/src/tools/getUnique.ts`
- Params: `{field, includeNulls?}`; gets distinct values for a field
- Acceptance: Handles arrays and nested fields with deduplication

[SF016G] Implement getMinMax
- File: `search-api/src/tools/getMinMax.ts`
- Params: `{field}`; gets minimum and maximum values for numeric fields
- Acceptance: Handles non-numeric values gracefully with type validation

[SF016H] Implement calculateAverage
- File: `search-api/src/tools/calculateAverage.ts`
- Params: `{field, excludeNulls?}`; calculates average for numeric fields
- Acceptance: Proper null handling and numeric validation

## Phase 4.5: Array Operations (5 tools)

[SF017] Implement limitResults with pagination logic
- File: `search-api/src/tools/limitResults.ts`
- Params: `{limit, offset}`; safe slicing; explains pagination decisions
- Acceptance: Correct pagination for sample arrays with reasoning

[SF017A] Implement skipResults
- File: `search-api/src/tools/skipResults.ts`
- Params: `{count}`; skips N results for pagination
- Acceptance: Handles edge cases and maintains result integrity

[SF017B] Implement intersectResults
- File: `search-api/src/tools/intersectResults.ts`
- Params: `{compareSet, keyField?}`; gets intersection with another result set
- Acceptance: Proper comparison logic with configurable key fields

[SF017C] Implement unionResults
- File: `search-api/src/tools/unionResults.ts`
- Params: `{additionalSet, keyField?, removeDuplicates?}`; combines result sets
- Acceptance: Handles duplicates and maintains order

[SF017D] Implement getDifference
- File: `search-api/src/tools/getDifference.ts`
- Params: `{compareSet, keyField?}`; gets results in current but not in comparison
- Acceptance: Accurate difference calculation with proper key handling

## Phase 4.6: Projection and Utility Tools (3 tools)

[SF017E] Implement selectFields
- File: `search-api/src/tools/selectFields.ts`
- Params: `{fields}`; returns only specified fields from results
- Acceptance: Handles nested field selection and maintains data structure

[SF017F] Implement excludeFields
- File: `search-api/src/tools/excludeFields.ts`
- Params: `{fields}`; excludes specified fields from results
- Acceptance: Proper field exclusion with nested path support

[SF017G] Implement getSchema and getCurrentResults
- File: `search-api/src/tools/utility.ts`
- `getSchema()`: returns field structure for LLM self-discovery
- `getCurrentResults()`: gets current state of filtered data
- Acceptance: Provides accurate schema information and current state

[SF018] Create comprehensive tools registry with metadata
- File: `search-api/src/tools/index.ts`
- Export map `{ name, func, schema, description, reasoningExamples }` for all 27 tools
- Include categorization and usage patterns for AI reasoning
- Acceptance: Single import gives full registry for planner/executor with proper categorization

## Phase 5: AI Reasoning Components

[SF019] Define context preservation system
- File: `search-api/src/graph/context.ts`
- Create `QueryContext` interface with intent, entities, constraints
- Add context merging and drift detection logic
- Acceptance: Context maintained across 5+ iterations without drift

## Phase 5.1: Prompt Engineering Implementation

Note: Use the unified reference `specs/009-agnetic-search/prompt.fastify.md` for consolidated system and template guidance.

[SF019A] Create system prompt architecture
- Files: `search-api/src/prompts/system/{base.md, reasoning.md, tools.md, output-format.md}`
- `base.md`: Core AI assistant role, behavior guidelines, and response principles
- `reasoning.md`: Step-by-step reasoning methodology, confidence scoring instructions, and transparency requirements
- `tools.md`: Complete documentation of all 5 tools with parameters, examples, and usage patterns
- `output-format.md`: Strict JSON schema requirements with examples for all response types
- Acceptance: System prompts define clear AI behavior and output expectations

[SF019B] Implement prompt template system
- Files: `search-api/src/prompts/templates/{query-analysis.md, tool-selection.md, ambiguity-resolution.md, iteration-planning.md}`
- `query-analysis.md`: Template for initial query understanding with intent extraction and entity recognition
- `tool-selection.md`: Template for tool selection reasoning with confidence scoring and parameter validation
- `ambiguity-resolution.md`: Template for generating clarification requests with refinement suggestions
- `iteration-planning.md`: Template for multi-step reasoning with context preservation and next action planning
- Acceptance: Templates provide structured prompts for different reasoning scenarios

[SF019C] Create prompt builder and validator
- File: `search-api/src/prompts/builder.ts`
- Implement dynamic prompt construction with context injection and template selection
- Add validation for prompt templates and dynamic content using Zod schemas
- Include few-shot example injection based on query type and context
- Acceptance: Builder generates valid prompts with proper context and examples

[SF019D] Add few-shot examples repository
- Files: `search-api/src/prompts/examples/{query-types.json, reasoning-patterns.json, tool-usage.json}`
- Curated examples for different query patterns (filtering, searching, sorting, complex multi-step)
- Reasoning pattern examples showing proper confidence scoring and explanation structure
- Tool usage examples demonstrating parameter selection and combination strategies
- Acceptance: Examples improve LLM performance and consistency across query types

## Phase 5.2: LLM Response Processing Implementation

[SF019E] Implement response parsing pipeline
- File: `search-api/src/llm/parser.ts`
- Stage 1: Raw response cleaning (markdown removal, JSON block extraction, whitespace normalization)
- Stage 2: Multi-strategy JSON parsing (direct parse, regex extraction, bracket matching, partial reconstruction)
- Stage 3: Schema validation using Zod with detailed error reporting
- Stage 4: Semantic validation (tool existence, parameter types, confidence ranges)
- Acceptance: Pipeline handles various LLM response formats and provides detailed error information

[SF019F] Create response validation schemas
- File: `search-api/src/llm/schemas.ts`
- Define Zod schemas for `LLMPlannerResponse`, `LLMAnalysisResponse`, `LLMClarificationResponse`
- Include runtime validation with custom error messages and field-level validation
- Add schema versioning and backward compatibility handling
- Acceptance: Schemas catch malformed responses and provide actionable error messages

[SF019G] Implement error recovery strategies
- File: `search-api/src/llm/recovery.ts`
- Malformed JSON recovery: regex-based extraction, bracket balancing, quote fixing
- Missing field handling: default value injection, field inference from context, partial response acceptance
- Invalid tool selection: fallback to rules-based selection with confidence penalty
- Confidence degradation: automatic retry with simplified prompts and context reduction
- Acceptance: System gracefully handles LLM parsing failures and maintains functionality

[SF019H] Add retry logic with exponential backoff
- File: `search-api/src/llm/retry.ts`
- Implement exponential backoff for LLM request failures (network, timeout, rate limiting)
- Progressive prompt simplification on repeated parsing failures
- Maximum retry limits with graceful degradation to rules-based processing
- Detailed logging of retry attempts and failure patterns for debugging
- Acceptance: System handles temporary LLM unavailability and parsing issues robustly

[SF020] Implement confidence scoring system
- File: `search-api/src/graph/confidence.ts`
- Create confidence calculation for each reasoning step (0.0-1.0)
- Add confidence thresholds for triggering clarifications
- Acceptance: Confidence scores visible for all reasoning steps

[SF021] Add ambiguity detection and resolution
- File: `search-api/src/graph/ambiguity.ts`
- Implement confidence scoring for query interpretation
- Create clarification request generator with refinement suggestions
- Update response formatter to include disambiguation options
- Acceptance: System requests clarification for "show me tools" vs specific queries

[SF022] Define state helpers with AI reasoning
- File: `search-api/src/graph/state.ts`
- Create/init functions for `AgentState` with `queryContext`, `confidenceScores`, `disambiguationState`
- JSON-safe copies; history appender with reasoning
- Acceptance: Helpers used by routes; type-safe with AI components

[SF023] Implement rules-based planner with context awareness
- File: `search-api/src/graph/planner.ts`
- Map common intents: free, API access, popular, affordable, category
- Consider existing context when selecting tools; outputs action JSON with reasoning
- Acceptance: Given query strings, planner returns sensible first action with explanation

[SF024] Implement LLM planner with reasoning and robust parsing
- File: `search-api/src/graph/planner.llm.ts`
- Call Ollama with system/user prompts using prompt builder from Phase 5.1
- Implement robust JSON parsing using response parsing pipeline from Phase 5.2
- Consider context history in prompts; fallback to rules if LLM fails (e.g., network error or invalid output)
- Use retry logic with exponential backoff for network failures and parsing errors
- Acceptance: Returns valid outputs with reasoning; falls back appropriately on errors; handles malformed responses gracefully

[SF025] Implement executor with confidence tracking
- File: `search-api/src/graph/executor.ts`
- Validate action tool/params; execute; update `currentResults`, `toolHistory`, `iterationCount`, `confidenceScores`
- Returns updated state with reasoning for each step
- Acceptance: Returns updated state; errors handled without crash; includes confidence

[SF026] Implement evaluator with reasoning quality checks
- File: `search-api/src/graph/evaluator.ts`
- Termination checks: `isComplete`, max iterations, empty results, satisfactory size, low confidence threshold
- Quality checks: context drift, confidence degradation, ambiguity detection
- Acceptance: Sets `isComplete` properly for normal flows and low confidence scenarios

[SF027] Implement response formatter with reasoning chain
- File: `search-api/src/graph/response.ts`
- Generates `{ results, total, history, summary, reasoningChain, confidence, disambiguationOptions? }`
- Include top N limit with confidence metrics and alternative interpretations
- Acceptance: Clean, stable JSON output with reasoning transparency

## Phase 6: Wire Routes to Orchestrator

[SF028] Implement POST /query handler with AI reasoning
- File: `search-api/src/routes/query.ts`
- Validate body `{query, limit?, offset?}`; init state with context; loop planner→executor→evaluator until done; return response with reasoning
- Include confidence scores and disambiguation options when needed
- Acceptance: Sends structured results with reasoning for real queries; handles errors with 4xx/5xx

 (Skip metrics for POC)

## Phase 7: Containerization & Compose

[SF030] Create Dockerfile.search
- Path: `Dockerfile.search`
- Node 18-alpine; install, build, run `node dist/server.js`; expose 4002
- Acceptance: Image builds locally; container starts and `/health` works

[SF031] Add compose service definition
- Files: `docker-compose.infra.yml` (dev) and/or `docker-compose.production.yml`
- Add `search-api` service with `dockerfile: Dockerfile.search`, `ports: "4002:4002"`, env (`MONGO_URI`, `DB_NAME`, `COLLECTION_NAME`, `OLLAMA_URL`, `OLLAMA_MODEL`, `CONFIDENCE_THRESHOLD`), `networks: codiesvibe-network`, `depends_on: mongodb` when applicable
- Acceptance: `docker-compose up -d` brings up search-api; `/health` OK

## Phase 8: Smoke Tests & Examples (POC)

[SF032] Add si...(3747 characters truncated)