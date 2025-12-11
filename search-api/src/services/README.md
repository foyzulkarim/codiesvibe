# Search API Services

This directory contains the core services for the search API, organized into logical subdirectories for better navigation and maintainability.

## Directory Structure

```
services/
├── database/           # Data persistence layer
│   ├── mongodb.service.ts
│   ├── qdrant.service.ts
│   └── qdrant-collection-config.service.ts
├── embedding/          # Vector embedding generation
│   ├── embedding.service.ts
│   ├── vector-type-registry.service.ts
│   └── content-generator-factory.service.ts
├── indexing/           # Change detection
│   └── content-hash.service.ts
├── sync/               # MongoDB-Qdrant synchronization
│   ├── tool-sync.service.ts
│   └── sync-worker.service.ts
├── search/             # Search orchestration
│   └── multi-collection-orchestrator.service.ts
├── llm/                # LLM integration
│   ├── llm.service.ts
│   └── plan-cache.service.ts
├── infrastructure/     # Operational services
│   ├── health-check.service.ts
│   ├── metrics.service.ts
│   ├── circuit-breaker.service.ts
│   └── graceful-shutdown.service.ts
└── index.ts            # Re-exports all services
```

## Services Overview

### Database Services (`database/`)

- **MongoDBService** - Handles all MongoDB operations for tool data storage and retrieval
- **QdrantService** - Manages vector database operations with multi-collection support
- **QdrantCollectionConfigService** - Configuration management for Qdrant vector collections

### Embedding Services (`embedding/`)

- **EmbeddingService** - Generates and caches text embeddings using Together AI (with batch support)
- **VectorTypeRegistryService** - Registry for vector types with metadata and combinations
- **ContentGeneratorFactory** - Factory for creating collection-specific content generators

### Indexing Services (`indexing/`)

- **ContentHashService** - Change detection for sync optimization via SHA-256 hashing

### Sync Services (`sync/`)

- **ToolSyncService** - Per-collection synchronization between MongoDB and Qdrant
- **SyncWorkerService** - Background worker for retrying failed syncs

### Search Services (`search/`)

- **MultiCollectionOrchestrator** - Orchestrates search across multiple collections with intelligent routing

### LLM Services (`llm/`)

- **LLMService** - LLM integration for intent extraction and query planning
- **PlanCacheService** - Cache for LLM-generated query plans

### Infrastructure Services (`infrastructure/`)

- **HealthCheckService** - Comprehensive health monitoring
- **MetricsService** - Prometheus metrics collection
- **CircuitBreakerManager** - Prevents cascading failures
- **GracefulShutdownService** - Clean shutdown handling

## Collection Architecture

The system uses a multi-collection approach with four primary collections:

### 1. Tools Collection (`tools`)
- **Purpose**: Identity - Core tool information
- **Content**: name, description, longDescription, tagline
- **Vector Types**: semantic
- **Weightings**: name (3.0), description (2.0), longDescription (1.5), tagline (1.0)

### 2. Functionality Collection (`functionality`)
- **Purpose**: Capability - Tool features and capabilities
- **Content**: functionality, categories
- **Vector Types**: semantic, entities.functionality
- **Weightings**: functionality (2.5), categories (2.0)

### 3. Usecases Collection (`usecases`)
- **Purpose**: Use Case - Industry and deployment targeting
- **Content**: industries, userTypes, deployment
- **Vector Types**: semantic, entities.industries, entities.userTypes
- **Weightings**: industries (2.0), userTypes (2.0), deployment (1.5)

### 4. Interface Collection (`interface`)
- **Purpose**: Technical - Implementation details
- **Content**: interface, pricingModel, status
- **Vector Types**: semantic, entities.interface
- **Weightings**: interface (2.0), pricingModel (1.5), status (1.0)

## Vector Type System

### Categories of Vector Types

#### Semantic Vectors
- **semantic**: Core semantic understanding of tool content

#### Entity Vectors
- **entities.functionality**: Specific functionality and feature entities
- **entities.industries**: Industry and sector entities
- **entities.userTypes**: User type and role entities
- **entities.interface**: Technical interface entities

