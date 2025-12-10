/**
 * Tool Types
 *
 * All types related to the Tool domain entity including
 * sync metadata, vocabularies, and query parameters.
 */

import type { Pagination } from './shared';

// ============================================
// SYNC TYPES
// ============================================

export type SyncStatus = 'synced' | 'pending' | 'failed' | 'stale';
export type SyncCollectionName = 'tools' | 'functionality' | 'usecases' | 'interface';

export interface CollectionSyncStatus {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastSyncAttemptAt: string | null;
  lastError: string | null;
  errorCode: string | null;
  retryCount: number;
  contentHash: string;
  vectorVersion: number;
}

export interface SyncMetadata {
  overallStatus: SyncStatus;
  collections: {
    tools: CollectionSyncStatus;
    functionality: CollectionSyncStatus;
    usecases: CollectionSyncStatus;
    interface: CollectionSyncStatus;
  };
  lastModifiedFields: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// APPROVAL TYPES
// ============================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// ============================================
// TOOL INTERFACE
// ============================================

/**
 * Core Tool interface - matches the API response structure
 */
export interface Tool {
  _id?: string;
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  tagline?: string;
  categories: string[];
  industries: string[];
  userTypes: string[];
  pricing: { tier: string; billingPeriod: string; price: number }[];
  pricingModel: ('Free' | 'Paid')[];
  pricingUrl?: string;
  interface: string[];
  functionality: string[];
  deployment: string[];
  logoUrl?: string;
  website?: string;
  documentation?: string;
  status: 'active' | 'beta' | 'deprecated' | 'discontinued';
  contributor: string;
  dateAdded: string;
  lastUpdated?: string;
  createdAt?: string;
  updatedAt?: string;
  // RBAC fields
  approvalStatus: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  // Sync metadata
  syncMetadata?: SyncMetadata;
}

/**
 * Type aliases for backward compatibility
 * AITool and BaseTool are the same as Tool
 */
export type AITool = Tool;
export type BaseTool = Tool;

// ============================================
// VOCABULARIES
// ============================================

export interface Vocabularies {
  categories: string[];
  industries: string[];
  userTypes: string[];
  interface: string[];
  functionality: string[];
  deployment: string[];
  pricingModels: string[];
  billingPeriods: string[];
}

// ============================================
// QUERY PARAMETERS
// ============================================

export interface ToolsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'dateAdded' | 'status';
  sortOrder?: 'asc' | 'desc';
  status?: string;
  category?: string;
  industry?: string;
  pricingModel?: string;
  approvalStatus?: ApprovalStatus;
  contributor?: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface PaginatedToolsResponse {
  data: Tool[];
  pagination: Pagination & {
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
