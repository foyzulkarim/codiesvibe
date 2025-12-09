# Phase 2: Core Services - Sync Logic

> **Prerequisites:** Complete Phase 1 (Data Layer)

---

## Overview

This phase creates the core sync services:
- `ContentHashService` - Per-collection change detection
- `ToolSyncService` - Multi-collection sync orchestration
- `QdrantService` enhancements - Payload-only updates

---

## 2.1 Content Hash Service

**New File:** `search-api/src/services/content-hash.service.ts`

This service detects which collections are affected by field changes.

```typescript
import crypto from 'crypto';
import { ITool, SyncCollectionName } from '../models/tool.model';

// ============================================
// FIELD-TO-COLLECTION MAPPINGS
// ============================================

/**
 * Fields that generate embeddings for each collection
 * These match the ContentGeneratorFactory implementations
 */
export const COLLECTION_FIELDS: Record<SyncCollectionName, string[]> = {
  tools: ['name', 'description', 'longDescription', 'tagline'],
  functionality: ['functionality', 'categories'],
  usecases: ['industries', 'userTypes', 'deployment'],
  interface: ['interface', 'pricingModel', 'status'],
};

/**
 * All semantic fields (affect at least one collection's embedding)
 */
export const ALL_SEMANTIC_FIELDS: string[] = Object.values(COLLECTION_FIELDS).flat();

/**
 * Metadata-only fields (stored in Qdrant payload but don't affect embeddings)
 */
export const METADATA_ONLY_FIELDS: string[] = [
  'pricing',
  'pricingUrl',
  'website',
  'documentation',
  'logoUrl',
  'contributor',
  'dateAdded',
  'lastUpdated',
  'createdAt',
  'updatedAt',
];

// ============================================
// SERVICE CLASS
// ============================================

export class ContentHashService {
  /**
   * Generate a deterministic hash for a specific collection's fields
   *
   * The hash is used to detect if the content that generates the embedding
   * has changed since the last sync.
   *
   * @param tool - Tool document (full or partial)
   * @param collection - Target collection name
   * @returns 16-character hex hash
   */
  generateCollectionHash(tool: Partial<ITool>, collection: SyncCollectionName): string {
    const fields = COLLECTION_FIELDS[collection];
    const data: Record<string, any> = {};

    for (const field of fields) {
      const value = tool[field as keyof ITool];

      // Normalize values for consistent hashing
      if (Array.isArray(value)) {
        // Sort arrays for order-independent comparison
        data[field] = [...value].sort();
      } else if (typeof value === 'string') {
        // Normalize strings
        data[field] = value.trim().toLowerCase();
      } else {
        data[field] = value ?? null;
      }
    }

    // Create deterministic JSON string
    const normalized = JSON.stringify(data, Object.keys(data).sort());

    // Generate SHA-256 hash (truncated to 16 chars for storage efficiency)
    return crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generate hashes for all collections
   *
   * @param tool - Tool document
   * @returns Object with hash for each collection
   */
  generateAllHashes(tool: Partial<ITool>): Record<SyncCollectionName, string> {
    return {
      tools: this.generateCollectionHash(tool, 'tools'),
      functionality: this.generateCollectionHash(tool, 'functionality'),
      usecases: this.generateCollectionHash(tool, 'usecases'),
      interface: this.generateCollectionHash(tool, 'interface'),
    };
  }

  /**
   * Detect which fields changed between old and new data
   *
   * @param oldTool - Existing tool document
   * @param newData - Incoming update data
   * @returns Array of changed field names
   */
  detectChangedFields(oldTool: ITool, newData: Partial<ITool>): string[] {
    const changedFields: string[] = [];

    for (const field of Object.keys(newData)) {
      // Skip internal fields
      if (field === 'syncMetadata' || field === 'lastUpdated' || field === '_id') {
        continue;
      }

      const oldValue = JSON.stringify(oldTool[field as keyof ITool]);
      const newValue = JSON.stringify(newData[field as keyof typeof newData]);

      if (oldValue !== newValue) {
        changedFields.push(field);
      }
    }

    return changedFields;
  }

  /**
   * Determine which collections need embedding regeneration
   *
   * @param changedFields - Array of changed field names
   * @returns Array of affected collection names
   */
  getAffectedCollections(changedFields: string[]): SyncCollectionName[] {
    const affected = new Set<SyncCollectionName>();

    for (const field of changedFields) {
      for (const [collection, fields] of Object.entries(COLLECTION_FIELDS)) {
        if (fields.includes(field)) {
          affected.add(collection as SyncCollectionName);
        }
      }
    }

    return Array.from(affected);
  }

  /**
   * Classify changes per collection
   *
   * Compares content hashes to determine which collections need sync.
   *
   * @param oldTool - Existing tool with sync metadata
   * @param newData - Incoming update data
   * @returns Object mapping each collection to 'semantic' or 'none'
   */
  classifyChanges(
    oldTool: ITool,
    newData: Partial<ITool>
  ): Record<SyncCollectionName, 'semantic' | 'none'> {
    const result: Record<SyncCollectionName, 'semantic' | 'none'> = {
      tools: 'none',
      functionality: 'none',
      usecases: 'none',
      interface: 'none',
    };

    // Merge old and new data for hash calculation
    const mergedTool = { ...oldTool.toObject?.() ?? oldTool, ...newData };

    for (const collection of Object.keys(COLLECTION_FIELDS) as SyncCollectionName[]) {
      // Get stored hash (or calculate from old data if not stored)
      const oldHash =
        oldTool.syncMetadata?.collections?.[collection]?.contentHash ||
        this.generateCollectionHash(oldTool, collection);

      // Calculate new hash
      const newHash = this.generateCollectionHash(mergedTool, collection);

      // Compare hashes
      if (oldHash !== newHash) {
        result[collection] = 'semantic';
      }
    }

    return result;
  }

  /**
   * Check if only metadata fields changed (no embedding regeneration needed)
   *
   * @param changedFields - Array of changed field names
   * @returns True if all changes are metadata-only
   */
  isMetadataOnlyChange(changedFields: string[]): boolean {
    return changedFields.every((field) => METADATA_ONLY_FIELDS.includes(field));
  }

  /**
   * Check if any semantic fields changed
   *
   * @param changedFields - Array of changed field names
   * @returns True if at least one semantic field changed
   */
  hasSemanticChanges(changedFields: string[]): boolean {
    return changedFields.some((field) => ALL_SEMANTIC_FIELDS.includes(field));
  }
}

// Export singleton instance
export const contentHashService = new ContentHashService();
```

