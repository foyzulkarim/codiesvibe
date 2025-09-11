import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tool, ToolDocument } from './schemas/tool.schema';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';

@Injectable()
export class ToolsService {
  constructor(
    @InjectModel(Tool.name) private toolModel: Model<ToolDocument>,
  ) {}

  async create(createToolDto: CreateToolDto, userId: string): Promise<ToolDocument> {
    const createdTool = new this.toolModel({
      ...createToolDto,
      createdBy: userId,
    });
    return createdTool.save();
  }

  async findAll(userId: string, page: number = 1, limit: number = 20): Promise<ToolDocument[]> {
    const skip = (page - 1) * limit;
    return this.toolModel
      .find({ createdBy: userId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<ToolDocument> {
    const tool = await this.toolModel.findOne({ _id: id, createdBy: userId }).exec();
    if (!tool) {
      throw new NotFoundException('Tool not found');
    }
    return tool;
  }

  async update(id: string, updateToolDto: UpdateToolDto, userId: string): Promise<ToolDocument> {
    const tool = await this.toolModel.findOneAndUpdate(
      { _id: id, createdBy: userId },
      { ...updateToolDto, updatedAt: new Date() },
      { new: true }
    ).exec();
    
    if (!tool) {
      throw new NotFoundException('Tool not found');
    }
    return tool;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.toolModel.deleteOne({ _id: id, createdBy: userId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Tool not found');
    }
  }

  async search(query: string, userId: string, page: number = 1, limit: number = 20): Promise<ToolDocument[]> {
    const skip = (page - 1) * limit;
    
    if (!query || query.trim() === '') {
      return this.findAll(userId, page, limit);
    }

    return this.toolModel
      .find({
        createdBy: userId,
        $text: { $search: query }
      })
      .skip(skip)
      .limit(limit)
      .sort({ score: { $meta: 'textScore' } })
      .exec();
  }
}