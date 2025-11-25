# CodiesVibe Search API

A sophisticated LangGraph-based AI search service that provides intelligent tool discovery using multi-vector search, semantic understanding, and agentic query planning.

## 🚀 Features

- **🎯 Schema-Driven Architecture (v3.0)**: Decoupled design with domain separation for maximum maintainability
- **🧠 LangGraph 3-Node Pipeline**: Intent extraction → Query planning → Query execution
- **🔍 Multi-Vector Search**: Semantic, categorical, functional, and alias-based embeddings
- **⚡ Real-Time AI**: Integration with vLLM for high-performance AI model serving
- **📊 Vector Database**: Qdrant-powered high-performance similarity search
- **🔄 Reciprocal Rank Fusion**: Intelligent result merging from multiple sources
- **🛡️ Production Ready**: Health checks, monitoring, security hardening

## 📋 Prerequisites

- Docker & Docker Compose
- MongoDB (included in infrastructure)
- Qdrant Vector Database (included in infrastructure)
- vLLM server running on host (recommended) or external LLM service

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Intent Node   │───▶│  Query Planner   │───▶│ Query Executor  │
│                 │    │                  │    │                 │
│ • LLM Analysis  │    │ • Strategy       │    │ • Vector Search │
│ • Understanding │    │ • Planning       │    │ • MongoDB Query │
│ • Classification│    │ • Optimization   │    │ • Result Merge  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     vLLM        │    │     Qdrant       │    │    MongoDB      │
│   Host API      │    │  Vector DB       │    │  Document DB    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Schema-Driven Architecture (v3.0)

The search API uses a **schema-driven architecture** for maximum decoupling and maintainability:

#### Core Principles
- **Domain Separation**: Core framework code is separate from domain-specific logic
- **Schema Configuration**: All domain knowledge defined in `DomainSchema` interface
- **Type Safety**: Full TypeScript type checking across schema definitions
- **Validation**: Schema validation at startup catches configuration errors early

#### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Schema-Driven Pipeline                    │
├─────────────────────────────────────────────────────────────┤
│  Core Framework (Domain-Agnostic)                           │
│  • schema.types.ts - DomainSchema interface                 │
│  • schema.validator.ts - Schema validation                  │
│  • templates.ts - Prompt templates with placeholders        │
│  • prompt.generator.ts - Dynamic prompt generation          │
│  • pipeline.init.ts - Schema validation & wiring            │
├─────────────────────────────────────────────────────────────┤
│  Domain Layer (Tools-Specific)                              │
│  • tools.schema.ts - toolsSchema definition                 │
│  • tools.filters.ts - buildToolsFilters() logic            │
│  • tools.validators.ts - validateToolsQueryPlan() logic    │
├─────────────────────────────────────────────────────────────┤
│  LangGraph Nodes (Schema-Powered)                          │
│  • intent-extractor.node.ts - Uses schema prompts          │
│  • query-planner.node.ts - Uses domain handlers            │
│  • query-executor.node.ts - Executes with schema config    │
└─────────────────────────────────────────────────────────────┘
```

#### Key Components

**1. Domain Schema** (`src/core/types/schema.types.ts`)
```typescript
interface DomainSchema {
  name: string;                              // Domain identifier
  version: string;                           // Schema version
  vocabularies: DomainVocabularies;         // Controlled vocabularies
  intentFields: IntentFieldDefinition[];    // LLM extraction schema
  vectorCollections: VectorCollectionDefinition[]; // Vector DB config
  structuredDatabase: StructuredDatabaseDefinition; // MongoDB config
}
```

**2. Schema Validator** (`src/core/validators/schema.validator.ts`)
- Validates schema structure at startup
- Catches configuration errors before runtime
- Provides detailed validation messages

**3. Prompt Generator** (`src/core/prompts/prompt.generator.ts`)
- Generates LLM prompts dynamically from schema
- Replaces hardcoded prompts with template-based system
- Supports `{{PLACEHOLDER}}` syntax for dynamic content

**4. Domain Handlers** (`src/domains/tools/`)
- `tools.schema.ts` - Complete tools domain schema definition
- `tools.filters.ts` - MongoDB filter mapping logic
- `tools.validators.ts` - Query plan validation and recommendations

**5. Pipeline Initialization** (`src/core/pipeline.init.ts`)
```typescript
const pipelineConfig = initializePipeline();
// Returns: { schema, domainHandlers }
// - schema: Validated domain schema
// - domainHandlers: { buildFilters, validateQueryPlan }
```

#### Migration Benefits

**Before (v2.x)**: Hardcoded domain knowledge in every node
- ❌ 200+ lines of hardcoded prompts per node
- ❌ 150+ lines of inline filter logic
- ❌ Domain knowledge scattered across files
- ❌ Difficult to maintain and extend

**After (v3.0)**: Schema-driven configuration
- ✅ Prompts generated dynamically from schema
- ✅ Domain logic extracted to dedicated files
- ✅ Single source of truth for vocabularies
- ✅ Easy to add new domains or modify existing ones

#### Adding a New Domain

To add a new domain (e.g., "recipes"):

1. **Define Schema** (`src/domains/recipes/recipes.schema.ts`)
```typescript
export const recipesSchema: DomainSchema = {
  name: 'recipes',
  version: '1.0.0',
  vocabularies: { cuisines: [...], dietTypes: [...] },
  intentFields: [...],
  vectorCollections: [...],
  structuredDatabase: {...}
};
```

2. **Implement Handlers** (`src/domains/recipes/recipes.filters.ts`)
```typescript
export function buildRecipesFilters(intentState: any): any[] {
  // Domain-specific filter mapping logic
}
```

3. **Wire Pipeline** (`src/core/pipeline.init.ts`)
```typescript
export function initializeRecipesPipeline() {
  return {
    schema: recipesSchema,
    domainHandlers: {
      buildFilters: buildRecipesFilters,
      validateQueryPlan: validateRecipesQueryPlan
    }
  };
}
```

**No changes needed** to core framework or LangGraph nodes!

## 🚀 Quick Start

### 1. Start Infrastructure Services

```bash
# Start all required services (MongoDB, Qdrant)
docker-compose -f docker-compose.infra.yml up -d

