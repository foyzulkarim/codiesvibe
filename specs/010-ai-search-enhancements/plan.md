# AI Search Enhancement v2.0 - Comprehensive Implementation Plan

## Executive Summary

This plan transforms the current search-api from a 3-stage LangGraph pipeline into a sophisticated multi-stage RAG architecture that significantly improves query understanding, result relevance, and system reliability. The enhancement focuses on handling ambiguous user queries through context enrichment, local NLP processing, and dynamic execution planning.

### Key Goals
1. **Query Disambiguation**: Transform vague queries like "free UI builder with hosting" into precise database queries
2. **Grounded Assumptions**: Use MongoDB statistics to reduce LLM hallucination and improve reasoning
3. **Performance Optimization**: Leverage local NLP processing with transformers.js for faster, cheaper operations
4. **Adaptive Execution**: Dynamic plan-driven execution based on query complexity and context

### Expected Outcomes
- **40-60% improvement** in search relevance for ambiguous queries
- **50-70% reduction** in LLM API costs through local NLP processing
- **<500ms response time** for simple queries, <2s for complex queries
- **Graceful degradation** with multiple fallback strategies

---

## Current State Analysis

### What You Have ✅
- **LangGraph Foundation**: 3-stage pipeline (intent-extraction → query-planning → execution)
- **Modular Architecture**: 15+ specialized nodes for different extraction tasks
- **Vector Database**: Qdrant integration for semantic search
- **Structured Queries**: MongoDB with aggregation pipelines
- **Controlled Vocabularies**: Pre-defined categories, interfaces, pricing models
- **Advanced State Management**: Checkpointing, rollback, recovery mechanisms
- **Error Resilience**: Thread management and state validation

### What's Missing ❌
- **Context Enrichment**: No statistical grounding for LLM assumptions
- **Local NLP Processing**: All NLP tasks rely on LLM calls
- **Dynamic Execution**: Fixed pipeline regardless of query type
- **Advanced Result Merging**: Simple result combination without intelligent ranking
- **Entity Statistics**: No aggregated insights about the tool database

---

## Codebase Integration

This section outlines how the AI Search Enhancement v2.0 plan integrates with the existing codebase patterns and systems.

### Existing System Integration Points

#### Function Registry System
The enhancement will leverage the existing function registry in `search-api/src/nodes/functions/index.ts`:

```typescript
// Current function registry pattern
export const functionMappings = {
  "lookup-by-name": "nodes/functions/lookup-by-name",
  "semantic-search": "nodes/functions/semantic-search",
  "filter-by-price": "nodes/functions/filter-by-price",
  // ... existing mappings
};

// Enhanced with new context enrichment functions
export const enhancedFunctionMappings = {
  ...functionMappings,
  "context-enrichment": "nodes/functions/context-enrichment",
  "entity-statistics": "nodes/functions/entity-statistics",
  "local-nlp-processing": "nodes/functions/local-nlp-processing",
  "multi-vector-search": "nodes/functions/multi-vector-search",
  "result-merging": "nodes/functions/result-merging"
};
```

#### State Monitoring System
The enhancement will extend the existing monitoring system in `search-api/src/utils/state-monitor.ts`:

```typescript
// Current StateMonitor pattern
class StateMonitor {
  private static instance: StateMonitor;
  
  public static getInstance(config?: Partial<StateMonitorConfig>): StateMonitor {
    if (!StateMonitor.instance) {
      StateMonitor.instance = new StateMonitor(config);
    }
    return StateMonitor.instance;
  }
  
  public trackTransition(threadId: string, fromNode: string, toNode: string, executionTime: number, result: any): void {
    // Existing implementation
  }
}

// Enhanced with new monitoring capabilities
class EnhancedStateMonitor extends StateMonitor {
  public trackContextEnrichment(threadId: string, entity: string, statistics: any, generationTime: number): void {
    // Track context enrichment performance
  }
  
  public trackLocalNLPUsage(threadId: string, processingType: string, processingTime: number, cacheHit: boolean): void {
    // Track local NLP processing metrics
  }
  
  public trackVectorSearch(threadId: string, vectorType: string, resultCount: number, searchTime: number): void {
    // Track multi-vector search performance
  }
}
```

#### Router System Integration
The enhancement will follow the existing router pattern found in the codebase:

```typescript
// Current router pattern (from search-api/src/graphs/execution.graph.ts)
(
  "execution-router",
  executionRouter,
  {
    "single-plan-executor": "single-plan-executor",
    "multi-strategy-executor": "multi-strategy-executor"
  }
)

// Enhanced with new context-aware routing
(
  "context-enrichment-router",
  contextEnrichmentRouter,
  {
    "entity-statistics": "entity-statistics",
    "semantic-context": "semantic-context",
    "skip-enrichment": "query-planning"
  }
)

(
  "nlp-processing-router",
  nlpProcessingRouter,
  {
    "local-processing": "local-nlp-processing",
    "llm-fallback": "llm-nlp-processing",
    "hybrid-processing": "hybrid-nlp-processing"
  }
)
```

#### Embedding Cache System Integration
The enhancement will extend the existing caching pattern in `search-api/src/utils/embedding-cache.ts`:

```typescript
// Current cache pattern
class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();
  
  get(key: string): number[] | null {
    // Existing implementation
  }
  
  set(key: string, embedding: number[]): void {
    // Existing implementation
  }
}

// Enhanced with multi-vector caching
class EnhancedEmbeddingCache extends EmbeddingCache {
  private vectorCaches: Map<string, Map<string, CacheEntry>> = new Map();
  
  getVector(vectorType: string, key: string): number[] | null {
    if (!this.vectorCaches.has(vectorType)) {
      return null;
    }
    return this.vectorCaches.get(vectorType)?.get(key)?.embedding || null;
  }
  
  setVector(vectorType: string, key: string, embedding: number[]): void {
    if (!this.vectorCaches.has(vectorType)) {
      this.vectorCaches.set(vectorType, new Map());
    }
    this.vectorCaches.get(vectorType)?.set(key, {
      embedding,
      timestamp: Date.now()
    });
  }
  
  // Enhanced cache management for multiple vector types
  cleanupVectorCaches(): number {
    let deletedCount = 0;
    for (const [vectorType, cache] of this.vectorCaches.entries()) {
      deletedCount += this.cleanupCache(cache);
    }
    return deletedCount;
  }
}
```

---

## Detailed Architecture v2.0

### Stage 0: Entity Extraction & Intent Classification (Enhanced)
**Current**: LLM-based NER and intent classification
**Enhanced**: transformers.js for local processing + LLM fallback for complex cases

```typescript
// Complete No-Hardcode Flow Implementation

// Step 1: User provides query (ANY query - no hardcoding)
const userQuery = "I need a free UI builder with hosting capabilities";

// Step 2: transformers.js extracts entities dynamically
async function extractEntitiesFromQuery(query: string): Promise<string[]> {
  const nerPipeline = await pipeline('token-classification', 'Xenova/bert-base-NER');

  // Extract entities from ANY user query
  const nerResults = await nerPipeline(query);

  // Combine consecutive tokens (UI + builder = "UI builder")
  const combinedEntities = combineConsecutiveTokens(nerResults);

  // Extract price signals, tool types, features
  const processedEntities = await processRawEntities(combinedEntities, query);

  return processedEntities;
  // Result: ["UI builder", "free", "hosting capabilities"] - all from user input!
}

// Step 3: Dynamic statistics generation (no hardcoding)
async function generateContextForEntities(extractedEntities: string[]) {
  const entityStatistics = {};

  for (const entity of extractedEntities) { // Each entity came from user query
    const stats = await generateEntityStatistics(entity);
    entityStatistics[entity] = stats;
  }

  return entityStatistics;
}

// Example: Query = "Find me an AI code generator like GitHub Copilot"
// Step 1: User query (any text)
// Step 2: transformers.js extracts: ["AI", "code generator", "GitHub Copilot"]
// Step 3: MongoDB generates statistics for each entity dynamically
// Step 4: LLM uses statistics: "85% of AI code generators are Web-based..."
```

### transformers.js Integration (No Hardcoding Required)
```typescript
// Local NLP Service - works with ANY user query
class LocalNLPService {
  private nerPipeline: any;
  private zeroShotPipeline: any;

  async initialize() {
    // Load models once on startup (no hardcoding of entities)
    this.nerPipeline = await pipeline('token-classification', 'Xenova/bert-base-NER');
    this.zeroShotPipeline = await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased');
  }

  async processAnyQuery(query: string): Promise<NLPResult> {
    // Extract entities from ANY query (no hardcoding)
    const entities = await this.extractEntities(query);

    // Classify intent of ANY query
    const intent = await this.classifyIntent(query);

    return { entities, intent, query };
  }

  private async extractEntities(query: string): Promise<string[]> {
    const results = await this.nerPipeline(query);

    // Process ANY entities found in ANY query
    return results
      .filter(r => r.score > 0.7) // Filter by confidence
      .filter(r => !this.isStopWord(r.word)) // Remove common words
      .map(r => r.word);
  }

  private async classifyIntent(query: string): Promise<string> {
    const labels = ["filter_search", "comparison_query", "discovery", "exploration"];
    const results = await this.zeroShotPipeline(query, labels);
    return results.labels[0]; // Returns best matching intent
  }
}
```

**Key Point**: The system works with ANY user query without hardcoding. "UI builder" comes from transformers.js analyzing "I need a free UI builder with hosting" - it's not predefined anywhere in the code!

### Stage 0.5: Context Enrichment (NEW)
**Purpose**: Use Qdrant semantic search to generate statistical context from similar tools

