import { connect, connection, disconnect } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Logger } from '@nestjs/common';

/**
 * Enhanced Test Database Configuration for Tool Schema Validation
 * 
 * This module provides test database setup specifically configured for
 * testing the enhanced tool schema with comprehensive validation,
 * text search capabilities, and performance indexes.
 */

let mongoServer: MongoMemoryServer;

export const EnhancedTestDatabaseConfig = {
  /**
   * Initialize MongoDB memory server with enhanced text search configuration
   * Required for testing the new tool schema fields and search functionality
   */
  async initialize(): Promise<void> {
    try {
      // Create MongoDB memory server with specific configuration for text search
      mongoServer = await MongoMemoryServer.create({
        binary: {
          version: '6.0.0' // Use MongoDB version that supports our text index features
        },
        instance: {
          port: undefined, // Auto-assign port
          dbName: 'enhanced_tool_test_db',
          storageEngine: 'wiredTiger' // Recommended for text search and indexing
        }
      });

      const mongoUri = mongoServer.getUri();
      
      // Connect with enhanced configuration
      await connect(mongoUri, {
        // Connection optimization for testing
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        
        // Required for text search and performance testing
        appName: 'EnhancedToolTest',
        
        // Ensure proper index creation
        bufferMaxEntries: 0,
        connectTimeoutMS: 10000
      });

      Logger.log('Enhanced test database initialized successfully', 'TestDatabase');
      
      // Verify text search capabilities
      await this.verifyTextSearchSupport();
      
    } catch (error) {
      Logger.error(`Failed to initialize enhanced test database: ${error.message}`, error.stack, 'TestDatabase');
      throw error;
    }
  },

  /**
   * Verify that MongoDB instance supports our text search requirements
   */
  async verifyTextSearchSupport(): Promise<void> {
    try {
      const db = connection.db;
      const admin = db.admin();
      
      // Check MongoDB version supports text search
      const buildInfo = await admin.buildInfo();
      const version = buildInfo.version;
      const [major, minor] = version.split('.').map(Number);
      
      if (major < 4 || (major === 4 && minor < 2)) {
        throw new Error(`MongoDB version ${version} does not support all text search features. Required: 4.2+`);
      }
      
      Logger.log(`MongoDB version ${version} supports enhanced text search`, 'TestDatabase');
      
    } catch (error) {
      Logger.error(`Text search verification failed: ${error.message}`, error.stack, 'TestDatabase');
      throw error;
    }
  },

  /**
   * Clean up database between test runs
   * Removes all collections and resets indexes
   */
  async cleanup(): Promise<void> {
    try {
      if (connection.readyState === 1) { // Connected
        const collections = connection.collections;
        
        // Drop all collections to ensure clean test state
        for (const key in collections) {
          await collections[key].deleteMany({});
        }
        
        Logger.log('Database cleanup completed', 'TestDatabase');
      }
    } catch (error) {
      Logger.error(`Database cleanup failed: ${error.message}`, error.stack, 'TestDatabase');
      throw error;
    }
  },

  /**
   * Verify indexes are created correctly for enhanced schema
   * This ensures our MongoDB indexes are working as expected
   */
  async verifyIndexes(): Promise<void> {
    try {
      if (connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      const db = connection.db;
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        const indexes = await db.collection(collection.name).indexes();
        Logger.log(`Collection "${collection.name}" indexes: ${indexes.length} found`, 'TestDatabase');
        
        // Verify specific indexes we need for enhanced tool schema
        const indexNames = indexes.map(idx => idx.name);
        const requiredIndexes = [
          'tool_enhanced_search_index',
          'tool_popularity_index', 
          'tool_rating_index',
          'tool_functionality_index',
          'tool_deployment_index',
          'tool_tags_primary_index',
          'tool_tags_secondary_index'
        ];
        
        for (const requiredIndex of requiredIndexes) {
          if (indexNames.includes(requiredIndex)) {
            Logger.log(`✓ Index "${requiredIndex}" exists`, 'TestDatabase');
          }
        }
      }
    } catch (error) {
      Logger.error(`Index verification failed: ${error.message}`, error.stack, 'TestDatabase');
      throw error;
    }
  },

  /**
   * Close database connection and cleanup resources
   */
  async close(): Promise<void> {
    try {
      if (connection.readyState === 1) { // Connected
        await disconnect();
      }
      
      if (mongoServer) {
        await mongoServer.stop();
      }
      
      Logger.log('Enhanced test database closed successfully', 'TestDatabase');
    } catch (error) {
      Logger.error(`Failed to close test database: ${error.message}`, error.stack, 'TestDatabase');
      throw error;
    }
  },

  /**
   * Get current database state for debugging
   */
  async getDatabaseState(): Promise<any> {
    try {
      if (connection.readyState !== 1) {
        return { status: 'disconnected' };
      }

      const db = connection.db;
      const collections = await db.listCollections().toArray();
      const stats = await db.stats();
      
      return {
        status: 'connected',
        database: db.databaseName,
        collections: collections.map(c => c.name),
        stats: {
          dataSize: stats.dataSize,
          indexSize: stats.indexSize,
          collections: stats.collections,
          indexes: stats.indexes
        }
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
};

/**
 * Test helper function for setting up enhanced tool schema tests
 */
export async function setupEnhancedToolTestDatabase(): Promise<void> {
  await EnhancedTestDatabaseConfig.initialize();
  await EnhancedTestDatabaseConfig.verifyIndexes();
}

/**
 * Test helper function for cleaning up after enhanced tool schema tests
 */
export async function cleanupEnhancedToolTestDatabase(): Promise<void> {
  await EnhancedTestDatabaseConfig.cleanup();
}

/**
 * Test helper function for closing enhanced tool schema test database
 */
export async function closeEnhancedToolTestDatabase(): Promise<void> {
  await EnhancedTestDatabaseConfig.close();
}