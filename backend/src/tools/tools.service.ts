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
    return input.map((item) => this.sanitizeString(item));
  }

  static sanitizeNumber(input: number): number {
    if (typeof input !== 'number' || isNaN(input)) {
      throw new Error('Input must be a valid number');
    }
    return input;
  }

  static sanitizeFilters(filters: SearchFilters): SearchFilters {
    const sanitized: SearchFilters = {};

    // Legacy filters
    if (filters.deployment) {
      sanitized.deployment = this.sanitizeArray(filters.deployment);
    }
    if (filters.functionality) {
      sanitized.functionality = this.sanitizeArray(filters.functionality);
    }
    if (filters.interface) {
      sanitized.interface = this.sanitizeArray(filters.interface);
    }
    if (filters.pricing) {
      sanitized.pricing = this.sanitizeArray(filters.pricing);
    }

    // v2.0 filters
    if (filters.categories) {
      sanitized.categories = this.sanitizeArray(filters.categories);
    }
    if (filters.industries) {
      sanitized.industries = this.sanitizeArray(filters.industries);
    }
    if (filters.userTypes) {
      sanitized.userTypes = this.sanitizeArray(filters.userTypes);
    }
    if (filters.hasFreeTier !== undefined) {
      sanitized.hasFreeTier = filters.hasFreeTier;
    }
    if (filters.status) {
      sanitized.status = this.sanitizeArray(filters.status);
    }

    return sanitized;
  }
}

export interface SearchFilters {
  // Legacy filters (maintained for compatibility)
  deployment?: string[];
  functionality?: string[];
  interface?: string[];
  pricing?: string[];

  // v2.0 filters
  categories?: string[];
  industries?: string[];
  userTypes?: string[];
  hasFreeTier?: boolean;
  status?: string[];
}

export interface SearchOptions {
  sortBy?: 'name' | 'createdAt' | 'popularity' | 'rating' | 'dateAdded';
}

@Injectable()
export class ToolsService {
  constructor(@InjectModel(Tool.name) private toolModel: Model<ToolDocument>) {}

  async create(
    createToolDto: CreateToolDto,
    userId: string,
  ): Promise<ToolDocument> {
    // Auto-generate id and slug from name if not provided
    const toolId = createToolDto.slug || this.generateId(createToolDto.name);
    const slug = createToolDto.slug || toolId;

    // Ensure unique id and slug
    await this.ensureUniqueIdAndSlug(toolId, slug);

    // Apply default values and transformations
    const toolData = {
      ...createToolDto,
      id: toolId,
      slug: slug,
      createdBy: userId,

      // Set default values for fields not provided in DTO
      popularity: 0,
      rating: 0,
      reviewCount: 0,

      
      // Set metadata
      contributor: 'user',
      dateAdded: new Date(),
      lastUpdated: new Date(),
      status: createToolDto.status || 'active',
    };

    const createdTool = new this.toolModel(toolData);
    return createdTool.save();
  }

  async findTools(
    userId: string,
    options: SearchOptions = {},
    filters: SearchFilters = {},
    searchQuery?: string,
  ): Promise<ToolDocument[]> {
    const { sortBy = 'dateAdded' } = options;

    // Sanitize filters to prevent NoSQL injection
    const sanitizedFilters = InputSanitizer.sanitizeFilters(filters);

    // Build base MongoDB query with filters
    let mongoQuery = this.buildFilterQuery(userId, sanitizedFilters);

    // Add enhanced text search if query provided
    if (searchQuery && searchQuery.trim()) {
      const sanitizedQuery = InputSanitizer.sanitizeString(searchQuery);
      const searchRegex = new RegExp(sanitizedQuery, 'i');
      mongoQuery = {
        ...mongoQuery,
        $or: [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { tagline: { $regex: searchRegex } },
          { longDescription: { $regex: searchRegex } },
        ],
      };
    }

    // Apply sorting and execute
    const sortOrder = this.buildSortOrder(sortBy);

    const data = await this.toolModel
      .find(mongoQuery)
      .sort(sortOrder)
      .lean()
      .exec();

    return data as ToolDocument[];
  }

  async findOne(id: string, userId: string): Promise<ToolDocument> {
    const query: any = {
      $or: [{ _id: id }, { id: id }, { slug: id }],
    };

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

  async update(
    id: string,
    updateToolDto: UpdateToolDto,
    userId: string,
  ): Promise<ToolDocument> {
    // Handle partial updates for complex fields
    const updateData: any = { ...updateToolDto };

    // Update lastUpdated timestamp
    updateData.lastUpdated = new Date();

    // Validate field consistency before update
    await this.validateFieldConsistency(updateData);

    // Build query
    const query: any = {
      $or: [{ _id: id }, { id: id }, { slug: id }],
      createdBy: userId,
    };

    const tool = await this.toolModel
      .findOneAndUpdate(query, updateData, { new: true })
      .lean()
      .exec();

    if (!tool) {
      throw new NotFoundException('Tool not found');
    }
    return tool as ToolDocument;
  }

  async remove(id: string, userId: string): Promise<void> {
    const query = {
      $or: [{ _id: id }, { id: id }, { slug: id }],
      createdBy: userId,
    };

    const result = await this.toolModel.deleteOne(query).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Tool not found');
    }
  }

