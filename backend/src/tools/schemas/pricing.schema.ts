import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Pricing } from '../../../shared/types/tool.types';
import { CONTROLLED_VOCABULARIES } from '../../shared/constants/controlled-vocabularies';

@Schema({ _id: false })
export class ToolPricing implements Pricing {
  @Prop({ type: String, required: true })
  tier!: string;

  @Prop({
    type: String,
    enum: CONTROLLED_VOCABULARIES.billingPeriods,
    required: true,
    validate: {
      validator: (v: string) =>
        CONTROLLED_VOCABULARIES.billingPeriods.validate([v]),
      message: `billingPeriod must be one of: ${CONTROLLED_VOCABULARIES.billingPeriods.join(', ')}`,
    },
  })
  billingPeriod!: string;

  @Prop({ type: Number, required: true, min: 0 })
  price!: number;
}

export const ToolPricingSchema = SchemaFactory.createForClass(ToolPricing);
