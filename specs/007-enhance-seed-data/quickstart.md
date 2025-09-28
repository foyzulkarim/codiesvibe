# Tools Data Structure v2.0 Quick Start Guide

## Overview

This quick start guide provides step-by-step instructions for implementing the enhanced tools-v2.0 data structure. It covers prerequisites, setup procedures, testing, and common troubleshooting scenarios.

## Prerequisites

### System Requirements

#### Development Environment
- **Node.js**: Version 18.x or higher
- **TypeScript**: Version 5.x or higher
- **MongoDB**: Version 6.x or higher
- **Elasticsearch**: Version 8.x or higher (for advanced search)

#### Hardware Requirements
- **RAM**: Minimum 8GB, recommended 16GB
- **Storage**: Minimum 50GB free space
- **CPU**: Multi-core processor recommended

#### Software Dependencies
```bash
# Core dependencies
npm install typescript @types/node mongoose

# Development tools
npm install -D jest @types/jest ts-node nodemon

# Search and validation
npm install joi elasticsearch @elastic/elasticsearch

# Data processing
npm install lodash date-fns
```

### Knowledge Requirements

#### Technical Skills
- **TypeScript**: Intermediate to advanced proficiency
- **MongoDB**: Understanding of document databases and Mongoose ODM
- **JSON Schema**: Familiarity with schema validation
- **REST APIs**: Knowledge of API design and implementation

#### Domain Knowledge
- **Tool Directory Systems**: Understanding of software categorization
- **RAG Systems**: Basic knowledge of Retrieval-Augmented Generation
- **Search Technologies**: Familiarity with full-text search and filtering
- **Data Modeling**: Experience with hierarchical data structures

## Setup Instructions

### 1. Environment Setup

#### 1.1 Clone and Initialize
```bash
# Clone the repository
git clone <repository-url>
cd tools-v2.0-implementation

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
```

#### 1.2 Configure Environment Variables
```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/tools_v2
MONGODB_TEST_URI=mongodb://localhost:27017/tools_v2_test

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=tools_v2

# Application Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Security Configuration
JWT_SECRET=your-jwt-secret-here
API_KEY=your-api-key-here
```

#### 1.3 Start Development Services
```bash
# Start MongoDB (using Docker)
docker run -d -p 27017:27017 --name mongodb mongo:6

# Start Elasticsearch (using Docker)
docker run -d -p 9200:9200 -e "discovery.type=single-node" --name elasticsearch elasticsearch:8

# Verify services are running
docker ps
```

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
  capabilities: Capabilities;
  useCases: UseCase[];
  searchKeywords: string[];
  semanticTags: string[];
  aliases: string[];
  technical: Technical;
  metrics: Metrics;
  comparison: Comparison;
  logoUrl?: string;
  website?: string;
  documentation?: string;
  status: ToolStatus;
  contributor: string;
  dateAdded: string;
  lastUpdated: string;
  rag: RAGOptimization;
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
  
  // Add other schema validations...
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
  
  // Add other schema fields...
}, {
  timestamps: { createdAt: 'dateAdded', updatedAt: 'lastUpdated' }
});

// Create indexes for performance
toolSchema.index({ 'categories.primary': 1 });
toolSchema.index({ 'categories.industries': 1 });
toolSchema.index({ 'pricingSummary.hasFreeTier': 1 });
toolSchema.index({ 'rag.contextWeight': -1 });

export const Tool = mongoose.model<ITool>('Tool', toolSchema);
```

### 3. Data Migration

#### 3.1 Create Migration Script
Create `src/migration/migrate-v1-to-v2.ts`:
```typescript
import { Tool } from '../models/Tool';
import { validateTool } from '../schemas/tool.schema';
import { logger } from '../utils/logger';

