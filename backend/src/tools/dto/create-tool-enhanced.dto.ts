import {
  IsString,
  IsArray,
  IsNumber,
  IsBoolean,
  IsObject,
  IsOptional,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
  IsUrl,
  IsDateString,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';

@ValidatorConstraint({ async: false })
class TagsAtLeastOneNonEmptyConstraint implements ValidatorConstraintInterface {
  validate(tags: any): boolean {
    if (!tags || typeof tags !== 'object') return false;
    const primaryNotEmpty =
      Array.isArray(tags.primary) && tags.primary.length > 0;
    const secondaryNotEmpty =
      Array.isArray(tags.secondary) && tags.secondary.length > 0;
    return primaryNotEmpty || secondaryNotEmpty;
  }

  defaultMessage(): string {
    return 'tags must have at least one non-empty array (primary or secondary)';
  }
}

@ValidatorConstraint({ async: false })
class FeaturesBooleanValuesConstraint implements ValidatorConstraintInterface {
  validate(features: any): boolean {
    if (!features || typeof features !== 'object') return true; // optional field
    return Object.values(features).every((value) => typeof value === 'boolean');
  }

  defaultMessage(): string {
    return 'features object must contain only boolean values';
  }
}

class PricingTierDto {
  @ApiPropertyOptional({
    description: 'Price amount for this tier',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description:
      'Billing cadence (e.g., monthly, yearly, one-time, per user/month)',
  })
  @IsOptional()
  @IsString()
  billing?: string;

  @ApiProperty({
    description: 'Included features for this tier',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @ApiPropertyOptional({
    description: 'Limitations of this tier',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  limitations?: string[];

  @ApiPropertyOptional({ description: 'Additional costs information' })
  @IsOptional()
  @IsString()
  additionalCosts?: string;

  @ApiPropertyOptional({ description: 'Whether pricing is custom/negotiated' })
  @IsOptional()
  @IsBoolean()
  customPricing?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of users included in this tier',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUsers?: number;
}

class TagsDto {
  @ApiProperty({ description: 'Primary category tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  primary!: string[];

  @ApiProperty({ description: 'Secondary category tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  secondary!: string[];
}

@ApiExtraModels(PricingTierDto)
export class CreateToolEnhancedDto {
  @ApiProperty({
    description: 'Unique identifier in kebab-case',
    pattern: '^[a-z0-9-]+$',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  id!: string;

  @ApiProperty({ description: 'Tool name', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Short description (under 500 characters)',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiPropertyOptional({
    description: 'Detailed description (at least 50 characters)',
    minLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(50)
  longDescription?: string;


  @ApiProperty({ description: 'Interface types', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  interface!: string[];

  @ApiProperty({ description: 'Functionality categories', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  functionality!: string[];

  @ApiProperty({ description: 'Deployment options', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  deployment!: string[];

  @ApiPropertyOptional({
    description: 'Popularity score (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  popularity?: number;

  @ApiPropertyOptional({
    description: 'User rating (0-5)',
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Number of reviews', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reviewCount?: number;

  @ApiPropertyOptional({
    description: 'Last updated date (YYYY-MM-DD or ISO8601)',
  })
  @IsOptional()
  @IsDateString()
  lastUpdated?: string;

  @ApiProperty({ description: 'Tool logo URL' })
  @IsString()
  @IsUrl()
  logoUrl!: string;

  @ApiPropertyOptional({
    description: 'Feature flags with boolean values',
    type: 'object',
    additionalProperties: { type: 'boolean' },
  })
  @IsOptional()
  @IsObject()
  @Validate(FeaturesBooleanValuesConstraint)
  features?: Record<string, boolean>;

  @ApiProperty({ description: 'Search keywords', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  searchKeywords!: string[];

  @ApiProperty({ description: 'Categorization tags', type: TagsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => TagsDto)
  @Validate(TagsAtLeastOneNonEmptyConstraint)
  tags!: TagsDto;

  @ApiPropertyOptional({
    description: 'Supported integrations',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  integrations?: string[];

  @ApiPropertyOptional({
    description: 'Supported programming languages',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({
    description: 'Detailed pricing per tier keyed by tier name',
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(PricingTierDto) },
  })
  @IsOptional()
  @IsObject()
  pricingDetails?: Record<string, PricingTierDto>;

  @ApiPropertyOptional({ description: 'Pros list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pros?: string[];

  @ApiPropertyOptional({ description: 'Cons list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cons?: string[];

  @ApiPropertyOptional({ description: 'Use cases', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  useCases?: string[];

  @ApiProperty({ description: 'Contributor identifier (e.g., username)' })
  @IsString()
  contributor!: string;

  @ApiProperty({ description: 'Date added (ISO8601)' })
  @IsString()
  @IsDateString()
  dateAdded!: string;
}
