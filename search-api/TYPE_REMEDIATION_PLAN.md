# Comprehensive TypeScript `any` Type Remediation Plan

**Project:** CodiesVibe Search API
**Current Status:** 254 `any` type warnings across 50+ files
**Goal:** Replace all `any` types with proper TypeScript types while maintaining functionality

---

## Executive Summary

This plan outlines a **systematic, phased approach** to eliminate `any` types from the codebase. The strategy follows a **dependency-first, bottom-up** methodology, ensuring that foundational types are established before propagating them through the service layer.

### Key Principles

1. **Never break existing functionality** - All changes must pass existing tests
2. **Trace data flow** - Understand the complete lifecycle of data before typing
3. **Prefer narrower types** - Use `unknown` over `any`, specific types over generics
4. **Document assumptions** - When creating types for external APIs, document source
5. **Incremental commits** - Commit after each logical unit of work

---

## Analysis: Categories of `any` Usage

### 1. External Library Types (68 instances)
**Files:** `qdrant.d.ts` (9), `qdrant.service.ts` (44), `mongodb.service.ts` (12)

**Issue:** Third-party libraries lack complete type definitions
- Qdrant payload objects
- MongoDB query filters and aggregations
- Collection metadata responses

### 2. Result/Response Objects (65 instances)
**Files:** `result-deduplication.ts` (45), `execution-plan-safety-validator.ts` (20)

**Issue:** Generic result types used across multiple domains
- Search results with dynamic payloads
- Deduplication results
- Query execution responses

### 3. Circuit Breaker & Resilience (17 instances)
**Files:** `circuit-breaker.service.ts` (17)

**Issue:** Generic error handling and function wrapping
- Error types in catch blocks
- Generic function return types
- State management

### 4. Middleware & Express (15 instances)
**Files:** `tools.routes.ts` (11), `clerk-auth.middleware.ts` (2), `timeout.middleware.ts` (5)

**Issue:** Express Request/Response extensions
- Custom request properties
- Route handler types
- Error middleware

### 5. Logging & Metadata (13 instances)
**Files:** `logger.ts` (6), `correlation-context.ts` (3), `debug.ts` (1)

**Issue:** Dynamic metadata objects
- Log metadata
- Correlation context
- Debug utilities

### 6. Error Handling (30+ instances across codebase)
**Issue:** Catch blocks default to `any` instead of `unknown`

### 7. Utility Functions (25+ instances)
**Files:** Various utils, validators, and helpers

**Issue:** Generic utility functions working with arbitrary objects

---

## Phase 1: Foundation - Type Infrastructure (Week 1)

### 1.1 Fix Type Definition Files
**Priority:** CRITICAL | **Estimated:** 2 days

**Files to modify:**
- `src/types/qdrant.d.ts` ✓ Enhance Qdrant type definitions
- Create `src/types/mongodb.types.ts` ✓ MongoDB-specific types
- Create `src/types/express.types.ts` ✓ Express middleware types
- Create `src/types/external-services.types.ts` ✓ Third-party service types

**Tasks:**
1. **Enhance Qdrant Types** (`qdrant.d.ts`)
   ```typescript
   // BEFORE: payload?: any
   // AFTER:
   export interface QdrantPayload {
     [key: string]: QdrantPayloadValue;
   }

   export type QdrantPayloadValue =
     | string
     | number
     | boolean
     | null
     | QdrantPayloadValue[]
     | { [key: string]: QdrantPayloadValue };

   export interface QdrantPoint<T = QdrantPayload> {
     id: string | number;
     vector?: number[] | { [vectorName: string]: number[] };
     payload?: T;
   }
   ```

2. **Create MongoDB Types** (new file)
   ```typescript
   import type { Filter, Document, UpdateFilter, FindOptions } from 'mongodb';

   export interface MongoDBFilter<T extends Document = Document> extends Filter<T> {}

   export interface MongoDBUpdate<T extends Document = Document> extends UpdateFilter<T> {}

   export interface MongoDBFindOptions<T extends Document = Document> extends FindOptions<T> {}

   export interface MongoDBQueryResult<T extends Document = Document> {
     results: T[];
     total: number;
     page?: number;
     limit?: number;
   }
   ```

