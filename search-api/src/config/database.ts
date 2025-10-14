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
  // Enhanced multi-vector configuration
  vectorsConfig: {
    size: 1024, // Size of the embedding model (mxbai-embed-large)
    distance: "Cosine" as const,
  },
  // Multi-vector configuration with named vectors
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
    "entities.aliases": {
      size: 1024,
      distance: "Cosine" as const,
    },
    "composites.toolType": {
      size: 1024,
      distance: "Cosine" as const,
    },
  },
  // Collection names for different vector types
  collectionNames: {
    semantic: process.env.QDRANT_COLLECTION_SEMANTIC || "tools_semantic",
    "entities.categories": process.env.QDRANT_COLLECTION_CATEGORIES || "tools_categories",
    "entities.functionality": process.env.QDRANT_COLLECTION_FUNCTIONALITY || "tools_functionality",
    "entities.aliases": process.env.QDRANT_COLLECTION_ALIASES || "tools_aliases",
    "composites.toolType": process.env.QDRANT_COLLECTION_TOOL_TYPE || "tools_tool_type",
  }
};

// Qdrant connection management
let qdrantClient: QdrantClient | null = null;

export async function connectToQdrant(): Promise<QdrantClient> {
  if (qdrantClient) return qdrantClient;

  try {
    const url = `http://${qdrantConfig.host}:${qdrantConfig.port}`;
    qdrantClient = new QdrantClient({ url });

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

    // Create multi-vector collections
    for (const [vectorType, collectionName] of Object.entries(qdrantConfig.collectionNames)) {
      if (!existingCollectionNames.includes(collectionName)) {
        const vectorConfig = qdrantConfig.multiVectorsConfig[vectorType as keyof typeof qdrantConfig.multiVectorsConfig];
        if (vectorConfig) {
          await qdrantClient.createCollection(collectionName, {
            vectors: vectorConfig,
          });
          console.log(`Created Qdrant collection for ${vectorType}: ${collectionName}`);
        }
      }
    }

    console.log("Connected to Qdrant with multi-vector support");
    return qdrantClient;
  } catch (error) {
    console.error("Failed to connect to Qdrant:", error);
    throw error;
  }
}

/**
 * Get collection name for a specific vector type
 */
export function getCollectionName(vectorType: string): string {
  return qdrantConfig.collectionNames[vectorType as keyof typeof qdrantConfig.collectionNames] || qdrantConfig.collectionName;
}

/**
 * Check if a vector type is supported
 */
export function isSupportedVectorType(vectorType: string): boolean {
  return vectorType in qdrantConfig.multiVectorsConfig;
}

/**
 * Get all supported vector types
 */
export function getSupportedVectorTypes(): string[] {
  return Object.keys(qdrantConfig.multiVectorsConfig);
}
