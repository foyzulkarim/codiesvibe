import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  Length,
  IsUrl,
  ArrayNotEmpty,
  ValidateNested,
  IsBoolean,
  IsNumber,
  Min,
  IsEnum,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Categories DTO
class CategoriesDto {
  @ApiProperty({
    description: 'Primary categories (1-5 entries)',
    example: ['AI', 'Chatbot'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  primary!: string[];

  @ApiPropertyOptional({
    description: 'Secondary categories (0-5 entries)',
    example: ['Productivity'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  secondary?: string[];

  @ApiProperty({
    description: 'Target industries (1-10 entries)',
    example: ['Technology', 'Education'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  industries!: string[];

  @ApiProperty({
    description: 'Target user types (1-10 entries)',
    example: ['Developers', 'Students'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  userTypes!: string[];
}

// Pricing Summary DTO
class PricingSummaryDto {
  @ApiProperty({
    description: 'Lowest monthly price',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  lowestMonthlyPrice!: number;

  @ApiProperty({
    description: 'Highest monthly price',
    example: 20,
  })
  @IsNumber()
  @Min(0)
  highestMonthlyPrice!: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
  })
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a valid 3-letter ISO code',
  })
  currency!: string;

  @ApiProperty({
    description: 'Has free tier available',
    example: true,
  })
  @IsBoolean()
  hasFreeTier!: boolean;

  @ApiProperty({
    description: 'Has custom pricing for enterprise',
    example: false,
  })
  @IsBoolean()
  hasCustomPricing!: boolean;

  @ApiProperty({
    description: 'Available billing periods (1-3 entries)',
    example: ['month', 'year'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  billingPeriods!: string[];

  @ApiProperty({
    description: 'Pricing models',
    example: ['freemium', 'subscription'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  pricingModel!: string[];
}

// Pricing Details DTO
class PricingTierDto {
  @ApiProperty({
    description: 'Unique tier ID',
    example: 'free',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    description: 'Tier name',
    example: 'Free Plan',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Price amount',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({
    description: 'Billing period',
    example: 'month',
  })
  @IsString()
  @IsNotEmpty()
  billing!: string;

  @ApiProperty({
    description: 'Included features',
    example: ['Basic AI responses', '100 requests/month'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  features!: string[];

  @ApiPropertyOptional({
    description: 'Plan limitations',
    example: ['Limited to 100 requests'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  limitations?: string[];

  @ApiPropertyOptional({
    description: 'Maximum users',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({
    description: 'Is this the popular plan',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @ApiProperty({
    description: 'Sort order for display',
    example: 1,
  })
  @IsNumber()
  sortOrder!: number;
}

// AI Features DTO
class AIFeaturesDto {
  @ApiProperty({ description: 'Code generation capability', example: false })
  @IsBoolean()
  codeGeneration!: boolean;

  @ApiProperty({ description: 'Image generation capability', example: false })
  @IsBoolean()
  imageGeneration!: boolean;

  @ApiProperty({ description: 'Data analysis capability', example: true })
  @IsBoolean()
  dataAnalysis!: boolean;

  @ApiProperty({ description: 'Voice interaction capability', example: false })
  @IsBoolean()
  voiceInteraction!: boolean;

  @ApiProperty({ description: 'Multimodal capability', example: true })
  @IsBoolean()
  multimodal!: boolean;

  @ApiProperty({ description: 'Thinking mode capability', example: false })
  @IsBoolean()
  thinkingMode!: boolean;
}

// Technical Features DTO
class TechnicalFeaturesDto {
  @ApiProperty({ description: 'API access available', example: true })
  @IsBoolean()
  apiAccess!: boolean;

  @ApiProperty({ description: 'Webhooks supported', example: false })
  @IsBoolean()
  webHooks!: boolean;

  @ApiProperty({ description: 'SDK available', example: true })
  @IsBoolean()
  sdkAvailable!: boolean;

  @ApiProperty({ description: 'Offline mode supported', example: false })
  @IsBoolean()
  offlineMode!: boolean;
}

// Integrations DTO
class IntegrationsDto {
  @ApiProperty({
    description: 'Supported platforms',
    example: ['Web', 'iOS', 'Android'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  platforms!: string[];

  @ApiProperty({
    description: 'Third-party integrations',
    example: ['Slack', 'Discord'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  thirdParty!: string[];

  @ApiProperty({
    description: 'Supported protocols',
    example: ['REST', 'GraphQL'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  protocols!: string[];
}

// Capabilities DTO
class CapabilitiesDto {
  @ApiProperty({
    description: 'Core capabilities (1-10 entries)',
    example: ['Natural Language Processing', 'Text Generation'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  core!: string[];

  @ApiProperty({ description: 'AI-specific features' })
  @ValidateNested()
  @Type(() => AIFeaturesDto)
  aiFeatures!: AIFeaturesDto;

  @ApiProperty({ description: 'Technical features' })
  @ValidateNested()
  @Type(() => TechnicalFeaturesDto)
  technical!: TechnicalFeaturesDto;

  @ApiProperty({ description: 'Integration capabilities' })
  @ValidateNested()
  @Type(() => IntegrationsDto)
  integrations!: IntegrationsDto;
}

// Use Case DTO
class UseCaseDto {
  @ApiProperty({
    description: 'Use case name',
    example: 'Content Creation',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  name!: string;

  @ApiProperty({
    description: 'Use case description',
    example:
      'Create blog posts, articles, and marketing content with AI assistance',
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 500)
  description!: string;

  @ApiProperty({
    description: 'Relevant industries (1-5 entries)',
    example: ['Marketing', 'Publishing'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  industries!: string[];

  @ApiProperty({
    description: 'Target user types (1-5 entries)',
    example: ['Content Creators', 'Marketers'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  userTypes!: string[];

  @ApiProperty({
    description: 'Specific scenarios (1-10 entries)',
    example: ['Blog writing', 'Social media posts'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  scenarios!: string[];

  @ApiProperty({
    description: 'Complexity level',
    example: 'beginner',
  })
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  complexity!: 'beginner' | 'intermediate' | 'advanced';
}

export class CreateToolDto {
  // Identity fields
  @ApiProperty({
    description:
      'Unique tool identifier (lowercase letters, numbers, and hyphens only)',
    example: 'chatgpt',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'ID must contain only lowercase letters, numbers, and hyphens',
  })
  id!: string;

  @ApiProperty({
    description: 'Tool name',
    example: 'ChatGPT',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug (auto-generated if not provided)',
    example: 'chatgpt',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiProperty({
    description: 'Brief tool description (10-200 characters)',
    example:
      'AI-powered conversational assistant for natural language interactions',
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 200)
  description!: string;

  @ApiPropertyOptional({
    description: 'Detailed tool description (50-2000 characters)',
    example:
      'ChatGPT is an advanced language model developed by OpenAI that can engage in natural conversations, answer questions, help with writing, coding, and many other tasks.',
  })
  @IsOptional()
  @IsString()
  @Length(50, 2000)
  longDescription?: string;

  @ApiPropertyOptional({
    description: 'Marketing tagline (max 100 characters)',
    example: 'Your AI conversation partner',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  tagline?: string;

  // Categorization
  @ApiProperty({ description: 'Tool categorization' })
  @ValidateNested()
  @Type(() => CategoriesDto)
  categories!: CategoriesDto;

  // Pricing
  @ApiProperty({ description: 'Pricing summary information' })
  @ValidateNested()
  @Type(() => PricingSummaryDto)
  pricingSummary!: PricingSummaryDto;

  @ApiProperty({
    description: 'Detailed pricing tiers (1-10 entries)',
    type: [PricingTierDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  pricingDetails!: PricingTierDto[];

  @ApiPropertyOptional({
    description: 'URL to pricing page',
    example: 'https://openai.com/pricing',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Pricing URL must be a valid URL' })
  pricingUrl?: string;

  // Capabilities
  @ApiProperty({ description: 'Tool capabilities and features' })
  @ValidateNested()
  @Type(() => CapabilitiesDto)
  capabilities!: CapabilitiesDto;

  // Use cases
  @ApiProperty({
    description: 'Tool use cases',
    type: [UseCaseDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UseCaseDto)
  useCases!: UseCaseDto[];

  // Search optimization
  @ApiProperty({
    description: 'Search keywords (5-20 entries)',
    example: ['AI', 'chatbot', 'language model', 'OpenAI', 'conversation'],
  })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 256, { each: true })
  searchKeywords!: string[];

  @ApiProperty({
    description: 'Semantic tags for AI understanding (5-20 entries)',
    example: [
      'natural language processing',
      'machine learning',
      'conversational AI',
    ],
  })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 256, { each: true })
  semanticTags!: string[];

  @ApiProperty({
    description: 'Alternative names and aliases (max 10 entries)',
    example: ['OpenAI ChatGPT', 'GPT-4', 'Chat GPT'],
  })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Length(1, 256, { each: true })
  aliases!: string[];

  // Legacy fields (maintained for compatibility)
  @ApiProperty({
    description: 'Legacy pricing models',
    example: ['Free', 'Paid'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  pricing!: string[];

  @ApiProperty({
    description: 'Legacy interface types',
    example: ['Web', 'API'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  interface!: string[];

  @ApiProperty({
    description: 'Legacy functionality categories',
    example: ['Text Generation', 'Translation'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  functionality!: string[];

  @ApiProperty({
    description: 'Legacy deployment options',
    example: ['Cloud', 'On-premise'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  deployment!: string[];

  // Metadata
  @ApiPropertyOptional({
    description: 'Tool logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Main website URL',
    example: 'https://chat.openai.com',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Website URL must be a valid URL' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Documentation URL',
    example: 'https://platform.openai.com/docs',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Documentation URL must be a valid URL' })
  documentation?: string;

  @ApiPropertyOptional({
    description: 'Tool status',
    example: 'active',
    enum: ['active', 'beta', 'deprecated', 'discontinued'],
  })
  @IsOptional()
  @IsEnum(['active', 'beta', 'deprecated', 'discontinued'])
  status?: 'active' | 'beta' | 'deprecated' | 'discontinued';

  static getExampleTool(): CreateToolDto {
    return {
      id: 'chatgpt',
      name: 'ChatGPT',
      slug: 'chatgpt',
      description:
        'AI-powered conversational assistant for natural language interactions',
      longDescription:
        'ChatGPT is an advanced language model developed by OpenAI that can engage in natural conversations, answer questions, help with writing, coding, and many other tasks. It uses state-of-the-art transformer architecture to understand context and provide relevant, helpful responses.',
      tagline: 'Your AI conversation partner',
      categories: {
        primary: ['AI', 'Chatbot'],
        secondary: ['Productivity'],
        industries: ['Technology', 'Education', 'Content Creation'],
        userTypes: ['Developers', 'Students', 'Content Creators'],
      },
      pricingSummary: {
        lowestMonthlyPrice: 0,
        highestMonthlyPrice: 20,
        currency: 'USD',
        hasFreeTier: true,
        hasCustomPricing: false,
        billingPeriods: ['month'],
        pricingModel: ['freemium', 'subscription'],
      },
      pricingDetails: [
        {
          id: 'free',
          name: 'Free Plan',
          price: 0,
          billing: 'month',
          features: ['Basic AI responses', 'Limited daily usage'],
          limitations: ['Rate limited', 'Lower priority access'],
          sortOrder: 1,
        },
        {
          id: 'plus',
          name: 'ChatGPT Plus',
          price: 20,
          billing: 'month',
          features: [
            'Priority access',
            'Faster responses',
            'Latest model access',
          ],
          isPopular: true,
          sortOrder: 2,
        },
      ],
      pricingUrl: 'https://openai.com/pricing',
      capabilities: {
        core: [
          'Natural Language Processing',
          'Text Generation',
          'Question Answering',
        ],
        aiFeatures: {
          codeGeneration: true,
          imageGeneration: false,
          dataAnalysis: true,
          voiceInteraction: false,
          multimodal: true,
          thinkingMode: false,
        },
        technical: {
          apiAccess: true,
          webHooks: false,
          sdkAvailable: true,
          offlineMode: false,
        },
        integrations: {
          platforms: ['Web', 'API'],
          thirdParty: ['Microsoft Office', 'Google Workspace'],
          protocols: ['REST', 'WebSocket'],
        },
      },
      useCases: [
        {
          name: 'Content Creation',
          description:
            'Create blog posts, articles, and marketing content with AI assistance',
          industries: ['Marketing', 'Publishing', 'E-commerce'],
          userTypes: ['Content Creators', 'Marketers', 'Writers'],
          scenarios: [
            'Blog writing',
            'Social media posts',
            'Product descriptions',
          ],
          complexity: 'beginner',
        },
        {
          name: 'Code Assistance',
          description:
            'Get help with programming tasks, debugging, and code optimization',
          industries: ['Technology', 'Software Development'],
          userTypes: ['Developers', 'Engineers', 'Students'],
          scenarios: ['Code review', 'Bug fixing', 'Learning new languages'],
          complexity: 'intermediate',
        },
      ],
      searchKeywords: [
        'AI',
        'chatbot',
        'language model',
        'OpenAI',
        'conversation',
        'assistant',
      ],
      semanticTags: [
        'natural language processing',
        'machine learning',
        'conversational AI',
        'text generation',
        'artificial intelligence',
      ],
      aliases: ['OpenAI ChatGPT', 'GPT-4', 'Chat GPT'],
      pricing: ['Free', 'Paid'],
      interface: ['Web', 'API'],
      functionality: ['Text Generation', 'Conversation', 'Code Assistance'],
      deployment: ['Cloud'],
      logoUrl: 'https://example.com/chatgpt-logo.png',
      website: 'https://chat.openai.com',
      documentation: 'https://platform.openai.com/docs',
      status: 'active',
    };
  }
}
