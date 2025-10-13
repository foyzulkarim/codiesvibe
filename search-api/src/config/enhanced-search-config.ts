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
  classificationModel: z.string().default('Xenova/distilbert-base-uncased'),
  modelCacheEnabled: z.boolean().default(true),
  modelCacheSize: z.number().default(2), // number of models to cache
  confidenceThreshold: z.number().default(0.7),
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
    classificationModel: 'Xenova/distilbert-base-uncased',
    modelCacheEnabled: true,
    modelCacheSize: 2,
    confidenceThreshold: 0.7,
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

// Environment variable mapping
export const getEnhancedSearchConfigFromEnv = (): Partial<EnhancedSearchConfig> => ({
  contextEnrichment: {
    enabled: process.env.CONTEXT_ENRICHMENT_ENABLED === 'true',
    maxEntitiesPerQuery: parseInt(process.env.CONTEXT_ENRICHMENT_MAX_ENTITIES || '5'),
    minSampleSize: parseInt(process.env.CONTEXT_ENRICHMENT_MIN_SAMPLE_SIZE || '10'),
    confidenceThreshold: parseFloat(process.env.CONTEXT_ENRICHMENT_CONFIDENCE_THRESHOLD || '0.6'),
    cacheEnabled: process.env.CONTEXT_ENRICHMENT_CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.CONTEXT_ENRICHMENT_CACHE_TTL || '3600'),
    enrichmentStrategy: (process.env.CONTEXT_ENRICHMENT_STRATEGY as any) || 'qdrant_multi_vector',
    maxProcessingTime: parseInt(process.env.CONTEXT_ENRICHMENT_MAX_TIME || '200'),
    fallbackEnabled: process.env.CONTEXT_ENRICHMENT_FALLBACK_ENABLED !== 'false',
  },
  multiVectorSearch: {
    enabled: process.env.MULTI_VECTOR_SEARCH_ENABLED !== 'false',
    vectorTypes: process.env.MULTI_VECTOR_TYPES?.split(',') || ['semantic', 'categories', 'functionality', 'aliases', 'composites'],
    mergeStrategy: (process.env.MULTI_VECTOR_MERGE_STRATEGY as any) || 'reciprocal_rank_fusion',
    rrfKValue: parseInt(process.env.MULTI_VECTOR_RRF_K || '60'),
    maxResultsPerVector: parseInt(process.env.MULTI_VECTOR_MAX_RESULTS || '20'),
    deduplicationEnabled: process.env.MULTI_VECTOR_DEDUP_ENABLED !== 'false',
    deduplicationThreshold: parseFloat(process.env.MULTI_VECTOR_DEDUP_THRESHOLD || '0.9'),
    sourceAttributionEnabled: process.env.MULTI_VECTOR_ATTRIBUTION_ENABLED !== 'false',
    parallelSearchEnabled: process.env.MULTI_VECTOR_PARALLEL_ENABLED !== 'false',
    searchTimeout: parseInt(process.env.MULTI_VECTOR_SEARCH_TIMEOUT || '5000'),
  },
  localNLP: {
    enabled: process.env.LOCAL_NLP_ENABLED !== 'false',
    nerModel: process.env.LOCAL_NLP_NER_MODEL || 'Xenova/bert-base-NER',
    classificationModel: process.env.LOCAL_NLP_CLASSIFICATION_MODEL || 'Xenova/distilbert-base-uncased',
    modelCacheEnabled: process.env.LOCAL_NLP_MODEL_CACHE_ENABLED !== 'false',
    modelCacheSize: parseInt(process.env.LOCAL_NLP_MODEL_CACHE_SIZE || '2'),
    confidenceThreshold: parseFloat(process.env.LOCAL_NLP_CONFIDENCE_THRESHOLD || '0.7'),
    maxProcessingTime: parseInt(process.env.LOCAL_NLP_MAX_TIME || '100'),
    fallbackEnabled: process.env.LOCAL_NLP_FALLBACK_ENABLED !== 'false',
    fallbackThreshold: parseFloat(process.env.LOCAL_NLP_FALLBACK_THRESHOLD || '0.5'),
    batchProcessingEnabled: process.env.LOCAL_NLP_BATCH_ENABLED !== 'false',
    maxBatchSize: parseInt(process.env.LOCAL_NLP_MAX_BATCH_SIZE || '10'),
    intentLabels: process.env.LOCAL_NLP_INTENT_LABELS?.split(',') || ['filter_search', 'comparison_query', 'discovery', 'exploration'],
  },
  performance: {
    cacheEnabled: process.env.PERFORMANCE_CACHE_ENABLED !== 'false',
    embeddingCacheSize: parseInt(process.env.PERFORMANCE_EMBEDDING_CACHE_SIZE || '1000'),
    resultCacheSize: parseInt(process.env.PERFORMANCE_RESULT_CACHE_SIZE || '500'),
    cacheTTL: parseInt(process.env.PERFORMANCE_CACHE_TTL || '3600'),
    intelligentCacheEnabled: process.env.PERFORMANCE_INTELLIGENT_CACHE_ENABLED !== 'false',
    semanticSimilarityThreshold: parseFloat(process.env.PERFORMANCE_SEMANTIC_THRESHOLD || '0.8'),
    adaptiveTTLEnabled: process.env.PERFORMANCE_ADAPTIVE_TTL_ENABLED !== 'false',
    minTTL: parseInt(process.env.PERFORMANCE_MIN_TTL || '300'),
    maxTTL: parseInt(process.env.PERFORMANCE_MAX_TTL || '7200'),
    cacheCompressionEnabled: process.env.PERFORMANCE_CACHE_COMPRESSION_ENABLED !== 'false',
    cacheWarmingEnabled: process.env.PERFORMANCE_CACHE_WARMING_ENABLED !== 'false',
    maxConcurrentRequests: parseInt(process.env.PERFORMANCE_MAX_CONCURRENT || '10'),
    requestTimeout: parseInt(process.env.PERFORMANCE_REQUEST_TIMEOUT || '10000'),
  },
  abTesting: {
    enabled: process.env.AB_TESTING_ENABLED === 'true',
    configPath: process.env.AB_TESTING_CONFIG_PATH || './config/experiments.json',
    assignmentStrategy: (process.env.AB_TESTING_ASSIGNMENT_STRATEGY as any) || 'consistent_hash',
    metricsTrackingEnabled: process.env.AB_TESTING_METRICS_ENABLED !== 'false',
    metricsRetentionDays: parseInt(process.env.AB_TESTING_METRICS_RETENTION || '30'),
    autoExperimentActivation: process.env.AB_TESTING_AUTO_ACTIVATION === 'true',
    rolloutPercentage: parseInt(process.env.AB_TESTING_ROLLOUT_PERCENTAGE || '0'),
    targetUserSegments: process.env.AB_TESTING_TARGET_SEGMENTS?.split(','),
    experimentIsolation: process.env.AB_TESTING_ISOLATION_ENABLED !== 'false',
  },
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    metricsInterval: parseInt(process.env.MONITORING_METRICS_INTERVAL || '60000'),
    detailedMetricsEnabled: process.env.MONITORING_DETAILED_ENABLED !== 'false',
    performanceAlertsEnabled: process.env.MONITORING_ALERTS_ENABLED !== 'false',
    alertThresholds: {
      responseTime: parseInt(process.env.MONITORING_ALERT_RESPONSE_TIME || '2000'),
      errorRate: parseFloat(process.env.MONITORING_ALERT_ERROR_RATE || '0.05'),
      cacheHitRate: parseFloat(process.env.MONITORING_ALERT_CACHE_HIT_RATE || '0.7'),
      localNLPUsageRate: parseFloat(process.env.MONITORING_ALERT_LOCAL_NLP_RATE || '0.6'),
    },
    resourceMonitoringEnabled: process.env.MONITORING_RESOURCE_ENABLED !== 'false',
    costTrackingEnabled: process.env.MONITORING_COST_TRACKING_ENABLED !== 'false',
    dashboardDataRetention: parseInt(process.env.MONITORING_DASHBOARD_RETENTION || '7'),
    logLevel: (process.env.MONITORING_LOG_LEVEL as any) || 'info',
    structuredLoggingEnabled: process.env.MONITORING_STRUCTURED_LOGGING_ENABLED !== 'false',
  },
  featureFlags: {
    contextEnrichment: process.env.FEATURE_CONTEXT_ENRICHMENT !== 'false',
    localNLP: process.env.FEATURE_LOCAL_NLP !== 'false',
    multiVectorSearch: process.env.FEATURE_MULTI_VECTOR_SEARCH !== 'false',
    enhancedResultMerging: process.env.FEATURE_ENHANCED_RESULT_MERGING !== 'false',
    dynamicExecutionPlanning: process.env.FEATURE_DYNAMIC_EXECUTION_PLANNING !== 'false',
    performanceOptimization: process.env.FEATURE_PERFORMANCE_OPTIMIZATION !== 'false',
    abTesting: process.env.FEATURE_AB_TESTING === 'true',
    enhancedMonitoring: process.env.FEATURE_ENHANCED_MONITORING !== 'false',
  },
});