```typescript
interface EntityStatistics {
  [entityType: string]: {
    commonInterfaces: Array<{ interface: string; percentage: number }>;
    commonPricing: Array<{ pricing: string; percentage: number }>;
    commonCategories: Array<{ category: string; percentage: number }>;
    totalCount: number;
    confidence: number;
    semanticMatches: number; // How many semantically similar tools found
    avgSimilarityScore: number; // Average similarity score
  };
}

// Qdrant-Based Context Enrichment Node Implementation
const contextEnrichmentNode = async (state: SearchState): Promise<SearchState> => {
  const { extractedEntities } = state;

  if (!extractedEntities || extractedEntities.length === 0) {
    return {
      ...state,
      entityStatistics: {},
      metadataContext: {
        searchSpaceSize: 0,
        metadataConfidence: 0,
        assumptions: [],
        lastUpdated: new Date()
      }
    };
  }

  const entityStatistics: EntityStatistics = {};

  // Generate statistics using Qdrant for each extracted entity
  for (const entity of extractedEntities) {
    const stats = await generateEntityStatisticsWithQdrant(entity);
    entityStatistics[entity] = stats;
  }

  return {
    ...state,
    entityStatistics,
    metadataContext: {
      searchSpaceSize: Object.values(entityStatistics).reduce((sum, stat) => sum + stat.totalCount, 0),
      metadataConfidence: calculateOverallConfidence(entityStatistics),
      assumptions: generateAssumptions(entityStatistics),
      lastUpdated: new Date()
    }
  };
};

// Generate statistics using Qdrant semantic search (much better coverage!)
async function generateEntityStatisticsWithQdrant(entity: string): Promise<any> {
  try {
    // Step 1: Use Qdrant to find semantically similar tools
    const qdrantResults = await qdrantService.searchByText(entity, 50, {
      score_threshold: 0.6 // Only include reasonably similar tools
    });

    if (qdrantResults.length === 0) {
      return getMinimalStatistics(entity);
    }

    // Step 2: Extract metadata from the semantically similar tools
    const similarTools = qdrantResults.map(result => result.payload);

    // Step 3: Generate statistics from the similar tools
    const statistics = {
      commonInterfaces: calculateDistribution(similarTools.map(tool => tool.interface)),
      commonPricing: calculateDistribution(similarTools.map(tool => tool.pricing)),
      commonCategories: calculateDistribution(
        similarTools.flatMap(tool => Array.isArray(tool.categories) ? tool.categories : [tool.categories])
      ),
      totalCount: similarTools.length,
      confidence: Math.min(similarTools.length / 10, 1.0),
      semanticMatches: qdrantResults.length,
      avgSimilarityScore: qdrantResults.reduce((sum, result) => sum + result.score, 0) / qdrantResults.length,
      source: 'semantic_search',
      sampleTools: similarTools.slice(0, 3).map(tool => tool.name) // Show examples of similar tools
    };

    return statistics;

  } catch (error) {
    console.error(`Error generating statistics for entity "${entity}" using Qdrant:`, error);
    return getMinimalStatistics(entity);
  }
}

// Calculate percentage distribution from an array of values
function calculateDistribution(values: any[]): Array<{ value: string; percentage: number }> {
  const counts: Record<string, number> = {};

  values.forEach(value => {
    if (Array.isArray(value)) {
      value.forEach(v => counts[v] = (counts[v] || 0) + 1);
    } else if (value) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });

  const total = Object.values(counts).reduce((sum: number, count: number) => sum + count, 0);

  return Object.entries(counts)
    .map(([value, count]) => ({
      value,
      percentage: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5); // Top 5 results
}

// Example: Query = "free UI builder with hosting"
// Step 1: transformers.js extracts: ["UI builder", "free", "hosting"]
// Step 2: For "UI builder", Qdrant finds semantically similar tools:
//   - Figma (similarity: 0.89)
//   - Webflow (similarity: 0.85)
//   - Bubble (similarity: 0.82)
//   - Carrd (similarity: 0.78)
//   - Tilda (similarity: 0.75)
//   - Plus 45 more tools...
// Step 3: Generate statistics from these 50 similar tools:
{
  "UI builder": {
    "commonInterfaces": [
      { "value": "Web", "percentage": 92 }, // 46 out of 50 similar tools are Web-based
      { "value": "Desktop", "percentage": 6 },  // 3 out of 50 have desktop apps
      { "value": "Mobile", "percentage": 2 }    // 1 out of 50 has mobile app
    ],
    "commonPricing": [
      { "value": "Freemium", "percentage": 48 }, // 24 out of 50 are freemium
      { "value": "Free", "percentage": 28 },      // 14 out of 50 have free tiers
      { "value": "$0-50/month", "percentage": 24 } // 12 out of 50 are cheap
    ],
    "commonCategories": [
      { "value": "Rapid Prototyping", "percentage": 38 },
      { "value": "No-Code", "percentage": 31 },
      { "value": "Web Development", "percentage": 23 }
    ],
    "totalCount": 50,
    "confidence": 1.0,
    "semanticMatches": 50,
    "avgSimilarityScore": 0.78,
    "source": "semantic_search",
    "sampleTools": ["Figma", "Webflow", "Bubble"]
  }
}
```

## Enhanced Vector Seeding Strategy for Entity Context Enrichment

### Current Problem: Single Vector Approach
```typescript
// ❌ Current: Single "kitchen sink" vector per tool
"Tool: Figma, Description: Collaborative interface design tool, Categories: [Design, Prototyping], Features: [...]"
// Single vector: [0.1, 0.5, 0.3, ...] - mixes everything together

// Problem: Searching for "UI builder" won't find Figma because:
// 1. The exact phrase "UI builder" doesn't appear in any field
// 2. The semantic signal is diluted across all fields
// 3. No dedicated vectors for entity-specific search
```

### ✅ Solution: Multi-Vector Seeding Strategy

```typescript
// ✅ Enhanced: Multiple specialized vectors per tool
interface EnhancedToolVectors {
  // Main semantic vector (existing - for general search)
  semantic: number[];

  // NEW: Entity-specific vectors for context enrichment
  entities: {
    categories: number[];        // Embed each category separately
    functionality: number[];     // Embed each function separately
    interface: number[];         // Embed interface type
    useCases: number[];          // Embed each use case separately
    keywords: number[];          // Embed search keywords
    aliases: number[];           // Embed common alternative names
  };

  // NEW: Composite vectors for different search contexts
  composites: {
    toolType: number[];          // "UI builder", "API tool", "database"
    domain: number[];            // "web development", "mobile app", "AI"
    capability: number[];        // "drag-drop", "real-time", "offline"
  };
}

// Enhanced seeding implementation
async function seedEnhancedVectors(tool: ToolData): Promise<void> {
  // 1. Existing semantic vector (unchanged)
  const semanticContent = generateWeightedContent(tool);
  const semanticVector = await embeddingService.generateEmbedding(semanticContent);

  // 2. NEW: Entity-specific vectors
  const entityVectors = {
    categories: await embedArray(tool.categories || []),
    functionality: await embedArray(tool.functionality || []),
    interface: await embedSingle(tool.interface || 'Web'),
    useCases: await embedArray(tool.useCases || []),
    keywords: await embedArray(tool.searchKeywords || []),
    aliases: await generateAliasesVector(tool) // NEW: Generate common aliases
  };

  // 3. NEW: Composite vectors for search contexts
  const compositeVectors = {
    toolType: await generateToolTypeVector(tool),
    domain: await generateDomainVector(tool),
    capability: await generateCapabilityVector(tool)
  };

  // Store all vectors in Qdrant with structured payload
  await qdrantService.upsertEnhancedTool(tool.id, {
    semantic: semanticVector,
    entities: entityVectors,
    composites: compositeVectors
  }, tool);
}
```

### Enhanced Context Enrichment with Multi-Vector Search

```typescript
// NEW: Smart entity search using multiple vector types
async function generateEntityStatisticsWithQdrant(entity: string): Promise<any> {
  const searchResults = {
    semanticMatches: [],
    categoryMatches: [],
    functionalityMatches: [],
    aliasMatches: [],
    compositeMatches: []
  };

  // 1. Search semantic vector (existing approach)
  searchResults.semanticMatches = await qdrantService.searchByEmbedding(
    await embeddingService.generateEmbedding(entity),
    20,
    { vector_name: 'semantic' }
  );

  // 2. NEW: Search category vectors
  searchResults.categoryMatches = await qdrantService.searchByEmbedding(
    await embeddingService.generateEmbedding(entity),
    10,
    { vector_name: 'entities.categories' }
  );

  // 3. NEW: Search functionality vectors
  searchResults.functionalityMatches = await qdrantService.searchByEmbedding(
    await embeddingService.generateEmbedding(entity),
    10,
    { vector_name: 'entities.functionality' }
  );

  // 4. NEW: Search alias vectors (for "UI builder" → "interface design tool")
  searchResults.aliasMatches = await qdrantService.searchByEmbedding(
    await embeddingService.generateEmbedding(entity),
    10,
    { vector_name: 'entities.aliases' }
  );

  // 5. NEW: Search composite vectors
  searchResults.compositeMatches = await qdrantService.searchByEmbedding(
    await embeddingService.generateEmbedding(entity),
    10,
    { vector_name: 'composites.toolType' }
  );

  // 6. Merge and deduplicate results with source attribution
  const mergedResults = mergeVectorSearchResults(searchResults);

  // 7. Generate statistics from merged results
  return generateStatisticsFromResults(mergedResults, entity);
}

// Example: Entity "UI builder" search
async function exampleUIBuilderSearch() {
  // Vector search finds:
  // - Semantic: "Figma", "Sketch" (design tools with similar descriptions)
  // - Category: "Bubble", "Webflow" (tools in "No-Code" category)
  // - Functionality: "Framer", "Adalo" (tools with "interface builder" function)
  // - Alias: "Figma", "Webflow" (tools tagged with alias "UI builder")
  // - Composite: "Figma", "Framer" (tools with toolType="interface builder")

  // Total: 25-50 highly relevant tools vs current 2-3 exact matches!
}
```

### Enhanced Tool Data Schema for Better Vector Seeding

```typescript
// Enhanced tool schema to support multi-vector seeding
interface EnhancedToolData extends ToolData {
  // NEW: Explicit entity relationships
  toolTypes?: string[];           // ["UI builder", "design tool", "prototyping platform"]
  domains?: string[];            // ["web design", "mobile app design", "collaboration"]
  capabilities?: string[];       // ["drag-drop", "real-time", "version control"]

  // NEW: Search optimization
  aliases?: string[];            // ["interface designer", "UI design tool"]
  synonyms?: string[];           // ["figma alternative", "sketch competitor"]

  // NEW: Context relationships
  similarTo?: string[];          // Tool IDs for similar tools
  alternativesFor?: string[];    // Tool IDs this tool replaces
  worksWith?: string[];         // Tool IDs for integrations

  // NEW: Usage patterns
  commonUseCases?: string[];     // ["prototype design", "user interface design"]
  userTypes?: string[];          // ["designers", "product managers", "developers"]
}

// NEW: Enhanced alias generation for better coverage
async function generateAliasesVector(tool: EnhancedToolData): Promise<number[]> {
  const aliases = [
    ...tool.aliases || [],
    ...generateToolTypeAliases(tool.toolTypes || []),
    ...generateCapabilityAliases(tool.capabilities || []),
    ...generateDomainAliases(tool.domains || [])
  ];

  const aliasText = aliases.join(' ');
  return await embeddingService.generateEmbedding(aliasText);
}

// Example: Figma aliases generation
// Input: Figma (design tool, with drag-drop, for web design)
// Output aliases: ["UI builder", "interface design tool", "drag-drop designer", "web design platform", "prototyping tool", "collaborative design tool"]
```

### Comparison: Current vs Enhanced Vector Strategy