---

## 2.2 Tool Sync Service

**New File:** `search-api/src/services/tool-sync.service.ts`

This service orchestrates syncing tools to all Qdrant collections.

```typescript
import {
  Tool,
  ITool,
  SyncCollectionName,
  SyncStatus,
  SyncErrorCode,
} from '../models/tool.model';
import { qdrantService } from './qdrant.service';
import { embeddingService } from './embedding.service';
import { ContentGeneratorFactory } from './content-generator-factory.service';
import { CollectionConfigService } from './collection-config.service';
import { contentHashService, COLLECTION_FIELDS } from './content-hash.service';
import { searchLogger } from '../config/logger';

// ============================================
// TYPES
// ============================================

/**
 * Result of syncing a single collection
 */
export interface CollectionSyncResult {
  collection: SyncCollectionName;
  success: boolean;
  duration: number;
  error?: string;
  errorCode?: SyncErrorCode;
  skipped?: boolean;
  reason?: string;
}

/**
 * Result of syncing a tool to all collections
 */
export interface ToolSyncResult {
  toolId: string;
  success: boolean;
  totalDuration: number;
  collections: CollectionSyncResult[];
  overallStatus: SyncStatus;
}

/**
 * Options for sync operations
 */
export interface SyncOptions {
  /** Ignore content hashes, force sync all collections */
  force?: boolean;

  /** Only sync specific collections */
  collections?: SyncCollectionName[];

  /** Skip collections with unchanged content hashes (default: true) */
  skipUnchanged?: boolean;
}

/**
 * Sync statistics for dashboard
 */
export interface SyncStats {
  total: number;
  synced: number;
  pending: number;
  stale: number;
  failed: number;
  perCollection: Record<
    SyncCollectionName,
    {
      synced: number;
      pending: number;
      stale: number;
      failed: number;
    }
  >;
}

// ============================================
// SERVICE CLASS
// ============================================

export class ToolSyncService {
  private readonly collectionConfig: CollectionConfigService;
  private readonly contentFactory: ContentGeneratorFactory;

  private readonly ALL_COLLECTIONS: SyncCollectionName[] = [
    'tools',
    'functionality',
    'usecases',
    'interface',
  ];

  constructor() {
    this.collectionConfig = new CollectionConfigService();
    this.contentFactory = new ContentGeneratorFactory(this.collectionConfig);
  }

  // ============================================
  // MAIN SYNC METHODS
  // ============================================

  /**
   * Sync a tool to all (or specified) Qdrant collections
   *
   * This is the main entry point for syncing a single tool.
   *
   * @param toolId - Tool ID or slug
   * @param options - Sync options
   * @returns Sync result with per-collection status
   */
  async syncTool(toolId: string, options: SyncOptions = {}): Promise<ToolSyncResult> {
    const startTime = Date.now();
    const collectionsToSync = options.collections || this.ALL_COLLECTIONS;
    const results: CollectionSyncResult[] = [];

    try {
      // 1. Fetch tool from MongoDB
      const tool = await Tool.findOne({
        $or: [{ id: toolId }, { slug: toolId }],
      });

      if (!tool) {
        throw new Error(`Tool not found: ${toolId}`);
      }

      // 2. Generate current hashes for all collections
      const currentHashes = contentHashService.generateAllHashes(tool);

      // 3. Sync each collection
      for (const collection of collectionsToSync) {
        const collectionStart = Date.now();

        try {
          // Check if sync is needed (unless forced)
          const existingHash =
            tool.syncMetadata?.collections?.[collection]?.contentHash;
          const needsSync =
            options.force ||
            !existingHash ||
            existingHash !== currentHashes[collection];

          if (!needsSync && options.skipUnchanged !== false) {
            results.push({
              collection,
              success: true,
              duration: Date.now() - collectionStart,
              skipped: true,
              reason: 'Content hash unchanged',
            });
            continue;
          }

          // Mark sync attempt timestamp
          await this.markCollectionSyncAttempt(tool._id, collection);

          // Generate content using ContentGeneratorFactory
          const generator = this.contentFactory.createGenerator(collection);
          const content = generator.generate(tool as any);

          if (!content.trim()) {
            throw new Error(`Empty content generated for collection: ${collection}`);
          }

          // Generate embedding using EmbeddingService
          const embedding = await embeddingService.generateEmbedding(content);

          // Build Qdrant payload
          const payload = this.buildCollectionPayload(tool, collection);

          // Upsert to Qdrant with wait=true for consistency
          const vectorType =
            this.collectionConfig.getVectorTypeForCollection(collection);
          await qdrantService.upsertToolVector(
            tool.id,
            embedding,
            payload,
            vectorType
          );

          // Mark success in MongoDB
          await this.markCollectionSyncSuccess(
            tool._id,
            collection,
            currentHashes[collection]
          );

          results.push({
            collection,
            success: true,
            duration: Date.now() - collectionStart,
          });

          searchLogger.info(`Synced tool to ${collection}`, {
            toolId: tool.id,
            duration: Date.now() - collectionStart,
          });
        } catch (error) {
          const errorCode = this.classifyError(error);
          await this.markCollectionSyncFailed(
            tool._id,
            collection,
            error as Error,
            errorCode
          );

          results.push({
            collection,
            success: false,
            duration: Date.now() - collectionStart,
            error: (error as Error).message,
            errorCode,
          });

          searchLogger.error(`Failed to sync tool to ${collection}`, {
            toolId: tool.id,
            error: (error as Error).message,
            errorCode,
          });
        }
      }

      // 4. Calculate and update overall status
      const overallStatus = this.calculateOverallStatus(results);
      await this.updateOverallStatus(tool._id, overallStatus);

      return {
        toolId,
        success: results.every((r) => r.success || r.skipped),
        totalDuration: Date.now() - startTime,
        collections: results,
        overallStatus,
      };
    } catch (error) {
      searchLogger.error('Tool sync failed completely', {
        toolId,
        error: (error as Error).message,
      });

      return {
        toolId,
        success: false,
        totalDuration: Date.now() - startTime,
        collections: results,
        overallStatus: 'failed',
      };
    }
  }

  /**
   * Sync multiple tools
   *
   * @param toolIds - Array of tool IDs
   * @param options - Sync options
   * @returns Array of sync results
   */
  async syncToolBatch(
    toolIds: string[],
    options: SyncOptions = {}
  ): Promise<ToolSyncResult[]> {
    const results: ToolSyncResult[] = [];

    for (const toolId of toolIds) {
      const result = await this.syncTool(toolId, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Sync only collections affected by changed fields
   *
   * Used by updateTool for optimized syncing.
   *
   * @param toolId - Tool ID
   * @param changedFields - Array of changed field names
   * @returns Sync result
   */
  async syncAffectedCollections(
    toolId: string,
    changedFields: string[]
  ): Promise<ToolSyncResult> {
    const affectedCollections =
      contentHashService.getAffectedCollections(changedFields);

    if (affectedCollections.length === 0) {
      // Only metadata changed - update payloads without embedding
      return this.updatePayloadsOnly(toolId);
    }

    return this.syncTool(toolId, { collections: affectedCollections });
  }

  // ============================================
  // METADATA-ONLY UPDATE (CHEAP PATH)
  // ============================================

  /**
   * Update payloads in all collections without regenerating embeddings
   *
   * Used when only metadata fields changed (pricing, URLs, etc.)
   *
   * @param toolId - Tool ID
   * @returns Sync result
   */
  async updatePayloadsOnly(toolId: string): Promise<ToolSyncResult> {
    const startTime = Date.now();
    const results: CollectionSyncResult[] = [];

    try {
      const tool = await Tool.findOne({
        $or: [{ id: toolId }, { slug: toolId }],
      });

      if (!tool) {
        throw new Error(`Tool not found: ${toolId}`);
      }

      for (const collection of this.ALL_COLLECTIONS) {
        const collectionStart = Date.now();

        try {
          const payload = this.buildCollectionPayload(tool, collection);
          await qdrantService.updatePayloadOnly(tool.id, payload, {
            collection,
          });

          results.push({
            collection,
            success: true,
            duration: Date.now() - collectionStart,
            reason: 'Payload-only update (no embedding)',
          });
        } catch (error) {
          results.push({
            collection,
            success: false,
            duration: Date.now() - collectionStart,
            error: (error as Error).message,
          });
        }
      }

      return {
        toolId,
        success: results.every((r) => r.success),
        totalDuration: Date.now() - startTime,
        collections: results,
        overallStatus: results.every((r) => r.success) ? 'synced' : 'failed',
      };
    } catch (error) {
      return {
        toolId,
        success: false,
        totalDuration: Date.now() - startTime,
        collections: results,
        overallStatus: 'failed',
      };
    }
  }

  // ============================================
  // DELETE FROM QDRANT
  // ============================================

  /**
   * Delete tool from all Qdrant collections
   *
   * @param toolId - Tool ID
   */
  async deleteFromAllCollections(toolId: string): Promise<void> {
    const errors: string[] = [];

    for (const collection of this.ALL_COLLECTIONS) {
      try {
        const vectorType =
          this.collectionConfig.getVectorTypeForCollection(collection);
        await qdrantService.deleteToolVector(toolId, vectorType);
        searchLogger.info(`Deleted tool from ${collection}`, { toolId });
      } catch (error) {
        errors.push(`${collection}: ${(error as Error).message}`);
        searchLogger.error(`Failed to delete tool from ${collection}`, {
          toolId,
          error: (error as Error).message,
        });
      }
    }

    if (errors.length > 0) {
      searchLogger.warn('Some collections failed during delete', {
        toolId,
        errors,
      });
    }
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Get comprehensive sync statistics
   *
   * @returns Sync stats for dashboard
   */
  async getSyncStats(): Promise<SyncStats> {
    const [total, synced, pending, stale, failed] = await Promise.all([
      Tool.countDocuments(),
      Tool.countDocuments({ 'syncMetadata.overallStatus': 'synced' }),
      Tool.countDocuments({ 'syncMetadata.overallStatus': 'pending' }),
      Tool.countDocuments({ 'syncMetadata.overallStatus': 'stale' }),
      Tool.countDocuments({ 'syncMetadata.overallStatus': 'failed' }),
    ]);

    // Per-collection stats
    const perCollection = {} as SyncStats['perCollection'];

    for (const collection of this.ALL_COLLECTIONS) {
      const [cSynced, cPending, cStale, cFailed] = await Promise.all([
        Tool.countDocuments({
          [`syncMetadata.collections.${collection}.status`]: 'synced',
        }),
        Tool.countDocuments({
          [`syncMetadata.collections.${collection}.status`]: 'pending',
        }),
        Tool.countDocuments({
          [`syncMetadata.collections.${collection}.status`]: 'stale',
        }),
        Tool.countDocuments({
          [`syncMetadata.collections.${collection}.status`]: 'failed',
        }),
      ]);

      perCollection[collection] = {
        synced: cSynced,
        pending: cPending,
        stale: cStale,
        failed: cFailed,
      };
    }

    return { total, synced, pending, stale, failed, perCollection };
  }

  /**
   * Get tools needing sync (for worker)
   *
   * @param limit - Maximum number of tools to return
   * @returns Array of tools needing sync
   */
  async getToolsNeedingSync(limit: number = 10): Promise<ITool[]> {
    return Tool.find({
      $or: [
        { 'syncMetadata.overallStatus': 'pending' },
        { 'syncMetadata.overallStatus': 'stale' },
        {
          'syncMetadata.overallStatus': 'failed',
          $or: [
            { 'syncMetadata.collections.tools.retryCount': { $lt: 5 } },
            { 'syncMetadata.collections.functionality.retryCount': { $lt: 5 } },
            { 'syncMetadata.collections.usecases.retryCount': { $lt: 5 } },
            { 'syncMetadata.collections.interface.retryCount': { $lt: 5 } },
          ],
        },
      ],
    })
      .sort({ 'syncMetadata.updatedAt': 1 })
      .limit(limit)
      .lean() as Promise<ITool[]>;
  }

  /**
   * Get failed collections for a specific tool
   *
   * @param tool - Tool document
   * @returns Array of failed collection names
   */
  getFailedCollections(tool: ITool): SyncCollectionName[] {
    const failed: SyncCollectionName[] = [];

    for (const collection of this.ALL_COLLECTIONS) {
      if (tool.syncMetadata?.collections?.[collection]?.status === 'failed') {
        failed.push(collection);
      }
    }

    return failed;
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Build Qdrant payload for a collection
   */
  private buildCollectionPayload(
    tool: ITool,
    collection: SyncCollectionName
  ): Record<string, any> {
    const payload: Record<string, any> = {
      id: tool._id?.toString(),
      toolId: tool.id,
      name: tool.name,
      categories: tool.categories,
      functionality: tool.functionality,
      interface: tool.interface,
      industries: tool.industries,
      userTypes: tool.userTypes,
      deployment: tool.deployment,
      pricingModel: tool.pricingModel,
      status: tool.status,
      timestamp: new Date().toISOString(),
      collection,
    };

    // Add collection-specific fields
    const contentFields = COLLECTION_FIELDS[collection];
    for (const field of contentFields) {
      if (tool[field as keyof ITool] !== undefined) {
        payload[field] = tool[field as keyof ITool];
      }
    }

    return payload;
  }

  /**
   * Mark sync attempt timestamp
   */
  private async markCollectionSyncAttempt(
    toolId: any,
    collection: SyncCollectionName
  ): Promise<void> {
    await Tool.updateOne(
      { _id: toolId },
      {
        $set: {
          [`syncMetadata.collections.${collection}.lastSyncAttemptAt`]:
            new Date(),
          'syncMetadata.updatedAt': new Date(),
        },
      }
    );
  }

  /**
   * Mark collection sync as successful
   */
  private async markCollectionSyncSuccess(
    toolId: any,
    collection: SyncCollectionName,
    contentHash: string
  ): Promise<void> {
    await Tool.updateOne(
      { _id: toolId },
      {
        $set: {
          [`syncMetadata.collections.${collection}.status`]: 'synced',
          [`syncMetadata.collections.${collection}.lastSyncedAt`]: new Date(),
          [`syncMetadata.collections.${collection}.lastError`]: null,
          [`syncMetadata.collections.${collection}.errorCode`]: null,
          [`syncMetadata.collections.${collection}.retryCount`]: 0,
          [`syncMetadata.collections.${collection}.contentHash`]: contentHash,
          'syncMetadata.updatedAt': new Date(),
        },
        $inc: {
          [`syncMetadata.collections.${collection}.vectorVersion`]: 1,
        },
      }
    );
  }

  /**
   * Mark collection sync as failed
   */
  private async markCollectionSyncFailed(
    toolId: any,
    collection: SyncCollectionName,
    error: Error,
    errorCode: SyncErrorCode
  ): Promise<void> {
    await Tool.updateOne(
      { _id: toolId },
      {
        $set: {
          [`syncMetadata.collections.${collection}.status`]: 'failed',
          [`syncMetadata.collections.${collection}.lastError`]:
            error.message.substring(0, 1000),
          [`syncMetadata.collections.${collection}.errorCode`]: errorCode,
          'syncMetadata.updatedAt': new Date(),
        },
        $inc: {
          [`syncMetadata.collections.${collection}.retryCount`]: 1,
        },
      }
    );
  }

  /**
   * Update overall sync status based on collection results
   */
  private async updateOverallStatus(
    toolId: any,
    status: SyncStatus
  ): Promise<void> {
    await Tool.updateOne(
      { _id: toolId },
      {
        $set: {
          'syncMetadata.overallStatus': status,
          'syncMetadata.updatedAt': new Date(),
        },
      }
    );
  }

  /**
   * Calculate overall status from collection results
   */
  private calculateOverallStatus(results: CollectionSyncResult[]): SyncStatus {
    const hasFailure = results.some((r) => !r.success && !r.skipped);
    const allSynced = results.every((r) => r.success);

    if (hasFailure) return 'failed';
    if (allSynced) return 'synced';
    return 'stale';
  }

  /**
   * Classify error for programmatic handling
   */
  private classifyError(error: any): SyncErrorCode {
    const message = error?.message?.toLowerCase() || '';

    if (message.includes('timeout')) return 'EMBEDDING_TIMEOUT';
    if (message.includes('rate limit') || message.includes('429'))
      return 'EMBEDDING_RATE_LIMIT';
    if (message.includes('qdrant') && message.includes('unavailable'))
      return 'QDRANT_UNAVAILABLE';
    if (message.includes('qdrant') && message.includes('timeout'))
      return 'QDRANT_TIMEOUT';
    if (message.includes('validation')) return 'VALIDATION_ERROR';

    return 'UNKNOWN';
  }
}

// Export singleton instance
export const toolSyncService = new ToolSyncService();
```

