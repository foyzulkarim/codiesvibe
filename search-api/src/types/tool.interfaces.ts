/**
 * Tool Interfaces - Pure TypeScript (No Mongoose dependency)
 *
 * Extracted from src/models/tool.model.ts to enable migration
 * from Mongoose to MongoDB Native Driver.
 */

import { ObjectId } from 'mongodb';

// ============================================
// PRICING TYPES
// ============================================

/**
 * Pricing subdocument interface
 */
export interface IPricing {
  tier: string;
  billingPeriod: string;
  price: number;
}

// ============================================
// APPROVAL STATUS
// ============================================

/**
 * Approval status type for RBAC
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// ============================================
// SYNC STATUS TYPES
// ============================================

/**
 * Possible sync statuses for vector database synchronization
 */
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'stale';

/**
 * Collection names that are synced to Qdrant
 */
export type SyncCollectionName = 'tools' | 'functionality' | 'usecases' | 'interface';

/**
 * Sync status for a single Qdrant collection
 */
export interface ICollectionSyncStatus {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  lastSyncAttemptAt: Date | null;
  lastError: string | null;
  errorCode: string | null;
  retryCount: number;
  contentHash: string;
  vectorVersion: number;
}

/**
 * Overall sync metadata for a tool across all collections
 */
export interface ISyncMetadata {
  overallStatus: SyncStatus;
  collections: {
    tools: ICollectionSyncStatus;
    functionality: ICollectionSyncStatus;
    usecases: ICollectionSyncStatus;
    interface: ICollectionSyncStatus;
  };
  lastModifiedFields: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// TOOL INTERFACE
// ============================================

/**
 * Tool document interface - Pure TypeScript
 *
 * Note: Removed 'extends Document' from Mongoose.
 * _id is now explicitly typed as ObjectId | string for flexibility.
 */
export interface ITool {
  _id?: ObjectId | string;
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  tagline?: string;
  categories: string[];
  industries: string[];
  userTypes: string[];
  pricing: IPricing[];
  pricingModel: string[];
  pricingUrl?: string;
  interface: string[];
  functionality: string[];
  deployment: string[];
  logoUrl?: string;
  website?: string;
  documentation?: string;
  status: 'active' | 'beta' | 'deprecated' | 'discontinued';
  contributor: string;
  dateAdded: Date;
  lastUpdated?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  // RBAC fields
  approvalStatus: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  // Sync metadata for Qdrant synchronization
  syncMetadata?: ISyncMetadata;
}

/**
 * Input type for creating a tool
 * Matches the fields that can be provided when creating a tool
 * (some fields are optional, others are set by the system)
 */
export interface CreateToolData {
  id: string;
  name: string;
  slug?: string;
  description: string;
  longDescription?: string;
  tagline?: string;
  categories: string[];
  industries: string[];
  userTypes: string[];
  pricing: IPricing[];
  pricingModel: string[];
  pricingUrl?: string;
  interface: string[];
  functionality: string[];
  deployment: string[];
  logoUrl?: string;
  website?: string;
  documentation?: string;
  status: 'active' | 'beta' | 'deprecated' | 'discontinued';
  contributor: string;
  dateAdded: Date;
  lastUpdated?: Date;
  approvalStatus: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  syncMetadata?: ISyncMetadata;
}

/**
 * Input type for updating a tool (all fields optional except identifying field)
 */
export type UpdateToolData = Partial<Omit<ITool, '_id' | 'id' | 'createdAt'>>;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Default collection sync status for new tools
 */
export const defaultCollectionSyncStatus = (): ICollectionSyncStatus => ({
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
 * Create default sync metadata for new tools
 */
export const createDefaultSyncMetadata = (): ISyncMetadata => ({
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
});

// ============================================
// PAGINATION TYPES
// ============================================

/**
 * Generic paginated result interface
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Options for paginated tool queries
 */
export interface FindToolsOptions {
  filter?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  page?: number;
  limit?: number;
}

/**
 * Result from paginated tool queries
 */
export interface FindToolsResult {
  data: ITool[];
  total: number;
}