| Search Strategy | Current Approach | Enhanced Multi-Vector | Improvement |
|----------------|------------------|---------------------|-------------|
| **Query**: "UI builder" | Finds 2-3 tools with exact phrase | Finds 25-50+ conceptually similar tools | **10x+ coverage** |
| **Query**: "AI code assistant" | Finds tools mentioning "AI code" | Finds tools with code assistance, AI features, etc. | **15x+ relevance** |
| **Coverage** | Limited to exact text matches | Multiple semantic relationships | **Comprehensive** |
| **Relevance** | Binary (match/no-match) | Graded similarity scores | **Nuanced** |
| **Context Quality** | Based on tiny samples | Based on large, diverse samples | **Statistically significant** |

### Enhanced Qdrant vs MongoDB for Context Enrichment

| Aspect | MongoDB Regex | Qdrant Single Vector | Qdrant Multi-Vector | Winner |
|--------|---------------|----------------------|---------------------|---------|
| **Coverage** | Poor (exact match only) | Good (semantic similarity) | **Excellent** (multi-dimensional similarity) | ✅ **Multi-Vector** |
| **Relevance** | Low (misses related tools) | Good (finds conceptually similar) | **Outstanding** (finds tools from multiple angles) | ✅ **Multi-Vector** |
| **Context Richness** | Very limited | Good | **Comprehensive** (multiple relationship types) | ✅ **Multi-Vector** |
| **Statistical Quality** | Poor (tiny samples) | Good (larger samples) | **Excellent** (large, diverse samples) | ✅ **Multi-Vector** |

### Enhanced Flow with Multi-Vector Qdrant
```typescript
// Complete enhanced flow with multi-vector context enrichment
Query: "free UI builder with hosting"
↓
transformers.js extracts: ["UI builder", "free", "hosting"]
↓
For each entity → Multi-vector Qdrant search:
  - Semantic vectors: "Figma", "Sketch" (similar descriptions)
  - Category vectors: "Bubble", "Webflow" (No-Code category)
  - Functionality vectors: "Framer", "Adalo" (interface building)
  - Alias vectors: "Figma", "Webflow" (tagged as UI builders)
  - Composite vectors: "Figma", "Framer" (toolType=interface builder)
↓
Merge and deduplicate: 45 highly relevant tools
↓
Generate statistics from diverse sample:
  "92% of UI builders are Web-based, 48% are Freemium, 38% focus on Rapid Prototyping..."
↓
LLM receives rich, statistically significant context for better reasoning!
```

---

## Implementation Plan for Enhanced Vector Seeding

### Phase 1: Qdrant Collection Enhancement (Week 1)
**Tasks**:
1. **Enhance Qdrant Collection Schema**
   ```typescript
   // Support multiple named vectors per tool
   interface QdrantCollectionConfig {
     vectors: {
       semantic: { size: 1024, distance: "Cosine" },
       "entities.categories": { size: 1024, distance: "Cosine" },
       "entities.functionality": { size: 1024, distance: "Cosine" },
       "entities.aliases": { size: 1024, distance: "Cosine" },
       "composites.toolType": { size: 1024, distance: "Cosine" }
     }
   }
   ```

2. **Update Qdrant Service for Multi-Vector Support**
   - Extend `qdrantService.ts` to support named vectors
   - Add methods for multi-vector search and merging
   - Implement result deduplication and source attribution

### Phase 2: Enhanced Data Schema (Week 1-2)
**Tasks**:
1. **Extend Tool Data Schema**
   ```typescript
   // Add new fields to MongoDB tools collection
   interface EnhancedToolSchema {
     // ... existing fields

     // NEW: Enhanced relationships
     toolTypes: string[];
     domains: string[];
     capabilities: string[];
     aliases: string[];
     synonyms: string[];

     // NEW: Context relationships
     similarTo: string[];
     alternativesFor: string[];
     worksWith: string[];
   }
   ```

2. **Data Migration Script**
   - Analyze existing tools to infer missing relationships
   - Generate aliases, synonyms, and tool types programmatically
   - Migrate existing data to enhanced schema

### Phase 3: Multi-Vector Seeding Implementation (Week 2-3)
**Tasks**:
1. **Enhanced Vector Indexing Service**
   ```typescript
   class EnhancedVectorIndexingService extends VectorIndexingService {
     async indexEnhancedTool(tool: EnhancedToolData): Promise<void> {
       // Generate multiple specialized vectors
       const vectors = await this.generateMultipleVectors(tool);

       // Store in Qdrant with named vectors
       await qdrantService.upsertEnhancedTool(tool.id, vectors, tool);
     }

     private async generateMultipleVectors(tool: EnhancedToolData) {
       return {
         semantic: await this.generateSemanticVector(tool),
         'entities.categories': await this.generateCategoryVectors(tool),
         'entities.functionality': await this.generateFunctionalityVectors(tool),
         'entities.aliases': await this.generateAliasVectors(tool),
         'composites.toolType': await this.generateToolTypeVectors(tool)
       };
     }
   }
   ```

2. **Alias and Relationship Generation**
   - Automated alias generation from existing fields
   - Tool type inference from categories and functionality
   - Domain and capability extraction from descriptions

### Phase 4: Enhanced Context Enrichment (Week 3-4)
**Tasks**:
1. **Multi-Vector Context Enrichment Node**
   ```typescript
   class MultiVectorContextEnrichmentNode {
     async generateEntityStatistics(entity: string): Promise<EntityStatistics> {
       // Search across multiple vector types
       const searches = await Promise.all([
         this.searchSemanticVectors(entity),
         this.searchCategoryVectors(entity),
         this.searchFunctionalityVectors(entity),
         this.searchAliasVectors(entity),
         this.searchCompositeVectors(entity)
       ]);

       // Merge results with source attribution
       const mergedResults = this.mergeSearchResults(searches);

       // Generate statistics from comprehensive results
       return this.generateStatistics(mergedResults, entity);
     }
   }
   ```

2. **Enhanced Statistics Generation**
   - Source-aware statistics (which vector type found which tools)
   - Confidence scoring based on result diversity and similarity
   - Quality metrics for statistical significance

### Phase 5: Testing and Validation (Week 4-5)
**Tasks**:
1. **Coverage Testing**
   - Test with diverse entity queries ("UI builder", "AI assistant", "database")
   - Measure improvement in result coverage and relevance
   - Validate statistical quality of generated context

2. **Performance Testing**
   - Measure multi-vector search performance
   - Optimize caching and parallel search strategies
   - Ensure sub-200ms response times for context enrichment

3. **Quality Validation**
   - Compare context quality before/after enhancement
   - Validate LLM reasoning improvement with richer context
   - User testing and feedback collection

### Success Metrics for Enhanced Vector Strategy

1. **Coverage Improvement**: 10x+ increase in relevant tools found per entity
2. **Context Quality**: Statistical significance of generated context (n ≥ 30)
3. **Search Performance**: <200ms for multi-vector context enrichment
4. **LLM Reasoning**: Measurable improvement in query understanding accuracy
5. **User Satisfaction**: Improved search relevance scores

This enhanced multi-vector approach will dramatically improve the quality and coverage of your context enrichment, making the AI search system much more effective at handling ambiguous queries!

### Stage 1: Query Understanding + Planning (Enhanced)
**Current**: Basic intent analysis and fixed execution plan
**Enhanced**: Semantic reasoning with statistical context + dynamic plan generation

```typescript
interface ExecutionPlan {
  semantic_understanding: {
    intent: string;
    constraints: Record<string, any>;
    comparisons: string[];
    price_sentiment: string;
    domain: string;
    assumptions: string[]; // Based on metadata statistics
    confidence_level: number;
  };
  execution_plan: Array<{
    stage: string;
    tool: string;
    params: Record<string, any>;
    reason: string;
    optional: boolean;
  }>;
}

// Example dynamic plans based on query type
"free UI builder with hosting" → [
  { stage: "vocabulary_classification", tool: "transformers.js", reason: "Extract controlled vocabularies" },
  { stage: "disambiguation", tool: "LLM", reason: "Resolve ambiguity using statistics" },
  { stage: "hybrid_search", tool: "MongoDB+Qdrant", reason: "Comprehensive matching" }
]

"similar to Cursor IDE" → [
  { stage: "reference_resolution", tool: "LLM", reason: "Identify reference tool" },
  { stage: "semantic_search", tool: "Qdrant", reason: "Find similar tools" },
  { stage: "re_ranking", tool: "LLM", reason: "Final relevance assessment" }
]
```

### Stage 2-4: Dynamic Execution (NEW)
**Purpose**: Execute only necessary stages based on the plan

```typescript
// Conditional execution paths
switch (plan.semantic_understanding.intent) {
  case "filter_search":
    return ["vocabulary_classification", "hybrid_search"];
  case "comparison_query":
    return ["reference_resolution", "semantic_search", "re_ranking"];
  case "discovery":
    return ["semantic_analysis", "hybrid_search", "diversification"];
  default:
    return ["fallback_search"];
}
```

### Stage 5: Result Merging & Ranking (Enhanced)
**Current**: Simple result concatenation
**Enhanced**: Reciprocal Rank Fusion with source weighting

```typescript
interface MergedResults {
  results: Array<{
    tool: any;
    finalScore: number;
    sourceScores: {
      mongodb: number;
      qdrant: number;
      combined: number;
    };
    explanation: string;
  }>;
}

// RRF formula: score = 1/(k + rank) with k=60
// Weight by query type: filter queries emphasize MongoDB, semantic queries emphasize Qdrant
```

---

## Technical Specifications

### Dependencies to Add
```json
{
  "@xenova/transformers": "^2.17.1",
  "@tensorflow/tfjs-node": "^4.15.0",
  "onnxruntime-node": "^1.16.3",
  "compromise": "^14.10.0",
  "natural": "^6.12.0",
  "ml-matrix": "^6.10.4"
}
```

### Environment Variables
```env
# transformers.js Configuration
TRANSFORMERS_CACHE_DIR=./models
TRANSFORMERS_LOCAL_FILES_ONLY=false
TRANSFORMERS_OFFLINE=false

# Performance Settings
ENABLE_INTELLIGENT_CACHING=true
CACHE_TTL_DEFAULT=3600
MAX_CONCURRENT_SEARCHES=10

# A/B Testing
AB_TESTING_ENABLED=true
EXPERIMENT_CONFIG_PATH=./config/experiments.json
```

### transformers.js Model Selection
```typescript
// Recommended models for local NLP processing
const NLP_MODELS = {
  ner: {
    model: "Xenova/bert-base-NER", // 420MB, good for tool names
    fallback: "Xenova/distilbert-base-uncased"
  },
  zero_shot: {
    model: "Xenova/distilbert-base-uncased", // 260MB, fast for classification
    labels: ["filter_search", "comparison_query", "discovery", "exploration"]
  },
  token_classification: {
    model: "Xenova/bert-base-NER",
    entities: ["PRICE_SIGNAL", "TOOL_TYPE", "FEATURE", "COMPARISON"]
  }
};
```

