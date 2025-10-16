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
    
    // Debug options
    debug: z.boolean().default(false),
    includeMetadata: z.boolean().default(true),
    includeSourceAttribution: z.boolean().default(true),
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
  }),
  
  // Results array
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
  })),
  
  // Source attribution
  sourceAttribution: z.array(z.object({
    source: z.string(),
    resultCount: z.number(),
    searchTime: z.number(),
    avgScore: z.number(),
    weight: z.number(),
  })).optional(),
  
  // Duplicate detection info
  duplicateDetection: z.object({
    enabled: z.boolean(),
    duplicatesRemoved: z.number(),
    duplicateGroups: z.number(),
    strategies: z.array(z.string()),
    processingTime: z.number(),
  }).optional(),
  
  // Performance metrics
  metrics: z.object({
    totalProcessingTime: z.number(),
    searchTime: z.number(),
    mergeTime: z.number(),
    deduplicationTime: z.number(),
    cacheHitRate: z.number(),
  }),
  
  // Debug information
  debug: z.object({
    executionPath: z.array(z.string()),
    sourceMetrics: z.record(z.any()),
    mergeConfig: z.any(),
    duplicateDetectionConfig: z.any(),
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
