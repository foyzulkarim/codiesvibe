#!/usr/bin/env ts-node

/**
 * Script to create fresh Qdrant collections with enhanced multi-vector schema
 * This script creates the enhanced collection with named vectors support
 */

import { QdrantClient } from "@qdrant/js-client-rest";
import { connectToQdrant, qdrantConfig } from "@/config/database";
import { 
  enhancedCollectionConfig, 
  enhancedCollectionNames, 
  defaultEnhancedCollectionOptions,
  getEnabledVectorTypes,
  validateEnhancedVectors
} from "@/config/enhanced-qdrant-schema";

interface CollectionCreationResult {
  success: boolean;
  collectionName: string;
  vectorTypes: string[];
  error?: string;
}

interface ScriptResults {
  enhancedCollection: CollectionCreationResult;
  legacyCollections: CollectionCreationResult[];
  summary: {
    totalCreated: number;
    totalErrors: number;
    executionTime: number;
  };
}

/**
 * Create enhanced collection with named vectors
 */
async function createEnhancedCollection(client: QdrantClient): Promise<CollectionCreationResult> {
  const collectionName = enhancedCollectionNames.primary;
  const enabledVectorTypes = getEnabledVectorTypes();
  
  try {
    console.log(`🔧 Creating enhanced collection: ${collectionName}`);
    console.log(`   Vector types: ${enabledVectorTypes.join(', ')}`);
    console.log(`   Dimensions: 1024 for all vectors`);
    console.log(`   Distance: Cosine for all vectors`);

    // Check if collection already exists
    const existingCollections = await client.getCollections();
    const exists = existingCollections.collections.some(c => c.name === collectionName);
    
    if (exists) {
      console.log(`⚠️  Collection ${collectionName} already exists`);
      return {
        success: false,
        collectionName,
        vectorTypes: enabledVectorTypes,
        error: "Collection already exists"
      };
    }

    // Create collection with enhanced schema
    await client.createCollection(collectionName, defaultEnhancedCollectionOptions);
    
    console.log(`✅ Successfully created enhanced collection: ${collectionName}`);
    
    // Verify collection was created with correct configuration
    const collectionInfo = await client.getCollection(collectionName);
    console.log(`   Points count: ${collectionInfo.points_count || 0}`);
    console.log(`   Vector config: ${Object.keys(collectionInfo.config.params.vectors || {}).join(', ')}`);

    return {
      success: true,
      collectionName,
      vectorTypes: enabledVectorTypes
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to create enhanced collection ${collectionName}:`, errorMessage);
    return {
      success: false,
      collectionName,
      vectorTypes: enabledVectorTypes,
      error: errorMessage
    };
  }
}

/**
 * Create legacy collections for backward compatibility
 */
async function createLegacyCollections(client: QdrantClient): Promise<CollectionCreationResult[]> {
  const results: CollectionCreationResult[] = [];
  
  try {
    console.log(`\n🔧 Creating legacy collections for backward compatibility`);
    
    const existingCollections = await client.getCollections();
    const existingNames = existingCollections.collections.map(c => c.name);

    for (const [vectorType, collectionName] of Object.entries(qdrantConfig.collectionNames)) {
      try {
        const vectorConfig = qdrantConfig.multiVectorsConfig[vectorType as keyof typeof qdrantConfig.multiVectorsConfig];
        if (!vectorConfig) {
          console.warn(`⚠️  No vector config found for type: ${vectorType}`);
          continue;
        }

        const collectionNameStr = String(collectionName);
        if (existingNames.includes(collectionNameStr)) {
          console.log(`⚠️  Legacy collection ${collectionNameStr} already exists`);
          results.push({
            success: false,
            collectionName: collectionNameStr,
            vectorTypes: [vectorType],
            error: "Collection already exists"
          });
          continue;
        }

        await client.createCollection(collectionNameStr, {
          vectors: vectorConfig,
        });
        
        console.log(`✅ Created legacy collection: ${collectionNameStr} (${vectorType})`);
        
        results.push({
          success: true,
          collectionName: collectionNameStr,
          vectorTypes: [vectorType]
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const collectionNameStr = String(collectionName);
        console.error(`❌ Failed to create legacy collection ${collectionNameStr}:`, errorMessage);
        results.push({
          success: false,
          collectionName: collectionNameStr,
          vectorTypes: [vectorType],
          error: errorMessage
        });
      }
    }
  } catch (error) {
    console.error("❌ Failed to create legacy collections:", error);
  }

  return results;
}

/**
 * Validate enhanced collection configuration
 */
function validateEnhancedConfiguration(): boolean {
  try {
    console.log(`🔍 Validating enhanced collection configuration`);
    
    // Validate vector configurations
    const enabledTypes = getEnabledVectorTypes();
    if (enabledTypes.length === 0) {
      console.error(`❌ No enabled vector types found`);
      return false;
    }

    // Test validation with sample vectors
    const sampleVectors: { [vectorType: string]: number[] } = {};
    for (const vectorType of enabledTypes) {
      sampleVectors[vectorType] = new Array(1024).fill(0).map((_, i) => Math.random());
    }

    validateEnhancedVectors(sampleVectors);
    console.log(`✅ Configuration validation passed for ${enabledTypes.length} vector types`);
    
    return true;
  } catch (error) {
    console.error(`❌ Configuration validation failed:`, error);
    return false;
  }
}

/**
 * Display collection information
 */
async function displayCollectionInfo(client: QdrantClient): Promise<void> {
  try {
    console.log(`\n📊 Collection Information:`);
    
    const collections = await client.getCollections();
    console.log(`   Total collections: ${collections.collections.length}`);
    
    for (const collection of collections.collections) {
      try {
        const info = await client.getCollection(collection.name);
        const vectorCount = info.points_count || 0;
        const vectorTypes = Object.keys(info.config.params.vectors || {});
        
        console.log(`   - ${collection.name}: ${vectorCount} points, vectors: ${vectorTypes.join(', ')}`);
      } catch (error) {
        console.log(`   - ${collection.name}: Error getting info`);
      }
    }
  } catch (error) {
    console.error("❌ Failed to get collection information:", error);
  }
}

/**
 * Main script execution
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  
  console.log("🚀 Starting enhanced Qdrant collection creation");
  console.log(`   Target: ${qdrantConfig.host}:${qdrantConfig.port}`);
  console.log(`   Enhanced collection: ${enhancedCollectionNames.primary}`);
  
  try {
    // Validate configuration
    if (!validateEnhancedConfiguration()) {
      process.exit(1);
    }

    // Connect to Qdrant
    console.log(`\n🔌 Connecting to Qdrant...`);
    const client = await connectToQdrant();
    console.log(`✅ Connected to Qdrant`);

    // Create enhanced collection
    const enhancedResult = await createEnhancedCollection(client);
    
    // Create legacy collections
    const legacyResults = await createLegacyCollections(client);
    
    // Display collection information
    await displayCollectionInfo(client);

    // Calculate results
    const endTime = Date.now();
    const totalCreated = [enhancedResult, ...legacyResults].filter(r => r.success).length;
    const totalErrors = [enhancedResult, ...legacyResults].filter(r => !r.success).length;
    
    const results: ScriptResults = {
      enhancedCollection: enhancedResult,
      legacyCollections: legacyResults,
      summary: {
        totalCreated,
        totalErrors,
        executionTime: endTime - startTime
      }
    };

    // Display summary
    console.log(`\n📋 Execution Summary:`);
    console.log(`   Enhanced collection: ${enhancedResult.success ? '✅ Created' : '❌ Failed'}`);
    console.log(`   Legacy collections: ${legacyResults.filter(r => r.success).length}/${legacyResults.length} created`);
    console.log(`   Total created: ${results.summary.totalCreated}`);
    console.log(`   Total errors: ${results.summary.totalErrors}`);
    console.log(`   Execution time: ${results.summary.executionTime}ms`);

    if (results.summary.totalErrors > 0) {
      console.log(`\n⚠️  Some collections failed to create. Check the logs above for details.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All collections created successfully!`);
      console.log(`\n💡 To use the enhanced collection, set environment variable:`);
      console.log(`   QDRANT_USE_ENHANCED_COLLECTION=true`);
    }
  } catch (error) {
    console.error(`❌ Script execution failed:`, error);
    process.exit(1);
  }
}

// Execute script if run directly
if (require.main === module) {
  main().catch(error => {
    console.error("❌ Unhandled error:", error);
    process.exit(1);
  });
}

export { main as createEnhancedCollections };
