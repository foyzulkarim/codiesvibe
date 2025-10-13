import { z } from "zod";
import { 
  EnhancedSearchConfigSchema, 
  EnhancedSearchConfig,
  ContextEnrichmentConfig,
  MultiVectorSearchConfig,
  LocalNLPConfig,
  PerformanceConfig,
  ABTestingConfig,
  MonitoringConfig,
  FeatureFlagsConfig
} from "./enhanced-search-config";

// Validation error class
export class ConfigurationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ConfigurationError[];
  warnings: string[];
}

// Context Enrichment Configuration Validation
export const validateContextEnrichmentConfig = (config: ContextEnrichmentConfig): ConfigurationError[] => {
  const errors: ConfigurationError[] = [];

  if (config.maxEntitiesPerQuery < 1 || config.maxEntitiesPerQuery > 20) {
    errors.push(new ConfigurationError(
      'maxEntitiesPerQuery must be between 1 and 20',
      'contextEnrichment.maxEntitiesPerQuery'
    ));
  }

  if (config.minSampleSize < 5 || config.minSampleSize > 1000) {
    errors.push(new ConfigurationError(
      'minSampleSize must be between 5 and 1000',
      'contextEnrichment.minSampleSize'
    ));
  }

  if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
    errors.push(new ConfigurationError(
      'confidenceThreshold must be between 0 and 1',
      'contextEnrichment.confidenceThreshold'
    ));
  }

  if (config.cacheTTL < 60 || config.cacheTTL > 86400) {
    errors.push(new ConfigurationError(
      'cacheTTL must be between 60 seconds and 24 hours',
      'contextEnrichment.cacheTTL'
    ));
  }

  if (config.maxProcessingTime < 50 || config.maxProcessingTime > 5000) {
    errors.push(new ConfigurationError(
      'maxProcessingTime must be between 50ms and 5000ms',
      'contextEnrichment.maxProcessingTime'
    ));
  }

  return errors;
};

// Multi-Vector Search Configuration Validation
export const validateMultiVectorSearchConfig = (config: MultiVectorSearchConfig): ConfigurationError[] => {
  const errors: ConfigurationError[] = [];

  if (config.vectorTypes.length === 0) {
    errors.push(new ConfigurationError(
      'vectorTypes cannot be empty',
      'multiVectorSearch.vectorTypes'
    ));
  }

  const validVectorTypes = ['semantic', 'categories', 'functionality', 'aliases', 'composites'];
  const invalidVectorTypes = config.vectorTypes.filter(type => !validVectorTypes.includes(type));
  if (invalidVectorTypes.length > 0) {
    errors.push(new ConfigurationError(
      `Invalid vectorTypes: ${invalidVectorTypes.join(', ')}`,
      'multiVectorSearch.vectorTypes'
    ));
  }

  if (config.rrfKValue < 1 || config.rrfKValue > 100) {
    errors.push(new ConfigurationError(
      'rrfKValue must be between 1 and 100',
      'multiVectorSearch.rrfKValue'
    ));
  }

  if (config.maxResultsPerVector < 1 || config.maxResultsPerVector > 100) {
    errors.push(new ConfigurationError(
      'maxResultsPerVector must be between 1 and 100',
      'multiVectorSearch.maxResultsPerVector'
    ));
  }

  if (config.deduplicationThreshold < 0 || config.deduplicationThreshold > 1) {
    errors.push(new ConfigurationError(
      'deduplicationThreshold must be between 0 and 1',
      'multiVectorSearch.deduplicationThreshold'
    ));
  }

  if (config.searchTimeout < 1000 || config.searchTimeout > 30000) {
    errors.push(new ConfigurationError(
      'searchTimeout must be between 1000ms and 30000ms',
      'multiVectorSearch.searchTimeout'
    ));
  }

  return errors;
};

