import mongoose from 'mongoose';
import { Tool, ITool } from '../models/tool.model';
import { CreateToolInput, UpdateToolInput, GetToolsQuery } from '../schemas/tool.schema';
import { searchLogger } from '../config/logger';

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
   */
  async createTool(data: CreateToolInput, clerkUserId: string): Promise<ITool> {
    await this.ensureConnection();

    // Auto-generate slug from id if not provided
    const toolData = {
      ...data,
      slug: data.slug || data.id,
      contributor: clerkUserId,
      dateAdded: new Date(),
      lastUpdated: new Date(),
    };

    const tool = new Tool(toolData);
    const savedTool = await tool.save();

    searchLogger.info('Tool created successfully', {
      service: 'tool-crud-service',
      toolId: savedTool.id,
      toolName: savedTool.name,
      createdBy: clerkUserId,
    });

    return savedTool;
  }

  /**
   * Get tools with pagination and filtering
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

    // Build filter query
    const filter: Record<string, any> = {};

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
   * Get a single tool by ID
   */
  async getToolById(id: string): Promise<ITool | null> {
    await this.ensureConnection();

    // Try to find by custom id field first, then by slug
    const tool = await Tool.findOne({
      $or: [{ id: id }, { slug: id }],
    }).lean();

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
}

// Export singleton instance
export const toolCrudService = new ToolCrudService();
