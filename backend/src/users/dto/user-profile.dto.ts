import { IsString, IsEmail, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'GitHub username' })
  @IsString()
  username!: string;

  @ApiProperty({ description: 'User email', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  displayName!: string;

  @ApiProperty({ description: 'Avatar URL' })
  @IsUrl()
  avatarUrl!: string;
}