### Local NLP Service Implementation
```typescript
// New: src/services/local-nlp.service.ts
interface LocalNLPResult {
  entities: Array<{text: string, label: string, confidence: number}>;
  intent: {label: string, confidence: number};
  sentiment: {label: string, score: number};
  language: string;
}

class LocalNLPService {
  async processQuery(query: string): Promise<LocalNLPResult> {
    // Named Entity Recognition
    const entities = await this.extractEntities(query);

    // Intent Classification
    const intent = await this.classifyIntent(query);

    // Sentiment Analysis
    const sentiment = await this.analyzeSentiment(query);

    // Language Detection
    const language = await this.detectLanguage(query);

    return { entities, intent, sentiment, language };
  }

  private async extractEntities(query: string) {
    // Use transformers.js NER model
    const pipeline = await this.getNERPipeline();
    const results = await pipeline(query);
    return results.filter(entity =>
      entity.score > 0.7 &&
      !this.isCommonWord(entity.word)
    );
  }

  private async classifyIntent(query: string) {
    // Use zero-shot classification
    const pipeline = await this.getZeroShotPipeline();
    const labels = ["filter_search", "comparison_query", "discovery", "exploration"];
    const results = await pipeline(query, labels);
    return {
      label: results.labels[0],
      confidence: results.scores[0]
    };
  }
}
```

### Enhanced State Schema
```typescript
export const StateAnnotation = Annotation.Root({
  // ... existing fields ...

  // Context Enrichment (Stage 0.5)
  entityStatistics: Annotation<{
    [entityType: string]: {
      commonInterfaces: Array<{ interface: string; percentage: number }>;
      commonPricing: Array<{ pricing: string; percentage: number }>;
      commonCategories: Array<{ category: string; percentage: number }>;
      totalCount: number;
      confidence: number;
    };
  }>,
  metadataContext: Annotation<{
    searchSpaceSize: number;
    metadataConfidence: number;
    assumptions: string[];
    lastUpdated: Date;
  }>,

  // transformers.js Results
  nlpResults: Annotation<{
    entities: Array<{ text: string; type: string; confidence: number }>;
    intent: { label: string; confidence: number };
    vocabularyCandidates: Record<string, Array<{ value: string; confidence: number }>>;
  }>,

  // Execution Plan
  executionPlan: Annotation<ExecutionPlan>,

  // Enhanced Results
  mergedResults: Annotation<MergedResults>
});
```

## State Schema Extension Details

This section provides specific code examples showing how to extend the existing `StateAnnotation` in `search-api/src/types/state.ts` with the new fields mentioned in the plan.

### Current State Schema Pattern

Based on the existing codebase pattern, the current state schema follows this structure:

```typescript
// From search-api/src/types/state.ts (existing pattern)
export const StateAnnotation = Annotation.Root({
  // Input
  query: Annotation<string>,
  
  // Preprocessing
  preprocessedQuery: Annotation<string>,
  
  // Intent Extraction
  intent: Annotation<Intent>,
  confidence: Annotation<{
    overall: number;
    breakdown: Record<string, number>;
  }>,
  extractionSignals: Annotation<{
    nerResults: any[];
    fuzzyMatches: any[];
    semanticCandidates: Record<string, any[]>;
    classificationScores: Record<string, any[]>;
    combinedScores: Record<string, any[]>;
    comparativeFlag: boolean;
    referenceTool: string | null;
    priceConstraints: any;
    interfacePreferences: string[];
    deploymentPreferences: string[];
  }>,
  
  // Routing
  routingDecision: Annotation<"optimal" | "multi-strategy" | "fallback">,
  
  // Planning
  plan: Annotation<Plan>,
  
  // Execution
  executionResults: Annotation<any[]>,
  queryResults: Annotation<any[]>,
  
  // Quality Assessment
  qualityAssessment: Annotation<{
    resultCount: number;
    averageRelevance: number;
    categoryDiversity: number;
    decision: "accept" | "refine" | "expand";
  }>,
  
  // Iteration Control
  iterations: Annotation<{
    refinementAttempts: number;
    expansionAttempts: number;
    maxAttempts: number;
  }>,
  
  // Error Handling
  errors: Annotation<Array<{
    node: string;
    error: Error;
    timestamp: Date;
  }>>,
  
  // Metadata
  metadata: Annotation<{
    startTime: Date;
    endTime?: Date;
    executionPath: string[];
    nodeExecutionTimes: Record<string, number>;
  }>
});
```

### Extended State Schema for AI Search Enhancement

```typescript
// Enhanced StateAnnotation with new fields for AI Search Enhancement v2.0
export const EnhancedStateAnnotation = Annotation.Root({
  // ... preserve all existing fields from StateAnnotation
  
  // NEW: Context Enrichment (Stage 0.5)
  entityStatistics: Annotation<{
    [entityType: string]: {
      commonInterfaces: Array<{ interface: string; percentage: number }>;
      commonPricing: Array<{ pricing: string; percentage: number }>;
      commonCategories: Array<{ category: string; percentage: number }>;
      totalCount: number;
      confidence: number;
      semanticMatches: number;
      avgSimilarityScore: number;
      source: 'semantic_search' | 'mongodb_aggregation' | 'hybrid';
      sampleTools: string[];
    };
  }>,
  
  metadataContext: Annotation<{
    searchSpaceSize: number;
    metadataConfidence: number;
    assumptions: string[];
    lastUpdated: Date;
    enrichmentStrategy: 'qdrant_multi_vector' | 'mongodb_aggregation' | 'hybrid';
    processingTime: number;
  }>,
  
  // NEW: transformers.js Results
  nlpResults: Annotation<{
    entities: Array<{ text: string; type: string; confidence: number }>;
    intent: { label: string; confidence: number };
    vocabularyCandidates: Record<string, Array<{ value: string; confidence: number }>>;
    processingStrategy: 'local' | 'llm_fallback' | 'hybrid';
    processingTime: number;
    modelUsed: string;
  }>,
  
  // NEW: Multi-Vector Search State
  vectorSearchState: Annotation<{
    queryEmbedding: number[];
    vectorSearchResults: {
      semantic: any[];
      categories: any[];
      functionality: any[];
      aliases: any[];
      composites: any[];
    };
    searchMetrics: {
      [vectorType: string]: {
        resultCount: number;
        searchTime: number;
        avgSimilarity: number;
      };
    };
    mergeStrategy: 'reciprocal_rank_fusion' | 'weighted_average' | 'custom';
  }>,
  
  // NEW: Execution Plan (Enhanced)
  executionPlan: Annotation<{
    semantic_understanding: {
      intent: string;
      constraints: Record<string, any>;
      comparisons: string[];
      price_sentiment: string;
      domain: string;
      assumptions: string[];
      confidence_level: number;
      contextualEvidence: string[];
    };
    execution_plan: Array<{
      stage: string;
      tool: string;
      params: Record<string, any>;
      reason: string;
      optional: boolean;
      estimatedTime: number;
    }>;
    adaptive_routing: {
      enabled: boolean;
      routing_decisions: Array<{
        node: string;
        decision: string;
        reasoning: string;
        timestamp: Date;
      }>;
    };
  }>,
  
  // NEW: Enhanced Results
  mergedResults: Annotation<{
    results: Array<{
      tool: any;
      finalScore: number;
      sourceScores: {
        mongodb: number;
        qdrant: {
          semantic: number;
          categories: number;
          functionality: number;
          aliases: number;
          composites: number;
        };
        combined: number;
      };
      explanation: string;
      matchSignals: {
        exactMatches: string[];
        semanticMatches: string[];
        categoryMatches: string[];
        featureMatches: string[];
      };
    }>;
    mergingStrategy: string;
    diversityScore: number;
    relevanceDistribution: {
      high: number;
      medium: number;
      low: number;
    };
  }>,
  
  // NEW: Performance Monitoring (Extended)
  performanceMetrics: Annotation<{
    contextEnrichment: {
      enabled: boolean;
      processingTime: number;
      cacheHitRate: number;
      entityCount: number;
    };
    localNLP: {
      enabled: boolean;
      processingTime: number;
      cacheHitRate: number;
      modelLoadTime: number;
      fallbackCount: number;
    };
    vectorSearch: {
      totalSearchTime: number;
      vectorTypeMetrics: Record<string, {
        searchTime: number;
        resultCount: number;
        cacheHitRate: number;
      }>;
      mergeTime: number;
    };
    costTracking: {
      llmCalls: number;
      localProcessingSavings: number;
      estimatedCostReduction: number;
    };
  }>,
  
  // NEW: Configuration State
  experimentalFeatures: Annotation<{
    enabled: string[];
    variants: Record<string, string>;
    abTestParticipation: Record<string, string>;
  }>,
  
  // Enhanced metadata with new fields
  metadata: Annotation<{
    startTime: Date;
    endTime?: Date;
    executionPath: string[];
    nodeExecutionTimes: Record<string, number>;
    // NEW: Additional metadata fields
    enhancementVersion: string;
    featureFlags: string[];
    resourceUsage: {
      peakMemory: number;
      averageMemory: number;
      cpuTime: number;
    };
    cacheMetrics: {
      embeddingCacheHits: number;
      embeddingCacheMisses: number;
      resultCacheHits: number;
      resultCacheMisses: number;
    };
  }>
});

// Type definition for backward compatibility
export type EnhancedState = typeof EnhancedStateAnnotation.State;
export type State = EnhancedState; // Alias for existing code
```

### Migration Strategy for State Schema

```typescript
// Migration utility for backward compatibility
export class StateSchemaMigrator {
  static migrateLegacyState(legacyState: any): EnhancedState {
    return {
      // Preserve all existing fields
      ...legacyState,
      
      // Initialize new fields with defaults
      entityStatistics: {},
      metadataContext: {
        searchSpaceSize: 0,
        metadataConfidence: 0,
        assumptions: [],
        lastUpdated: new Date(),
        enrichmentStrategy: 'qdrant_multi_vector',
        processingTime: 0
      },
      nlpResults: {
        entities: [],
        intent: { label: 'unknown', confidence: 0 },
        vocabularyCandidates: {},
        processingStrategy: 'local',
        processingTime: 0,
        modelUsed: 'none'
      },
      vectorSearchState: {
        queryEmbedding: [],
        vectorSearchResults: {
          semantic: [],
          categories: [],
          functionality: [],
          aliases: [],
          composites: []
        },
        searchMetrics: {},
        mergeStrategy: 'reciprocal_rank_fusion'
      },
      executionPlan: {
        semantic_understanding: {
          intent: 'unknown',
          constraints: {},
          comparisons: [],
          price_sentiment: 'neutral',
          domain: 'general',
          assumptions: [],
          confidence_level: 0,
          contextualEvidence: []
        },
        execution_plan: [],
        adaptive_routing: {
          enabled: false,
          routing_decisions: []
        }
      },
      mergedResults: {
        results: [],
        mergingStrategy: 'reciprocal_rank_fusion',
        diversityScore: 0,
        relevanceDistribution: {
          high: 0,
          medium: 0,
          low: 0
        }
      },
      performanceMetrics: {
        contextEnrichment: {
          enabled: false,
          processingTime: 0,
          cacheHitRate: 0,
          entityCount: 0
        },
        localNLP: {
          enabled: false,
          processingTime: 0,
          cacheHitRate: 0,
          modelLoadTime: 0,
          fallbackCount: 0
        },
        vectorSearch: {
          totalSearchTime: 0,
          vectorTypeMetrics: {},
          mergeTime: 0
        },
        costTracking: {
          llmCalls: 0,
          localProcessingSavings: 0,
          estimatedCostReduction: 0
        }
      },
      experimentalFeatures: {
        enabled: [],
        variants: {},
        abTestParticipation: {}
      },
      metadata: {
        ...legacyState.metadata,
        enhancementVersion: '2.0',
        featureFlags: [],
        resourceUsage: {
          peakMemory: 0,
          averageMemory: 0,
          cpuTime: 0
        },
        cacheMetrics: {
          embeddingCacheHits: 0,
          embeddingCacheMisses: 0,
          resultCacheHits: 0,
          resultCacheMisses: 0
        }
      }
    };
  }
}
```