# Check services are healthy
docker-compose -f docker-compose.infra.yml ps
```

### 2. Start Search API

#### Development Mode (with hot reload):
```bash
docker-compose -f docker-compose.search-api.dev.yml up --build
```

#### Production Mode:
```bash
docker-compose -f docker-compose.production.yml up search-api --build
```

### 3. Verify vLLM Setup

Make sure your vLLM server is running on the host:

```bash
# Test vLLM connection (adjust port/model as needed)
curl http://localhost:8000/v1/models

# Should return your available models
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-0.6B",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

### 4. Seed Vector Database

```bash
# Enter search-api container
docker exec -it codiesvibe-search-api bash

# Create Qdrant collections
npm run create-collections

# Seed vectors from MongoDB data
npm run seed-vectors

# Force re-seed (clears existing data)
npm run seed-vectors -- --force
```

## 📡 API Endpoints

### Health Check
```bash
GET http://localhost:4003/health
```

### Search
```bash
POST http://localhost:4003/search
Content-Type: application/json

{
  "query": "AI code completion tools",
  "limit": 10,
  "debug": false
}
```

#### Response Format
```json
{
  "query": "AI code completion tools",
  "intentState": {
    "primaryIntent": "code_completion",
    "confidence": 0.95,
    "entities": [...]
  },
  "executionPlan": {
    "strategy": "semantic_hybrid",
    "explanation": "Using semantic search with categorical filtering",
    "vectorTypes": ["semantic", "entities.categories"]
  },
  "results": [...],
  "candidates": [...],
  "executionStats": {
    "totalTimeMs": 245,
    "nodeTimings": {...},
    "vectorQueriesExecuted": 3,
    "structuredQueriesExecuted": 1
  },
  "executionTime": "245ms",
  "phase": "3-Node LLM-First Pipeline",
  "strategy": "semantic_hybrid"
}
```

## ⚙️ Configuration

### Environment Variables

#### Database Configuration
```env
MONGODB_URI=mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin
QDRANT_HOST=qdrant
QDRANT_PORT=6333
QDRANT_COLLECTION_NAME=tools
```

#### AI Model Configuration
```env
# vLLM (recommended - running on host)
VLLM_BASE_URL=http://host.docker.internal:8000
VLLM_MODEL=Qwen/Qwen3-0.6B

# External LLM services (alternative)
VLLM_BASE_URL=https://api.openai.com/v1
VLLM_MODEL=gpt-4
```

#### Search Configuration
```env
# Multi-vector search
SEARCH_USE_MULTIVECTOR=true
MULTIVECTOR_MAX_RESULTS=20
VECTOR_TYPES=semantic,entities.categories,entities.functionality,entities.aliases,composites.toolType

# RRF configuration
SEARCH_RRF_K=60
SEARCH_SOURCE_WEIGHTS={"mongodb": 0.3, "qdrant": 0.7}
DEDUPE_THRESHOLD=0.8

# Performance
ENABLE_CACHE=true
CACHE_TTL=3600
```

## 🛠️ Development

### Local Development

```bash
# Install dependencies
cd search-api
npm install

# Start with ts-node-dev (hot reload)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run type-check
```

### Docker Development