3. **Create Express Extension Types** (new file)
   ```typescript
   import type { Request, Response, NextFunction } from 'express';

   export interface AuthenticatedRequest extends Request {
     auth?: {
       userId: string;
       sessionId: string;
       claims: Record<string, unknown>;
     };
   }

   export interface CorrelatedRequest extends Request {
     correlationId?: string;
     requestId?: string;
   }

   export type AppRequest = AuthenticatedRequest & CorrelatedRequest;

   export interface ErrorWithStatus extends Error {
     status?: number;
     statusCode?: number;
   }
   ```

4. **Create Circuit Breaker Types** (new file)
   ```typescript
   export interface CircuitBreakerOptions {
     timeout: number;
     errorThresholdPercentage: number;
     resetTimeout: number;
     name: string;
   }

   export type CircuitBreakerFunction<TArgs extends unknown[], TReturn> =
     (...args: TArgs) => Promise<TReturn>;

   export interface CircuitBreakerState {
     open: boolean;
     halfOpen: boolean;
     closed: boolean;
     failures: number;
     successes: number;
   }
   ```

**Validation:** Run `npm run typecheck` after each file

---

### 1.2 Standardize Error Handling Pattern
**Priority:** HIGH | **Estimated:** 1 day

**Goal:** Replace all `catch (error: any)` with proper error handling

**Pattern to implement:**
```typescript
// BEFORE
try {
  // ...
} catch (error: any) {
  logger.error(error.message);
}

// AFTER
try {
  // ...
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;
  logger.error({ message: errorMessage, stack: errorStack });
}
```

**Utility to create:**
```typescript
// src/utils/error-handling.ts
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function getErrorMessage(error: unknown): string {
  if (isError(error)) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

export function getErrorStack(error: unknown): string | undefined {
  return isError(error) ? error.stack : undefined;
}

export interface SerializedError {
  message: string;
  name?: string;
  stack?: string;
  code?: string | number;
}

export function serializeError(error: unknown): SerializedError {
  if (isError(error)) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: (error as NodeJS.ErrnoException).code,
    };
  }

  return {
    message: getErrorMessage(error),
  };
}
```

**Files to update:** All files with catch blocks (~30+ files)
**Approach:** Use global find/replace with manual verification

---

### 1.3 Fix Logger Metadata Types
**Priority:** MEDIUM | **Estimated:** 0.5 days

**File:** `src/config/logger.ts`

**Create logger types:**
```typescript
// src/types/logger.types.ts
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface LogMetadata {
  [key: string]: LogMetadataValue;
}

export type LogMetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | LogMetadataValue[]
  | { [key: string]: LogMetadataValue };

export interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: LogMetadata;
  correlationId?: string;
  userId?: string;
  error?: SerializedError;
}
```

**Update logger.ts:**
```typescript
import { LogMetadata } from '#types/logger.types';

// Replace all `any` with LogMetadata
export const logger = {
  error(message: string, metadata?: LogMetadata): void { /* ... */ },
  warn(message: string, metadata?: LogMetadata): void { /* ... */ },
  // etc.
};
```

---

## Phase 2: Core Domain Types (Week 2)

### 2.1 Audit & Enhance Existing Types
**Priority:** HIGH | **Estimated:** 2 days

**Files to audit:**
- `src/types/tool.types.ts` ✓ Tool domain types
- `src/types/intent.ts` ✓ Intent extraction types
- `src/types/plan.ts` ✓ Query planning types
- `src/types/state.ts` ✓ Graph state types
- `src/types/enhanced-state.ts` ✓ Enhanced state types

**Tasks:**
1. **Review each type file for:**
   - `any` usage (currently 4 instances in tool.types.ts)
   - Missing type constraints
   - Incomplete interfaces