export class DataMigrator {
  async migrateV1ToV2(v1Tools: any[]): Promise<{ success: number; errors: any[] }> {
    const results = { success: 0, errors: [] };
    
    for (const v1Tool of v1Tools) {
      try {
        const v2Tool = this.transformV1ToV2(v1Tool);
        
        // Validate transformed data
        const { error } = validateTool(v2Tool);
        if (error) {
          results.errors.push({ toolId: v1Tool.id, error: error.details });
          continue;
        }
        
        // Save to database
        await Tool.create(v2Tool);
        results.success++;
        
      } catch (error) {
        results.errors.push({ toolId: v1Tool.id, error: error.message });
      }
    }
    
    return results;
  }
  
  private transformV1ToV2(v1Tool: any): any {
    return {
      id: v1Tool.id,
      name: v1Tool.name,
      slug: this.generateSlug(v1Tool.name),
      description: v1Tool.description,
      longDescription: v1Tool.longDescription || v1Tool.description,
      tagline: v1Tool.tagline,
      
      categories: {
        primary: v1Tool.tags?.primary || [v1Tool.category],
        secondary: v1Tool.tags?.secondary || [],
        industries: v1Tool.industries || ['Technology'],
        userTypes: v1Tool.userTypes || ['Developers'],
      },
      
      pricingSummary: {
        lowestMonthlyPrice: this.extractLowestPrice(v1Tool.pricing),
        highestMonthlyPrice: this.extractHighestPrice(v1Tool.pricing),
        currency: 'USD',
        hasFreeTier: v1Tool.pricing?.includes('Free') || false,
        hasCustomPricing: v1Tool.pricing?.includes('Custom') || false,
        billingPeriods: ['month', 'year'],
        pricingModel: this.determinePricingModel(v1Tool.pricing),
      },
      
      // Add other transformations...
    };
  }
  
  private generateSlug(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Add other helper methods...
}
```

#### 3.2 Run Migration
Create `src/migration/run-migration.ts`:
```typescript
import { DataMigrator } from './migrate-v1-to-v2';
import { connectDatabase } from '../config/database';
import { logger } from '../utils/logger';

async function runMigration() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Load v1.0 data
    const v1Tools = require('../data/tools-v1.0.json').tools;
    
    // Run migration
    const migrator = new DataMigrator();
    const results = await migrator.migrateV1ToV2(v1Tools);
    
    // Log results
    logger.info(`Migration completed: ${results.success} successful, ${results.errors.length} errors`);
    
    if (results.errors.length > 0) {
      logger.error('Migration errors:', results.errors);
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
```

#### 3.3 Execute Migration
```bash
# Compile TypeScript
npm run build

# Run migration
npm run migrate

# Or run directly
npx ts-node src/migration/run-migration.ts
```

### 4. API Implementation

#### 4.1 Create Tool Service
Create `src/services/tool.service.ts`:
```typescript
import { Tool, ITool } from '../models/Tool';
import { logger } from '../utils/logger';

export class ToolService {
  async createTool(toolData: Partial<ITool>): Promise<ITool> {
    try {
      const tool = new Tool(toolData);
      await tool.save();
      logger.info(`Tool created: ${tool.id}`);
      return tool;
    } catch (error) {
      logger.error('Error creating tool:', error);
      throw error;
    }
  }
  
  async getToolById(id: string): Promise<ITool | null> {
    return await Tool.findOne({ id }).exec();
  }
  
  async getTools(filter: any = {}, options: any = {}): Promise<ITool[]> {
    const { limit = 10, skip = 0, sort = { 'metrics.popularity': -1 } } = options;
    
    return await Tool.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();
  }
  
  async searchTools(query: string, filters: any = {}): Promise<ITool[]> {
    const searchFilter = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { searchKeywords: { $in: query.toLowerCase().split(' ') } },
        { semanticTags: { $in: query.toLowerCase().split(' ') } },
      ],
      ...filters,
    };
    
    return await this.getTools(searchFilter, {
      sort: { 'rag.contextWeight': -1, 'metrics.popularity': -1 },
    });
  }
  