  private generateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async ensureUniqueIdAndSlug(id: string, slug: string): Promise<void> {
    const existingById = await this.toolModel.findOne({ id }).lean();
    const existingBySlug = await this.toolModel.findOne({ slug }).lean();

    if (existingById || existingBySlug) {
      throw new Error('A tool with this ID or slug already exists');
    }
  }

  private buildFilterQuery(
    userId: string,
    filters: SearchFilters,
  ): FilterQuery<ToolDocument> {
    const query: FilterQuery<ToolDocument> = {};

    // Only filter by user if not public access
    if (userId && userId !== 'public') {
      query.createdBy = userId;
    }

    // Legacy filters (maintained for compatibility)
    if (filters.functionality && filters.functionality.length > 0) {
      query.functionality = { $in: filters.functionality };
    }
    if (filters.pricing && filters.pricing.length > 0) {
      // Normalize pricing values to lowercase for case-insensitive matching
      const normalizedPricing = filters.pricing.map((p) => p.toLowerCase());
      query['pricingSummary.pricingModel'] = { $in: normalizedPricing };
    }
    if (filters.interface && filters.interface.length > 0) {
      query.interface = { $in: filters.interface };
    }
    if (filters.deployment && filters.deployment.length > 0) {
      query.deployment = { $in: filters.deployment };
    }

    // v2.0 filters
    if (filters.categories && filters.categories.length > 0) {
      query.categories = { $in: filters.categories };
    }
    if (filters.industries && filters.industries.length > 0) {
      query.industries = { $in: filters.industries };
    }
    if (filters.userTypes && filters.userTypes.length > 0) {
      query.userTypes = { $in: filters.userTypes };
    }
    if (filters.hasFreeTier !== undefined) {
      query['pricingSummary.hasFreeTier'] = filters.hasFreeTier;
    }
    if (filters.status && filters.status.length > 0) {
      query.status = { $in: filters.status };
    }

    return query;
  }

  private buildSortOrder(sortBy: string): Record<string, SortOrder> {
    switch (sortBy) {
      case 'name':
        return { name: 1, _id: 1 };
      case 'popularity':
        return { popularity: -1, _id: 1 };
      case 'rating':
        return { rating: -1, _id: 1 };
      case 'dateAdded':
        return { dateAdded: -1, _id: 1 };
      case 'createdAt':
        return { createdAt: -1, _id: 1 };
      default:
        return { dateAdded: -1, _id: 1 };
    }
  }

  private async validateFieldConsistency(updateData: any): Promise<void> {
    // Validate rating and reviewCount consistency
    if (
      updateData.rating !== undefined ||
      updateData.reviewCount !== undefined
    ) {
      const rating = updateData.rating;
      const reviewCount = updateData.reviewCount;

      if (rating !== undefined && reviewCount !== undefined) {
        if (reviewCount === 0 && rating !== 0) {
          throw new Error('Rating must be 0 when reviewCount is 0');
        }
        if (reviewCount > 0 && (rating < 0.1 || rating > 5)) {
          throw new Error(
            'Rating must be between 0.1 and 5 when reviews exist',
          );
        }
      }
    }

    // Validate required array fields
    const requiredArrayFields = [
      'categories',
      'industries',
      'userTypes',
      'interface',
      'functionality',
      'deployment',
    ];
    for (const field of requiredArrayFields) {
      if (updateData[field] !== undefined) {
        if (!Array.isArray(updateData[field])) {
          throw new Error(`${field} must be an array`);
        }
      }
    }

    // Validate flattened categories structure if provided
    if (updateData.categories !== undefined) {
      if (
        !Array.isArray(updateData.categories) ||
        updateData.categories.length === 0
      ) {
        throw new Error('Categories must be a non-empty array');
      }
    }
    if (updateData.industries !== undefined) {
      if (
        !Array.isArray(updateData.industries) ||
        updateData.industries.length === 0
      ) {
        throw new Error('Industries must be a non-empty array');
      }
    }
    if (updateData.userTypes !== undefined) {
      if (
        !Array.isArray(updateData.userTypes) ||
        updateData.userTypes.length === 0
      ) {
        throw new Error('User types must be a non-empty array');
      }
    }

    // Validate pricing summary consistency
    if (updateData.pricingSummary !== undefined) {
      const summary = updateData.pricingSummary;
      if (summary.lowestMonthlyPrice > summary.highestMonthlyPrice) {
        throw new Error('Lowest price cannot be higher than highest price');
      }
    }

    // Validate URL formats
    const urlFields = ['logoUrl', 'website', 'documentation', 'pricingUrl'];
    for (const field of urlFields) {
      if (updateData[field] !== undefined && updateData[field] !== null) {
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(updateData[field])) {
          throw new Error(
            `${field} must be a valid URL starting with http:// or https://`,
          );
        }
      }
    }

    // Validate status enum
    if (updateData.status !== undefined) {
      const validStatuses = ['active', 'beta', 'deprecated', 'discontinued'];
      if (!validStatuses.includes(updateData.status)) {
        throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
      }
    }
  }
}