2. **Create missing types:**
   ```typescript
   // src/types/search.types.ts (NEW)
   export interface SearchQuery {
     query: string;
     limit?: number;
     offset?: number;
     filters?: SearchFilters;
   }

   export interface SearchFilters {
     categories?: string[];
     tags?: string[];
     pricing?: ('free' | 'paid' | 'freemium')[];
     minRating?: number;
   }

   export interface SearchResult<T = ToolPayload> {
     id: string;
     score: number;
     payload: T;
     vectorType?: string;
     source?: string;
   }

   export interface SearchResponse<T = ToolPayload> {
     results: SearchResult<T>[];
     total: number;
     query: string;
     executionTime: number;
     vectorTypes?: string[];
   }
   ```

3. **Create Tool Payload Type** (specific replacement for `any`)
   ```typescript
   // src/types/tool-payload.types.ts (NEW)
   export interface ToolPayload {
     toolId: string;
     name: string;
     description: string;
     category: string;
     url?: string;
     pricing?: 'free' | 'paid' | 'freemium';
     tags?: string[];
     rating?: number;
     features?: string[];
     // ... complete based on actual tool schema
   }

   export interface ToolDocument extends ToolPayload {
     _id: string;
     createdAt: Date;
     updatedAt: Date;
     vectorized?: boolean;
   }
   ```

---

### 2.2 Create Vector/Embedding Types
**Priority:** HIGH | **Estimated:** 1 day

**File:** Create `src/types/vector.types.ts`

```typescript
export type VectorType =
  | 'semantic'
  | 'categories'
  | 'functionality'
  | 'aliases'
  | 'composites';

export interface VectorEmbedding {
  type: VectorType;
  vector: number[];
  model: string;
  dimensions: number;
}

export interface VectorSearchParams {
  vector: number[];
  vectorType?: VectorType;
  limit?: number;
  scoreThreshold?: number;
  filter?: QdrantPayload;
}

export interface VectorSearchResult<T = ToolPayload> {
  id: string;
  score: number;
  vectorType: VectorType;
  payload: T;
}

export interface MultiVectorSearchResult<T = ToolPayload> {
  results: Map<VectorType, VectorSearchResult<T>[]>;
  fusedResults: VectorSearchResult<T>[];
  rrfScores: Map<string, number>;
}
```

---

### 2.3 Create Result Deduplication Types
**Priority:** HIGH | **Estimated:** 1 day

**File:** `src/utils/result-deduplication.ts` (REFACTOR)

**Current issues:** 45 `any` instances in result objects

**Solution:**
```typescript
// Make ResultDeduplicator generic
export interface DeduplicationConfig<T = ToolPayload> {
  similarityThreshold: number;
  strategy: 'id_based' | 'content_based' | 'hybrid' | 'rrf_enhanced';
  fields: (keyof T)[];  // Type-safe field names
  weights: Partial<Record<keyof T, number>>;
  rrfKValue: number;
  enableScoreMerging: boolean;
  enableSourceAttribution: boolean;
  vectorTypeThresholds: Record<string, number>;
  batchSize: number;
  enableParallelProcessing: boolean;
}

export interface DeduplicationResult<T = ToolPayload> {
  uniqueResults: T[];  // NOT any[]
  duplicatesRemoved: number;
  deduplicationTime: number;
  similarityThreshold: number;
  strategy: string;
  totalResultsProcessed: number;
  averageMergedScore: number;
  sourceAttributionSummary: Record<string, number>;
}

export interface RRFMergeResult<T = ToolPayload> {
  id: string;
  result: T;  // NOT any
  rrfScore: number;
  weightedScore: number;
  sources: SourceAttribution[];
  mergedFromCount: number;
}

export class ResultDeduplicator<T = ToolPayload> {
  private config: DeduplicationConfig<T>;

  constructor(config: Partial<DeduplicationConfig<T>> = {}) {
    // ... implementation
  }

  deduplicate(results: T[]): DeduplicationResult<T> {
    // ... implementation
  }
}
```

---

## Phase 3: Service Layer (Week 3-4)

### 3.1 Fix Qdrant Service (44 `any` instances)
**Priority:** CRITICAL | **Estimated:** 3 days

**File:** `src/services/qdrant.service.ts`

