import { MongoClient, Db, Collection } from 'mongodb';
import config from '../config/agentic';
import { Tool } from '../types';

// MongoDB connection state
let client: MongoClient | null = null;
let db: Db | null = null;
let collection: Collection<Tool> | null = null;
let isConnected = false;

// In-memory dataset storage
let dataset: Tool[] = [];

/**
 * Connect to MongoDB database
 */
export const connect = async (): Promise<void> => {
  try {
    console.log(`Connecting to MongoDB at: ${config.MONGO_URI}`);
    
    client = new MongoClient(config.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Add authSource to try connecting without authentication
      authSource: 'admin',
      // Allow connecting without authentication for development
      authMechanism: 'SCRAM-SHA-256' as any,
    });

    await client.connect();
    
    // Test the connection
    try {
      await client.db('admin').command({ ping: 1 });
    } catch (pingError) {
      console.warn('⚠️ Ping command failed, but continuing with connection');
    }
    
    db = client.db(config.DB_NAME);
    collection = db.collection<Tool>(config.COLLECTION_NAME);
    
    isConnected = true;
    console.log(`✅ Connected to MongoDB database: ${config.DB_NAME}`);
    console.log(`📊 Using collection: ${config.COLLECTION_NAME}`);
    
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    isConnected = false;
    
    // For development, we'll continue without MongoDB
    console.warn('⚠️ Continuing without MongoDB connection for development');
    console.warn('⚠️ The API will run with limited functionality');
    
    // Comment the below line if you want to throw the error
    throw error;
  }
};

/**
 * Load all documents from MongoDB into memory
 */
export const loadAll = async (): Promise<Tool[]> => {
  if (!isConnected || !collection) {
    console.warn('⚠️ MongoDB not connected. Using empty dataset for development.');
    dataset = [];
    return dataset;
  }

  try {
    console.log('📥 Loading all documents from MongoDB...');
    
    const startTime = Date.now();
    const cursor = collection.find({});
    dataset = await cursor.toArray();
    const loadTime = Date.now() - startTime;
    
    console.log(`✅ Loaded ${dataset.length} documents in ${loadTime}ms`);
    console.log(`💾 Dataset stored in memory (${(JSON.stringify(dataset).length / 1024 / 1024).toFixed(2)} MB)`);

    // Debug: Log sample document structure
    if (dataset.length > 0) {
      const sampleDoc = dataset[0];
      if (sampleDoc) {
        // console.log('📝 Sample document structure:', JSON.stringify(sampleDoc, null, 2));
        console.log('🏷️  Document fields:', Object.keys(sampleDoc));
        console.log('🔍 Name field:', sampleDoc.name || 'N/A');
        console.log('📄 Description field:', sampleDoc.description || 'N/A');
      }
    }
    
    return dataset;
    
  } catch (error) {
    console.error('❌ Failed to load documents from MongoDB:', error);
    console.warn('⚠️ Using empty dataset for development');
    dataset = [];
    return dataset;
  }
};

/**
 * Reload the dataset from MongoDB (refresh in-memory data)
 */
export const reload = async (): Promise<Tool[]> => {
  console.log('🔄 Reloading dataset from MongoDB...');
  return await loadAll();
};

/**
 * Get the current in-memory dataset
 */
export const getDataset = (): Tool[] => {
  return [...dataset]; // Return a copy to prevent external mutations
};

/**
 * Get the original dataset (alias for getDataset for compatibility)
 */
export const getOriginalDataset = (): Tool[] => {
  return [...dataset]; // Return a copy to prevent external mutations
};

/**
 * Get dataset statistics
 */
export const getStats = () => {
  return {
    isConnected,
    count: dataset.length,
    memorySize: JSON.stringify(dataset).length,
    lastLoaded: dataset.length > 0 ? new Date().toISOString() : null
  };
};

/**
 * Close MongoDB connection
 */
export const disconnect = async (): Promise<void> => {
  if (client) {
    try {
      await client.close();
      client = null;
      db = null;
      collection = null;
      isConnected = false;
      console.log('🔌 Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }
};

/**
 * Health check for MongoDB connection
 */
export const healthCheck = async (): Promise<boolean> => {
  if (!isConnected || !client) {
    return false;
  }

  try {
    await client.db('admin').command({ ping: 1 });
    return true;
  } catch (error) {
    console.error('❌ MongoDB health check failed:', error);
    isConnected = false;
    return false;
  }
};

// Export connection state for external access
export { isConnected, dataset };
