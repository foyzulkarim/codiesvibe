/**
 * Content Hash Service
 *
 * Provides per-collection change detection for Qdrant sync optimization.
 * Uses SHA-256 hashing to detect which collections need embedding regeneration.
 */

import crypto from 'crypto';
import { ITool, SyncCollectionName } from '../models/tool.model.js';

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
    const data: Record<string, unknown> = {};

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
    const oldToolObj = oldTool.toObject?.() ?? oldTool;
    const mergedTool = { ...oldToolObj, ...newData };

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
