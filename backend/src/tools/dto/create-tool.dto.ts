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
import { PricingModelEnum } from '../../../shared/types/tool.types';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    example: ['freemium', 'paid'],
    enum: ['free', 'freemium', 'paid'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(['free', 'freemium', 'paid'], { each: true })
  pricingModel!: PricingModelEnum[];
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

  // Flattened categorization (v2.0)
  @ApiProperty({
    description: 'Tool categories (1-5 entries)',
    example: ['AI', 'Chatbot', 'Productivity'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  categories!: string[];

  @ApiProperty({
    description: 'Target industries (1-10 entries)',
    example: ['Technology', 'Education', 'Business'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  industries!: string[];

  @ApiProperty({
    description: 'Target user types (1-10 entries)',
    example: ['Developers', 'Analysts', 'Content Creators'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  userTypes!: string[];

  // Pricing (simplified)
  @ApiProperty({ description: 'Pricing summary information' })
  @ValidateNested()
  @Type(() => PricingSummaryDto)
  pricingSummary!: PricingSummaryDto;

  @ApiPropertyOptional({
    description: 'URL to pricing page',
    example: 'https://openai.com/pricing',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Pricing URL must be a valid URL' })
  pricingUrl?: string;

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

  // Enhanced entity relationships (v2.0)
  @ApiProperty({
    description: 'Tool types for classification (1-10 entries)',
    example: ['AI Tool', 'SaaS Platform', 'API Service'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  toolTypes!: string[];

  @ApiProperty({
    description: 'Domains the tool operates in (1-15 entries)',
    example: ['Software Development', 'Data Science', 'Machine Learning'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  domains!: string[];

  @ApiProperty({
    description: 'Tool capabilities (1-20 entries)',
    example: ['Text Generation', 'Code Completion', 'Data Analysis'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  capabilities!: string[];

  // Search optimization fields (v2.0)
  @ApiPropertyOptional({
    description: 'Alternative names or aliases (max 10 entries)',
    example: ['GPT', 'Chat AI', 'OpenAI Chat'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  aliases?: string[];

  @ApiPropertyOptional({
    description: 'Search synonyms (max 15 entries)',
    example: ['AI Assistant', 'Conversational AI', 'Language Model'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  synonyms?: string[];

  // Context relationships (v2.0)
  @ApiPropertyOptional({
    description: 'Similar tools by tool ID (max 10 entries)',
    example: ['claude', 'bard', 'gemini'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  similarTo?: string[];

  @ApiPropertyOptional({
    description: 'Tools this is an alternative for by tool ID (max 10 entries)',
    example: ['copilot', 'code-assistant'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  alternativesFor?: string[];

  @ApiPropertyOptional({
    description: 'Tools this works with by tool ID (max 15 entries)',
    example: ['github', 'vscode', 'slack'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  worksWith?: string[];

  // Usage patterns (v2.0)
  @ApiProperty({
    description: 'Common use cases (1-15 entries)',
    example: ['Content Creation', 'Customer Support', 'Code Generation'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  commonUseCases!: string[];

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
      categories: ['AI', 'Chatbot', 'Productivity'],
      industries: ['Technology', 'Education', 'Business'],
      userTypes: ['Developers', 'Students', 'Content Creators'],
      pricingSummary: {
        lowestMonthlyPrice: 0,
        highestMonthlyPrice: 20,
        currency: 'USD',
        hasFreeTier: true,
        hasCustomPricing: false,
        billingPeriods: ['month'],
        pricingModel: ['freemium', 'paid'],
      },
      pricingUrl: 'https://openai.com/pricing',
      interface: ['Web', 'API'],
      functionality: ['Text Generation', 'Conversation', 'Code Assistance'],
      deployment: ['Cloud'],
      logoUrl: 'https://example.com/chatgpt-logo.png',
      website: 'https://chat.openai.com',
      documentation: 'https://platform.openai.com/docs',
      status: 'active',
      // Enhanced v2.0 fields
      toolTypes: ['AI Tool', 'SaaS Platform', 'API Service'],
      domains: ['Software Development', 'Data Science', 'Machine Learning'],
      capabilities: ['Text Generation', 'Code Completion', 'Data Analysis'],
      aliases: ['GPT', 'Chat AI', 'OpenAI Chat'],
      synonyms: ['AI Assistant', 'Conversational AI', 'Language Model'],
      similarTo: ['claude', 'bard', 'gemini'],
      alternativesFor: ['copilot', 'code-assistant'],
      worksWith: ['github', 'vscode', 'slack'],
      commonUseCases: [
        'Content Creation',
        'Customer Support',
        'Code Generation',
      ],
    };
  }
}
