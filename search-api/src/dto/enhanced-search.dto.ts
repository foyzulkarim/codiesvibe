import { z } from 'zod';

/**
 * Enhanced Search Request DTO
 * Defines the structure for enhanced search requests with configurable options
 */
export const EnhancedSearchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(500, 'Query too long'),
  options: z.object({
    // Search sources configuration
    sources: z.object({
      vector: z.boolean().default(true),
      traditional: z.boolean().default(true),
      hybrid: z.boolean().default(true),
    }).default({}),
    
    // Vector search options
    vectorOptions: z.object({
      vectorTypes: z.array(z.string()).default(['semantic', 'categories', 'functionality']),
      limit: z.number().int().min(1).max(100).default(20),
      filter: z.record(z.any()).optional(),
    }).default({}),
    
    // Result merging options
    mergeOptions: z.object({
      strategy: z.enum(['reciprocal_rank_fusion', 'weighted_average', 'hybrid']).default('reciprocal_rank_fusion'),
      rrfKValue: z.number().int().min(1).max(200).default(60),
      maxResults: z.number().int().min(1).max(200).default(50),
      sourceWeights: z.record(z.number()).default({
        semantic: 1.0,
        traditional: 0.9,
        hybrid: 0.95,
        vector: 0.85,
        fulltext: 0.8
      }),
    }).default({}),
    
    // Duplicate detection options
    duplicateDetectionOptions: z.object({
      enabled: z.boolean().default(true),
      useEnhancedDetection: z.boolean().default(true),
      threshold: z.number().min(0).max(1).default(0.8),
      strategies: z.array(z.enum([
        'EXACT_ID',
        'EXACT_URL',
        'CONTENT_SIMILARITY',
        'VERSION_AWARE',
        'FUZZY_MATCH',
        'COMBINED'
      ])).default(['EXACT_ID', 'CONTENT_SIMILARITY', 'VERSION_AWARE']),
    }).default({}),
    
    // Pagination options
    pagination: z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
    }).default({}),
    
    // Sorting options
    sort: z.object({
      field: z.enum(['relevance', 'name', 'category', 'score']).default('relevance'),
      order: z.enum(['asc', 'desc']).default('desc'),
    }).default({}),
    
    // Filtering options
    filters: z.object({
      categories: z.array(z.string()).optional(),
      userTypes: z.array(z.string()).optional(),
      interfaces: z.array(z.string()).optional(),
      deployment: z.array(z.string()).optional(),
      priceRange: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
    }).default({}),
    
    // Performance options
    performance: z.object({
      timeout: z.number().int().min(100).max(30000).default(5000),
      enableCache: z.boolean().default(true),
      enableParallel: z.boolean().default(true),
    }).default({}),
    
    // Enhanced search options for v2.0
    contextEnrichment: z.object({
      enabled: z.boolean().default(true),
      maxEntitiesPerQuery: z.number().int().min(1).max(20).default(5),
      confidenceThreshold: z.number().min(0).max(1).default(0.6),
    }).default({}),
    
    localNLP: z.object({
      enabled: z.boolean().default(true),
      intentClassification: z.boolean().default(true),
      entityExtraction: z.boolean().default(true),
      confidenceThreshold: z.number().min(0).max(1).default(0.5),
    }).default({}),
    
    multiVectorSearch: z.object({
      enabled: z.boolean().default(true),
      vectorTypes: z.array(z.string()).default(['semantic', 'categories', 'functionality', 'aliases', 'composites']),
      deduplicationEnabled: z.boolean().default(true),
      deduplicationThreshold: z.number().min(0).max(1).default(0.9),
    }).default({}),
    
    // Debug options
    debug: z.boolean().default(false),
    includeMetadata: z.boolean().default(true),
    includeSourceAttribution: z.boolean().default(true),
    includeExecutionMetrics: z.boolean().default(false),
    includeConfidenceBreakdown: z.boolean().default(false),
  }).default({})
});

