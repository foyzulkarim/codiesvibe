import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, SortOrder } from 'mongoose';
import { Tool, ToolDocument } from './schemas/tool.schema';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';

// Input sanitization utility to prevent NoSQL injection
class InputSanitizer {
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    // Remove potentially dangerous characters and operators
    return input.replace(/[{}$]/g, '').trim();
  }

  static sanitizeArray(input: string[]): string[] {
    if (!Array.isArray(input)) {
      throw new Error('Input must be an array');
    }
    return input.map(item => this.sanitizeString(item));
  }

  static sanitizeNumber(input: number): number {
    if (typeof input !== 'number' || isNaN(input)) {
      throw new Error('Input must be a valid number');
    }
    return input;
  }

  static sanitizeFilters(filters: SearchFilters): SearchFilters {
    const sanitized: SearchFilters = {};
    
    if (filters.functionality) {
      sanitized.functionality = this.sanitizeArray(filters.functionality);
    }
    
    if (filters.tags) {
      sanitized.tags = this.sanitizeArray(filters.tags);
    }
    
    if (filters.deployment) {
      sanitized.deployment = this.sanitizeArray(filters.deployment);
    }
    
    if (filters.minRating !== undefined) {
      sanitized.minRating = this.sanitizeNumber(filters.minRating);
    }
    
    if (filters.maxRating !== undefined) {
      sanitized.maxRating = this.sanitizeNumber(filters.maxRating);
    }
    
    return sanitized;
  }
}

export interface SearchFilters {
  functionality?: string[];
  tags?: string[];
  minRating?: number;
  maxRating?: number;
  deployment?: string[];
}

export interface SearchOptions {
  sortBy?: 'popularity' | 'rating' | 'reviewCount' | 'createdAt' | 'relevance';
}

@Injectable()
export class ToolsService {
  constructor(
    @InjectModel(Tool.name) private toolModel: Model<ToolDocument>,
  ) {}

  async create(createToolDto: CreateToolDto, userId: string): Promise<ToolDocument> {
    // Apply default values for enhanced fields
    const toolData = {
      ...createToolDto,
      createdBy: userId,
      popularity: createToolDto.popularity ?? 0,
      rating: createToolDto.rating ?? 0,
      reviewCount: createToolDto.reviewCount ?? 0,
      features: createToolDto.features ?? {},
      tags: {
        primary: createToolDto.tags?.primary ?? [],
        secondary: createToolDto.tags?.secondary ?? []
      },
      lastUpdated: new Date()
    };

    const createdTool = new this.toolModel(toolData);
    return createdTool.save();
  }

  async findAll(
    userId: string, 
    options: SearchOptions = {},
    filters: SearchFilters = {}
  ): Promise<ToolDocument[]> {
    const { sortBy = 'createdAt' } = options;

    // Sanitize filters to prevent NoSQL injection
    const sanitizedFilters = InputSanitizer.sanitizeFilters(filters);
    const query = this.buildFilterQuery(userId, sanitizedFilters);
    const sortOrder = this.buildSortOrder(sortBy);
    
    // Fetch all documents since we have a small dataset
    const data = await this.toolModel
      .find(query)
      .sort(sortOrder)
      .lean()
      .exec();

    return data as ToolDocument[];
  }

  async findOne(id: string, userId: string): Promise<ToolDocument> {
    const query: any = { _id: id };
    
    // Only filter by user if not public access
    if (userId && userId !== 'public') {
      query.createdBy = userId;
    }
    
    const tool = await this.toolModel.findOne(query).lean().exec();
    if (!tool) {
      throw new NotFoundException('Tool not found');
    }
    return tool as ToolDocument;
  }

