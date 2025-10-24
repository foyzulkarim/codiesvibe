import { MongoClient, Db } from "mongodb";
import { QdrantClient } from "@qdrant/js-client-rest";
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
    console.log("Connected to MongoDB", mongoConfig.dbName);
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
    console.log("Disconnected from MongoDB", mongoConfig.dbName);
  }
}



// Qdrant Configuration
export const qdrantConfig = {
  url: process.env.QDRANT_URL || null,
  host: process.env.QDRANT_HOST || "localhost",
  port: parseInt(process.env.QDRANT_PORT || "6333"),
  apiKey: process.env.QDRANT_API_KEY || null,
  collectionName: process.env.QDRANT_COLLECTION_NAME || "tools",
  // Enhanced multi-vector configuration
  vectorsConfig: {
    size: 1024, // Size of the embedding model (mxbai-embed-large)
    distance: "Cosine" as const,
  },
  // Multi-vector configuration with named vectors (legacy - for backward compatibility)
  multiVectorsConfig: {
    semantic: {
      size: 1024,
      distance: "Cosine" as const,
    },
    "entities.categories": {
      size: 1024,
      distance: "Cosine" as const,
    },
    "entities.functionality": {
      size: 1024,
      distance: "Cosine" as const,
    },
    "entities.interface": {
      size: 1024,
      distance: "Cosine" as const,
    },
    "entities.industries": {
      size: 1024,
      distance: "Cosine" as const,
    },
    "entities.userTypes": {
      size: 1024,
      distance: "Cosine" as const,
    },
    "entities.aliases": {
      size: 1024,
      distance: "Cosine" as const,
    },
    "composites.toolType": {
      size: 1024,
      distance: "Cosine" as const,
    },
  },
  // Collection names for different vector types (legacy - for backward compatibility)
  collectionNames: {
    semantic: process.env.QDRANT_COLLECTION_SEMANTIC || "tools_semantic",
    "entities.categories": process.env.QDRANT_COLLECTION_CATEGORIES || "tools_categories",
    "entities.functionality": process.env.QDRANT_COLLECTION_FUNCTIONALITY || "tools_functionality",
    "entities.interface": process.env.QDRANT_COLLECTION_INTERFACE || "tools_interface",
    "entities.industries": process.env.QDRANT_COLLECTION_INDUSTRIES || "tools_industries",
    "entities.userTypes": process.env.QDRANT_COLLECTION_USER_TYPES || "tools_user_types",
    "entities.aliases": process.env.QDRANT_COLLECTION_ALIASES || "tools_aliases",
    "composites.toolType": process.env.QDRANT_COLLECTION_TOOL_TYPE || "tools_tool_type",
  },
  // Enhanced collection configuration - hardcoded for now
  enhancedCollectionNames: {
    primary: 'enhanced_tools'
  }
};

// Qdrant connection management
let qdrantClient: QdrantClient | null = null;

export async function connectToQdrant(): Promise<QdrantClient> {
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

    // Create legacy collection for backward compatibility
    if (!existingCollectionNames.includes(qdrantConfig.collectionName)) {
      await qdrantClient.createCollection(qdrantConfig.collectionName, {
        vectors: qdrantConfig.vectorsConfig,
      });
      console.log(`Created Qdrant collection: ${qdrantConfig.collectionName}`);
    }

    console.log("Connected to Qdrant with enhanced multi-vector support");
    return qdrantClient;
  } catch (error) {
    console.error("Failed to connect to Qdrant:", error);
    throw error;
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
  return process.env.QDRANT_USE_ENHANCED_COLLECTION === 'true';
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