## Service Integration Patterns

This section provides examples showing how new services should follow the existing singleton pattern used in the codebase.

### Current Singleton Pattern in the Codebase

Based on the existing codebase patterns, services follow a consistent singleton pattern:

```typescript
// Example from search-api/src/utils/state-monitor.ts
class StateMonitor {
  private static instance: StateMonitor;
  private metrics: Map<string, StateMetrics> = new Map();
  
  private constructor(config: Partial<StateMonitorConfig> = {}) {
    this.config = {
      enableMetrics: true,
      enableDetailedLogging: true,
      metricsRetentionPeriod: 24,
      logLevel: "info",
      ...config
    };
  }
  
  public static getInstance(config?: Partial<StateMonitorConfig>): StateMonitor {
    if (!StateMonitor.instance) {
      StateMonitor.instance = new StateMonitor(config);
    }
    return StateMonitor.instance;
  }
}
```

### New Services Following the Same Pattern

#### Context Enrichment Service

```typescript
// New: src/services/context-enrichment.service.ts
import { qdrantService } from "@/services/qdrant.service";
import { embeddingCache } from "@/utils/embedding-cache";

interface ContextEnrichmentConfig {
  enableMultiVectorSearch: boolean;
  maxEntityCount: number;
  similarityThreshold: number;
  enableCaching: boolean;
  cacheTTL: number;
}

class ContextEnrichmentService {
  private static instance: ContextEnrichmentService;
  private config: ContextEnrichmentConfig;
  
  private constructor(config: Partial<ContextEnrichmentConfig> = {}) {
    this.config = {
      enableMultiVectorSearch: true,
      maxEntityCount: 10,
      similarityThreshold: 0.6,
      enableCaching: true,
      cacheTTL: 3600, // 1 hour
      ...config
    };
  }
  
  public static getInstance(config?: Partial<ContextEnrichmentConfig>): ContextEnrichmentService {
    if (!ContextEnrichmentService.instance) {
      ContextEnrichmentService.instance = new ContextEnrichmentService(config);
    }
    return ContextEnrichmentService.instance;
  }
  
  async generateEntityStatistics(entity: string): Promise<any> {
    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cacheKey = `entity-stats:${entity}`;
        const cached = embeddingCache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }
      
      // Generate statistics using multi-vector search
      const statistics = await this.generateStatisticsWithMultiVector(entity);
      
      // Cache the result
      if (this.config.enableCaching) {
        const cacheKey = `entity-stats:${entity}`;
        embeddingCache.set(cacheKey, statistics);
      }
      
      return statistics;
    } catch (error) {
      console.error(`Error generating statistics for entity "${entity}":`, error);
      return this.getMinimalStatistics(entity);
    }
  }
  
  private async generateStatisticsWithMultiVector(entity: string): Promise<any> {
    if (!this.config.enableMultiVectorSearch) {
      return this.generateBasicStatistics(entity);
    }
    
    const searchResults = {
      semanticMatches: [],
      categoryMatches: [],
      functionalityMatches: [],
      aliasMatches: [],
      compositeMatches: []
    };
    
    // Parallel search across multiple vector types
    const searches = await Promise.all([
      this.searchSemanticVectors(entity),
      this.searchCategoryVectors(entity),
      this.searchFunctionalityVectors(entity),
      this.searchAliasVectors(entity),
      this.searchCompositeVectors(entity)
    ]);
    
    // Merge results with source attribution
    const mergedResults = this.mergeVectorSearchResults(searches);
    
    // Generate statistics from merged results
    return this.generateStatisticsFromResults(mergedResults, entity);
  }
  
  private async searchSemanticVectors(entity: string): Promise<any[]> {
    return await qdrantService.searchByEmbedding(
      await embeddingService.generateEmbedding(entity),
      20,
      { vector_name: 'semantic' }
    );
  }
  
  // ... other private methods
}

export const contextEnrichmentService = ContextEnrichmentService.getInstance();
```

#### Local NLP Service

```typescript
// New: src/services/local-nlp.service.ts
import { pipeline } from "@xenova/transformers";

interface LocalNLPConfig {
  models: {
    ner: string;
    zeroShot: string;
    fallback: string;
  };
  enableCaching: boolean;
  maxConcurrentRequests: number;
  modelCacheDir: string;
}

class LocalNLPService {
  private static instance: LocalNLPService;
  private config: LocalNLPConfig;
  private nerPipeline: any = null;
  private zeroShotPipeline: any = null;
  private modelLoadingPromise: Promise<void> | null = null;
  
  private constructor(config: Partial<LocalNLPConfig> = {}) {
    this.config = {
      models: {
        ner: "Xenova/bert-base-NER",
        zeroShot: "Xenova/distilbert-base-uncased",
        fallback: "Xenova/distilbert-base-uncased"
      },
      enableCaching: true,
      maxConcurrentRequests: 5,
      modelCacheDir: process.env.TRANSFORMERS_CACHE_DIR || "./models",
      ...config
    };
  }
  
  public static getInstance(config?: Partial<LocalNLPConfig>): LocalNLPService {
    if (!LocalNLPService.instance) {
      LocalNLPService.instance = new LocalNLPService(config);
    }
    return LocalNLPService.instance;
  }
  
  async initialize(): Promise<void> {
    if (this.modelLoadingPromise) {
      return this.modelLoadingPromise;
    }
    
    this.modelLoadingPromise = this.loadModels();
    return this.modelLoadingPromise;
  }
  
  private async loadModels(): Promise<void> {
    try {
      console.log("Loading NLP models...");
      
      // Load models in parallel
      const [nerPipeline, zeroShotPipeline] = await Promise.all([
        pipeline('token-classification', this.config.models.ner),
        pipeline('zero-shot-classification', this.config.models.zeroShot)
      ]);
      
      this.nerPipeline = nerPipeline;
      this.zeroShotPipeline = zeroShotPipeline;
      
      console.log("NLP models loaded successfully");
    } catch (error) {
      console.error("Failed to load NLP models:", error);
      throw error;
    }
  }
  
  async processQuery(query: string): Promise<LocalNLPResult> {
    // Ensure models are loaded
    await this.initialize();
    
    try {
      // Named Entity Recognition
      const entities = await this.extractEntities(query);
      
      // Intent Classification
      const intent = await this.classifyIntent(query);
      
      return { entities, intent, query };
    } catch (error) {
      console.error("Error processing query with local NLP:", error);
      throw error;
    }
  }
  
  private async extractEntities(query: string): Promise<Array<{text: string, type: string, confidence: number}>> {
    if (!this.nerPipeline) {
      throw new Error("NER pipeline not initialized");
    }
    
    const results = await this.nerPipeline(query);
    
    return results
      .filter(r => r.score > 0.7)
      .filter(r => !this.isStopWord(r.word))
      .map(r => ({
        text: r.word,
        type: r.entity_group || 'UNKNOWN',
        confidence: r.score
      }));
  }
  
  private async classifyIntent(query: string): Promise<{label: string, confidence: number}> {
    if (!this.zeroShotPipeline) {
      throw new Error("Zero-shot pipeline not initialized");
    }
    
    const labels = ["filter_search", "comparison_query", "discovery", "exploration"];
    const results = await this.zeroShotPipeline(query, labels);
    
    return {
      label: results.labels[0],
      confidence: results.scores[0]
    };
  }
  
  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return stopWords.includes(word.toLowerCase());
  }
}

export const localNLPService = LocalNLPService.getInstance();
```

#### Multi-Vector Search Service

