import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, SortOrder } from 'mongoose';
import { Tool, ToolDocument } from './schemas/tool.schema';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';

export interface SearchFilters {
  functionality?: string[];
  tags?: string[];
  minRating?: number;
  maxRating?: number;
  deployment?: string[];
}

export interface SearchOptions {
  page?: number;
  limit?: number;
  sortBy?: 'popularity' | 'rating' | 'reviewCount' | 'createdAt' | 'relevance';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
  ): Promise<PaginatedResult<ToolDocument>> {
    const { page = 1, limit = 20, sortBy = 'createdAt' } = options;
    const skip = (page - 1) * limit;
    
    const query = this.buildFilterQuery(userId, filters);
    const sortOrder = this.buildSortOrder(sortBy);
    
    const [data, total] = await Promise.all([
      this.toolModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort(sortOrder)
        .lean()
        .exec(),
      this.toolModel.countDocuments(query).exec()
    ]);

    return {
      data: data as ToolDocument[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string, userId: string): Promise<ToolDocument> {
    const tool = await this.toolModel.findOne({ _id: id, createdBy: userId }).lean().exec();
    if (!tool) {
      throw new NotFoundException('Tool not found');
    }
    return tool as ToolDocument;
  }

  async update(id: string, updateToolDto: UpdateToolDto, userId: string): Promise<ToolDocument> {
    // Handle partial updates for complex fields
    const updateData: any = { ...updateToolDto };
    
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

    const tool = await this.toolModel.findOneAndUpdate(
      { _id: id, createdBy: userId },
      updateData,
      { new: true }
    ).lean().exec();
    
    if (!tool) {
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
  ): Promise<PaginatedResult<ToolDocument>> {
    const { page = 1, limit = 20, sortBy = 'createdAt' } = options;
    const skip = (page - 1) * limit;
    
    if (!query || query.trim() === '') {
      return this.findAll(userId, options, filters);
    }

    const baseQuery = this.buildFilterQuery(userId, filters);
    const searchQuery = {
      ...baseQuery,
      $text: { $search: query.trim() }
    };

    const sortOrder = sortBy === 'relevance' 
      ? { score: { $meta: 'textScore' } }
      : this.buildSortOrder(sortBy);

    const [data, total] = await Promise.all([
      this.toolModel
        .find(searchQuery, { score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .sort(sortOrder)
        .lean()
        .exec(),
      this.toolModel.countDocuments(searchQuery).exec()
    ]);

    return {
      data: data as ToolDocument[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  private buildFilterQuery(userId: string, filters: SearchFilters): FilterQuery<ToolDocument> {
    const query: FilterQuery<ToolDocument> = { createdBy: userId };

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
    const sortOrders: Record<string, Record<string, SortOrder>> = {
      popularity: { popularity: -1, createdAt: -1 },
      rating: { rating: -1, createdAt: -1 },
      reviewCount: { reviewCount: -1, createdAt: -1 },
      createdAt: { createdAt: -1 },
    };

    return sortOrders[sortBy] || sortOrders.createdAt;
  }
}