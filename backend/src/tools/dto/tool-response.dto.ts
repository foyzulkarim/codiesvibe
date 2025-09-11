import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToolResponseDto {
  @ApiProperty({ description: 'Tool ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Tool name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Tool description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDateString()
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt!: string;
}