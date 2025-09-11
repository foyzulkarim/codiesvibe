import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateToolDto {
  @ApiProperty({ 
    description: 'Tool name',
    minLength: 1,
    maxLength: 100,
    example: 'My First Tool'
  })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ 
    description: 'Tool description',
    minLength: 1,
    maxLength: 500,
    example: 'A test tool for validation'
  })
  @IsString()
  @Length(1, 500)
  description!: string;
}