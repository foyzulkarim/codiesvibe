/**
 * Tool Sync Service
 *
 * High-level service for synchronizing tools between MongoDB and Qdrant.
 * Provides per-collection sync with change detection and status tracking.
 */

import { qdrantService } from './qdrant.service.js';
import { embeddingService } from './embedding.service.js';
import { CollectionConfigService } from './collection-config.service.js';
import { ContentGeneratorFactory } from './content-generator-factory.service.js';
import {
  contentHashService,
} from './content-hash.service.js';
import {
  ITool,
  SyncCollectionName,
} from '../types/tool.interfaces.js';
import { mongoDBService } from './mongodb.service.js';
import { ToolData, ToolDataValidator } from '../types/tool.types.js';

// ============================================
// TYPES AND INTERFACES
// ============================================

/**
 * Result of syncing a tool to a single collection
 */
export interface CollectionSyncResult {
  collection: SyncCollectionName;
  success: boolean;
  error?: string;
  errorCode?: string;
  newContentHash?: string;
  duration?: number;
}

/**
 * Result of syncing a tool to all collections
 */
export interface ToolSyncResult {
  toolId: string;
  success: boolean;
  collections: CollectionSyncResult[];
  syncedCount: number;
  failedCount: number;
  skippedCount: number;
  totalDuration: number;
}

/**
 * Options for sync operations
 */
export interface SyncOptions {
  /** Force sync even if content hash matches */
  force?: boolean;
  /** Collections to sync (defaults to all) */
  collections?: SyncCollectionName[];
  /** Skip MongoDB metadata update (for batch operations) */
  skipMetadataUpdate?: boolean;
  /** Maximum retries per collection */
  maxRetries?: number;
}

/**
 * Sync operation error codes
 */
export const SYNC_ERROR_CODES = {
  EMBEDDING_FAILED: 'EMBEDDING_FAILED',
  QDRANT_UPSERT_FAILED: 'QDRANT_UPSERT_FAILED',
  QDRANT_DELETE_FAILED: 'QDRANT_DELETE_FAILED',
  CONTENT_GENERATION_FAILED: 'CONTENT_GENERATION_FAILED',
  MONGODB_UPDATE_FAILED: 'MONGODB_UPDATE_FAILED',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  INVALID_TOOL_DATA: 'INVALID_TOOL_DATA',
} as const;

// ============================================
// SERVICE CLASS
// ============================================

export class ToolSyncService {
  private readonly collectionConfig: CollectionConfigService;
  private readonly contentFactory: ContentGeneratorFactory;
  private readonly toolValidator: ToolDataValidator;
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 500;

  constructor() {
    this.collectionConfig = new CollectionConfigService();
    this.contentFactory = new ContentGeneratorFactory(this.collectionConfig);
    this.toolValidator = new ToolDataValidator();
  }

  // ============================================
  // PUBLIC SYNC METHODS
  // ============================================

  /**
   * Sync a tool to all Qdrant collections
   *
   * This is the primary method for syncing a tool after create/update.
   * Uses change detection to only sync collections that need updating.
   *
   * @param tool - Tool document to sync
   * @param options - Sync options
   * @returns Sync result with per-collection status
   */
  async syncTool(
    tool: ITool,
    options: SyncOptions = {}
  ): Promise<ToolSyncResult> {
    // Native driver handles connection automatically via database.ts singleton

    const startTime = Date.now();
    const toolId = this.deriveToolId(tool);
    const collections = options.collections || this.getAllCollectionNames();

    console.log(
      `🔄 [ToolSync] Starting sync for tool "${tool.name}" (${toolId}) to ${collections.length} collections`
    );

    const results: CollectionSyncResult[] = [];
    let syncedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const collection of collections) {
      // Check if sync is needed (unless forced)
      if (!options.force) {
        const needsSync = this.checkNeedsSync(tool, collection);
        if (!needsSync) {
          console.log(
            `⏭️ [ToolSync] Skipping ${collection} - content unchanged`
          );
          skippedCount++;
          results.push({
            collection,
            success: true,
            newContentHash:
              tool.syncMetadata?.collections?.[collection]?.contentHash,
          });
          continue;
        }
      }

      // Sync to this collection
      const result = await this.syncToolToCollection(
        tool,
        collection,
        options.maxRetries
      );
      results.push(result);

      if (result.success) {
        syncedCount++;
      } else {
        failedCount++;
      }
    }

