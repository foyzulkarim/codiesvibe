# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CodiesVibe is an AI tools directory with intelligent semantic search. The application consists of a React frontend and a LangGraph-based search API that provides AI-powered tool discovery using multi-vector semantic search.

**Tech Stack:**
- **Frontend**: React 18 + TypeScript + Vite, shadcn/ui, TanStack Query, Tailwind CSS
- **Search API**: Express.js + LangGraph, MongoDB, Qdrant vector DB, Clerk auth
- **Infrastructure**: Docker Compose, Nginx reverse proxy, Prometheus/Grafana monitoring

## Project Structure

```
codiesvibe/
├── src/                    # Frontend React application
│   ├── api/                # API client and types
│   ├── components/         # React components (shadcn/ui)
│   ├── hooks/              # Custom hooks (useTools, useDebounce, etc.)
│   ├── pages/              # Route pages
│   └── lib/                # Utilities and config
├── search-api/             # LangGraph-based search service (see search-api/CLAUDE.md)
├── scripts/                # Infrastructure and deployment scripts
├── docs/                   # Technical documentation
└── docker-compose.*.yml    # Container orchestration configs
```

## Essential Commands

### Development Workflow
```bash
# 1. Start infrastructure (MongoDB, Qdrant, monitoring)
docker-compose -f docker-compose.infra.yml up -d

# 2. Environment setup
cp .env.example .env.local              # Frontend
cp search-api/.env.example search-api/.env  # Search API

# 3. Install dependencies
npm install                             # Frontend
cd search-api && npm install            # Search API

# 4. Start development servers
npm run dev                             # Frontend: http://localhost:3000
cd search-api && npm run dev            # Search API: http://localhost:4003
```

### Frontend Commands (root directory)
```bash
npm run dev                    # Vite dev server with HMR
npm run build                  # Production build
npm run lint                   # ESLint
npm run typecheck              # TypeScript checking
npm run infra:start            # Start Docker infrastructure
npm run infra:stop             # Stop infrastructure
npm run infra:status           # Check infrastructure health
```

### Search API Commands (search-api directory)
```bash
npm run dev                    # Development with hot reload (tsx watch)
npm run build                  # TypeScript compilation
npm test                       # Jest unit tests
npm run test:e2e               # End-to-end tests
npm run typecheck              # TypeScript checking
npm run create-collections     # Create Qdrant collections
```

### Production Deployment
```bash
# Create network and start services
docker network create codiesvibe-network
docker-compose -f docker-compose.production.yml up --build -d

# Check health
curl http://localhost/health           # Nginx
curl http://localhost:4003/health      # Search API
```

## Architecture

### Frontend → Search API Flow
```
React App (localhost:3000)
    │
    ├── /api/* routes via Nginx
    │
    └── search-api (localhost:4003)
            │
            ├── MongoDB Atlas (document storage)
            └── Qdrant Cloud (vector search)
```

### LangGraph Search Pipeline
The search API uses a 5-node LangGraph pipeline:
1. **CacheCheckNode** - Vector similarity for cached results
2. **IntentExtractorNode** - LLM-based intent understanding
3. **QueryPlannerNode** - Retrieval strategy selection
4. **QueryExecutorNode** - Qdrant + MongoDB execution
5. **CacheStoreNode** - Result caching

See `search-api/CLAUDE.md` for detailed search API architecture.

## API Endpoints

### Search API (port 4003)
- `POST /api/search` - AI-powered semantic search
- `GET /api/tools` - List tools with filtering
- `GET /api/tools/:id` - Get tool by ID
- `POST/PATCH/DELETE /api/tools` - CRUD (authenticated via Clerk)
- `GET /health` - Health check
- `GET /api-docs` - Swagger UI

### Search Request Example
```bash
curl -X POST http://localhost:4003/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "AI code completion tools", "limit": 10}'
```

## Environment Variables

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:4003/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Search API (search-api/.env)
```env
# Database
MONGODB_URI=mongodb://localhost:27017/codiesvibe
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Auth
CLERK_SECRET_KEY=sk_test_...

# AI Service
TOGETHER_API_KEY=...  # or VLLM_BASE_URL for local models

# Search config
SEARCH_USE_MULTIVECTOR=true
SEARCH_RRF_K=60
```

## Docker Services

### Production Stack (docker-compose.production.yml)
- **nginx** - Reverse proxy, static files (ports 80, 443)
- **frontend-init** - Builds and copies frontend assets
- **search-api** - LangGraph search service (port 4003)

### Infrastructure (docker-compose.infra.yml)
- **mongodb** - Document database (port 27017)
- **qdrant** - Vector database (port 6333)
- Monitoring: Prometheus, Grafana, Loki

## Key Development Notes

- **Run typecheck before commits**: `npm run typecheck` (frontend) and `cd search-api && npm run typecheck`
- **Start infrastructure first**: `docker-compose -f docker-compose.infra.yml up -d`
- **Search API has its own CLAUDE.md**: See `search-api/CLAUDE.md` for LangGraph pipeline details
- **Frontend uses TanStack Query**: Server state managed via `useTools` and related hooks
- **Authentication via Clerk**: Both frontend and search-api integrate with Clerk

## Running Single Tests

```bash
# Frontend (root)
npm test -- --testPathPattern="filename"

# Search API
cd search-api && npm test -- --testPathPattern="schema.validator"
```