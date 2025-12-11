# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CodiesVibe Search API is a LangGraph-based AI search service for intelligent tool discovery. It uses a schema-driven architecture with multi-vector semantic search, LLM-powered intent extraction, and query planning.

**Tech Stack:**
- TypeScript + Express.js (ESM modules)
- LangGraph for agentic search pipeline
- MongoDB for document storage
- Qdrant for multi-vector semantic search
- Clerk for authentication
- Jest for testing

## Essential Commands

```bash
# Development
npm run dev                    # Start with hot reload (tsx watch)
npm run build                  # TypeScript compilation
npm run start                  # Run compiled code

# Testing
npm test                       # Run unit tests (Jest)
npm run test:e2e               # End-to-end tests
npm run test:cov               # Coverage report

# Type checking and linting
npm run typecheck              # TypeScript type checking
npm run lint                   # ESLint

# Debug scripts
npm run test:script:intent     # Test intent extractor
npm run test:script:plan       # Test query planner
npm run test:script:pipeline   # Test full pipeline
```

## Architecture

### Schema-Driven Pipeline (v3.0)

The search pipeline is driven by domain schemas defined in `src/domains/`. Core framework code is domain-agnostic.

```
src/
├── core/                      # Domain-agnostic framework
│   ├── types/schema.types.ts  # DomainSchema interface
│   ├── validators/            # Schema validation
│   ├── prompts/               # Dynamic prompt generation
│   └── pipeline.init.ts       # Schema wiring
├── domains/tools/             # Tools domain implementation
│   ├── tools.schema.ts        # Controlled vocabularies, intent fields
│   ├── tools.filters.ts       # MongoDB filter mapping
│   └── tools.validators.ts    # Query plan validation
├── graphs/                    # LangGraph orchestration
│   ├── agentic-search.graph.ts
│   └── nodes/                 # Pipeline nodes
│       ├── cache-check.node.ts
│       ├── intent-extractor.node.ts
│       ├── query-planner.node.ts
│       ├── query-executor.node.ts
│       └── cache-store.node.ts
├── services/                  # Core services
├── routes/                    # Express routes
└── middleware/                # Auth, rate limiting, etc.
```

### LangGraph Pipeline Flow

```
Query → CacheCheck → [HIT: Executor] / [MISS: Intent → Planner → Executor] → CacheStore
```

**5-Node Pipeline:**
1. **CacheCheckNode** - Vector similarity for cached results
2. **IntentExtractorNode** - LLM-based intent understanding
3. **QueryPlannerNode** - LLM-based retrieval strategy
4. **QueryExecutorNode** - Qdrant + MongoDB execution
5. **CacheStoreNode** - Store results for future use

### Multi-Collection Vector Architecture

Four Qdrant collections with different purposes:
- **tools** - Core identity (name, description)
- **functionality** - Capabilities and features
- **usecases** - Industry and user type targeting
- **interface** - Technical implementation details

## Module Path Aliases

The project uses `#` prefix path aliases (configured in `tsconfig.json` and `jest.config.js`):

```typescript
import { searchLogger } from "#config/logger.js";
import { StateAnnotation } from "#types/state";
import { toolsSchema } from "#domains/tools/tools.schema";
```

Available aliases: `#config`, `#types`, `#services`, `#utils`, `#middleware`, `#routes`, `#graphs`, `#core`, `#shared`, `#domains`

## Key Environment Variables

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/toolsearch
QDRANT_HOST=localhost
QDRANT_PORT=6333
CLERK_SECRET_KEY=sk_test_...

# Search configuration
SEARCH_USE_MULTIVECTOR=true
VECTOR_TYPES=semantic,entities.categories,entities.functionality
SEARCH_RRF_K=60
```

## API Endpoints

- `POST /api/search` - Main search endpoint
- `GET /api/tools` - List tools with filtering
- `GET /api/tools/:id` - Get tool by ID
- `POST/PATCH/DELETE /api/tools` - CRUD (authenticated)
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe (checks MongoDB, Qdrant)
- `GET /metrics` - Prometheus metrics
- `GET /api-docs` - Swagger UI

## Testing Patterns

Tests use MongoDB Memory Server for isolated database testing:

```typescript
// Unit tests location
src/__tests__/unit/

// Integration tests
src/__tests__/integration/

// Test fixtures and mocks
src/__tests__/fixtures/
src/__tests__/mocks/
```

Run a single test file:
```bash
npm test -- --testPathPattern="schema.validator"
```

## Adding a New Domain

1. Create schema in `src/domains/{domain}/{domain}.schema.ts`
2. Implement filter mapping in `{domain}.filters.ts`
3. Add validators in `{domain}.validators.ts`
4. Wire in `src/core/pipeline.init.ts`

No changes needed to core framework or LangGraph nodes.
