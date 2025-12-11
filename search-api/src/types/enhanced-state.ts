import { z } from "zod";
import { Annotation } from "@langchain/langgraph";
import { StateAnnotation } from "./state.js";

// Enhanced State Schema for AI Search Enhancement v2.0
// This extends the existing StateAnnotation with new fields for context enrichment,
// local NLP processing, multi-vector search results, execution plans, and performance metrics.

// Enhanced source attribution for entity statistics
export const EntitySourceAttributionSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  sources: z.array(z.object({
    vectorType: z.string(),
    score: z.number(),
    rank: z.number(),
    weight: z.number().optional(),
    reliability: z.number().optional()
  })),
  combinedScore: z.number(),
  confidenceFactors: z.object({
    vectorReliability: z.number(),
    crossValidation: z.number(),
    consistency: z.number()
  }).optional()
});

// Vector type reliability metrics
export const VectorTypeReliabilitySchema = z.object({
  vectorType: z.string(),
  reliability: z.number(), // 0-1 score based on historical performance
  sampleSize: z.number(),
  avgSimilarity: z.number(),
  consistency: z.number(),
  lastUpdated: z.date()
});

// Enhanced confidence breakdown
export const ConfidenceBreakdownSchema = z.object({
  overall: z.number(),
  sampleSize: z.number(),
  avgSimilarity: z.number(),
  vectorTypeReliability: z.number(),
  crossValidation: z.number(),
  consistency: z.number(),
  dataQuality: z.number(),
  sourceDiversity: z.number(),
  factors: z.array(z.object({
    name: z.string(),
    value: z.number(),
    weight: z.number(),
    description: z.string()
  }))
});

// Conflict detection and resolution
export const DataConflictSchema = z.object({
  type: z.enum(['category', 'interface', 'pricing', 'attribute']),
  conflictingValues: z.array(z.object({
    value: z.string(),
    sources: z.array(z.string()),
    confidence: z.number(),
    percentage: z.number()
  })),
  resolution: z.enum(['high_confidence', 'weighted_average', 'merge_all', 'flag_for_review']).optional(),
  resolvedValue: z.string().optional(),
  confidenceInResolution: z.number().optional()
});

// Enhanced entity statistics with comprehensive confidence scoring
export const EnhancedEntityStatisticsSchema = z.object({
  commonInterfaces: z.array(z.object({
    interface: z.string(),
    percentage: z.number(),
    confidence: z.number(),
    sources: z.array(z.string())
  })),
  commonPricing: z.array(z.object({
    pricing: z.string(),
    percentage: z.number(),
    confidence: z.number(),
    sources: z.array(z.string())
  })),
  commonCategories: z.array(z.object({
    category: z.string(),
    percentage: z.number(),
    confidence: z.number(),
    sources: z.array(z.string())
  })),
  totalCount: z.number(),
  confidence: z.number(),
  confidenceBreakdown: ConfidenceBreakdownSchema,
  semanticMatches: z.number(),
  avgSimilarityScore: z.number(),
  source: z.enum(['semantic_search']),
  sampleTools: z.array(z.string()),
  sourceAttribution: z.array(EntitySourceAttributionSchema),
  vectorTypeContributions: z.record(z.object({
    count: z.number(),
    avgScore: z.number(),
    reliability: z.number(),
    contribution: z.number()
  })),
  dataConflicts: z.array(DataConflictSchema),
  qualityIndicators: z.object({
    dataFreshness: z.number(),
    sourceDiversity: z.number(),
    crossValidationScore: z.number(),
    consistencyScore: z.number()
  }),
  lowSampleWarning: z.string().optional(),
  processingOptimization: z.string().optional(),
  transparency: z.object({
    dataSources: z.array(z.string()),
    methodology: z.string(),
    limitations: z.array(z.string()),
    confidenceLevel: z.string()
  })
});