---

## 2.3 Qdrant Service Enhancements

**File:** `search-api/src/services/qdrant.service.ts`

Add these methods to the existing `QdrantService` class:

```typescript
// Add these imports if not present
import { getCollectionName } from '../config/database';

// ============================================
// NEW METHODS FOR SYNC
// ============================================

/**
 * Update payload only without re-uploading vector
 *
 * This is the "cheap path" for metadata-only changes.
 * No embedding API call is needed.
 *
 * @param toolId - Tool ID
 * @param payload - New payload data
 * @param options - Options including collection name and wait flag
 */
async updatePayloadOnly(
  toolId: string,
  payload: Record<string, any>,
  options: { collection?: string; wait?: boolean } = {}
): Promise<void> {
  if (!this.client) {
    throw new Error('Qdrant client not connected');
  }

  const { wait = true, collection } = options;
  const pointId = this.toPointId(toolId);
  const collectionName = collection || qdrantConfig.collectionName;

  try {
    await this.client.setPayload(collectionName, {
      points: [pointId],
      payload,
      wait,
    });

    console.log(
      `✅ Payload updated in ${collectionName} for tool ${toolId}`
    );
  } catch (error) {
    console.error(
      `❌ Error updating payload in ${collectionName} for tool ${toolId}:`,
      error
    );
    throw error;
  }
}

/**
 * Delete tool from a specific vector type/collection
 *
 * @param toolId - Tool ID
 * @param vectorType - Vector type (maps to collection name)
 */
async deleteToolVector(toolId: string, vectorType: string): Promise<void> {
  if (!this.client) {
    throw new Error('Qdrant client not connected');
  }

  const pointId = this.toPointId(toolId);
  const collectionName = getCollectionName(vectorType);

  try {
    await this.client.delete(collectionName, {
      points: [pointId],
      wait: true,
    });

    console.log(
      `✅ Deleted tool ${toolId} from collection ${collectionName}`
    );
  } catch (error) {
    console.error(
      `❌ Error deleting tool ${toolId} from ${collectionName}:`,
      error
    );
    throw error;
  }
}

/**
 * Check if a point exists in a collection
 *
 * @param toolId - Tool ID
 * @param collection - Collection name (optional, defaults to primary)
 * @returns True if point exists
 */
async pointExists(
  toolId: string,
  collection?: string
): Promise<boolean> {
  if (!this.client) {
    throw new Error('Qdrant client not connected');
  }

  const pointId = this.toPointId(toolId);
  const collectionName = collection || qdrantConfig.collectionName;

  try {
    const result = await this.client.retrieve(collectionName, {
      ids: [pointId],
      with_payload: false,
      with_vector: false,
    });

    return result.length > 0;
  } catch (error) {
    // Point not found is not an error
    return false;
  }
}
```

---

## Verification Checklist

After implementing Phase 2:

- [ ] `ContentHashService` generates consistent hashes
- [ ] `ContentHashService.classifyChanges()` correctly identifies affected collections
- [ ] `ToolSyncService.syncTool()` syncs to all 4 collections
- [ ] `ToolSyncService.updatePayloadsOnly()` updates without embedding calls
- [ ] `QdrantService.updatePayloadOnly()` works correctly
- [ ] `QdrantService.deleteToolVector()` removes from specific collection
- [ ] All services compile without TypeScript errors

---

## Next Phase

Once Phase 2 is complete, proceed to [Phase 3: CRUD Integration](./PHASE-3-CRUD-INTEGRATION.md).