```typescript
// New: src/services/multi-vector-search.service.ts
import { qdrantService } from "@/services/qdrant.service";
import { embeddingService } from "@/services/embedding.service";
import { EnhancedEmbeddingCache } from "@/utils/embedding-cache";

interface MultiVectorSearchConfig {
  enabledVectorTypes: string[];
  maxResultsPerType: number;
  mergeStrategy: 'reciprocal_rank_fusion' | 'weighted_average' | 'custom';
  enableDeduplication: boolean;
  similarityThreshold: number;
}

class MultiVectorSearchService {
  private static instance: MultiVectorSearchService;
  private config: MultiVectorSearchConfig;
  private embeddingCache: EnhancedEmbeddingCache;
  
  private constructor(config: Partial<MultiVectorSearchConfig> = {}) {
    this.config = {
      enabledVectorTypes: ['semantic', 'entities.categories', 'entities.functionality', 'entities.aliases', 'composites.toolType'],
      maxResultsPerType: 20,
      mergeStrategy: 'reciprocal_rank_fusion',
      enableDeduplication: true,
      similarityThreshold: 0.6,
      ...config
    };
    
    this.embeddingCache = new EnhancedEmbeddingCache();
  }
  
  public static getInstance(config?: Partial<MultiVectorSearchConfig>): MultiVectorSearchService {
    if (!MultiVectorSearchService.instance) {
      MultiVectorSearchService.instance = new MultiVectorSearchService(config);
    }
    return MultiVectorSearchService.instance;
  }
  
  async searchAcrossVectorTypes(query: string): Promise<MultiVectorSearchResults> {
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    
    const searchPromises = this.config.enabledVectorTypes.map(vectorType =>
      this.searchByVectorType(vectorType, queryEmbedding)
    );
    
    const searchResults = await Promise.all(searchPromises);
    
    const resultsByType: Record<string, any[]> = {};
    this.config.enabledVectorTypes.forEach((vectorType, index) => {
      resultsByType[vectorType] = searchResults[index];
    });
    
    // Merge and deduplicate results
    const mergedResults = this.mergeResults(resultsByType);
    
    return {
      queryEmbedding,
      resultsByType,
      mergedResults,
      searchMetrics: this.calculateSearchMetrics(resultsByType)
    };
  }
  
  private async searchByVectorType(vectorType: string, queryEmbedding: number[]): Promise<any[]> {
    try {
      return await qdrantService.searchByEmbedding(
        queryEmbedding,
        this.config.maxResultsPerType,
        {
          vector_name: vectorType,
          score_threshold: this.config.similarityThreshold
        }
      );
    } catch (error) {
      console.error(`Error searching vector type ${vectorType}:`, error);
      return [];
    }
  }
  
  private mergeResults(resultsByType: Record<string, any[]>): any[] {
    if (this.config.mergeStrategy === 'reciprocal_rank_fusion') {
      return this.reciprocalRankFusion(resultsByType);
    } else if (this.config.mergeStrategy === 'weighted_average') {
      return this.weightedAverageMerge(resultsByType);
    } else {
      return this.customMerge(resultsByType);
    }
  }
  
  private reciprocalRankFusion(resultsByType: Record<string, any[]>): any[] {
    const k = 60; // RRF constant
    const scoreMap: Map<string, { tool: any, score: number, sources: string[] }> = new Map();
    
    // Calculate RRF scores
    for (const [vectorType, results] of Object.entries(resultsByType)) {
      results.forEach((result, rank) => {
        const toolId = result.id || result.payload.id;
        const existing = scoreMap.get(toolId);
        
        const rrfScore = 1 / (k + rank + 1);
        
        if (existing) {
          existing.score += rrfScore;
          existing.sources.push(vectorType);
        } else {
          scoreMap.set(toolId, {
            tool: result.payload || result,
            score: rrfScore,
            sources: [vectorType]
          });
        }
      });
    }
    
    // Convert back to array and sort by score
    return Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .map(item => ({
        ...item.tool,
        _multiVectorScore: item.score,
        _vectorSources: item.sources
      }));
  }
  
  private calculateSearchMetrics(resultsByType: Record<string, any[]>): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [vectorType, results] of Object.entries(resultsByType)) {
      metrics[vectorType] = {
        resultCount: results.length,
        avgSimilarity: results.length > 0
          ? results.reduce((sum, r) => sum + r.score, 0) / results.length
          : 0
      };
    }
    
    return metrics;
  }
}

export const multiVectorSearchService = MultiVectorSearchService.getInstance();
```

### Service Registry Pattern

Following the existing pattern in the codebase, create a centralized service registry:

```typescript
// New: src/services/service-registry.ts
import { contextEnrichmentService } from "./context-enrichment.service";
import { localNLPService } from "./local-nlp.service";
import { multiVectorSearchService } from "./multi-vector-search.service";

class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, any> = new Map();
  
  private constructor() {
    // Register all services
    this.registerService('contextEnrichment', contextEnrichmentService);
    this.registerService('localNLP', localNLPService);
    this.registerService('multiVectorSearch', multiVectorSearchService);
  }
  
  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }
  
  registerService(name: string, service: any): void {
    this.services.set(name, service);
  }
  
  getService<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service "${name}" not found in registry`);
    }
    return service as T;
  }
  
  // Initialize all services
  async initializeServices(): Promise<void> {
    console.log("Initializing enhanced search services...");
    
    // Initialize services that require async setup
    await localNLPService.initialize();
    
    console.log("All enhanced search services initialized");
  }
}

export const serviceRegistry = ServiceRegistry.getInstance();
```

## Configuration Extension Approach

This section shows how to extend the existing configuration system in `search-api/src/config/` to support the new AI Search Enhancement features.

### Current Configuration Pattern

Based on the existing codebase pattern, configuration follows this structure:

```typescript
// From search-api/src/config/constants.ts (existing pattern)
export const confidenceThresholds = {
  high: 0.8,
  medium: 0.5,
  low: 0.3,
};

export const qualityThresholds = {
  minResults: 3,
  maxResults: 20,
  minRelevance: 0.6,
  minCategoryDiversity: 0.3,
};

export const embeddingConfig = {
  dimensions: 384,
  batchSize: 10,
  cacheEnabled: process.env.ENABLE_CACHE === "true",
  cacheTTL: parseInt(process.env.CACHE_TTL || "3600"), // seconds
};
```

### Extended Configuration for AI Search Enhancement

```typescript
// Enhanced: src/config/enhanced-search-config.ts

// NEW: Context Enrichment Configuration
export const contextEnrichmentConfig = {
  enabled: process.env.ENABLE_CONTEXT_ENRICHMENT !== "false",
  strategy: process.env.CONTEXT_ENRICHMENT_STRATEGY || "qdrant_multi_vector", // "qdrant_multi_vector" | "mongodb_aggregation" | "hybrid"
  maxEntityCount: parseInt(process.env.MAX_ENTITY_COUNT || "10"),
  similarityThreshold: parseFloat(process.env.ENTITY_SIMILARITY_THRESHOLD || "0.6"),
  minSampleSize: parseInt(process.env.MIN_ENTITY_SAMPLE_SIZE || "5"),
  maxSampleSize: parseInt(process.env.MAX_ENTITY_SAMPLE_SIZE || "100"),
  enableCaching: process.env.ENABLE_CONTEXT_CACHE !== "false",
  cacheTTL: parseInt(process.env.CONTEXT_CACHE_TTL || "3600"), // seconds
};

// NEW: Multi-Vector Search Configuration
export const multiVectorSearchConfig = {
  enabledVectorTypes: (process.env.ENABLED_VECTOR_TYPES || "semantic,entities.categories,entities.functionality,entities.aliases,composites.toolType").split(","),
  maxResultsPerType: parseInt(process.env.MAX_RESULTS_PER_VECTOR_TYPE || "20"),
  mergeStrategy: process.env.VECTOR_MERGE_STRATEGY || "reciprocal_rank_fusion", // "reciprocal_rank_fusion" | "weighted_average" | "custom"
  enableDeduplication: process.env.ENABLE_VECTOR_DEDUPLICATION !== "false",
  similarityThreshold: parseFloat(process.env.VECTOR_SIMILARITY_THRESHOLD || "0.6"),
  parallelSearch: process.env.ENABLE_PARALLEL_VECTOR_SEARCH !== "false",
  searchTimeout: parseInt(process.env.VECTOR_SEARCH_TIMEOUT || "5000"), // ms
};

// NEW: Local NLP Configuration
export const localNLPConfig = {
  enabled: process.env.ENABLE_LOCAL_NLP !== "false",
  models: {
    ner: process.env.NER_MODEL || "Xenova/bert-base-NER",
    zeroShot: process.env.ZERO_SHOT_MODEL || "Xenova/distilbert-base-uncased",
    fallback: process.env.NLP_FALLBACK_MODEL || "Xenova/distilbert-base-uncased"
  },
  modelCacheDir: process.env.TRANSFORMERS_CACHE_DIR || "./models",
  enableOfflineMode: process.env.TRANSFORMERS_OFFLINE === "true",
  enableLocalFilesOnly: process.env.TRANSFORMERS_LOCAL_FILES_ONLY === "true",
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_NLP_REQUESTS || "5"),
  requestTimeout: parseInt(process.env.NLP_REQUEST_TIMEOUT || "10000"), // ms
  fallbackToLLM: process.env.NLP_FALLBACK_TO_LLM !== "false",
  confidenceThreshold: parseFloat(process.env.NLP_CONFIDENCE_THRESHOLD || "0.7"),
};

// NEW: Enhanced Performance Configuration
export const performanceConfig = {
  enableAdvancedCaching: process.env.ENABLE_ADVANCED_CACHING !== "false",
  cacheStrategy: process.env.CACHE_STRATEGY || "adaptive", // "adaptive" | "static" | "ml_based"
  defaultCacheTTL: parseInt(process.env.DEFAULT_CACHE_TTL || "3600"), // seconds
  maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE || "10000"), // entries
  enablePreloading: process.env.ENABLE_CACHE_PRELOADING !== "false",
  preloadCacheKeys: (process.env.PRELOAD_CACHE_KEYS || "").split(","),
  enableCompression: process.env.ENABLE_CACHE_COMPRESSION !== "false",
};

// NEW: A/B Testing Configuration
export const abTestingConfig = {
  enabled: process.env.ENABLE_AB_TESTING === "true",
  configPath: process.env.EXPERIMENT_CONFIG_PATH || "./config/experiments.json",
  defaultVariant: process.env.DEFAULT_EXPERIMENT_VARIANT || "control",
  enableMetricsCollection: process.env.ENABLE_EXPERIMENT_METRICS !== "false",
  metricsRetentionDays: parseInt(process.env.EXPERIMENT_METRICS_RETENTION_DAYS || "30"),
};

// NEW: Enhanced Monitoring Configuration
export const monitoringConfig = {
  enableEnhancedMetrics: process.env.ENABLE_ENHANCED_METRICS !== "false",
  metricsCollectionInterval: parseInt(process.env.METRICS_COLLECTION_INTERVAL || "60000"), // ms
  enablePerformanceProfiling: process.env.ENABLE_PERFORMANCE_PROFILING === "true",
  enableResourceTracking: process.env.ENABLE_RESOURCE_TRACKING !== "false",
  enableCostTracking: process.env.ENABLE_COST_TRACKING !== "false",
  alertThresholds: {
    responseTime: parseInt(process.env.ALERT_RESPONSE_TIME_THRESHOLD || "3000"), // ms
    errorRate: parseFloat(process.env.ALERT_ERROR_RATE_THRESHOLD || "0.05"),
    cacheHitRate: parseFloat(process.env.ALERT_CACHE_HIT_RATE_THRESHOLD || "0.7"),
    costIncrease: parseFloat(process.env.ALERT_COST_INCREASE_THRESHOLD || "0.3"),
  }
};
```

### Enhanced Models Configuration

```typescript
// Enhanced: src/config/models.ts

// Existing configuration preserved
export const modelConfigs = {
  // ... existing model configs
};

