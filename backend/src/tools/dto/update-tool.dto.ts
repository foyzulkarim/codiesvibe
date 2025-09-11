import { IsString, Length, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateToolDto {
  @ApiProperty({ 
    description: 'Tool name',
    minLength: 1,
    maxLength: 100,
    required: false
  })
  @IsString()
  @Length(1, 100)
  @IsOptional()
  name?: string;

  @ApiProperty({ 
    description: 'Tool description',
    minLength: 1,
    maxLength: 500,
    required: false
  })
  @IsString()
  @Length(1, 500)
  @IsOptional()
  description?: string;
}