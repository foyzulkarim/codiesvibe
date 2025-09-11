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
import { ToolsService } from './tools.service';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { ToolResponseDto } from './dto/tool-response.dto';
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
  async create(@Body() createToolDto: CreateToolDto, @Req() req: any) {
    const tool = await this.toolsService.create(createToolDto, req.user.id);
    return {
      id: tool._id,
      name: tool.name,
      description: tool.description,
      createdAt: (tool as any).createdAt,
      updatedAt: (tool as any).updatedAt,
    };
  }

  @Get()
  @ApiOperation({ summary: "List user's tools" })
  @ApiResponse({ status: 200, description: 'Tools retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    
    let tools;
    if (search) {
      tools = await this.toolsService.search(search, req.user.id, pageNum, limitNum);
    } else {
      tools = await this.toolsService.findAll(req.user.id, pageNum, limitNum);
    }

    return {
      data: tools.map(tool => ({
        id: tool._id,
        name: tool.name,
        description: tool.description,
        createdAt: (tool as any).createdAt,
        updatedAt: (tool as any).updatedAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: tools.length,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific tool' })
  @ApiResponse({ status: 200, description: 'Tool retrieved successfully', type: ToolResponseDto })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tool = await this.toolsService.findOne(id, req.user.id);
    return {
      id: tool._id,
      name: tool.name,
      description: tool.description,
      createdAt: (tool as any).createdAt,
      updatedAt: (tool as any).updatedAt,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tool' })
  @ApiResponse({ status: 200, description: 'Tool updated successfully', type: ToolResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(@Param('id') id: string, @Body() updateToolDto: UpdateToolDto, @Req() req: any) {
    const tool = await this.toolsService.update(id, updateToolDto, req.user.id);
    return {
      id: tool._id,
      name: tool.name,
      description: tool.description,
      createdAt: (tool as any).createdAt,
      updatedAt: (tool as any).updatedAt,
    };
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