// NEW: Enhanced model configurations for AI Search Enhancement
export const enhancedModelConfigs = {
  // Context Enrichment LLM Model
  contextEnrichment: {
    provider: process.env.CONTEXT_ENRICHMENT_PROVIDER || "ollama",
    model: process.env.CONTEXT_ENRICHMENT_MODEL || "llama3.1:8b",
    options: {
      temperature: parseFloat(process.env.CONTEXT_ENRICHMENT_TEMPERATURE || "0.3"),
      topP: parseFloat(process.env.CONTEXT_ENRICHMENT_TOP_P || "0.9"),
      maxTokens: parseInt(process.env.CONTEXT_ENRICHMENT_MAX_TOKENS || "1024"),
    }
  },
  
  // Query Planning LLM Model
  queryPlanning: {
    provider: process.env.QUERY_PLANNING_PROVIDER || "ollama",
    model: process.env.QUERY_PLANNING_MODEL || "llama3.1:8b",
    options: {
      temperature: parseFloat(process.env.QUERY_PLANNING_TEMPERATURE || "0.2"),
      topP: parseFloat(process.env.QUERY_PLANNING_TOP_P || "0.95"),
      maxTokens: parseInt(process.env.QUERY_PLANNING_MAX_TOKENS || "2048"),
    }
  },
  
  // Result Merging LLM Model
  resultMerging: {
    provider: process.env.RESULT_MERGING_PROVIDER || "ollama",
    model: process.env.RESULT_MERGING_MODEL || "llama3.1:8b",
    options: {
      temperature: parseFloat(process.env.RESULT_MERGING_TEMPERATURE || "0.1"),
      topP: parseFloat(process.env.RESULT_MERGING_TOP_P || "0.9"),
      maxTokens: parseInt(process.env.RESULT_MERGING_MAX_TOKENS || "1024"),
    }
  },
  
  // Fallback LLM Model (used when local NLP fails)
  fallbackNLP: {
    provider: process.env.FALLBACK_NLP_PROVIDER || "ollama",
    model: process.env.FALLBACK_NLP_MODEL || "llama3.1:8b",
    options: {
      temperature: parseFloat(process.env.FALLBACK_NLP_TEMPERATURE || "0.1"),
      topP: parseFloat(process.env.FALLBACK_NLP_TOP_P || "0.8"),
      maxTokens: parseInt(process.env.FALLBACK_NLP_MAX_TOKENS || "512"),
    }
  }
};
```

### Experiment Configuration

```typescript
// New: src/config/experiments.json
{
  "experiments": [
    {
      "name": "enhanced-search-v2",
      "description": "Compare enhanced search architecture with original",
      "enabled": true,
      "variants": [
        {
          "name": "control",
          "description": "Original search architecture",
          "config": {
            "useEnhancedPipeline": false,
            "enableLocalNLP": false,
            "enableContextEnrichment": false,
            "mergingStrategy": "simple"
          },
          "weight": 0.5,
          "features": []
        },
        {
          "name": "treatment",
          "description": "Enhanced search architecture with all features",
          "config": {
            "useEnhancedPipeline": true,
            "enableLocalNLP": true,
            "enableContextEnrichment": true,
            "mergingStrategy": "reciprocal_rank_fusion"
          },
          "weight": 0.5,
          "features": [
            "local-nlp-processing",
            "context-enrichment",
            "multi-vector-search",
            "result-merging"
          ]
        }
      ],
      "metrics": [
        "search_relevance_score",
        "response_time_ms",
        "user_click_through_rate",
        "cost_per_query",
        "cache_hit_rate"
      ],
      "targeting": {
        "userPercentage": 100,
        "excludeUserIds": [],
        "includeUserIds": []
      }
    },
    {
      "name": "context-enrichment-strategies",
      "description": "Test different context enrichment strategies",
      "enabled": false,
      "variants": [
        {
          "name": "qdrant-multi-vector",
          "description": "Multi-vector search with Qdrant",
          "config": {
            "contextEnrichmentStrategy": "qdrant_multi_vector"
          },
          "weight": 0.4,
          "features": ["multi-vector-search"]
        },
        {
          "name": "mongodb-aggregation",
          "description": "MongoDB aggregation for statistics",
          "config": {
            "contextEnrichmentStrategy": "mongodb_aggregation"
          },
          "weight": 0.3,
          "features": ["mongodb-statistics"]
        },
        {
          "name": "hybrid",
          "description": "Hybrid approach combining both",
          "config": {
            "contextEnrichmentStrategy": "hybrid"
          },
          "weight": 0.3,
          "features": ["hybrid-enrichment"]
        }
      ],
      "metrics": [
        "context_quality_score",
        "entity_statistics_accuracy",
        "context_generation_time"
      ]
    }
  ]
}
```

### Configuration Validation

```typescript
// New: src/config/config-validator.ts
import {
  contextEnrichmentConfig,
  multiVectorSearchConfig,
  localNLPConfig,
  performanceConfig,
  abTestingConfig,
  monitoringConfig
} from "./enhanced-search-config";

export class ConfigValidator {
  static validateEnhancedSearchConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate context enrichment config
    if (contextEnrichmentConfig.enabled) {
      if (contextEnrichmentConfig.maxEntityCount <= 0) {
        errors.push("MAX_ENTITY_COUNT must be greater than 0");
      }
      
      if (contextEnrichmentConfig.similarityThreshold < 0 || contextEnrichmentConfig.similarityThreshold > 1) {
        errors.push("ENTITY_SIMILARITY_THRESHOLD must be between 0 and 1");
      }
      
      if (contextEnrichmentConfig.minSampleSize < 1) {
        errors.push("MIN_ENTITY_SAMPLE_SIZE must be at least 1");
      }
    }
    
    // Validate multi-vector search config
    if (multiVectorSearchConfig.enabledVectorTypes.length === 0) {
      errors.push("At least one vector type must be enabled");
    }
    
    if (multiVectorSearchConfig.maxResultsPerType <= 0) {
      errors.push("MAX_RESULTS_PER_VECTOR_TYPE must be greater than 0");
    }
    
    // Validate local NLP config
    if (localNLPConfig.enabled) {
      if (!localNLPConfig.models.ner || !localNLPConfig.models.zeroShot) {
        errors.push("Both NER and zero-shot models must be specified");
      }
      
      if (localNLPConfig.maxConcurrentRequests <= 0) {
        errors.push("MAX_CONCURRENT_NLP_REQUESTS must be greater than 0");
      }
      
      if (localNLPConfig.confidenceThreshold < 0 || localNLPConfig.confidenceThreshold > 1) {
        errors.push("NLP_CONFIDENCE_THRESHOLD must be between 0 and 1");
      }
    }
    
    // Validate performance config
    if (performanceConfig.defaultCacheTTL <= 0) {
      errors.push("DEFAULT_CACHE_TTL must be greater than 0");
    }
    
    if (performanceConfig.maxCacheSize <= 0) {
      errors.push("MAX_CACHE_SIZE must be greater than 0");
    }
    
    // Validate monitoring config
    if (monitoringConfig.alertThresholds.responseTime <= 0) {
      errors.push("ALERT_RESPONSE_TIME_THRESHOLD must be greater than 0");
    }
    
