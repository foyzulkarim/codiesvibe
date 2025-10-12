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
  vectorsConfig: {
    size: 1024, // Size of the embedding model (mxbai-embed-large)
    distance: "Cosine" as const,
  }
};

// Qdrant connection management
let qdrantClient: QdrantClient | null = null;

export async function connectToQdrant(): Promise<QdrantClient> {
  if (qdrantClient) return qdrantClient;

  try {
    const url = `http://${qdrantConfig.host}:${qdrantConfig.port}`;
    qdrantClient = new QdrantClient({ url });

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