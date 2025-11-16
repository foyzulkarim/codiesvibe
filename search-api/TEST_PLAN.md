# Search API Test Plan

## Overview

This document outlines the comprehensive testing strategy for the search-api project. The focus is on validating query generation accuracy, especially MongoDB query construction and operator handling.

**Critical Bug to Address**: MongoDB operators missing `$` prefix (e.g., `lt` instead of `$lt`) in pricing comparison queries.

---

## Test Infrastructure

### Tools & Dependencies
- **Jest**: Test runner and assertion library
- **ts-jest**: TypeScript support for Jest
- **@testcontainers/qdrant**: Qdrant container for integration tests
- **mongodb-memory-server**: In-memory MongoDB for integration tests
- **supertest**: HTTP API testing
- **@faker-js/faker**: Test data generation

### Mock Strategy
- **LLM Calls**: Always mocked with deterministic fixtures
- **MongoDB**: Use mongodb-memory-server for integration tests, mock for unit tests
- **Qdrant**: Use testcontainers for integration tests, mock for unit tests
- **Embeddings**: Deterministic mock vectors

---

## Test Suite Organization

```
src/
└── __tests__/
    ├── unit/                 # Isolated component tests
    ├── integration/          # Multi-component tests
    ├── e2e/                  # Full API tests
    ├── mocks/                # Mock factories
    ├── fixtures/             # Test data
    └── helpers/              # Test utilities
```

---

## 1. Unit Tests - Query Planner Node

**File**: `src/__tests__/unit/nodes/query-planner.test.ts`

**Focus**: Test the query plan generation logic, especially filter generation and MongoDB query construction.

### Test Scenarios

#### 1.1 Intent Analysis Tests

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Identity-focused query analysis** | `analyzeQueryIntent()` with "find" goal | Should return strategy: "identity-focused", primaryCollections: ["tools"] |
| **Capability-focused query analysis** | Intent with features array populated | Should return strategy: "capability-focused", primaryCollections: ["functionality"] |
| **Use case-focused query analysis** | Intent with "use case" in primaryGoal | Should return strategy: "usecase-focused", primaryCollections: ["usecases"] |
| **Technical-focused query analysis** | Intent with deployment/platform preferences | Should return strategy: "technical-focused", primaryCollections: ["interface"] |
| **Multi-faceted query analysis** | Intent with 3+ features and 2+ constraints | Should return strategy: "multi-collection-hybrid" |
| **Unclear intent analysis** | Minimal intent data | Should return strategy: "adaptive-weighted" with confidence < 0.7 |

**Why Important**: Correct strategy selection determines which collections are queried and how results are fused.

---

#### 1.2 Controlled Vocabulary Validation Tests 🔴 **CRITICAL**

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Exact category match** | Intent with category: "Code Editor" | Filter should use exact value "Code Editor", not variations |
| **Invalid category rejection** | Intent with category: "Code Editing Tool" (invalid) | Should NOT create filter, or fallback to valid value |
| **Exact interface match** | Intent with interface: "CLI" | Filter should use exact value "CLI" |
| **Interface synonym rejection** | Intent with interface: "Command Line" (invalid) | Should map to "CLI" or reject |
| **Exact pricing model match** | Intent with pricingModel: "Free" | Filter should use exact value "Free" |
| **Case sensitivity handling** | Intent with category: "code editor" (lowercase) | Should normalize to "Code Editor" or reject |
| **Multiple exact matches** | Intent with categories array | All values must be from controlled vocabulary |

**Why Important**: Controlled vocabulary ensures filter values match database schema exactly.

---

