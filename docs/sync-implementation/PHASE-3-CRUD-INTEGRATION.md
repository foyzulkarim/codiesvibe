# Phase 3: CRUD Integration - Sync Triggers

> **Prerequisites:** Complete Phase 1 (Data Layer) and Phase 2 (Core Services)

---

## Overview

This phase modifies the existing `tool-crud.service.ts` to:
- Initialize sync metadata on tool creation
- Detect field changes and trigger appropriate sync on updates
- Remove from all Qdrant collections on deletion

---

## 3.1 Import Statements

Add these imports to `search-api/src/services/tool-crud.service.ts`:

```typescript
import { toolSyncService } from './tool-sync.service';
import { contentHashService } from './content-hash.service';
import { SyncCollectionName } from '../models/tool.model';
```

---

## 3.2 Modify createTool()

Update the `createTool` method to initialize sync metadata and trigger initial sync:

```typescript
/**
 * Create a new tool
 *
 * 1. Generates content hashes for all collections
 * 2. Initializes sync metadata with 'pending' status
 * 3. Saves to MongoDB (this ALWAYS succeeds)
 * 4. Triggers async sync to all Qdrant collections (fire-and-forget)
 *
 * @param data - Tool creation data
 * @param clerkUserId - Authenticated user ID
 * @returns Created tool document
 */
async createTool(data: CreateToolInput, clerkUserId: string): Promise<ITool> {
  await this.ensureConnection();

  // Generate content hashes for all collections
  // These are used for change detection on future updates
  const hashes = contentHashService.generateAllHashes(data as any);

  const toolData = {
    ...data,
    slug: data.slug || data.id,
    contributor: clerkUserId,
    dateAdded: new Date(),
    lastUpdated: new Date(),

    // Initialize per-collection sync metadata
    syncMetadata: {
      overallStatus: 'pending' as const,
      collections: {
        tools: {
          status: 'pending' as const,
          lastSyncedAt: null,
          lastSyncAttemptAt: null,
          lastError: null,
          errorCode: null,
          retryCount: 0,
          contentHash: hashes.tools,
          vectorVersion: 0,
        },
        functionality: {
          status: 'pending' as const,
          lastSyncedAt: null,
          lastSyncAttemptAt: null,
          lastError: null,
          errorCode: null,
          retryCount: 0,
          contentHash: hashes.functionality,
          vectorVersion: 0,
        },
        usecases: {
          status: 'pending' as const,
          lastSyncedAt: null,
          lastSyncAttemptAt: null,
          lastError: null,
          errorCode: null,
          retryCount: 0,
          contentHash: hashes.usecases,
          vectorVersion: 0,
        },
        interface: {
          status: 'pending' as const,
          lastSyncedAt: null,
          lastSyncAttemptAt: null,
          lastError: null,
          errorCode: null,
          retryCount: 0,
          contentHash: hashes.interface,
          vectorVersion: 0,
        },
      },
      lastModifiedFields: Object.keys(data),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  // Save to MongoDB - this ALWAYS succeeds regardless of Qdrant status
  const tool = new Tool(toolData);
  const savedTool = await tool.save();

  // Trigger async sync to ALL collections (fire-and-forget)
  // If this fails, the background worker will retry
  toolSyncService
    .syncTool(savedTool.id, { force: true })
    .then((result) => {
      searchLogger.info('Initial sync completed', {
        toolId: savedTool.id,
        success: result.success,
        collections: result.collections.map(
          (c) => `${c.collection}:${c.success ? 'ok' : 'fail'}`
        ),
      });
    })
    .catch((err) => {
      searchLogger.warn('Initial sync failed, will retry via worker', {
        toolId: savedTool.id,
        error: err.message,
      });
    });

  return savedTool;
}
```

---

## 3.3 Modify updateTool()

Update the `updateTool` method to detect changes and sync only affected collections:

```typescript
/**
 * Update an existing tool
 *
 * 1. Detects which fields changed
 * 2. Classifies changes per collection (semantic vs metadata)
 * 3. Updates MongoDB (this ALWAYS succeeds)
 * 4. Triggers sync only for affected collections (optimized)
 *
 * @param id - Tool ID or slug
 * @param data - Update data
 * @returns Updated tool document or null if not found
 */
async updateTool(id: string, data: UpdateToolInput): Promise<ITool | null> {
  await this.ensureConnection();

  // Fetch existing tool for change detection
  const existingTool = await Tool.findOne({
    $or: [{ id }, { slug: id }],
  });

  if (!existingTool) {
    return null;
  }

  // Detect which fields changed
  const changedFields = contentHashService.detectChangedFields(
    existingTool,
    data
  );

  // Classify changes per collection
  const changeClassification = contentHashService.classifyChanges(
    existingTool,
    data
  );

  // Get list of affected collections (need embedding regeneration)
  const affectedCollections = (
    Object.entries(changeClassification) as [SyncCollectionName, string][]
  )
    .filter(([_, change]) => change === 'semantic')
    .map(([collection]) => collection);

  // Generate new hashes for affected collections
  const mergedTool = { ...existingTool.toObject(), ...data };
  const newHashes = contentHashService.generateAllHashes(mergedTool);

  // Build MongoDB update object
  const updateData: any = {
    ...data,
    lastUpdated: new Date(),
    'syncMetadata.updatedAt': new Date(),
    'syncMetadata.lastModifiedFields': changedFields,
  };

  // Mark affected collections as 'stale' and update their hashes
  for (const collection of affectedCollections) {
    updateData[`syncMetadata.collections.${collection}.status`] = 'stale';
    updateData[`syncMetadata.collections.${collection}.contentHash`] =
      newHashes[collection];
  }

  // Update overall status if any collection is affected
  if (affectedCollections.length > 0) {
    updateData['syncMetadata.overallStatus'] = 'stale';
  }

  // Update MongoDB - this ALWAYS succeeds regardless of Qdrant status
  const tool = await Tool.findOneAndUpdate(
    { $or: [{ id }, { slug: id }] },
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();

  if (tool) {
    searchLogger.info('Tool updated', {
      toolId: id,
      changedFields,
      affectedCollections,
      isMetadataOnly: affectedCollections.length === 0 && changedFields.length > 0,
    });

    // Trigger appropriate sync based on change type
    if (affectedCollections.length > 0) {
      // Semantic changes - sync affected collections with new embeddings
      toolSyncService
        .syncTool(id, { collections: affectedCollections })
        .then((result) => {
          searchLogger.info('Update sync completed', {
            toolId: id,
            success: result.success,
            collections: result.collections.map(
              (c) => `${c.collection}:${c.success ? 'ok' : 'fail'}`
            ),
          });
        })
        .catch((err) => {
          searchLogger.warn('Update sync failed, will retry via worker', {
            toolId: id,
            error: err.message,
          });
        });
    } else if (changedFields.length > 0) {
      // Metadata-only changes - update payloads without regenerating embeddings
      toolSyncService
        .updatePayloadsOnly(id)
        .then((result) => {
          searchLogger.info('Payload update completed', {
            toolId: id,
            success: result.success,
          });
        })
        .catch((err) => {
          searchLogger.warn('Payload update failed', {
            toolId: id,
            error: err.message,
          });
        });
    }
    // If no fields changed, no sync needed
  }

  return tool as unknown as ITool | null;
}
```

