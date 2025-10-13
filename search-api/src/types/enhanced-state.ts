import { Annotation, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { Intent, IntentSchema } from "./intent";
import { Plan, PlanSchema } from "./plan";
import { StateAnnotation } from "./state";

// Enhanced State Schema for AI Search Enhancement v2.0
// This extends the existing StateAnnotation with new fields for context enrichment,
// local NLP processing, multi-vector search results, execution plans, and performance metrics.

// Context Enrichment Types
export const EntityStatisticsSchema = z.object({
  commonInterfaces: z.array(z.object({
    interface: z.string(),
    percentage: z.number()
  })),
  commonPricing: z.array(z.object({
    pricing: z.string(),
    percentage: z.number()
  })),
  commonCategories: z.array(z.object({
    category: z.string(),
    percentage: z.number()
  })),
  totalCount: z.number(),
  confidence: z.number(),
  semanticMatches: z.number(),
  avgSimilarityScore: z.number(),
  source: z.enum(['semantic_search']),
  sampleTools: z.array(z.string())
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
  semantic: z.array(z.any()),
  categories: z.array(z.any()),
  functionality: z.array(z.any()),
  aliases: z.array(z.any()),
  composites: z.array(z.any())
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
  constraints: z.record(z.any()),
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
  params: z.record(z.any()),
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
  tool: z.any(),
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
export const validateEnhancedState = (state: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  try {
    // Validate new fields if present
    if (state.entityStatistics && typeof state.entityStatistics === 'object' && Object.keys(state.entityStatistics).length > 0) {
      // Only validate if there are actual entity statistics
      for (const [entityType, stats] of Object.entries(state.entityStatistics)) {
        const result = EntityStatisticsSchema.safeParse(stats);
        if (!result.success) {
          errors.push(`Invalid entityStatistics for ${entityType}: ${result.error.issues.map(i => i.message).join(', ')}`);
        }
      }
    }
    
    if (state.metadataContext) {
      const result = MetadataContextSchema.safeParse(state.metadataContext);
      if (!result.success) {
        errors.push(`Invalid metadataContext: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }
    
    if (state.nlpResults) {
      const result = NLPResultsSchema.safeParse(state.nlpResults);
      if (!result.success) {
        errors.push(`Invalid nlpResults: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }
    
    if (state.vectorSearchState) {
      const result = VectorSearchStateSchema.safeParse(state.vectorSearchState);
      if (!result.success) {
        errors.push(`Invalid vectorSearchState: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }
    
    if (state.executionPlan) {
      const result = ExecutionPlanSchema.safeParse(state.executionPlan);
      if (!result.success) {
        errors.push(`Invalid executionPlan: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }
    
    if (state.mergedResults) {
      const result = MergedResultsSchema.safeParse(state.mergedResults);
      if (!result.success) {
        errors.push(`Invalid mergedResults: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }
    
    if (state.performanceMetrics) {
      const result = PerformanceMetricsSchema.safeParse(state.performanceMetrics);
      if (!result.success) {
        errors.push(`Invalid performanceMetrics: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }
    
    if (state.experimentalFeatures) {
      const result = ExperimentalFeaturesSchema.safeParse(state.experimentalFeatures);
      if (!result.success) {
        errors.push(`Invalid experimentalFeatures: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }
    
    if (state.metadata) {
      const result = EnhancedMetadataSchema.safeParse(state.metadata);
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
