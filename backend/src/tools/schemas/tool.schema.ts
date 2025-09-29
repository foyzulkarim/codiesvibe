import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PricingModelEnum } from '../../../shared/types/tool.types';

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

  // Categorization
  @Prop({
    type: {
      primary: {
        type: [String],
        required: true,
        validate: {
          validator: (v: string[]) =>
            Array.isArray(v) && v.length >= 1 && v.length <= 5,
          message: 'primary categories must have 1-5 entries',
        },
      },
      secondary: {
        type: [String],
        validate: {
          validator: (v: string[]) => !v || (Array.isArray(v) && v.length <= 5),
          message: 'secondary categories must have at most 5 entries',
        },
        default: [],
      },
      industries: {
        type: [String],
        required: true,
        validate: {
          validator: (v: string[]) =>
            Array.isArray(v) && v.length >= 1 && v.length <= 10,
          message: 'industries must have 1-10 entries',
        },
      },
      userTypes: {
        type: [String],
        required: true,
        validate: {
          validator: (v: string[]) =>
            Array.isArray(v) && v.length >= 1 && v.length <= 10,
          message: 'userTypes must have 1-10 entries',
        },
      },
    },
    required: true,
  })
  categories!: {
    primary: string[];
    secondary: string[];
    industries: string[];
    userTypes: string[];
  };

  // Pricing
  @Prop({
    type: {
      lowestMonthlyPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      highestMonthlyPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        required: true,
        match: /^[A-Z]{3}$/,
        default: 'USD',
      },
      hasFreeTier: {
        type: Boolean,
        required: true,
      },
      hasCustomPricing: {
        type: Boolean,
        required: true,
      },
      billingPeriods: {
        type: [String],
        required: true,
        validate: {
          validator: (v: string[]) =>
            Array.isArray(v) && v.length >= 1 && v.length <= 3,
          message: 'billingPeriods must have 1-3 entries',
        },
      },
      pricingModel: {
        type: [String],
        required: true,
        enum: ['free', 'freemium', 'paid'],
        validate: {
          validator: (v: string[]) => {
            if (!Array.isArray(v) || v.length === 0) return false;
            const validModels: PricingModelEnum[] = ['free', 'freemium', 'paid'];
            return v.every(model => validModels.includes(model as PricingModelEnum));
          },
          message: 'pricingModel must be a non-empty array containing only: free, freemium, paid',
        },
      },
    },
    required: true,
  })
  pricingSummary!: {
    lowestMonthlyPrice: number;
    highestMonthlyPrice: number;
    currency: string;
    hasFreeTier: boolean;
    hasCustomPricing: boolean;
    billingPeriods: string[];
    pricingModel: PricingModelEnum[];
  };

  @Prop({
    type: [
      {
        id: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        billing: {
          type: String,
          required: true,
        },
        features: {
          type: [String],
          required: true,
        },
        limitations: {
          type: [String],
        },
        maxUsers: {
          type: Number,
          min: 1,
        },
        isPopular: {
          type: Boolean,
          default: false,
        },
        sortOrder: {
          type: Number,
          required: true,
        },
      },
    ],
    required: true,
    validate: {
      validator: (v: any[]) =>
        Array.isArray(v) && v.length >= 1 && v.length <= 10,
      message: 'pricingDetails must have 1-10 entries',
    },
  })
  pricingDetails!: Array<{
    id: string;
    name: string;
    price: number;
    billing: string;
    features: string[];
    limitations?: string[];
    maxUsers?: number;
    isPopular?: boolean;
    sortOrder: number;
  }>;

  @Prop({
    validate: {
      validator: (v: string) => !v || /^https?:\/\/.+/.test(v),
      message: 'pricingUrl must be a valid URL',
    },
  })
  pricingUrl?: string;

  // Capabilities
  @Prop({
    type: {
      core: {
        type: [String],
        required: true,
        validate: {
          validator: (v: string[]) =>
            Array.isArray(v) && v.length >= 1 && v.length <= 10,
          message: 'core capabilities must have 1-10 entries',
        },
      },
      aiFeatures: {
        type: {
          codeGeneration: { type: Boolean, required: true },
          imageGeneration: { type: Boolean, required: true },
          dataAnalysis: { type: Boolean, required: true },
          voiceInteraction: { type: Boolean, required: true },
          multimodal: { type: Boolean, required: true },
          thinkingMode: { type: Boolean, required: true },
        },
        required: true,
      },
      technical: {
        type: {
          apiAccess: { type: Boolean, required: true },
          webHooks: { type: Boolean, required: true },
          sdkAvailable: { type: Boolean, required: true },
          offlineMode: { type: Boolean, required: true },
        },
        required: true,
      },
      integrations: {
        type: {
          platforms: {
            type: [String],
            required: true,
            validate: {
              validator: (v: string[]) => Array.isArray(v) && v.length > 0,
              message: 'platforms must have at least one entry',
            },
          },
          thirdParty: {
            type: [String],
            required: true,
            validate: {
              validator: (v: string[]) => Array.isArray(v) && v.length > 0,
              message: 'thirdParty must have at least one entry',
            },
          },
          protocols: {
            type: [String],
            required: true,
            validate: {
              validator: (v: string[]) => Array.isArray(v) && v.length > 0,
              message: 'protocols must have at least one entry',
            },
          },
        },
        required: true,
      },
    },
    required: true,
  })
  capabilities!: {
    core: string[];
    aiFeatures: {
      codeGeneration: boolean;
      imageGeneration: boolean;
      dataAnalysis: boolean;
      voiceInteraction: boolean;
      multimodal: boolean;
      thinkingMode: boolean;
    };
    technical: {
      apiAccess: boolean;
      webHooks: boolean;
      sdkAvailable: boolean;
      offlineMode: boolean;
    };
    integrations: {
      platforms: string[];
      thirdParty: string[];
      protocols: string[];
    };
  };

  // Use cases
  @Prop({
    type: [
      {
        name: {
          type: String,
          required: true,
          maxlength: 50,
        },
        description: {
          type: String,
          required: true,
          minlength: 10,
          maxlength: 500,
        },
        industries: {
          type: [String],
          required: true,
          validate: {
            validator: (v: string[]) =>
              Array.isArray(v) && v.length >= 1 && v.length <= 5,
            message: 'industries must have 1-5 entries',
          },
        },
        userTypes: {
          type: [String],
          required: true,
          validate: {
            validator: (v: string[]) =>
              Array.isArray(v) && v.length >= 1 && v.length <= 5,
            message: 'userTypes must have 1-5 entries',
          },
        },
        scenarios: {
          type: [String],
          required: true,
          validate: {
            validator: (v: string[]) =>
              Array.isArray(v) && v.length >= 1 && v.length <= 10,
            message: 'scenarios must have 1-10 entries',
          },
        },
        complexity: {
          type: String,
          required: true,
          enum: ['beginner', 'intermediate', 'advanced'],
        },
      },
    ],
    required: true,
  })
  useCases!: Array<{
    name: string;
    description: string;
    industries: string[];
    userTypes: string[];
    scenarios: string[];
    complexity: 'beginner' | 'intermediate' | 'advanced';
  }>;

  // Search optimization
  @Prop({
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) => {
        if (!Array.isArray(v) || v.length < 5 || v.length > 20) return false;
        return v.every(
          (keyword) => typeof keyword === 'string' && keyword.length <= 256,
        );
      },
      message:
        'searchKeywords must have 5-20 entries with strings max 256 chars each',
    },
  })
  searchKeywords!: string[];

  @Prop({
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) => {
        if (!Array.isArray(v) || v.length < 5 || v.length > 20) return false;
        return v.every((tag) => typeof tag === 'string' && tag.length <= 256);
      },
      message:
        'semanticTags must have 5-20 entries with strings max 256 chars each',
    },
  })
  semanticTags!: string[];

  @Prop({
    type: [String],
    required: true,
    default: [],
    validate: {
      validator: (v: string[]) => {
        if (!Array.isArray(v) || v.length > 10) return false;
        return v.every(
          (alias) => typeof alias === 'string' && alias.length <= 256,
        );
      },
      message:
        'aliases must have at most 10 entries with strings max 256 chars each',
    },
  })
  aliases!: string[];


  @Prop({
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) => Array.isArray(v) && v.length > 0,
      message: 'interface must be a non-empty array',
    },
  })
  interface!: string[];

  @Prop({
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) => Array.isArray(v) && v.length > 0,
      message: 'functionality must be a non-empty array',
    },
  })
  functionality!: string[];

  @Prop({
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) => Array.isArray(v) && v.length > 0,
      message: 'deployment must be a non-empty array',
    },
  })
  deployment!: string[];

  @Prop({
    type: Number,
    required: true,
    min: 0,
    max: 1000000,
    default: 0,
  })
  popularity!: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    max: 5,
    default: 0,
    validate: {
      validator: function (v: number) {
        // Rating should be 0 if reviewCount is 0, or between 0.1-5 if there are reviews
        const reviewCount = (this as any).reviewCount || 0;
        if (reviewCount === 0) {
          return v === 0;
        }
        return v >= 0.1 && v <= 5;
      },
      message:
        'Rating must be 0 when no reviews exist, or between 0.1-5 when reviews exist',
    },
  })
  rating!: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    max: 1000000,
    default: 0,
    validate: {
      validator: function (v: number) {
        // ReviewCount must be a non-negative integer
        return Number.isInteger(v) && v >= 0;
      },
      message: 'Review count must be a non-negative integer',
    },
  })
  reviewCount!: number;

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

  // Clamp numeric fields to bounds
  if (this.popularity < 0) this.popularity = 0;
  if (this.popularity > 1000000) this.popularity = 1000000;

  if (this.rating < 0) this.rating = 0;
  if (this.rating > 5) this.rating = 5;

  if (this.reviewCount < 0) this.reviewCount = 0;
  if (this.reviewCount > 1000000) this.reviewCount = 1000000;

  // Validate pricing summary consistency
  if (this.pricingSummary) {
    if (
      this.pricingSummary.lowestMonthlyPrice >
      this.pricingSummary.highestMonthlyPrice
    ) {
      this.pricingSummary.highestMonthlyPrice =
        this.pricingSummary.lowestMonthlyPrice;
    }
  }

  // Truncate search fields to max length
  if (Array.isArray(this.searchKeywords)) {
    this.searchKeywords = this.searchKeywords.map((keyword) =>
      typeof keyword === 'string'
        ? keyword.substring(0, 256)
        : String(keyword).substring(0, 256),
    );
  }

  if (Array.isArray(this.semanticTags)) {
    this.semanticTags = this.semanticTags.map((tag) =>
      typeof tag === 'string'
        ? tag.substring(0, 256)
        : String(tag).substring(0, 256),
    );
  }

  if (Array.isArray(this.aliases)) {
    this.aliases = this.aliases.map((alias) =>
      typeof alias === 'string'
        ? alias.substring(0, 256)
        : String(alias).substring(0, 256),
    );
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

// Secondary indexes for v2.0 categorization
ToolSchema.index(
  { 'categories.primary': 1 },
  { name: 'tool_categories_primary_index' },
);
ToolSchema.index(
  { 'categories.industries': 1 },
  { name: 'tool_categories_industries_index' },
);
ToolSchema.index(
  { 'categories.userTypes': 1 },
  { name: 'tool_categories_user_types_index' },
);

// Pricing indexes
ToolSchema.index(
  { 'pricingSummary.hasFreeTier': 1 },
  { name: 'tool_pricing_free_tier_index' },
);
ToolSchema.index(
  { 'pricingSummary.lowestMonthlyPrice': 1 },
  { name: 'tool_pricing_lowest_price_index' },
);

// Capabilities indexes
ToolSchema.index(
  { 'capabilities.aiFeatures.codeGeneration': 1 },
  { name: 'tool_capabilities_code_gen_index' },
);
ToolSchema.index(
  { 'capabilities.aiFeatures.imageGeneration': 1 },
  { name: 'tool_capabilities_image_gen_index' },
);

// Full-text search indexes with enhanced v2.0 fields
ToolSchema.index(
  {
    name: 'text',
    description: 'text',
    longDescription: 'text',
    tagline: 'text',
    searchKeywords: 'text',
    semanticTags: 'text',
    aliases: 'text',
  },
  {
    name: 'tool_v2_search_index',
    weights: {
      name: 15,
      tagline: 12,
      description: 8,
      searchKeywords: 10,
      semanticTags: 9,
      aliases: 6,
      longDescription: 3,
    },
  },
);

// Performance indexes for filtering and sorting
ToolSchema.index({ popularity: -1 }, { name: 'tool_popularity_index' });
ToolSchema.index({ rating: -1 }, { name: 'tool_rating_index' });
ToolSchema.index({ dateAdded: -1 }, { name: 'tool_date_added_index' });

// Legacy indexes for backward compatibility
ToolSchema.index({ functionality: 1 }, { name: 'tool_functionality_index' });
ToolSchema.index({ deployment: 1 }, { name: 'tool_deployment_index' });

// Compound indexes for common query patterns
ToolSchema.index(
  {
    status: 1,
    popularity: -1,
  },
  { name: 'tool_status_popularity_index' },
);

ToolSchema.index(
  {
    'categories.primary': 1,
    rating: -1,
  },
  { name: 'tool_category_rating_index' },
);

ToolSchema.index(
  {
    'pricingSummary.hasFreeTier': 1,
    popularity: -1,
  },
  { name: 'tool_free_tier_popularity_index' },
);
