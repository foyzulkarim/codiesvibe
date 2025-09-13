import { 
  IsString, 
  Length, 
  IsArray, 
  ArrayNotEmpty, 
  IsNumber, 
  Min, 
  Max, 
  IsOptional, 
  IsUrl, 
  IsObject, 
  ValidateNested,
  ArrayMinSize,
  IsBoolean
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateToolPayload, ToolTags } from '../../../../shared/types/tool.types';

class TagsDto {
  @ApiProperty({ 
    description: 'Primary category tags',
    type: [String],
    example: ['AI', 'Chatbot']
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Primary tags must not be empty' })
  @IsString({ each: true })
  primary!: string[];

  @ApiProperty({ 
    description: 'Secondary category tags',
    type: [String],
    example: ['Productivity', 'Communication', 'Language']
  })
  @IsArray()
  @IsString({ each: true })
  secondary!: string[];
}

export class CreateToolDto implements CreateToolPayload {
  @ApiProperty({ 
    description: 'Tool name',
    minLength: 1,
    maxLength: 100,
    example: 'ChatGPT'
  })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ 
    description: 'Tool description',
    minLength: 1,
    maxLength: 500,
    example: 'Advanced AI chatbot for natural conversations'
  })
  @IsString()
  @Length(1, 500)
  description!: string;

  @ApiPropertyOptional({ 
    description: 'Detailed tool description',
    maxLength: 2000,
    example: 'ChatGPT is an advanced language model developed by OpenAI that can engage in natural conversations...'
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  longDescription?: string;

  @ApiProperty({ 
    description: 'Pricing models',
    type: [String],
    example: ['Free', 'Paid', 'API']
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Pricing must contain at least one option' })
  @IsString({ each: true })
  pricing!: string[];

  @ApiProperty({ 
    description: 'Interface types',
    type: [String],
    example: ['Web', 'API', 'Mobile']
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Interface must contain at least one option' })
  @IsString({ each: true })
  interface!: string[];

  @ApiProperty({ 
    description: 'Functionality categories',
    type: [String],
    example: ['Text Generation', 'Translation', 'Code Generation']
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Functionality must contain at least one option' })
  @IsString({ each: true })
  functionality!: string[];

  @ApiProperty({ 
    description: 'Deployment options',
    type: [String],
    example: ['Cloud', 'On-premise']
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Deployment must contain at least one option' })
  @IsString({ each: true })
  deployment!: string[];

  @ApiPropertyOptional({ 
    description: 'Popularity score (0-1000000)',
    minimum: 0,
    maximum: 1000000,
    example: 85000,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  popularity?: number = 0;

  @ApiPropertyOptional({ 
    description: 'User rating (0-5)',
    minimum: 0,
    maximum: 5,
    example: 4.5,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number = 0;

  @ApiPropertyOptional({ 
    description: 'Number of reviews (0-1000000)',
    minimum: 0,
    maximum: 1000000,
    example: 1250,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  reviewCount?: number = 0;

  @ApiProperty({ 
    description: 'Tool logo image URL',
    example: 'https://example.com/logo.png'
  })
  @IsString()
  @IsUrl({}, { message: 'logoUrl must be a valid URL' })
  logoUrl!: string;

  @ApiPropertyOptional({ 
    description: 'Feature flags with boolean values',
    type: 'object',
    additionalProperties: { type: 'boolean' },
    example: {
      apiAccess: true,
      freeTier: true,
      multiLanguage: true,
      codeExecution: false
    },
    default: {}
  })
  @IsOptional()
  @IsObject()
  @Transform(({ value }) => {
    // Only transform if it's already a valid object, otherwise let validation fail
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const transformed: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(value)) {
        transformed[key] = Boolean(val);
      }
      return transformed;
    }
    // Return the value as-is for validation to catch invalid types
    return value;
  })
  features?: Record<string, boolean> = {};

  @ApiProperty({ 
    description: 'Search keywords for improved discoverability (max 256 chars each)',
    type: [String],
    example: ['chatbot', 'AI assistant', 'natural language', 'conversation']
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Search keywords must contain at least one keyword' })
  @IsString({ each: true })
  @Length(1, 256, { each: true, message: 'Each search keyword must be between 1 and 256 characters' })
  searchKeywords!: string[];

  @ApiProperty({ 
    description: 'Categorization tags with primary and secondary arrays',
    type: TagsDto,
    example: {
      primary: ['AI', 'Chatbot'],
      secondary: ['Productivity', 'Communication', 'Language']
    }
  })
  @IsObject()
  @ValidateNested()
  @Type(() => TagsDto)
  tags!: TagsDto;
}