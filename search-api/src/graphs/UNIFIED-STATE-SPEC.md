# Unified State Annotation Technical Specification

## Overview

This document provides the detailed technical specification for the `UnifiedStateAnnotation` that will serve as the single source of truth for the consolidated search graph architecture.

## Design Principles

1. **Comprehensive Integration**: Combines the best features from both `StateAnnotation` and `EnhancedStateAnnotation`
2. **Performance Optimized**: Implements lazy loading, compression, and memory optimization
3. **Type Safety**: Full TypeScript support with strict typing
4. **Backward Compatible**: Supports migration from existing state schemas
5. **Observable**: Comprehensive metadata for debugging and monitoring

## Core State Schema

```typescript
import { Annotation, StateGraph } from "@langchain/langgraph";

/**
 * Core query and user information
 */
interface QueryMetadata {
  originalQuery: string;
  processedQuery?: string;
  queryId: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  context?: Record<string, any>;
}

/**
 * Unified signals from all extraction methods
 */
interface UnifiedExtractionSignals {
  // NER and Entity Extraction
  nerResults?: Array<{
    text: string;
    label: string;
    confidence: number;
    start: number;
    end: number;
  }>;

  // Tool Name Resolution
  resolvedToolNames?: Array<{
    name: string;
    confidence: number;
    source: string;
    metadata?: Record<string, any>;
  }>;

  // Fuzzy Matches
  fuzzyMatches?: Array<{
    match: string;
    original: string;
    score: number;
    threshold: number;
  }>;

  // Semantic Analysis
  semanticSignals?: {
    classifications?: Array<{ category: string; confidence: number }>;
    embeddings?: number[];
    semanticScore?: number;
  };

  // Comparative Analysis
  comparativeSignals?: {
    isComparative: boolean;
    comparisonType?: string;
    entities?: Array<{ role: string; value: string }>;
  };

  // Attribute Detection
  attributeSignals?: {
    priceRange?: { min?: number; max?: number; currency?: string };
    interfaces?: string[];
    deploymentTypes?: string[];
    features?: string[];
  };

  // Reference Extraction
  referenceSignals?: {
    hasReferences: boolean;
    references?: Array<{ type: string; value: string; context: string }>;
  };
}

/**
 * Intent understanding and confidence metrics
 */
interface IntentAnalysis {
  primaryIntent: string;
  secondaryIntents?: string[];
  confidence: {
    overall: number;
    intent: number;
    entities: number;
    semantic: number;
    contextual: number;
  };
  intentType: 'search' | 'comparison' | 'recommendation' | 'information' | 'other';
  complexity: 'simple' | 'moderate' | 'complex';
  requiresContext: boolean;
  searchStrategy: 'vector' | 'hybrid' | 'traditional' | 'multi-vector';
}

/**
 * Context enrichment results
 */
interface ContextEnrichment {
  enriched: boolean;
  entities?: Array<{
    name: string;
    type: string;
    description?: string;
    attributes?: Record<string, any>;
    relationships?: Array<{ type: string; target: string }>;
  }>;
  contextVector?: number[];
  enrichmentSources: string[];
  enrichmentTime: number;
  quality: number;
}

/**
 * Advanced query planning with multiple strategies
 */
interface QueryPlanning {
  chosenStrategy: 'optimal' | 'multi-strategy' | 'fallback';
  plans: Array<{
    id: string;
    strategy: string;
    queries: string[];
    weights?: number[];
    filters?: Record<string, any>;
    expectedResults: number;
  }>;
  validationResults?: Array<{
    planId: string;
    valid: boolean;
    issues?: string[];
    score: number;
  }>;
  estimatedExecutionTime: number;
  confidence: number;
}

/**
 * Multi-vector search execution
 */
interface SearchExecution {
  executionStrategy: 'multi-vector' | 'traditional' | 'hybrid';
  queries: Array<{
    query: string;
    vector?: number[];
    weight: number;
    type: 'semantic' | 'keyword' | 'hybrid';
  }>;
  results: Array<{
    query: string;
    results: any[];
    executionTime: number;
    resultCount: number;
    quality: number;
  }>;
  totalExecutionTime: number;
  totalResults: number;
  qualityMetrics: {
    relevanceScore: number;
    diversityScore: number;
    freshnessScore: number;
  };
}

/**
 * Intelligent result processing and merging
 */
interface ResultProcessing {
  mergingStrategy: 'reciprocal-rank-fusion' | 'weighted-average' | 'hybrid';
  mergedResults: Array<{
    id: string;
    title: string;
    description?: string;
    url?: string;
    score: number;
    sources: string[];
    rank: number;
    metadata?: Record<string, any>;
  }>;
  deduplicationStats: {
    originalCount: number;
    finalCount: number;
    duplicatesRemoved: number;
  };
  qualityAssessment: {
    averageRelevance: number;
    resultDiversity: number;
    confidence: number;
  };
  processingTime: number;
}

/**
 * Final completion and optimization
 */
interface IntelligentCompletion {
  completed: boolean;
  optimizedResults: any[];
  personalization?: {
    userProfileApplied: boolean;
    preferences: Record<string, any>;
    adaptations: string[];
  };
  performance: {
    totalTime: number;
    bottleneck?: string;
    optimizations: string[];
  };
  quality: {
    overallScore: number;
    userSatisfactionPrediction: number;
    improvementSuggestions: string[];
  };
  metadata: {
    nodesExecuted: string[];
    decisions: Array<{ step: string; decision: string; reasoning: string }>;
    errors?: Array<{ node: string; error: string; recovered: boolean }>;
  };
}

/**
 * Comprehensive metadata for observability
 */
interface UnifiedMetadata {
  // Version tracking
  stateVersion: string;
  graphVersion: string;

  // Performance tracking
  performance: {
    nodeTimings: Record<string, number>;
    totalExecutionTime: number;
    memoryUsage: number;
    cacheHitRate: number;
  };

  // Configuration used
  configuration: {
    profile: 'basic' | 'advanced' | 'expert';
    overrides: Record<string, any>;
    features: Record<string, boolean>;
  };

  // Debugging information
  debug: {
    nodeId: string;
    executionPath: string[];
    checkpoints: Array<{ node: string; timestamp: number; state: any }>;
    logs: Array<{ timestamp: number; level: string; message: string; node?: string }>;
  };

  // Migration tracking
  migration?: {
    fromGraph: string;
    fromStateVersion: string;
    migrationDate: number;
    compatibilityMode: boolean;
  };
}

/**
 * Main unified state annotation combining all features
 */
interface UnifiedStateAnnotation {
  // Core query information
  query: QueryMetadata;

  // Processing stages (lazy loaded as needed)
  signals?: UnifiedExtractionSignals;
  intent?: IntentAnalysis;
  context?: ContextEnrichment;
  planning?: QueryPlanning;
  execution?: SearchExecution;
  results?: ResultProcessing;
  completion?: IntelligentCompletion;

  // Error handling and recovery
  errors?: Array<{
    node: string;
    error: string;
    timestamp: number;
    recovered: boolean;
    recoveryStrategy?: string;
  }>;

  // Comprehensive metadata
  metadata: UnifiedMetadata;

  // Optimization hints
  optimizationHints?: {
    useCache: boolean;
    skipStages: string[];
    preferStrategies: string[];
    resourceLimits: Record<string, number>;
  };
}
```