export type EnhancedSearchRequest = z.infer<typeof EnhancedSearchRequestSchema>;

/**
 * Enhanced Search Response DTO
 * Defines the structure for enhanced search responses
 */
export const EnhancedSearchResponseSchema = z.object({
  // Request metadata
  query: z.string(),
  requestId: z.string(),
  timestamp: z.string(),
  
  // Results summary
  summary: z.object({
    totalResults: z.number(),
    returnedResults: z.number(),
    processingTime: z.number(),
    sourcesSearched: z.array(z.string()),
    duplicatesRemoved: z.number(),
    searchStrategy: z.string(),
    enhancementVersion: z.string().optional(),
  }),
  
  // Results array with enhanced fields
  results: z.array(z.object({
    id: z.string(),
    score: z.number(),
    payload: z.any(),
    rrfScore: z.number(),
    originalRankings: z.record(z.object({
      rank: z.number(),
      score: z.number(),
    })),
    sourceCount: z.number(),
    finalRank: z.number(),
    sources: z.array(z.object({
      source: z.string(),
      score: z.number(),
      rank: z.number(),
    })).optional(),
    metadata: z.any().optional(),
    // Enhanced fields for v2.0
    confidenceBreakdown: z.object({
      overall: z.number(),
      vector: z.number().optional(),
      traditional: z.number().optional(),
      hybrid: z.number().optional(),
      nlp: z.number().optional(),
      context: z.number().optional(),
    }).optional(),
    explanation: z.string().optional(),
    matchSignals: z.record(z.any()).optional(),
  })),
  
  // Enhanced source attribution
  sourceAttribution: z.array(z.object({
    source: z.string(),
    resultCount: z.number(),
    searchTime: z.number(),
    avgScore: z.number(),
    weight: z.number(),
    // Enhanced fields
    confidence: z.number().optional(),
    processingStrategy: z.string().optional(),
    modelUsed: z.string().optional(),
  })).optional(),
  
  // Enhanced duplicate detection info
  duplicateDetection: z.object({
    enabled: z.boolean(),
    duplicatesRemoved: z.number(),
    duplicateGroups: z.number(),
    strategies: z.array(z.string()),
    processingTime: z.number(),
    // Enhanced fields
    threshold: z.number().optional(),
    algorithm: z.string().optional(),
  }).optional(),
  
  // Enhanced performance metrics
  metrics: z.object({
    totalProcessingTime: z.number(),
    searchTime: z.number(),
    mergeTime: z.number(),
    deduplicationTime: z.number(),
    cacheHitRate: z.number(),
    // Enhanced fields for v2.0
    nodeExecutionTimes: z.record(z.number()).optional(),
    resourceUsage: z.object({
      peakMemory: z.number().optional(),
      averageMemory: z.number().optional(),
      cpuTime: z.number().optional(),
    }).optional(),
    cacheMetrics: z.object({
      embeddingCacheHits: z.number().optional(),
      embeddingCacheMisses: z.number().optional(),
      resultCacheHits: z.number().optional(),
      resultCacheMisses: z.number().optional(),
    }).optional(),
  }),
  
  // Enhanced debug information
  debug: z.object({
    executionPath: z.array(z.string()),
    sourceMetrics: z.record(z.any()),
    mergeConfig: z.any(),
    duplicateDetectionConfig: z.any(),
    // Enhanced fields
    nlpResults: z.any().optional(),
    contextEnrichment: z.any().optional(),
    performanceBreakdown: z.record(z.any()).optional(),
    requestId: z.string().optional(),
    requestTimestamp: z.string().optional(),
    enhancedFeatures: z.object({
      contextEnrichment: z.boolean(),
      localNLP: z.boolean(),
      multiVectorSearch: z.boolean(),
    }).optional(),
  }).optional(),
  
  // Enhanced context information
  context: z.object({
    entities: z.array(z.object({
      name: z.string(),
      type: z.string(),
      confidence: z.number(),
      count: z.number(),
    })).optional(),
    intent: z.object({
      label: z.string(),
      confidence: z.number(),
    }).optional(),
    enrichedQuery: z.string().optional(),
  }).optional(),
  
  // Pagination info
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type EnhancedSearchResponse = z.infer<typeof EnhancedSearchResponseSchema>;

/**
 * Enhanced Search Error Response DTO
 */
export const EnhancedSearchErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string(),
  timestamp: z.string(),
  requestId: z.string().optional(),
  details: z.any().optional(),
});

