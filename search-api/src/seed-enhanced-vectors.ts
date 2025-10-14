#!/usr/bin/env node

import { enhancedVectorIndexingService } from "./services/enhanced-vector-indexing.service";
import { getSupportedVectorTypes } from "./config/database";

// Command line argument parsing
const args = process.argv.slice(2);
const options = {
  force: args.includes('--force'),
  vectorTypes: [] as string[],
  batchSize: 50,
  help: args.includes('--help') || args.includes('-h')
};

// Parse vector types from command line
const vectorTypeIndex = args.findIndex(arg => arg === '--vector-types' || arg === '-v');
if (vectorTypeIndex !== -1 && args[vectorTypeIndex + 1]) {
  options.vectorTypes = args[vectorTypeIndex + 1].split(',').map(t => t.trim());
}

// Parse batch size
const batchSizeIndex = args.findIndex(arg => arg === '--batch-size' || arg === '-b');
if (batchSizeIndex !== -1 && args[batchSizeIndex + 1]) {
  const batchSize = parseInt(args[batchSizeIndex + 1]);
  if (!isNaN(batchSize) && batchSize > 0) {
    options.batchSize = batchSize;
  }
}

// Show help
if (options.help) {
  console.log(`
🚀 Enhanced Vector Seeding Script

Usage: npm run seed-enhanced-vectors [options]

Options:
  --force, -f           Force re-indexing (clears existing vectors)
  --vector-types, -v    Comma-separated list of vector types to index
                        (default: all supported types)
  --batch-size, -b      Batch size for processing (default: 50)
  --help, -h            Show this help message

Examples:
  npm run seed-enhanced-vectors
  npm run seed-enhanced-vectors -- --force
  npm run seed-enhanced-vectors -- --vector-types "semantic,entities.categories,entities.functionality"
  npm run seed-enhanced-vectors -- --force --batch-size 25

Available vector types:
${getSupportedVectorTypes().map(type => `  - ${type}`).join('\n')}
`);
  process.exit(0);
}

/**
 * Main seeding function
 */
async function seedEnhancedVectors(): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting enhanced vector seeding process...\n');
    
    // Determine which vector types to process
    const supportedTypes = getSupportedVectorTypes();
    const vectorTypesToProcess = options.vectorTypes.length > 0 
      ? options.vectorTypes.filter(type => supportedTypes.includes(type))
      : supportedTypes;
    
    if (vectorTypesToProcess.length === 0) {
      console.log('❌ No valid vector types specified');
      console.log('Available vector types:', supportedTypes.join(', '));
      process.exit(1);
    }
    
    console.log(`📋 Processing vector types: ${vectorTypesToProcess.join(', ')}`);
    console.log(`📦 Batch size: ${options.batchSize}`);
    console.log(`🔄 Force re-indexing: ${options.force}\n`);
    
    // Clear existing vectors if force flag is set
    if (options.force) {
      console.log('🔄 Force re-indexing enabled - clearing existing vectors...');
      const qdrantService = (await import('./services/qdrant.service')).qdrantService;
      
      for (const vectorType of vectorTypesToProcess) {
        try {
          await qdrantService.clearAllPointsForVectorType(vectorType);
          console.log(`✅ Cleared ${vectorType} collection`);
        } catch (error) {
          console.warn(`⚠️  Warning: Could not clear ${vectorType} collection:`, error);
        }
      }
      console.log('');
    }
    
    // Validate index before starting
    console.log('🔍 Validating current index state...');
    const beforeReport = await enhancedVectorIndexingService.validateMultiVectorIndex(vectorTypesToProcess);
    console.log(`📊 Current state: ${beforeReport.mongoToolCount} tools in MongoDB, ${beforeReport.qdrantVectorCount} vectors in Qdrant`);
    
    if (beforeReport.vectorTypeHealth) {
      console.log('📈 Vector type health:');
      Object.entries(beforeReport.vectorTypeHealth).forEach(([type, health]) => {
        const status = health.healthy ? '✅' : '❌';
        console.log(`   ${status} ${type}: ${health.count} vectors${health.error ? ` (${health.error})` : ''}`);
      });
    }
    console.log('');
    
    // Start the indexing process
    console.log('🚀 Starting multi-vector indexing...');
    await enhancedVectorIndexingService.indexAllToolsMultiVector(vectorTypesToProcess, options.batchSize);
    
    // Validate index after completion
    console.log('\n🔍 Validating final index state...');
    const afterReport = await enhancedVectorIndexingService.validateMultiVectorIndex(vectorTypesToProcess);
    
    const duration = Date.now() - startTime;
    const durationMinutes = Math.round(duration / 60000 * 10) / 10;
    
    console.log('\n📊 Final Results:');
    console.log(`⏱️  Duration: ${durationMinutes} minutes`);
    console.log(`📁 MongoDB tools: ${afterReport.mongoToolCount}`);
    console.log(`🔢 Qdrant vectors: ${afterReport.qdrantVectorCount}`);
    console.log(`✅ Overall health: ${afterReport.collectionHealthy ? 'HEALTHY' : 'ISSUES DETECTED'}`);
    
    if (afterReport.vectorTypeHealth) {
      console.log('\n📈 Vector Type Summary:');
      Object.entries(afterReport.vectorTypeHealth).forEach(([type, health]) => {
        const status = health.healthy ? '✅' : '❌';
        const expectedCount = afterReport.mongoToolCount;
        const actualCount = health.count;
        const completionPercent = Math.round((actualCount / expectedCount) * 100);
        console.log(`   ${status} ${type}: ${actualCount}/${expectedCount} (${completionPercent}%)${health.error ? ` - ${health.error}` : ''}`);
      });
    }
    
    // Show recommendations if any
    if (afterReport.recommendations.length > 0) {
      console.log('\n📝 Recommendations:');
      afterReport.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    // Success message
    if (afterReport.collectionHealthy && afterReport.sampleValidationPassed) {
      console.log('\n🎉 Enhanced vector seeding completed successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Enhanced vector seeding completed with issues. See recommendations above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Critical error during enhanced vector seeding:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutdown requested by user');
  if (enhancedVectorIndexingService.isShuttingDownActive) {
    console.log('✅ Shutdown already in progress');
  } else {
    console.log('🔄 Initiating graceful shutdown...');
    enhancedVectorIndexingService.handleShutdown();
  }
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Termination signal received');
  enhancedVectorIndexingService.handleShutdown();
});

// Run the seeding function
if (require.main === module) {
  seedEnhancedVectors().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

export { seedEnhancedVectors };