**Strategy:**
1. Use enhanced Qdrant types from Phase 1.1
2. Make service methods generic where appropriate
3. Use proper type constraints for MongoDB integration

**Example refactoring:**
```typescript
// BEFORE
export interface CollectionInfo {
  optimizerStatus?: any;
  config?: any;
}

// AFTER
import { QdrantPayload, QdrantCollectionInfo } from '#types/qdrant.d.ts';

export interface CollectionInfo extends QdrantCollectionInfo {
  name: string;
  exists: boolean;
  pointsCount: number;
  vectorSize: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
  status: 'green' | 'yellow' | 'red';
  optimizerStatus?: OptimizerStatus;
  indexedVectorsCount?: number;
  config?: CollectionConfig;
}

export interface OptimizerStatus {
  ok: boolean;
  error?: string;
  status?: string;
}

export interface CollectionConfig {
  params: {
    vectors: VectorParams | Record<string, VectorParams>;
    shard_number?: number;
    replication_factor?: number;
  };
}

export interface VectorParams {
  size: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
}
```

**Key methods to type:**
```typescript
// Make search generic
async search<T extends QdrantPayload = ToolPayload>(
  collectionName: string,
  params: VectorSearchParams
): Promise<VectorSearchResult<T>[]>

// Type upsert properly
async upsert<T extends QdrantPayload = ToolPayload>(
  collectionName: string,
  points: QdrantPoint<T>[]
): Promise<UpsertResult>
```

---

### 3.2 Fix MongoDB Service (12 `any` instances)
**Priority:** HIGH | **Estimated:** 2 days

**File:** `src/services/mongodb.service.ts`

**Strategy:**
1. Use MongoDB's built-in types from `mongodb` package
2. Apply proper generic constraints
3. Leverage Zod schemas where they exist

**Example refactoring:**
```typescript
import type { Document, Filter, UpdateFilter, FindOptions } from 'mongodb';

// BEFORE
async find(collection: string, query: any, options?: any): Promise<any[]>

// AFTER
async find<T extends Document = Document>(
  collection: string,
  query: Filter<T>,
  options?: FindOptions<T>
): Promise<T[]>

// BEFORE
async updateOne(collection: string, filter: any, update: any): Promise<any>

// AFTER
async updateOne<T extends Document = Document>(
  collection: string,
  filter: Filter<T>,
  update: UpdateFilter<T>
): Promise<UpdateResult>
```

---

### 3.3 Fix Circuit Breaker Service (17 `any` instances)
**Priority:** MEDIUM | **Estimated:** 1.5 days

**File:** `src/services/circuit-breaker.service.ts`

**Strategy:** Use generic type parameters for wrapped functions

**Example refactoring:**
```typescript
// BEFORE
async execute(fn: () => Promise<any>): Promise<any>

// AFTER
async execute<T>(fn: () => Promise<T>): Promise<T>

// BEFORE
wrap(fn: (...args: any[]) => Promise<any>): (...args: any[]) => Promise<any>

// AFTER
wrap<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn>
```

**Create types:**
```typescript
// Use types from Phase 1.1
import { CircuitBreakerFunction, CircuitBreakerState } from '#types/external-services.types';

class CircuitBreaker<TArgs extends unknown[] = unknown[], TReturn = unknown> {
  async execute(fn: CircuitBreakerFunction<TArgs, TReturn>): Promise<TReturn> {
    // Implementation
  }
}
```

---

### 3.4 Fix Other Services
**Priority:** MEDIUM | **Estimated:** 3 days

**Files:**
- `plan-cache.service.ts` (7 instances)
- `multi-collection-orchestrator.service.ts` (6 instances)
- `vector-seeding.service.ts` (5 instances)
- `vector-indexing.service.ts` (5 instances)
- `enhanced-vector-indexing.service.ts` (4 instances)

**Approach for each:**
1. Identify the actual types being used
2. Create proper interfaces
3. Apply generic constraints where needed
4. Update method signatures

---

## Phase 4: Integration Layer (Week 5)

### 4.1 Fix Route Handlers (11 `any` instances)
**Priority:** HIGH | **Estimated:** 2 days

