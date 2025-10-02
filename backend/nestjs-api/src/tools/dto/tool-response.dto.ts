import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseTool, PricingModelEnum } from '@shared/types/tool.types';

// Response DTOs for nested structures
class ResponseCategoriesDto {
  @ApiProperty({
    description: 'Primary categories',
    type: [String],
    example: ['AI', 'Chatbot'],
  })
  primary!: string[];

  @ApiProperty({
    description: 'Secondary categories',
    type: [String],
    example: ['Productivity'],
  })
  secondary!: string[];

  @ApiProperty({
    description: 'Target industries',
    type: [String],
    example: ['Technology', 'Education'],
  })
  industries!: string[];

  @ApiProperty({
    description: 'Target user types',
    type: [String],
    example: ['Developers', 'Students'],
  })
  userTypes!: string[];
}

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

class ResponsePricingTierDto {
  @ApiProperty({ description: 'Tier ID', example: 'free' })
  id!: string;

  @ApiProperty({ description: 'Tier name', example: 'Free Plan' })
  name!: string;

  @ApiProperty({ description: 'Price', example: 0 })
  price!: number;

  @ApiProperty({ description: 'Billing period', example: 'month' })
  billing!: string;

  @ApiProperty({ description: 'Features', example: ['Basic AI responses'] })
  features!: string[];

  @ApiPropertyOptional({
    description: 'Limitations',
    example: ['Rate limited'],
  })
  limitations?: string[];

  @ApiPropertyOptional({ description: 'Max users', example: 1 })
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Is popular', example: false })
  isPopular?: boolean;

  @ApiProperty({ description: 'Sort order', example: 1 })
  sortOrder!: number;
}

class ResponseAIFeaturesDto {
  @ApiProperty({ description: 'Code generation capability', example: false })
  codeGeneration!: boolean;

  @ApiProperty({ description: 'Image generation capability', example: false })
  imageGeneration!: boolean;

  @ApiProperty({ description: 'Data analysis capability', example: true })
  dataAnalysis!: boolean;

  @ApiProperty({ description: 'Voice interaction capability', example: false })
  voiceInteraction!: boolean;

  @ApiProperty({ description: 'Multimodal capability', example: true })
  multimodal!: boolean;

  @ApiProperty({ description: 'Thinking mode capability', example: false })
  thinkingMode!: boolean;
}

class ResponseTechnicalFeaturesDto {
  @ApiProperty({ description: 'API access available', example: true })
  apiAccess!: boolean;

  @ApiProperty({ description: 'Webhooks supported', example: false })
  webHooks!: boolean;

  @ApiProperty({ description: 'SDK available', example: true })
  sdkAvailable!: boolean;

  @ApiProperty({ description: 'Offline mode supported', example: false })
  offlineMode!: boolean;
}

class ResponseIntegrationsDto {
  @ApiProperty({ description: 'Supported platforms', example: ['Web', 'API'] })
  platforms!: string[];

  @ApiProperty({ description: 'Third-party integrations', example: ['Slack'] })
  thirdParty!: string[];

  @ApiProperty({ description: 'Supported protocols', example: ['REST'] })
  protocols!: string[];
}

class ResponseCapabilitiesDto {
  @ApiProperty({
    description: 'Core capabilities',
    example: ['Natural Language Processing'],
  })
  core!: string[];

  @ApiProperty({ description: 'AI features' })
  aiFeatures!: ResponseAIFeaturesDto;

  @ApiProperty({ description: 'Technical features' })
  technical!: ResponseTechnicalFeaturesDto;

  @ApiProperty({ description: 'Integrations' })
  integrations!: ResponseIntegrationsDto;
}

class ResponseUseCaseDto {
  @ApiProperty({ description: 'Use case name', example: 'Content Creation' })
  name!: string;

  @ApiProperty({
    description: 'Use case description',
    example: 'Create content with AI',
  })
  description!: string;

  @ApiProperty({ description: 'Relevant industries', example: ['Marketing'] })
  industries!: string[];

  @ApiProperty({
    description: 'Target user types',
    example: ['Content Creators'],
  })
  userTypes!: string[];

  @ApiProperty({ description: 'Scenarios', example: ['Blog writing'] })
  scenarios!: string[];