#### Composite Vectors
- **composites.identity**: Combined identity information (name + description)
- **composites.capabilities**: Combined capabilities and features
- **composites.usecase**: Combined use case information
- **composites.technical**: Combined technical specifications

#### Domain Vectors
- **domain.pricing**: Pricing and business model information
- **domain.deployment**: Deployment and infrastructure information

## Service Usage Examples

### Importing Services

Services can be imported from their subdirectories or from the main index:

```typescript
// Import from subdirectory (recommended for clarity)
import { QdrantCollectionConfigService } from '#services/database/qdrant-collection-config.service';
import { MultiCollectionOrchestrator } from '#services/search/multi-collection-orchestrator.service';
import { embeddingService } from '#services/embedding/embedding.service';

// Import from main index (convenient for multiple imports)
import {
  mongoDBService,
  qdrantService,
  embeddingService
} from '#services';
```

### Qdrant Collection Configuration Service

```typescript
import { QdrantCollectionConfigService } from '#services/database/qdrant-collection-config.service';

const collectionConfig = new QdrantCollectionConfigService();

// Get all enabled collections
const enabledCollections = collectionConfig.getEnabledCollections();

// Get collection by name
const toolsCollection = collectionConfig.getCollectionByName('tools');

// Validate collection configuration
const isValid = collectionConfig.validateCollectionConfig(config);

// Get collections for specific vector types
const semanticCollections = collectionConfig.getCollectionsForVectorTypes(['semantic']);
```

### Multi-Collection Orchestrator

```typescript
import { MultiCollectionOrchestrator } from '#services/search/multi-collection-orchestrator.service';

const orchestrator = new MultiCollectionOrchestrator(
  collectionConfig,
  vectorTypeRegistry,
  contentFactory
);

// Search across multiple collections
const result = await orchestrator.search({
  query: 'react components for dashboard',
  collections: ['tools', 'functionality'],
  limit: 20
});

console.log('Search results:', result.results);
console.log('Collection stats:', result.collectionStats);
console.log('Query analysis:', result.queryAnalysis);
```

### Content Generation

```typescript
import { ContentGeneratorFactory } from '#services/embedding/content-generator-factory.service';

const contentFactory = new ContentGeneratorFactory(collectionConfig);

// Generate content for specific collection
const toolsGenerator = contentFactory.createGenerator('tools');
const content = toolsGenerator.generate(toolData);

// Validate tool data for collection
const validation = toolsGenerator.validate(toolData);
console.log('Validation:', validation);

// Generate content for multiple collections
const multiContent = contentFactory.generateForCollections(toolData, [
  'tools',
  'functionality',
  'interface'
]);
```

### Vector Type Registry

```typescript
import { VectorTypeRegistryService } from '#services/embedding/vector-type-registry.service';

const vectorRegistry = new VectorTypeRegistryService(collectionConfig);

// Get all available vector types
const vectorTypes = vectorRegistry.getVectorTypes();

// Get recommended vector types for query
const recommended = vectorRegistry.getRecommendedVectorTypes(
  'react api components for developers'
);

// Validate vector type combination
const validation = vectorRegistry.validateVectorTypeCombination([
  'semantic',
  'entities.functionality',
  'composites.capabilities'
]);

// Get vector type combinations for use cases
const combinations = vectorRegistry.getVectorTypeCombinations();
```

## Multi-Vector Search Strategy

### Vector Type Combinations

The system provides predefined combinations for common use cases:

1. **General Tool Discovery**
   - Types: `semantic`, `composites.identity`
   - Collections: `tools`
   - Use Case: Users searching for tools by name or general description

2. **Feature-Specific Search**
   - Types: `semantic`, `entities.functionality`, `composites.capabilities`
   - Collections: `functionality`
   - Use Case: Users looking for specific capabilities or features

3. **Industry and Role-Based Search**
   - Types: `semantic`, `entities.industries`, `entities.userTypes`, `composites.usecase`
   - Collections: `usecases`
   - Use Case: Users in specific industries or roles looking for relevant tools