// Context Enrichment Types
export const EntityStatisticsSchema = z.object({
  commonInterfaces: z.array(z.object({
    interface: z.string(),
    percentage: z.number(),
    confidence: z.number().optional(),
    sources: z.array(z.string()).optional()
  })),
  commonPricing: z.array(z.object({
    pricing: z.string(),
    percentage: z.number(),
    confidence: z.number().optional(),
    sources: z.array(z.string()).optional()
  })),
  commonCategories: z.array(z.object({
    category: z.string(),
    percentage: z.number(),
    confidence: z.number().optional(),
    sources: z.array(z.string()).optional()
  })),
  totalCount: z.number(),
  confidence: z.number(),
  confidenceBreakdown: ConfidenceBreakdownSchema.optional(),
  semanticMatches: z.number(),
  avgSimilarityScore: z.number(),
  source: z.enum(['semantic_search']),
  sampleTools: z.array(z.string()),
  sourceAttribution: z.array(EntitySourceAttributionSchema).optional(),
  vectorTypeContributions: z.record(z.object({
    count: z.number(),
    avgScore: z.number(),
    reliability: z.number(),
    contribution: z.number()
  })).optional(),
  dataConflicts: z.array(DataConflictSchema).optional(),
  qualityIndicators: z.object({
    dataFreshness: z.number(),
    sourceDiversity: z.number(),
    crossValidationScore: z.number(),
    consistencyScore: z.number()
  }).optional(),
  lowSampleWarning: z.string().optional(),
  processingOptimization: z.string().optional(),
  transparency: z.object({
    dataSources: z.array(z.string()),
    methodology: z.string(),
    limitations: z.array(z.string()),
    confidenceLevel: z.string()
  }).optional()
});

export const MetadataContextSchema = z.object({
  searchSpaceSize: z.number(),
  metadataConfidence: z.number(),
  assumptions: z.array(z.string()),
  lastUpdated: z.date(),
  enrichmentStrategy: z.enum(['qdrant_multi_vector']),
  processingTime: z.number()
});

// Local NLP Processing Types
export const NLPResultsSchema = z.object({
  entities: z.array(z.object({
    text: z.string(),
    type: z.string(),
    confidence: z.number()
  })),
  intent: z.object({
    label: z.string(),
    confidence: z.number()
  }),
  vocabularyCandidates: z.record(z.array(z.object({
    value: z.string(),
    confidence: z.number()
  }))),
  processingStrategy: z.enum(['local', 'llm_fallback', 'hybrid']),
  processingTime: z.number(),
  modelUsed: z.string()
});

// Multi-Vector Search Types
export const VectorSearchResultsSchema = z.object({
  semantic: z.array(z.unknown()),
  categories: z.array(z.unknown()),
  functionality: z.array(z.unknown()),
  aliases: z.array(z.unknown()),
  composites: z.array(z.unknown())
});

export const VectorSearchMetricsRecordSchema = z.record(z.object({
  resultCount: z.number(),
  searchTime: z.number(),
  avgSimilarity: z.number()
}));

export const VectorSearchStateSchema = z.object({
  queryEmbedding: z.array(z.number()),
  vectorSearchResults: VectorSearchResultsSchema,
  searchMetrics: VectorSearchMetricsRecordSchema,
  mergeStrategy: z.enum(['reciprocal_rank_fusion', 'weighted_average', 'custom'])
});

// Execution Plan Types
export const SemanticUnderstandingSchema = z.object({
  intent: z.string(),
  constraints: z.record(z.unknown()),
  comparisons: z.array(z.string()),
  price_sentiment: z.string(),
  domain: z.string(),
  assumptions: z.array(z.string()),
  confidence_level: z.number(),
  contextualEvidence: z.array(z.string())
});

export const ExecutionStepSchema = z.object({
  stage: z.string(),
  tool: z.string(),
  params: z.record(z.unknown()),
  reason: z.string(),
  optional: z.boolean(),
  estimatedTime: z.number()
});

