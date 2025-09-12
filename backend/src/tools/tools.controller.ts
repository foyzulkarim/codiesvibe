import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ToolsService, SearchFilters, SearchOptions } from './tools.service';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { ToolResponseDto } from './dto/tool-response.dto';
import { GetToolsQueryDto } from './dto/get-tools-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Tools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tools') // Will be /api/tools with global prefix
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tool' })
  @ApiResponse({ status: 201, description: 'Tool created successfully', type: ToolResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createToolDto: CreateToolDto, @Req() req: any): Promise<ToolResponseDto> {
    const tool = await this.toolsService.create(createToolDto, req.user.id);
    return ToolResponseDto.fromDocument(tool);
  }

  @Get()
  @ApiOperation({ summary: "List user's tools with enhanced filtering and sorting" })
  @ApiResponse({ status: 200, description: 'Tools retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query() query: GetToolsQueryDto,
    @Req() req: any
  ) {
    const filters: SearchFilters = {};
    const options: SearchOptions = {
      page: query.page,
      limit: query.limit,
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

    let result;
    if (query.search) {
      result = await this.toolsService.search(query.search, req.user.id, options, filters);
    } else {
      result = await this.toolsService.findAll(req.user.id, options, filters);
    }

    return {
      data: result.data.map(tool => ToolResponseDto.fromDocument(tool)),
      pagination: result.pagination
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific tool with enhanced response' })
  @ApiResponse({ status: 200, description: 'Tool retrieved successfully', type: ToolResponseDto })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string, @Req() req: any): Promise<ToolResponseDto> {
    const tool = await this.toolsService.findOne(id, req.user.id);
    return ToolResponseDto.fromDocument(tool);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tool with enhanced fields support' })
  @ApiResponse({ status: 200, description: 'Tool updated successfully', type: ToolResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(@Param('id') id: string, @Body() updateToolDto: UpdateToolDto, @Req() req: any): Promise<ToolResponseDto> {
    const tool = await this.toolsService.update(id, updateToolDto, req.user.id);
    return ToolResponseDto.fromDocument(tool);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tool' })
  @ApiResponse({ status: 204, description: 'Tool deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.toolsService.remove(id, req.user.id);
    return;
  }
}