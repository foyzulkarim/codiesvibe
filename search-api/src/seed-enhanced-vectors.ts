#!/usr/bin/env node

/**
 * Enhanced Vector Seeding Script
 *
 * This script seeds the enhanced Qdrant collection with multi-vector embeddings
 * for all existing tools in the MongoDB database.
 *
 * Usage:
 *   npm run seed:enhanced-vectors
 *   npm run seed:enhanced-vectors -- --vectorTypes=semantic,entities.categories
 *   npm run seed:enhanced-vectors -- --batchSize=25
 *   npm run seed:enhanced-vectors -- --force
 */

import { enhancedVectorIndexingService } from './services/enhanced-vector-indexing.service.js';
import { qdrantService } from './services/qdrant.service.js';
import { shouldUseEnhancedCollection, getSupportedVectorTypes } from './config/database.js';
import { getEnabledVectorTypes as getEnhancedVectorTypes } from './config/enhanced-qdrant-schema.js';

// Parse command line arguments
const args = process.argv.slice(2);
const options: {
  vectorTypes?: string[];
  batchSize?: number;
  force?: boolean;
  validate?: boolean;
} = {};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--vectorTypes=')) {
    options.vectorTypes = arg.split('=')[1].split(',').map(v => v.trim());
  } else if (arg.startsWith('--batchSize=')) {
    options.batchSize = parseInt(arg.split('=')[1], 10);
  } else if (arg === '--force') {
    options.force = true;
  } else if (arg === '--validate') {
    options.validate = true;
  }
}

// Set defaults
if (!options.vectorTypes || options.vectorTypes.length === 0) {
  options.vectorTypes = shouldUseEnhancedCollection() ? getEnhancedVectorTypes() : getSupportedVectorTypes();
}
if (!options.batchSize) {
  options.batchSize = 25;
}

async function main() {
  console.log('🚀 Enhanced Vector Seeding Script');
  console.log('================================');
  console.log(`Using enhanced collection: ${shouldUseEnhancedCollection() ? 'Yes' : 'No'}`);
  console.log(`Vector types to process: ${options.vectorTypes.join(', ')}`);
  console.log(`Batch size: ${options.batchSize}`);
  console.log(`Force re-indexing: ${options.force ? 'Yes' : 'No'}`);
  console.log(`Validate after seeding: ${options.validate !== false ? 'Yes' : 'No'}`);
  console.log('');

  try {
    // Check if enhanced collection is available
    if (shouldUseEnhancedCollection()) {
      try {
        const collectionInfo = await qdrantService.getEnhancedCollectionInfo();
        console.log(`✅ Enhanced collection found with ${collectionInfo.points_count} points`);
      } catch (error) {
        console.error('❌ Enhanced collection not found. Please run the enhanced collection creation script first.');
        process.exit(1);
      }
    } else {
      console.log('⚠️ Using legacy collections (separate collection per vector type)');
    }

    // Force re-indexing if requested
    if (options.force) {
      console.log('🔄 Force re-indexing enabled - clearing existing vectors...');
      
      if (shouldUseEnhancedCollection()) {
        try {
          await qdrantService.clearEnhancedCollection();
          console.log('✅ Cleared enhanced collection');
        } catch (error) {
          console.warn('⚠️ Warning: Could not clear enhanced collection:', error);
        }
      } else {
        // Clear individual collections
        for (const vectorType of options.vectorTypes!) {
          try {
            await qdrantService.clearAllPointsForVectorType(vectorType);
            console.log(`✅ Cleared ${vectorType} collection`);
          } catch (error) {
            console.warn(`⚠️ Warning: Could not clear ${vectorType} collection:`, error);
          }
        }
      }
      console.log('');
    }

    // Validate before seeding (unless force is enabled)
    if (!options.force && options.validate !== false) {
      console.log('🔍 Validating current index state...');
      const beforeReport = await enhancedVectorIndexingService.validateMultiVectorIndex(options.vectorTypes);
      
      console.log(`📊 MongoDB tools: ${beforeReport.mongoToolCount}`);
      console.log(`📊 Qdrant vectors: ${beforeReport.qdrantVectorCount}`);
      
      if (beforeReport.missingVectors === 0 && beforeReport.orphanedVectors === 0) {
        console.log('✅ All tools already have complete vector representations');
        console.log('   Use --force to re-index all tools');
        process.exit(0);
      }
      
      console.log(`📊 Missing vectors: ${beforeReport.missingVectors}`);
      console.log(`📊 Orphaned vectors: ${beforeReport.orphanedVectors}`);
      console.log('');
    }

    // Start the indexing process
    console.log('🚀 Starting multi-vector indexing...');
    await enhancedVectorIndexingService.indexAllToolsMultiVector(options.vectorTypes, options.batchSize);
    
    // Validate after seeding
    if (options.validate !== false) {
      console.log('🔍 Validating index after seeding...');
      const afterReport = await enhancedVectorIndexingService.validateMultiVectorIndex(options.vectorTypes);
      
      console.log(`📊 MongoDB tools: ${afterReport.mongoToolCount}`);
      console.log(`📊 Qdrant vectors: ${afterReport.qdrantVectorCount}`);
      console.log(`📊 Missing vectors: ${afterReport.missingVectors}`);
      console.log(`📊 Orphaned vectors: ${afterReport.orphanedVectors}`);
      console.log(`📊 Collection healthy: ${afterReport.collectionHealthy ? 'Yes' : 'No'}`);
      console.log(`📊 Sample validation passed: ${afterReport.sampleValidationPassed ? 'Yes' : 'No'}`);
      
      // Print vector type health
      console.log('\n📊 Vector type health:');
      options.vectorTypes!.forEach(vectorType => {
        const health = afterReport.vectorTypeHealth[vectorType];
        const status = health.healthy ? '✅' : '❌';
        console.log(`   ${status} ${vectorType}: ${health.count} vectors${health.error ? ` (${health.error})` : ''}`);
      });
      
      // Print recommendations
      if (afterReport.recommendations.length > 0) {
        console.log('\n📋 Recommendations:');
        afterReport.recommendations.forEach(rec => {
          console.log(`   - ${rec}`);
        });
      }
      
      if (afterReport.missingVectors > 0) {
        console.log(`\n⚠️ Warning: ${afterReport.missingVectors} vectors are still missing`);
        console.log('   You may need to run the script again or check for data issues');
      }
      
      if (afterReport.sampleValidationPassed && afterReport.collectionHealthy) {
        console.log('\n🎉 Enhanced vector seeding completed successfully!');
      } else {
        console.log('\n⚠️ Enhanced vector seeding completed with issues');
        console.log('   Check the recommendations above for troubleshooting');
      }
    } else {
      console.log('\n🎉 Enhanced vector seeding completed!');
      console.log('   Run with --validate to check the index health');
    }
    
  } catch (error) {
    console.error('💥 Error during enhanced vector seeding:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutdown requested - stopping indexing process');
  enhancedVectorIndexingService.handleShutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutdown requested - stopping indexing process');
  enhancedVectorIndexingService.handleShutdown();
  process.exit(0);
});

// Run the main function
main().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