## State Optimization Features

### 1. Lazy Loading Implementation

```typescript
class LazyStateField<T> {
  private _value: T | undefined;
  private _loaded: boolean = false;
  private _loader: () => Promise<T> | T;

  constructor(loader: () => Promise<T> | T) {
    this._loader = loader;
  }

  async get(): Promise<T> {
    if (!this._loaded) {
      this._value = await this._loader();
      this._loaded = true;
    }
    return this._value!;
  }

  isLoaded(): boolean {
    return this._loaded;
  }

  reset(): void {
    this._value = undefined;
    this._loaded = false;
  }
}

// Usage in state creation
function createOptimizedState(baseState: Partial<UnifiedStateAnnotation>): UnifiedStateAnnotation {
  return {
    ...baseState,
    signals: new LazyStateField(() => loadExtractionSignals(baseState.query)),
    intent: new LazyStateField(() => deriveIntent(baseState.signals)),
    // ... other lazy fields
  };
}
```

### 2. State Compression

```typescript
interface StateCompressionOptions {
  enableSparseStructures: boolean;
  useTypedArrays: boolean;
  compactSerialization: boolean;
  compressionLevel: number; // 0-9
}

class StateCompressor {
  static compress(state: UnifiedStateAnnotation, options: StateCompressionOptions): Buffer {
    // Implementation for compressing state to reduce memory footprint
  }

  static decompress(data: Buffer, options: StateCompressionOptions): UnifiedStateAnnotation {
    // Implementation for decompressing state
  }
}
```

### 3. Memory Management

