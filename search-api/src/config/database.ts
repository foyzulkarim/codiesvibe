import { MongoClient, Db } from "mongodb";
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";
import { CONFIG } from './env.config.js';

dotenv.config();

// MongoDB Configuration
export const mongoConfig = {
  uri: CONFIG.database.MONGODB_URI,
  dbName: CONFIG.database.MONGODB_DB_NAME,
  options: {
    // Connection pool settings
    maxPoolSize: CONFIG.database.MONGODB_MAX_POOL_SIZE, // Max connections in pool
    minPoolSize: CONFIG.database.MONGODB_MIN_POOL_SIZE,  // Min connections in pool
    maxIdleTimeMS: 60000, // Close idle connections after 60 seconds

    // Timeouts
    serverSelectionTimeoutMS: 5000, // Timeout for server selection
    socketTimeoutMS: 45000, // Socket timeout
    connectTimeoutMS: 10000, // Connection timeout

    // Monitoring
    monitorCommands: true, // Enable command monitoring for metrics
  }
};

// MongoDB connection management
let mongoClient: MongoClient | null = null;
let db: Db | null = null;

export async function connectToMongoDB(): Promise<Db> {
  if (db) return db;

  try {
    // Use centralized CONFIG for MongoDB URI
    const uri = CONFIG.database.MONGODB_URI;
    mongoClient = new MongoClient(uri, mongoConfig.options);
    await mongoClient.connect();
    db = mongoClient.db(mongoConfig.dbName);
    console.log("Connected to MongoDB", mongoConfig.dbName);
    console.log("MongoDB connection pool configured:", {
      maxPoolSize: mongoConfig.options.maxPoolSize,
      minPoolSize: mongoConfig.options.minPoolSize,
      maxIdleTimeMS: mongoConfig.options.maxIdleTimeMS,
    });

    // Set up connection pool monitoring
    setupConnectionPoolMonitoring();

    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

/**
 * Setup MongoDB connection pool monitoring
 * Tracks pool statistics and updates metrics
 */
function setupConnectionPoolMonitoring(): void {
  if (!mongoClient) return;

  // Monitor connection pool events
  mongoClient.on('connectionPoolCreated', (event) => {
    console.log('MongoDB connection pool created:', {
      maxPoolSize: event.options?.maxPoolSize,
      minPoolSize: event.options?.minPoolSize,
    });
  });

  mongoClient.on('connectionPoolClosed', () => {
    console.log('MongoDB connection pool closed');
  });

  mongoClient.on('connectionCreated', () => {
    updateConnectionPoolMetrics();
  });

  mongoClient.on('connectionReady', () => {
    updateConnectionPoolMetrics();
  });

  mongoClient.on('connectionClosed', () => {
    updateConnectionPoolMetrics();
  });

  mongoClient.on('connectionCheckOutStarted', () => {
    updateConnectionPoolMetrics();
  });

  mongoClient.on('connectionCheckOutFailed', (event) => {
    console.warn('MongoDB connection check out failed:', event.reason);
  });

  mongoClient.on('connectionCheckedIn', () => {
    updateConnectionPoolMetrics();
  });

  // Periodic metrics update (every 30 seconds)
  setInterval(() => {
    updateConnectionPoolMetrics();
  }, 30000);
}

/**
 * Update connection pool metrics
 */
function updateConnectionPoolMetrics(): void {
  // Note: MongoDB Node.js driver doesn't expose pool stats directly
  // We can only track events and infer pool state
  // For more accurate metrics, consider using MongoDB APM or external monitoring

  // This is a placeholder - in production, you would use MongoDB's monitoring tools
  // or APM solutions like MongoDB Atlas monitoring, Datadog, etc.
}

export async function disconnectFromMongoDB(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    db = null;
    console.log("Disconnected from MongoDB", mongoConfig.dbName);
  }
}

/**
 * Reset MongoDB connection - for testing purposes only
 * This allows tests to reconnect with a different URI (e.g., MongoMemoryServer)
 */
export async function resetMongoConnection(): Promise<void> {
  // Disconnect if connected
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    db = null;
  }

  // Update config with centralized CONFIG value
  mongoConfig.uri = CONFIG.database.MONGODB_URI;
}



// Qdrant Configuration
export const qdrantConfig = {
  url: CONFIG.qdrant.QDRANT_URL,
  host: CONFIG.qdrant.QDRANT_HOST,
  port: CONFIG.qdrant.QDRANT_PORT,
  apiKey: CONFIG.qdrant.QDRANT_API_KEY,
  collectionName: CONFIG.qdrant.QDRANT_COLLECTION_NAME,
  // Enhanced multi-vector configuration
  vectorsConfig: {
    size: 768, // Size of the embedding model (togethercomputer/m2-bert-80M-32k-retrieval)
    distance: "Cosine" as const,
  },
  // Multi-vector configuration with named vectors (legacy - for backward compatibility)
  multiVectorsConfig: {
    semantic: {
      size: 768,
      distance: "Cosine" as const,
    },
    "entities.categories": {
      size: 768,
      distance: "Cosine" as const,
    },
    "entities.functionality": {
      size: 768,
      distance: "Cosine" as const,
    },
    "entities.interface": {
      size: 768,
      distance: "Cosine" as const,
    },
    "entities.industries": {
      size: 768,
      distance: "Cosine" as const,
    },
    "entities.userTypes": {
      size: 768,
      distance: "Cosine" as const,
    },
    "entities.aliases": {
      size: 768,
      distance: "Cosine" as const,
    },
    "composites.toolType": {
      size: 768,
      distance: "Cosine" as const,
    },
  },
  // Collection names for different vector types (legacy - for backward compatibility)
  collectionNames: {
    semantic: CONFIG.qdrant.collections.SEMANTIC,
    "entities.categories": CONFIG.qdrant.collections.CATEGORIES,
    "entities.functionality": CONFIG.qdrant.collections.FUNCTIONALITY,
    "entities.interface": CONFIG.qdrant.collections.INTERFACE,
    "entities.industries": CONFIG.qdrant.collections.INDUSTRIES,
    "entities.userTypes": CONFIG.qdrant.collections.USER_TYPES,
    "entities.aliases": CONFIG.qdrant.collections.ALIASES,
    "composites.toolType": CONFIG.qdrant.collections.TOOL_TYPE,
  },
  // Enhanced collection configuration - hardcoded for now
  enhancedCollectionNames: {
    primary: 'enhanced_tools'
  }
};

