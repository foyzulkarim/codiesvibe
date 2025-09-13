import {
  Controller,
  Get,
  Param,  
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ToolsService, SearchFilters, SearchOptions } from './tools.service';

import { ToolResponseDto } from './dto/tool-response.dto';
import { GetToolsQueryDto } from './dto/get-tools-query.dto';

@ApiTags('Tools')
@Controller('tools') // Will be /api/tools with global prefix
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  @ApiOperation({ summary: 'List AI tools with enhanced filtering and sorting' })
  @ApiResponse({ status: 200, description: 'Tools retrieved successfully', type: [ToolResponseDto] })
  async findAll(
    @Query() query: GetToolsQueryDto,
    @Req() req: any
  ): Promise<ToolResponseDto[]> {
    const filters: SearchFilters = {};
    const options: SearchOptions = {
      sortBy: query.sortBy as any
    };

    // Build filters from query parameters
    if (query.functionality) {
      filters.functionality = typeof query.functionality === 'string' 
        ? query.functionality.split(',').map(s => s.trim())
        : query.functionality;
    }

    if (query.tags) {
      filters.tags = typeof query.tags === 'string'
        ? query.tags.split(',').map(s => s.trim())
        : query.tags;
    }

    if (query.deployment) {
      filters.deployment = typeof query.deployment === 'string'
        ? query.deployment.split(',').map(s => s.trim())
        : query.deployment;
    }

    if (query.minRating !== undefined) {
      filters.minRating = query.minRating;
    }

    if (query.maxRating !== undefined) {
      filters.maxRating = query.maxRating;
    }

    // Use a default user ID for public access or extract from auth if available
    const userId = req.user?.id || 'public';

    let tools;
    if (query.search) {
      tools = await this.toolsService.search(query.search, userId, options, filters);
    } else {
      tools = await this.toolsService.findAll(userId, options, filters);
    }

    return tools.map(tool => ToolResponseDto.fromDocument(tool));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific AI tool with enhanced response' })
  @ApiResponse({ status: 200, description: 'Tool retrieved successfully', type: ToolResponseDto })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  async findOne(@Param('id') id: string, @Req() req: any): Promise<ToolResponseDto> {
    // Use a default user ID for public access or extract from auth if available
    const userId = req.user?.id || 'public';
    const tool = await this.toolsService.findOne(id, userId);
    return ToolResponseDto.fromDocument(tool);
  }
}