```typescript
interface MemoryLimits {
  maxStateSize: number; // bytes
  maxFieldSize: number; // bytes
  gcThreshold: number; // percentage of max
}

class MemoryManager {
  private static limits: MemoryLimits = {
    maxStateSize: 10 * 1024 * 1024, // 10MB
    maxFieldSize: 1024 * 1024, // 1MB
    gcThreshold: 0.8
  };

  static checkMemoryUsage(state: UnifiedStateAnnotation): {
    withinLimits: boolean;
    recommendations: string[];
    urgent: boolean;
  } {
    // Implementation for memory usage checking
  }

  static optimizeMemory(state: UnifiedStateAnnotation): UnifiedStateAnnotation {
    // Implementation for memory optimization
  }
}
```

## Migration Strategy

### Phase 1: Backward Compatibility

```typescript
// Migration adapters for existing state types
interface StateMigrationAdapter {
  fromMainGraph(state: StateAnnotation): UnifiedStateAnnotation;
  fromEnhancedGraph(state: EnhancedStateAnnotation): UnifiedStateAnnotation;
  toMainGraph(state: UnifiedStateAnnotation): StateAnnotation;
  toEnhancedGraph(state: UnifiedStateAnnotation): EnhancedStateAnnotation;
}

class StateMigrationService implements StateMigrationAdapter {
  fromMainGraph(state: StateAnnotation): UnifiedStateAnnotation {
    return {
      query: {
        originalQuery: state.query,
        queryId: generateId(),
        timestamp: Date.now()
      },
      signals: {
        nerResults: state.extractionSignals?.nerResults,
        resolvedToolNames: state.extractionSignals?.resolvedToolNames,
        fuzzyMatches: state.extractionSignals?.fuzzyMatches
      },
      intent: state.intent ? {
        primaryIntent: state.intent.primaryIntent,
        confidence: {
          overall: state.intent.confidence,
          intent: state.intent.confidence,
          entities: state.intent.confidence,
          semantic: 0.5, // Default value
          contextual: 0.5
        },
        intentType: state.intent.searchType === 'tool_name' ? 'search' : 'other',
        complexity: 'moderate',
        requiresContext: true,
        searchStrategy: 'hybrid'
      } : undefined,
      metadata: {
        stateVersion: '1.0.0',
        graphVersion: 'unified-v1',
        performance: {
          nodeTimings: {},
          totalExecutionTime: 0,
          memoryUsage: 0,
          cacheHitRate: 0
        },
        configuration: {
          profile: 'basic',
          overrides: {},
          features: {}
        },
        debug: {
          nodeId: '',
          executionPath: [],
          checkpoints: [],
          logs: []
        },
        migration: {
          fromGraph: 'main.graph',
          fromStateVersion: '1.0.0',
          migrationDate: Date.now(),
          compatibilityMode: true
        }
      }
    };
  }

  fromEnhancedGraph(state: EnhancedStateAnnotation): UnifiedStateAnnotation {
    // Similar implementation for enhanced state migration
  }

  // ... other migration methods
}
```

### Phase 2: Gradual Migration

```typescript
interface MigrationPlan {
  targetGraph: string;
  migrationSteps: Array<{
    step: number;
    description: string;
    migrationFunction: string;
    validationFunction: string;
    rollbackFunction: string;
  }>;
  successCriteria: Array<{
    metric: string;
    threshold: number;
    measurementPeriod: number;
  }>;
}

const unifiedMigrationPlan: MigrationPlan = {
  targetGraph: 'unified-search.graph',
  migrationSteps: [
    {
      step: 1,
      description: 'Deploy unified state schema in parallel',
      migrationFunction: 'deployUnifiedStateSchema',
      validationFunction: 'validateStateSchema',
      rollbackFunction: 'rollbackToLegacyState'
    },
    {
      step: 2,
      description: 'Migrate read operations to unified state',
      migrationFunction: 'migrateReadOperations',
      validationFunction: 'validateReadOperations',
      rollbackFunction: 'rollbackReadOperations'
    },
    // ... additional steps
  ],
  successCriteria: [
    {
      metric: 'response_time_p95',
      threshold: 500,
      measurementPeriod: 3600 // 1 hour
    },
    {
      metric: 'error_rate',
      threshold: 0.001,
      measurementPeriod: 3600
    }
  ]
};
```

## Implementation Guidelines

### 1. State Creation

```typescript
function createUnifiedState(query: string, config: UnifiedSearchConfig): UnifiedStateAnnotation {
  return {
    query: {
      originalQuery: query,
      queryId: generateQueryId(),
      timestamp: Date.now(),
      context: config.context || {}
    },
    metadata: {
      stateVersion: '1.0.0',
      graphVersion: 'unified-v1',
      performance: {
        nodeTimings: {},
        totalExecutionTime: 0,
        memoryUsage: 0,
        cacheHitRate: 0
      },
      configuration: {
        profile: config.profile || 'basic',
        overrides: config.overrides || {},
        features: config.features || {}
      },
      debug: {
        nodeId: 'start',
        executionPath: ['start'],
        checkpoints: [],
        logs: [{
          timestamp: Date.now(),
          level: 'info',
          message: 'State initialized',
          node: 'start'
        }]
      }
    },
    optimizationHints: config.optimizationHints
  };
}
```

