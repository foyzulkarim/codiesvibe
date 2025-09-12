import { IsOptional, IsString, IsNumber, IsArray, Min, Max, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetToolsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search query across name, description, and keywords',
    example: 'AI assistant'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['popularity', 'rating', 'reviewCount', 'createdAt', 'relevance'],
    example: 'popularity',
    default: 'createdAt'
  })
  @IsOptional()
  @IsString()
  @IsIn(['popularity', 'rating', 'reviewCount', 'createdAt', 'relevance'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Filter by functionality categories (comma-separated)',
    example: 'Text Generation,Translation',
    type: String
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.split(',').map(s => s.trim()) : value)
  functionality?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags (comma-separated)',
    example: 'AI,Productivity',
    type: String
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.split(',').map(s => s.trim()) : value)
  tags?: string;

  @ApiPropertyOptional({
    description: 'Minimum rating filter',
    example: 4.0,
    minimum: 0,
    maximum: 5
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Maximum rating filter',
    example: 5.0,
    minimum: 0,
    maximum: 5
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  maxRating?: number;

  @ApiPropertyOptional({
    description: 'Filter by deployment options (comma-separated)',
    example: 'Cloud,On-premise',
    type: String
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.split(',').map(s => s.trim()) : value)
  deployment?: string;
}