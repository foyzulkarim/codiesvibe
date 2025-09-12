import { 
  IsString, 
  Length, 
  IsOptional,
  IsArray, 
  IsNumber, 
  Min, 
  Max, 
  IsUrl, 
  IsObject, 
  ValidateNested
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class UpdateTagsDto {
  @ApiPropertyOptional({ 
    description: 'Primary category tags',
    type: [String],
    example: ['AI', 'Chatbot']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  primary?: string[];

  @ApiPropertyOptional({ 
    description: 'Secondary category tags',
    type: [String],
    example: ['Productivity', 'Communication']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondary?: string[];
}

export class UpdateToolDto {
  @ApiPropertyOptional({ 
    description: 'Tool name',
    minLength: 1,
    maxLength: 100,
    example: 'ChatGPT'
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Tool description',
    minLength: 1,
    maxLength: 500,
    example: 'Advanced AI chatbot for natural conversations'
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Detailed tool description',
    maxLength: 2000,
    example: 'ChatGPT is an advanced language model...'
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  longDescription?: string;

  @ApiPropertyOptional({ 
    description: 'Pricing models',
    type: [String],
    example: ['Free', 'Paid', 'API']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pricing?: string[];

  @ApiPropertyOptional({ 
    description: 'Interface types',
    type: [String],
    example: ['Web', 'API', 'Mobile']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interface?: string[];

  @ApiPropertyOptional({ 
    description: 'Functionality categories',
    type: [String],
    example: ['Text Generation', 'Translation']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  functionality?: string[];

  @ApiPropertyOptional({ 
    description: 'Deployment options',
    type: [String],
    example: ['Cloud', 'On-premise']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deployment?: string[];

  @ApiPropertyOptional({ 
    description: 'Popularity score (0-1000000)',
    minimum: 0,
    maximum: 1000000,
    example: 85000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  popularity?: number;

  @ApiPropertyOptional({ 
    description: 'User rating (0-5)',
    minimum: 0,
    maximum: 5,
    example: 4.5
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ 
    description: 'Number of reviews (0-1000000)',
    minimum: 0,
    maximum: 1000000,
    example: 1250
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  reviewCount?: number;

  @ApiPropertyOptional({ 
    description: 'Tool logo image URL',
    example: 'https://example.com/logo.png'
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'logoUrl must be a valid URL' })
  logoUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Feature flags with boolean values',
    type: 'object',
    additionalProperties: { type: 'boolean' },
    example: {
      apiAccess: true,
      freeTier: true,
      multiLanguage: true
    }
  })
  @IsOptional()
  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'object' && value !== null) {
      const transformed: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(value)) {
        transformed[key] = Boolean(val);
      }
      return transformed;
    }
    return value;
  })
  features?: Record<string, boolean>;

  @ApiPropertyOptional({ 
    description: 'Search keywords for improved discoverability',
    type: [String],
    example: ['chatbot', 'AI assistant', 'conversation']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map(keyword => 
        typeof keyword === 'string' ? keyword.substring(0, 256) : String(keyword).substring(0, 256)
      );
    }
    return value;
  })
  searchKeywords?: string[];

  @ApiPropertyOptional({ 
    description: 'Categorization tags with primary and secondary arrays',
    type: UpdateTagsDto,
    example: {
      primary: ['AI', 'Chatbot'],
      secondary: ['Productivity', 'Communication']
    }
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateTagsDto)
  tags?: UpdateTagsDto;
}