  @ApiProperty({ description: 'Complexity level', example: 'beginner' })
  complexity!: 'beginner' | 'intermediate' | 'advanced';
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

  // Categorization
  @ApiProperty({
    description: 'Tool categorization',
    type: ResponseCategoriesDto,
  })
  categories!: ResponseCategoriesDto;

  // Pricing
  @ApiProperty({
    description: 'Pricing summary',
    type: ResponsePricingSummaryDto,
  })
  pricingSummary!: ResponsePricingSummaryDto;

  @ApiProperty({
    description: 'Detailed pricing tiers',
    type: [ResponsePricingTierDto],
  })
  pricingDetails!: ResponsePricingTierDto[];

  @ApiPropertyOptional({
    description: 'Pricing page URL',
    example: 'https://openai.com/pricing',
  })
  pricingUrl?: string;

  // Capabilities
  @ApiProperty({
    description: 'Tool capabilities',
    type: ResponseCapabilitiesDto,
  })
  capabilities!: ResponseCapabilitiesDto;

  // Use cases
  @ApiProperty({
    description: 'Tool use cases',
    type: [ResponseUseCaseDto],
  })
  useCases!: ResponseUseCaseDto[];

  // Search optimization
  @ApiProperty({
    description: 'Search keywords',
    type: [String],
    example: ['AI', 'chatbot', 'conversation'],
  })
  searchKeywords!: string[];

  @ApiProperty({
    description: 'Semantic tags',
    type: [String],
    example: ['natural language processing', 'machine learning'],
  })
  semanticTags!: string[];

  @ApiProperty({
    description: 'Alternative names',
    type: [String],
    example: ['OpenAI ChatGPT', 'GPT-4'],
  })
  aliases!: string[];

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

      // Categorization
      categories: {
        primary: doc.categories?.primary || [],
        secondary: doc.categories?.secondary || [],
        industries: doc.categories?.industries || [],
        userTypes: doc.categories?.userTypes || [],
      },

      // Pricing
      pricingSummary: {
        lowestMonthlyPrice: doc.pricingSummary?.lowestMonthlyPrice || 0,
        highestMonthlyPrice: doc.pricingSummary?.highestMonthlyPrice || 0,
        currency: doc.pricingSummary?.currency || 'USD',
        hasFreeTier: doc.pricingSummary?.hasFreeTier || false,
        hasCustomPricing: doc.pricingSummary?.hasCustomPricing || false,
        billingPeriods: doc.pricingSummary?.billingPeriods || [],
        pricingModel: doc.pricingSummary?.pricingModel || [],
      },
      pricingDetails: doc.pricingDetails || [],
      pricingUrl: doc.pricingUrl,

      // Capabilities
      capabilities: {
        core: doc.capabilities?.core || [],
        aiFeatures: {
          codeGeneration: doc.capabilities?.aiFeatures?.codeGeneration || false,
          imageGeneration:
            doc.capabilities?.aiFeatures?.imageGeneration || false,
          dataAnalysis: doc.capabilities?.aiFeatures?.dataAnalysis || false,
          voiceInteraction:
            doc.capabilities?.aiFeatures?.voiceInteraction || false,
          multimodal: doc.capabilities?.aiFeatures?.multimodal || false,
          thinkingMode: doc.capabilities?.aiFeatures?.thinkingMode || false,
        },
        technical: {
          apiAccess: doc.capabilities?.technical?.apiAccess || false,
          webHooks: doc.capabilities?.technical?.webHooks || false,
          sdkAvailable: doc.capabilities?.technical?.sdkAvailable || false,
          offlineMode: doc.capabilities?.technical?.offlineMode || false,
        },
        integrations: {
          platforms: doc.capabilities?.integrations?.platforms || [],
          thirdParty: doc.capabilities?.integrations?.thirdParty || [],
          protocols: doc.capabilities?.integrations?.protocols || [],
        },
      },

      // Use cases
      useCases: doc.useCases || [],

      // Search optimization
      searchKeywords: doc.searchKeywords || [],
      semanticTags: doc.semanticTags || [],
      aliases: doc.aliases || [],

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
    };
  }
}
