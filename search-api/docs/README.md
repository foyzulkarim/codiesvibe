# LangGraph Search API

Intelligent Tool Discovery System with LangGraph Orchestration

## Overview

This is a sophisticated search system that uses LangGraph for state management and orchestration, MongoDB for data storage, Qdrant for vector search, and Ollama for LLM/embedding operations. The system provides intelligent tool discovery capabilities with advanced features like intent extraction, query planning, and adaptive execution.

## Architecture

The system is designed around a multi-stage pipeline with comprehensive state management:

1. **Intent Extraction**: Extract structured intent from natural language queries using a 13-node subgraph
2. **Query Planning**: Generate execution plans based on confidence levels with strategy selection
3. **Execution**: Perform searches and apply filters with adaptive refinement
4. **Completion**: Format results with explanations and metadata

## Implementation Status

### ✅ Completed Components

- **Project Setup**: TypeScript configuration with proper tooling
- **Type Definitions**: LangGraph State schema, Intent types, Plan structures
- **Configuration Layer**: Database connections, model configurations, constants
- **Service Layer**: EmbeddingService, MongoDBService, QdrantService, VectorIndexingService
- **Utility Functions**: Cosine similarity, embedding cache, pattern matchers
- **Graph Implementation**: Complete LangGraph orchestration with main graph and subgraphs
- **State Management**: Comprehensive state validation, checkpointing, and recovery
- **Thread Management**: Thread lifecycle management with expiration policies
- **API Endpoints**: RESTful API with synchronous and asynchronous search capabilities
- **Error Handling**: Robust error recovery and rollback mechanisms
- **Monitoring**: Performance tracking and state monitoring

## Installation

```bash
cd search-api
npm install
```

## Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` with your configuration:
- MongoDB connection details
- Qdrant connection details
- Ollama model configuration
- Cache settings

## Setup

Initialize the system and pre-compute embeddings:

```bash
npm run setup
```

This will:
- Connect to databases
- Pre-compute enum embeddings
- Test all services
- Report system status

## Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run type-check   # Type checking only
```

## Project Structure

```
src/
├── config/           # Database, model, and constant configurations
├── types/           # TypeScript interfaces and schemas
├── services/        # Core service layer (DB, embedding, vector search)
├── utils/           # Utility functions (state management, monitoring)
├── graphs/          # LangGraph implementations (main, intent, planning, execution)
├── nodes/           # Individual graph nodes (extraction, planning, execution)
├── routers/         # Conditional routing logic
├── server.ts        # Express server with API endpoints
├── index.ts         # Main entry point
└── setup.ts         # System initialization script
```

## Core Services

### EmbeddingService
- Generate embeddings using Ollama
- Batch processing with caching
- Pre-computed enum embeddings for fast filtering

### MongoDBService
- CRUD operations for tools data
- Filtering and searching capabilities
- Connection pooling and error handling

### QdrantService
- Vector similarity search
- Text-based semantic search
- Tool similarity discovery

### VectorIndexingService
- Automated vector indexing and validation
- Synchronization with MongoDB
- Index repair and maintenance

## Graph Components

### Main Graph
- Primary orchestration with 4 main nodes
- State validation and checkpointing
- Error recovery and rollback

### Intent Extraction Graph
- 13-node subgraph for comprehensive query understanding
- Parallel extraction branches
- Intent synthesis and confidence evaluation

### Query Planning Graph
- Strategy selection based on confidence levels
- Plan validation and optimization
- Fallback mechanisms

### Execution Graph
- Multi-strategy execution
- Quality assessment and refinement
- Result processing and completion

## Type System

### State Schema
LangGraph-based state that flows through the entire pipeline:
- Input query and preprocessed query
- Extracted intent with confidence scores
- Execution plans and results
- Quality assessment and metadata

### Intent Schema
Structured representation of user search intent:
- Tool names and constraints
- Categories, functionality, user types
- Interface and deployment preferences
- Comparative intent and semantic components

## API Endpoints

- `POST /search` - Synchronous search endpoint
- `POST /search/async` - Asynchronous search initiation
- `GET /search/status/:threadId` - Async search status checking
- `POST /search/resume/:threadId` - Resume failed/paused searches
- `DELETE /search/cancel/:threadId` - Cancel running searches
- `GET /health` - System health check

## Environment Variables

See `.env.example` for all available options:

- `MONGODB_URI`: MongoDB connection string
- `QDRANT_HOST`, `QDRANT_PORT`: Qdrant connection details
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`: Ollama configuration
- `ENABLE_CACHE`, `CACHE_TTL`: Cache settings
- `ENABLE_VECTOR_VALIDATION`: Vector validation on startup
- `LOG_LEVEL`: Logging verbosity

## Dependencies

- **@langchain/langgraph**: State management and graph orchestration
- **mongodb**: MongoDB driver with connection pooling
- **qdrant-js**: Qdrant vector database client
- **ollama**: Ollama LLM and embedding client
- **zod**: Runtime type validation
- **fuse.js**: Fuzzy string matching
- **uuid**: Thread ID generation
- **express**: Web server framework

## Features

### Search Capabilities
- Natural language query processing
- Intent extraction with confidence scoring
- Multi-dimensional filtering (category, price, deployment, etc.)
- Semantic search with vector similarity
- Comparative tool analysis
- Result ranking and relevance scoring

### Advanced Features
- Checkpoint-based recovery and resumption
- Asynchronous search operations
- Thread management with lifecycle controls
- State validation and consistency checks
- Performance monitoring and metrics
- Error handling with automatic rollback

## Documentation

See the `docs/` directory for comprehensive documentation:
- `ARCHITECTURE-GUIDE.md` - Detailed system architecture
- `ENHANCED-SEARCH-API.md` - Enhanced search API documentation with advanced features
- `INTEGRATION-GUIDE.md` - Step-by-step integration guide with code examples
- `ENHANCED-SERVICES.md` - Result merger and duplicate detection service documentation
- `OPENAPI.YAML` - Complete OpenAPI/Swagger specification
- `API-REFERENCE.md` - Complete API documentation
- `DEPLOYMENT-GUIDE.md` - Deployment instructions
- `CHECKPOINTING-IMPLEMENTATION.md` - State management details
