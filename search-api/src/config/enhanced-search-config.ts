import { z } from "zod";

// Context Enrichment Configuration
export const ContextEnrichmentConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxEntitiesPerQuery: z.number().default(5),
  minSampleSize: z.number().default(10),
  confidenceThreshold: z.number().default(0.6),
  cacheEnabled: z.boolean().default(true),
  cacheTTL: z.number().default(3600), // seconds
  enrichmentStrategy: z.enum(['qdrant_multi_vector']).default('qdrant_multi_vector'),
  maxProcessingTime: z.number().default(200), // ms
  fallbackEnabled: z.boolean().default(true),
});

export type ContextEnrichmentConfig = z.infer<typeof ContextEnrichmentConfigSchema>;

// Multi-Vector Search Configuration
export const MultiVectorSearchConfigSchema = z.object({
  enabled: z.boolean().default(true),
  vectorTypes: z.array(z.string()).default(['semantic', 'categories', 'functionality', 'aliases', 'composites']),
  mergeStrategy: z.enum(['reciprocal_rank_fusion', 'weighted_average', 'custom']).default('reciprocal_rank_fusion'),
  rrfKValue: z.number().default(60),
  maxResultsPerVector: z.number().default(20),
  deduplicationEnabled: z.boolean().default(true),
  deduplicationThreshold: z.number().default(0.9),
  sourceAttributionEnabled: z.boolean().default(true),
  parallelSearchEnabled: z.boolean().default(true),
  searchTimeout: z.number().default(5000), // ms
});

export type MultiVectorSearchConfig = z.infer<typeof MultiVectorSearchConfigSchema>;

// Local NLP Configuration
export const LocalNLPConfigSchema = z.object({
  enabled: z.boolean().default(true),
  nerModel: z.string().default('Xenova/bert-base-NER'),
  classificationModel: z.string().default('Xenova/nli-deberta-v3-base'),
  modelCacheEnabled: z.boolean().default(true),
  modelCacheSize: z.number().default(2), // number of models to cache
  confidenceThreshold: z.number().default(0.5),
  maxProcessingTime: z.number().default(100), // ms
  fallbackEnabled: z.boolean().default(true),
  fallbackThreshold: z.number().default(0.5),
  batchProcessingEnabled: z.boolean().default(true),
  maxBatchSize: z.number().default(10),
  intentLabels: z.array(z.string()).default([
    'filter_search',
    'comparison_query',
    'discovery',
    'exploration'
  ]),
});

export type LocalNLPConfig = z.infer<typeof LocalNLPConfigSchema>;

// Performance Configuration
export const PerformanceConfigSchema = z.object({
  cacheEnabled: z.boolean().default(true),
  embeddingCacheSize: z.number().default(1000),
  resultCacheSize: z.number().default(500),
  cacheTTL: z.number().default(3600), // seconds
  intelligentCacheEnabled: z.boolean().default(true),
  semanticSimilarityThreshold: z.number().default(0.8),
  adaptiveTTLEnabled: z.boolean().default(true),
  minTTL: z.number().default(300), // seconds
  maxTTL: z.number().default(7200), // seconds
  cacheCompressionEnabled: z.boolean().default(true),
  cacheWarmingEnabled: z.boolean().default(true),
  maxConcurrentRequests: z.number().default(10),
  requestTimeout: z.number().default(10000), // ms
});

export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;

// A/B Testing Configuration
export const ABTestingConfigSchema = z.object({
  enabled: z.boolean().default(false),
  configPath: z.string().default('./config/experiments.json'),
  assignmentStrategy: z.enum(['consistent_hash', 'random', 'round_robin']).default('consistent_hash'),
  metricsTrackingEnabled: z.boolean().default(true),
  metricsRetentionDays: z.number().default(30),
  autoExperimentActivation: z.boolean().default(false),
  rolloutPercentage: z.number().default(0), // 0-100
  targetUserSegments: z.array(z.string()).optional(),
  experimentIsolation: z.boolean().default(true),
});

export type ABTestingConfig = z.infer<typeof ABTestingConfigSchema>;

// Monitoring Configuration
export const MonitoringConfigSchema = z.object({
  enabled: z.boolean().default(true),
  metricsInterval: z.number().default(60000), // ms
  detailedMetricsEnabled: z.boolean().default(true),
  performanceAlertsEnabled: z.boolean().default(true),
  alertThresholds: z.object({
    responseTime: z.number().default(2000), // ms
    errorRate: z.number().default(0.05), // 5%
    cacheHitRate: z.number().default(0.7), // 70%
    localNLPUsageRate: z.number().default(0.6), // 60%
  }),
  resourceMonitoringEnabled: z.boolean().default(true),
  costTrackingEnabled: z.boolean().default(true),
  dashboardDataRetention: z.number().default(7), // days
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  structuredLoggingEnabled: z.boolean().default(true),
});

