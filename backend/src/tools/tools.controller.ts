import {
  Controller,
  Get,
  Param,
  Req,
  Query,
  Post,
  Body,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ToolsService, SearchFilters, SearchOptions } from './tools.service';
import { ToolResponseDto } from './dto/tool-response.dto';
import { GetToolsQueryDto } from './dto/get-tools-query.dto';
import { AiSearchDto } from './dto/ai-search.dto';
import { RequireSession } from '../common/decorators/require-session.decorator';

@ApiTags('Tools')
@Controller('tools') // Will be /api/tools with global prefix
export class ToolsController {
  constructor(
    private readonly toolsService: ToolsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('ai-search')
  @RequireSession()
  @ApiOperation({
    summary: 'AI based searching (POST with session validation)',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid session',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - origin not allowed',
  })
  async searchPost(
    @Body() searchDto: AiSearchDto,
    @Req() req: any,
    @Headers('x-csrf-token') csrfToken: string,
  ) {
    console.log(`Received search POST request with query: ${searchDto.query}`);

    try {
      const searchApiUrl = this.configService.get<string>(
        'SEARCH_API_URL',
        'http://localhost:4004',
      );
      const response = await fetch(`${searchApiUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchDto.query,
          limit: searchDto.limit || 10,
          debug: searchDto.debug || false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('data received from search-api', data);
      return data;
    } catch (error) {
      return {
        error: 'Search service unavailable',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get()
  @ApiOperation({
    summary: 'List AI tools with enhanced filtering and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'Tools retrieved successfully',
    type: [ToolResponseDto],
  })
  async findAll(
    @Query() query: GetToolsQueryDto,
    @Req() req: any,
  ): Promise<ToolResponseDto[]> {
    const filters: SearchFilters = {};
    const options: SearchOptions = {
      sortBy: query.sortBy as any,
    };

    // Build filters from query parameters
    if (query.functionality) {
      filters.functionality =
        typeof query.functionality === 'string'
          ? query.functionality.split(',').map((s) => s.trim())
          : query.functionality;
    }

    if (query.deployment) {
      filters.deployment =
        typeof query.deployment === 'string'
          ? query.deployment.split(',').map((s) => s.trim())
          : query.deployment;
    }

    if (query.pricing) {
      filters.pricing =
        typeof query.pricing === 'string'
          ? query.pricing.split(',').map((s) => s.trim())
          : query.pricing;
    }

    if (query.interface) {
      filters.interface =
        typeof query.interface === 'string'
          ? query.interface.split(',').map((s) => s.trim())
          : query.interface;
    }

    // Use a default user ID for public access or extract from auth if available
    const userId = req.user?.id || 'public';

    const tools = await this.toolsService.findTools(
      userId,
      options,
      filters,
      query.search,
    );

    return tools.map((tool) => ToolResponseDto.fromDocument(tool));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific AI tool with enhanced response' })
  @ApiResponse({
    status: 200,
    description: 'Tool retrieved successfully',
    type: ToolResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ToolResponseDto> {
    // Use a default user ID for public access or extract from auth if available
    const userId = req.user?.id || 'public';
    const tool = await this.toolsService.findOne(id, userId);
    return ToolResponseDto.fromDocument(tool);
  }
}
