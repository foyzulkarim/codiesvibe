# Phase 1: Data Layer - Per-Collection Sync Metadata

> **Prerequisites:** Review current `search-api/src/models/tool.model.ts`

---

## Overview

This phase adds sync tracking metadata to the MongoDB tool schema, enabling:
- Per-collection sync status tracking
- Content hashing for change detection
- Audit trail for debugging

---

## 1.1 Type Definitions

Add these types to `search-api/src/models/tool.model.ts`:

```typescript
// ============================================
// SYNC STATUS TYPES
// ============================================

/**
 * Sync status for a collection
 */
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'stale';

/**
 * Categorized error codes for debugging
 */
export type SyncErrorCode =
  | 'EMBEDDING_TIMEOUT'      // Together AI timeout
  | 'EMBEDDING_RATE_LIMIT'   // Together AI rate limit (429)
  | 'QDRANT_UNAVAILABLE'     // Qdrant connection failed
  | 'QDRANT_TIMEOUT'         // Qdrant operation timeout
  | 'VALIDATION_ERROR'       // Invalid tool data
  | 'UNKNOWN';               // Uncategorized error

/**
 * The 4 Qdrant collections we sync to
 */
export type SyncCollectionName = 'tools' | 'functionality' | 'usecases' | 'interface';

/**
 * Sync status for a single collection
 */
export interface ICollectionSyncStatus {
  /** Current sync state */
  status: SyncStatus;

  /** Timestamp of last successful sync */
  lastSyncedAt: Date | null;

  /** Timestamp of last sync attempt (success or failure) */
  lastSyncAttemptAt: Date | null;

  /** Error message if status is 'failed' */
  lastError: string | null;

  /** Categorized error code for programmatic handling */
  errorCode: SyncErrorCode | null;

  /** Number of consecutive failed attempts */
  retryCount: number;

  /** SHA-256 hash of fields relevant to this collection (truncated to 16 chars) */
  contentHash: string;

  /** Increments each time embedding is regenerated */
  vectorVersion: number;
}

/**
 * Overall sync metadata for a tool
 */
export interface ISyncMetadata {
  /** Aggregate status (worst of all collections) */
  overallStatus: SyncStatus;

  /** Per-collection sync status */
  collections: {
    tools: ICollectionSyncStatus;
    functionality: ICollectionSyncStatus;
    usecases: ICollectionSyncStatus;
    interface: ICollectionSyncStatus;
  };

  /** Fields modified in the last update (for debugging) */
  lastModifiedFields: string[];

  /** When sync metadata was created */
  createdAt: Date;

  /** When sync metadata was last updated */
  updatedAt: Date;
}
```

---

## 1.2 Update ITool Interface

Add `syncMetadata` to the existing `ITool` interface:

```typescript
export interface ITool extends Document {
  // ... existing fields (id, name, description, etc.) ...

  /**
   * Sync infrastructure metadata
   * Isolated from business data - UI should not display these fields
   */
  syncMetadata: ISyncMetadata;
}
```

---

## 1.3 Mongoose Schemas

Add these Mongoose schemas:

```typescript
// ============================================
// SYNC METADATA MONGOOSE SCHEMAS
// ============================================

/**
 * Schema for per-collection sync status
 */
const CollectionSyncStatusSchema = new Schema<ICollectionSyncStatus>(
  {
    status: {
      type: String,
      enum: ['synced', 'pending', 'failed', 'stale'],
      default: 'pending',
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    lastSyncAttemptAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
      maxlength: 1000, // Truncate long error messages
    },
    errorCode: {
      type: String,
      enum: [
        'EMBEDDING_TIMEOUT',
        'EMBEDDING_RATE_LIMIT',
        'QDRANT_UNAVAILABLE',
        'QDRANT_TIMEOUT',
        'VALIDATION_ERROR',
        'UNKNOWN',
        null,
      ],
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    contentHash: {
      type: String,
      default: '',
    },
    vectorVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false } // No separate _id for subdocument
);

/**
 * Default values for a new collection sync status
 */
const defaultCollectionSyncStatus = (): ICollectionSyncStatus => ({
  status: 'pending',
  lastSyncedAt: null,
  lastSyncAttemptAt: null,
  lastError: null,
  errorCode: null,
  retryCount: 0,
  contentHash: '',
  vectorVersion: 0,
});

/**
 * Schema for overall sync metadata
 */
const SyncMetadataSchema = new Schema<ISyncMetadata>(
  {
    overallStatus: {
      type: String,
      enum: ['synced', 'pending', 'failed', 'stale'],
      default: 'pending',
    },
    collections: {
      tools: {
        type: CollectionSyncStatusSchema,
        default: defaultCollectionSyncStatus,
      },
      functionality: {
        type: CollectionSyncStatusSchema,
        default: defaultCollectionSyncStatus,
      },
      usecases: {
        type: CollectionSyncStatusSchema,
        default: defaultCollectionSyncStatus,
      },
      interface: {
        type: CollectionSyncStatusSchema,
        default: defaultCollectionSyncStatus,
      },
    },
    lastModifiedFields: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);
```

