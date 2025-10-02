import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetToolsQueryDto {
  @ApiPropertyOptional({
    description: 'Search query across name, description, and keywords',
    example: 'AI assistant',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['name', 'createdAt'],
    example: 'name',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'createdAt'], {
    message: 'sortBy must be either "name" or "createdAt"',
  })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Filter by functionality categories (comma-separated)',
    example: 'Text Generation,Translation',
    type: String,
  })
  @IsOptional()
  @IsString()
  functionality?: string;

  @ApiPropertyOptional({
    description: 'Filter by deployment options (comma-separated)',
    example: 'Cloud,On-premise',
    type: String,
  })
  @IsOptional()
  @IsString()
  deployment?: string;

  @ApiPropertyOptional({
    description: 'Filter by pricing models (comma-separated)',
    example: 'free,freemium,paid',
    type: String,
  })
  @IsOptional()
  @IsString()
  pricing?: string;

  @ApiPropertyOptional({
    description: 'Filter by interface types (comma-separated)',
    example: 'Web,API',
    type: String,
  })
  @IsOptional()
  @IsString()
  interface?: string;
}