export const AdaptiveRoutingSchema = z.object({
  enabled: z.boolean(),
  routing_decisions: z.array(z.object({
    node: z.string(),
    decision: z.string(),
    reasoning: z.string(),
    timestamp: z.date()
  }))
});

export const ExecutionPlanSchema = z.object({
  semantic_understanding: SemanticUnderstandingSchema,
  execution_plan: z.array(ExecutionStepSchema),
  adaptive_routing: AdaptiveRoutingSchema
});

// Enhanced Results Types
export const SourceScoresSchema = z.object({
  mongodb: z.number(),
  qdrant: z.object({
    semantic: z.number(),
    categories: z.number(),
    functionality: z.number(),
    aliases: z.number(),
    composites: z.number()
  }),
  combined: z.number()
});

export const MatchSignalsSchema = z.object({
  exactMatches: z.array(z.string()),
  semanticMatches: z.array(z.string()),
  categoryMatches: z.array(z.string()),
  featureMatches: z.array(z.string())
});

export const EnhancedResultSchema = z.object({
  tool: z.unknown(),
  finalScore: z.number(),
  sourceScores: SourceScoresSchema,
  explanation: z.string(),
  matchSignals: MatchSignalsSchema
});

export const RelevanceDistributionSchema = z.object({
  high: z.number(),
  medium: z.number(),
  low: z.number()
});

export const MergedResultsSchema = z.object({
  results: z.array(EnhancedResultSchema),
  mergingStrategy: z.string(),
  diversityScore: z.number(),
  relevanceDistribution: RelevanceDistributionSchema
});

// Performance Metrics Types
export const ContextEnrichmentMetricsSchema = z.object({
  enabled: z.boolean(),
  processingTime: z.number(),
  cacheHitRate: z.number(),
  entityCount: z.number()
});

export const LocalNLPMetricsSchema = z.object({
  enabled: z.boolean(),
  processingTime: z.number(),
  cacheHitRate: z.number(),
  modelLoadTime: z.number(),
  fallbackCount: z.number()
});

export const VectorSearchPerformanceMetricsSchema = z.object({
  totalSearchTime: z.number(),
  vectorTypeMetrics: z.record(z.object({
    searchTime: z.number(),
    resultCount: z.number(),
    cacheHitRate: z.number()
  })),
  mergeTime: z.number()
});

export const CostTrackingMetricsSchema = z.object({
  llmCalls: z.number(),
  localProcessingSavings: z.number(),
  estimatedCostReduction: z.number()
});

export const PerformanceMetricsSchema = z.object({
  contextEnrichment: ContextEnrichmentMetricsSchema,
  localNLP: LocalNLPMetricsSchema,
  vectorSearch: VectorSearchPerformanceMetricsSchema,
  costTracking: CostTrackingMetricsSchema
});

// Experimental Features Types
export const ExperimentalFeaturesSchema = z.object({
  enabled: z.array(z.string()),
  variants: z.record(z.string()),
  abTestParticipation: z.record(z.string())
});

// Enhanced Metadata Types
export const ResourceUsageSchema = z.object({
  peakMemory: z.number(),
  averageMemory: z.number(),
  cpuTime: z.number()
});

export const CacheMetricsSchema = z.object({
  embeddingCacheHits: z.number(),
  embeddingCacheMisses: z.number(),
  resultCacheHits: z.number(),
  resultCacheMisses: z.number()
});

export const EnhancedMetadataSchema = z.object({
  startTime: z.date(),
  endTime: z.date().optional(),
  executionPath: z.array(z.string()),
  nodeExecutionTimes: z.record(z.number()),
  threadId: z.string().optional(),
  originalQuery: z.string().optional(),
  recoveryTime: z.date().optional(),
  rollbackTime: z.date().optional(),
  name: z.string(),
  // Enhanced metadata fields
  enhancementVersion: z.string(),
  featureFlags: z.array(z.string()),
  resourceUsage: ResourceUsageSchema,
  cacheMetrics: CacheMetricsSchema
});

