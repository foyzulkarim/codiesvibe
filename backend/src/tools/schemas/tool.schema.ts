import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import type { PricingModelEnum } from '../../../shared/types/tool.types';
import { CONTROLLED_VOCABULARIES } from '../../shared/constants/controlled-vocabularies';

export type ToolDocument = Tool & Document;

@Schema({ timestamps: true })
export class Tool {
  // Identity fields
  @Prop({
    required: true,
    unique: true,
    minlength: 1,
    maxlength: 100,
    trim: true,
    match: /^[a-z0-9-]+$/,
  })
  id!: string;

  @Prop({
    required: true,
    minlength: 1,
    maxlength: 100,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    minlength: 1,
    maxlength: 100,
    trim: true,
    match: /^[a-z0-9-]+$/,
  })
  slug!: string;

  @Prop({
    required: true,
    minlength: 10,
    maxlength: 200,
    trim: true,
  })
  description!: string;

  @Prop({
    minlength: 50,
    maxlength: 2000,
    trim: true,
  })
  longDescription?: string;

  @Prop({
    maxlength: 100,
    trim: true,
  })
  tagline?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    immutable: true,
  })
  createdBy!: Types.ObjectId;

  // Flattened categorization (v2.0)
  @Prop({
    type: [String],
    enum: CONTROLLED_VOCABULARIES.categories,
    required: true,
    validate: {
      validator: (v: string[]) => {
        return (
          Array.isArray(v) &&
          v.length >= 1 &&
          v.length <= 5 &&
          v.every((category) =>
            CONTROLLED_VOCABULARIES.categories.includes(category),
          )
        );
      },
      message: 'categories must have 1-5 entries',
    },
  })
  categories!: string[];

  @Prop({
    type: [String],
    enum: CONTROLLED_VOCABULARIES.industries,
    required: true,
    validate: {
      validator: (v: string[]) =>
        Array.isArray(v) && v.length >= 1 && v.length <= 10,
      message: 'industries must have 1-10 entries',
    },
  })
  industries!: string[];

  @Prop({
    type: [String],
    enum: CONTROLLED_VOCABULARIES.userTypes,
    required: true,
    validate: {
      validator: (v: string[]) =>
        Array.isArray(v) && v.length >= 1 && v.length <= 10,
      message: 'userTypes must have 1-10 entries',
    },
  })
  userTypes!: string[];

  // Pricing
  @Prop({
    type: [
      {
        tier: {
          type: String,
          required: true,
        },
        billingPeriod: {
          type: String,
          enum: CONTROLLED_VOCABULARIES.billingPeriods,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
  })
  pricing!: {
    tier: string;
    billingPeriod: string;
    price: number;
  }[];

  @Prop({
    type: String,
    required: true,
    enum: CONTROLLED_VOCABULARIES.pricingModels,
    validate: {
      validator: (v: string) => {
        if (!v) return false;
        const validModels: PricingModelEnum[] =
          CONTROLLED_VOCABULARIES.pricingModels as PricingModelEnum[];
        return validModels.includes(v as PricingModelEnum);
      },
      message: `pricingModel must be one of: ${CONTROLLED_VOCABULARIES.pricingModels.join(', ')}`,
    },
  })
  pricingModel!: PricingModelEnum;

  @Prop({
    validate: {
      validator: (v: string) => !v || /^https?:\/\/.+/.test(v),
      message: 'pricingUrl must be a valid URL',
    },
  })
  pricingUrl?: string;

  @Prop({
    type: [String],
    enum: CONTROLLED_VOCABULARIES.interface,
    required: true,
    validate: {
      validator: (v: string[]) =>
        Array.isArray(v) &&
        v.length > 0 &&
        v.every((item) => CONTROLLED_VOCABULARIES.interface.includes(item)),
      message: 'interface must be a non-empty array',
    },
  })
  interface!: string[];

  @Prop({
    type: [String],
    enum: CONTROLLED_VOCABULARIES.functionality,
    required: true,
    validate: {
      validator: (v: string[]) =>
        Array.isArray(v) &&
        v.length > 0 &&
        v.every((item) => CONTROLLED_VOCABULARIES.functionality.includes(item)),
      message: 'functionality must be a non-empty array',
    },
  })
  functionality!: string[];

  @Prop({
    type: [String],
    enum: CONTROLLED_VOCABULARIES.deployment,
    required: true,
    validate: {
      validator: (v: string[]) =>
        Array.isArray(v) &&
        v.length > 0 &&
        v.every((item) => CONTROLLED_VOCABULARIES.deployment.includes(item)),
      message: 'deployment must be a non-empty array',
    },
  })
  deployment!: string[];

  // Metadata
  @Prop({
    validate: {
      validator: (v: string) => {
        if (!v) return true;
        const urlPattern = /^https?:\/\/.+/;
        return urlPattern.test(v);
      },
      message: 'logoUrl must be a valid URL starting with http:// or https://',
    },
  })
  logoUrl?: string;

  @Prop({
    validate: {
      validator: (v: string) => {
        if (!v) return true;
        const urlPattern = /^https?:\/\/.+/;
        return urlPattern.test(v);
      },
      message: 'website must be a valid URL starting with http:// or https://',
    },
  })
  website?: string;

  @Prop({
    validate: {
      validator: (v: string) => {
        if (!v) return true;
        const urlPattern = /^https?:\/\/.+/;
        return urlPattern.test(v);
      },
      message:
        'documentation must be a valid URL starting with http:// or https://',
    },
  })
  documentation?: string;

  @Prop({
    type: String,
    required: true,
    enum: ['active', 'beta', 'deprecated', 'discontinued'],
    default: 'active',
  })
  status!: 'active' | 'beta' | 'deprecated' | 'discontinued';

  @Prop({
    type: String,
    required: true,
    default: 'system',
  })
  contributor!: string;

  @Prop({
    type: Date,
    required: true,
    default: Date.now,
  })
  dateAdded!: Date;

  @Prop({
    type: Date,
    default: Date.now,
  })
  lastUpdated?: Date;
}

export const ToolSchema = SchemaFactory.createForClass(Tool);

// Pre-save middleware for data transformation and validation
ToolSchema.pre('save', function (next) {
  // Auto-generate slug from id if not provided
  if (!this.slug && this.id) {
    this.slug = this.id;
  }
  // Update lastUpdated timestamp
  this.lastUpdated = new Date();

  next();
});

// Primary indexes
ToolSchema.index({ id: 1 }, { unique: true, name: 'tool_id_index' });
ToolSchema.index({ slug: 1 }, { unique: true, name: 'tool_slug_index' });
ToolSchema.index({ status: 1 }, { name: 'tool_status_index' });
ToolSchema.index({ createdBy: 1 }, { name: 'tool_created_by_index' });

// Secondary indexes for v2.0 flattened categorization
ToolSchema.index({ categories: 1 }, { name: 'tool_categories_index' });
ToolSchema.index({ industries: 1 }, { name: 'tool_industries_index' });
ToolSchema.index({ userTypes: 1 }, { name: 'tool_user_types_index' });

// Full-text search indexes with simplified v2.0 fields
ToolSchema.index(
  {
    name: 'text',
    description: 'text',
    longDescription: 'text',
    tagline: 'text',
  },
  {
    name: 'tool_v2_search_index',
    weights: {
      name: 15,
      tagline: 12,
      description: 8,
    },
  },
);

ToolSchema.index({ dateAdded: -1 }, { name: 'tool_date_added_index' });

// Legacy indexes for backward compatibility
ToolSchema.index({ functionality: 1 }, { name: 'tool_functionality_index' });
ToolSchema.index({ deployment: 1 }, { name: 'tool_deployment_index' });
