import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ToolDocument = Tool & Document;

@Schema({ timestamps: true })
export class Tool {
  @Prop({
    required: true,
    minlength: 1,
    maxlength: 100,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    minlength: 1,
    maxlength: 500,
    trim: true,
  })
  description!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    immutable: true,
  })
  createdBy!: Types.ObjectId;

  // Enhanced Fields (New - Optional with defaults)

  @Prop({
    maxlength: 2000,
    trim: true,
    default: null,
  })
  longDescription?: string;

  @Prop({
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) => Array.isArray(v) && v.length > 0,
      message: 'pricing must be a non-empty array',
    },
  })
  pricing!: string[];

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

  @Prop({
    type: Date,
    default: Date.now,
  })
  lastUpdated?: Date;

  @Prop({
    required: true,
    validate: {
      validator: (v: string) => {
        const urlPattern = /^https?:\/\/.+/;
        return urlPattern.test(v);
      },
      message: 'logoUrl must be a valid URL starting with http:// or https://',
    },
  })
  logoUrl!: string;

  @Prop({
    type: Object,
    required: true,
    default: () => ({}),
    validate: {
      validator: (v: Record<string, any>) => {
        if (typeof v !== 'object' || v === null) return false;
        return Object.values(v).every((val) => typeof val === 'boolean');
      },
      message: 'features must be an object with boolean values only',
    },
  })
  features!: Record<string, boolean>;

  @Prop({
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) => {
        if (!Array.isArray(v) || v.length === 0) return false;
        return v.every(
          (keyword) => typeof keyword === 'string' && keyword.length <= 256,
        );
      },
      message:
        'searchKeywords must be a non-empty array with strings max 256 chars each',
    },
  })
  searchKeywords!: string[];

  @Prop({
    type: {
      primary: {
        type: [String],
        required: true,
        default: [],
      },
      secondary: {
        type: [String],
        required: true,
        default: [],
      },
    },
    required: true,
    default: () => ({ primary: [], secondary: [] }),
    validate: {
      validator: function (v: { primary: string[]; secondary: string[] }) {
        if (!v || typeof v !== 'object') return false;
        const hasNonEmptyPrimary =
          Array.isArray(v.primary) && v.primary.length > 0;
        const hasNonEmptySecondary =
          Array.isArray(v.secondary) && v.secondary.length > 0;
        return hasNonEmptyPrimary || hasNonEmptySecondary; // At least one must be non-empty
      },
      message:
        'tags must have at least one non-empty array (primary or secondary)',
    },
  })
  tags!: {
    primary: string[];
    secondary: string[];
  };
}

export const ToolSchema = SchemaFactory.createForClass(Tool);

// Pre-save middleware for data transformation and validation
ToolSchema.pre('save', function (next) {
  // Clamp numeric fields to bounds
  if (this.popularity < 0) this.popularity = 0;
  if (this.popularity > 1000000) this.popularity = 1000000;

  if (this.rating < 0) this.rating = 0;
  if (this.rating > 5) this.rating = 5;

  if (this.reviewCount < 0) this.reviewCount = 0;
  if (this.reviewCount > 1000000) this.reviewCount = 1000000;

  // Ensure features object contains only boolean values
  if (this.features && typeof this.features === 'object') {
    for (const [key, value] of Object.entries(this.features)) {
      if (typeof value !== 'boolean') {
        // Convert to boolean using strict equality
        this.features[key] = Boolean(value);
      }
    }
  }

  // Truncate searchKeywords elements to 256 characters
  if (Array.isArray(this.searchKeywords)) {
    this.searchKeywords = this.searchKeywords.map((keyword) =>
      typeof keyword === 'string'
        ? keyword.substring(0, 256)
        : String(keyword).substring(0, 256),
    );
  }

  // Update lastUpdated timestamp
  this.lastUpdated = new Date();

  next();
});

// Create indexes as specified in data-model.md for enhanced search and performance
ToolSchema.index({ createdBy: 1 }); // User-specific queries
ToolSchema.index(
  {
    name: 'text',
    description: 'text',
    longDescription: 'text',
    searchKeywords: 'text',
  },
  {
    name: 'tool_enhanced_search_index',
    weights: {
      name: 15,
      description: 8,
      longDescription: 3,
      searchKeywords: 12,
    },
  },
); // Enhanced text search with optimized weights

// Performance indexes for filtering and sorting
ToolSchema.index({ popularity: -1 }, { name: 'tool_popularity_index' }); // Popular tools first
ToolSchema.index({ rating: -1 }, { name: 'tool_rating_index' }); // Top-rated tools first
ToolSchema.index({ functionality: 1 }, { name: 'tool_functionality_index' }); // Filter by functionality
ToolSchema.index({ deployment: 1 }, { name: 'tool_deployment_index' }); // Filter by deployment
ToolSchema.index({ 'tags.primary': 1 }, { name: 'tool_tags_primary_index' }); // Filter by primary tags
ToolSchema.index(
  { 'tags.secondary': 1 },
  { name: 'tool_tags_secondary_index' },
); // Filter by secondary tags

// Compound indexes for common query patterns
ToolSchema.index(
  {
    functionality: 1,
    rating: -1,
  },
  { name: 'tool_functionality_rating_index' },
); // Functionality with rating

ToolSchema.index(
  {
    deployment: 1,
    popularity: -1,
  },
  { name: 'tool_deployment_popularity_index' },
); // Deployment with popularity
