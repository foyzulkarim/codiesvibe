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

export class PricingDto implements Pricing {
  @ApiProperty({
    description: 'Pricing tier',
    example: 'Free',
  })
  @IsString()
  @IsNotEmpty()
  tier!: string;

  @ApiProperty({
    description: 'Price amount',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({
    description: 'Billing period',
    example: 'Monthly',
  })
  @IsString()
  @IsNotEmpty()
  billingPeriod!: string;
}