    if (monitoringConfig.alertThresholds.errorRate < 0 || monitoringConfig.alertThresholds.errorRate > 1) {
      errors.push("ALERT_ERROR_RATE_THRESHOLD must be between 0 and 1");
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  static validateOnStartup(): void {
    const validation = this.validateEnhancedSearchConfig();
    
    if (!validation.valid) {
      console.error("Configuration validation failed:");
      validation.errors.forEach(error => console.error(`  - ${error}`));
      throw new Error("Invalid configuration. See errors above.");
    }
    
    console.log("Configuration validation passed");
  }
}
```

### Configuration Integration with Existing System

```typescript
// Enhanced: src/config/index.ts

// Export existing configurations
export * from './constants';
export * from './models';

// Export new enhanced configurations
export * from './enhanced-search-config';
export { ConfigValidator } from './config-validator';

// Configuration initialization function
export async function initializeConfiguration(): Promise<void> {
  console.log("Initializing enhanced search configuration...");
  
  // Validate configuration
  ConfigValidator.validateOnStartup();
  
  // Initialize experiment configuration if A/B testing is enabled
  if (abTestingConfig.enabled) {
    await loadExperimentConfig(abTestingConfig.configPath);
  }
  
  console.log("Configuration initialization complete");
}

// Helper function to load experiment configuration
async function loadExperimentConfig(configPath: string): Promise<void> {
  try {
    // Load experiment configuration from file
    // Implementation depends on your preferred approach
    console.log(`Loading experiment configuration from ${configPath}`);
  } catch (error) {
    console.error("Failed to load experiment configuration:", error);
    throw error;
  }
}
```

### Note: MongoDB Statistics Approach Replaced

The original MongoDB aggregation approach for context enrichment has been **completely replaced** by the enhanced Qdrant multi-vector strategy described above. MongoDB is still used for:
- Structured queries with exact filters (pricing, interface, categories)
- Tool metadata storage and retrieval
- Primary search database operations

But **context enrichment** now exclusively uses **Qdrant multi-vector search** for superior coverage and relevance.

---

## Implementation Phases

### Phase 1: Context Enrichment Foundation (Week 1-2)
**Priority**: High - Grounds all subsequent improvements

**Tasks**:
1. **Enhance State Schema** (`state.ts`)
   - Add `entityStatistics` and `metadataContext` fields
   - Update type definitions
   - Ensure backward compatibility

2. **Create MongoDB Statistics Service**
   - `context-enrichment.service.ts` - Query MongoDB for entity statistics
   - Pre-compute common statistics for performance
   - Implement caching strategy

3. **Build Context Enrichment Node**
   - `context-enrichment.node.ts` - Bridge between extraction and planning
   - Integrate with existing intent extraction pipeline
   - Add error handling and fallbacks

4. **Update Main Graph Flow**
   - Insert context enrichment between intent extraction and planning
   - Update state validation rules
   - Add checkpoint support

**Success Criteria**:
- Context enrichment adds <200ms latency
- 95% of queries get statistical context
- Fallback to skip stage if MongoDB is unavailable

### Phase 2: transformers.js NLP Integration (Week 3-4)
**Priority**: High - Reduces costs and improves performance

**Tasks**:
1. **Setup transformers.js Infrastructure**
   - Install dependencies: `@xenova/transformers`, `onnxruntime-node`
   - Model management: Download, cache, lazy loading
   - Performance monitoring

2. **Create NLP Service Layer**
   - `local-nlp.service.ts` - Unified interface for local NLP processing
   - `ner-extractor.service.ts` - Named entity recognition
   - `zero-shot-classifier.service.ts` - Zero-shot classification
   - Error handling with LLM fallback

3. **Implement Local NLP Nodes**
   - Replace LLM-based NER with local processing
   - Add zero-shot classifiers for vocabulary
   - Maintain LLM fallback for low-confidence results

4. **Performance Optimization**
   - Model pre-loading on server start
   - Batch processing for multiple entities
   - Memory management for models

**Success Criteria**:
- 70% of NLP queries processed locally
- <100ms local processing time
- 50% reduction in LLM API costs
- 95% accuracy compared to LLM baseline

### Phase 3: Dynamic Execution Planning (Week 5-6)
**Priority**: Medium - Enables adaptive query processing

**Tasks**:
1. **Enhance Planning Node**
   - Update `query-planning.node.ts` to use context
   - Generate execution plans based on query type
   - Add optional/conditional stages

2. **Create Execution Router**
   - `conditional-executor.node.ts` - Dynamic stage execution
   - Conditional path selection
   - Skip unnecessary stages for simple queries

3. **Update LangGraph Structure**
   - Make graph execution dynamic
   - Add conditional edges
   - Implement stage skipping logic

4. **Add Plan Validation**
   - Validate execution plans before execution
   - Add safety checks for infinite loops
   - Fallback to basic path for invalid plans

**Success Criteria**:
- Simple queries skip 60% of stages
- Complex queries get appropriate additional processing
- No increase in system complexity for basic queries
- Graceful degradation for plan failures

### Phase 4: Advanced Result Merging & A/B Testing (Week 7-8)
**Priority**: Medium - Improves result quality and enables experimentation

**Tasks**:
1. **Implement Reciprocal Rank Fusion**
   - `result-merger.service.ts` - RRF algorithm implementation
   - Source-specific weighting based on query type
   - Score normalization and combination

2. **Enhanced Result Processing**
   - Duplicate detection across sources
   - Result diversity promotion
   - Re-ranking based on query intent

3. **Add A/B Testing Framework**
   - `ab-testing.service.ts` - Experiment management
   - Configure search architecture experiments
   - Implement metrics collection

4. **Update Completion Node**
   - Use merged results instead of raw results
   - Add result explanations
   - Include source attribution

**Success Criteria**:
- 30% improvement in result relevance
- Better handling of duplicate results
- Clear attribution of result sources
- A/B testing framework operational

### Phase 5: Production Readiness (Week 9-10)
**Priority**: High - Ensure production readiness

**Tasks**:
1. **Performance Optimization**
   - Implement intelligent caching for all stages
   - Optimize database queries with aggregation pipelines
   - Memory usage monitoring
   - Response time optimization

2. **Comprehensive Testing**
   - Unit tests for all new components
   - Integration tests for complete flows
   - Performance benchmarking
   - Load testing with realistic queries

3. **Monitoring & Observability**
   - Detailed logging for each stage
   - Performance metrics collection via `search-analytics.service.ts`
   - Error tracking and alerting
   - Real-time dashboard implementation

4. **Documentation & Deployment**
   - Update API documentation with new endpoints
   - Create deployment guides with environment variables
   - Add monitoring dashboards
   - Rollback procedures and feature flags

**Success Criteria**:
- <500ms response time for simple queries
- <2s response time for complex queries
- 99.9% uptime with error handling
- Complete observability and monitoring
- A/B testing showing positive results

---

## Risk Assessment & Mitigation

### High-Risk Areas

1. **Performance Degradation**
   - **Risk**: Additional stages increase latency
   - **Mitigation**: Local NLP processing, intelligent caching, stage skipping
   - **Monitoring**: Response time alerts, stage-wise timing

2. **Model Management Complexity**
   - **Risk**: transformers.js models increase memory usage
   - **Mitigation**: Lazy loading, model sharing, memory monitoring
   - **Fallback**: LLM processing if models fail to load

3. **Plan Execution Failures**
   - **Risk**: Dynamic execution paths may create bugs
   - **Mitigation**: Plan validation, safe defaults, comprehensive testing
   - **Fallback**: Basic search path for all queries

### Medium-Risk Areas

1. **Entity Statistics Accuracy**
   - **Risk**: Stale statistics may mislead the LLM
   - **Mitigation**: Background refresh jobs, confidence scoring
   - **Fallback**: Ignore statistics if confidence is low

2. **Result Merging Quality**
   - **Risk**: RRF may not perform well for all query types
   - **Mitigation**: Query-type specific weighting, A/B testing
   - **Fallback**: Simple concatenation for edge cases

### Low-Risk Areas

1. **State Schema Changes**
   - **Risk**: Breaking existing functionality
   - **Mitigation**: Backward compatibility, gradual migration
   - **Rollback**: Keep original schema as fallback

---

## Success Metrics & Measurement

### Primary Metrics
1. **Search Relevance**: +40-60% improvement (measured by user feedback/A-B testing)
2. **Response Time**: <500ms simple, <2s complex queries
3. **Cost Reduction**: 50-70% reduction in LLM API costs
4. **System Reliability**: 99.9% uptime with graceful degradation

### Secondary Metrics
1. **Query Disambiguation Success**: 85% of ambiguous queries resolved correctly
2. **Local NLP Processing Rate**: 70% of NLP tasks processed locally
3. **Cache Hit Rate**: >80% for repeated queries/statistics
4. **Stage Skipping Efficiency**: 60% of stages skipped for simple queries

### Measurement Strategy
1. **A/B Testing**: Compare old vs new architecture
2. **User Feedback**: Rating system for search results
3. **Performance Monitoring**: Real-time dashboards
4. **Cost Tracking**: API usage and local processing metrics

---

## Enhanced API Design

### New API Endpoints
```typescript
// Enhanced search with execution plan visibility
POST /api/search/enhanced
{
  "query": string,
  "options": {
    "enableLocalNLP": boolean,
    "enableContextEnrichment": boolean,
    "mergingStrategy": "auto" | "rrfusion" | "learned",
    "experimentVariant"?: string
  }
}

// Search analytics
GET /api/search/analytics
GET /api/search/performance-metrics
POST /api/search/feedback

// Health checks with component status
GET /api/search/health
{
  "status": "healthy",
  "components": {
    "transformers": "loaded",
    "mongodb": "connected",
    "qdrant": "connected",
    "cache": "operational"
  }
}
```

### A/B Testing Framework
```typescript
// New: src/services/ab-testing.service.ts
interface ExperimentConfig {
  name: string;
  variants: Array<{
    name: string;
    config: Record<string, any>;
    weight: number;
  }>;
  metrics: string[];
}

class ABTestingService {
  async getExperimentVariant(userId: string, experimentName: string): Promise<string> {
    // Consistent assignment based on user ID
    const assignment = await this.getAssignment(userId, experimentName);
    return assignment.variant;
  }

  async trackExperimentMetric(
    userId: string,
    experimentName: string,
    metric: string,
    value: number
  ): Promise<void> {
    await this.recordMetric(userId, experimentName, metric, value);
  }

  // Experiment: Enhanced vs Original Search
  async configureSearchExperiment(): Promise<ExperimentConfig> {
    return {
      name: "enhanced-search-v2",
      variants: [
        {
          name: "control",
          config: { useEnhancedPipeline: false },
          weight: 0.5
        },
        {
          name: "treatment",
          config: {
            useEnhancedPipeline: true,
            enableLocalNLP: true,
            enableContextEnrichment: true,
            mergingStrategy: "rrfusion"
          },
          weight: 0.5
        }
      ],
      metrics: [
        "search_relevance_score",
        "response_time_ms",
        "user_click_through_rate",
        "cost_per_query"
      ]
    };
  }
}
```

### Performance Monitoring Service
```typescript
// New: src/services/search-analytics.service.ts
interface SearchMetrics {
  queryId: string;
  executionTime: number;
  stagesExecuted: string[];
  resultCount: number;
  userSatisfaction?: number;
  cacheHitRate: number;
  localNLPUsageRate: number;
}

class SearchAnalyticsService {
  async trackSearchExecution(metrics: SearchMetrics): Promise<void> {
    // Store metrics for analysis
    await this.storeMetrics(metrics);

    // Update performance baselines
    await this.updatePerformanceBaselines(metrics);

    // Trigger alerts if performance degrades
    await this.checkPerformanceThresholds(metrics);
  }

  async generateInsights(): Promise<SearchInsights> {
    // Analyze query patterns
    const queryPatterns = await this.analyzeQueryPatterns();

    // Identify optimization opportunities
    const optimizations = await this.identifyOptimizations();

    return { queryPatterns, optimizations };
  }

  // Real-time performance dashboard data
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return {
      totalQueries: await this.getTotalQueries(),
      averageResponseTime: await this.getAverageResponseTime(),
      localNLPUsageRate: await this.getLocalNLPUsageRate(),
      cacheHitRate: await this.getCacheHitRate(),
      errorRate: await this.getErrorRate(),
      costSavings: await this.getCostSavings()
    };
  }
}
```

### Intelligent Caching Layer
```typescript
// New: src/services/intelligent-cache.service.ts
interface CachedResult {
  results: SearchResult[];
  metadata: {
    executionPlan: ExecutionPlan;
    entityStatistics: EntityStatistics;
    timestamp: number;
    ttl: number;
  };
}

class IntelligentCacheService {
  async getCachedResults(querySignature: string): Promise<CachedResult | null> {
    // Check for exact matches
    const exactMatch = await this.getExactMatch(querySignature);
    if (exactMatch) return exactMatch;

    // Check for semantic similarity using embeddings
    const similarQueries = await this.findSimilarQueries(querySignature);
    if (similarQueries.length > 0) {
      return this.adaptCachedResults(similarQueries[0], querySignature);
    }

    return null;
  }

  async cacheResults(
    querySignature: string,
    results: SearchResult[],
    metadata: any
  ): Promise<void> {
    // Store with TTL based on query complexity and result stability
    const ttl = this.calculateTTL(metadata);
    await this.store(querySignature, { results, metadata, timestamp: Date.now() }, ttl);
  }

  private calculateTTL(metadata: any): number {
    // Complex queries with entity statistics get longer TTL
    // Simple queries get shorter TTL for freshness
    const baseTTL = 3600; // 1 hour
    const complexityMultiplier = metadata.executionPlan?.stages?.length || 1;
    return Math.min(baseTTL * complexityMultiplier, 86400); // Max 24 hours
  }
}
```

---

## Deployment Strategy

### Phase-wise Rollout
1. **Phase 1-2**: Shadow mode - Run in parallel without affecting results
2. **Phase 3**: Gradual traffic increase (10% → 50% → 100%)
3. **Phase 4-5**: Full deployment with monitoring

### Rollback Procedures
1. **Immediate Rollback**: Switch to previous graph version
2. **Stage-level Rollback**: Disable specific problematic stages
3. **Feature Flags**: Toggle individual enhancements

### Monitoring & Alerting
1. **Performance Alerts**: Response time >3s, error rate >5%
2. **Quality Alerts**: Search relevance drops >20%
3. **Cost Alerts**: LLM usage increases >30%

---

## Conclusion

This enhanced AI search architecture represents a significant evolution of the current system, providing:

1. **Intelligent Query Understanding**: Context-aware processing that handles ambiguity
2. **Cost-Effective Operations**: Local NLP processing with intelligent LLM usage
3. **Adaptive Execution**: Dynamic paths based on query complexity
4. **Superior Results**: Advanced merging techniques for better relevance

The 5-week implementation timeline is realistic with manageable risk, building on the existing strong foundation while delivering substantial improvements in search quality and user experience.

**Next Steps**:
1. Review and approve this comprehensive plan
2. Set up development environment for Phase 1
3. Begin implementation with Context Enrichment Layer
4. Establish success metrics and monitoring baseline