4. **Technical Implementation Search**
   - Types: `semantic`, `entities.interface`, `composites.technical`
   - Collections: `interface`
   - Use Case: Developers looking for specific technical requirements

### Query Routing

The orchestrator uses intelligent routing to select optimal collections:

1. **Vocabulary-Based Routing**: Matches query keywords against controlled vocabularies
2. **Semantic Routing**: Falls back to semantic analysis when vocabulary matching fails
3. **Manual Routing**: Uses explicitly specified collections when provided

## Performance Features

### Caching
- **Embedding Cache**: In-memory caching for generated embeddings
- **Configurable TTL**: Cache time-to-live configuration
- **Size Management**: Automatic cache size management

### Batch Processing
- **Concurrent Processing**: Parallel processing with configurable concurrency limits
- **Batch Operations**: Efficient batch upserts and searches
- **Progress Tracking**: Detailed progress reporting for long operations

### Error Handling & Resilience
- **Retry Logic**: Automatic retry for transient failures
- **Graceful Degradation**: Fallback mechanisms for service failures
- **Health Monitoring**: Continuous health checks and reporting

## Configuration

### Environment Variables

Key environment variables for service configuration:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=toolsearch

# Qdrant Configuration
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_USE_ENHANCED_COLLECTION=true

# Embedding Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large:latest
ENABLE_CACHE=true
CACHE_TTL=3600

# Performance Configuration
DEFAULT_BATCH_SIZE=50
MAX_CONCURRENT_REQUESTS=10
```

### Service Configuration

Each service can be configured through:

1. **Environment Variables**: For deployment-specific settings
2. **Configuration Objects**: For runtime configuration
3. **Collection Configurations**: For collection-specific settings

## Development Guidelines

### Adding New Services

When adding new services:

1. Place the service in the appropriate subdirectory:
   - `database/` - Data persistence (MongoDB, Qdrant)
   - `embedding/` - Vector embedding generation
   - `indexing/` - Vector indexing pipelines
   - `sync/` - Data synchronization
   - `search/` - Search orchestration
   - `llm/` - LLM integration
   - `infrastructure/` - Operational services (health, metrics, etc.)
2. Follow the existing service pattern with proper error handling
3. Include comprehensive TypeScript types and interfaces
4. Add progress tracking for long-running operations
5. Include health check methods
6. Export from the subdirectory's `index.ts` file
7. Re-export from the main `services/index.ts` if needed

### Adding New Collections

1. Define collection configuration in `QdrantCollectionConfigService`
2. Create content generator in `ContentGeneratorFactory`
3. Update vector type mappings in `VectorTypeRegistryService`
4. Add collection-specific validation logic

### Adding New Vector Types

1. Register vector type in `VectorTypeRegistryService`
2. Define vector configuration in enhanced schema
3. Update content generators for new vector type
4. Add validation logic for the new vector type

## Testing

### Service Health Checks

```typescript
// Check MongoDB service health
const mongoTools = await mongoDBService.getAllTools();

// Check Qdrant service health
const qdrantHealth = await qdrantService.getCollectionInfo();

// Check collection consistency
const isConsistent = await orchestrator.validateCollectionConsistency();
```

### Integration Testing

The services are designed for integration testing:

```bash
# Test individual services
npm test -- services/mongodb.service.test.ts
npm test -- services/qdrant.service.test.ts

# Test service integration
npm test -- services/integration/
```

## Dependencies

### External Dependencies
- **MongoDB**: Primary data storage
- **Qdrant**: Vector database for semantic search
- **Ollama**: Local embedding generation

### Internal Dependencies
- **@/config/database**: Database configuration
- **@/config/models**: Model configurations
- **@/config/constants**: System constants
- **@/types/tool.types**: Tool data types
- **@/utils/vector-validation**: Vector validation utilities

## Architecture Benefits

1. **Modularity**: Each service has a single responsibility
2. **Scalability**: Services can be scaled independently
3. **Flexibility**: Easy to add new collections and vector types
4. **Performance**: Optimized for concurrent operations
5. **Reliability**: Comprehensive error handling and health monitoring
6. **Maintainability**: Clear separation of concerns and type safety