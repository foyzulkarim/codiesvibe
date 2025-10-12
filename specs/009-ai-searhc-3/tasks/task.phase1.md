# Phase 1: Foundation - Detailed Implementation Tasks

Here's a more detailed breakdown of Phase 1 tasks with specific implementation details, code structures, and configurations:

## Task 1.1: Project Setup

### Implementation Details:

**package.json**
```json
{
  "name": "langgraph-search-system",
  "version": "1.0.0",
  "description": "Maximum Quality Search Architecture with LangGraph",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "setup": "ts-node src/setup.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@langchain/langgraph": "^0.0.12",
    "@langchain/community": "^0.0.20",
    "mongodb": "^6.3.0",
    "qdrant-js": "^1.7.0",
    "ollama": "^0.5.0",
    "dotenv": "^16.4.1",
    "fuse.js": "^7.0.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.17",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3"
  }
}
```

**tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/config/*": ["config/*"],
      "@/types/*": ["types/*"],
      "@/services/*": ["services/*"],
      "@/utils/*": ["utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**.env.example**
```
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/toolsearch
MONGODB_DB_NAME=toolsearch

# Qdrant Configuration
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION_NAME=tools

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large

# Application Configuration
LOG_LEVEL=info
ENABLE_CACHE=true
CACHE_TTL=3600
```

**jest.config.js**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/setup.ts',
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

## Task 1.2: Type Definitions

### Implementation Details:

**types/state.ts**
```typescript
import { Annotation, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { Intent, IntentSchema } from "./intent";
import { Plan, PlanSchema } from "./plan";

// State Schema using LangGraph's Annotation
export const StateAnnotation = Annotation.Root({
  // Input
  query: Annotation<string>,
  
  // Preprocessing
  preprocessedQuery: Annotation<string>,
  
  // Intent Extraction
  intent: Annotation<Intent>,
  confidence: Annotation<{
    overall: number;
    breakdown: Record<string, number>;
  }>,
  extractionSignals: Annotation<{
    nerResults: any[];
    fuzzyMatches: any[];
    semanticCandidates: Record<string, any[]>;
    classificationScores: Record<string, any[]>;
    combinedScores: Record<string, any[]>;
    comparativeFlag: boolean;
    referenceTool: string | null;
    priceConstraints: any;
    interfacePreferences: string[];
    deploymentPreferences: string[];
  }>,
  
  // Routing
  routingDecision: Annotation<"optimal" | "multi-strategy" | "fallback">,
  
  // Planning
  plan: Annotation<Plan>,
  
  // Execution
  executionResults: Annotation<any[]>,
  queryResults: Annotation<any[]>,
  
  // Quality Assessment
  qualityAssessment: Annotation<{
    resultCount: number;
    averageRelevance: number;
    categoryDiversity: number;
    decision: "accept" | "refine" | "expand";
  }>,
  
  // Iteration Control
  iterations: Annotation<{
    refinementAttempts: number;
    expansionAttempts: number;
    maxAttempts: number;
  }>,
  
  // Error Handling
  errors: Annotation<Array<{
    node: string;
    error: Error;
    timestamp: Date;
  }>>,
  
  // Metadata
  metadata: Annotation<{
    startTime: Date;
    endTime?: Date;
    executionPath: string[];
    nodeExecutionTimes: Record<string, number>;
  }>
});

export type State = typeof StateAnnotation.State;
```

**types/intent.ts**
```typescript
import { z } from "zod";

// Enums for various tool attributes
export const CategoryEnum = z.enum([
  "development", "design", "productivity", "communication", 
  "marketing", "analytics", "security", "infrastructure", "other"
]);

export const FunctionalityEnum = z.enum([
  "code-editing", "version-control", "testing", "deployment",
  "ui-design", "wireframing", "collaboration", "automation",
  "monitoring", "documentation", "other"
]);

export const UserTypeEnum = z.enum([
  "developer", "designer", "product-manager", "marketer",
  "analyst", "administrator", "other"
]);

export const InterfaceEnum = z.enum([
  "web", "desktop", "mobile", "cli", "api", "other"
]);

export const DeploymentEnum = z.enum([
  "cloud", "self-hosted", "hybrid", "other"
]);

export const PricingModelEnum = z.enum([
  "free", "freemium", "subscription", "one-time", "other"
]);

// Intent Schema
export const IntentSchema = z.object({
  // Tool identification
  toolNames: z.array(z.string()).default([]),
  
  // Constraints
  priceConstraints: z.object({
    hasFreeTier: z.boolean().optional(),
    maxPrice: z.number().optional(),
    minPrice: z.number().optional(),
    pricingModel: PricingModelEnum.optional(),
  }).optional(),
  
  // Categories
  categories: z.array(CategoryEnum).default([]),
  functionality: z.array(FunctionalityEnum).default([]),
  userTypes: z.array(UserTypeEnum).default([]),
  interface: z.array(InterfaceEnum).default([]),
  deployment: z.array(DeploymentEnum).default([]),
  
  // Comparative intent
  isComparative: z.boolean().default(false),
  referenceTool: z.string().optional(),
  
  // Semantic components
  semanticQuery: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  
  // Exclusions
  excludeTools: z.array(z.string()).default([]),
});

export type Intent = z.infer<typeof IntentSchema>;
```

**types/plan.ts**
```typescript
import { z } from "zod";

// Function definition schema
export const FunctionSchema = z.object({
  name: z.string(),
  parameters: z.record(z.any()).optional(),
  inputFromStep: z.number().optional(),
});

// Execution plan schema
export const PlanSchema = z.object({
  steps: z.array(FunctionSchema),
  description: z.string().optional(),
});

// Multi-strategy plan schema
export const MultiStrategyPlanSchema = z.object({
  strategies: z.array(PlanSchema),
  weights: z.array(z.number()),
  mergeStrategy: z.enum(["weighted", "best", "diverse"]),
  description: z.string().optional(),
});

export type Plan = z.infer<typeof PlanSchema>;
export type MultiStrategyPlan = z.infer<typeof MultiStrategyPlanSchema>;
export type Function = z.infer<typeof FunctionSchema>;
```

## Task 1.3: Configuration

### Implementation Details:

**config/database.ts**
```typescript
import { MongoClient, Db } from "mongodb";
import { QdrantClient } from "qdrant-js";
import dotenv from "dotenv";

dotenv.config();

// MongoDB Configuration
export const mongoConfig = {
  uri: process.env.MONGODB_URI || "mongodb://localhost:27017",
  dbName: process.env.MONGODB_DB_NAME || "toolsearch",
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }
};

// MongoDB connection management
let mongoClient: MongoClient | null = null;
let db: Db | null = null;

export async function connectToMongoDB(): Promise<Db> {
  if (db) return db;
  
  try {
    mongoClient = new MongoClient(mongoConfig.uri, mongoConfig.options);
    await mongoClient.connect();
    db = mongoClient.db(mongoConfig.dbName);
    console.log("Connected to MongoDB");
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function disconnectFromMongoDB(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    db = null;
    console.log("Disconnected from MongoDB");
  }
}

// Qdrant Configuration
export const qdrantConfig = {
  host: process.env.QDRANT_HOST || "localhost",
  port: parseInt(process.env.QDRANT_PORT || "6333"),
  collectionName: process.env.QDRANT_COLLECTION_NAME || "tools",
  vectorsConfig: {
    size: 384, // Size of the embedding model
    distance: "Cosine" as const,
  }
};

// Qdrant connection management
let qdrantClient: QdrantClient | null = null;

export async function connectToQdrant(): Promise<QdrantClient> {
  if (qdrantClient) return qdrantClient;
  
  try {
    qdrantClient = new QdrantClient({
      host: qdrantConfig.host,
      port: qdrantConfig.port,
    });
    
    // Ensure collection exists
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(
      collection => collection.name === qdrantConfig.collectionName
    );
    
    if (!exists) {
      await qdrantClient.createCollection(qdrantConfig.collectionName, {
        vectors: qdrantConfig.vectorsConfig,
      });
      console.log(`Created Qdrant collection: ${qdrantConfig.collectionName}`);
    }
    
    console.log("Connected to Qdrant");
    return qdrantClient;
  } catch (error) {
    console.error("Failed to connect to Qdrant:", error);
    throw error;
  }
}
```

**config/models.ts**
```typescript
import { Ollama } from "ollama";

// Ollama Configuration
export const ollamaConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  model: process.env.OLLAMA_MODEL || "llama2",
  embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "mxbai-embed-large",
  options: {
    temperature: 0.1,
    topP: 0.9,
    maxTokens: 2048,
  }
};

// Ollama client
export const ollamaClient = new Ollama({
  host: ollamaConfig.baseUrl,
});

// Model-specific configurations
export const modelConfigs = {
  // For intent extraction and synthesis
  intentExtraction: {
    model: ollamaConfig.model,
    options: {
      temperature: 0.1,
      topP: 0.9,
      maxTokens: 1024,
    }
  },
  
  // For semantic search
  embedding: {
    model: ollamaConfig.embeddingModel,
  },
  
  // For query planning
  planning: {
    model: ollamaConfig.model,
    options: {
      temperature: 0.2,
      topP: 0.9,
      maxTokens: 1536,
    }
  },
  
  // For result refinement
  refinement: {
    model: ollamaConfig.model,
    options: {
      temperature: 0.3,
      topP: 0.9,
      maxTokens: 1024,
    }
  }
};
```

**config/constants.ts**
```typescript
// Confidence thresholds
export const confidenceThresholds = {
  high: 0.8,
  medium: 0.5,
  low: 0.3,
};

// Quality thresholds
export const qualityThresholds = {
  minResults: 3,
  maxResults: 20,
  minRelevance: 0.6,
  minCategoryDiversity: 0.3,
};

// Maximum iterations
export const maxIterations = {
  refinement: 2,
  expansion: 2,
};

// Embedding configuration
export const embeddingConfig = {
  dimensions: 384,
  batchSize: 10,
  cacheEnabled: process.env.ENABLE_CACHE === "true",
  cacheTTL: parseInt(process.env.CACHE_TTL || "3600"), // seconds
};

// Enum values for various tool attributes
export const enumValues = {
  categories: [
    "development", "design", "productivity", "communication", 
    "marketing", "analytics", "security", "infrastructure", "other"
  ],
  functionality: [
    "code-editing", "version-control", "testing", "deployment",
    "ui-design", "wireframing", "collaboration", "automation",
    "monitoring", "documentation", "other"
  ],
  userTypes: [
    "developer", "designer", "product-manager", "marketer",
    "analyst", "administrator", "other"
  ],
  interface: [
    "web", "desktop", "mobile", "cli", "api", "other"
  ],
  deployment: [
    "cloud", "self-hosted", "hybrid", "other"
  ],
  pricingModel: [
    "free", "freemium", "subscription", "one-time", "other"
  ],
};

// Function mappings
export const functionMappings = {
  "lookup-by-name": "nodes/functions/lookup-by-name",
  "semantic-search": "nodes/functions/semantic-search",
  "filter-by-price": "nodes/functions/filter-by-price",
  "filter-by-category": "nodes/functions/filter-by-category",
  "filter-by-interface": "nodes/functions/filter-by-interface",
  "filter-by-functionality": "nodes/functions/filter-by-functionality",
  "filter-by-user-type": "nodes/functions/filter-by-user-type",
  "filter-by-deployment": "nodes/functions/filter-by-deployment",
  "find-similar-by-features": "nodes/functions/find-similar-by-features",
  "exclude-tools": "nodes/functions/exclude-tools",
  "merge-and-dedupe": "nodes/functions/merge-and-dedupe",
  "rank-by-relevance": "nodes/functions/rank-by-relevance",
};

// Logging configuration
export const logConfig = {
  level: process.env.LOG_LEVEL || "info",
  colors: true,
  timestamp: true,
};
```

## Task 1.4: Service Layer

### Implementation Details:

**services/embedding.service.ts**
```typescript
import { ollamaClient, modelConfigs } from "@/config/models";
import { embeddingConfig } from "@/config/constants";
import { connectToQdrant } from "@/config/database";
import { QdrantClient } from "qdrant-js";

// Simple in-memory cache for embeddings
const embeddingCache = new Map<string, number[]>();

export class EmbeddingService {
  private qdrantClient: QdrantClient | null = null;
  
  constructor() {
    this.initQdrant();
  }
  
  private async initQdrant(): Promise<void> {
    this.qdrantClient = await connectToQdrant();
  }
  
  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (embeddingConfig.cacheEnabled && embeddingCache.has(text)) {
      return embeddingCache.get(text)!;
    }
    
    try {
      const response = await ollamaClient.embeddings({
        model: modelConfigs.embedding.model,
        prompt: text,
      });
      
      const embedding = response.embedding;
      
      // Cache the result
      if (embeddingConfig.cacheEnabled) {
        embeddingCache.set(text, embedding);
        
        // Simple cache size management
        if (embeddingCache.size > 1000) {
          const firstKey = embeddingCache.keys().next().value;
          embeddingCache.delete(firstKey);
        }
      }
      
      return embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }
  
  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    // Process in batches
    for (let i = 0; i < texts.length; i += embeddingConfig.batchSize) {
      const batch = texts.slice(i, i + embeddingConfig.batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);
    }
    
    return embeddings;
  }
  
  /**
   * Pre-compute and cache embeddings for enum values
   */
  async precomputeEnumEmbeddings(): Promise<void> {
    if (!this.qdrantClient) {
      throw new Error("Qdrant client not initialized");
    }
    
    const { enumValues } = await import("@/config/constants");
    const allEnumValues = [
      ...enumValues.categories,
      ...enumValues.functionality,
      ...enumValues.userTypes,
      ...enumValues.interface,
      ...enumValues.deployment,
      ...enumValues.pricingModel,
    ];
    
    // Generate embeddings for all enum values
    const enumEmbeddings = await this.generateEmbeddings(allEnumValues);
    
    // Store in a structured format for easy lookup
    const enumEmbeddingMap: Record<string, number[]> = {};
    allEnumValues.forEach((value, index) => {
      enumEmbeddingMap[value] = enumEmbeddings[index];
    });
    
    // Store in Qdrant for efficient similarity search
    const points = allEnumValues.map((value, index) => ({
      id: value,
      vector: enumEmbeddings[index],
      payload: { type: "enum", value },
    }));
    
    try {
      await this.qdrantClient.upsert("enum_embeddings", { points });
      console.log("Pre-computed enum embeddings stored in Qdrant");
    } catch (error) {
      console.error("Error storing enum embeddings:", error);
      throw error;
    }
  }
  
  /**
   * Find similar enum values for a given text
   */
  async findSimilarEnumValues(
    text: string, 
    enumType: string, 
    limit: number = 5
  ): Promise<Array<{ value: string; score: number }>> {
    if (!this.qdrantClient) {
      throw new Error("Qdrant client not initialized");
    }
    
    const { enumValues } = await import("@/config/constants");
    const validEnumValues = enumValues[enumType as keyof typeof enumValues];
    
    if (!validEnumValues) {
      throw new Error(`Unknown enum type: ${enumType}`);
    }
    
    try {
      // Generate embedding for the input text
      const embedding = await this.generateEmbedding(text);
      
      // Search for similar enum values
      const searchResult = await this.qdrantClient.search("enum_embeddings", {
        vector: embedding,
        filter: {
          must: [
            { key: "type", match: { value: "enum" } },
            { key: "value", match: { any: validEnumValues } },
          ],
        },
        limit: limit,
        with_payload: true,
      });
      
      return searchResult.map(result => ({
        value: result.payload?.value as string,
        score: result.score,
      }));
    } catch (error) {
      console.error("Error finding similar enum values:", error);
      throw error;
    }
  }
  
  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    embeddingCache.clear();
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
```

**services/mongodb.service.ts**
```typescript
import { Db, ObjectId } from "mongodb";
import { connectToMongoDB } from "@/config/database";

