// Export existing configurations
export * from './constants';
export * from './database';
export * from './models';

// Export enhanced search configurations
export * from './enhanced-search-config';
export * from './config-validator';

// Import dependencies for initialization
import { 
  EnhancedSearchConfig, 
  defaultEnhancedSearchConfig, 
  getEnhancedSearchConfigFromEnv 
} from './enhanced-search-config';
import { validateAndThrow, ValidationResult } from './config-validator';
import fs from 'fs';
import path from 'path';

// Global configuration instance
let enhancedSearchConfig: EnhancedSearchConfig | null = null;

/**
 * Initialize enhanced search configuration with environment variables and validation
 * @param configPath Optional path to configuration file
 * @returns Validated enhanced search configuration
 */
export const initializeEnhancedSearchConfig = (configPath?: string): EnhancedSearchConfig => {
  // Start with default configuration
  let config = { ...defaultEnhancedSearchConfig };

  // Override with environment variables
  const envConfig = getEnhancedSearchConfigFromEnv();
  config = mergeConfig(config, envConfig);

  // Override with configuration file if provided
  if (configPath && fs.existsSync(configPath)) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config = mergeConfig(config, fileConfig);
    } catch (error) {
      console.warn(`Failed to load configuration from ${configPath}:`, error);
    }
  }

  // Validate the final configuration
  try {
    validateAndThrow(config);
    enhancedSearchConfig = config;
    console.log('Enhanced search configuration initialized successfully');
    return config;
  } catch (error) {
    console.error('Enhanced search configuration validation failed:', error);
    throw error;
  }
};

/**
 * Get the current enhanced search configuration
 * @returns Current configuration or throws if not initialized
 */
export const getEnhancedSearchConfig = (): EnhancedSearchConfig => {
  if (!enhancedSearchConfig) {
    throw new Error('Enhanced search configuration not initialized. Call initializeEnhancedSearchConfig() first.');
  }
  return enhancedSearchConfig;
};

/**
 * Update enhanced search configuration at runtime
 * @param newConfig Partial configuration to merge
 * @param validate Whether to validate the configuration (default: true)
 * @returns Updated configuration
 */
export const updateEnhancedSearchConfig = (
  newConfig: Partial<EnhancedSearchConfig>, 
  validate: boolean = true
): EnhancedSearchConfig => {
  if (!enhancedSearchConfig) {
    throw new Error('Enhanced search configuration not initialized. Call initializeEnhancedSearchConfig() first.');
  }

  const updatedConfig = mergeConfig(enhancedSearchConfig, newConfig);

  if (validate) {
    try {
      validateAndThrow(updatedConfig);
    } catch (error) {
      console.error('Enhanced search configuration update validation failed:', error);
      throw error;
    }
  }

  enhancedSearchConfig = updatedConfig;
  console.log('Enhanced search configuration updated successfully');
  return updatedConfig;
};

/**
 * Validate enhanced search configuration without throwing
 * @param config Configuration to validate
 * @returns Validation result with errors and warnings
 */
export const validateEnhancedSearchConfigSafe = (config: EnhancedSearchConfig): ValidationResult => {
  const { validateEnhancedSearchConfig } = require('./config-validator');
  return validateEnhancedSearchConfig(config);
};

/**
 * Load experiments configuration from JSON file
 * @param experimentsPath Path to experiments.json file
 * @returns Parsed experiments configuration
 */
export const loadExperimentsConfig = (experimentsPath?: string): any => {
  const defaultPath = path.join(__dirname, 'experiments.json');
  const configPath = experimentsPath || defaultPath;

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('Experiments configuration loaded successfully');
      return config;
    } catch (error) {
      console.error(`Failed to load experiments configuration from ${configPath}:`, error);
      throw error;
    }
  } else {
    console.warn(`Experiments configuration file not found at ${configPath}`);
    return { experiments: [], metadata: { version: '1.0' } };
  }
};

