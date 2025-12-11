# Testing Guide

Comprehensive testing guide for the CodiesVibe Search API.

## Table of Contents

- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Security Tests](#security-tests)
- [Coverage Requirements](#coverage-requirements)

---

## Test Types

| Type | Description | Location | Tool |
|------|-------------|----------|------|
| **Unit** | Test individual functions/classes | `src/__tests__/unit/` | Jest |
| **Integration** | Test service integration | `src/__tests__/integration/` | Jest + MongoDB Memory Server |
| **E2E** | Test complete API flows | `src/__tests__/e2e/` | Jest + Supertest |
| **Security** | Test security validations | `test-security-validation.ts` | Custom script |

---

## Running Tests

### All Tests

```bash
npm test
```

### With Coverage

```bash
npm run test:cov
```

### Specific Test File

```bash
npm test -- --testPathPattern="schema.validator"
```

### Watch Mode

```bash
npm test -- --watch
```

### E2E Tests

```bash
npm run test:e2e
```

### Integration Tests

```bash
npm run test:integration
```

### Security Tests

```bash
npx tsx test-security-validation.ts
```

---

## Unit Tests

Test individual components in isolation.

### Example: Schema Validator Test

**File**: `src/__tests__/unit/core/validators/schema.validator.test.ts`

```typescript
import { validateDomainSchema } from '#core/validators/schema.validator';
import { toolsSchema } from '#domains/tools/tools.schema';

describe('Schema Validator', () => {
  it('should validate tools schema', () => {
    const result = validateDomainSchema(toolsSchema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid schema', () => {
    const invalid Schema = { name: 'test' };
    const result = validateDomainSchema(invalidSchema);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

### Running Unit Tests

```bash
# All unit tests
npm test -- src/__tests__/unit

# Specific file
npm test -- schema.validator
```

---

## Integration Tests

Test service integration with MongoDB Memory Server.

### Example: Vector Indexing Service Test

**File**: `src/__tests__/integration/services/vector-indexing.service.test.ts`

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import { vectorIndexingService } from '#services/vector-indexing.service';

describe('Vector Indexing Service', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it('should index tools to Qdrant', async () => {
    const result = await vectorIndexingService.indexTool(toolData);
    expect(result.success).toBe(true);
  });
});
```

### Running Integration Tests

```bash
npm run test:integration
```

---

## E2E Tests

Test complete API flows using Supertest.

### Example: Search Endpoint Test

**File**: `src/__tests__/e2e/search.e2e.test.ts`

```typescript
import request from 'supertest';
import app from '#server';

describe('POST /api/search', () => {
  it('should return search results', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'AI tools', limit: 10 })
      .expect(200);

    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toBeInstanceOf(Array);
  });

  it('should reject invalid query', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: '<script>alert("xss")</script>' })
      .expect(400);

    expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });
});
```

### Running E2E Tests

```bash
npm run test:e2e

# Watch mode
npm run test:e2e:watch
```

---

## Security Tests

Test security validations against malicious patterns.

### Running Security Tests

```bash
npx tsx test-security-validation.ts
```

**Expected Output:**
```
✅ All security validation tests PASSED!
📊 Summary:
  Malicious patterns blocked: 16/16 (100%)
  Legitimate queries allowed: 8/8 (100%)
```

### Tested Patterns

**Blocked (16 malicious patterns)**:
- XSS: `<script>alert("xss")</script>`
- Code execution: `eval(maliciousCode)`
- Command injection: `test$(whoami)test`
- SQL injection: `DROP TABLE users`

**Allowed (8 legitimate queries)**:
- `AI code completion tools`
- `best project management software`
- etc.

---

## Coverage Requirements

The project maintains the following coverage targets:

| Metric | Target | Current |
|--------|--------|---------|
| **Statements** | > 80% | Check with `npm run test:cov` |
| **Branches** | > 75% | Check with `npm run test:cov` |
| **Functions** | > 80% | Check with `npm run test:cov` |
| **Lines** | > 80% | Check with `npm run test:cov` |

### Viewing Coverage

```bash
npm run test:cov
```

Coverage report generated at: `coverage/lcov-report/index.html`

### Coverage Files

- **coverage/**: HTML coverage report
- **coverage/lcov.info**: LCOV format for CI/CD

---

## Writing Tests

### Test File Naming

```
ComponentName.test.ts           # Unit test
ComponentName.integration.test.ts # Integration test
ComponentName.e2e.test.ts       # E2E test
```

### Test Structure

```typescript
describe('Component/Feature Name', () => {
  // Setup
  beforeAll(() => {
    // One-time setup
  });

  beforeEach(() => {
    // Per-test setup
  });

  afterEach(() => {
    // Per-test cleanup
  });

  afterAll(() => {
    // One-time cleanup
  });

  describe('Method/Function Name', () => {
    it('should do something specific', () => {
      // Arrange
      const input = { ... };

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Mocking

```typescript
// Mock external service
jest.mock('#services/embedding.service', () => ({
  generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, ...])
}));

// Mock environment variables
process.env.TOGETHER_API_KEY = 'test_key';
```

---

[← Back to README](../README.md)