#### 1.3 MongoDB Filter Generation Tests 🔴 **CRITICAL** (Bug Focus)

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Price comparison: less than** | `priceComparison: {operator: "less_than", value: 50}` | MongoDB filter: `{field: "pricing", operator: "elemMatch", value: {price: {$lt: 50}}}` with **$lt** |
| **Price comparison: greater than** | `priceComparison: {operator: "greater_than", value: 100}` | MongoDB filter: `{price: {$gt: 100}}` with **$gt** |
| **Price comparison: equal to** | `priceComparison: {operator: "equal_to", value: 20}` | MongoDB filter: `{price: 20}` (no operator) or `{price: {$eq: 20}}` |
| **Price comparison: around** | `priceComparison: {operator: "around", value: 30}` | MongoDB filter: `{price: {$gte: 27, $lte: 33}}` (±10% range) with **$gte** and **$lte** |
| **Price range: between** | `priceRange: {min: 20, max: 100}` | MongoDB filter: `{price: {$gte: 20, $lte: 100}}` with **$gte** and **$lte** |
| **Price range: min only** | `priceRange: {min: 50, max: null}` | MongoDB filter: `{price: {$gte: 50}}` with **$gte** |
| **Price range: max only** | `priceRange: {min: null, max: 200}` | MongoDB filter: `{price: {$lte: 200}}` with **$lte** |
| **Price with billing period** | `priceComparison: {..., billingPeriod: "Monthly"}` | MongoDB filter: `{elemMatch: {price: {$lt: 50}, billingPeriod: "Monthly"}}` |
| **Combined price filters** | Both priceRange and priceComparison | Should generate multiple elemMatch filters or compound query |

**Why Important**: This is where the reported bug occurs. Missing `$` prefix breaks MongoDB queries completely.

---

#### 1.4 Structured Source Filter Format Tests 🔴 **CRITICAL**

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Filter array format** | Generated structuredSources | `filters` field MUST be an array of objects, not a plain object |
| **Single filter structure** | One interface filter | `[{field: "interface", operator: "in", value: ["CLI"]}]` |
| **Multiple filters structure** | Interface + deployment filters | `[{field: "interface", ...}, {field: "deployment", ...}]` as array |
| **Operator: "in" with array** | Multiple interface values | `{field: "interface", operator: "in", value: ["CLI", "Web"]}` |
| **Operator: "=" with single value** | Single status value | `{field: "status", operator: "=", value: "active"}` |
| **Array field filtering** | Filtering categories array | `{field: "categories", operator: "in", value: ["Development"]}` |
| **Empty filters array** | No constraints in intent | `filters: []` or omitted entirely |

**Why Important**: Incorrect filter format (object vs array) causes query executor to fail silently.

---

#### 1.5 Collection Selection Tests

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Primary collection inclusion** | Identity-focused query | vectorSources should include "tools" with high topK (70+) |
| **Secondary collection inclusion** | Capability-focused query | Should include "functionality" (primary) + "tools", "usecases" (secondary) |
| **Collection availability check** | Query plan with unavailable collection | Should skip unavailable collection, use fallback |
| **TopK allocation** | Primary vs secondary collections | Primary: topK 70-80, Secondary: topK 30-50 |
| **Embedding type assignment** | "functionality" collection | Should use "entities.functionality" embedding type |
| **Embedding type fallback** | Unknown collection | Should use "semantic" as default embedding type |
| **Collection weight assignment** | Multi-collection strategy | Primary collections should have higher weights |

**Why Important**: Correct collection selection ensures relevant data sources are queried.

---

#### 1.6 Fusion Method Selection Tests

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Multi-collection fusion** | 3+ vector sources | Should select "rrf" fusion method |
| **Two-source fusion** | Exactly 2 vector sources | Should select "weighted_sum" fusion method |
| **Single source** | 1 vector source only | Should select "none" or "concat" fusion |
| **Hybrid with structured** | Vector sources + structured sources | Should ensure fusion handles both types |

**Why Important**: Wrong fusion method produces poor result ranking.

---

