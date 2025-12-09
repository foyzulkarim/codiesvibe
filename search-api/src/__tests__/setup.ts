/**
 * Jest Test Setup
 * Global configuration and setup for all tests
 */

// Configure MongoDB Memory Server settings
// These are used when MongoDB Memory Server is needed for testing
// In CI, MongoDB runs as a service and tests connect via MONGODB_URI
process.env.MONGOMS_DOWNLOAD_MIRROR = 'https://fastdl.mongodb.org';
process.env.MONGOMS_VERSION = '6.0.15';

// Set test environment variables
process.env.NODE_ENV = 'test';
// Use CI's MongoDB service if available, otherwise tests needing MongoDB will be skipped
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
process.env.QDRANT_HOST = 'localhost';
process.env.QDRANT_PORT = '6333';
process.env.TOGETHER_API_KEY = 'test-api-key';
process.env.VLLM_BASE_URL = 'http://localhost:8000';
process.env.ENABLE_CACHE = 'false';
process.env.ENABLE_VECTOR_VALIDATION = 'false';
process.env.ENABLE_RATE_LIMITING = 'false';
process.env.ENABLE_SECURITY_HEADERS = 'false';

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

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.console = {
  ...console,
  // Suppress console output in tests unless explicitly needed
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Keep errors visible
  debug: jest.fn(),
};

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
