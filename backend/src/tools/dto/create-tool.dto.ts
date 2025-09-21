import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  Length,
  IsUrl,
  IsObject,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateToolDto {
  @ApiProperty({
    description: 'Tool name',
    example: 'ChatGPT',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100, {
    message: 'Tool name must be between 1 and 100 characters',
  })
  name!: string;

  @ApiProperty({
    description: 'Brief tool description',
    example: 'AI-powered conversational assistant',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 500, {
    message: 'Description must be between 1 and 500 characters',
  })
  description!: string;

  @ApiPropertyOptional({
    description: 'Detailed tool description',
    example:
      'ChatGPT is an advanced language model developed by OpenAI that can engage in natural conversations...',
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000, {
    message: 'Long description must not exceed 2000 characters',
  })
  longDescription?: string;

  @ApiProperty({
    description: 'Pricing models',
    example: ['Free', 'Paid'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Length(1, 50, {
    each: true,
    message: 'Each pricing model must be between 1 and 50 characters',
  })
  pricing!: string[];

  @ApiProperty({
    description: 'Interface types',
    example: ['Web', 'API'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Length(1, 50, {
    each: true,
    message: 'Each interface type must be between 1 and 50 characters',
  })
  interface!: string[];

  @ApiProperty({
    description: 'Functionality categories',
    example: ['Text Generation', 'Translation'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Length(1, 100, {
    each: true,
    message: 'Each functionality must be between 1 and 100 characters',
  })
  functionality!: string[];

  @ApiProperty({
    description: 'Deployment options',
    example: ['Cloud', 'On-premise'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Length(1, 50, {
    each: true,
    message: 'Each deployment option must be between 1 and 50 characters',
  })
  deployment!: string[];

  @ApiPropertyOptional({
    description: 'Tool logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Tool features as key-value pairs',
    example: {
      multiLanguage: true,
      apiAccess: false,
      freeVersion: true,
    },
  })
  @IsOptional()
  @IsObject()
  features?: Record<string, any>;

  @ApiProperty({
    description: 'Search keywords for discoverability',
    example: ['AI', 'chatbot', 'language model'],
  })
  @IsArray()
  @ArrayNotEmpty({
    message: 'Search keywords must contain at least one keyword',
  })
  @IsString({
    each: true,
    message: 'Each search keyword must be between 1 and 256 characters',
  })
  @Length(1, 256, { each: true })
  searchKeywords!: string[];

  @ApiProperty({
    description: 'Tool tags for categorization',
    example: { primary: ['AI', 'Chatbot'], secondary: ['Productivity'] },
  })
  tags: any;

  static getExampleTool(): CreateToolDto {
    return {
      name: 'ChatGPT',
      description: 'AI-powered conversational assistant',
      longDescription:
        'ChatGPT is an advanced language model developed by OpenAI that can engage in natural conversations, answer questions, help with writing, coding, and many other tasks.',
      pricing: ['Free', 'Paid'],
      interface: ['Web', 'API'],
      functionality: ['Text Generation', 'Conversation'],
      deployment: ['Cloud'],
      logoUrl: 'https://example.com/chatgpt-logo.png',
      features: {
        multiLanguage: true,
        apiAccess: true,
        freeVersion: true,
      },
      searchKeywords: ['AI', 'chatbot', 'language model', 'OpenAI'],
      tags: {
        primary: ['AI', 'Chatbot'],
        secondary: ['Productivity', 'Communication'],
      },
    };
  }
}