#### 1.7 Edge Cases & Error Handling

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Null intent state** | queryPlannerNode with null intentState | Should return error, no plan generated |
| **Empty intent state** | intentState with all fields null/empty | Should generate minimal plan with defaults |
| **Invalid operator constant** | priceComparison with unknown operator | Should handle gracefully or use fallback |
| **Missing billing period** | Price filter without billingPeriod | Should generate query without billingPeriod constraint |
| **Very high topK** | topK > 200 | Should cap at 200 (maxTopK limit) |
| **Negative price values** | priceRange with min: -10 | Should reject or sanitize negative values |
| **LLM timeout/error** | Mocked LLM failure | Should return error with proper recovery strategy |

**Why Important**: Robust error handling prevents pipeline crashes.

---

## 2. Unit Tests - Query Executor Node

**File**: `src/__tests__/unit/nodes/query-executor.test.ts`

**Focus**: Test query execution against Qdrant and MongoDB, result fusion, and candidate enrichment.

### Test Scenarios

#### 2.1 Vector Search Execution Tests

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Query text vector source** | `queryVectorSource: "query_text"` | Should generate embedding from original query |
| **Reference tool vector source** | `queryVectorSource: "reference_tool_embedding"` | Should generate embedding from referenceTool in intent |
| **Semantic variant vector source** | `queryVectorSource: "semantic_variant"` | Should use semanticVariants[0] from intent |
| **Missing reference tool** | Reference source but no referenceTool | Should throw error with clear message |
| **Score threshold filtering** | Results with scores below threshold | Should filter out low-score results |
| **Adaptive threshold** | Structured results present | Should use higher threshold (0.7) when structured results exist |
| **Default threshold** | No structured results | Should use default threshold (0.5) |
| **TopK limit enforcement** | vectorSource with topK: 150 | Should return max 150 results from Qdrant |

**Why Important**: Vector search is the primary discovery mechanism.

---

#### 2.2 Structured Search Execution Tests 🔴 **CRITICAL**

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Operator: "=" (equals)** | `{field: "status", operator: "=", value: "active"}` | MongoDB query: `{status: "active"}` |
| **Operator: "in" (array)** | `{field: "interface", operator: "in", value: ["CLI", "Web"]}` | MongoDB query: `{interface: {$in: ["CLI", "Web"]}}` with **$in** |
| **Operator: ">" (greater)** | `{field: "popularity", operator: ">", value: 1000}` | MongoDB query: `{popularity: {$gt: 1000}}` with **$gt** |
| **Operator: "<" (less)** | `{field: "rating", operator: "<", value: 3}` | MongoDB query: `{rating: {$lt: 3}}` with **$lt** |
| **Operator: ">=" (gte)** | `{field: "price", operator: ">=", value: 50}` | MongoDB query: `{price: {$gte: 50}}` with **$gte** |
| **Operator: "<=" (lte)** | `{field: "price", operator: "<=", value: 100}` | MongoDB query: `{price: {$lte: 100}}` with **$lte** |
| **Operator: "contains"** | `{field: "name", operator: "contains", value: "AI"}` | MongoDB query: `{name: {$regex: "AI", $options: "i"}}` with **$regex** |
| **Multiple filters** | Array of 3 filters | Should combine all filters in MongoDB query |
| **Unknown operator** | `{operator: "custom"}` | Should handle gracefully (treat as equals) |
| **Empty filters array** | `filters: []` | Should query without filters (all documents) |

**Why Important**: This is where MongoDB operator bugs manifest - must verify `$` prefix exists.

---

#### 2.3 Result Fusion Tests

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **RRF fusion with 3 sources** | 3 candidate sources, fusion: "rrf" | Should apply Reciprocal Rank Fusion algorithm |
| **Weighted sum fusion** | 2 sources with weights, fusion: "weighted_sum" | Should combine scores with collection weights |
| **Concat fusion** | Multiple sources, fusion: "concat" | Should concatenate results without score fusion |
| **Single source** | 1 source only | Should normalize scores without fusion |
| **Empty sources** | No candidates from any source | Should return empty array |
| **Duplicate candidates** | Same tool ID in multiple sources | Should handle duplicates based on fusion method |
| **Score normalization** | Scores from 0-1 range | Should maintain normalized 0-1 scores |

