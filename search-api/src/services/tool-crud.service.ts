import mongoose from 'mongoose';
import { Tool, ITool, ApprovalStatus } from '../models/tool.model.js';
import {
  CreateToolInput,
  UpdateToolInput,
  GetToolsQuery,
  GetAdminToolsQuery,
  GetMyToolsQuery,
} from '../schemas/tool.schema.js';
import { searchLogger } from '../config/logger.js';

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

class ToolCrudService {
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;

  /**
   * Ensure mongoose is connected to the database
   */
  async ensureConnection(): Promise<void> {
    if (this.isConnected && mongoose.connection.readyState === 1) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  private async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      // Check if already connected
      if (mongoose.connection.readyState === 1) {
        this.isConnected = true;
        return;
      }

      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.isConnected = true;
      searchLogger.info('Mongoose connected for CRUD operations', {
        service: 'tool-crud-service',
      });

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        searchLogger.warn('Mongoose disconnected', { service: 'tool-crud-service' });
      });

      mongoose.connection.on('error', (err) => {
        searchLogger.error('Mongoose connection error', err, { service: 'tool-crud-service' });
      });
    } catch (error) {
      this.connectionPromise = null;
      throw error;
    }
  }

  /**
   * Create a new tool
   * Admin-created tools are auto-approved, maintainer-created tools are pending
   */
  async createTool(data: CreateToolInput, clerkUserId: string, isAdmin: boolean = false): Promise<ITool> {
    await this.ensureConnection();

    // Auto-generate slug from id if not provided
    // Admin-created tools are auto-approved
    const approvalStatus: ApprovalStatus = isAdmin ? 'approved' : 'pending';

    const toolData = {
      ...data,
      slug: data.slug || data.id,
      contributor: clerkUserId,
      dateAdded: new Date(),
      lastUpdated: new Date(),
      approvalStatus,
      // If admin created and approved, set review info
      ...(isAdmin && {
        reviewedBy: clerkUserId,
        reviewedAt: new Date(),
      }),
    };

    const tool = new Tool(toolData);
    const savedTool = await tool.save();

    searchLogger.info('Tool created successfully', {
      service: 'tool-crud-service',
      toolId: savedTool.id,
      toolName: savedTool.name,
      createdBy: clerkUserId,
      approvalStatus,
    });

    return savedTool;
  }

  /**
   * Get tools with pagination and filtering (PUBLIC - only approved tools)
   */
  async getTools(query: GetToolsQuery): Promise<PaginatedResult<ITool>> {
    await this.ensureConnection();

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
    const filter: Record<string, any> = {
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

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [tools, total] = await Promise.all([
      Tool.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Tool.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: tools as unknown as ITool[],
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
    await this.ensureConnection();

    // Build query - for public access, only return approved tools
    const query: Record<string, any> = {
      $or: [{ id: id }, { slug: id }],
    };

    if (publicOnly) {
      query.approvalStatus = 'approved';
    }

    const tool = await Tool.findOne(query).lean();

    return tool as unknown as ITool | null;
  }

  /**
   * Update a tool by ID
   */
  async updateTool(id: string, data: UpdateToolInput): Promise<ITool | null> {
    await this.ensureConnection();

    const updateData = {
      ...data,
      lastUpdated: new Date(),
    };

    const tool = await Tool.findOneAndUpdate(
      { $or: [{ id: id }, { slug: id }] },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (tool) {
      searchLogger.info('Tool updated successfully', {
        service: 'tool-crud-service',
        toolId: id,
      });
    }

    return tool as unknown as ITool | null;
  }

  /**
   * Delete a tool by ID
   */
  async deleteTool(id: string): Promise<boolean> {
    await this.ensureConnection();

    const result = await Tool.findOneAndDelete({
      $or: [{ id: id }, { slug: id }],
    });

    if (result) {
      searchLogger.info('Tool deleted successfully', {
        service: 'tool-crud-service',
        toolId: id,
      });
      return true;
    }

    return false;
  }

  /**
   * Check if a tool exists by ID
   */
  async toolExists(id: string): Promise<boolean> {
    await this.ensureConnection();

    const count = await Tool.countDocuments({
      $or: [{ id: id }, { slug: id }],
    });

    return count > 0;
  }

  /**
   * Get all tools (for admin purposes, without pagination)
   */
  async getAllTools(): Promise<ITool[]> {
    await this.ensureConnection();

    const tools = await Tool.find().sort({ dateAdded: -1 }).lean();
    return tools as unknown as ITool[];
  }

  /**
   * Get tools by contributor (for maintainer's my-tools)
   */
  async getToolsByContributor(
    contributorId: string,
    query: GetMyToolsQuery
  ): Promise<PaginatedResult<ITool>> {
    await this.ensureConnection();

    const { page = 1, limit = 20, approvalStatus, sortBy = 'dateAdded', sortOrder = 'desc' } = query;

    // Build filter - always filter by contributor
    const filter: Record<string, any> = {
      contributor: contributorId,
    };

    if (approvalStatus) {
      filter.approvalStatus = approvalStatus;
    }

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [tools, total] = await Promise.all([
      Tool.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Tool.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: tools as unknown as ITool[],
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
    await this.ensureConnection();

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
    const filter: Record<string, any> = {};

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

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [tools, total] = await Promise.all([
      Tool.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Tool.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: tools as unknown as ITool[],
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
   */
  async approveTool(id: string, adminUserId: string): Promise<ITool | null> {
    await this.ensureConnection();

    const tool = await Tool.findOneAndUpdate(
      { $or: [{ id: id }, { slug: id }] },
      {
        $set: {
          approvalStatus: 'approved',
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          lastUpdated: new Date(),
          // Clear rejection reason if previously rejected
          rejectionReason: undefined,
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (tool) {
      searchLogger.info('Tool approved', {
        service: 'tool-crud-service',
        toolId: id,
        approvedBy: adminUserId,
      });
    }

    return tool as unknown as ITool | null;
  }

  /**
   * Reject a tool (admin only)
   */
  async rejectTool(id: string, adminUserId: string, reason: string): Promise<ITool | null> {
    await this.ensureConnection();

    const tool = await Tool.findOneAndUpdate(
      { $or: [{ id: id }, { slug: id }] },
      {
        $set: {
          approvalStatus: 'rejected',
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          rejectionReason: reason,
          lastUpdated: new Date(),
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (tool) {
      searchLogger.info('Tool rejected', {
        service: 'tool-crud-service',
        toolId: id,
        rejectedBy: adminUserId,
        reason,
      });
    }

    return tool as unknown as ITool | null;
  }
}

// Export singleton instance
export const toolCrudService = new ToolCrudService();
