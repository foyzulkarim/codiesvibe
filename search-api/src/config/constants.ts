// Embedding configuration
export const embeddingConfig = {
  dimensions: 768, // Together AI m2-bert-80M-32k-retrieval dimensions
  batchSize: 10,
  cacheEnabled: process.env.ENABLE_CACHE === "true",
  cacheTTL: parseInt(process.env.CACHE_TTL || "3600"), // seconds
  model: "togethercomputer/m2-bert-80M-32k-retrieval",
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