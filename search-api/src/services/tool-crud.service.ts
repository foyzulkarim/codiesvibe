/**
 * Tool CRUD Service - MongoDB Native Driver Implementation
 *
 * Migrated from Mongoose to MongoDB Native Driver.
 * Uses mongoDBService for all database operations.
 */

import { mongoDBService } from './mongodb.service.js';
import {
  ITool,
  IPricing,
  ApprovalStatus,
  createDefaultSyncMetadata,
  PaginatedResult,
  CreateToolData,
} from '../types/tool.interfaces.js';
import {
  CreateToolInput,
  UpdateToolInput,
  GetToolsQuery,
  GetAdminToolsQuery,
  GetMyToolsQuery,
} from '../schemas/tool.schema.js';
import { searchLogger } from '../config/logger.js';
import { toolSyncService } from './tool-sync.service.js';
import { contentHashService } from './content-hash.service.js';

class ToolCrudService {
  // Note: Connection management removed - native driver handles this via database.ts singleton

  /**
   * Create a new tool
   * Admin-created tools are auto-approved, maintainer-created tools are pending
   */
  async createTool(data: CreateToolInput, clerkUserId: string, isAdmin: boolean = false): Promise<ITool> {
    // Auto-generate slug from id if not provided
    // Admin-created tools are auto-approved
    const approvalStatus: ApprovalStatus = isAdmin ? 'approved' : 'pending';

    // Initialize sync metadata with default state
    const syncMetadata = createDefaultSyncMetadata();

    const now = new Date();

    const toolData: CreateToolData = {
      id: data.id,
      name: data.name,
      slug: data.slug || data.id,
      description: data.description,
      longDescription: data.longDescription,
      tagline: data.tagline,
      categories: data.categories,
      industries: data.industries,
      userTypes: data.userTypes,
      pricing: data.pricing as IPricing[],
      pricingModel: data.pricingModel,
      pricingUrl: data.pricingUrl,
      interface: data.interface,
      functionality: data.functionality,
      deployment: data.deployment,
      logoUrl: data.logoUrl,
      website: data.website,
      documentation: data.documentation,
      status: data.status,
      contributor: clerkUserId,
      dateAdded: now,
      lastUpdated: now,
      approvalStatus,
      syncMetadata,
      // If admin created and approved, set review info
      ...(isAdmin ? {
        reviewedBy: clerkUserId,
        reviewedAt: now,
      } : {}),
    };

    const savedTool = await mongoDBService.createTool(toolData);

    searchLogger.info('Tool created successfully', {
      service: 'tool-crud-service',
      toolId: savedTool.id,
      toolName: savedTool.name,
      createdBy: clerkUserId,
      approvalStatus,
    });

    // Fire-and-forget: Sync to Qdrant only if tool is approved
    if (approvalStatus === 'approved') {
      this.triggerSync(savedTool, 'create');
    }

    return savedTool;
  }

