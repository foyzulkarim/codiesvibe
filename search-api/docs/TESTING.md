# Testing Strategy

## Overview

This document outlines the testing strategy for the search-api project, including unit tests, integration tests, and CI/CD considerations.

## Test Environment Setup

### Global Mocks

To ensure tests can run in any environment (local, CI/CD) without requiring external services, we use global mocks configured in `src/__tests__/setup.ts`:

#### Qdrant Database Mock

**Why**: Qdrant vector database may not be available in CI/CD environments. Services like `embeddingService` and `qdrantService` are instantiated as singletons and attempt to connect to Qdrant in their constructors.

**Solution**: Global mock in `setup.ts` that intercepts all calls to `connectToQdrant()`:

```typescript
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
    // ... other exports
  };
});
```

**Impact**: All tests that import services using Qdrant will use the mocked client instead of attempting real connections.

### Environment Variables

Critical test environment variables set in `setup.ts`:

- `NODE_ENV=test` - Enables test mode
- `TOGETHER_API_KEY=test-api-key` - Prevents API key errors
- `ENABLE_CACHE=false` - Disables caching for predictable tests
- `ENABLE_VECTOR_VALIDATION=false` - Speeds up tests
- `ENABLE_RATE_LIMITING=false` - Prevents rate limit interference
- `MONGODB_URI` - Uses in-memory MongoDB or CI service

## Test Categories

### Unit Tests

Located in `src/__tests__/unit/`, these test individual components in isolation:

- **Services**: Tool sync, content hash, CRUD operations
- **Core**: Prompt generation, schema validation
- **Middleware**: Authentication, role-based access
- **Domains**: Business logic for tools, filters

**Characteristics**:
- Fast execution (< 1s per suite)
- No external dependencies
- Heavy mocking of external services

### Integration Tests

Located in `src/__tests__/integration/`, these test complete workflows:

- **Routes**: API endpoint testing with MongoDB
- **RBAC**: Role-based access control flows
- **Sync**: MongoDB-Qdrant synchronization workflows

**Characteristics**:
- Use MongoDB Memory Server for isolation
- Mock Qdrant (not available in all environments)
- Test real HTTP requests via supertest

## Running Tests

### Locally

```bash
# All tests
npm test

# Specific test file
npm test -- tool-sync.service.test.ts

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### CI/CD Pipeline

Tests run automatically in GitHub Actions:

```bash
# In CI environment
npm run test:ci-integration
```

**CI Considerations**:
1. MongoDB runs as a service (not in-memory)
2. Qdrant is mocked (not available)
3. Together AI is mocked (no real API calls)
4. Tests must be deterministic and environment-independent

## Common Test Patterns

### Mocking Services

Individual test files can override global mocks:

```typescript
// Override global mock for specific test
jest.mock('../../../services/qdrant.service.js', () => ({
  qdrantService: {
    upsertToolVector: jest.fn().mockResolvedValue(undefined),
    deleteToolVector: jest.fn().mockResolvedValue(undefined),
  },
}));
```

### MongoDB Memory Server

For tests requiring real MongoDB operations:

```typescript
let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

### Testing Async Operations

```typescript
it('should handle async operation', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

## Troubleshooting

### "Failed to connect to Qdrant" Error

**Symptom**: Tests fail with `ECONNREFUSED` to Qdrant
**Cause**: Global mock not applied before service initialization
**Solution**: Ensure `jest.mock()` is at the top of test file or use global mock in `setup.ts`

### Tests Pass Locally but Fail in CI

**Common Causes**:
1. **Timing Issues**: Use `jest.setTimeout()` for slow tests
2. **Environment Variables**: Check CI secrets and environment setup
3. **External Services**: Ensure all external services are mocked
4. **File Paths**: Use path utilities for cross-platform compatibility

### MongoDB Connection Issues

**Symptom**: `MongooseError: Operation buffering timed out`
**Solution**: Ensure MongoDB is connected before running tests:

```typescript
await mongoose.connection.asPromise();
```

## Test Coverage

Current coverage requirements (configured in `jest.config.js`):

- **Branches**: 65%
- **Functions**: 75%
- **Lines**: 70%
- **Statements**: 70%

View coverage report:
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

## Best Practices

### Do's ✅

- Mock all external services (databases, APIs, file system)
- Use MongoDB Memory Server for database tests
- Clear mocks between tests with `jest.clearAllMocks()`
- Test both success and error paths
- Use descriptive test names that explain what's being tested
- Group related tests with `describe` blocks
- Keep tests fast (< 10s per suite)

### Don'ts ❌

- Don't connect to real external services in tests
- Don't rely on test execution order
- Don't use hardcoded timeouts (use `jest.setTimeout()`)
- Don't skip cleanup in `afterEach`/`afterAll`
- Don't test implementation details, test behavior
- Don't commit `.only()` or `.skip()` to version control

## Debugging Tests

### Run Single Test

```bash
npm test -- -t "should sync tool to all collections"
```

### Debug with Node Inspector

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Detect Open Handles

```bash
npm test -- --detectOpenHandles
```

### Verbose Output

```bash
npm test -- --verbose
```

## Continuous Improvement

- Monitor test execution time and optimize slow tests
- Update mocks when external APIs change
- Add tests for new features before implementation (TDD)
- Review and update test coverage regularly
- Refactor tests when they become brittle or hard to maintain