// Qdrant connection management
let qdrantClient: QdrantClient | null = null;

export async function connectToQdrant(): Promise<QdrantClient | null> {
  if (qdrantClient) return qdrantClient;

  try {
    // Use the full URL if provided (for cloud Qdrant), otherwise construct from host and port
    let url: string;
    let apiKey: string | undefined;
    
    if (qdrantConfig.url) {
      url = qdrantConfig.url;
      apiKey = qdrantConfig.apiKey || undefined;
    } else {
      url = `http://${qdrantConfig.host}:${qdrantConfig.port}`;
      apiKey = undefined; // No API key for local Qdrant
    }
    
    console.log(`Connecting to Qdrant at: ${url}`);
    console.log(`Using API key: ${apiKey ? 'Yes' : 'No'}`);
    
    qdrantClient = new QdrantClient({ url, apiKey });

    // Ensure collections exist for all vector types
    const collections = await qdrantClient.getCollections();
    const existingCollectionNames = collections.collections.map(c => c.name);

    // Create legacy 'tools' collection for backward compatibility
    // NOTE: All 4 collections will be created by server startup via qdrantService.createMultiCollections()
    if (!existingCollectionNames.includes(qdrantConfig.collectionName)) {
      await qdrantClient.createCollection(qdrantConfig.collectionName, {
        vectors: qdrantConfig.vectorsConfig,
      });
      console.log(`✅ Created legacy Qdrant collection: ${qdrantConfig.collectionName}`);
    } else {
      console.log(`✅ Legacy Qdrant collection already exists: ${qdrantConfig.collectionName}`);
    }

    console.log("✅ Connected to Qdrant (multi-collection setup happens during server startup)");
    return qdrantClient;
  } catch (error) {
    console.error("Failed to connect to Qdrant:", error);
    // Don't throw error - return null and let the application continue without Qdrant
    return null;
  }
}

/**
 * Get collection name for a specific vector type
 * Updated to return simple collection names that match our 4 collections
 */
export function getCollectionName(vectorType: string): string {
  // Map vector types to our simple collection names
  const vectorToCollectionMap: Record<string, string> = {
    'semantic': 'tools',
    'entities.functionality': 'functionality',
    'entities.categories': 'functionality', // Map categories to functionality for simplicity
    'entities.interface': 'interface',
    'entities.industries': 'usecases', // Map industries to usecases
    'entities.userTypes': 'usecases', // Map userTypes to usecases
    'entities.aliases': 'tools', // Map aliases to tools
    'composites.toolType': 'tools' // Map toolType to tools
  };

  return vectorToCollectionMap[vectorType] || 'tools';
}

/**
 * Check if a vector type is supported
 */
export function isSupportedVectorType(vectorType: string): boolean {
  const supportedTypes = ['semantic', 'entities.functionality', 'entities.categories', 'entities.interface', 'entities.industries', 'entities.userTypes', 'entities.aliases', 'composites.toolType'];
  return supportedTypes.includes(vectorType);
}

/**
 * Get all supported vector types (legacy)
 */
export function getSupportedVectorTypes(): string[] {
  return ['semantic', 'entities.functionality', 'entities.categories', 'entities.interface', 'entities.industries', 'entities.userTypes', 'entities.aliases', 'composites.toolType'];
}

/**
 * Get enhanced collection name
 */
export function getEnhancedCollectionName(): string {
  return 'enhanced_tools'; // Hardcoded for now
}

/**
 * Check if enhanced collection should be used
 */
export function shouldUseEnhancedCollection(): boolean {
  return CONFIG.qdrant.QDRANT_USE_ENHANCED_COLLECTION;
}

/**
 * Get appropriate collection name based on vector type and configuration
 */
export function getCollectionNameForVectorType(vectorType?: string): string {
  // Use enhanced collection if enabled and vector type is supported
  if (shouldUseEnhancedCollection() && (!vectorType || isSupportedVectorType(vectorType || ''))) {
    return getEnhancedCollectionName();
  }
  
  // Fall back to legacy collections
  if (vectorType) {
    return getCollectionName(vectorType);
  }
  
  return 'tools'; // Default collection
}

/**
 * Get the MongoDB client instance
 * Returns null if not connected
 */
export function getMongoClient(): MongoClient | null {
  return mongoClient;
}

/**
 * Get the Qdrant client instance
 * Returns null if not connected
 */
export function getQdrantClient(): QdrantClient | null {
  return qdrantClient;
}
