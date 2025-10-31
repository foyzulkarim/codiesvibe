import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

import type { Pricing } from '../../../shared/types/tool.types';
import { ApiProperty } from '@nestjs/swagger';

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