**File:** `src/routes/tools.routes.ts`

**Strategy:** Use Express types from Phase 1.1

**Example refactoring:**
```typescript
import { AppRequest } from '#types/express.types';
import { ToolPayload, ToolDocument } from '#types/tool-payload.types';

// BEFORE
router.get('/:id', async (req: any, res: any) => {
  const tool = await toolService.findById(req.params.id);
  res.json(tool);
});

// AFTER
router.get('/:id', async (req: AppRequest, res: Response) => {
  const toolId = req.params.id;
  const tool: ToolDocument | null = await toolService.findById(toolId);

  if (!tool) {
    return res.status(404).json({ error: 'Tool not found' });
  }

  res.json(tool);
});
```

---

### 4.2 Fix Middleware (7 `any` instances)
**Priority:** HIGH | **Estimated:** 1.5 days

**Files:**
- `clerk-auth.middleware.ts` (2 instances)
- `timeout.middleware.ts` (5 instances)
- `correlation.middleware.ts` (2 instances)
- `error-handler.middleware.ts` (2 instances)

**Example refactoring:**
```typescript
// clerk-auth.middleware.ts
import { AppRequest, ErrorWithStatus } from '#types/express.types';

export function requireAuth(req: AppRequest, res: Response, next: NextFunction): void {
  if (!req.auth) {
    const error: ErrorWithStatus = new Error('Unauthorized');
    error.status = 401;
    return next(error);
  }
  next();
}

// error-handler.middleware.ts
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const serialized = serializeError(error);
  const status = (error as ErrorWithStatus).status || 500;

  res.status(status).json({
    error: serialized.message,
    ...(process.env.NODE_ENV === 'development' && { stack: serialized.stack })
  });
}
```

---

### 4.3 Fix Graph Nodes (3 `any` instances)
**Priority:** MEDIUM | **Estimated:** 1 day

**Files:**
- `agentic-search.graph.ts` (1 instance)
- `core/pipeline.init.ts` (2 instances)

**Strategy:** Use existing state types, fix validation functions

---

## Phase 5: Utilities & Helpers (Week 6)

### 5.1 Fix Utility Functions
**Priority:** LOW-MEDIUM | **Estimated:** 3 days

**Files with `any` types:**
- `execution-plan-safety-validator.ts` (20 instances)
- `vector-validation.ts` (8 instances)
- `llm-response-handler.ts` (4 instances)
- `thread-manager.ts` (3 instances)
- `state-validator.ts` (3 instances)
- `correlation-context.ts` (3 instances)
- `result-deduplication.ts` (already covered in Phase 2.3)

**Strategy:**
- Create specific types for each utility domain
- Use generics where utilities are reusable
- Apply proper type guards and validations

---

### 5.2 Fix Debug Scripts
**Priority:** LOW | **Estimated:** 1 day

**Files:** All files in `src/debug-scripts/`

**Note:** These are lower priority since they're not production code, but should still be typed for consistency.

---

## Phase 6: Validation & Cleanup (Week 6-7)

### 6.1 Comprehensive Type Checking
**Priority:** CRITICAL | **Estimated:** 2 days

**Tasks:**
1. Run `npm run typecheck` on entire codebase
2. Fix any new type errors introduced by changes
3. Ensure no implicit `any` types remain
4. Verify strict mode compliance

**Add to tsconfig.json if not present:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

### 6.2 Run Full Test Suite
**Priority:** CRITICAL | **Estimated:** 2 days

**Tasks:**
1. Run unit tests: `npm test`
2. Run integration tests: `npm run test:integration`
3. Run E2E tests: `npm run test:e2e`
4. Fix any tests broken by type changes
5. Add new tests for type-safe behaviors

---

### 6.3 Update Documentation
**Priority:** MEDIUM | **Estimated:** 1 day

**Tasks:**
1. Update README with new type patterns
2. Document type architecture in CLAUDE.md
3. Create TYPE_GUIDE.md for developers
4. Update API documentation (Swagger) with proper types

---

## Implementation Guidelines