---

## 3.4 Modify deleteTool()

Update the `deleteTool` method to remove from all Qdrant collections:

```typescript
/**
 * Delete a tool
 *
 * 1. Removes from MongoDB
 * 2. Removes from ALL Qdrant collections (fire-and-forget)
 *
 * @param id - Tool ID or slug
 * @returns True if deleted, false if not found
 */
async deleteTool(id: string): Promise<boolean> {
  await this.ensureConnection();

  // Delete from MongoDB
  const result = await Tool.findOneAndDelete({
    $or: [{ id }, { slug: id }],
  });

  if (result) {
    searchLogger.info('Tool deleted from MongoDB', { toolId: id });

    // Remove from ALL Qdrant collections (fire-and-forget)
    // Even if this fails, the tool is gone from MongoDB
    // Orphaned vectors will eventually be cleaned up
    toolSyncService
      .deleteFromAllCollections(id)
      .then(() => {
        searchLogger.info('Tool deleted from all Qdrant collections', {
          toolId: id,
        });
      })
      .catch((err) => {
        searchLogger.error('Failed to delete from some Qdrant collections', {
          toolId: id,
          error: err.message,
        });
      });

    return true;
  }

  return false;
}
```

---

## Key Design Decisions

### 1. Fire-and-Forget Pattern

Sync operations are triggered asynchronously and don't block the API response:

```typescript
// This returns immediately to the client
const savedTool = await tool.save();

// This runs in the background
toolSyncService.syncTool(savedTool.id).catch(err => {
  // Log error but don't throw
});

return savedTool; // Client gets response without waiting for sync
```

**Why?**
- MongoDB update is the source of truth
- Qdrant sync can be retried by background worker
- Better API response times
- Failure containment (DB works even if Qdrant is down)

### 2. Optimized Update Sync

Updates only sync affected collections:

```typescript
// If only 'name' changed → sync only 'tools' collection
// If only 'pricing' changed → update payloads only (no embedding)
// If 'functionality' changed → sync only 'functionality' collection
```

**Why?**
- Minimizes unnecessary embedding API calls
- Faster sync operations
- Lower costs

### 3. Pre-calculated Hashes

Content hashes are calculated before save:

```typescript
const hashes = contentHashService.generateAllHashes(data);
// Store hashes in syncMetadata
```

**Why?**
- Enables fast change detection on subsequent updates
- No need to re-fetch existing document for comparison
- Consistent hash generation

---

## Verification Checklist

After implementing Phase 3:

- [ ] Creating a tool initializes sync metadata correctly
- [ ] Creating a tool triggers sync to all 4 collections
- [ ] Updating semantic fields (name, description) marks affected collections as 'stale'
- [ ] Updating metadata fields (pricing, website) only updates payloads
- [ ] Deleting a tool removes from all Qdrant collections
- [ ] API responses are not blocked by sync operations
- [ ] Errors are logged but don't crash the API

---

## Testing Scenarios

### Test 1: Create Tool
```bash
POST /api/tools
{
  "id": "test-tool",
  "name": "Test Tool",
  "description": "A test tool",
  ...
}
```
**Expected:** Tool created, sync triggered, syncMetadata.overallStatus = 'pending' → 'synced'

### Test 2: Update Semantic Field
```bash
PATCH /api/tools/test-tool
{
  "name": "Updated Test Tool"
}
```
**Expected:** Only 'tools' collection synced (name is semantic for tools collection)

### Test 3: Update Metadata Field
```bash
PATCH /api/tools/test-tool
{
  "website": "https://example.com"
}
```
**Expected:** Payloads updated in all collections, no embedding regeneration

### Test 4: Delete Tool
```bash
DELETE /api/tools/test-tool
```
**Expected:** Removed from MongoDB and all 4 Qdrant collections

---

## Next Phase

Once Phase 3 is complete, proceed to [Phase 4: Background Worker](./PHASE-4-BACKGROUND-WORKER.md).