  async getToolsByCategory(category: string): Promise<ITool[]> {
    return await this.getTools({
      'categories.primary': category,
    });
  }
  
  // Add other service methods...
}
```

#### 4.2 Create Tool Controller
Create `src/controllers/tool.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { ToolService } from '../services/tool.service';
import { logger } from '../utils/logger';

export class ToolController {
  private toolService: ToolService;
  
  constructor() {
    this.toolService = new ToolService();
  }
  
  async getTool(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tool = await this.toolService.getToolById(id);
      
      if (!tool) {
        res.status(404).json({ error: 'Tool not found' });
        return;
      }
      
      res.json(tool);
    } catch (error) {
      logger.error('Error getting tool:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async getTools(req: Request, res: Response): Promise<void> {
    try {
      const {
        category,
        industry,
        userType,
        hasFreeTier,
        minPrice,
        maxPrice,
        limit = 10,
        skip = 0,
      } = req.query;
      
      const filters: any = {};
      
      if (category) filters['categories.primary'] = category;
      if (industry) filters['categories.industries'] = industry;
      if (userType) filters['categories.userTypes'] = userType;
      if (hasFreeTier === 'true') filters['pricingSummary.hasFreeTier'] = true;
      if (minPrice || maxPrice) {
        filters['pricingSummary.lowestMonthlyPrice'] = {};
        if (minPrice) filters['pricingSummary.lowestMonthlyPrice'].$gte = Number(minPrice);
        if (maxPrice) filters['pricingSummary.lowestMonthlyPrice'].$lte = Number(maxPrice);
      }
      
      const tools = await this.toolService.getTools(filters, {
        limit: Number(limit),
        skip: Number(skip),
      });
      
      res.json({
        tools,
        total: tools.length,
        limit: Number(limit),
        skip: Number(skip),
      });
    } catch (error) {
      logger.error('Error getting tools:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async searchTools(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, ...filters } = req.query;
      
      if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }
      
      const tools = await this.toolService.searchTools(query as string, filters);
      
      res.json({
        tools,
        query,
        total: tools.length,
      });
    } catch (error) {
      logger.error('Error searching tools:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Add other controller methods...
}
```

#### 4.3 Create API Routes
Create `src/routes/tool.routes.ts`:
```typescript
import { Router } from 'express';
import { ToolController } from '../controllers/tool.controller';

const router = Router();
const toolController = new ToolController();

// Tool CRUD operations
router.get('/tools/:id', toolController.getTool.bind(toolController));
router.get('/tools', toolController.getTools.bind(toolController));
router.post('/tools', toolController.createTool.bind(toolController));

// Search and filtering
router.get('/search/tools', toolController.searchTools.bind(toolController));
router.get('/tools/category/:category', toolController.getToolsByCategory.bind(toolController));

export default router;
```

### 5. Testing

#### 5.1 Create Unit Tests
Create `tests/unit/tool.service.test.ts`:
```typescript
import { ToolService } from '../../src/services/tool.service';
import { Tool } from '../../src/models/Tool';
import { mockToolData } from '../mocks/tool.mock';

// Mock dependencies
jest.mock('../../src/models/Tool');

describe('ToolService', () => {
  let toolService: ToolService;
  
  beforeEach(() => {
    toolService = new ToolService();
    jest.clearAllMocks();
  });
  
  describe('createTool', () => {
    it('should create a new tool successfully', async () => {
      const mockTool = { ...mockToolData };
      const savedTool = { ...mockTool, _id: 'some-id' };
      
      (Tool.create as jest.Mock).mockResolvedValue(savedTool);
      
      const result = await toolService.createTool(mockTool);
      
      expect(result).toEqual(savedTool);
      expect(Tool.create).toHaveBeenCalledWith(mockTool);
    });
    
    it('should throw error if tool creation fails', async () => {
      const mockTool = { ...mockToolData };
      const error = new Error('Database error');
      
      (Tool.create as jest.Mock).mockRejectedValue(error);
      
      await expect(toolService.createTool(mockTool)).rejects.toThrow('Database error');
    });
  });
  
  describe('getToolById', () => {
    it('should return tool by id', async () => {
      const mockTool = { ...mockToolData, _id: 'some-id' };
      
      (Tool.findOne as jest.Mock).mockResolvedValue(mockTool);
      
      const result = await toolService.getToolById('some-id');
      
      expect(result).toEqual(mockTool);
      expect(Tool.findOne).toHaveBeenCalledWith({ id: 'some-id' });
    });
    
    it('should return null if tool not found', async () => {
      (Tool.findOne as jest.Mock).mockResolvedValue(null);
      
      const result = await toolService.getToolById('non-existent-id');
      
      expect(result).toBeNull();
    });
  });
  
  // Add more test cases...
});
```

#### 5.2 Create Integration Tests
Create `tests/integration/api.test.ts`:
```typescript
import request from 'supertest';
import app from '../../src/app';
import { Tool } from '../../src/models/Tool';
import { mockToolData } from '../mocks/tool.mock';

describe('Tool API Integration', () => {
  beforeAll(async () => {
    // Connect to test database
    await require('../../src/config/database').connectDatabase();
  });
  
  afterEach(async () => {
    // Clean up test data
    await Tool.deleteMany({});
  });
  
  afterAll(async () => {
    // Close database connection
    await require('../../src/config/database').disconnectDatabase();
  });
  
  describe('POST /tools', () => {
    it('should create a new tool', async () => {
      const response = await request(app)
        .post('/tools')
        .send(mockToolData)
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(mockToolData.name);
    });
    
    it('should return 400 for invalid tool data', async () => {
      const invalidData = { ...mockToolData, name: '' };
      
      await request(app)
        .post('/tools')
        .send(invalidData)
        .expect(400);
    });
  });
  
  describe('GET /tools/:id', () => {
    it('should return tool by id', async () => {
      const tool = new Tool(mockToolData);
      await tool.save();
      
      const response = await request(app)
        .get(`/tools/${tool.id}`)
        .expect(200);
      
      expect(response.body.id).toBe(tool.id);
    });
    
    it('should return 404 for non-existent tool', async () => {
      await request(app)
        .get('/tools/non-existent-id')
        .expect(404);
    });
  });
  
  describe('GET /tools', () => {
    it('should return list of tools', async () => {
      // Create test tools
      await Tool.create(mockToolData);
      await Tool.create({ ...mockToolData, id: 'tool2', name: 'Tool 2' });
      
      const response = await request(app)
        .get('/tools')
        .expect(200);
      
      expect(response.body.tools).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });
    
    it('should filter tools by category', async () => {
      await Tool.create(mockToolData);
      await Tool.create({ 
        ...mockToolData, 
        id: 'tool2', 
        name: 'Tool 2',
        categories: { ...mockToolData.categories, primary: ['Other'] }
      });
      
      const response = await request(app)
        .get('/tools?category=AI')
        .expect(200);
      
      expect(response.body.tools).toHaveLength(1);
      expect(response.body.tools[0].categories.primary).toContain('AI');
    });
  });
  
  describe('GET /search/tools', () => {
    it('should search tools by query', async () => {
      await Tool.create(mockToolData);
      
      const response = await request(app)
        .get('/search/tools?q=chatgpt')
        .expect(200);
      
      expect(response.body.tools).toHaveLength(1);
      expect(response.body.query).toBe('chatgpt');
    });
    
    it('should return 400 for empty query', async () => {
      await request(app)
        .get('/search/tools?q=')
        .expect(400);
    });
  });
  
  // Add more integration tests...
});
```

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

### 6. Elasticsearch Integration (Optional)

#### 6.1 Create Elasticsearch Service
Create `src/services/elasticsearch.service.ts`:
```typescript
import { Client } from '@elastic/elasticsearch';
import { logger } from '../utils/logger';

export class ElasticsearchService {
  private client: Client;
  private indexName: string;
  
  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL,
    });
    this.indexName = process.env.ELASTICSEARCH_INDEX || 'tools_v2';
  }
  
  async indexTool(tool: any): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        id: tool.id,
        body: {
          name: tool.name,
          description: tool.description,
          longDescription: tool.longDescription,
          categories: tool.categories,
          capabilities: tool.capabilities,
          searchKeywords: tool.searchKeywords,
          semanticTags: tool.semanticTags,
          rag: tool.rag,
        },
      });
      
      logger.info(`Tool indexed in Elasticsearch: ${tool.id}`);
    } catch (error) {
      logger.error('Error indexing tool in Elasticsearch:', error);
      throw error;
    }
  }
  
  async searchTools(query: string, filters: any = {}): Promise<any> {
    try {
      const searchBody = {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: ['name^3', 'description^2', 'longDescription', 'searchKeywords', 'semanticTags'],
                  type: 'best_fields',
                },
              },
            ],
            filter: this.buildFilters(filters),
          },
        },
        highlight: {
          fields: ['name', 'description'],
        },
      };
      
      const response = await this.client.search({
        index: this.indexName,
        body: searchBody,
      });
      
      return response.body.hits;
    } catch (error) {
      logger.error('Error searching tools in Elasticsearch:', error);
      throw error;
    }
  }
  
  private buildFilters(filters: any): any[] {
    const filterConditions = [];
    
    if (filters.category) {
      filterConditions.push({
        term: { 'categories.primary': filters.category },
      });
    }
    
    if (filters.industry) {
      filterConditions.push({
        term: { 'categories.industries': filters.industry },
      });
    }
    
    if (filters.hasFreeTier === 'true') {
      filterConditions.push({
        term: { 'pricingSummary.hasFreeTier': true },
      });
    }
    
    return filterConditions;
  }
  
  // Add other Elasticsearch methods...
}
```

#### 6.2 Create Index Mapping
Create `src/config/elasticsearch-mapping.ts`:
```typescript
export const toolIndexMapping = {
  mappings: {
    properties: {
      name: {
        type: 'text',
        analyzer: 'standard',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      description: {
        type: 'text',
        analyzer: 'english',
      },
      longDescription: {
        type: 'text',
        analyzer: 'english',
      },
      categories: {
        properties: {
          primary: {
            type: 'keyword',
          },
          secondary: {
            type: 'keyword',
          },
          industries: {
            type: 'keyword',
          },
          userTypes: {
            type: 'keyword',
          },
        },
      },
      capabilities: {
        properties: {
          core: {
            type: 'keyword',
          },
          aiFeatures: {
            properties: {
              codeGeneration: { type: 'boolean' },
              imageGeneration: { type: 'boolean' },
              dataAnalysis: { type: 'boolean' },
              voiceInteraction: { type: 'boolean' },
              multimodal: { type: 'boolean' },
            },
          },
          // Add other capability mappings...
        },
      },
      searchKeywords: {
        type: 'keyword',
      },
      semanticTags: {
        type: 'keyword',
      },
      rag: {
        properties: {
          contextWeight: { type: 'float' },
          searchRelevance: { type: 'keyword' },
          contentTypes: { type: 'keyword' },
          domainExpertise: { type: 'keyword' },
        },
      },
    },
  },
  settings: {
    analysis: {
      analyzer: {
        english: {
          tokenizer: 'standard',
          filter: ['lowercase', 'english_stop', 'english_stemmer'],
        },
      },
      filter: {
        english_stop: {
          type: 'stop',
          stopwords: '_english_',
        },
        english_stemmer: {
          type: 'stemmer',
          language: 'english',
        },
      },
    },
  },
};
```

## Common Issues and Solutions

### 1. Database Connection Issues

#### Problem: MongoDB connection fails
```bash
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**:
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Start MongoDB if not running
docker start mongodb

# Check MongoDB logs
docker logs mongodb

# Verify connection string
echo $MONGODB_URI
```

#### Problem: Authentication issues
```bash
Error: Authentication failed
```

**Solution**:
```bash
# Check MongoDB credentials
# Update .env file with correct credentials
MONGODB_URI=mongodb://username:password@localhost:27017/tools_v2
```

### 2. Schema Validation Issues

#### Problem: JSON Schema validation fails
```javascript
Error: "categories.primary" does not contain 1 required value(s)
```

**Solution**:
```typescript
// Ensure required fields are present
const toolData = {
  categories: {
    primary: ['AI'], // At least one primary category required
    industries: ['Technology'], // At least one industry required
    userTypes: ['Developers'], // At least one user type required
  },
};
```

#### Problem: Type validation fails
```javascript
Error: "rag.contextWeight" must be less than or equal to 1
```

**Solution**:
```typescript
// Ensure context weight is between 0 and 1
const toolData = {
  rag: {
    contextWeight: 0.85, // Valid range: 0-1
    searchRelevance: ['high'],
    contentTypes: ['conversational'],
    domainExpertise: ['general'],
  },
};
```

### 3. Migration Issues

#### Problem: Migration fails with duplicate key error
```bash
Error: duplicate key error collection: tools index: id_1 dup key: { id: "chatgpt" }
```

**Solution**:
```typescript
// Check for existing tools before migration
const existingTool = await Tool.findOne({ id: v1Tool.id });
if (existingTool) {
  // Skip or update existing tool
  logger.warn(`Tool already exists: ${v1Tool.id}`);
  continue;
}
```

#### Problem: Data transformation fails
```javascript
Error: Cannot read property 'pricing' of undefined
```

**Solution**:
```typescript
// Add defensive programming
private transformV1ToV2(v1Tool: any): any {
  return {
    // Provide default values for missing fields
    pricingSummary: {
      lowestMonthlyPrice: this.extractLowestPrice(v1Tool.pricing) || 0,
      highestMonthlyPrice: this.extractHighestPrice(v1Tool.pricing) || 0,
      // ... other fields
    },
  };
}
```

### 4. Performance Issues

#### Problem: Slow query performance
```javascript
Warning: Query execution time: 2500ms
```

**Solution**:
```typescript
// Add appropriate indexes
toolSchema.index({ 'categories.primary': 1, 'metrics.popularity': -1 });
toolSchema.index({ 'pricingSummary.hasFreeTier': 1, 'rag.contextWeight': -1 });

// Use query projection to limit returned fields
const tools = await Tool.find(filter)
  .select('name description categories pricingSummary')
  .sort(sort)
  .skip(skip)
  .limit(limit)
  .exec();
```

#### Problem: Memory issues with large datasets
```javascript
Error: JavaScript heap out of memory
```

**Solution**:
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 src/migration/run-migration.ts

# Or process data in batches
async function migrateInBatches(v1Tools: any[], batchSize = 100) {
  for (let i = 0; i < v1Tools.length; i += batchSize) {
    const batch = v1Tools.slice(i, i + batchSize);
    await processBatch(batch);
  }
}
```

### 5. API Issues

#### Problem: CORS errors in browser
```javascript
Access to XMLHttpRequest at 'http://localhost:3000/tools' 
from origin 'http://localhost:3001' has been blocked by CORS policy
```

**Solution**:
```typescript
// Add CORS middleware
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

#### Problem: Request body too large
```javascript
Error: request entity too large
```

**Solution**:
```typescript
// Increase payload size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

### 6. Elasticsearch Issues

#### Problem: Elasticsearch connection fails
```bash
Error: Unable to connect to Elasticsearch
```

**Solution**:
```bash
# Check if Elasticsearch is running
docker ps | grep elasticsearch

# Check Elasticsearch logs
docker logs elasticsearch

# Verify connection
curl -X GET "localhost:9200/_cluster/health?pretty"
```

#### Problem: Index mapping conflict
```bash
Error: mapper_parsing_exception: Root mapping definition has unsupported parameters
```

**Solution**:
```typescript
// Delete and recreate index with correct mapping
async function recreateIndex() {
  try {
    await client.indices.delete({ index: indexName });
  } catch (error) {
    // Index might not exist
  }
  
  await client.indices.create({
    index: indexName,
    body: toolIndexMapping,
  });
}
```

## Testing and Validation

### 1. Data Validation

#### Validate Schema Compliance
```typescript
import { validateTool } from '../src/schemas/tool.schema';
import { sampleTool } from './fixtures/sample-tool';

const validationResult = validateTool(sampleTool);
if (validationResult.error) {
  console.error('Schema validation failed:', validationResult.error.details);
} else {
  console.log('Schema validation passed');
}
```

#### Validate Migration Results
```typescript
async function validateMigration() {
  const totalTools = await Tool.countDocuments();
  const toolsWithCategories = await Tool.countDocuments({
    'categories.primary': { $exists: true, $ne: [] },
  });
  const toolsWithPricing = await Tool.countDocuments({
    'pricingSummary': { $exists: true },
  });
  
  console.log(`Total tools: ${totalTools}`);
  console.log(`Tools with categories: ${toolsWithCategories}`);
  console.log(`Tools with pricing: ${toolsWithPricing}`);
  
  // Validate percentages
  const categoryPercentage = (toolsWithCategories / totalTools) * 100;
  const pricingPercentage = (toolsWithPricing / totalTools) * 100;
  
  console.log(`Category coverage: ${categoryPercentage}%`);
  console.log(`Pricing coverage: ${pricingPercentage}%`);
  
  // Expect at least 95% coverage
  if (categoryPercentage < 95 || pricingPercentage < 95) {
    throw new Error('Migration validation failed: insufficient coverage');
  }
}
```

### 2. Performance Testing

#### Test Query Performance
```typescript
import { performance } from 'perf_hooks';

async function testQueryPerformance() {
  const queries = [
    { name: 'Get all tools', query: () => Tool.find({}) },
    { name: 'Search by category', query: () => Tool.find({ 'categories.primary': 'AI' }) },
    { name: 'Filter by free tier', query: () => Tool.find({ 'pricingSummary.hasFreeTier': true }) },
    { name: 'Complex filter', query: () => Tool.find({
      'categories.primary': 'AI',
      'pricingSummary.hasFreeTier': true,
      'rag.contextWeight': { $gte: 0.8 },
    })},
  ];
  
  for (const { name, query } of queries) {
    const start = performance.now();
    const results = await query();
    const end = performance.now();
    const duration = end - start;
    
    console.log(`${name}: ${duration.toFixed(2)}ms (${results.length} results)`);
    
    // Assert reasonable performance
    if (duration > 100) {
      console.warn(`Warning: ${name} took ${duration.toFixed(2)}ms`);
    }
  }
}
```

#### Test Search Performance
```typescript
async function testSearchPerformance() {
  const searchTerms = ['AI', 'chatbot', 'development', 'productivity'];
  
  for (const term of searchTerms) {
    const start = performance.now();
    const results = await toolService.searchTools(term);
    const end = performance.now();
    const duration = end - start;
    
    console.log(`Search "${term}": ${duration.toFixed(2)}ms (${results.length} results)`);
    
    // Assert search performance
    if (duration > 200) {
      console.warn(`Warning: Search "${term}" took ${duration.toFixed(2)}ms`);
    }
  }
}
```

### 3. Load Testing

#### Simulate Concurrent Requests
```typescript
import { setTimeout } from 'timers/promises';

async function loadTest() {
  const concurrentRequests = 50;
  const requests = [];
  
  console.log(`Starting load test with ${concurrentRequests} concurrent requests...`);
  
  const start = performance.now();
  
  for (let i = 0; i < concurrentRequests; i++) {
    requests.push(
      toolService.getTools({}, { limit: 10 })
        .catch(error => ({ error: error.message }))
    );
  }
  
  const results = await Promise.all(requests);
  const end = performance.now();
  const duration = end - start;
  
  const successfulRequests = results.filter(r => !r.error).length;
  const failedRequests = results.filter(r => r.error).length;
  
  console.log(`Load test completed in ${duration.toFixed(2)}ms`);
  console.log(`Successful requests: ${successfulRequests}`);
  console.log(`Failed requests: ${failedRequests}`);
  console.log(`Requests per second: ${(concurrentRequests / duration * 1000).toFixed(2)}`);
  
  // Assert reasonable performance
  if (failedRequests > concurrentRequests * 0.05) { // 5% failure rate threshold
    throw new Error('Load test failed: too many failed requests');
  }
  
  if (duration > 5000) { // 5 second threshold
    throw new Error('Load test failed: response time too slow');
  }
}
```

## Deployment

### 1. Docker Deployment

#### Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
USER nextjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

#### Create docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/tools_v2
      - ELASTICSEARCH_URL=http://elasticsearch:9200
    depends_on:
      - mongodb
      - elasticsearch
    restart: unless-stopped

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  elasticsearch:
    image: elasticsearch:8
    ports:
      - "9200:9200"
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    restart: unless-stopped

volumes:
  mongodb_data:
  elasticsearch_data:
```

#### Deploy with Docker Compose
```bash
# Build and start services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### 2. Kubernetes Deployment

#### Create Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tools-v2-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tools-v2-api
  template:
    metadata:
      labels:
        app: tools-v2-api
    spec:
      containers:
      - name: tools-v2-api
        image: your-registry/tools-v2-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: tools-v2-secrets
              key: mongodb-uri
        - name: ELASTICSEARCH_URL
          valueFrom:
            secretKeyRef:
              name: tools-v2-secrets
              key: elasticsearch-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: tools-v2-service
spec:
  selector:
    app: tools-v2-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### Deploy to Kubernetes
```bash
# Apply deployment
kubectl apply -f k8s/deployment.yaml

# Check deployment status
kubectl get deployments
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/tools-v2-api

# Scale deployment
kubectl scale deployment tools-v2-api --replicas=5
```

## Monitoring and Maintenance

### 1. Health Checks

#### Create Health Check Endpoint
```typescript
export class HealthController {
  async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '2.0.0',
        checks: {
          database: await this.checkDatabase(),
          elasticsearch: await this.checkElasticsearch(),
        },
      };
      
      const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
      
      res.status(allHealthy ? 200 : 503).json(health);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
      });
    }
  }
  
  private async checkDatabase() {
    try {
      await Tool.findOne().limit(1);
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
  
  private async checkElasticsearch() {
    try {
      await elasticsearchClient.ping();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}
```

#### Add Health Check Route
```typescript
router.get('/health', healthController.checkHealth.bind(healthController));
router.get('/ready', healthController.checkHealth.bind(healthController));
```

### 2. Logging and Monitoring

#### Configure Logging
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tools-v2-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

#### Add Performance Monitoring
```typescript
import { performance } from 'perf_hooks';

export function measurePerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    const start = performance.now();
    const result = await method.apply(this, args);
    const end = performance.now();
    const duration = end - start;
    
    logger.info(`${propertyName} executed in ${duration.toFixed(2)}ms`);
    
    if (duration > 1000) {
      logger.warn(`${propertyName} took ${duration.toFixed(2)}ms - consider optimization`);
    }
    
    return result;
  };
}

// Usage
export class ToolService {
  @measurePerformance
  async getTools(filter: any = {}, options: any = {}): Promise<ITool[]> {
    // Method implementation
  }
}
```

This quick start guide provides everything needed to implement the tools-v2.0 data structure, from setup and configuration to testing and deployment. Follow these steps to successfully migrate to and implement the enhanced data structure.