    // Update MongoDB sync metadata
    if (!options.skipMetadataUpdate) {
      await this.updateSyncMetadata(toolId, results);
    }

    const totalDuration = Date.now() - startTime;
    console.log(
      `✅ [ToolSync] Completed sync for "${tool.name}": ${syncedCount} synced, ${failedCount} failed, ${skippedCount} skipped (${totalDuration}ms)`
    );

    return {
      toolId,
      success: failedCount === 0,
      collections: results,
      syncedCount,
      failedCount,
      skippedCount,
      totalDuration,
    };
  }

  /**
   * Sync a tool to specific collections only
   *
   * Use when only certain fields have changed.
   *
   * @param tool - Tool document to sync
   * @param collections - Collections to sync to
   * @param options - Sync options
   */
  async syncToolToCollections(
    tool: ITool,
    collections: SyncCollectionName[],
    options: Omit<SyncOptions, 'collections'> = {}
  ): Promise<ToolSyncResult> {
    return this.syncTool(tool, { ...options, collections });
  }

  /**
   * Sync only collections affected by changed fields
   *
   * Efficient sync method for updates where we know what changed.
   *
   * @param tool - Updated tool document
   * @param changedFields - Array of field names that changed
   * @param options - Sync options
   */
  async syncAffectedCollections(
    tool: ITool,
    changedFields: string[],
    options: Omit<SyncOptions, 'collections'> = {}
  ): Promise<ToolSyncResult> {
    // Check if only metadata fields changed
    const isMetadataOnly =
      contentHashService.isMetadataOnlyChange(changedFields);

    if (isMetadataOnly) {
      console.log(
        `📝 [ToolSync] Only metadata fields changed - updating payload only`
      );
      return this.updatePayloadOnly(tool, options);
    }

    // Get affected collections
    const affectedCollections =
      contentHashService.getAffectedCollections(changedFields);

    if (affectedCollections.length === 0) {
      console.log(`⏭️ [ToolSync] No semantic fields changed - skipping sync`);
      return {
        toolId: this.deriveToolId(tool),
        success: true,
        collections: [],
        syncedCount: 0,
        failedCount: 0,
        skippedCount: 4,
        totalDuration: 0,
      };
    }

    console.log(
      `🎯 [ToolSync] Changed fields affect ${
        affectedCollections.length
      } collections: ${affectedCollections.join(', ')}`
    );
    return this.syncToolToCollections(tool, affectedCollections, options);
  }

  /**
   * Delete a tool from all Qdrant collections
   *
   * @param toolId - Tool ID to delete (the slug-based ID)
   */
  async deleteToolFromQdrant(toolId: string): Promise<ToolSyncResult> {
    const startTime = Date.now();
    const collections = this.getAllCollectionNames();

    console.log(
      `🗑️ [ToolSync] Deleting tool "${toolId}" from ${collections.length} collections`
    );

    const results: CollectionSyncResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const collection of collections) {
      const collectionStartTime = Date.now();
      try {
        const vectorType =
          this.collectionConfig.getVectorTypeForCollection(collection);
        await qdrantService.deleteToolVector(toolId, vectorType);

        results.push({
          collection,
          success: true,
          duration: Date.now() - collectionStartTime,
        });
        successCount++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `❌ [ToolSync] Failed to delete from ${collection}:`,
          errorMessage
        );

        results.push({
          collection,
          success: false,
          error: errorMessage,
          errorCode: SYNC_ERROR_CODES.QDRANT_DELETE_FAILED,
          duration: Date.now() - collectionStartTime,
        });
        failedCount++;
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(
      `✅ [ToolSync] Delete completed: ${successCount} deleted, ${failedCount} failed (${totalDuration}ms)`
    );

    return {
      toolId,
      success: failedCount === 0,
      collections: results,
      syncedCount: successCount,
      failedCount,
      skippedCount: 0,
      totalDuration,
    };
  }

  /**
   * Update only the payload in Qdrant (no embedding regeneration)
   *
   * Use for metadata-only changes like pricing, URLs, etc.
   *
   * @param tool - Tool document with updated metadata
   * @param options - Sync options
   */
  async updatePayloadOnly(
    tool: ITool,
    _options: Omit<SyncOptions, 'collections'> = {}
  ): Promise<ToolSyncResult> {
    const startTime = Date.now();
    const toolId = this.deriveToolId(tool);
    const collections = this.getAllCollectionNames();

    console.log(`📝 [ToolSync] Updating payload only for tool "${tool.name}"`);

    const results: CollectionSyncResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const collection of collections) {
      const collectionStartTime = Date.now();
      try {
        const payload = this.generatePayload(tool, collection);

        // Use the payload-only update method (no embedding regeneration)
        const result = await qdrantService.updatePayloadOnly(
          toolId,
          payload,
          collection
        );

        if (result.success) {
          results.push({
            collection,
            success: true,
            duration: Date.now() - collectionStartTime,
          });
          successCount++;
        } else {
          results.push({
            collection,
            success: false,
            error: result.error,
            errorCode: SYNC_ERROR_CODES.QDRANT_UPSERT_FAILED,
            duration: Date.now() - collectionStartTime,
          });
          failedCount++;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `❌ [ToolSync] Failed to update payload in ${collection}:`,
          errorMessage
        );

        results.push({
          collection,
          success: false,
          error: errorMessage,
          errorCode: SYNC_ERROR_CODES.QDRANT_UPSERT_FAILED,
          duration: Date.now() - collectionStartTime,
        });
        failedCount++;
      }
    }

    const totalDuration = Date.now() - startTime;
    return {
      toolId,
      success: failedCount === 0,
      collections: results,
      syncedCount: successCount,
      failedCount,
      skippedCount: 0,
      totalDuration,
    };
  }

  /**
   * Retry failed syncs for a tool
   *
   * @param toolId - MongoDB _id or tool slug
   */
  async retryFailedSync(toolId: string): Promise<ToolSyncResult> {
    // Native driver handles connection automatically via database.ts singleton

    // Find the tool by id/slug
    const tool = await mongoDBService.findToolByIdOrSlug(toolId);

    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    // Find failed collections
    const failedCollections: SyncCollectionName[] = [];
    const syncMeta = tool.syncMetadata;

    if (syncMeta?.collections) {
      for (const [collection, status] of Object.entries(syncMeta.collections)) {
        // Include 'stale' in addition to 'failed' and 'pending'
        if (status.status === 'failed' || status.status === 'pending' || status.status === 'stale') {
          failedCollections.push(collection as SyncCollectionName);
        }
      }
    }

    if (failedCollections.length === 0) {
      console.log(
        `✅ [ToolSync] No failed collections to retry for "${tool.name}"`
      );
      return {
        toolId: this.deriveToolId(tool),
        success: true,
        collections: [],
        syncedCount: 0,
        failedCount: 0,
        skippedCount: 4,
        totalDuration: 0,
      };
    }

    console.log(
      `🔄 [ToolSync] Retrying ${failedCollections.length} failed collections for "${tool.name}"`
    );
    return this.syncToolToCollections(tool, failedCollections, { force: true });
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Sync a tool to a single collection with retry logic
   */
  private async syncToolToCollection(
    tool: ITool,
    collection: SyncCollectionName,
    maxRetries: number = this.DEFAULT_MAX_RETRIES
  ): Promise<CollectionSyncResult> {
    const startTime = Date.now();
    let lastError: string | undefined;
    let lastErrorCode: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Generate content for this collection
        const content = this.generateContent(tool, collection);
        if (!content.trim()) {
          console.warn(
            `⚠️ [ToolSync] Empty content for ${collection} - skipping`
          );
          return {
            collection,
            success: false,
            error: 'Empty content generated',
            errorCode: SYNC_ERROR_CODES.CONTENT_GENERATION_FAILED,
            duration: Date.now() - startTime,
          };
        }

        // Generate embedding
        const embedding = await embeddingService.generateEmbedding(content);

        // Generate payload
        const payload = this.generatePayload(tool, collection);

        // Upsert to Qdrant
        const toolId = this.deriveToolId(tool);
        const vectorType =
          this.collectionConfig.getVectorTypeForCollection(collection);
        await qdrantService.upsertToolVector(
          toolId,
          embedding,
          payload,
          vectorType
        );

        // Calculate new content hash
        const newContentHash = contentHashService.generateCollectionHash(
          tool,
          collection
        );

        console.log(`✅ [ToolSync] Synced ${collection} (attempt ${attempt})`);

        return {
          collection,
          success: true,
          newContentHash,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        lastErrorCode = this.classifyError(error);

        console.warn(
          `⚠️ [ToolSync] Attempt ${attempt}/${maxRetries} failed for ${collection}: ${lastError}`
        );

        if (attempt < maxRetries && this.isRetryableError(error)) {
          await this.delay(this.RETRY_DELAY_MS * attempt);
        }
      }
    }

    console.error(
      `❌ [ToolSync] All ${maxRetries} attempts failed for ${collection}`
    );
    return {
      collection,
      success: false,
      error: lastError,
      errorCode: lastErrorCode,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Update MongoDB sync metadata after sync operations
   */
  private async updateSyncMetadata(
    toolId: string,
    results: CollectionSyncResult[]
  ): Promise<void> {
    try {
      // Separate $set and $inc operations - MongoDB requires $inc at top level
      const setData: Record<string, unknown> = {
        'syncMetadata.updatedAt': new Date(),
      };
      const incData: Record<string, number> = {};

      let hasFailures = false;
      let allSynced = true;

      for (const result of results) {
        const prefix = `syncMetadata.collections.${result.collection}`;

        if (result.success) {
          setData[`${prefix}.status`] = 'synced';
          setData[`${prefix}.lastSyncedAt`] = new Date();
          setData[`${prefix}.lastError`] = null;
          setData[`${prefix}.errorCode`] = null;
          setData[`${prefix}.retryCount`] = 0;

          if (result.newContentHash) {
            setData[`${prefix}.contentHash`] = result.newContentHash;
          }
        } else {
          hasFailures = true;
          allSynced = false;
          setData[`${prefix}.status`] = 'failed';
          setData[`${prefix}.lastSyncAttemptAt`] = new Date();
          setData[`${prefix}.lastError`] = result.error?.substring(0, 1000);
          setData[`${prefix}.errorCode`] = result.errorCode;
          // Use $inc operator for retryCount increment
          incData[`${prefix}.retryCount`] = 1;
        }
      }

      // Update overall status
      if (hasFailures) {
        setData['syncMetadata.overallStatus'] = 'failed';
      } else if (allSynced) {
        setData['syncMetadata.overallStatus'] = 'synced';
      } else {
        setData['syncMetadata.overallStatus'] = 'pending';
      }

      // Build update object with both operators
      const updateOps: Record<string, unknown> = { $set: setData };
      if (Object.keys(incData).length > 0) {
        updateOps.$inc = incData;
      }

      // Perform the update using native driver
      await mongoDBService.updateToolSyncMetadata(toolId, updateOps);
    } catch (error) {
      console.error(
        `❌ [ToolSync] Failed to update sync metadata for ${toolId}:`,
        error
      );
      // Don't throw - metadata update failure shouldn't break sync
    }
  }

  /**
   * Check if a collection needs sync based on content hash
   */
  private checkNeedsSync(tool: ITool, collection: SyncCollectionName): boolean {
    const currentHash =
      tool.syncMetadata?.collections?.[collection]?.contentHash;
    if (!currentHash) {
      return true; // No previous hash means never synced
    }

    const newHash = contentHashService.generateCollectionHash(tool, collection);
    return currentHash !== newHash;
  }

  /**
   * Generate content for embedding for a specific collection
   */
  private generateContent(tool: ITool, collection: SyncCollectionName): string {
    try {
      const generator = this.contentFactory.createGenerator(collection);
      // Convert ITool to ToolData format for the generator
      const toolData = this.convertToToolData(tool);
      return generator.generate(toolData);
    } catch (error) {
      console.error(`Error generating content for ${collection}:`, error);
      return '';
    }
  }

  /**
   * Generate payload for Qdrant storage
   */
  private generatePayload(
    tool: ITool,
    collection: SyncCollectionName
  ): Record<string, unknown> {
    const toolId = this.deriveToolId(tool);

    // Minimal base payload - only essential reference and filter fields
    const payload: Record<string, unknown> = {
      id: tool._id?.toString(),        // MongoDB reference for fetching full data
      toolId,                           // Slug reference
      status: tool.status,              // Common filter field used in searches
      timestamp: new Date().toISOString(),
      collection,
    };

    // Add ONLY collection-specific content fields (avoid duplication across collections)
    const contentFields =
      this.collectionConfig.getCollectionContentFields(collection);
    for (const field of contentFields) {
      const value = tool[field as keyof ITool];
      if (value !== undefined) {
        payload[field] = value;
      }
    }

    // OPTIMIZATION: Removed METADATA_ONLY_FIELDS to reduce storage
    // Metadata (pricing, logoUrl, website, etc.) should be fetched from MongoDB
    // after search results are returned. This reduces Qdrant storage by ~75%.
    //
    // If you need certain metadata fields for filtering in Qdrant, add them explicitly:
    // Example: payload.approvalStatus = tool.approvalStatus;

    return payload;
  }

  /**
   * Derive tool ID from tool document
   */
  private deriveToolId(tool: ITool): string {
    // Use the tool's id field (slug-based) if available
    if (tool.id) {
      return tool.id;
    }
    // Fallback to generating from name
    return this.toolValidator.generateToolId(this.convertToToolData(tool));
  }

  /**
   * Convert ITool to ToolData format
   * Maps ITool fields to ToolData expected structure
   */
  private convertToToolData(tool: ITool): ToolData {
    // Documents are already plain objects with native driver (no Mongoose)
    // Map contributor to createdBy for ToolData compatibility
    return {
      _id: tool._id?.toString() || '',
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      longDescription: tool.longDescription,
      tagline: tool.tagline,
      createdBy: tool.contributor, // Map contributor to createdBy
      categories: tool.categories,
      industries: tool.industries,
      userTypes: tool.userTypes,
      pricing: tool.pricing,
      pricingModel: tool.pricingModel as unknown as import('../types/tool.types.js').PricingModelEnum[],
      pricingUrl: tool.pricingUrl,
      interface: tool.interface,
      functionality: tool.functionality,
      deployment: tool.deployment,
      logoUrl: tool.logoUrl,
      website: tool.website,
      documentation: tool.documentation,
      status: tool.status as import('../types/tool.types.js').ToolStatus,
      contributor: tool.contributor,
      dateAdded: tool.dateAdded,
      lastUpdated: tool.lastUpdated,
      createdAt: tool.createdAt,
      updatedAt: tool.updatedAt,
    };
  }

  /**
   * Get all collection names
   */
  private getAllCollectionNames(): SyncCollectionName[] {
    return ['tools', 'functionality', 'usecases', 'interface'];
  }

  /**
   * Classify an error for reporting
   */
  private classifyError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('embedding') || message.includes('Embedding')) {
      return SYNC_ERROR_CODES.EMBEDDING_FAILED;
    }
    if (message.includes('Qdrant') || message.includes('upsert')) {
      return SYNC_ERROR_CODES.QDRANT_UPSERT_FAILED;
    }
    if (message.includes('content') || message.includes('Content')) {
      return SYNC_ERROR_CODES.CONTENT_GENERATION_FAILED;
    }

    return SYNC_ERROR_CODES.QDRANT_UPSERT_FAILED;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('timeout') ||
      message.includes('Too Many Requests') ||
      message.includes('ECONNRESET') ||
      message.includes('ECONNREFUSED') ||
      message.includes('rate limit')
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const toolSyncService = new ToolSyncService();
