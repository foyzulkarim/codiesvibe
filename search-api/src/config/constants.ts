import { CONFIG } from './env.config.js';

// Embedding configuration
export const embeddingConfig = {
  dimensions: 768, // Together AI m2-bert-80M-32k-retrieval dimensions
  batchSize: 10,
  cacheEnabled: CONFIG.features.ENABLE_CACHE,
  cacheTTL: CONFIG.features.CACHE_TTL, // seconds
  model: "togethercomputer/m2-bert-80M-32k-retrieval",
};

// Vocabularies moved to #domains/tools/index.ts
// Import: toolsSchema.vocabularies, enumValues, TOOLS_PRICE_OPERATORS