export type EnhancedSearchErrorResponse = z.infer<typeof EnhancedSearchErrorResponseSchema>;

/**
 * Search Source Configuration Schema
 */
export const SearchSourceConfigSchema = z.object({
  enabled: z.boolean(),
  weight: z.number(),
  timeout: z.number().optional(),
  retryAttempts: z.number().default(1),
  options: z.record(z.any()).optional(),
});

export type SearchSourceConfig = z.infer<typeof SearchSourceConfigSchema>;

/**
 * Enhanced Search Configuration Schema
 */
export const EnhancedSearchConfigSchema = z.object({
  defaultSources: z.record(SearchSourceConfigSchema),
  defaultMergeStrategy: z.enum(['reciprocal_rank_fusion', 'weighted_average', 'hybrid']),
  defaultDuplicateDetection: z.boolean(),
  maxConcurrentSearches: z.number().default(5),
  defaultTimeout: z.number().default(5000),
  enableCache: z.boolean().default(true),
  cacheTTL: z.number().default(300000), // 5 minutes
});

export type EnhancedSearchConfig = z.infer<typeof EnhancedSearchConfigSchema>;

/**
 * Enhanced Search Context Information Schema
 */
export const EnhancedSearchContextSchema = z.object({
  entities: z.array(z.object({
    name: z.string(),
    type: z.string(),
    confidence: z.number(),
    count: z.number(),
  })).optional(),
  intent: z.object({
    label: z.string(),
    confidence: z.number(),
  }).optional(),
  enrichedQuery: z.string().optional(),
});

export type EnhancedSearchContext = z.infer<typeof EnhancedSearchContextSchema>;

/**
 * Enhanced Search Confidence Breakdown Schema
 */
export const ConfidenceBreakdownSchema = z.object({
  overall: z.number(),
  vector: z.number().optional(),
  traditional: z.number().optional(),
  hybrid: z.number().optional(),
  nlp: z.number().optional(),
  context: z.number().optional(),
});

export type ConfidenceBreakdown = z.infer<typeof ConfidenceBreakdownSchema>;

/**
 * Enhanced Search Resource Usage Schema
 */
export const ResourceUsageSchema = z.object({
  peakMemory: z.number().optional(),
  averageMemory: z.number().optional(),
  cpuTime: z.number().optional(),
});

export type ResourceUsage = z.infer<typeof ResourceUsageSchema>;

/**
 * Enhanced Search Cache Metrics Schema
 */
export const CacheMetricsSchema = z.object({
  embeddingCacheHits: z.number().optional(),
  embeddingCacheMisses: z.number().optional(),
  resultCacheHits: z.number().optional(),
  resultCacheMisses: z.number().optional(),
});

export type CacheMetrics = z.infer<typeof CacheMetricsSchema>;

/**
 * Enhanced Search Match Signals Schema
 */
export const MatchSignalsSchema = z.record(z.any());

export type MatchSignals = z.infer<typeof MatchSignalsSchema>;

/**
 * Enhanced Search Execution Metrics Schema
 */
export const ExecutionMetricsSchema = z.object({
  nodeExecutionTimes: z.record(z.number()).optional(),
  resourceUsage: ResourceUsageSchema.optional(),
  cacheMetrics: CacheMetricsSchema.optional(),
  performanceBreakdown: z.record(z.any()).optional(),
});

export type ExecutionMetrics = z.infer<typeof ExecutionMetricsSchema>;
