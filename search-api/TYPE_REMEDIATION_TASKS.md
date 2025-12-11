# Type Remediation - Detailed Task Breakdown

**Project:** CodiesVibe Search API - `any` Type Elimination
**Total Tasks:** 120+ actionable items across 6 phases

---

## 📋 How to Use This Document

- Each task is **self-contained** and can be executed independently (unless marked with dependencies)
- Tasks are numbered for easy tracking: `P1.T1` = Phase 1, Task 1
- **✅ Check off** tasks as you complete them
- **Run validation** after each task before moving to the next
- **Commit after each task** or logical group of related tasks

---

# PHASE 1: Foundation - Type Infrastructure (Week 1)

**Goal:** Establish core type definitions that all other code will depend on

---

## Section 1.1: Create Core Type Definition Files

### Task P1.T1: Enhance Qdrant Type Definitions
**File:** `src/types/qdrant.d.ts`
**Status:** ⬜ Not Started

**Steps:**
1. Open `src/types/qdrant.d.ts`
2. Add `QdrantPayloadValue` type:
   ```typescript
   export type QdrantPayloadValue =
     | string
     | number
     | boolean
     | null
     | QdrantPayloadValue[]
     | { [key: string]: QdrantPayloadValue };
   ```
3. Add `QdrantPayload` interface:
   ```typescript
   export interface QdrantPayload {
     [key: string]: QdrantPayloadValue;
   }
   ```
4. Update `QdrantPoint` interface to use generic:
   ```typescript
   export interface QdrantPoint<T extends QdrantPayload = QdrantPayload> {
     id: string | number;
     vector?: number[] | { [vectorName: string]: number[] };
     payload?: T;
   }
   ```
