# MongoDB → Qdrant Smart Sync: Implementation Plan

> **Version:** 2.0
> **Date:** December 2024
> **Status:** Planning Phase
> **Author:** Claude (AI Assistant)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Current State Analysis](#current-state-analysis)
4. [Requirements Specification](#requirements-specification)
5. [Implementation Phases](#implementation-phases)
6. [File Changes Summary](#file-changes-summary)
7. [Related Documentation](#related-documentation)

---

## Executive Summary

### Problem Statement

Currently, when tools are created, updated, or deleted via the Admin UI, the changes are persisted to MongoDB but **not automatically reflected in Qdrant**. This means:

- New tools are not searchable until manual seeding is run
- Updated tools show stale information in search results
- Deleted tools remain as orphaned vectors in Qdrant

### Solution

Implement a **Smart Sync** system that:

1. **Automatically syncs** MongoDB mutations to all 4 Qdrant collections
2. **Detects field-specific changes** to only sync affected collections
3. **Tracks sync status per-collection** for visibility and recovery
4. **Provides Admin UI** for monitoring and manual intervention

### Key Features

| Feature | Description |
|---------|-------------|
| **Per-Collection Tracking** | Each of the 4 collections has independent sync status |
| **Field-Specific Detection** | Only regenerate embeddings for affected collections |
| **Failure Isolation** | MongoDB updates succeed even if Qdrant sync fails |
| **Background Worker** | Automatic retry of failed/pending syncs |
| **Admin Visibility** | Dashboard showing sync health per collection |
| **Idempotent Retry** | Safe to retry sync multiple times |

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Admin UI                                        │
│                    (Create / Update / Delete Tool)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          tool-crud.service.ts                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  1. Persist to MongoDB (ALWAYS succeeds)                               │ │
│  │  2. Detect changed fields                                              │ │
│  │  3. Trigger async sync (fire-and-forget)                               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          tool-sync.service.ts                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  1. Classify changes per collection (tools/functionality/usecases/...)│ │
│  │  2. Generate embeddings for affected collections                       │ │
│  │  3. Upsert to Qdrant with wait=true                                   │ │
│  │  4. Update syncMetadata per collection                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┬─────────────────┐
                    ▼                 ▼                 ▼                 ▼
             ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
             │  tools   │      │function- │      │ usecases │      │interface │
             │collection│      │  ality   │      │collection│      │collection│
             └──────────┘      └──────────┘      └──────────┘      └──────────┘
```

### Multi-Collection Strategy

Each collection holds **specialized embeddings** optimized for different query types:

| Collection | Fields Used for Embedding | Best For Queries |
|------------|--------------------------|------------------|
| `tools` | name, description, longDescription, tagline | "What is X?" / General |
| `functionality` | functionality, categories | "Tools that do X" / Features |
| `usecases` | industries, userTypes, deployment | "Tools for X industry" / Audience |
| `interface` | interface, pricingModel, status | "Desktop tools" / Platform |

### Per-Collection Sync Status

Each tool document in MongoDB tracks sync status **independently per collection**:

```
Tool Document
├── Business Data (name, description, ...)
└── syncMetadata
    ├── overallStatus: 'synced' | 'pending' | 'failed' | 'stale'
    └── collections
        ├── tools:        { status, lastSyncedAt, contentHash, lastError, ... }
        ├── functionality: { status, lastSyncedAt, contentHash, lastError, ... }
        ├── usecases:     { status, lastSyncedAt, contentHash, lastError, ... }
        └── interface:    { status, lastSyncedAt, contentHash, lastError, ... }
```

---

## Current State Analysis

### Existing Services (To Reuse)

| Service | Location | Reusable Components |
|---------|----------|---------------------|
| `VectorIndexingService` | `vector-indexing.service.ts` | `processTool()`, payload generation, retry logic |
| `ContentGeneratorFactory` | `content-generator-factory.service.ts` | Per-collection content generation |
| `EmbeddingService` | `embedding.service.ts` | `generateEmbedding()` with caching |
| `QdrantService` | `qdrant.service.ts` | `upsertToolVector()`, collection management |
| `CollectionConfigService` | `collection-config.service.ts` | Collection field mappings |

### Existing Seeding Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `seed-vectors.ts` | Initial seeding to single collection | Working |
| `seed-enhanced-vectors.ts` | Multi-collection seeding | Working |

### Gap Analysis

| Current | Missing |
|---------|---------|
| Manual seeding via scripts | Automatic sync on CRUD |
| No sync status tracking | Per-collection status in MongoDB |
| No retry mechanism | Background worker with backoff |
| No admin visibility | Dashboard with sync health |

---

## Requirements Specification

### 1. Data Persistence Requirements

**State Isolation:**
- Sync metadata must be isolated from business data
- UI logic must not accidentally display sync flags

**Status Tracking (per collection):**
- `synced` - Successfully indexed in Qdrant
- `pending` - Never synced (new tool)
- `stale` - Updated since last sync
- `failed` - Last sync attempt failed

**Audit Trail:**
- `lastSyncedAt` - Timestamp of last successful sync
- `lastSyncAttemptAt` - Timestamp of last attempt
- `lastError` - Error message if failed
- `errorCode` - Categorized error type
- `retryCount` - Number of failed attempts
- `contentHash` - Hash of fields for change detection
- `vectorVersion` - Increments on embedding regeneration

### 2. Service Logic Requirements

**Change Classification:**
- Compare incoming data against existing record
- Classify changes per collection:
  - **Semantic change** → Needs embedding regeneration
  - **No change** → Skip collection

**Field-to-Collection Mapping:**

| Changed Field | Affected Collection |
|---------------|---------------------|
| name, description, longDescription, tagline | tools |
| functionality, categories | functionality |
| industries, userTypes, deployment | usecases |
| interface, pricingModel, status | interface |
| pricing, website, logoUrl, etc. | None (metadata only) |

**Failure Containment:**
- MongoDB update MUST succeed regardless of Qdrant status
- Failed sync → Mark collection as `failed` with error details
- Worker will retry failed collections

### 3. Integration Requirements (Qdrant)

**Synchronous Consistency:**
- All Qdrant operations use `wait: true`
- Operation returns success only when data is searchable

**ID Consistency:**
- MongoDB `id` field → Qdrant Point ID (via UUID v5)
- Ensures 1:1 mapping, prevents duplicates

**Operations:**
- `upsertToolVector()` - Full upsert with embedding
- `updatePayloadOnly()` - Metadata update without embedding (NEW)
- `deleteToolVector()` - Remove from collection

### 4. User Experience Requirements

**Visual Indicators:**
- Per-collection status badges (T/F/U/I)
- Color coding: green=synced, yellow=stale, red=failed, gray=pending
- Tooltips with error details

**Actions:**
- "Sync Now" button per tool
- "Sync All Pending" bulk action
- "Force Worker Run" trigger

**Dashboard Widget:**
- Overall sync health percentage
- Per-collection breakdown
- Worker status (running/stopped/processing)
- Last run statistics

---

## Implementation Phases

### Phase 1: Data Layer
- Add `ISyncMetadata` interface with per-collection status
- Update Mongoose schema with `syncMetadata` subdocument
- Add database indexes for sync queries

**Detailed Guide:** [Phase 1 - Data Layer](./sync-implementation/PHASE-1-DATA-LAYER.md)

### Phase 2: Core Services
- Create `ContentHashService` for per-collection hashing
- Create `ToolSyncService` for sync orchestration
- Add `updatePayloadOnly()` to QdrantService

**Detailed Guide:** [Phase 2 - Core Services](./sync-implementation/PHASE-2-CORE-SERVICES.md)

### Phase 3: CRUD Integration
- Modify `createTool()` to initialize sync metadata and trigger sync
- Modify `updateTool()` with field-specific change detection
- Modify `deleteTool()` to remove from all collections

**Detailed Guide:** [Phase 3 - CRUD Integration](./sync-implementation/PHASE-3-CRUD-INTEGRATION.md)

### Phase 4: Background Worker
- Create `SyncWorkerService` with retry logic
- Implement exponential backoff per collection
- Integrate with server lifecycle

**Detailed Guide:** [Phase 4 - Background Worker](./sync-implementation/PHASE-4-BACKGROUND-WORKER.md)

### Phase 5: API Endpoints
- Create `/api/sync/status` - Overall stats with per-collection breakdown
- Create `/api/sync/tools` - List tools by sync status
- Create `/api/sync/tools/:id/retry` - Force sync single tool
- Create `/api/sync/batch` - Batch sync multiple tools
- Create `/api/sync/worker/run` - Trigger worker cycle

**Detailed Guide:** [Phase 5 - API Endpoints](./sync-implementation/PHASE-5-API-ENDPOINTS.md)

### Phase 6: Admin UI
- Add sync status column with per-collection indicators
- Create `SyncStatusIndicator` component
- Create `SyncStatusWidget` dashboard component
- Add sync hooks (`useSyncStatus`, `useSyncTool`, etc.)

**Detailed Guide:** [Phase 6 - Admin UI](./sync-implementation/PHASE-6-ADMIN-UI.md)

---

## File Changes Summary

### New Files

| File | Description |
|------|-------------|
| `search-api/src/services/content-hash.service.ts` | Per-collection content hashing |
| `search-api/src/services/tool-sync.service.ts` | Multi-collection sync orchestration |
| `search-api/src/services/sync-worker.service.ts` | Background retry worker |
| `search-api/src/routes/sync.routes.ts` | Sync API endpoints |
| `src/hooks/api/useSyncAdmin.ts` | React Query sync hooks |
| `src/components/admin/SyncStatusIndicator.tsx` | Status column component |
| `src/components/admin/SyncStatusWidget.tsx` | Dashboard widget |

### Modified Files

| File | Changes |
|------|---------|
| `search-api/src/models/tool.model.ts` | Add `ISyncMetadata`, `SyncMetadataSchema`, indexes |
| `search-api/src/services/tool-crud.service.ts` | Trigger sync on create/update/delete |
| `search-api/src/services/qdrant.service.ts` | Add `updatePayloadOnly()`, `deleteToolVector()` |
| `search-api/src/server.ts` | Register sync routes, start worker |
| `src/hooks/api/useToolsAdmin.ts` | Add sync metadata types |
| `src/pages/admin/ToolsList.tsx` | Add sync status column |

### Environment Variables

```env
# Sync Worker Configuration
SYNC_WORKER_ENABLED=true
SYNC_WORKER_INTERVAL_MS=60000
SYNC_WORKER_BATCH_SIZE=10
SYNC_MAX_RETRIES=5
SYNC_BASE_BACKOFF_MS=5000
SYNC_BACKOFF_MULTIPLIER=2
SYNC_MAX_BACKOFF_MS=300000
```

---

## Related Documentation

- [Phase 1 - Data Layer](./sync-implementation/PHASE-1-DATA-LAYER.md)
- [Phase 2 - Core Services](./sync-implementation/PHASE-2-CORE-SERVICES.md)
- [Phase 3 - CRUD Integration](./sync-implementation/PHASE-3-CRUD-INTEGRATION.md)
- [Phase 4 - Background Worker](./sync-implementation/PHASE-4-BACKGROUND-WORKER.md)
- [Phase 5 - API Endpoints](./sync-implementation/PHASE-5-API-ENDPOINTS.md)
- [Phase 6 - Admin UI](./sync-implementation/PHASE-6-ADMIN-UI.md)

---

## Quick Start Checklist

Before starting implementation:

- [ ] Read this overview document
- [ ] Review current `tool.model.ts` schema
- [ ] Review current `tool-crud.service.ts` implementation
- [ ] Review `VectorIndexingService` patterns
- [ ] Review `ContentGeneratorFactory` collection generators
- [ ] Understand the 4-collection architecture

Implementation order:

1. [ ] Phase 1: Data Layer (schema changes)
2. [ ] Phase 2: Core Services (sync logic)
3. [ ] Phase 3: CRUD Integration (triggers)
4. [ ] Phase 4: Background Worker (retry)
5. [ ] Phase 5: API Endpoints (management)
6. [ ] Phase 6: Admin UI (visibility)

---

*This document serves as the master reference for the MongoDB-Qdrant sync implementation. Each phase has its own detailed guide with code examples.*
