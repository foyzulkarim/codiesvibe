import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseTool, PricingModelEnum } from '@shared/types/tool.types';

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

  // Pricing (simplified)
  @ApiProperty({
    description: 'Pricing summary',
    type: ResponsePricingSummaryDto,
  })
  pricingSummary!: ResponsePricingSummaryDto;

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

  @ApiProperty({
    description: 'Popularity score',
    example: 85000,
    minimum: 0,
    maximum: 1000000,
  })
  popularity!: number;

  @ApiProperty({
    description: 'User rating',
    example: 4.5,
    minimum: 0,
    maximum: 5,
  })
  rating!: number;

  @ApiProperty({
    description: 'Number of reviews',
    example: 1250,
    minimum: 0,
    maximum: 1000000,
  })
  reviewCount!: number;

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

  // Backend-specific fields
  @ApiProperty({
    description: 'User who created the tool',
    example: '507f1f77bcf86cd799439012',
  })
  createdBy!: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-10T08:15:30.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt!: string;

  // Enhanced entity relationships (v2.0)
  @ApiProperty({
    description: 'Tool types for classification',
    type: [String],
    example: ['AI Tool', 'SaaS Platform', 'API Service'],
  })
  toolTypes!: string[];

  @ApiProperty({
    description: 'Domains the tool operates in',
    type: [String],
    example: ['Software Development', 'Data Science', 'Machine Learning'],
  })
  domains!: string[];

  @ApiProperty({
    description: 'Tool capabilities',
    type: [String],
    example: ['Text Generation', 'Code Completion', 'Data Analysis'],
  })
  capabilities!: string[];

  // Search optimization fields (v2.0)
  @ApiPropertyOptional({
    description: 'Alternative names or aliases',
    type: [String],
    example: ['GPT', 'Chat AI', 'OpenAI Chat'],
  })
  aliases?: string[];

  @ApiPropertyOptional({
    description: 'Search synonyms',
    type: [String],
    example: ['AI Assistant', 'Conversational AI', 'Language Model'],
  })
  synonyms?: string[];

  // Context relationships (v2.0)
  @ApiPropertyOptional({
    description: 'Similar tools by tool ID',
    type: [String],
    example: ['claude', 'bard', 'gemini'],
  })
  similarTo?: string[];

  @ApiPropertyOptional({
    description: 'Tools this is an alternative for by tool ID',
    type: [String],
    example: ['copilot', 'code-assistant'],
  })
  alternativesFor?: string[];

  @ApiPropertyOptional({
    description: 'Tools this works with by tool ID',
    type: [String],
    example: ['github', 'vscode', 'slack'],
  })
  worksWith?: string[];

  // Usage patterns (v2.0)
  @ApiProperty({
    description: 'Common use cases',
    type: [String],
    example: ['Content Creation', 'Customer Support', 'Code Generation'],
  })
  commonUseCases!: string[];

  /**
   * Transform a Mongoose Tool document to ToolResponseDto
   */
  static fromDocument(doc: any): ToolResponseDto {
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
      pricingSummary: {
        lowestMonthlyPrice: doc.pricingSummary?.lowestMonthlyPrice || 0,
        highestMonthlyPrice: doc.pricingSummary?.highestMonthlyPrice || 0,
        currency: doc.pricingSummary?.currency || 'USD',
        hasFreeTier: doc.pricingSummary?.hasFreeTier || false,
        hasCustomPricing: doc.pricingSummary?.hasCustomPricing || false,
        billingPeriods: doc.pricingSummary?.billingPeriods || [],
        pricingModel: doc.pricingSummary?.pricingModel || [],
      },
      pricingUrl: doc.pricingUrl,

      // Legacy fields
      interface: doc.interface || [],
      functionality: doc.functionality || [],
      deployment: doc.deployment || [],
      popularity: doc.popularity || 0,
      rating: doc.rating || 0,
      reviewCount: doc.reviewCount || 0,

      // Metadata
      logoUrl: doc.logoUrl,
      website: doc.website,
      documentation: doc.documentation,
      status: doc.status || 'active',
      contributor: doc.contributor || 'system',
      dateAdded: doc.dateAdded?.toISOString() || new Date().toISOString(),
      lastUpdated:
        doc.lastUpdated?.toISOString() ||
        doc.updatedAt?.toISOString() ||
        new Date().toISOString(),

      // Backend-specific
      createdBy: doc.createdBy?.toString() || 'unknown',
      createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: doc.updatedAt?.toISOString() || new Date().toISOString(),

      // Enhanced v2.0 fields
      toolTypes: doc.toolTypes || [],
      domains: doc.domains || [],
      capabilities: doc.capabilities || [],
      aliases: doc.aliases || [],
      synonyms: doc.synonyms || [],
      similarTo: doc.similarTo || [],
      alternativesFor: doc.alternativesFor || [],
      worksWith: doc.worksWith || [],
      commonUseCases: doc.commonUseCases || [],
    };
  }
}