**Why Important**: Fusion determines final ranking quality.

---

#### 2.4 Candidate Enrichment Tests

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Successful enrichment** | All candidate IDs exist in MongoDB | Should return full tool documents in order |
| **Partial enrichment** | Some IDs missing from MongoDB | Should return nulls for missing, documents for found |
| **Empty candidates** | No candidates to enrich | Should return empty array |
| **Order preservation** | Candidates in specific order | Should maintain exact candidate order after enrichment |
| **ID format handling** | Mix of ObjectId and string IDs | Should handle both formats correctly |
| **Batch fetch optimization** | 50 candidates | Should batch fetch in single MongoDB query |

**Why Important**: Users need full tool data, not just metadata.

---

#### 2.5 Execution Stats & Metadata Tests

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Query count tracking** | 2 vector + 1 structured query | Stats: `{vectorQueriesExecuted: 2, structuredQueriesExecuted: 1}` |
| **Execution timing** | Full query executor run | Should track execution time in metadata |
| **Fusion method tracking** | RRF fusion used | Stats should include `fusionMethod: "rrf"` |
| **Confidence propagation** | Plan confidence: 0.85 | Stats should include `confidence: 0.85` |
| **Error tracking** | Vector search fails | Should add error to state.errors array |

**Why Important**: Stats help debug performance and behavior.

---

## 3. Unit Tests - Intent Extractor Node

**File**: `src/__tests__/unit/nodes/intent-extractor.test.ts`

**Focus**: Test intent extraction with mocked LLM responses.

### Test Scenarios

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Simple query** | "free cli tools" | Intent: `{primaryGoal: "find", pricingModel: "Free", interface: "CLI"}` |
| **Price comparison query** | "AI tools under $50 per month" | Intent: `{priceComparison: {operator: "less_than", value: 50, billingPeriod: "Monthly"}}` |
| **Price range query** | "code editor between $20-100" | Intent: `{priceRange: {min: 20, max: 100}}` |
| **Comparison query** | "Cursor alternative" | Intent: `{referenceTool: "Cursor IDE", comparisonMode: "alternative_to"}` |
| **Complex query** | "free offline AI code generator" | Intent: `{pricingModel: "Free", functionality: ["Code Generation", "Local Inference"]}` |
| **Empty query** | "" (empty string) | Should return error |
| **LLM error** | Mock LLM throws error | Should return error in state.errors |
| **Invalid JSON response** | LLM returns malformed JSON | Should handle parsing error gracefully |

**Why Important**: Intent accuracy drives entire pipeline quality.

---

## 4. Integration Tests - LangGraph Pipeline

**File**: `src/__tests__/integration/langgraph-pipeline.test.ts`

**Focus**: Test full pipeline execution with mocked LLM but real MongoDB/Qdrant (testcontainers).

### Test Scenarios

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Full pipeline: cache miss** | New query, no cache hit | Should execute: cache-check → intent → planner → executor → cache-store |
| **Full pipeline: cache hit** | Query similar to cached | Should execute: cache-check → executor → cache-store (skip intent + planner) |
| **Pipeline state flow** | State transitions between nodes | Each node should update state correctly |
| **Error in intent node** | Mocked intent extraction failure | Should populate state.errors, continue or halt appropriately |
| **Error in planner node** | Mocked plan generation failure | Should populate state.errors |
| **Execution stats accumulation** | Full pipeline run | Should track timings for all nodes |
| **Metadata propagation** | executionPath tracking | Should show: ["cache-check", "intent-extractor", "query-planner", "query-executor", "cache-store"] |

**Why Important**: Validates node orchestration and state management.

---

## 5. Integration Tests - Multi-Collection Search

**File**: `src/__tests__/integration/multi-collection.test.ts`

**Focus**: Test multi-collection orchestration with real Qdrant testcontainer.

