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

import type {
  PricingModelEnum,
  Pricing,
} from '../../../shared/types/tool.types';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingDto } from './pricing.dto';

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
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  categories!: string[];

  @ApiProperty({
    description: 'Target industries (1-10 entries)',
    example: ['Technology', 'Education', 'Business'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  industries!: string[];

  @ApiProperty({
    description: 'Target user types (1-10 entries)',
    example: ['Developers', 'Analysts', 'Content Creators'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  userTypes!: string[];

  // Pricing (simplified)
  @ApiProperty({
    description: 'Pricing summary information',
    type: [PricingDto],
    example: [
      {
        tier: 'Free',
        price: 0,
        billingPeriod: 'Monthly',
      },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => PricingDto)
  @IsArray()
  @ArrayNotEmpty()
  pricing!: PricingDto[];

  @ApiProperty({
    description: 'Pricing models',
    example: 'Free',
    enum: ['Free', 'Freemium', 'Paid'],
  })
  @IsEnum(['Free', 'Freemium', 'Paid'], {
    message: 'pricingModel must be one of: Free, Freemium, Paid',
  })
  @IsNotEmpty()
  pricingModel!: PricingModelEnum;

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
      pricing: [
        {
          tier: 'Free',
          price: 0,
          billingPeriod: 'month',
        },
      ],
      pricingModel: 'Freemium',
      pricingUrl: 'https://openai.com/pricing',
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
