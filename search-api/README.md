# LangGraph Search System - Phase 1

Maximum Quality Search Architecture with LangGraph State Management

## Overview

This is Phase 1 of a sophisticated search system that uses LangGraph for state management, MongoDB for data storage, Qdrant for vector search, and Ollama for LLM/embedding operations.

## Architecture

The system is designed around a multi-stage pipeline:

1. **Intent Extraction**: Extract structured intent from natural language queries
2. **Query Planning**: Generate execution plans based on confidence levels
3. **Execution**: Perform searches and apply filters with adaptive refinement

## Phase 1 Implementation

Phase 1 provides the complete foundation for the search system:

### ✅ Completed Components

- **Project Setup**: TypeScript configuration with proper tooling
- **Type Definitions**: LangGraph State schema, Intent types, Plan structures
- **Configuration Layer**: Database connections, model configurations, constants
- **Service Layer**: EmbeddingService, MongoDBService, QdrantService
- **Utility Functions**: Cosine similarity, embedding cache, pattern matchers

### 🚧 Next Phases

Phase 2+: Search functions, intent extraction nodes, planning nodes, execution nodes, graph assembly

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
├── utils/           # Utility functions (similarity, cache, patterns)
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

## Environment Variables

See `.env.example` for all available options:

- `MONGODB_URI`: MongoDB connection string
- `QDRANT_HOST`, `QDRANT_PORT`: Qdrant connection details
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`: Ollama configuration
- `ENABLE_CACHE`, `CACHE_TTL`: Cache settings

## Dependencies

- **@langchain/langgraph**: State management and graph orchestration
- **mongodb**: MongoDB driver with connection pooling
- **qdrant-js**: Qdrant vector database client
- **ollama**: Ollama LLM and embedding client
- **zod**: Runtime type validation
- **fuse.js**: Fuzzy string matching

## Next Steps

To continue with Phase 2 implementation:

1. Add sample data to MongoDB and Qdrant
2. Implement search functions (semantic search, filtering, ranking)
3. Create intent extraction nodes
4. Build planning and execution nodes
5. Assemble the complete LangGraph pipeline

See `/specs/009-ai-searhc-3/` for detailed architecture documentation.