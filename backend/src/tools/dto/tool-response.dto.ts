import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Tool } from '../schemas/tool.schema';
import { Document } from 'mongoose';
import { BaseTool } from '../../../../shared/types/tool.types';

class ResponseTagsDto {
  @ApiProperty({ 
    description: 'Primary category tags',
    type: [String],
    example: ['AI', 'Chatbot']
  })
  primary!: string[];

  @ApiProperty({ 
    description: 'Secondary category tags',
    type: [String],
    example: ['Productivity', 'Communication', 'Language']
  })
  secondary!: string[];
}

export class ToolResponseDto implements BaseTool {
  @ApiProperty({ 
    description: 'Tool unique identifier',
    example: '507f1f77bcf86cd799439011'
  })
  id!: string;

  @ApiProperty({ 
    description: 'Tool name',
    example: 'ChatGPT'
  })
  name!: string;

  @ApiProperty({ 
    description: 'Tool description',
    example: 'Advanced AI chatbot for natural conversations'
  })
  description!: string;

  @ApiPropertyOptional({ 
    description: 'Detailed tool description',
    example: 'ChatGPT is an advanced language model developed by OpenAI that can engage in natural conversations, answer questions, help with writing, coding, and many other tasks.'
  })
  longDescription?: string;

  @ApiProperty({ 
    description: 'Pricing models',
    type: [String],
    example: ['Free', 'Paid', 'API']
  })
  pricing!: string[];

  @ApiProperty({ 
    description: 'Interface types',
    type: [String],
    example: ['Web', 'API', 'Mobile']
  })
  interface!: string[];

  @ApiProperty({ 
    description: 'Functionality categories',
    type: [String],
    example: ['Text Generation', 'Translation', 'Code Generation']
  })
  functionality!: string[];

  @ApiProperty({ 
    description: 'Deployment options',
    type: [String],
    example: ['Cloud', 'On-premise']
  })
  deployment!: string[];

  @ApiProperty({ 
    description: 'Popularity score',
    example: 85000,
    minimum: 0,
    maximum: 1000000
  })
  popularity!: number;

  @ApiProperty({ 
    description: 'User rating',
    example: 4.5,
    minimum: 0,
    maximum: 5
  })
  rating!: number;

  @ApiProperty({ 
    description: 'Number of reviews',
    example: 1250,
    minimum: 0,
    maximum: 1000000
  })
  reviewCount!: number;

  @ApiProperty({ 
    description: 'Last metadata update timestamp',
    example: '2024-01-15T10:30:00.000Z'
  })
  lastUpdated!: string;

  @ApiProperty({ 
    description: 'Tool logo image URL',
    example: 'https://example.com/chatgpt-logo.png'
  })
  logoUrl!: string;

  @ApiProperty({ 
    description: 'Feature flags with boolean values',
    type: 'object',
    additionalProperties: { type: 'boolean' },
    example: {
      apiAccess: true,
      freeTier: true,
      multiLanguage: true,
      codeExecution: false
    }
  })
  features!: Record<string, boolean>;

  @ApiProperty({ 
    description: 'Search keywords for improved discoverability',
    type: [String],
    example: ['chatbot', 'AI assistant', 'natural language', 'conversation']
  })
  searchKeywords!: string[];

  @ApiProperty({ 
    description: 'Categorization tags with primary and secondary arrays',
    type: ResponseTagsDto,
    example: {
      primary: ['AI', 'Chatbot'],
      secondary: ['Productivity', 'Communication', 'Language']
    }
  })
  tags!: ResponseTagsDto;

  @ApiProperty({ 
    description: 'User who created the tool',
    example: '507f1f77bcf86cd799439012'
  })
  createdBy!: string;

  @ApiProperty({ 
    description: 'Creation timestamp',
    example: '2024-01-10T08:15:30.000Z'
  })
  createdAt!: string;

  @ApiProperty({ 
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z'
  })
  updatedAt!: string;

  /**
   * Transform a Mongoose Tool document to ToolResponseDto
   */
  static fromDocument(doc: any): ToolResponseDto {
    return {
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      longDescription: doc.longDescription || undefined,
      pricing: doc.pricing || [],
      interface: doc.interface || [],
      functionality: doc.functionality || [],
      deployment: doc.deployment || [],
      popularity: doc.popularity || 0,
      rating: doc.rating || 0,
      reviewCount: doc.reviewCount || 0,
      lastUpdated: doc.lastUpdated?.toISOString() || doc.updatedAt?.toISOString() || new Date().toISOString(),
      logoUrl: doc.logoUrl,
      features: doc.features || {},
      searchKeywords: doc.searchKeywords || [],
      tags: {
        primary: doc.tags?.primary || [],
        secondary: doc.tags?.secondary || []
      },
      createdBy: doc.createdBy.toString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }
}