export class MongoDBService {
  private db: Db | null = null;
  
  constructor() {
    this.init();
  }
  
  private async init(): Promise<void> {
    this.db = await connectToMongoDB();
  }
  
  /**
   * Get a tool by ID
   */
  async getToolById(id: string): Promise<any | null> {
    if (!this.db) throw new Error("Database not connected");
    
    try {
      const collection = this.db.collection("tools");
      return await collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error("Error getting tool by ID:", error);
      throw error;
    }
  }
  
  /**
   * Get tools by IDs
   */
  async getToolsByIds(ids: string[]): Promise<any[]> {
    if (!this.db) throw new Error("Database not connected");
    
    try {
      const collection = this.db.collection("tools");
      const objectIds = ids.map(id => new ObjectId(id));
      return await collection.find({ _id: { $in: objectIds } }).toArray();
    } catch (error) {
      console.error("Error getting tools by IDs:", error);
      throw error;
    }
  }
  
  /**
   * Get tools by name (exact match)
   */
  async getToolsByName(names: string[]): Promise<any[]> {
    if (!this.db) throw new Error("Database not connected");
    
    try {
      const collection = this.db.collection("tools");
      return await collection.find({ name: { $in: names } }).toArray();
    } catch (error) {
      console.error("Error getting tools by name:", error);
      throw error;
    }
  }
  