### Test Scenarios

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Tools collection search** | Identity-focused query | Should search "tools" collection with semantic embeddings |
| **Functionality collection search** | Capability-focused query | Should search "functionality" collection with entities.functionality embeddings |
| **Multi-collection hybrid** | Query needing multiple collections | Should search 3+ collections and apply RRF fusion |
| **Collection unavailability** | One collection missing | Should skip missing collection, use available ones |
| **Embedding type routing** | Different vector types | Should route to correct collection based on embedding type |

**Why Important**: Ensures multi-collection architecture works correctly.

---

## 6. E2E API Tests - HTTP Endpoints

**File**: `src/__tests__/e2e/search-api.test.ts`

**Focus**: Test HTTP API using supertest with mocked LLM.

### Test Scenarios

#### 6.1 Search Endpoint Tests

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Valid search request** | POST /search with valid query | 200 status, valid response structure |
| **Query validation: too long** | Query > 1000 chars | 400 status with validation error |
| **Query validation: invalid chars** | Query with `<script>` tags | 400 status, sanitized or rejected |
| **Query validation: empty** | Query: "" | 400 status with error message |
| **Limit parameter** | limit: 50 | Should return max 50 results |
| **Invalid limit** | limit: 500 (exceeds max) | 400 status or capped to 100 |
| **Debug mode** | debug: true | Response should include debug metadata |
| **Response structure** | Valid search | Should match schema: `{query, candidates, executionTime, executionStats}` |

---

#### 6.2 Security & Middleware Tests

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Rate limiting** | 31 requests in 1 minute | 31st request should return 429 (rate limit exceeded) |
| **CORS headers** | Request from allowed origin | Should include proper CORS headers |
| **CORS rejection** | Request from blocked origin | Should reject with CORS error |
| **Helmet headers** | Any request | Should include security headers (CSP, X-Frame-Options, etc.) |
| **Input sanitization** | NoSQL injection attempt | Should sanitize input, prevent injection |
| **Request size limit** | 15MB body | Should reject with 413 (payload too large) |

---

#### 6.3 Health Endpoint Tests

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **Health check** | GET /health | 200 status with `{status: "healthy", uptime, services}` |
| **Health response format** | Response structure | Should match expected schema |

---

## 7. Utility Tests

**File**: `src/__tests__/unit/utils/fusion.test.ts`

### Test Scenarios

| Test Scenario | What We're Testing | Expected Behavior |
|--------------|-------------------|-------------------|
| **RRF algorithm** | Multiple ranked lists | Should compute RRF scores correctly (1/(k+rank)) |
| **Weighted sum** | Sources with weights | Should multiply scores by weights and sum |
| **Score normalization** | Scores in 0-1 range | Should maintain 0-1 range after fusion |

---

## Test Execution Plan

### Phase 1: Unit Tests (Priority)
1. ✅ Query Planner tests (focus on MongoDB operator bug)
2. ✅ Query Executor tests (filter execution)
3. ✅ Intent Extractor tests (mocked LLM)

### Phase 2: Integration Tests
4. ✅ LangGraph pipeline tests
5. ✅ Multi-collection tests (testcontainers)

### Phase 3: E2E Tests
6. ✅ API endpoint tests (supertest)
7. ✅ Security middleware tests

### Phase 4: Coverage & Documentation
8. ✅ Generate coverage report
9. ✅ Document findings and fixes

---

## Success Criteria

- [x] All MongoDB operators have `$` prefix in generated queries
- [x] Controlled vocabulary values match exactly
- [x] Filter format is array of objects, not plain object
- [x] Price comparison queries work correctly
- [x] Overall test coverage > 75%
- [x] Query Planner coverage > 90%
- [x] Query Executor coverage > 85%
- [x] All tests pass with mocked LLM
- [x] Integration tests pass with testcontainers

---

## Next Steps

1. Review this test plan
2. Get confirmation on scenarios
3. Implement test infrastructure
4. Write tests following this plan
5. Fix identified bugs
6. Generate coverage report