export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;

// Feature Flags Configuration
export const FeatureFlagsConfigSchema = z.object({
  contextEnrichment: z.boolean().default(true),
  localNLP: z.boolean().default(true),
  multiVectorSearch: z.boolean().default(true),
  enhancedResultMerging: z.boolean().default(true),
  dynamicExecutionPlanning: z.boolean().default(true),
  performanceOptimization: z.boolean().default(true),
  abTesting: z.boolean().default(false),
  enhancedMonitoring: z.boolean().default(true),
});

export type FeatureFlagsConfig = z.infer<typeof FeatureFlagsConfigSchema>;

// Main Enhanced Search Configuration
export const EnhancedSearchConfigSchema = z.object({
  version: z.string().default('2.0'),
  contextEnrichment: ContextEnrichmentConfigSchema,
  multiVectorSearch: MultiVectorSearchConfigSchema,
  localNLP: LocalNLPConfigSchema,
  performance: PerformanceConfigSchema,
  abTesting: ABTestingConfigSchema,
  monitoring: MonitoringConfigSchema,
  featureFlags: FeatureFlagsConfigSchema,
});

export type EnhancedSearchConfig = z.infer<typeof EnhancedSearchConfigSchema>;

// Default configuration values
export const defaultEnhancedSearchConfig: EnhancedSearchConfig = {
  version: '2.0',
  contextEnrichment: {
    enabled: true,
    maxEntitiesPerQuery: 5,
    minSampleSize: 10,
    confidenceThreshold: 0.6,
    cacheEnabled: true,
    cacheTTL: 3600,
    enrichmentStrategy: 'qdrant_multi_vector',
    maxProcessingTime: 200,
    fallbackEnabled: true,
  },
  multiVectorSearch: {
    enabled: true,
    vectorTypes: ['semantic', 'categories', 'functionality', 'aliases', 'composites'],
    mergeStrategy: 'reciprocal_rank_fusion',
    rrfKValue: 60,
    maxResultsPerVector: 20,
    deduplicationEnabled: true,
    deduplicationThreshold: 0.9,
    sourceAttributionEnabled: true,
    parallelSearchEnabled: true,
    searchTimeout: 5000,
  },
  localNLP: {
    enabled: true,
    nerModel: 'Xenova/bert-base-NER',
    classificationModel: 'Xenova/nli-deberta-v3-base',
    modelCacheEnabled: true,
    modelCacheSize: 2,
    confidenceThreshold: 0.5,
    maxProcessingTime: 100,
    fallbackEnabled: true,
    fallbackThreshold: 0.5,
    batchProcessingEnabled: true,
    maxBatchSize: 10,
    intentLabels: ['filter_search', 'comparison_query', 'discovery', 'exploration'],
  },
  performance: {
    cacheEnabled: true,
    embeddingCacheSize: 1000,
    resultCacheSize: 500,
    cacheTTL: 3600,
    intelligentCacheEnabled: true,
    semanticSimilarityThreshold: 0.8,
    adaptiveTTLEnabled: true,
    minTTL: 300,
    maxTTL: 7200,
    cacheCompressionEnabled: true,
    cacheWarmingEnabled: true,
    maxConcurrentRequests: 10,
    requestTimeout: 10000,
  },
  abTesting: {
    enabled: false,
    configPath: './config/experiments.json',
    assignmentStrategy: 'consistent_hash',
    metricsTrackingEnabled: true,
    metricsRetentionDays: 30,
    autoExperimentActivation: false,
    rolloutPercentage: 0,
    targetUserSegments: [],
    experimentIsolation: true,
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000,
    detailedMetricsEnabled: true,
    performanceAlertsEnabled: true,
    alertThresholds: {
      responseTime: 2000,
      errorRate: 0.05,
      cacheHitRate: 0.7,
      localNLPUsageRate: 0.6,
    },
    resourceMonitoringEnabled: true,
    costTrackingEnabled: true,
    dashboardDataRetention: 7,
    logLevel: 'info',
    structuredLoggingEnabled: true,
  },
  featureFlags: {
    contextEnrichment: true,
    localNLP: true,
    multiVectorSearch: true,
    enhancedResultMerging: true,
    dynamicExecutionPlanning: true,
    performanceOptimization: true,
    abTesting: false,
    enhancedMonitoring: true,
  },
};


