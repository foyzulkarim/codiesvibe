/**
 * Jest Test Setup
 * Global configuration and setup for all tests
 *
 * NOTE: Environment variables are loaded from .env.test via setup-env.ts
 * which runs before this file (via setupFiles in jest.config.js)
 */

// ==============================================================================
// GLOBAL MOCKS - External API Services
// ==============================================================================
// Mock embedding service to prevent tests from calling real Together AI API
// Even though .env.test has a test API key, it's not a valid key, so real API calls fail.
// This mock ensures no network calls are made during tests.
jest.mock('../services/embedding/embedding.service', () => {
  const mockGenerateEmbedding = jest.fn().mockResolvedValue(
    Array(768).fill(0).map((_, i) => i * 0.001) // Deterministic 768-dim vector
  );
  const mockGenerateEmbeddings = jest.fn().mockImplementation(async (texts: string[]) =>
    texts.map((_, i) => Array(768).fill(0).map((_, j) => (i + j) * 0.001))
  );

  return {
    EmbeddingService: jest.fn().mockImplementation(() => ({
      generateEmbedding: mockGenerateEmbedding,
      generateEmbeddings: mockGenerateEmbeddings,
      clearCache: jest.fn(),
      initialize: jest.fn().mockResolvedValue(undefined),
      getModelInfo: jest.fn().mockReturnValue({
        model: 'mock-model',
        dimensions: 768,
        provider: 'Mock',
      }),
      test: jest.fn().mockResolvedValue(true),
      getCacheStats: jest.fn().mockReturnValue({ size: 0, enabled: false }),
    })),
    embeddingService: {
      generateEmbedding: mockGenerateEmbedding,
      generateEmbeddings: mockGenerateEmbeddings,
      clearCache: jest.fn(),
      initialize: jest.fn().mockResolvedValue(undefined),
      getModelInfo: jest.fn().mockReturnValue({
        model: 'mock-model',
        dimensions: 768,
        provider: 'Mock',
      }),
      test: jest.fn().mockResolvedValue(true),
      getCacheStats: jest.fn().mockReturnValue({ size: 0, enabled: false }),
    },
  };
});

// ==============================================================================
// GLOBAL MOCKS - Database Connections
// ==============================================================================
// Mock Qdrant connection to prevent tests from trying to connect to real Qdrant
// This is critical for CI/CD where Qdrant may not be available
jest.mock('../config/database', () => {
  const mockQdrantClient = {
    getCollections: jest.fn().mockResolvedValue({ collections: [] }),
    createCollection: jest.fn().mockResolvedValue(undefined),
    upsert: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([]),
    retrieve: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteCollection: jest.fn().mockResolvedValue(undefined),
  };

  return {
    connectToQdrant: jest.fn().mockResolvedValue(mockQdrantClient),
    connectToMongo: jest.fn().mockResolvedValue(undefined),
    qdrantConfig: {
      host: 'localhost',
      port: 6333,
      collectionName: 'test-collection',
    },
    getCollectionName: jest.fn().mockImplementation((type: string) => `test-${type}`),
    isSupportedVectorType: jest.fn().mockReturnValue(true),
    getSupportedVectorTypes: jest.fn().mockReturnValue(['detailed', 'functionality', 'usecases', 'interface']),
    getEnhancedCollectionName: jest.fn().mockReturnValue('test-enhanced'),
    shouldUseEnhancedCollection: jest.fn().mockReturnValue(false),
    getCollectionNameForVectorType: jest.fn().mockImplementation((type: string) => `test-${type}`),
  };
});

// ==============================================================================
// GLOBAL MOCKS - QdrantService Singleton
// ==============================================================================
// Mock QdrantService to prevent initialization and connection attempts
// This catches any code path that uses the qdrantService singleton directly
jest.mock('../services/database/qdrant.service', () => ({
  qdrantService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    upsertToolVector: jest.fn().mockResolvedValue(undefined),
    deleteToolVector: jest.fn().mockResolvedValue(undefined),
    updatePayloadOnly: jest.fn().mockResolvedValue({ success: true }),
    searchDirectOnCollection: jest.fn().mockResolvedValue([]),
    getMultiCollectionStats: jest.fn().mockResolvedValue({
      totalCollections: 4,
      healthyCollections: 4,
      totalVectors: 0,
      collections: {},
      summary: { healthy: [], unhealthy: [], missing: [] },
    }),
  },
  QdrantService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    upsertToolVector: jest.fn().mockResolvedValue(undefined),
    deleteToolVector: jest.fn().mockResolvedValue(undefined),
    updatePayloadOnly: jest.fn().mockResolvedValue({ success: true }),
    searchDirectOnCollection: jest.fn().mockResolvedValue([]),
    getMultiCollectionStats: jest.fn().mockResolvedValue({
      totalCollections: 4,
      healthyCollections: 4,
      totalVectors: 0,
      collections: {},
      summary: { healthy: [], unhealthy: [], missing: [] },
    }),
  })),
}));

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities - suppress all console output in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