  /**
   * Get tools with pagination and filtering (PUBLIC - only approved tools)
   */
  async getTools(query: GetToolsQuery): Promise<PaginatedResult<ITool>> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'dateAdded',
      sortOrder = 'desc',
      status,
      category,
      industry,
      pricingModel,
    } = query;

    // Build filter query - ONLY approved tools for public access
    const filter: Record<string, unknown> = {
      approvalStatus: 'approved',
    };

    if (search) {
      // Use text search for better performance
      filter.$text = { $search: search };
    }

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.categories = category;
    }

    if (industry) {
      filter.industries = industry;
    }

    if (pricingModel) {
      filter.pricingModel = pricingModel;
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const { data: tools, total } = await mongoDBService.findToolsPaginated({
      filter,
      sort,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: tools,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get a single tool by ID (PUBLIC - only approved tools by default)
   * @param id - Tool ID or slug
   * @param publicOnly - If true, only returns approved tools (default: true)
   */
  async getToolById(id: string, publicOnly: boolean = true): Promise<ITool | null> {
    const tool = await mongoDBService.findToolByIdOrSlug(id, { publicOnly });
    return tool;
  }

  /**
   * Update a tool by ID
   * Uses field-specific change detection to optimize Qdrant sync
   */
  async updateTool(id: string, data: UpdateToolInput): Promise<ITool | null> {
    // First, get the existing tool to detect changes
    const existingTool = await mongoDBService.findToolByIdOrSlug(id);
    if (!existingTool) {
      return null;
    }

    // Detect which fields changed
    const changedFields = contentHashService.detectChangedFields(existingTool, data as Partial<ITool>);

    // Build base update data
    const updateData: Record<string, unknown> = {
      ...data,
      lastUpdated: new Date(),
      'syncMetadata.lastModifiedFields': changedFields,
      'syncMetadata.updatedAt': new Date(),
    };

    // ONLY mark as stale if:
    // 1. Tool is approved (only approved tools sync to Qdrant)
    // 2. Semantic fields changed (not just metadata like pricing/URLs)
    if (existingTool.approvalStatus === 'approved' && changedFields.length > 0) {
      const hasSemanticChanges = contentHashService.hasSemanticChanges(changedFields);

      if (hasSemanticChanges) {
        // Get affected collections
        const affectedCollections = contentHashService.getAffectedCollections(changedFields);

        // Mark overall status as stale
        updateData['syncMetadata.overallStatus'] = 'stale';

        // Mark ONLY affected collections as stale
        for (const collection of affectedCollections) {
          updateData[`syncMetadata.collections.${collection}.status`] = 'stale';
          updateData[`syncMetadata.collections.${collection}.retryCount`] = 0;
          updateData[`syncMetadata.collections.${collection}.lastError`] = null;
          updateData[`syncMetadata.collections.${collection}.errorCode`] = null;
        }

        searchLogger.info('Tool marked as stale - semantic fields changed', {
          service: 'tool-crud-service',
          toolId: id,
          changedFields,
          affectedCollections,
        });
      }
    }

    // Use native driver to update
    const tool = await mongoDBService.updateTool(id, updateData);

    if (tool) {
      searchLogger.info('Tool updated successfully', {
        service: 'tool-crud-service',
        toolId: id,
        changedFields,
        newSyncStatus: tool.syncMetadata?.overallStatus,
      });

      // Manual sync only via UI button - automatic sync removed
    }

    return tool;
  }

  /**
   * Delete a tool by ID
   * Also removes from all Qdrant collections
   */
  async deleteTool(id: string): Promise<boolean> {
    // Get the tool ID before deleting (needed for Qdrant cleanup)
    const existingTool = await mongoDBService.findToolByIdOrSlug(id);
    const toolSlugId = existingTool?.id || id;

    const deleted = await mongoDBService.deleteToolByIdOrSlug(id);

    if (deleted) {
      searchLogger.info('Tool deleted successfully', {
        service: 'tool-crud-service',
        toolId: id,
      });

      // Fire-and-forget: Delete from Qdrant
      this.triggerDelete(toolSlugId);

      return true;
    }

    return false;
  }

  /**
   * Check if a tool exists by ID
   */
  async toolExists(id: string): Promise<boolean> {
    return mongoDBService.toolExists(id);
  }

  /**
   * Get all tools (for admin purposes, without pagination)
   */
  async getAllTools(): Promise<ITool[]> {
    return mongoDBService.findTools({}, { sort: { dateAdded: -1 } });
  }

  /**
   * Get tools by contributor (for maintainer's my-tools)
   */
  async getToolsByContributor(
    contributorId: string,
    query: GetMyToolsQuery
  ): Promise<PaginatedResult<ITool>> {
    const { page = 1, limit = 20, approvalStatus, sortBy = 'dateAdded', sortOrder = 'desc' } = query;

    // Build filter - always filter by contributor
    const filter: Record<string, unknown> = {
      contributor: contributorId,
    };

    if (approvalStatus) {
      filter.approvalStatus = approvalStatus;
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const { data: tools, total } = await mongoDBService.findToolsPaginated({
      filter,
      sort,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: tools,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get tools for admin dashboard with full filtering capabilities
   */
  async getAdminTools(query: GetAdminToolsQuery): Promise<PaginatedResult<ITool>> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'dateAdded',
      sortOrder = 'desc',
      status,
      category,
      industry,
      pricingModel,
      approvalStatus,
      contributor,
    } = query;

    // Build filter query - admin can see all tools
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$text = { $search: search };
    }

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.categories = category;
    }

    if (industry) {
      filter.industries = industry;
    }

    if (pricingModel) {
      filter.pricingModel = pricingModel;
    }

    if (approvalStatus) {
      filter.approvalStatus = approvalStatus;
    }

    if (contributor) {
      filter.contributor = contributor;
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const { data: tools, total } = await mongoDBService.findToolsPaginated({
      filter,
      sort,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: tools,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Approve a tool (admin only)
   * Triggers sync to Qdrant since the tool becomes visible
   */
  async approveTool(id: string, adminUserId: string): Promise<ITool | null> {
    const updateData = {
      approvalStatus: 'approved' as ApprovalStatus,
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
      lastUpdated: new Date(),
      // Clear rejection reason if previously rejected
      rejectionReason: undefined,
      // Reset sync status since this is a new approval
      'syncMetadata.overallStatus': 'pending',
    };

    const tool = await mongoDBService.updateTool(id, updateData);

    if (tool) {
      searchLogger.info('Tool approved', {
        service: 'tool-crud-service',
        toolId: id,
        approvedBy: adminUserId,
      });

      // Fire-and-forget: Sync to Qdrant since tool is now approved
      this.triggerSync(tool, 'approve');
    }

    return tool;
  }

  /**
   * Reject a tool (admin only)
   * Removes from Qdrant if previously synced
   */
  async rejectTool(id: string, adminUserId: string, reason: string): Promise<ITool | null> {
    // Get the existing tool to check if it was previously approved
    const existingTool = await mongoDBService.findToolByIdOrSlug(id);
    const wasApproved = existingTool?.approvalStatus === 'approved';

    const updateData = {
      approvalStatus: 'rejected' as ApprovalStatus,
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
      rejectionReason: reason,
      lastUpdated: new Date(),
      // Reset sync status
      'syncMetadata.overallStatus': 'pending',
    };

    const tool = await mongoDBService.updateTool(id, updateData);

    if (tool) {
      searchLogger.info('Tool rejected', {
        service: 'tool-crud-service',
        toolId: id,
        rejectedBy: adminUserId,
        reason,
      });

      // Fire-and-forget: Remove from Qdrant if it was previously approved
      if (wasApproved) {
        this.triggerDelete(tool.id);
      }
    }

    return tool;
  }

  // ============================================
  // PRIVATE SYNC HELPER METHODS
  // ============================================

  /**
   * Fire-and-forget sync trigger for create/approve operations
   */
  private triggerSync(tool: ITool, operation: 'create' | 'approve'): void {
    toolSyncService
      .syncTool(tool, { force: true })
      .then((result) => {
        searchLogger.info(`[${operation}] Qdrant sync completed`, {
          service: 'tool-crud-service',
          toolId: tool.id,
          success: result.success,
          synced: result.syncedCount,
          failed: result.failedCount,
        });
      })
      .catch((error) => {
        searchLogger.error(`[${operation}] Qdrant sync failed`, error, {
          service: 'tool-crud-service',
          toolId: tool.id,
        });
      });
  }

  /**
   * Fire-and-forget sync trigger for update operations with field detection
   */
  private triggerSyncWithChanges(tool: ITool, changedFields: string[]): void {
    toolSyncService
      .syncAffectedCollections(tool, changedFields)
      .then((result) => {
        searchLogger.info('[update] Qdrant sync completed', {
          service: 'tool-crud-service',
          toolId: tool.id,
          changedFields,
          success: result.success,
          synced: result.syncedCount,
          failed: result.failedCount,
          skipped: result.skippedCount,
        });
      })
      .catch((error) => {
        searchLogger.error('[update] Qdrant sync failed', error, {
          service: 'tool-crud-service',
          toolId: tool.id,
          changedFields,
        });
      });
  }

  /**
   * Fire-and-forget delete trigger
   */
  private triggerDelete(toolId: string): void {
    toolSyncService
      .deleteToolFromQdrant(toolId)
      .then((result) => {
        searchLogger.info('[delete] Qdrant cleanup completed', {
          service: 'tool-crud-service',
          toolId,
          success: result.success,
          deleted: result.syncedCount,
          failed: result.failedCount,
        });
      })
      .catch((error) => {
        searchLogger.error('[delete] Qdrant cleanup failed', error, {
          service: 'tool-crud-service',
          toolId,
        });
      });
  }
}

// Export singleton instance
export const toolCrudService = new ToolCrudService();