/**
 * Get feature flags from current configuration
 * @returns Feature flags object
 */
export const getFeatureFlags = () => {
  const config = getEnhancedSearchConfig();
  return config.featureFlags;
};

/**
 * Check if a specific feature is enabled
 * @param featureName Name of the feature to check
 * @returns Whether the feature is enabled
 */
export const isFeatureEnabled = (featureName: keyof typeof defaultEnhancedSearchConfig.featureFlags): boolean => {
  const config = getEnhancedSearchConfig();
  return config.featureFlags[featureName];
};

/**
 * Get configuration for a specific component
 * @param componentName Name of the component (contextEnrichment, localNLP, etc.)
 * @returns Component configuration
 */
export const getComponentConfig = <T extends keyof EnhancedSearchConfig>(
  componentName: T
): EnhancedSearchConfig[T] => {
  const config = getEnhancedSearchConfig();
  return config[componentName];
};

/**
 * Reset configuration to defaults
 * @param validate Whether to validate the reset configuration (default: true)
 * @returns Reset configuration
 */
export const resetToDefaultConfig = (validate: boolean = true): EnhancedSearchConfig => {
  const config = { ...defaultEnhancedSearchConfig };
  
  if (validate) {
    try {
      validateAndThrow(config);
    } catch (error) {
      console.error('Default configuration validation failed:', error);
      throw error;
    }
  }

  enhancedSearchConfig = config;
  console.log('Enhanced search configuration reset to defaults');
  return config;
};

/**
 * Export configuration to JSON file
 * @param filePath Path to export configuration
 * @param config Optional configuration to export (uses current if not provided)
 */
export const exportConfigToFile = (filePath: string, config?: EnhancedSearchConfig): void => {
  const configToExport = config || getEnhancedSearchConfig();
  
  try {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(configToExport, null, 2));
    console.log(`Configuration exported to ${filePath}`);
  } catch (error) {
    console.error(`Failed to export configuration to ${filePath}:`, error);
    throw error;
  }
};

/**
 * Get configuration summary for logging/debugging
 * @returns Configuration summary with sensitive values masked
 */
export const getConfigSummary = (): any => {
  const config = getEnhancedSearchConfig();
  
  return {
    version: config.version,
    features: {
      contextEnrichment: config.contextEnrichment.enabled,
      localNLP: config.localNLP.enabled,
      multiVectorSearch: config.multiVectorSearch.enabled,
      abTesting: config.abTesting.enabled,
      monitoring: config.monitoring.enabled,
    },
    performance: {
      cacheEnabled: config.performance.cacheEnabled,
      maxConcurrentRequests: config.performance.maxConcurrentRequests,
      requestTimeout: config.performance.requestTimeout,
    },
    monitoring: {
      enabled: config.monitoring.enabled,
      metricsInterval: config.monitoring.metricsInterval,
      alertThresholds: config.monitoring.alertThresholds,
    }
  };
};

// Helper function to merge configurations
function mergeConfig<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  
  for (const key in override) {
    const overrideValue = override[key];
    const baseValue = result[key];
    
    if (overrideValue === undefined) {
      continue;
    }
    
    if (
      overrideValue !== null && 
      typeof overrideValue === 'object' && 
      !Array.isArray(overrideValue) &&
      baseValue !== null && 
      typeof baseValue === 'object' && 
      !Array.isArray(baseValue)
    ) {
      // Deep merge for objects
      result[key] = mergeConfig(baseValue, overrideValue as any);
    } else {
      // Direct assignment for primitives and arrays
      result[key] = overrideValue as any;
    }
  }
  
  return result;
}

// Initialize configuration if this module is imported directly
if (require.main === module) {
  try {
    console.log('Initializing enhanced search configuration...');
    initializeEnhancedSearchConfig();
    console.log('Configuration summary:', getConfigSummary());
  } catch (error) {
    console.error('Failed to initialize configuration:', error);
    process.exit(1);
  }
}