### 2. State Updates

```typescript
function updateUnifiedState<T extends keyof UnifiedStateAnnotation>(
  state: UnifiedStateAnnotation,
  field: T,
  value: UnifiedStateAnnotation[T],
  nodeId: string
): UnifiedStateAnnotation {
  return {
    ...state,
    [field]: value,
    metadata: {
      ...state.metadata,
      performance: {
        ...state.metadata.performance,
        nodeTimings: {
          ...state.metadata.performance.nodeTimings,
          [nodeId]: Date.now()
        }
      },
      debug: {
        ...state.metadata.debug,
        executionPath: [...state.metadata.debug.executionPath, nodeId],
        checkpoints: [
          ...state.metadata.debug.checkpoints,
          {
            node: nodeId,
            timestamp: Date.now(),
            state: { [field]: value }
          }
        ],
        logs: [
          ...state.metadata.debug.logs,
          {
            timestamp: Date.now(),
            level: 'info',
            message: `Updated ${field}`,
            node: nodeId
          }
        ]
      }
    }
  };
}
```

### 3. State Validation

```typescript
interface StateValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  recommendations: string[];
}

function validateUnifiedState(state: UnifiedStateAnnotation): StateValidationResult {
  const errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }> = [];

  // Validate required fields
  if (!state.query?.originalQuery) {
    errors.push({
      field: 'query.originalQuery',
      message: 'Original query is required',
      severity: 'error'
    });
  }

  // Validate state consistency
  if (state.intent && !state.signals) {
    errors.push({
      field: 'intent',
      message: 'Intent analysis requires extraction signals',
      severity: 'warning'
    });
  }

  // Validate performance constraints
  if (state.metadata.performance.totalExecutionTime > 5000) { // 5 seconds
    errors.push({
      field: 'performance.totalExecutionTime',
      message: 'Execution time exceeds acceptable limits',
      severity: 'warning'
    });
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    recommendations: generateRecommendations(errors, state)
  };
}
```

## Performance Monitoring

### 1. State Metrics

```typescript
interface StateMetrics {
  size: {
    total: number; // bytes
    byField: Record<string, number>;
  };
  performance: {
    creationTime: number;
    updateTime: number;
    serializationTime: number;
    deserializationTime: number;
  };
  quality: {
    completeness: number; // percentage of required fields filled
    consistency: number; // consistency score across fields
    accuracy: number; // confidence in state data
  };
}

function collectStateMetrics(state: UnifiedStateAnnotation): StateMetrics {
  // Implementation for collecting comprehensive state metrics
}
```

### 2. Alerting

```typescript
interface StateAlert {
  type: 'performance' | 'quality' | 'size' | 'consistency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendations: string[];
  timestamp: number;
}

class StateMonitoringService {
  static checkStateHealth(state: UnifiedStateAnnotation): StateAlert[] {
    const alerts: StateAlert[] = [];
    const metrics = collectStateMetrics(state);

    // Performance alerts
    if (metrics.performance.creationTime > 100) {
      alerts.push({
        type: 'performance',
        severity: 'medium',
        message: 'State creation time is excessive',
        recommendations: ['Consider lazy loading', 'Optimize initialization logic'],
        timestamp: Date.now()
      });
    }

    // Size alerts
    if (metrics.size.total > 5 * 1024 * 1024) { // 5MB
      alerts.push({
        type: 'size',
        severity: 'high',
        message: 'State size is too large',
        recommendations: ['Enable compression', 'Remove unused fields'],
        timestamp: Date.now()
      });
    }

    return alerts;
  }
}
```

## Conclusion

The `UnifiedStateAnnotation` provides a comprehensive, optimized, and scalable foundation for the consolidated search graph architecture. It combines the best features from existing implementations while adding significant improvements in performance, observability, and maintainability.

Key benefits:
- **Comprehensive Integration**: Unified schema for all search capabilities
- **Performance Optimized**: Lazy loading, compression, and memory management
- **Observability**: Comprehensive metadata and monitoring capabilities
- **Migration Ready**: Built-in migration strategies and backward compatibility
- **Type Safe**: Full TypeScript support with strict validation

This specification serves as the foundation for implementing the unified search architecture outlined in the consolidation strategy.