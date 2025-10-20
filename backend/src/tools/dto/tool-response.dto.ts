import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  BaseTool,
  Pricing,
  PricingModelEnum,
} from '@shared/types/tool.types';
import { ToolDocument } from '../schemas/tool.schema';
import { PricingDto } from './pricing.dto';

class ResponsePricingSummaryDto {
  @ApiProperty({ description: 'Lowest monthly price', example: 0 })
  lowestMonthlyPrice!: number;

  @ApiProperty({ description: 'Highest monthly price', example: 20 })
  highestMonthlyPrice!: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency!: string;

  @ApiProperty({ description: 'Has free tier', example: true })
  hasFreeTier!: boolean;

  @ApiProperty({ description: 'Has custom pricing', example: false })
  hasCustomPricing!: boolean;

  @ApiProperty({ description: 'Billing periods', example: ['month', 'year'] })
  billingPeriods!: string[];

  @ApiProperty({
    description: 'Pricing models',
    example: ['freemium', 'paid'],
    enum: ['free', 'freemium', 'paid'],
  })
  pricingModel!: PricingModelEnum[];
}

export class ToolResponseDto implements BaseTool {
  @ApiProperty({
    description: 'Pricing details',
    type: [PricingDto],
    example: [{}],
  })
  pricing!: Pricing[];

  @ApiProperty({
    description: 'Pricing models',
    example: 'freemium',
    enum: ['free', 'freemium', 'paid'],
  })
  pricingModel!: PricingModelEnum;

  // Identity fields
  @ApiProperty({
    description: 'Tool unique identifier',
    example: 'chatgpt',
  })
  id!: string;

  @ApiProperty({
    description: 'Tool name',
    example: 'ChatGPT',
  })
  name!: string;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'chatgpt',
  })
  slug!: string;

  @ApiProperty({
    description: 'Tool description',
    example: 'AI-powered conversational assistant',
  })
  description!: string;

  @ApiPropertyOptional({
    description: 'Detailed tool description',
    example: 'ChatGPT is an advanced language model...',
  })
  longDescription?: string;

  @ApiPropertyOptional({
    description: 'Marketing tagline',
    example: 'Your AI conversation partner',
  })
  tagline?: string;

  // Flattened categorization (v2.0)
  @ApiProperty({
    description: 'Tool categories',
    type: [String],
    example: ['AI', 'Chatbot', 'Productivity'],
  })
  categories!: string[];

  @ApiProperty({
    description: 'Target industries',
    type: [String],
    example: ['Technology', 'Education', 'Business'],
  })
  industries!: string[];

  @ApiProperty({
    description: 'Target user types',
    type: [String],
    example: ['Developers', 'Students', 'Content Creators'],
  })
  userTypes!: string[];

  @ApiPropertyOptional({
    description: 'Pricing page URL',
    example: 'https://openai.com/pricing',
  })
  pricingUrl?: string;

  // Legacy fields
  @ApiProperty({
    description: 'Legacy interface types',
    type: [String],
    example: ['Web', 'API'],
  })
  interface!: string[];

  @ApiProperty({
    description: 'Legacy functionality categories',
    type: [String],
    example: ['Text Generation', 'Translation'],
  })
  functionality!: string[];

  @ApiProperty({
    description: 'Legacy deployment options',
    type: [String],
    example: ['Cloud', 'On-premise'],
  })
  deployment!: string[];

  // Metadata
  @ApiPropertyOptional({
    description: 'Tool logo URL',
    example: 'https://example.com/logo.png',
  })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Main website URL',
    example: 'https://chat.openai.com',
  })
  website?: string;

  @ApiPropertyOptional({
    description: 'Documentation URL',
    example: 'https://platform.openai.com/docs',
  })
  documentation?: string;

  @ApiProperty({
    description: 'Tool status',
    example: 'active',
    enum: ['active', 'beta', 'deprecated', 'discontinued'],
  })
  status!: 'active' | 'beta' | 'deprecated' | 'discontinued';

  @ApiProperty({
    description: 'Contributor identifier',
    example: 'system',
  })
  contributor!: string;

  @ApiProperty({
    description: 'Date added',
    example: '2024-01-10T08:15:30.000Z',
  })
  dateAdded!: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastUpdated!: string;

  /**
   * Transform a Mongoose Tool document to ToolResponseDto
   */
  static fromDocument(doc: ToolDocument): ToolResponseDto {
    return {
      // Identity
      id: doc.id || doc._id?.toString(),
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      longDescription: doc.longDescription,
      tagline: doc.tagline,

      // Flattened categorization (v2.0)
      categories: doc.categories || [],
      industries: doc.industries || [],
      userTypes: doc.userTypes || [],

      // Pricing (simplified)
      pricingModel: doc.pricingModel,
      pricing: doc.pricing || [],

      pricingUrl: doc.pricingUrl,

      // Legacy fields
      interface: doc.interface || [],
      functionality: doc.functionality || [],
      deployment: doc.deployment || [],

      // Metadata
      logoUrl: doc.logoUrl,
      website: doc.website,
      documentation: doc.documentation,
      status: doc.status || 'active',
      contributor: doc.contributor || 'system',
      dateAdded: doc.dateAdded?.toISOString() || new Date().toISOString(),
      lastUpdated: doc.lastUpdated?.toISOString() || new Date().toISOString(),
    };
  }
}