```bash
# Build only the search-api image
docker build -f Dockerfile.search-api -t codiesvibe-search-api .

# Run with development configuration
docker run -p 4003:4003 --network codiesvibe-network codiesvibe-search-api:dev

# Interactive development with volume mounts
docker run -it -p 4003:4003 \
  -v $(pwd)/search-api/src:/app/src \
  --network codiesvibe-network \
  codiesvibe-search-api:dev npm run dev
```

## 📊 Monitoring & Debugging

### Health Monitoring
- **Health Endpoint**: `/health` - Checks MongoDB, Qdrant, and vLLM connectivity
- **Container Health**: Docker health checks every 30s
- **Resource Monitoring**: Memory/CPU limits with Grafana dashboards

### Debug Mode
Enable debug logging and detailed execution traces:

```bash
POST http://localhost:4003/search
{
  "query": "your query",
  "debug": true
}
```

Response includes:
- Node execution times
- Vector query details
- Execution path
- Error traces

### Log Analysis
```bash
# View search-api logs
docker-compose -f docker-compose.production.yml logs -f search-api

# View all service logs
docker-compose -f docker-compose.infra.yml logs -f
```

## 🔧 Advanced Configuration

### Custom Vector Types
Add new vector types by extending the configuration:

```env
VECTOR_TYPES=semantic,entities.categories,entities.functionality,entities.aliases,composites.toolType,custom.my-vector
```

### Performance Tuning
```env
# Increase vector search results
MULTIVECTOR_MAX_RESULTS=50

# Adjust RRF weighting
SEARCH_SOURCE_WEIGHTS={"mongodb": 0.2, "qdrant": 0.8}

# Optimize cache
CACHE_TTL=7200
ENABLE_CACHE=true
```

### External LLM Services
Use external LLM providers instead of local vLLM:

```env
# OpenAI (requires API key)
VLLM_BASE_URL=https://api.openai.com/v1
VLLM_MODEL=gpt-4

# Anthropic Claude
VLLM_BASE_URL=https://api.anthropic.com
VLLM_MODEL=claude-3-sonnet
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Vector Index Validation Failed
```bash
# Re-seed vectors
docker exec -it codiesvibe-search-api npm run seed-vectors -- --force

# Check Qdrant collection
curl http://localhost:6333/collections/tools
```

#### 2. vLLM Connection Issues
```bash
# Check vLLM server is running on host
curl http://localhost:8000/v1/models

# Test vLLM API connectivity from container
docker exec -it codiesvibe-search-api curl http://host.docker.internal:8000/v1/models

# Check vLLM server logs
# Check your vLLM server process on the host
```

#### 3. MongoDB Connection Issues
```bash
# Test MongoDB connectivity
docker exec -it codiesvibe-search-api npm run setup

# Check MongoDB container
docker-compose -f docker-compose.infra.yml logs mongodb
```

#### 4. Search Performance Issues
- Enable caching: `ENABLE_CACHE=true`
- Increase memory limits in docker-compose
- Optimize vector types: Use only essential `VECTOR_TYPES`
- Monitor resource usage in Grafana

### Health Check Failures
```bash
# Detailed health check
curl -v http://localhost:4003/health

# Check individual service health
docker-compose -f docker-compose.infra.yml ps
docker exec -it codiesvibe-search-api curl -f http://mongodb:27017
docker exec -it codiesvibe-search-api curl -f http://qdrant:6333/health
docker exec -it codiesvibe-search-api curl -f http://host.docker.internal:8000/v1/models
```

## 📈 Production Deployment

### Resource Requirements
- **Minimum**: 2GB RAM, 1 CPU core
- **Recommended**: 4GB RAM, 2 CPU cores
- **With vLLM**: Depends on model size (typically 4-16GB RAM for host)

### Security Features
- Non-root containers
- Read-only filesystem
- Resource limits
- Health checks
- Signal handling with dumb-init

### Scaling
```bash
# Scale search-api horizontally
docker-compose -f docker-compose.production.yml up --scale search-api=3

# Load balance with nginx (configure upstream block)
```

## 📚 API Reference

### Search Endpoint Details

#### Request Body
```typescript
interface SearchRequest {
  query: string;           // Search query (required)
  limit?: number;          // Max results (default: 10)
  debug?: boolean;         // Enable debug mode (default: false)
}
```

#### Response Body
```typescript
interface SearchResponse {
  query: string;
  intentState?: IntentState;
  executionPlan?: ExecutionPlan;
  results: SearchResult[];
  candidates: Candidate[];
  executionStats: ExecutionStats;
  executionTime: string;
  phase: string;
  strategy: string;
  explanation: string;
  debug?: DebugInfo;
}
```

For complete API documentation and examples, see the main [CodiesVibe README](../README.md).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see the [LICENSE](../LICENSE) file for details.