  /**
   * Search tools by name (partial match)
   */
  async searchToolsByName(query: string, limit: number = 10): Promise<any[]> {
    if (!this.db) throw new Error("Database not connected");
    
    try {
      const collection = this.db.collection("tools");
      return await collection
        .find({ name: { $regex: query, $options: "i" } })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error("Error searching tools by name:", error);
      throw error;
    }
  }
  
  /**
   * Get all tools
   */
  async getAllTools(): Promise<any[]> {
    if (!this.db) throw new Error("Database not connected");
    
    try {
      const collection = this.db.collection("tools");
      return await collection.find({}).toArray();
    } catch (error) {
      console.error("Error getting all tools:", error);
      throw error;
    }
  }
  
  /**
   * Filter tools by criteria
   */
  async filterTools(criteria: Record<string, any>): Promise<any[]> {
    if (!this.db) throw new Error("Database not connected");
    
    try {
      const collection = this.db.collection("tools");
      return await collection.find(criteria).toArray();
    } catch (error) {
      console.error("Error filtering tools:", error);
      throw error;
    }
  }
  
  /**
   * Count tools matching criteria
   */
  async countTools(criteria: Record<string, any>): Promise<number> {
    if (!this.db) throw new Error("Database not connected");
    
    try {
      const collection = this.db.collection("tools");
      return await collection.countDocuments(criteria);
    } catch (error) {
      console.error("Error counting tools:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const mongoDBService = new MongoDBService();
```

**services/qdrant.service.ts**
```typescript
import { QdrantClient } from "qdrant-js";
import { connectToQdrant, qdrantConfig } from "@/config/database";
import { embeddingService } from "./embedding.service";

export class QdrantService {
  private client: QdrantClient | null = null;
  
  constructor() {
    this.init();
  }
  
  private async init(): Promise<void> {
    this.client = await connectToQdrant();
  }
  
  /**
   * Search for similar tools based on embedding
   */
  async searchByEmbedding(
    embedding: number[],
    limit: number = 10,
    filter?: Record<string, any>
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    if (!this.client) throw new Error("Qdrant client not connected");
    
    try {
      const searchResult = await this.client.search(qdrantConfig.collectionName, {
        vector: embedding,
        limit: limit,
        filter: filter,
        with_payload: true,
      });
      
      return searchResult.map(result => ({
        id: result.id as string,
        score: result.score,
        payload: result.payload,
      }));
    } catch (error) {
      console.error("Error searching by embedding:", error);
      throw error;
    }
  }
  
  /**
   * Search for similar tools based on text query
   */
  async searchByText(
    query: string,
    limit: number = 10,
    filter?: Record<string, any>
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    // Generate embedding for the query
    const embedding = await embeddingService.generateEmbedding(query);
    
    // Search using the embedding
    return this.searchByEmbedding(embedding, limit, filter);
  }
  
  /**
   * Find tools similar to a reference tool
   */
  async findSimilarTools(
    toolId: string,
    limit: number = 10,
    filter?: Record<string, any>
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    if (!this.client) throw new Error("Qdrant client not connected");
    
    try {
      // Get the reference tool's embedding
      const retrieveResult = await this.client.retrieve(qdrantConfig.collectionName, {
        ids: [toolId],
        with_payload: false,
        with_vector: true,
      });
      
      if (retrieveResult.length === 0) {
        throw new Error(`Tool with ID ${toolId} not found`);
      }
      
      const referenceEmbedding = retrieveResult[0].vector;
      if (!referenceEmbedding) {
        throw new Error(`No embedding found for tool with ID ${toolId}`);
      }
      
      // Search for similar tools, excluding the reference tool
      const searchFilter = {
        ...filter,
        must: [
          ...(filter?.must || []),
          { key: "_id", match: { except: [toolId] } },
        ],
      };
      
      return this.searchByEmbedding(referenceEmbedding, limit, searchFilter);
    } catch (error) {
      console.error("Error finding similar tools:", error);
      throw error;
    }
  }
  
  /**
   * Add or update a tool's embedding
   */
  async upsertTool(toolId: string, embedding: number[], payload: Record<string, any>): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");
    
    try {
      await this.client.upsert(qdrantConfig.collectionName, {
        points: [
          {
            id: toolId,
            vector: embedding,
            payload: payload,
          },
        ],
      });
    } catch (error) {
      console.error("Error upserting tool:", error);
      throw error;
    }
  }
  
  /**
   * Delete a tool's embedding
   */
  async deleteTool(toolId: string): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");
    
    try {
      await this.client.delete(qdrantConfig.collectionName, {
        points: [toolId],
      });
    } catch (error) {
      console.error("Error deleting tool:", error);
      throw error;
    }
  }
  
  /**
   * Get collection info
   */
  async getCollectionInfo(): Promise<any> {
    if (!this.client) throw new Error("Qdrant client not connected");
    
    try {
      return await this.client.getCollection(qdrantConfig.collectionName);
    } catch (error) {
      console.error("Error getting collection info:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const qdrantService = new QdrantService();
```

## Task 1.5: Utility Functions

### Implementation Details:

**utils/cosine-similarity.ts**
```typescript
/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

/**
 * Calculate cosine similarity between a vector and multiple vectors
 */
export function cosineSimilarityBatch(
  vector: number[], 
  vectors: number[][]
): number[] {
  return vectors.map(vec => cosineSimilarity(vector, vec));
}

/**
 * Find the most similar vectors to a query vector
 */
export function findMostSimilar(
  queryVector: number[],
  candidateVectors: number[][],
  topK: number = 5
): Array<{ index: number; similarity: number }> {
  const similarities = cosineSimilarityBatch(queryVector, candidateVectors);
  
  // Create array of objects with index and similarity
  const indexedSimilarities = similarities.map((similarity, index) => ({
    index,
    similarity,
  }));
  
  // Sort by similarity (descending)
  indexedSimilarities.sort((a, b) => b.similarity - a.similarity);
  
  // Return top K results
  return indexedSimilarities.slice(0, topK);
}
```

**utils/embedding-cache.ts**
```typescript
import { embeddingConfig } from "@/config/constants";

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();
  
  /**
   * Get an embedding from the cache
   */
  get(key: string): number[] | null {
    if (!embeddingConfig.cacheEnabled) return null;
    
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if the entry has expired
    const now = Date.now();
    const ageInSeconds = (now - entry.timestamp) / 1000;
    
    if (ageInSeconds > embeddingConfig.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.embedding;
  }
  
  /**
   * Set an embedding in the cache
   */
  set(key: string, embedding: number[]): void {
    if (!embeddingConfig.cacheEnabled) return;
    
    // Simple cache size management
    if (this.cache.size >= 1000) {
      // Remove the oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    if (!embeddingConfig.cacheEnabled) return false;
    
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if the entry has expired
    const now = Date.now();
    const ageInSeconds = (now - entry.timestamp) / 1000;
    
    if (ageInSeconds > embeddingConfig.cacheTTL) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete an entry from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get the current size of the cache
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      const ageInSeconds = (now - entry.timestamp) / 1000;
      
      if (ageInSeconds > embeddingConfig.cacheTTL) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
}

// Export singleton instance
export const embeddingCache = new EmbeddingCache();
```

**utils/pattern-matchers.ts**
```typescript
/**
 * Price constraint extraction patterns
 */
export const pricePatterns = {
  free: /\b(free|no cost|no charge|gratis)\b/i,
  paid: /\b(paid|premium|pro|commercial)\b/i,
  freemium: /\b(freemium|free trial|free tier)\b/i,
  subscription: /\b(subscription|monthly|annual|yearly)\b/i,
  oneTime: /\b(one-time|one off|lifetime|perpetual)\b/i,
  
  // Price range patterns
  maxPrice: /\b(under|below|less than|cheaper than|under \$|below \$|less than \$)\s*(\$?\d+)/i,
  minPrice: /\b(over|above|more than|expensive than|over \$|above \$|more than \$)\s*(\$?\d+)/i,
  priceRange: /\b(between|from \$|between \$)\s*(\$?\d+)\s*(and|to|-)\s*(\$?\d+)/i,
};

/**
 * Interface preference patterns
 */
export const interfacePatterns = {
  web: /\b(web|browser|online|website|web app|web application)\b/i,
  desktop: /\b(desktop|native|standalone|client|application)\b/i,
  mobile: /\b(mobile|phone|tablet|ios|android|app)\b/i,
  cli: /\b(cli|command line|terminal|console)\b/i,
  api: /\b(api|rest|graphql|sdk|library)\b/i,
};

/**
 * Deployment preference patterns
 */
export const deploymentPatterns = {
  cloud: /\b(cloud|saas|hosted|online|web-based)\b/i,
  selfHosted: /\b(self-hosted|on-premise|on-prem|local|self-host)\b/i,
  hybrid: /\b(hybrid|mixed|both)\b/i,
};

/**
 * Comparative intent patterns
 */
export const comparativePatterns = {
  direct: /\b(compare|vs|versus|alternative to|instead of|replacement for)\b/i,
  similarity: /\b(similar to|like|such as|as good as)\b/i,
  difference: /\b(difference between|better than|worse than)\b/i,
};

/**
 * Extract price constraints from text
 */
export function extractPriceConstraints(text: string): {
  hasFreeTier?: boolean;
  maxPrice?: number;
  minPrice?: number;
  pricingModel?: string;
} {
  const result: any = {};
  
  // Check for free tier
  if (pricePatterns.free.test(text)) {
    result.hasFreeTier = true;
  }
  
  // Check for pricing model
  if (pricePatterns.freemium.test(text)) {
    result.pricingModel = "freemium";
  } else if (pricePatterns.subscription.test(text)) {
    result.pricingModel = "subscription";
  } else if (pricePatterns.oneTime.test(text)) {
    result.pricingModel = "one-time";
  } else if (pricePatterns.paid.test(text)) {
    result.pricingModel = "paid";
  }
  
  // Extract price range
  const maxPriceMatch = text.match(pricePatterns.maxPrice);
  if (maxPriceMatch) {
    result.maxPrice = parseInt(maxPriceMatch[2].replace(/\$/g, ""));
  }
  
  const minPriceMatch = text.match(pricePatterns.minPrice);
  if (minPriceMatch) {
    result.minPrice = parseInt(minPriceMatch[2].replace(/\$/g, ""));
  }
  
  const priceRangeMatch = text.match(pricePatterns.priceRange);
  if (priceRangeMatch) {
    result.minPrice = parseInt(priceRangeMatch[2].replace(/\$/g, ""));
    result.maxPrice = parseInt(priceRangeMatch[3].replace(/\$/g, ""));
  }
  
  return result;
}

/**
 * Extract interface preferences from text
 */
export function extractInterfacePreferences(text: string): string[] {
  const preferences: string[] = [];
  
  if (interfacePatterns.web.test(text)) {
    preferences.push("web");
  }
  
  if (interfacePatterns.desktop.test(text)) {
    preferences.push("desktop");
  }
  
  if (interfacePatterns.mobile.test(text)) {
    preferences.push("mobile");
  }
  
  if (interfacePatterns.cli.test(text)) {
    preferences.push("cli");
  }
  
  if (interfacePatterns.api.test(text)) {
    preferences.push("api");
  }
  
  return preferences;
}

/**
 * Extract deployment preferences from text
 */
export function extractDeploymentPreferences(text: string): string[] {
  const preferences: string[] = [];
  
  if (deploymentPatterns.cloud.test(text)) {
    preferences.push("cloud");
  }
  
  if (deploymentPatterns.selfHosted.test(text)) {
    preferences.push("self-hosted");
  }
  
  if (deploymentPatterns.hybrid.test(text)) {
    preferences.push("hybrid");
  }
  
  return preferences;
}

/**
 * Detect comparative intent in text
 */
export function detectComparativeIntent(text: string): {
  isComparative: boolean;
  confidence: number;
  pattern?: string;
} {
  // Check each pattern type
  if (comparativePatterns.direct.test(text)) {
    return { isComparative: true, confidence: 0.9, pattern: "direct" };
  }
  
  if (comparativePatterns.similarity.test(text)) {
    return { isComparative: true, confidence: 0.7, pattern: "similarity" };
  }
  
  if (comparativePatterns.difference.test(text)) {
    return { isComparative: true, confidence: 0.8, pattern: "difference" };
  }
  
  return { isComparative: false, confidence: 0.0 };
}

/**
 * Extract reference tool name from comparative query
 */
export function extractReferenceTool(text: string): string | null {
  // This is a simplified implementation
  // In a real system, you might use NER or more sophisticated parsing
  
  // Look for patterns like "alternative to [tool]" or "vs [tool]"
  const alternativeMatch = text.match(/alternative to\s+([a-zA-Z0-9\s-]+)/i);
  if (alternativeMatch) {
    return alternativeMatch[1].trim();
  }
  
  const vsMatch = text.match(/(?:vs|versus)\s+([a-zA-Z0-9\s-]+)/i);
  if (vsMatch) {
    return vsMatch[1].trim();
  }
  
  const insteadOfMatch = text.match(/instead of\s+([a-zA-Z0-9\s-]+)/i);
  if (insteadOfMatch) {
    return insteadOfMatch[1].trim();
  }
  
  return null;
}
```

With these detailed implementations for Phase 1, you'll have a solid foundation for the rest of the project. The services are designed to be reusable and handle the core interactions with your data stores, while the utility functions provide common functionality that will be used throughout the system.