  async update(id: string, updateToolDto: UpdateToolDto, userId: string): Promise<ToolDocument> {
    // Handle partial updates for complex fields
    const updateData: any = { ...updateToolDto };
    
    // Remove version from updateData as it's used for concurrency control
    const expectedVersion = updateData.version;
    delete updateData.version;
    
    // Update lastUpdated timestamp
    updateData.lastUpdated = new Date();
    
    // Handle partial tags update
    if (updateToolDto.tags) {
      const existingTool = await this.toolModel.findOne({ _id: id, createdBy: userId });
      if (existingTool) {
        updateData.tags = {
          primary: updateToolDto.tags.primary ?? existingTool.tags.primary,
          secondary: updateToolDto.tags.secondary ?? existingTool.tags.secondary
        };
      }
    }

    // Validate field consistency before update
    await this.validateFieldConsistency(updateData);

    // Build query with optimistic concurrency control
    const query: any = { _id: id, createdBy: userId };
    if (expectedVersion !== undefined) {
      query.__v = expectedVersion;
    }

    const tool = await this.toolModel.findOneAndUpdate(
      query,
      updateData,
      { new: true }
    ).lean().exec();
    
    if (!tool) {
      if (expectedVersion !== undefined) {
        // Check if document exists but version mismatch
        const existingTool = await this.toolModel.findOne({ _id: id, createdBy: userId });
        if (existingTool) {
          throw new Error('Document has been modified by another process. Please refresh and try again.');
        }
      }
      throw new NotFoundException('Tool not found');
    }
    return tool as ToolDocument;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.toolModel.deleteOne({ _id: id, createdBy: userId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Tool not found');
    }
  }

  async search(
    query: string,
    userId: string,
    options: SearchOptions = {},
    filters: SearchFilters = {}
  ): Promise<ToolDocument[]> {
    const { sortBy = 'createdAt' } = options;
    
    // Sanitize inputs to prevent NoSQL injection
    const sanitizedQuery = query ? InputSanitizer.sanitizeString(query) : '';
    const sanitizedFilters = InputSanitizer.sanitizeFilters(filters);
    
    if (!sanitizedQuery || sanitizedQuery.trim() === '') {
      return this.findAll(userId, options, sanitizedFilters);
    }

    const baseQuery = this.buildFilterQuery(userId, sanitizedFilters);
    const searchQuery = {
      ...baseQuery,
      $text: { $search: sanitizedQuery }
    };

    const sortOrder = sortBy === 'relevance' 
      ? { score: { $meta: 'textScore' } }
      : this.buildSortOrder(sortBy);

    // Fetch all matching documents since we have a small dataset
    const data = await this.toolModel
      .find(searchQuery, { score: { $meta: 'textScore' } })
      .sort(sortOrder)
      .lean()
      .exec();

    return data as ToolDocument[];
  }

  private buildFilterQuery(userId: string, filters: SearchFilters): FilterQuery<ToolDocument> {
    const query: FilterQuery<ToolDocument> = {};
    
    // Only filter by user if not public access
    if (userId && userId !== 'public') {
      query.createdBy = userId;
    }

    if (filters.functionality && filters.functionality.length > 0) {
      query.functionality = { $in: filters.functionality };
    }

    if (filters.tags && filters.tags.length > 0) {
      query.$or = [
        { 'tags.primary': { $in: filters.tags } },
        { 'tags.secondary': { $in: filters.tags } }
      ];
    }

    if (filters.minRating !== undefined) {
      query.rating = { ...query.rating, $gte: filters.minRating };
    }

    if (filters.maxRating !== undefined) {
      query.rating = { ...query.rating, $lte: filters.maxRating };
    }

    if (filters.deployment && filters.deployment.length > 0) {
      query.deployment = { $in: filters.deployment };
    }

    return query;
  }

  private buildSortOrder(sortBy: string): Record<string, SortOrder> {
    // Add secondary sort criteria for consistent results
    switch (sortBy) {
      case 'popularity':
        return { popularity: -1, rating: -1, createdAt: -1, _id: 1 };
      case 'rating':
        return { rating: -1, reviewCount: -1, createdAt: -1, _id: 1 };
      case 'reviewCount':
        return { reviewCount: -1, rating: -1, createdAt: -1, _id: 1 };
      case 'createdAt':
        return { createdAt: -1, _id: 1 };
      case 'relevance':
        return { score: { $meta: 'textScore' } as any, rating: -1, createdAt: -1, _id: 1 };
      default:
        return { createdAt: -1, _id: 1 };
    }
  }

  private async validateFieldConsistency(updateData: any): Promise<void> {
    // Validate rating and reviewCount consistency
    if (updateData.rating !== undefined || updateData.reviewCount !== undefined) {
      const rating = updateData.rating;
      const reviewCount = updateData.reviewCount;
      
      if (rating !== undefined && reviewCount !== undefined) {
        // Both fields are being updated - validate consistency
        if (reviewCount === 0 && rating !== 0) {
          throw new Error('Rating must be 0 when reviewCount is 0');
        }
        if (reviewCount > 0 && (rating < 0.1 || rating > 5)) {
          throw new Error('Rating must be between 0.1 and 5 when reviews exist');
        }
      }
    }

    // Validate array fields are not empty if provided
    const arrayFields = ['pricing', 'interface', 'functionality', 'deployment', 'searchKeywords'];
    for (const field of arrayFields) {
      if (updateData[field] !== undefined) {
        if (!Array.isArray(updateData[field]) || updateData[field].length === 0) {
          throw new Error(`${field} must be a non-empty array`);
        }
      }
    }

    // Validate tags structure if provided
    if (updateData.tags !== undefined) {
      const tags = updateData.tags;
      if (!tags.primary || !tags.secondary) {
        throw new Error('Tags must have both primary and secondary arrays');
      }
      if (tags.primary.length === 0 && tags.secondary.length === 0) {
        throw new Error('At least one tag array (primary or secondary) must be non-empty');
      }
    }

    // Validate URL format if logoUrl is provided
    if (updateData.logoUrl !== undefined) {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(updateData.logoUrl)) {
        throw new Error('logoUrl must be a valid URL starting with http:// or https://');
      }
    }
  }
}