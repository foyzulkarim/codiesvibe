# Tools Data Structure v2.0 Quick Start Guide

## 1. Overview

This quick start guide provides step-by-step instructions for implementing the enhanced tools-v2.0 data structure. It covers prerequisites, setup procedures, testing, and common troubleshooting scenarios.

### 2. Schema Implementation

#### 2.1 Create TypeScript Interfaces

Create `src/types/tool.ts`:
```typescript
export interface Tool {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  tagline?: string;
  categories: Categories;
  pricingSummary: PricingSummary;
  pricingDetails: PricingDetails[];
  pricingUrl?: string;
  capabilities: Capabilities;
  useCases: UseCase[];
  searchKeywords: string[];
  semanticTags: string[];
  aliases: string[];
  logoUrl?: string;
  website?: string;
  documentation?: string;
  status: ToolStatus;
  contributor: string;
  dateAdded: string;
  lastUpdated: string;
}

export interface Categories {
  primary: string[];
  secondary?: string[];
  industries: string[];
  userTypes: string[];
}

// Add other interfaces as needed...
```

#### 2.2 Create JSON Schema Validation
Create `src/schemas/tool.schema.ts`:
```typescript
import Joi from 'joi';

export const toolSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).required(),
  description: Joi.string().min(10).max(200).required(),
  longDescription: Joi.string().min(50).max(2000).required(),
  tagline: Joi.string().max(100).optional(),
  
  categories: Joi.object({
    primary: Joi.array().items(Joi.string()).min(1).max(5).required(),
    secondary: Joi.array().items(Joi.string()).max(5).optional(),
    industries: Joi.array().items(Joi.string()).min(1).max(10).required(),
    userTypes: Joi.array().items(Joi.string()).min(1).max(10).required(),
  }).required(),
  
  pricingSummary: Joi.object({
    pricingModel: Joi.array().items(Joi.string().valid('free', 'freemium', 'subscription', 'one-time', 'usage-based', 'token-based')).min(1).required(),
    hasFreeTier: Joi.boolean().required(),
    startingPrice: Joi.string().optional(),
  }).required(),
  
  pricingDetails: Joi.array().items(Joi.object({
    tier: Joi.string().required(),
    price: Joi.string().required(),
    features: Joi.array().items(Joi.string()).required(),
  })).required(),
  
  pricingUrl: Joi.string().uri().optional(),
  
  capabilities: Joi.object({
    aiFeatures: Joi.object().pattern(Joi.string(), Joi.any()).required(),
    technical: Joi.object().pattern(Joi.string(), Joi.any()).required(),
    integrations: Joi.object().pattern(Joi.string(), Joi.any()).required(),
  }).required(),
  
  useCases: Joi.array().items(Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
  })).required(),
  
  searchKeywords: Joi.array().items(Joi.string()).required(),
  semanticTags: Joi.array().items(Joi.string()).required(),
  aliases: Joi.array().items(Joi.string()).required(),
  
  logoUrl: Joi.string().uri().optional(),
  website: Joi.string().uri().optional(),
  documentation: Joi.string().uri().optional(),
  status: Joi.string().valid('active', 'deprecated', 'beta').required(),
  contributor: Joi.string().required(),
  dateAdded: Joi.string().isoDate().required(),
  lastUpdated: Joi.string().isoDate().required(),
});

export const validateTool = (tool: any) => {
  return toolSchema.validate(tool);
};
```

#### 2.3 Create Mongoose Model
Create `src/models/Tool.ts`:
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface ITool extends Document {
  // Interface fields matching Tool interface
}

const toolSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  longDescription: { type: String, required: true },
  tagline: { type: String },
  
  categories: {
    primary: [{ type: String, required: true }],
    secondary: [{ type: String }],
    industries: [{ type: String, required: true }],
    userTypes: [{ type: String, required: true }],
  },
  
  pricingSummary: {
    pricingModel: [{ type: String, enum: ['free', 'freemium', 'subscription', 'one-time', 'usage-based', 'token-based'], required: true }],
    hasFreeTier: { type: Boolean, required: true },
    startingPrice: { type: String },
  },
  
  pricingDetails: [{
    tier: { type: String, required: true },
    price: { type: String, required: true },
    features: [{ type: String, required: true }],
  }],
  
  pricingUrl: { type: String },
  
  capabilities: {
    aiFeatures: { type: Schema.Types.Mixed, required: true },
    technical: { type: Schema.Types.Mixed, required: true },
    integrations: { type: Schema.Types.Mixed, required: true },
  },
  
  useCases: [{
    title: { type: String, required: true },
    description: { type: String, required: true },
  }],
  
  searchKeywords: [{ type: String, required: true }],
  semanticTags: [{ type: String, required: true }],
  aliases: [{ type: String, required: true }],
  
  logoUrl: { type: String },
  website: { type: String },
  documentation: { type: String },
  status: { type: String, enum: ['active', 'deprecated', 'beta'], required: true },
  contributor: { type: String, required: true },
}, {
  timestamps: { createdAt: 'dateAdded', updatedAt: 'lastUpdated' }
});

// Create indexes for performance
toolSchema.index({ 'categories.primary': 1 });
toolSchema.index({ 'categories.industries': 1 });
toolSchema.index({ 'pricingSummary.hasFreeTier': 1 });
toolSchema.index({ 'searchKeywords': 'text' });
toolSchema.index({ 'semanticTags': 'text' });
toolSchema.index({ 'aliases': 'text' });
toolSchema.index({ 'description': 'text' });
toolSchema.index({ 'longDescription': 'text' });

export const Tool = mongoose.model<ITool>('Tool', toolSchema);
```


### 4. API Update

#### 4.1 Update Tool Service

Update `src/services/tool.service.ts`:


#### 4.2 Update Tool Controller
Update `src/controllers/tool.controller.ts`:


#### 4.3 Update API Routes

### 5. Update Testing

#### 5.1 Update Unit Tests
Update `tests/unit/tool.service.test.ts`:

#### 5.3 Run Tests
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage
```