// Local NLP Configuration Validation
export const validateLocalNLPConfig = (config: LocalNLPConfig): ConfigurationError[] => {
  const errors: ConfigurationError[] = [];

  if (config.modelCacheSize < 1 || config.modelCacheSize > 10) {
    errors.push(new ConfigurationError(
      'modelCacheSize must be between 1 and 10',
      'localNLP.modelCacheSize'
    ));
  }

  if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
    errors.push(new ConfigurationError(
      'confidenceThreshold must be between 0 and 1',
      'localNLP.confidenceThreshold'
    ));
  }

  if (config.maxProcessingTime < 50 || config.maxProcessingTime > 5000) {
    errors.push(new ConfigurationError(
      'maxProcessingTime must be between 50ms and 5000ms',
      'localNLP.maxProcessingTime'
    ));
  }

  if (config.fallbackThreshold < 0 || config.fallbackThreshold > 1) {
    errors.push(new ConfigurationError(
      'fallbackThreshold must be between 0 and 1',
      'localNLP.fallbackThreshold'
    ));
  }

  if (config.fallbackThreshold >= config.confidenceThreshold) {
    errors.push(new ConfigurationError(
      'fallbackThreshold must be less than confidenceThreshold',
      'localNLP.fallbackThreshold'
    ));
  }

  if (config.maxBatchSize < 1 || config.maxBatchSize > 50) {
    errors.push(new ConfigurationError(
      'maxBatchSize must be between 1 and 50',
      'localNLP.maxBatchSize'
    ));
  }

  if (config.intentLabels.length === 0) {
    errors.push(new ConfigurationError(
      'intentLabels cannot be empty',
      'localNLP.intentLabels'
    ));
  }

  return errors;
};

// Performance Configuration Validation
export const validatePerformanceConfig = (config: PerformanceConfig): ConfigurationError[] => {
  const errors: ConfigurationError[] = [];

  if (config.embeddingCacheSize < 100 || config.embeddingCacheSize > 10000) {
    errors.push(new ConfigurationError(
      'embeddingCacheSize must be between 100 and 10000',
      'performance.embeddingCacheSize'
    ));
  }

  if (config.resultCacheSize < 50 || config.resultCacheSize > 5000) {
    errors.push(new ConfigurationError(
      'resultCacheSize must be between 50 and 5000',
      'performance.resultCacheSize'
    ));
  }

  if (config.cacheTTL < 60 || config.cacheTTL > 86400) {
    errors.push(new ConfigurationError(
      'cacheTTL must be between 60 seconds and 24 hours',
      'performance.cacheTTL'
    ));
  }

  if (config.semanticSimilarityThreshold < 0 || config.semanticSimilarityThreshold > 1) {
    errors.push(new ConfigurationError(
      'semanticSimilarityThreshold must be between 0 and 1',
      'performance.semanticSimilarityThreshold'
    ));
  }

  if (config.minTTL >= config.maxTTL) {
    errors.push(new ConfigurationError(
      'minTTL must be less than maxTTL',
      'performance.minTTL'
    ));
  }

  if (config.minTTL < 60 || config.maxTTL > 86400) {
    errors.push(new ConfigurationError(
      'TTL values must be between 60 seconds and 24 hours',
      'performance.minTTL'
    ));
  }

  if (config.maxConcurrentRequests < 1 || config.maxConcurrentRequests > 100) {
    errors.push(new ConfigurationError(
      'maxConcurrentRequests must be between 1 and 100',
      'performance.maxConcurrentRequests'
    ));
  }

  if (config.requestTimeout < 1000 || config.requestTimeout > 60000) {
    errors.push(new ConfigurationError(
      'requestTimeout must be between 1000ms and 60000ms',
      'performance.requestTimeout'
    ));
  }

  return errors;
};

// A/B Testing Configuration Validation
export const validateABTestingConfig = (config: ABTestingConfig): ConfigurationError[] => {
  const errors: ConfigurationError[] = [];

  if (config.metricsRetentionDays < 1 || config.metricsRetentionDays > 365) {
    errors.push(new ConfigurationError(
      'metricsRetentionDays must be between 1 and 365',
      'abTesting.metricsRetentionDays'
    ));
  }

  if (config.rolloutPercentage < 0 || config.rolloutPercentage > 100) {
    errors.push(new ConfigurationError(
      'rolloutPercentage must be between 0 and 100',
      'abTesting.rolloutPercentage'
    ));
  }

  return errors;
};

// Monitoring Configuration Validation
export const validateMonitoringConfig = (config: MonitoringConfig): ConfigurationError[] => {
  const errors: ConfigurationError[] = [];

  if (config.metricsInterval < 10000 || config.metricsInterval > 300000) {
    errors.push(new ConfigurationError(
      'metricsInterval must be between 10 seconds and 5 minutes',
      'monitoring.metricsInterval'
    ));
  }

  if (config.alertThresholds.responseTime < 100 || config.alertThresholds.responseTime > 10000) {
    errors.push(new ConfigurationError(
      'alertThresholds.responseTime must be between 100ms and 10000ms',
      'monitoring.alertThresholds.responseTime'
    ));
  }

  if (config.alertThresholds.errorRate < 0 || config.alertThresholds.errorRate > 1) {
    errors.push(new ConfigurationError(
      'alertThresholds.errorRate must be between 0 and 1',
      'monitoring.alertThresholds.errorRate'
    ));
  }

  if (config.alertThresholds.cacheHitRate < 0 || config.alertThresholds.cacheHitRate > 1) {
    errors.push(new ConfigurationError(
      'alertThresholds.cacheHitRate must be between 0 and 1',
      'monitoring.alertThresholds.cacheHitRate'
    ));
  }

  if (config.alertThresholds.localNLPUsageRate < 0 || config.alertThresholds.localNLPUsageRate > 1) {
    errors.push(new ConfigurationError(
      'alertThresholds.localNLPUsageRate must be between 0 and 1',
      'monitoring.alertThresholds.localNLPUsageRate'
    ));
  }

  if (config.dashboardDataRetention < 1 || config.dashboardDataRetention > 30) {
    errors.push(new ConfigurationError(
      'dashboardDataRetention must be between 1 and 30 days',
      'monitoring.dashboardDataRetention'
    ));
  }

  return errors;
};

