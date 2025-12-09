import mongoose, { Schema, Document } from 'mongoose';
import { CONTROLLED_VOCABULARIES } from '../shared/constants/controlled-vocabularies.js';

// Pricing subdocument interface
export interface IPricing {
  tier: string;
  billingPeriod: string;
  price: number;
}

// Approval status type
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

// Tool document interface
export interface ITool extends Document {
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

// Pricing subdocument schema
const PricingSchema = new Schema<IPricing>(
  {
    tier: {
      type: String,
      required: true,
    },
    billingPeriod: {
      type: String,
      required: true,
      enum: CONTROLLED_VOCABULARIES.billingPeriods,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// ============================================
// SYNC METADATA SCHEMAS
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
      maxlength: 1000,
    },
    errorCode: {
      type: String,
      default: null,
      maxlength: 100,
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
  { _id: false }
);

/**
 * Default collection sync status for new tools
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

// Tool schema
const ToolSchema = new Schema<ITool>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      minlength: 1,
      maxlength: 100,
      trim: true,
      match: /^[a-z0-9-]+$/,
    },
    name: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 100,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      minlength: 1,
      maxlength: 100,
      trim: true,
      match: /^[a-z0-9-]+$/,
    },
    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 200,
      trim: true,
    },
    longDescription: {
      type: String,
      minlength: 50,
      maxlength: 2000,
      trim: true,
    },
    tagline: {
      type: String,
      maxlength: 100,
      trim: true,
    },
    categories: {
      type: [String],
      required: true,
      enum: CONTROLLED_VOCABULARIES.categories,
      validate: {
        validator: (v: string[]) =>
          v.length >= 1 && v.every((item) => CONTROLLED_VOCABULARIES.categories.includes(item)),
        message: 'categories must have at least 1 entry from the valid categories list',
      },
    },
    industries: {
      type: [String],
      required: true,
      enum: CONTROLLED_VOCABULARIES.industries,
      validate: {
        validator: (v: string[]) =>
          v.length >= 1 && v.every((item) => CONTROLLED_VOCABULARIES.industries.includes(item)),
        message: 'industries must have at least 1 entry from the valid industries list',
      },
    },
    userTypes: {
      type: [String],
      required: true,
      enum: CONTROLLED_VOCABULARIES.userTypes,
      validate: {
        validator: (v: string[]) =>
          v.length >= 1 && v.every((item) => CONTROLLED_VOCABULARIES.userTypes.includes(item)),
        message: 'userTypes must have at least 1 entry from the valid userTypes list',
      },
    },
    pricing: {
      type: [PricingSchema],
      required: true,
      validate: {
        validator: (v: IPricing[]) => v.length >= 1,
        message: 'pricing must have at least 1 tier',
      },
    },
    pricingModel: {
      type: [String],
      required: true,
      enum: CONTROLLED_VOCABULARIES.pricingModels,
      validate: {
        validator: (v: string[]) =>
          v.length >= 1 && v.every((item) => CONTROLLED_VOCABULARIES.pricingModels.includes(item)),
        message: 'pricingModel must have at least 1 entry from the valid pricing models list',
      },
    },
    pricingUrl: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v),
        message: 'pricingUrl must be a valid URL',
      },
    },
    interface: {
      type: [String],
      required: true,
      enum: CONTROLLED_VOCABULARIES.interface,
      validate: {
        validator: (v: string[]) =>
          v.length >= 1 && v.every((item) => CONTROLLED_VOCABULARIES.interface.includes(item)),
        message: 'interface must have at least 1 entry from the valid interface list',
      },
    },
    functionality: {
      type: [String],
      required: true,
      enum: CONTROLLED_VOCABULARIES.functionality,
      validate: {
        validator: (v: string[]) =>
          v.length >= 1 && v.every((item) => CONTROLLED_VOCABULARIES.functionality.includes(item)),
        message: 'functionality must have at least 1 entry from the valid functionality list',
      },
    },
    deployment: {
      type: [String],
      required: true,
      enum: CONTROLLED_VOCABULARIES.deployment,
      validate: {
        validator: (v: string[]) =>
          v.length >= 1 && v.every((item) => CONTROLLED_VOCABULARIES.deployment.includes(item)),
        message: 'deployment must have at least 1 entry from the valid deployment list',
      },
    },
    logoUrl: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v),
        message: 'logoUrl must be a valid URL',
      },
    },
    website: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v),
        message: 'website must be a valid URL',
      },
    },
    documentation: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v),
        message: 'documentation must be a valid URL',
      },
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'beta', 'deprecated', 'discontinued'],
      default: 'active',
    },
    contributor: {
      type: String,
      required: true,
      default: 'system',
    },
    dateAdded: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    // RBAC fields
    approvalStatus: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: String,
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    // Sync metadata for Qdrant synchronization
    syncMetadata: {
      type: SyncMetadataSchema,
      default: createDefaultSyncMetadata,
    },
  },
  {
    timestamps: true,
    collection: 'tools',
  }
);

// Pre-save middleware
ToolSchema.pre('save', function (next) {
  // Auto-generate slug from id if not provided
  if (!this.slug && this.id) {
    this.slug = this.id;
  }
  // Update lastUpdated timestamp
  this.lastUpdated = new Date();
  next();
});

// Indexes
ToolSchema.index({ id: 1 }, { unique: true, name: 'tool_id_index' });
ToolSchema.index({ slug: 1 }, { unique: true, name: 'tool_slug_index' });
ToolSchema.index({ status: 1 }, { name: 'tool_status_index' });
ToolSchema.index({ categories: 1 }, { name: 'tool_categories_index' });
ToolSchema.index({ industries: 1 }, { name: 'tool_industries_index' });
ToolSchema.index({ userTypes: 1 }, { name: 'tool_user_types_index' });
ToolSchema.index(
  {
    name: 'text',
    description: 'text',
    longDescription: 'text',
    tagline: 'text',
  },
  {
    name: 'tool_v2_search_index',
    weights: {
      name: 15,
      tagline: 12,
      description: 8,
    },
  }
);
ToolSchema.index({ dateAdded: -1 }, { name: 'tool_date_added_index' });
ToolSchema.index({ functionality: 1 }, { name: 'tool_functionality_index' });
ToolSchema.index({ deployment: 1 }, { name: 'tool_deployment_index' });
// RBAC indexes
ToolSchema.index({ approvalStatus: 1 }, { name: 'tool_approval_status_index' });
ToolSchema.index({ contributor: 1 }, { name: 'tool_contributor_index' });
ToolSchema.index({ approvalStatus: 1, contributor: 1 }, { name: 'tool_approval_contributor_index' });

// ============================================
// SYNC INDEXES
// ============================================

// Overall sync status for quick filtering
ToolSchema.index(
  { 'syncMetadata.overallStatus': 1 },
  { name: 'tool_sync_overall_status_index' }
);

// Per-collection sync status for targeted queries
ToolSchema.index(
  { 'syncMetadata.collections.tools.status': 1 },
  { name: 'tool_sync_tools_status_index' }
);
ToolSchema.index(
  { 'syncMetadata.collections.functionality.status': 1 },
  { name: 'tool_sync_functionality_status_index' }
);
ToolSchema.index(
  { 'syncMetadata.collections.usecases.status': 1 },
  { name: 'tool_sync_usecases_status_index' }
);
ToolSchema.index(
  { 'syncMetadata.collections.interface.status': 1 },
  { name: 'tool_sync_interface_status_index' }
);

// Compound index for worker queries (find failed/pending with retry count)
ToolSchema.index(
  {
    'syncMetadata.overallStatus': 1,
    'syncMetadata.collections.tools.retryCount': 1,
    'syncMetadata.collections.tools.lastSyncAttemptAt': 1,
  },
  { name: 'tool_sync_worker_query_index' }
);

// Last sync attempt for rate limiting / backoff calculations
ToolSchema.index(
  { 'syncMetadata.collections.tools.lastSyncAttemptAt': 1 },
  { name: 'tool_sync_last_attempt_index' }
);

// Export the model
export const Tool = mongoose.model<ITool>('Tool', ToolSchema);
