// Confidence thresholds
export const confidenceThresholds = {
  high: 0.8,
  medium: 0.5,
  low: 0.3,
};

// Quality thresholds
export const qualityThresholds = {
  minResults: 3,
  maxResults: 20,
  minRelevance: 0.6,
  minCategoryDiversity: 0.3,
};

// Maximum iterations
export const maxIterations = {
  refinement: 2,
  expansion: 2,
};

// Embedding configuration
export const embeddingConfig = {
  dimensions: 1024, // Size of mxbai-embed-large embeddings
  batchSize: 10,
  cacheEnabled: process.env.ENABLE_CACHE === "true",
  cacheTTL: parseInt(process.env.CACHE_TTL || "3600"), // seconds
};

// Enum values for various tool attributes
export const enumValues = {
  categories: [
    "development", "design", "productivity", "communication",
    "marketing", "analytics", "security", "infrastructure", "other"
  ],
  functionality: [
    "code-editing", "version-control", "testing", "deployment",
    "ui-design", "wireframing", "collaboration", "automation",
    "monitoring", "documentation", "other"
  ],
  userTypes: [
    "developer", "designer", "product-manager", "marketer",
    "analyst", "administrator", "other"
  ],
  interface: [
    "web", "desktop", "mobile", "cli", "api", "other"
  ],
  deployment: [
    "cloud", "self-hosted", "hybrid", "other"
  ],
  pricingModel: [
    "free", "freemium", "subscription", "one-time", "other"
  ],
};

// Function mappings
export const functionMappings = {
  "lookup-by-name": "nodes/functions/lookup-by-name",
  "semantic-search": "nodes/functions/semantic-search",
  "filter-by-price": "nodes/functions/filter-by-price",
  "filter-by-category": "nodes/functions/filter-by-category",
  "filter-by-interface": "nodes/functions/filter-by-interface",
  "filter-by-functionality": "nodes/functions/filter-by-functionality",
  "filter-by-user-type": "nodes/functions/filter-by-user-type",
  "filter-by-deployment": "nodes/functions/filter-by-deployment",
  "find-similar-by-features": "nodes/functions/find-similar-by-features",
  "exclude-tools": "nodes/functions/exclude-tools",
  "merge-and-dedupe": "nodes/functions/merge-and-dedupe",
  "rank-by-relevance": "nodes/functions/rank-by-relevance",
};

// Logging configuration
export const logConfig = {
  level: process.env.LOG_LEVEL || "info",
  colors: true,
  timestamp: true,
};