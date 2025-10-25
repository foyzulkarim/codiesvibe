import {
  IsString,
  IsOptional,
  IsNumber,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AiSearchDto {
  @ApiProperty({
    description: 'Search query for AI tools',
    example: 'AI assistant for coding',
  })
  @IsString()
  query!: string;

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Max(50)
  limit?: number;

  @ApiProperty({
    description: 'Enable debug mode for additional information',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  debug?: boolean;
}