// Feature Flags Configuration Validation
export const validateFeatureFlagsConfig = (config: FeatureFlagsConfig): ConfigurationError[] => {
  const errors: ConfigurationError[] = [];
  
  // Feature flags are just booleans, no validation needed
  // But we can add business logic validation if needed
  
  return errors;
};

// Main Enhanced Search Configuration Validation
export const validateEnhancedSearchConfig = (config: EnhancedSearchConfig): ValidationResult => {
  const errors: ConfigurationError[] = [];
  const warnings: string[] = [];

  // Schema validation using Zod
  const schemaResult = EnhancedSearchConfigSchema.safeParse(config);
  if (!schemaResult.success) {
    schemaResult.error.issues.forEach(issue => {
      const path = issue.path.join('.');
      errors.push(new ConfigurationError(
        `Schema validation error: ${issue.message}`,
        path
      ));
    });
  }

  // Component-specific validation
  errors.push(...validateContextEnrichmentConfig(config.contextEnrichment));
  errors.push(...validateMultiVectorSearchConfig(config.multiVectorSearch));
  errors.push(...validateLocalNLPConfig(config.localNLP));
  errors.push(...validatePerformanceConfig(config.performance));
  errors.push(...validateABTestingConfig(config.abTesting));
  errors.push(...validateMonitoringConfig(config.monitoring));
  errors.push(...validateFeatureFlagsConfig(config.featureFlags));

  // Business logic validation and warnings
  if (config.abTesting.enabled && !config.abTesting.metricsTrackingEnabled) {
    warnings.push('A/B testing is enabled but metrics tracking is disabled. No metrics will be collected.');
  }

  if (config.localNLP.enabled && !config.localNLP.fallbackEnabled) {
    warnings.push('Local NLP is enabled but fallback is disabled. System may fail if models are unavailable.');
  }

  if (config.contextEnrichment.enabled && !config.contextEnrichment.cacheEnabled) {
    warnings.push('Context enrichment is enabled but caching is disabled. Performance may be impacted.');
  }

  if (config.multiVectorSearch.enabled && config.multiVectorSearch.vectorTypes.length === 1) {
    warnings.push('Multi-vector search is enabled but only one vector type is configured. Consider adding more vector types for better results.');
  }

  if (config.performance.cacheEnabled && config.performance.cacheTTL < 300) {
    warnings.push('Cache TTL is less than 5 minutes. This may result in frequent cache misses.');
  }

  if (config.monitoring.enabled && config.monitoring.metricsInterval < 30000) {
    warnings.push('Metrics interval is less than 30 seconds. This may impact performance.');
  }

  // Feature flag consistency checks
  if (config.featureFlags.contextEnrichment && !config.contextEnrichment.enabled) {
    warnings.push('Context enrichment feature flag is enabled but context enrichment is disabled in configuration.');
  }

  if (config.featureFlags.localNLP && !config.localNLP.enabled) {
    warnings.push('Local NLP feature flag is enabled but local NLP is disabled in configuration.');
  }

  if (config.featureFlags.multiVectorSearch && !config.multiVectorSearch.enabled) {
    warnings.push('Multi-vector search feature flag is enabled but multi-vector search is disabled in configuration.');
  }

  if (config.featureFlags.abTesting && !config.abTesting.enabled) {
    warnings.push('A/B testing feature flag is enabled but A/B testing is disabled in configuration.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Configuration validation with error throwing
export const validateAndThrow = (config: EnhancedSearchConfig): void => {
  const result = validateEnhancedSearchConfig(config);
  
  if (!result.isValid) {
    const errorMessage = result.errors.map(error => 
      error.field ? `${error.field}: ${error.message}` : error.message
    ).join('; ');
    
    throw new ConfigurationError(`Configuration validation failed: ${errorMessage}`);
  }
};

// All validators are already exported above, no need to re-export