// Enhanced State Annotation
export const EnhancedStateAnnotation = Annotation.Root({
  // Preserve all existing fields from StateAnnotation
  ...StateAnnotation.spec,
  
  // NEW: Context Enrichment (Stage 0.5)
  entityStatistics: Annotation<Record<string, z.infer<typeof EntityStatisticsSchema>>>,
  metadataContext: Annotation<z.infer<typeof MetadataContextSchema>>,
  
  // NEW: transformers.js Results
  nlpResults: Annotation<z.infer<typeof NLPResultsSchema>>,
  
  // NEW: Multi-Vector Search State
  vectorSearchState: Annotation<z.infer<typeof VectorSearchStateSchema>>,
  
  // NEW: Execution Plan (Enhanced)
  executionPlan: Annotation<z.infer<typeof ExecutionPlanSchema>>,
  
  // NEW: Enhanced Results
  mergedResults: Annotation<z.infer<typeof MergedResultsSchema>>,
  
  // NEW: Performance Monitoring (Extended)
  performanceMetrics: Annotation<z.infer<typeof PerformanceMetricsSchema>>,
  
  // NEW: Configuration State
  experimentalFeatures: Annotation<z.infer<typeof ExperimentalFeaturesSchema>>,
  
  // Enhanced metadata with new fields
  metadata: Annotation<z.infer<typeof EnhancedMetadataSchema>>
});

// Type definitions
export type EnhancedState = typeof EnhancedStateAnnotation.State;

// Validation functions for enhanced state
export const validateEnhancedState = (state: unknown): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Type guard to check if state is an object
  if (!state || typeof state !== 'object') {
    errors.push('State must be an object');
    return { isValid: false, errors };
  }

  const stateObj = state as Record<string, unknown>;

  try {
    // Validate new fields if present
    if (stateObj.entityStatistics && typeof stateObj.entityStatistics === 'object' && stateObj.entityStatistics !== null) {
      const entityStats = stateObj.entityStatistics as Record<string, unknown>;
      // Only validate if there are actual entity statistics
      for (const [entityType, stats] of Object.entries(entityStats)) {
        const result = EntityStatisticsSchema.safeParse(stats);
        if (!result.success) {
          errors.push(`Invalid entityStatistics for ${entityType}: ${result.error.issues.map(i => i.message).join(', ')}`);
        }
      }
    }

    if (stateObj.metadataContext) {
      const result = MetadataContextSchema.safeParse(stateObj.metadataContext);
      if (!result.success) {
        errors.push(`Invalid metadataContext: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }

    if (stateObj.nlpResults) {
      const result = NLPResultsSchema.safeParse(stateObj.nlpResults);
      if (!result.success) {
        errors.push(`Invalid nlpResults: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }

    if (stateObj.vectorSearchState) {
      const result = VectorSearchStateSchema.safeParse(stateObj.vectorSearchState);
      if (!result.success) {
        errors.push(`Invalid vectorSearchState: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }

    if (stateObj.executionPlan) {
      const result = ExecutionPlanSchema.safeParse(stateObj.executionPlan);
      if (!result.success) {
        errors.push(`Invalid executionPlan: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }

    if (stateObj.mergedResults) {
      const result = MergedResultsSchema.safeParse(stateObj.mergedResults);
      if (!result.success) {
        errors.push(`Invalid mergedResults: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }

    if (stateObj.performanceMetrics) {
      const result = PerformanceMetricsSchema.safeParse(stateObj.performanceMetrics);
      if (!result.success) {
        errors.push(`Invalid performanceMetrics: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }

    if (stateObj.experimentalFeatures) {
      const result = ExperimentalFeaturesSchema.safeParse(stateObj.experimentalFeatures);
      if (!result.success) {
        errors.push(`Invalid experimentalFeatures: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }

    if (stateObj.metadata) {
      const result = EnhancedMetadataSchema.safeParse(stateObj.metadata);
      if (!result.success) {
        errors.push(`Invalid metadata: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }
    
  } catch (error) {
    errors.push(`State validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