---

## 1.4 Add to ToolSchema

Add the `syncMetadata` field to the existing `ToolSchema`:

```typescript
const ToolSchema = new Schema<ITool>(
  {
    // ... existing fields ...

    /**
     * Sync metadata - tracks sync status to each Qdrant collection
     */
    syncMetadata: {
      type: SyncMetadataSchema,
      default: () => ({
        overallStatus: 'pending',
        collections: {
          tools: defaultCollectionSyncStatus(),
          functionality: defaultCollectionSyncStatus(),
          usecases: defaultCollectionSyncStatus(),
          interface: defaultCollectionSyncStatus(),
        },
        lastModifiedFields: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
  },
  {
    timestamps: true, // Existing setting
  }
);
```

---

## 1.5 Database Indexes

Add indexes for efficient sync queries:

```typescript
// ============================================
// SYNC-RELATED INDEXES
// ============================================

/**
 * Index for overall sync status queries
 * Used by: Dashboard counts, worker queries
 */
ToolSchema.index(
  { 'syncMetadata.overallStatus': 1 },
  { name: 'sync_overall_status_idx' }
);

/**
 * Index for per-collection status queries
 * Used by: Per-collection dashboard stats
 */
ToolSchema.index(
  { 'syncMetadata.collections.tools.status': 1 },
  { name: 'sync_tools_status_idx' }
);

ToolSchema.index(
  { 'syncMetadata.collections.functionality.status': 1 },
  { name: 'sync_functionality_status_idx' }
);

ToolSchema.index(
  { 'syncMetadata.collections.usecases.status': 1 },
  { name: 'sync_usecases_status_idx' }
);

ToolSchema.index(
  { 'syncMetadata.collections.interface.status': 1 },
  { name: 'sync_interface_status_idx' }
);

/**
 * Compound index for worker queries
 * Finds tools needing sync, ordered by last attempt time
 * Used by: Background sync worker
 */
ToolSchema.index(
  {
    'syncMetadata.overallStatus': 1,
    'syncMetadata.updatedAt': 1
  },
  { name: 'sync_worker_query_idx' }
);

/**
 * Compound index for retry eligibility
 * Finds failed tools under retry limit
 * Used by: Background sync worker
 */
ToolSchema.index(
  {
    'syncMetadata.overallStatus': 1,
    'syncMetadata.collections.tools.retryCount': 1,
    'syncMetadata.collections.functionality.retryCount': 1,
    'syncMetadata.collections.usecases.retryCount': 1,
    'syncMetadata.collections.interface.retryCount': 1,
  },
  { name: 'sync_retry_eligibility_idx' }
);
```

---

## 1.6 Export Types

Ensure the new types are exported:

```typescript
// At the end of tool.model.ts, update exports
export {
  Tool,
  ToolSchema,
  // New exports
  SyncStatus,
  SyncErrorCode,
  SyncCollectionName,
  ICollectionSyncStatus,
  ISyncMetadata,
};
```

---

## Verification Checklist

After implementing Phase 1:

- [ ] Types compile without errors (`npm run typecheck`)
- [ ] Schema validates correctly
- [ ] Indexes are created on MongoDB restart
- [ ] Default sync metadata is applied to new documents
- [ ] Existing documents can be queried (backward compatible)

---

## Migration Notes

**For existing tools without syncMetadata:**

The schema uses `default` values, so existing documents will automatically get default sync metadata when:
1. They are saved (updated)
2. The sync worker processes them

**Optional: Backfill existing documents:**

```javascript
// Run in MongoDB shell or via script
db.tools.updateMany(
  { syncMetadata: { $exists: false } },
  {
    $set: {
      syncMetadata: {
        overallStatus: 'pending',
        collections: {
          tools: { status: 'pending', retryCount: 0, vectorVersion: 0 },
          functionality: { status: 'pending', retryCount: 0, vectorVersion: 0 },
          usecases: { status: 'pending', retryCount: 0, vectorVersion: 0 },
          interface: { status: 'pending', retryCount: 0, vectorVersion: 0 },
        },
        lastModifiedFields: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
  }
);
```

---

## Next Phase

Once Phase 1 is complete, proceed to [Phase 2: Core Services](./PHASE-2-CORE-SERVICES.md).