5. Replace all `payload?: any` with `payload?: QdrantPayload`
6. Update search result type:
   ```typescript
   export interface QdrantSearchResult<T extends QdrantPayload = QdrantPayload> {
     id: string | number;
     score: number;
     payload?: T;
     vector?: number[] | { [vectorName: string]: number[] };
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Verify: No new errors introduced
- Check: `src/services/qdrant.service.ts` still compiles

**Commit:** `chore(types): enhance Qdrant type definitions with generic payload support`

---

### Task P1.T2: Create MongoDB Type Definitions
**File:** `src/types/mongodb.types.ts` (NEW)
**Status:** ⬜ Not Started
**Dependencies:** None

**Steps:**
1. Create new file: `src/types/mongodb.types.ts`
2. Add imports:
   ```typescript
   import type {
     Filter,
     Document,
     UpdateFilter,
     FindOptions,
     UpdateResult,
     DeleteResult,
     InsertOneResult,
     InsertManyResult
   } from 'mongodb';
   ```
3. Create filter type alias:
   ```typescript
   export interface MongoDBFilter<T extends Document = Document> extends Filter<T> {}
   ```
4. Create update type alias:
   ```typescript
   export interface MongoDBUpdate<T extends Document = Document> extends UpdateFilter<T> {}
   ```
5. Create find options type:
   ```typescript
   export interface MongoDBFindOptions<T extends Document = Document> extends FindOptions<T> {}
   ```
6. Create query result interface:
   ```typescript
   export interface MongoDBQueryResult<T extends Document = Document> {
     results: T[];
     total: number;
     page?: number;
     limit?: number;
     hasMore?: boolean;
   }
   ```
7. Create operation result types:
   ```typescript
   export interface MongoDBUpdateResult extends UpdateResult {
     matchedCount: number;
     modifiedCount: number;
     upsertedId?: unknown;
   }

   export interface MongoDBDeleteResult extends DeleteResult {
     deletedCount: number;
   }

   export interface MongoDBInsertResult<T extends Document = Document> {
     insertedId: string;
     insertedDocument?: T;
   }
   ```
8. Create aggregation pipeline types:
   ```typescript
   export type MongoDBPipelineStage = Record<string, unknown>;

   export interface MongoDBAggregateCursor<T extends Document = Document> {
     toArray(): Promise<T[]>;
     next(): Promise<T | null>;
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Verify: File compiles without errors
- Check: Imports resolve correctly

**Commit:** `chore(types): add MongoDB type definitions`

---

### Task P1.T3: Create Express Extension Types
**File:** `src/types/express.types.ts` (NEW)
**Status:** ⬜ Not Started
**Dependencies:** None

**Steps:**
1. Create new file: `src/types/express.types.ts`
2. Add imports:
   ```typescript
   import type { Request, Response, NextFunction } from 'express';
   ```
3. Create authenticated request interface:
   ```typescript
   export interface AuthenticatedRequest extends Request {
     auth?: {
       userId: string;
       sessionId: string;
       claims: Record<string, unknown>;
       orgId?: string;
       orgRole?: string;
     };
   }
   ```
4. Create correlated request interface:
   ```typescript
   export interface CorrelatedRequest extends Request {
     correlationId?: string;
     requestId?: string;
     startTime?: number;
   }
   ```
5. Create combined app request type:
   ```typescript
   export interface AppRequest extends AuthenticatedRequest, CorrelatedRequest {}
   ```
6. Create error types:
   ```typescript
   export interface ErrorWithStatus extends Error {
     status?: number;
     statusCode?: number;
     code?: string;
     details?: unknown;
   }

   export interface ValidationError extends ErrorWithStatus {
     status: 400;
     errors: Array<{
       field: string;
       message: string;
       value?: unknown;
     }>;
   }
   ```
7. Create middleware types:
   ```typescript
   export type AsyncRequestHandler<
     T extends Request = AppRequest,
     R extends Response = Response
   > = (req: T, res: R, next: NextFunction) => Promise<void> | void;

   export type ErrorRequestHandler = (
     error: unknown,
     req: Request,
     res: Response,
     next: NextFunction
   ) => void;
   ```

**Validation:**
- Run: `npm run typecheck`
- Verify: All Express types are compatible
- Test: Import in a route file to verify

**Commit:** `chore(types): add Express request/response extension types`

---

### Task P1.T4: Create Circuit Breaker Types
**File:** `src/types/circuit-breaker.types.ts` (NEW)
**Status:** ⬜ Not Started
**Dependencies:** None

**Steps:**
1. Create new file: `src/types/circuit-breaker.types.ts`
2. Define circuit breaker states:
   ```typescript
   export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
   ```
3. Create options interface:
   ```typescript
   export interface CircuitBreakerOptions {
     timeout: number;
     errorThresholdPercentage: number;
     resetTimeout: number;
     rollingCountTimeout?: number;
     rollingCountBuckets?: number;
     name: string;
     fallback?: <T>() => Promise<T>;
   }
   ```
4. Create function wrapper type:
   ```typescript
   export type CircuitBreakerFunction<TArgs extends unknown[], TReturn> =
     (...args: TArgs) => Promise<TReturn>;
   ```
5. Create state interface:
   ```typescript
   export interface CircuitBreakerState {
     state: CircuitState;
     failures: number;
     successes: number;
     rejects: number;
     timeouts: number;
     fallbacks: number;
     lastFailureTime?: number;
     nextAttemptTime?: number;
   }
   ```
6. Create metrics interface:
   ```typescript
   export interface CircuitBreakerMetrics {
     totalRequests: number;
     successfulRequests: number;
     failedRequests: number;
     rejectedRequests: number;
     timeoutRequests: number;
     errorPercentage: number;
     averageResponseTime: number;
   }
   ```
7. Create event types:
   ```typescript
   export type CircuitBreakerEvent =
     | 'success'
     | 'failure'
     | 'timeout'
     | 'reject'
     | 'open'
     | 'halfOpen'
     | 'close'
     | 'fallback';

   export interface CircuitBreakerEventData {
     event: CircuitBreakerEvent;
     timestamp: number;
     error?: Error;
     duration?: number;
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Verify: No errors
- Check: Types align with circuit-breaker.service.ts usage

**Commit:** `chore(types): add circuit breaker type definitions`

---

### Task P1.T5: Create Error Handling Utility Types
**File:** `src/types/error.types.ts` (NEW)
**Status:** ⬜ Not Started
**Dependencies:** None

**Steps:**
1. Create new file: `src/types/error.types.ts`
2. Define serialized error interface:
   ```typescript
   export interface SerializedError {
     message: string;
     name?: string;
     stack?: string;
     code?: string | number;
     statusCode?: number;
     details?: unknown;
     timestamp?: string;
     path?: string;
   }
   ```
3. Create error context interface:
   ```typescript
   export interface ErrorContext {
     userId?: string;
     requestId?: string;
     correlationId?: string;
     operation?: string;
     metadata?: Record<string, unknown>;
   }
   ```
4. Create application error class type:
   ```typescript
   export class ApplicationError extends Error {
     constructor(
       message: string,
       public readonly code: string,
       public readonly statusCode: number = 500,
       public readonly details?: unknown,
       public readonly context?: ErrorContext
     ) {
       super(message);
       this.name = 'ApplicationError';
       Error.captureStackTrace(this, this.constructor);
     }

     toJSON(): SerializedError {
       return {
         message: this.message,
         name: this.name,
         code: this.code,
         statusCode: this.statusCode,
         details: this.details,
         stack: this.stack,
       };
     }
   }
   ```
5. Create specific error types:
   ```typescript
   export class ValidationError extends ApplicationError {
     constructor(message: string, details?: unknown) {
       super(message, 'VALIDATION_ERROR', 400, details);
       this.name = 'ValidationError';
     }
   }

   export class NotFoundError extends ApplicationError {
     constructor(resource: string, id?: string) {
       super(
         `${resource}${id ? ` with id ${id}` : ''} not found`,
         'NOT_FOUND',
         404
       );
       this.name = 'NotFoundError';
     }
   }

   export class UnauthorizedError extends ApplicationError {
     constructor(message: string = 'Unauthorized') {
       super(message, 'UNAUTHORIZED', 401);
       this.name = 'UnauthorizedError';
     }
   }

   export class ForbiddenError extends ApplicationError {
     constructor(message: string = 'Forbidden') {
       super(message, 'FORBIDDEN', 403);
       this.name = 'ForbiddenError';
     }
   }

   export class ConflictError extends ApplicationError {
     constructor(message: string, details?: unknown) {
       super(message, 'CONFLICT', 409, details);
       this.name = 'ConflictError';
     }
   }

   export class InternalServerError extends ApplicationError {
     constructor(message: string = 'Internal server error', details?: unknown) {
       super(message, 'INTERNAL_SERVER_ERROR', 500, details);
       this.name = 'InternalServerError';
     }
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Verify: Error classes compile correctly
- Test: Create an instance to verify structure

**Commit:** `chore(types): add error handling type definitions`

---

## Section 1.2: Create Error Handling Utilities

### Task P1.T6: Create Error Utility Functions
**File:** `src/utils/error-handling.ts` (NEW)
**Status:** ⬜ Not Started
**Dependencies:** P1.T5

**Steps:**
1. Create new file: `src/utils/error-handling.ts`
2. Import error types:
   ```typescript
   import { SerializedError, ErrorContext, ApplicationError } from '#types/error.types';
   ```
3. Create type guard for Error:
   ```typescript
   export function isError(error: unknown): error is Error {
     return error instanceof Error;
   }
   ```
4. Create type guard for ApplicationError:
   ```typescript
   export function isApplicationError(error: unknown): error is ApplicationError {
     return error instanceof ApplicationError;
   }
   ```
5. Create error message extractor:
   ```typescript
   export function getErrorMessage(error: unknown): string {
     if (isError(error)) return error.message;
     if (typeof error === 'string') return error;
     if (error && typeof error === 'object' && 'message' in error) {
       return String(error.message);
     }
     return 'Unknown error occurred';
   }
   ```
6. Create error stack extractor:
   ```typescript
   export function getErrorStack(error: unknown): string | undefined {
     return isError(error) ? error.stack : undefined;
   }
   ```
7. Create error code extractor:
   ```typescript
   export function getErrorCode(error: unknown): string | number | undefined {
     if (isApplicationError(error)) return error.code;
     if (error && typeof error === 'object' && 'code' in error) {
       return error.code as string | number;
     }
     return undefined;
   }
   ```
8. Create error serializer:
   ```typescript
   export function serializeError(error: unknown, context?: ErrorContext): SerializedError {
     if (isApplicationError(error)) {
       return {
         ...error.toJSON(),
         timestamp: new Date().toISOString(),
         path: context?.operation,
       };
     }

     if (isError(error)) {
       return {
         message: error.message,
         name: error.name,
         stack: error.stack,
         code: getErrorCode(error),
         timestamp: new Date().toISOString(),
       };
     }

     return {
       message: getErrorMessage(error),
       timestamp: new Date().toISOString(),
     };
   }
   ```
9. Create error logger helper:
   ```typescript
   export function formatErrorForLogging(error: unknown, context?: ErrorContext): {
     message: string;
     stack?: string;
     code?: string | number;
     context?: ErrorContext;
   } {
     return {
       message: getErrorMessage(error),
       stack: getErrorStack(error),
       code: getErrorCode(error),
       context,
     };
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Write unit test: Create `src/__tests__/unit/utils/error-handling.test.ts`
- Test all functions with different error types
- Verify: All edge cases handled

**Commit:** `feat(utils): add error handling utilities with type guards`

---

### Task P1.T7: Update Logger to Use Proper Metadata Types
**File:** `src/config/logger.ts`
**Status:** ⬜ Not Started
**Dependencies:** P1.T5, P1.T6

**Steps:**
1. Create `src/types/logger.types.ts`:
   ```typescript
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
     | Date
     | LogMetadataValue[]
     | { [key: string]: LogMetadataValue };

   export interface StructuredLogEntry {
     level: LogLevel;
     message: string;
     timestamp: string;
     metadata?: LogMetadata;
     correlationId?: string;
     userId?: string;
     error?: import('#types/error.types').SerializedError;
   }
   ```
2. Open `src/config/logger.ts`
3. Import new types:
   ```typescript
   import { LogMetadata, LogLevel } from '#types/logger.types';
   import { serializeError } from '#utils/error-handling';
   ```
4. Replace all instances of `any` in function signatures:
   - Line 19: `meta?: any` → `meta?: LogMetadata`
   - Line 27: `meta?: any` → `meta?: LogMetadata`
   - Line 44: `(info: any)` → `(info: { level: string; message: string; [key: string]: unknown })`
   - Line 65: `(info: any)` → `(info: { level: string; message: string; [key: string]: unknown })`
   - Line 92: `(meta?: any)` → `(meta?: LogMetadata)`
   - Line 140: `private log(level: string, message: string, meta?: any)` → `private log(level: LogLevel, message: string, meta?: LogMetadata)`
5. Remove unused import on line 3:
   ```typescript
   // Remove: import { v4 as uuidv4 } from 'uuid';
   ```
6. Update error logging to use serializer:
   ```typescript
   error(message: string, error?: unknown, meta?: LogMetadata): void {
     const errorData = error ? serializeError(error) : undefined;
     this.log('error', message, { ...meta, error: errorData });
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Check: No `any` types remain in logger.ts
- Test: Import logger in a test file and verify autocomplete works
- Run: `npm run lint` - verify 7 warnings are fixed

**Commit:** `refactor(logger): replace any types with proper LogMetadata types`

---

### Task P1.T8: Standardize Error Handling in Config Files
**Files:** `src/config/database.ts`
**Status:** ⬜ Not Started
**Dependencies:** P1.T6

**Steps:**
1. Open `src/config/database.ts`
2. Import error utilities:
   ```typescript
   import { getErrorMessage, getErrorStack, serializeError } from '#utils/error-handling';
   ```
3. Update catch block at line 52:
   ```typescript
   // BEFORE:
   } catch (error) {
     logger.error("Failed to connect to MongoDB", { error });
     throw error;
   }

   // AFTER:
   } catch (error) {
     logger.error("Failed to connect to MongoDB", error, {
       uri: MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') // Hide credentials
     });
     throw error;
   }
   ```
4. Update catch block at line 251:
   ```typescript
   // BEFORE:
   } catch (error) {
     logger.error("Failed to initialize database connections", { error });
     throw error;
   }

   // AFTER:
   } catch (error) {
     logger.error("Failed to initialize database connections", error);
     throw error;
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Test: Start app and verify error logging still works
- Check: No `any` types in catch blocks

**Commit:** `refactor(config): standardize error handling in database config`

---

### Task P1.T9: Standardize Error Handling in Controllers
**Files:** `src/controllers/search.controller.ts`
**Status:** ⬜ Not Started
**Dependencies:** P1.T6

**Steps:**
1. Open `src/controllers/search.controller.ts`
2. Import error utilities:
   ```typescript
   import { serializeError } from '#utils/error-handling';
   ```
3. Update catch block at line 99:
   ```typescript
   // BEFORE:
   } catch (error) {
     res.status(500).json({ error: 'Internal server error' });
   }

   // AFTER:
   } catch (error) {
     logger.error('Search request failed', error, {
       query: req.body.query,
       correlationId: req.correlationId,
     });

     res.status(500).json({
       error: 'Internal server error',
       ...(process.env.NODE_ENV === 'development' && {
         details: serializeError(error)
       })
     });
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Test: Make a failing search request and verify error response
- Check: Error is properly logged

**Commit:** `refactor(controllers): standardize error handling in search controller`

---

### Task P1.T10: Standardize Error Handling in Services (Batch 1)
**Files:**
- `src/services/mongodb.service.ts`
- `src/services/qdrant.service.ts`
- `src/services/embedding.service.ts`

**Status:** ⬜ Not Started
**Dependencies:** P1.T6

**Steps:**
1. Create a script to find all catch blocks:
   ```bash
   grep -n "catch\s*(.*error.*:.*any" src/services/*.ts
   ```
2. For each service file:
   - Import error utilities at the top
   - Replace `catch (error: any)` with `catch (error)`
   - Update error logging to use new utilities
   - Ensure error is re-thrown or handled properly

3. Example pattern for each catch block:
   ```typescript
   // BEFORE:
   } catch (error: any) {
     logger.error(`Operation failed: ${error.message}`);
     throw error;
   }

   // AFTER:
   } catch (error) {
     logger.error('Operation failed', error, {
       operation: 'operationName',
       context: { /* relevant context */ }
     });
     throw error;
   }
   ```

**Validation:**
- Run: `npm run typecheck` after each file
- Run: `npm test -- --testPathPattern="mongodb.service|qdrant.service|embedding.service"`
- Verify: All tests still pass

**Commit:** `refactor(services): standardize error handling in core services`

---

### Task P1.T11: Standardize Error Handling in Services (Batch 2)
**Files:**
- `src/services/llm.service.ts`
- `src/services/circuit-breaker.service.ts`
- `src/services/health-check.service.ts`

**Status:** ⬜ Not Started
**Dependencies:** P1.T6

**Steps:**
1. Follow same pattern as P1.T10
2. Pay special attention to circuit-breaker.service.ts error handling (17 instances)
3. For circuit breaker, maintain backward compatibility with error callbacks

**Validation:**
- Run: `npm run typecheck`
- Run: `npm test -- --testPathPattern="llm.service|circuit-breaker|health-check"`
- Test: Circuit breaker error scenarios manually

**Commit:** `refactor(services): standardize error handling in utility services`

---

### Task P1.T12: Standardize Error Handling in Middleware
**Files:**
- `src/middleware/error-handler.middleware.ts`
- `src/middleware/clerk-auth.middleware.ts`
- `src/middleware/timeout.middleware.ts`
- `src/middleware/correlation.middleware.ts`

**Status:** ⬜ Not Started
**Dependencies:** P1.T3, P1.T6

**Steps:**
1. Open `src/middleware/error-handler.middleware.ts`
2. Import types:
   ```typescript
   import { ErrorRequestHandler } from '#types/express.types';
   import { serializeError, isApplicationError } from '#utils/error-handling';
   ```
3. Update error handler signature:
   ```typescript
   // BEFORE:
   export function errorHandler(err: any, req: any, res: any, next: any): void

   // AFTER:
   export const errorHandler: ErrorRequestHandler = (error, req, res, next): void => {
     const serialized = serializeError(error, {
       requestId: req.requestId,
       correlationId: req.correlationId,
       operation: `${req.method} ${req.path}`,
     });

     const statusCode = isApplicationError(error)
       ? error.statusCode
       : (error as { status?: number }).status || 500;

     logger.error('Request error', error, {
       path: req.path,
       method: req.method,
       statusCode,
     });

     res.status(statusCode).json({
       error: serialized.message,
       code: serialized.code,
       ...(process.env.NODE_ENV === 'development' && {
         stack: serialized.stack,
         details: serialized.details,
       }),
     });
   };
   ```
4. Update other middleware files similarly

**Validation:**
- Run: `npm run typecheck`
- Test: Trigger errors through different middleware
- Verify: Error responses are properly formatted

**Commit:** `refactor(middleware): standardize error handling with proper types`

---

### Task P1.T13: Standardize Error Handling in Routes
**Files:**
- `src/routes/tools.routes.ts`
- `src/routes/search.routes.ts`
- `src/routes/sync.routes.ts`
- `src/routes/health.routes.ts`

**Status:** ⬜ Not Started
**Dependencies:** P1.T3, P1.T6

**Steps:**
1. For each route file:
2. Import types:
   ```typescript
   import { AppRequest, AsyncRequestHandler } from '#types/express.types';
   import { NotFoundError, ValidationError } from '#types/error.types';
   ```
3. Update route handlers to use proper types
4. Replace generic errors with specific error classes
5. Example:
   ```typescript
   // BEFORE:
   router.get('/:id', async (req: any, res: any) => {
     try {
       const tool = await toolService.findById(req.params.id);
       if (!tool) {
         return res.status(404).json({ error: 'Not found' });
       }
       res.json(tool);
     } catch (error: any) {
       res.status(500).json({ error: error.message });
     }
   });

   // AFTER:
   router.get('/:id', async (req: AppRequest, res: Response) => {
     const tool = await toolService.findById(req.params.id);
     if (!tool) {
       throw new NotFoundError('Tool', req.params.id);
     }
     res.json(tool);
   });
   ```

**Validation:**
- Run: `npm run typecheck`
- Run: `npm test -- --testPathPattern="routes"`
- Test: API endpoints manually

**Commit:** `refactor(routes): use typed requests and proper error classes`

---

### Task P1.T14: Standardize Error Handling in Debug Scripts
**Files:** All files in `src/debug-scripts/`
**Status:** ⬜ Not Started
**Dependencies:** P1.T6

**Steps:**
1. Update all catch blocks in debug scripts to use standard pattern
2. These are lower priority - focus on consistency
3. Pattern:
   ```typescript
   } catch (error) {
     console.error('Script failed:', getErrorMessage(error));
     if (getErrorStack(error)) {
       console.error('Stack:', getErrorStack(error));
     }
     process.exit(1);
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Test: Run one or two debug scripts to verify they work

**Commit:** `refactor(debug): standardize error handling in debug scripts`

---

## Section 1.3: Phase 1 Validation

### Task P1.T15: Run Full Type Check
**Status:** ⬜ Not Started
**Dependencies:** All P1 tasks

**Steps:**
1. Run: `npm run typecheck`
2. Verify: 0 errors
3. Check: Number of `any` warnings should be reduced by ~50
4. Document: Count remaining warnings: `npm run lint 2>&1 | grep "no-explicit-any" | wc -l`

**Validation:**
- Screenshot of clean typecheck output
- Note: Remaining warning count

**Commit:** Not applicable - validation only

---

### Task P1.T16: Run Phase 1 Tests
**Status:** ⬜ Not Started
**Dependencies:** P1.T15

**Steps:**
1. Run unit tests: `npm test`
2. Fix any broken tests
3. Run integration tests if available: `npm run test:integration`
4. Ensure all tests pass

**Validation:**
- All tests green
- No new test failures introduced

**Commit:** `test: fix tests after Phase 1 type improvements`

---

### Task P1.T17: Create Phase 1 Summary Document
**Status:** ⬜ Not Started
**Dependencies:** P1.T16

**Steps:**
1. Create `PHASE_1_SUMMARY.md`
2. Document:
   - Tasks completed (should be 17/17)
   - Files modified (list all)
   - Warnings eliminated (before/after count)
   - New types created (list)
   - Breaking changes (if any)
   - Lessons learned
3. Commit all changes

**Commit:** `docs: add Phase 1 completion summary`

---

# PHASE 2: Core Domain Types (Week 2)

**Goal:** Create and enhance domain-specific types for tools, search, and vectors

---

## Section 2.1: Tool Domain Types

### Task P2.T1: Audit Existing Tool Types
**File:** `src/types/tool.types.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 1 complete

**Steps:**
1. Read entire file `src/types/tool.types.ts`
2. Document all current `any` usages (should be 4 instances):
   - Line 64: `export interface ToolData`
   - Line 177, 179, 197: Various payload types
3. Identify all interfaces and their purposes
4. Create a list of missing types based on actual usage
5. Review MongoDB tool schema in `src/config/models.ts`
6. Map schema fields to TypeScript types

**Validation:**
- Create documentation: List all current types and their relationships
- Identify gaps

**Commit:** Not applicable - audit only

---

### Task P2.T2: Create Comprehensive Tool Payload Type
**File:** `src/types/tool-payload.types.ts` (NEW)
**Status:** ⬜ Not Started
**Dependencies:** P2.T1

**Steps:**
1. Create new file: `src/types/tool-payload.types.ts`
2. Review the tool schema to understand all fields
3. Create base tool payload:
   ```typescript
   export interface ToolPayload {
     toolId: string;
     name: string;
     description: string;
     category: string;
     url: string;
     logoUrl?: string;
     pricing: 'free' | 'paid' | 'freemium';
     tags: string[];
     features: string[];
     useCases: string[];
     targetAudience: string[];
     rating?: number;
     reviewCount?: number;
     createdBy?: string;
     verified?: boolean;
     metadata?: ToolMetadata;
   }
   ```
4. Create metadata type:
   ```typescript
   export interface ToolMetadata {
     lastUpdated?: string;
     popularity?: number;
     trendingScore?: number;
     [key: string]: string | number | boolean | undefined;
   }
   ```
5. Create tool document type (MongoDB):
   ```typescript
   export interface ToolDocument extends ToolPayload {
     _id: string;
     createdAt: Date;
     updatedAt: Date;
     deletedAt?: Date;
     vectorized: boolean;
     vectorTypes?: string[];
     syncStatus?: 'pending' | 'synced' | 'failed';
   }
   ```
6. Create tool input/output types:
   ```typescript
   export interface CreateToolInput {
     name: string;
     description: string;
     category: string;
     url: string;
     logoUrl?: string;
     pricing: 'free' | 'paid' | 'freemium';
     tags?: string[];
     features?: string[];
     useCases?: string[];
     targetAudience?: string[];
   }

   export interface UpdateToolInput extends Partial<CreateToolInput> {
     toolId: string;
   }

   export interface ToolResponse extends ToolPayload {
     id: string;
     createdAt: string;
     updatedAt: string;
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Compare with actual MongoDB documents
- Verify all fields are captured

**Commit:** `feat(types): add comprehensive tool payload types`

---

### Task P2.T3: Replace `any` in tool.types.ts
**File:** `src/types/tool.types.ts`
**Status:** ⬜ Not Started
**Dependencies:** P2.T2

**Steps:**
1. Open `src/types/tool.types.ts`
2. Import new tool payload types:
   ```typescript
   import { ToolPayload, ToolDocument } from './tool-payload.types';
   ```
3. Replace line 64 `any`:
   ```typescript
   // BEFORE:
   export interface ToolData {
     [key: string]: any;
   }

   // AFTER:
   export interface ToolData extends ToolPayload {
     [key: string]: unknown; // For extensibility
   }
   ```
4. Replace line 177 `any`:
   ```typescript
   // Find context and replace with specific type
   ```
5. Replace line 179 `any`:
   ```typescript
   // Find context and replace with specific type
   ```
6. Replace line 197 `any`:
   ```typescript
   // Find context and replace with specific type
   ```
7. Fix line 208 - remove unnecessary escape:
   ```typescript
   // BEFORE: /\-/
   // AFTER: /-/
   ```

**Validation:**
- Run: `npm run typecheck`
- Run: `npm run lint` - verify tool.types.ts warnings cleared
- Check: No `any` types remain in tool.types.ts

**Commit:** `refactor(types): eliminate any types from tool.types.ts`

---

## Section 2.2: Search & Vector Types

### Task P2.T4: Create Search Types
**File:** `src/types/search.types.ts` (NEW)
**Status:** ⬜ Not Started
**Dependencies:** P2.T2

**Steps:**
1. Create new file: `src/types/search.types.ts`
2. Import dependencies:
   ```typescript
   import { ToolPayload } from './tool-payload.types';
   ```
3. Create search query types:
   ```typescript
   export interface SearchQuery {
     query: string;
     limit?: number;
     offset?: number;
     filters?: SearchFilters;
     vectorTypes?: VectorType[];
     scoreThreshold?: number;
   }

   export interface SearchFilters {
     categories?: string[];
     tags?: string[];
     pricing?: ('free' | 'paid' | 'freemium')[];
     minRating?: number;
     verified?: boolean;
     features?: string[];
   }
   ```
4. Create search result types:
   ```typescript
   export interface SearchHit<T = ToolPayload> {
     id: string;
     score: number;
     payload: T;
     vectorType?: string;
     rank?: number;
     highlights?: Record<string, string[]>;
   }

   export interface SearchResponse<T = ToolPayload> {
     results: SearchHit<T>[];
     total: number;
     query: string;
     executionTimeMs: number;
     vectorTypes: string[];
     metadata?: SearchMetadata;
   }

   export interface SearchMetadata {
     cacheHit?: boolean;
     strategy?: string;
     fusionMethod?: string;
     collections?: string[];
   }
   ```
5. Create aggregated search result:
   ```typescript
   export interface AggregatedSearchResult<T = ToolPayload> {
     byVectorType: Map<string, SearchHit<T>[]>;
     fused: SearchHit<T>[];
     rrfScores?: Map<string, number>;
     deduplicationStats?: {
       original: number;
       deduplicated: number;
       duplicatesRemoved: number;
     };
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Verify: Types align with actual search implementation

**Commit:** `feat(types): add search query and result types`

---

### Task P2.T5: Create Vector Types
**File:** `src/types/vector.types.ts` (NEW)
**Status:** ⬜ Not Started
**Dependencies:** Phase 1, P2.T2

**Steps:**
1. Create new file: `src/types/vector.types.ts`
2. Import dependencies:
   ```typescript
   import { ToolPayload } from './tool-payload.types';
   import { QdrantPayload } from './qdrant.d';
   ```
3. Define vector type enum:
   ```typescript
   export type VectorType =
     | 'semantic'
     | 'categories'
     | 'functionality'
     | 'aliases'
     | 'composites'
     | 'usecases'
     | 'interface';

   export const VECTOR_TYPES: readonly VectorType[] = [
     'semantic',
     'categories',
     'functionality',
     'aliases',
     'composites',
     'usecases',
     'interface',
   ] as const;
   ```
4. Create embedding types:
   ```typescript
   export interface VectorEmbedding {
     type: VectorType;
     vector: number[];
     model: string;
     dimensions: number;
     createdAt?: Date;
   }

   export interface ToolVectorData {
     toolId: string;
     embeddings: VectorEmbedding[];
     lastUpdated: Date;
   }
   ```
5. Create vector search types:
   ```typescript
   export interface VectorSearchParams {
     vector: number[];
     vectorType?: VectorType;
     collectionName?: string;
     limit?: number;
     scoreThreshold?: number;
     filter?: QdrantPayload;
     withPayload?: boolean;
     withVector?: boolean;
   }

   export interface VectorSearchResult<T = ToolPayload> {
     id: string;
     score: number;
     vectorType: VectorType;
     collectionName: string;
     payload: T;
     vector?: number[];
   }

   export interface MultiVectorSearchParams {
     vectors: Map<VectorType, number[]>;
     limit?: number;
     scoreThreshold?: number;
     filter?: QdrantPayload;
     fusionMethod?: 'rrf' | 'weighted' | 'max';
     weights?: Map<VectorType, number>;
   }

   export interface MultiVectorSearchResult<T = ToolPayload> {
     byVectorType: Map<VectorType, VectorSearchResult<T>[]>;
     fused: VectorSearchResult<T>[];
     fusionScores: Map<string, number>;
     metadata: {
       totalResults: number;
       fusionMethod: string;
       vectorTypes: VectorType[];
     };
   }
   ```
6. Create vector indexing types:
   ```typescript
   export interface VectorIndexingJob {
     toolId: string;
     vectorTypes: VectorType[];
     status: 'pending' | 'processing' | 'completed' | 'failed';
     startedAt?: Date;
     completedAt?: Date;
     error?: string;
   }

   export interface VectorIndexingResult {
     toolId: string;
     success: boolean;
     vectorsCreated: number;
     vectorTypes: VectorType[];
     duration: number;
     error?: string;
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Cross-reference with `src/config/database.ts` vector types
- Ensure consistency with Qdrant collection names

**Commit:** `feat(types): add comprehensive vector and embedding types`

---

## Section 2.3: Result Deduplication Types

### Task P2.T6: Make DeduplicationConfig Generic
**File:** `src/utils/result-deduplication.ts`
**Status:** ⬜ Not Started
**Dependencies:** P2.T2

**Steps:**
1. Open `src/utils/result-deduplication.ts`
2. Import tool payload type:
   ```typescript
   import { ToolPayload } from '#types/tool-payload.types';
   ```
3. Update `DeduplicationConfig` interface (lines 18-32):
   ```typescript
   // BEFORE:
   export interface DeduplicationConfig {
     similarityThreshold: number;
     strategy: 'id_based' | 'content_based' | 'hybrid' | 'rrf_enhanced';
     fields: string[];
     weights: Record<string, number>;
     // ...
   }

   // AFTER:
   export interface DeduplicationConfig<T = ToolPayload> {
     similarityThreshold: number;
     strategy: 'id_based' | 'content_based' | 'hybrid' | 'rrf_enhanced';
     fields: (keyof T)[];  // Type-safe field references
     weights: Partial<Record<keyof T, number>>;  // Type-safe weights
     // ... rest of config
   }
   ```
4. Update `DeduplicationResult` (lines 35-45):
   ```typescript
   // BEFORE:
   export interface DeduplicationResult {
     uniqueResults: any[];
     duplicatesRemoved: number;
     // ...
   }

   // AFTER:
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
   ```
5. Update `RRFMergeResult` (lines 54-61):
   ```typescript
   // BEFORE:
   export interface RRFMergeResult {
     id: string;
     result: any;
     // ...
   }

   // AFTER:
   export interface RRFMergeResult<T = ToolPayload> {
     id: string;
     result: T;  // NOT any
     rrfScore: number;
     weightedScore: number;
     sources: SourceAttribution[];
     mergedFromCount: number;
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Count remaining `any` in file (should be dramatically reduced)

**Commit:** `refactor(dedup): add generic type parameters to deduplication types`

---

### Task P2.T7: Update ResultDeduplicator Class
**File:** `src/utils/result-deduplication.ts`
**Status:** ⬜ Not Started
**Dependencies:** P2.T6

**Steps:**
1. Update class definition (line 76):
   ```typescript
   // BEFORE:
   export class ResultDeduplicator {
     private config: DeduplicationConfig;
   }

   // AFTER:
   export class ResultDeduplicator<T = ToolPayload> {
     private config: DeduplicationConfig<T>;
   }
   ```
2. Update constructor:
   ```typescript
   constructor(config: Partial<DeduplicationConfig<T>> = {}) {
     this.config = {
       similarityThreshold: 0.9,
       strategy: 'hybrid',
       fields: ['name', 'description', 'category'] as (keyof T)[],
       // ... rest of defaults
     } as DeduplicationConfig<T>;

     Object.assign(this.config, config);
   }
   ```
3. Update all method signatures to use generic T:
   ```typescript
   deduplicate(results: T[]): DeduplicationResult<T>
   deduplicateById(results: T[]): T[]
   deduplicateByContent(results: T[]): T[]
   calculateSimilarity(result1: T, result2: T): SimilarityResult
   mergeWithRRF(groups: Map<string, T[]>): RRFMergeResult<T>[]
   // ... etc
   ```
4. Update internal method implementations to use T instead of any
5. Fix all type assertions and casts

**Validation:**
- Run: `npm run typecheck`
- Verify: Generic T flows through all methods
- Check: IDE autocomplete works with ToolPayload type

**Commit:** `refactor(dedup): make ResultDeduplicator class fully generic`

---

### Task P2.T8: Fix Remaining `any` in result-deduplication.ts
**File:** `src/utils/result-deduplication.ts`
**Status:** ⬜ Not Started
**Dependencies:** P2.T7

**Steps:**
1. Search for all remaining `any` usages in the file
2. For each occurrence:
   - Determine if it should be `T`, `unknown`, or a specific type
   - Replace with appropriate type
   - Add type guards if needed
3. Example replacements:
   ```typescript
   // BEFORE:
   private getFieldValue(obj: any, field: string): any {
     return obj[field];
   }

   // AFTER:
   private getFieldValue(obj: T, field: keyof T): unknown {
     return obj[field];
   }
   ```
4. Update all helper functions to be type-safe
5. Add type guards where needed:
   ```typescript
   private isValidResult(result: unknown): result is T {
     return (
       result !== null &&
       typeof result === 'object' &&
       'id' in result
     );
   }
   ```

**Validation:**
- Run: `npm run typecheck`
- Run: `npm run lint` - verify all 45 `any` warnings in this file are gone
- Write unit test to verify generic typing works

**Commit:** `refactor(dedup): eliminate all any types from result deduplication`

---

## Section 2.4: Intent & Plan Types

### Task P2.T9: Audit Intent and Plan Types
**Files:**
- `src/types/intent.ts`
- `src/types/intent-state.ts`
- `src/types/plan.ts`
- `src/types/query-plan.ts`

**Status:** ⬜ Not Started
**Dependencies:** Phase 1

**Steps:**
1. Read all four files
2. Document current structure and any `any` usages
3. Verify alignment with actual LangGraph usage
4. Check if any unused types exist (remove if so)
5. Ensure types match Zod schemas

**Validation:**
- Document findings
- Create list of required changes

**Commit:** Not applicable - audit only

---

### Task P2.T10: Remove Unused Type Imports
**Files:**
- `src/types/state.ts`
- `src/types/enhanced-state.ts`

**Status:** ⬜ Not Started
**Dependencies:** P2.T9

**Steps:**
1. Open `src/types/state.ts`
2. Remove unused imports (lines 1-5):
   - StateGraph (line 1)
   - any, z (line 2)
   - IntentStateSchema (line 3)
   - QueryPlanSchema (line 4)
   - QueryExecutorOutput, QueryExecutorOutputSchema (line 5)
3. Fix remaining `any` types (lines 19, 57, 58):
   ```typescript
   // Find each occurrence and replace with proper type
   ```
4. Open `src/types/enhanced-state.ts`
5. Remove unused imports (lines 1-5):
   - StateGraph (line 1)
   - Intent, IntentSchema (line 3)
   - Plan, PlanSchema (line 4)
6. Fix remaining `any` type (line 415)

**Validation:**
- Run: `npm run typecheck`
- Verify: No compilation errors
- Check: Files that import these types still work

**Commit:** `refactor(types): remove unused imports and fix any types in state files`

---

## Section 2.5: Phase 2 Validation

### Task P2.T11: Run Type Check After Phase 2
**Status:** ⬜ Not Started
**Dependencies:** All P2 tasks

**Steps:**
1. Run: `npm run typecheck`
2. Verify: 0 errors
3. Count remaining `any` warnings: `npm run lint 2>&1 | grep "no-explicit-any" | wc -l`
4. Compare with Phase 1 count - should be significantly lower

**Validation:**
- Document warning count reduction
- Take note of remaining problematic files

**Commit:** Not applicable - validation only

---

### Task P2.T12: Run Phase 2 Tests
**Status:** ⬜ Not Started
**Dependencies:** P2.T11

**Steps:**
1. Run: `npm test`
2. Fix any broken tests
3. Add tests for new generic types
4. Ensure 100% pass rate

**Validation:**
- All tests green
- New tests added for generic deduplication

**Commit:** `test: update tests for Phase 2 type improvements`

---

### Task P2.T13: Create Phase 2 Summary
**Status:** ⬜ Not Started
**Dependencies:** P2.T12

**Steps:**
1. Create `PHASE_2_SUMMARY.md`
2. Document:
   - Tasks completed (13/13)
   - New types created
   - Generic types implemented
   - Warning reduction stats
   - Files modified
3. Highlight key achievements (e.g., 45 warnings eliminated in result-deduplication.ts)

**Commit:** `docs: add Phase 2 completion summary`

---

# PHASE 3: Service Layer (Week 3-4)

**Goal:** Apply proper types to all service classes, focusing on Qdrant, MongoDB, and Circuit Breaker

---

## Section 3.1: Qdrant Service

### Task P3.T1: Update Qdrant Service Interfaces
**File:** `src/services/qdrant.service.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 1, Phase 2

**Steps:**
1. Open `src/services/qdrant.service.ts`
2. Import new types:
   ```typescript
   import { QdrantPayload, QdrantPoint, QdrantSearchResult } from '#types/qdrant.d';
   import { ToolPayload } from '#types/tool-payload.types';
   import { VectorSearchParams, VectorSearchResult } from '#types/vector.types';
   ```
3. Update `CollectionInfo` interface (lines 33-43):
   ```typescript
   // BEFORE:
   export interface CollectionInfo {
     name: string;
     exists: boolean;
     pointsCount: number;
     vectorSize: number;
     distance: string;
     status: 'green' | 'yellow' | 'red';
     optimizerStatus?: any;  // Line 40
     indexedVectorsCount?: number;
     config?: any;  // Line 42
   }

   // AFTER:
   export interface OptimizerStatus {
     ok: boolean;
     error?: string;
     indexing_threshold?: number;
   }

   export interface VectorParams {
     size: number;
     distance: 'Cosine' | 'Euclid' | 'Dot';
     hnsw_config?: {
       m?: number;
       ef_construct?: number;
       full_scan_threshold?: number;
     };
   }

   export interface CollectionConfig {
     params: {
       vectors: VectorParams | Record<string, VectorParams>;
       shard_number?: number;
       replication_factor?: number;
       write_consistency_factor?: number;
       on_disk_payload?: boolean;
     };
   }

   export interface CollectionInfo {
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
   ```

**Validation:**
- Run: `npm run typecheck`
- Verify: 3 `any` types eliminated (lines 40, 42)

**Commit:** `refactor(qdrant): enhance CollectionInfo types`

---

### Task P3.T2: Make Qdrant Search Methods Generic
**File:** `src/services/qdrant.service.ts`
**Status:** ⬜ Not Started
**Dependencies:** P3.T1

**Steps:**
1. Find all `search` method signatures in the file
2. Update each to use generic type parameter:
   ```typescript
   // BEFORE (example):
   async search(
     collectionName: string,
     params: { vector: number[]; limit?: number; filter?: any }
   ): Promise<any[]>

   // AFTER:
   async search<T extends QdrantPayload = ToolPayload>(
     collectionName: string,
     params: VectorSearchParams
   ): Promise<VectorSearchResult<T>[]>
   ```
3. Update implementation to maintain type safety:
   ```typescript
   async search<T extends QdrantPayload = ToolPayload>(
     collectionName: string,
     params: VectorSearchParams
   ): Promise<VectorSearchResult<T>[]> {
     await this.ensureClient();

     const results = await this.client!.search(collectionName, {
       vector: params.vector,
       limit: params.limit || 10,
       filter: params.filter,
       with_payload: params.withPayload !== false,
       score_threshold: params.scoreThreshold,
     });

     return results.map((result): VectorSearchResult<T> => ({
       id: String(result.id),
       score: result.score,
       vectorType: params.vectorType || 'semantic',
       collectionName,
       payload: result.payload as T,
       vector: params.withVector ? result.vector as number[] : undefined,
     }));
   }
   ```
4. Repeat for other search-related methods

**Validation:**
- Run: `npm run typecheck`
- Test: Call search with explicit type parameter
- Verify: Return type inference works correctly

**Commit:** `refactor(qdrant): make search methods generic with proper types`

---

### Task P3.T3: Fix Qdrant Upsert Methods
**File:** `src/services/qdrant.service.ts`
**Status:** ⬜ Not Started
**Dependencies:** P3.T2

**Steps:**
1. Find upsert method signatures
2. Update to use proper types:
   ```typescript
   // BEFORE:
   async upsert(collectionName: string, points: any[]): Promise<any>

   // AFTER:
   async upsert<T extends QdrantPayload = ToolPayload>(
     collectionName: string,
     points: QdrantPoint<T>[]
   ): Promise<UpsertResult>
   ```
3. Create UpsertResult type:
   ```typescript
   export interface UpsertResult {
     operation_id: number;
     status: 'acknowledged' | 'completed';
   }
   ```
4. Update implementation to be type-safe

**Validation:**
- Run: `npm run typecheck`
- Verify: Proper payload typing when upserting

**Commit:** `refactor(qdrant): add proper types to upsert methods`

---

### Task P3.T4: Fix Remaining Qdrant Service `any` Types
**File:** `src/services/qdrant.service.ts`
**Status:** ⬜ Not Started
**Dependencies:** P3.T3

**Steps:**
1. Search file for all remaining `any` occurrences (should be ~38 left)
2. Categorize by type of usage:
   - Response types from Qdrant client
   - Internal utility functions
   - Error handling
3. Replace each systematically:
   ```typescript
   // Example pattern:
   // BEFORE:
   private processResults(results: any[]): any[] {
     return results.map((r: any) => r.payload);
   }

   // AFTER:
   private processResults<T extends QdrantPayload>(
     results: QdrantSearchResult<T>[]
   ): T[] {
     return results.map(r => r.payload).filter((p): p is T => p !== undefined);
   }
   ```
4. Pay special attention to error handling - use proper error types
5. Update collection management methods
6. Update batch operations

**Validation:**
- Run: `npm run typecheck`
- Run: `npm run lint` - verify 44 warnings eliminated from qdrant.service.ts
- Run service-specific tests

**Commit:** `refactor(qdrant): eliminate all any types from Qdrant service`

---

## Section 3.2: MongoDB Service

### Task P3.T5: Update MongoDB Service Method Signatures
**File:** `src/services/mongodb.service.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 1 (P1.T2), Phase 2

**Steps:**
1. Open `src/services/mongodb.service.ts`
2. Import MongoDB types:
   ```typescript
   import type {
     Filter,
     Document,
     UpdateFilter,
     FindOptions,
     UpdateResult,
     DeleteResult,
     InsertOneResult
   } from 'mongodb';
   import { MongoDBQueryResult } from '#types/mongodb.types';
   ```
3. Remove unused import (line 10):
   ```typescript
   // Remove: PaginatedResult (unused)
   ```
4. Update find method (line 53):
   ```typescript
   // BEFORE:
   async find(collection: string, query: any, options?: any): Promise<any[]>

   // AFTER:
   async find<T extends Document = Document>(
     collection: string,
     query: Filter<T>,
     options?: FindOptions<T>
   ): Promise<T[]>
   ```
5. Update findOne method:
   ```typescript
   async findOne<T extends Document = Document>(
     collection: string,
     query: Filter<T>
   ): Promise<T | null>
   ```
6. Update updateOne method:
   ```typescript
   async updateOne<T extends Document = Document>(
     collection: string,
     filter: Filter<T>,
     update: UpdateFilter<T>
   ): Promise<UpdateResult>
   ```
7. Update updateMany method similarly
8. Update deleteOne and deleteMany methods with proper types

**Validation:**
- Run: `npm run typecheck`
- Verify: MongoDB type imports work correctly
- Check: Generic parameters flow through properly

**Commit:** `refactor(mongodb): add generic types to CRUD method signatures`

---

### Task P3.T6: Fix MongoDB Aggregation Pipeline Types
**File:** `src/services/mongodb.service.ts`
**Status:** ⬜ Not Started
**Dependencies:** P3.T5

**Steps:**
1. Find aggregate method in file
2. Update signature:
   ```typescript
   // BEFORE:
   async aggregate(collection: string, pipeline: any[]): Promise<any[]>

   // AFTER:
   async aggregate<T extends Document = Document>(
     collection: string,
     pipeline: Document[]
   ): Promise<T[]>
   ```
3. Update count/stats methods with proper types
4. Fix any cursor-related types

**Validation:**
- Run: `npm run typecheck`
- Test: Aggregation queries still work

**Commit:** `refactor(mongodb): add types to aggregation methods`

---

### Task P3.T7: Fix Remaining MongoDB Service `any` Types
**File:** `src/services/mongodb.service.ts`
**Status:** ⬜ Not Started
**Dependencies:** P3.T6

**Steps:**
1. Search for all remaining `any` (should be ~12 total)
2. Fix each occurrence:
   - Internal helper methods
   - Connection handling
   - Error responses
3. Ensure all public methods are fully typed

**Validation:**
- Run: `npm run typecheck`
- Run: `npm run lint` - verify 12 warnings eliminated
- Run MongoDB service tests

**Commit:** `refactor(mongodb): eliminate all any types from MongoDB service`

---

## Section 3.3: Circuit Breaker Service

### Task P3.T8: Update Circuit Breaker to Use Generic Types
**File:** `src/services/circuit-breaker.service.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 1 (P1.T4)

**Steps:**
1. Open `src/services/circuit-breaker.service.ts`
2. Import types:
   ```typescript
   import {
     CircuitBreakerOptions,
     CircuitBreakerFunction,
     CircuitBreakerState,
     CircuitBreakerMetrics
   } from '#types/circuit-breaker.types';
   ```
3. Make CircuitBreaker class generic:
   ```typescript
   // BEFORE:
   export class CircuitBreaker {
     constructor(options: any) { }
     async execute(fn: () => Promise<any>): Promise<any> { }
   }

   // AFTER:
   export class CircuitBreaker<TArgs extends unknown[] = [], TReturn = unknown> {
     constructor(options: CircuitBreakerOptions) { }

     async execute(
       fn: CircuitBreakerFunction<TArgs, TReturn>,
       ...args: TArgs
     ): Promise<TReturn> { }
   }
   ```
4. Update fire method:
   ```typescript
   async fire(fn: CircuitBreakerFunction<TArgs, TReturn>, ...args: TArgs): Promise<TReturn>
   ```
5. Update fallback handling with proper types
6. Update all internal methods to maintain type safety

**Validation:**
- Run: `npm run typecheck`
- Test: Create a typed circuit breaker and verify inference works

**Commit:** `refactor(circuit-breaker): make CircuitBreaker class generic`

---

### Task P3.T9: Fix Circuit Breaker Error Handling
**File:** `src/services/circuit-breaker.service.ts`
**Status:** ⬜ Not Started
**Dependencies:** P3.T8, Phase 1 error handling

**Steps:**
1. Update all catch blocks to use proper error handling:
   ```typescript
   // Pattern for all catch blocks:
   } catch (error) {
     logger.error('Circuit breaker operation failed', error, {
       circuitName: this.options.name,
       state: this.state,
     });
     throw error;
   }
   ```
2. Update error callbacks/handlers
3. Fix promise rejection handling

**Validation:**
- Run: `npm run typecheck`
- Verify: Error handling is consistent
- Test: Circuit breaker error scenarios

**Commit:** `refactor(circuit-breaker): standardize error handling`

---

### Task P3.T10: Fix Remaining Circuit Breaker `any` Types
**File:** `src/services/circuit-breaker.service.ts`
**Status:** ⬜ Not Started
**Dependencies:** P3.T9

**Steps:**
1. Search for remaining `any` (should be 17 total)
2. Replace each with proper type:
   - State management types
   - Metrics types
   - Internal helpers
3. Remove unused parameters where needed

**Validation:**
- Run: `npm run typecheck`
- Run: `npm run lint` - verify 17 warnings eliminated
- Run circuit breaker tests

**Commit:** `refactor(circuit-breaker): eliminate all any types`

---

## Section 3.4: Other Services

### Task P3.T11: Fix Plan Cache Service
**File:** `src/services/plan-cache.service.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 1, Phase 2

**Steps:**
1. Import proper types:
   ```typescript
   import { Plan } from '#types/plan';
   import { Intent } from '#types/intent';
   import { MongoDBFilter } from '#types/mongodb.types';
   ```
2. Replace 7 `any` instances with proper types
3. Focus on cache key generation and lookup methods
4. Ensure Plan and Intent types are used correctly

**Validation:**
- Run: `npm run typecheck`
- Test: Plan caching functionality

**Commit:** `refactor(plan-cache): add proper types to plan cache service`

---

### Task P3.T12: Fix Multi-Collection Orchestrator
**File:** `src/services/multi-collection-orchestrator.service.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 2 (vector types)

**Steps:**
1. Import vector types:
   ```typescript
   import { VectorType, MultiVectorSearchParams, MultiVectorSearchResult } from '#types/vector.types';
   ```
2. Replace 6 `any` instances
3. Fix collection mapping types
4. Remove unused variables (lines 253, 348, 365, 391, 430, 596)

**Validation:**
- Run: `npm run typecheck`
- Run: `npm run lint` - check unused vars warnings
- Test: Multi-collection search

**Commit:** `refactor(multi-collection): add types and remove unused variables`

---

### Task P3.T13: Fix Vector Services
**Files:**
- `src/services/vector-seeding.service.ts` (5 instances)
- `src/services/vector-indexing.service.ts` (5 instances)
- `src/services/enhanced-vector-indexing.service.ts` (4 instances)

**Status:** ⬜ Not Started
**Dependencies:** Phase 2 (vector types)

**Steps:**
1. Import vector types for each file
2. Replace `any` with proper vector/tool types
3. Remove unused variables where noted
4. Ensure type safety in batch operations

**Validation:**
- Run: `npm run typecheck` after each file
- Test: Vector indexing operations

**Commit:** `refactor(vectors): add proper types to vector services`

---

### Task P3.T14: Fix Remaining Services
**Files:**
- `src/services/collection-config.service.ts` (2 instances)
- `src/services/content-generator-factory.service.ts` (2 instances)
- `src/services/health-check.service.ts` (6 instances)
- `src/services/metrics.service.ts` (3 instances)
- `src/services/sync-worker.service.ts` (1 instance)
- `src/services/tool-sync.service.ts` (5 instances)
- `src/services/vector-type-registry.service.ts` (2 instances)

**Status:** ⬜ Not Started
**Dependencies:** Previous tasks

**Steps:**
1. For each file systematically:
   - Identify the `any` usages
   - Determine proper type based on context
   - Replace and test
2. Remove unused imports/variables
3. Ensure all services use consistent patterns

**Validation:**
- Run: `npm run typecheck` after each service
- Run service-specific tests if available

**Commit:** `refactor(services): eliminate any types from utility services`

---

## Section 3.5: Phase 3 Validation

### Task P3.T15: Run Type Check After Phase 3
**Status:** ⬜ Not Started
**Dependencies:** All P3 tasks

**Steps:**
1. Run: `npm run typecheck`
2. Verify: 0 errors
3. Count remaining `any` warnings
4. Should be <100 remaining (major reduction)

**Validation:**
- Document progress
- Identify remaining problem areas

**Commit:** Not applicable - validation only

---

### Task P3.T16: Run Phase 3 Tests
**Status:** ⬜ Not Started
**Dependencies:** P3.T15

**Steps:**
1. Run full test suite: `npm test`
2. Run integration tests: `npm run test:integration`
3. Fix any failures
4. Ensure all service tests pass

**Validation:**
- All tests green
- No regressions

**Commit:** `test: update tests for Phase 3 service type improvements`

---

### Task P3.T17: Create Phase 3 Summary
**Status:** ⬜ Not Started
**Dependencies:** P3.T16

**Steps:**
1. Create `PHASE_3_SUMMARY.md`
2. Document all completed tasks
3. List services refactored
4. Show warning reduction metrics
5. Note any challenges or learnings

**Commit:** `docs: add Phase 3 completion summary`

---

# PHASE 4: Integration Layer (Week 5)

**Goal:** Type all routes, middleware, and controllers

---

## Section 4.1: Middleware

### Task P4.T1: Fix Clerk Auth Middleware
**File:** `src/middleware/clerk-auth.middleware.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 1 (P1.T3)

**Steps:**
1. Open file
2. Import types:
   ```typescript
   import { AppRequest, AsyncRequestHandler } from '#types/express.types';
   import { UnauthorizedError } from '#types/error.types';
   ```
3. Replace line 13 `any`:
   ```typescript
   // Update requireAuth middleware signature
   ```
4. Replace line 54 `any`:
   ```typescript
   // Update clerkAuth middleware
   ```
5. Use proper error classes instead of throwing generic errors

**Validation:**
- Run: `npm run typecheck`
- Test: Authentication flow

**Commit:** `refactor(middleware): add types to Clerk auth middleware`

---

### Task P4.T2: Fix Timeout Middleware
**File:** `src/middleware/timeout.middleware.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 1 (P1.T3)

**Steps:**
1. Import types:
   ```typescript
   import { AsyncRequestHandler } from '#types/express.types';
   ```
2. Replace 5 `any` instances (lines 50, 51, 70, 93, 121)
3. Update timeout handler to use proper types
4. Fix timer callback types

**Validation:**
- Run: `npm run typecheck`
- Test: Timeout scenarios

**Commit:** `refactor(middleware): add types to timeout middleware`

---

### Task P4.T3: Fix Correlation Middleware
**File:** `src/middleware/correlation.middleware.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 1 (P1.T3)

**Steps:**
1. Import types:
   ```typescript
   import { AppRequest, CorrelatedRequest } from '#types/express.types';
   ```
2. Replace lines 54, 77 `any` types
3. Update correlation ID injection to use proper request type

**Validation:**
- Run: `npm run typecheck`
- Verify: Correlation IDs still work

**Commit:** `refactor(middleware): add types to correlation middleware`

---

### Task P4.T4: Fix Rate Limiter Middleware
**File:** `src/middleware/rate-limiters.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 1 (P1.T3)

**Steps:**
1. Import types:
   ```typescript
   import { AppRequest } from '#types/express.types';
   ```
2. Replace line 101 `any`
3. Update rate limit handler types

**Validation:**
- Run: `npm run typecheck`
- Test: Rate limiting

**Commit:** `refactor(middleware): add types to rate limiter`

---

## Section 4.2: Routes

### Task P4.T5: Fix Tools Routes
**File:** `src/routes/tools.routes.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 1 (P1.T3), Phase 2 (tool types)

**Steps:**
1. Import types:
   ```typescript
   import { AppRequest, AsyncRequestHandler } from '#types/express.types';
   import { ToolDocument, CreateToolInput, UpdateToolInput } from '#types/tool-payload.types';
   import { NotFoundError, ValidationError } from '#types/error.types';
   ```
2. Remove unused import (line 14): `ClerkAuthenticatedRequest`
3. Replace all `any` in route handlers (11 instances):
   - Lines 29, 35: GET routes
   - Lines 50, 62, 68, 72: POST routes
   - Lines 90, 141, 175: PUT/PATCH routes
   - Lines 288, 375: DELETE routes
4. Update each route handler:
   ```typescript
   // Example:
   router.get('/:id', async (req: AppRequest, res: Response) => {
     const tool = await toolService.findById(req.params.id);
     if (!tool) {
       throw new NotFoundError('Tool', req.params.id);
     }
     res.json(tool);
   });
   ```

**Validation:**
- Run: `npm run typecheck`
- Run integration tests for tools routes
- Test CRUD operations

**Commit:** `refactor(routes): add proper types to tools routes`

---

### Task P4.T6: Fix Search Routes
**File:** `src/routes/search.routes.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 2 (search types)

**Steps:**
1. Import types:
   ```typescript
   import { AppRequest } from '#types/express.types';
   import { SearchQuery, SearchResponse } from '#types/search.types';
   ```
2. Update route handlers with proper types
3. Validate request body against SearchQuery type

**Validation:**
- Run: `npm run typecheck`
- Test: Search endpoint

**Commit:** `refactor(routes): add types to search routes`

---

### Task P4.T7: Fix Sync Routes
**File:** `src/routes/sync.routes.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 1 (P1.T3)

**Steps:**
1. Import types
2. Update sync route handlers
3. Add proper response types

**Validation:**
- Run: `npm run typecheck`
- Test: Sync operations

**Commit:** `refactor(routes): add types to sync routes`

---

## Section 4.3: Controllers

### Task P4.T8: Fix Search Controller
**File:** `src/controllers/search.controller.ts`
**Status:** ⬜ Not Started (already done in P1.T9)
**Dependencies:** Phase 1

**Steps:**
- Verify error handling is complete
- Ensure all types are proper

**Validation:**
- Run: `npm run typecheck`

**Commit:** Skip if already done in Phase 1

---

## Section 4.4: Graph Nodes

### Task P4.T9: Fix Pipeline Init Types
**File:** `src/core/pipeline.init.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 2 (state types)

**Steps:**
1. Import proper state types
2. Fix line 41 - 3 `any` instances:
   ```typescript
   // Replace with proper state types from intent/plan
   ```
3. Remove unused parameter `intentState`

**Validation:**
- Run: `npm run typecheck`
- Test: LangGraph pipeline

**Commit:** `refactor(pipeline): add proper types to pipeline init`

---

### Task P4.T10: Fix Agentic Search Graph
**File:** `src/graphs/agentic-search.graph.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 2 (state types)

**Steps:**
1. Import state types
2. Fix line 110 `any` type
3. Ensure graph state transitions are properly typed

**Validation:**
- Run: `npm run typecheck`
- Test: Full search pipeline

**Commit:** `refactor(graph): add proper types to agentic search graph`

---

## Section 4.5: Phase 4 Validation

### Task P4.T11: Run Phase 4 Type Check
**Status:** ⬜ Not Started
**Dependencies:** All P4 tasks

**Steps:**
1. Run: `npm run typecheck`
2. Verify: 0 errors
3. Count remaining `any` warnings
4. Should be <50 remaining

**Validation:**
- Document progress

**Commit:** Not applicable

---

### Task P4.T12: Run Phase 4 Tests
**Status:** ⬜ Not Started
**Dependencies:** P4.T11

**Steps:**
1. Run: `npm test`
2. Run: `npm run test:e2e`
3. Fix failures
4. Ensure integration layer works end-to-end

**Validation:**
- All tests pass

**Commit:** `test: update tests for Phase 4 integration layer types`

---

### Task P4.T13: Create Phase 4 Summary
**Status:** ⬜ Not Started
**Dependencies:** P4.T12

**Steps:**
1. Create `PHASE_4_SUMMARY.md`
2. Document completed tasks
3. Note remaining work

**Commit:** `docs: add Phase 4 completion summary`

---

# PHASE 5: Utilities & Helpers (Week 6)

**Goal:** Type all utility functions and helper modules

---

## Section 5.1: Execution Plan Validator

### Task P5.T1: Fix Execution Plan Safety Validator
**File:** `src/utils/execution-plan-safety-validator.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 2

**Steps:**
1. Remove unused imports (lines 1, 3)
2. Import proper types for Plan
3. Replace 20 `any` instances with proper types
4. Make validator functions type-safe

**Validation:**
- Run: `npm run typecheck`
- Test: Plan validation

**Commit:** `refactor(utils): add types to execution plan validator`

---

## Section 5.2: Vector Validation

### Task P5.T2: Fix Vector Validation Utils
**File:** `src/utils/vector-validation.ts`
**Status:** ⬜ Not Started
**Dependencies:** Phase 2 (vector types)

**Steps:**
1. Import vector types
2. Replace 8 `any` instances
3. Create proper type guards for vector validation

**Validation:**
- Run: `npm run typecheck`
- Test: Vector validation functions

**Commit:** `refactor(utils): add types to vector validation`

---

## Section 5.3: Other Utilities

### Task P5.T3: Fix LLM Response Handler
**File:** `src/utils/llm-response-handler.ts`
**Status:** ⬜ Not Started

**Steps:**
1. Import LLM response types
2. Replace 4 `any` instances
3. Create structured response types

**Validation:**
- Run: `npm run typecheck`

**Commit:** `refactor(utils): add types to LLM response handler`

---

### Task P5.T4: Fix Remaining Utils
**Files:**
- `src/utils/thread-manager.ts` (3 instances)
- `src/utils/state-validator.ts` (3 instances)
- `src/utils/debug.ts` (1 instance)
- `src/utils/enhanced-embedding-cache.ts` (2 instances + unused import)
- `src/utils/pattern-matchers.ts`
- `src/utils/fusion.ts`
- `src/utils/result-ranking.ts`
- `src/utils/llm-response-handler.ts`

**Status:** ⬜ Not Started

**Steps:**
1. For each file, systematically replace `any`
2. Remove unused imports
3. Fix case declaration warnings where present

**Validation:**
- Run: `npm run typecheck` after each

**Commit:** `refactor(utils): eliminate any types from utility functions`

---

## Section 5.4: Phase 5 Validation

### Task P5.T5: Run Phase 5 Type Check
**Status:** ⬜ Not Started
**Dependencies:** All P5 tasks

**Steps:**
1. Run: `npm run typecheck`
2. Verify: 0 errors
3. Count remaining `any` - should be minimal (<20)

**Commit:** Not applicable

---

### Task P5.T6: Run Phase 5 Tests
**Status:** ⬜ Not Started

**Steps:**
1. Run: `npm test`
2. Fix any failures

**Commit:** `test: update tests for Phase 5 utility types`

---

### Task P5.T7: Create Phase 5 Summary
**Status:** ⬜ Not Started

**Steps:**
1. Create `PHASE_5_SUMMARY.md`
2. Document completion

**Commit:** `docs: add Phase 5 completion summary`

---

# PHASE 6: Validation & Cleanup (Week 6-7)

**Goal:** Final validation, testing, and documentation

---

## Section 6.1: Final Type Checking

### Task P6.T1: Enable Strict TypeScript Mode
**File:** `tsconfig.json`
**Status:** ⬜ Not Started
**Dependencies:** All previous phases

**Steps:**
1. Update `tsconfig.json`:
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
2. Run: `npm run typecheck`
3. Fix any new errors that appear

**Validation:**
- Clean typecheck output

**Commit:** `chore(typescript): enable strict mode`

---

### Task P6.T2: Final Lint Check
**Status:** ⬜ Not Started

**Steps:**
1. Run: `npm run lint`
2. Verify: 0 `no-explicit-any` warnings
3. Fix any other warnings
4. Run: `npm run lint -- --fix` for auto-fixable issues

**Validation:**
- Clean lint output

**Commit:** `chore: fix remaining lint warnings`

---

## Section 6.2: Testing

### Task P6.T3: Run Full Test Suite
**Status:** ⬜ Not Started

**Steps:**
1. Run: `npm test`
2. Run: `npm run test:integration`
3. Run: `npm run test:e2e`
4. Achieve 100% pass rate

**Validation:**
- All tests green

**Commit:** `test: verify all tests pass with new types`

---

### Task P6.T4: Add Type-Specific Tests
**Status:** ⬜ Not Started

**Steps:**
1. Create tests for generic types
2. Test type inference
3. Test edge cases
4. Add tests for error types

**Validation:**
- New tests pass

**Commit:** `test: add tests for type safety`

---

## Section 6.3: Documentation

### Task P6.T5: Create Type Architecture Documentation
**File:** `docs/TYPE_ARCHITECTURE.md` (NEW)
**Status:** ⬜ Not Started

**Steps:**
1. Document all major type families
2. Explain generic type usage
3. Provide examples
4. Create diagrams showing type relationships

**Commit:** `docs: add type architecture documentation`

---

### Task P6.T6: Update Developer Guide
**File:** `docs/DEVELOPER_GUIDE.md` (NEW)
**Status:** ⬜ Not Started

**Steps:**
1. Create guide on using types in the codebase
2. Best practices
3. Common patterns
4. Troubleshooting

**Commit:** `docs: add developer guide for types`

---

### Task P6.T7: Update API Documentation
**Status:** ⬜ Not Started

**Steps:**
1. Update Swagger/OpenAPI docs with proper types
2. Ensure request/response examples match types
3. Update README if needed

**Commit:** `docs: update API documentation with type information`

---

## Section 6.4: Final Validation

### Task P6.T8: Performance Benchmarking
**Status:** ⬜ Not Started

**Steps:**
1. Run performance benchmarks before/after
2. Verify no regression
3. Document results

**Validation:**
- Performance maintained or improved

**Commit:** `perf: verify no performance regression from type changes`

---

### Task P6.T9: Create Final Summary Report
**File:** `TYPE_REMEDIATION_FINAL_REPORT.md`
**Status:** ⬜ Not Started

**Steps:**
1. Create comprehensive report:
   - Total tasks completed
   - Files modified
   - Warnings eliminated (before: 254, after: 0)
   - New types created
   - Test coverage
   - Performance impact
   - Lessons learned
   - Future recommendations

**Commit:** `docs: add final type remediation report`

---

### Task P6.T10: Celebrate! 🎉
**Status:** ⬜ Not Started

**Steps:**
1. Merge to main branch
2. Tag release
3. Announce completion
4. Team celebration

---

## Task Summary

**Total Tasks:** 120+
- **Phase 1:** 17 tasks (Foundation)
- **Phase 2:** 13 tasks (Domain Types)
- **Phase 3:** 17 tasks (Services)
- **Phase 4:** 13 tasks (Integration)
- **Phase 5:** 7 tasks (Utilities)
- **Phase 6:** 10 tasks (Validation)

**Estimated Timeline:** 7 weeks (34 working days)

---

## Progress Tracking

Use this checklist to track overall progress:

- [ ] Phase 1 Complete (0/17 tasks)
- [ ] Phase 2 Complete (0/13 tasks)
- [ ] Phase 3 Complete (0/17 tasks)
- [ ] Phase 4 Complete (0/13 tasks)
- [ ] Phase 5 Complete (0/7 tasks)
- [ ] Phase 6 Complete (0/10 tasks)

**Overall Progress:** 0/120+ tasks (0%)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-11
**Status:** Ready for Execution