### Commit Strategy

**Small, atomic commits after each logical unit:**
```
Phase 1.1: Add Qdrant payload types to qdrant.d.ts
Phase 1.1: Create MongoDB type definitions
Phase 1.1: Add Express request/response types
Phase 1.2: Standardize error handling in services/
Phase 1.2: Standardize error handling in routes/
...
```

### Testing Requirements

**Before each commit:**
1. Run `npm run typecheck`
2. Run affected unit tests
3. Verify no runtime errors in dev environment

**After each phase:**
1. Run full test suite
2. Manual smoke testing of affected features

### Code Review Checklist

For each changed file:
- [ ] No `any` types remain (unless explicitly documented as necessary)
- [ ] Generics used appropriately
- [ ] Type guards implemented where needed
- [ ] Error handling uses `unknown` and proper type narrowing
- [ ] Documentation updated for public APIs
- [ ] Tests pass
- [ ] No new ESLint warnings

---

## Risk Mitigation

### Potential Risks

1. **Breaking Changes:** Type changes may reveal hidden bugs
   - **Mitigation:** Extensive testing at each phase

2. **Performance Impact:** More specific types may affect runtime
   - **Mitigation:** Benchmark critical paths before/after

3. **Developer Confusion:** New type patterns may be unfamiliar
   - **Mitigation:** Comprehensive documentation and examples

4. **Type Complexity:** Over-engineered types may harm readability
   - **Mitigation:** Favor simple, clear types over clever generics

---

## Success Metrics

### Quantitative Goals

- [ ] 0 `any` types in production code (excluding explicitly documented cases)
- [ ] 0 `@typescript-eslint/no-explicit-any` warnings
- [ ] 100% of tests passing
- [ ] No increase in bundle size
- [ ] No performance regression (>5%)

### Qualitative Goals

- [ ] Improved IDE autocomplete and IntelliSense
- [ ] Better compile-time error detection
- [ ] Clearer API contracts
- [ ] Easier onboarding for new developers
- [ ] More confident refactoring

---

## Timeline Summary

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 1** | Week 1 (5 days) | Foundation - Type Infrastructure |
| **Phase 2** | Week 2 (5 days) | Core Domain Types |
| **Phase 3** | Week 3-4 (10 days) | Service Layer |
| **Phase 4** | Week 5 (5 days) | Integration Layer |
| **Phase 5** | Week 6 (5 days) | Utilities & Helpers |
| **Phase 6** | Week 6-7 (4 days) | Validation & Cleanup |
| **TOTAL** | **34 days (~7 weeks)** | Full remediation |

**Note:** Timeline assumes 1 developer working full-time. Can be parallelized with multiple developers working on independent phases.

---

## Next Steps

1. **Review this plan** with the team
2. **Create tracking issues** for each phase in GitHub/JIRA
3. **Set up feature branch:** `refactor/eliminate-any-types`
4. **Begin Phase 1.1:** Start with type definition files
5. **Schedule daily standups** to track progress

---

## Appendix A: Type Patterns Reference

### Pattern 1: Generic Service Methods
```typescript
class DataService<T extends Document> {
  async find(filter: Filter<T>): Promise<T[]> {
    return this.collection.find(filter).toArray();
  }
}
```

### Pattern 2: Union Types for Dynamic Data
```typescript
type PayloadValue = string | number | boolean | null | PayloadValue[] | PayloadObject;
interface PayloadObject { [key: string]: PayloadValue; }
```

### Pattern 3: Type Guards
```typescript
function isToolPayload(payload: unknown): payload is ToolPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'toolId' in payload &&
    'name' in payload
  );
}
```

### Pattern 4: Discriminated Unions
```typescript
type VectorSearchResult =
  | { success: true; results: SearchHit[]; }
  | { success: false; error: string; };
```

---

## Appendix B: ESLint Configuration

**Recommended ESLint rules for maintaining type safety:**

```javascript
// eslint.config.js
export default [
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error', // Fail on any
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
    }
  }
];
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-11
**Author:** Development Team
**Status:** DRAFT - Pending Review
