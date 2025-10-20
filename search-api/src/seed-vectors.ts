#!/usr/bin/env node

import { vectorSeedingService } from './services/vector-seeding.service';
import { mongoDBService } from './services/mongodb.service';
import { qdrantService } from './services/qdrant.service';
import { embeddingService } from './services/embedding.service';

/**
 * Command line arguments interface
 */
interface SeedCommandOptions {
  force?: boolean;
  help?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArguments(): SeedCommandOptions {
  const args = process.argv.slice(2);
  const options: SeedCommandOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        console.error(`❌ Unknown argument: ${arg}`);
        options.help = true; // Show help on unknown argument
        break;
    }
  }

  return options;
}

/**
 * Display usage information
 */
function showUsage(): void {
  console.log(`
🌱 Vector Seeding Script

Usage: node dist/src/seed-vectors.js [options]

Options:
  -f, --force    Force re-indexing of all tools (clears existing vectors)
  -h, --help     Show this help message

Description:
  This script seeds vector embeddings for all tools in MongoDB into Qdrant.
  It processes tools in batches and provides progress monitoring.

Examples:
  node dist/src/seed-vectors.js           # Normal seeding (skips already indexed tools)
  node dist/src/seed-vectors.js --force   # Force re-indexing of all tools

Exit Codes:
  0  Success
  1  Error during seeding
  2  Invalid arguments or configuration
`);
}

/**
 * Initialize all required services
 */
async function initializeServices(): Promise<void> {
  console.log('🔧 Initializing services...');
  
  try {
    // Test MongoDB connection
    console.log('  📦 Testing MongoDB connection...');
    await mongoDBService.getAllTools(); // This will throw if not connected
    console.log('  ✅ MongoDB connected');

    // Test Qdrant connection
    console.log('  🔍 Testing Qdrant connection...');
    await qdrantService.getCollectionInfo(); // This will throw if not connected
    console.log('  ✅ Qdrant connected');

    // Test embedding service
    console.log('  🧠 Testing embedding service...');
    await embeddingService.generateEmbedding('test');
    console.log('  ✅ Embedding service ready');

    console.log('✅ All services initialized successfully\n');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    throw error;
  }
}

/**
 * Cleanup services
 */
async function cleanupServices(): Promise<void> {
  try {
    console.log('🧹 Cleaning up services...');
    
    // Note: Services are singleton instances that don't need explicit cleanup
    // MongoDB and Qdrant connections will be cleaned up when the process exits
    
    console.log('✅ Service cleanup completed');
  } catch (error) {
    console.error('⚠️ Error during service cleanup:', error);
  }
}

/**
 * Progress callback for seeding operation
 */
function onProgress(progress: any): void {
  const percentage = progress.total > 0 ? 
    Math.round((progress.processed / progress.total) * 100) : 0;
  
  const elapsed = Date.now() - progress.startTime.getTime();
  const elapsedSeconds = Math.round(elapsed / 1000);
  
  console.log(
    `📊 Progress: ${progress.processed}/${progress.total} (${percentage}%) ` +
    `✅ ${progress.successful} ❌ ${progress.failed} ` +
    `⏱️ ${elapsedSeconds}s`
  );
}

/**
 * Main seeding function
 */
async function runSeeding(options: SeedCommandOptions): Promise<void> {
  const startTime = new Date();
  console.log(`🚀 Starting vector seeding at ${startTime.toISOString()}...\n`);

  try {
    // Initialize services
    await initializeServices();

    // Check if seeding is already in progress
    if (vectorSeedingService.isSeedingActive && !options.force) {
      console.log('⚠️ Seeding is already in progress. Use --force to override.');
      process.exit(2);
    }

    // Get current stats before seeding
    const beforeStats = vectorSeedingService.getSeedingStats();
    console.log(`📊 Current status: ${beforeStats.indexedTools}/${beforeStats.totalTools} tools indexed`);

    // Configure seeding options
    const seedingOptions = {
      force: options.force || false,
      batchSize: 50,
      validateAfter: true,
      onProgress,
      parallelProcessing: false,
    };

    // Start seeding
    if (options.force) {
      console.log('🔄 Force re-indexing enabled - all tools will be re-processed');
    }

    await vectorSeedingService.seedTools(seedingOptions);

    // Get final stats
    const afterStats = vectorSeedingService.getSeedingStats();
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    console.log('\n🎉 Vector seeding completed successfully!');
    console.log(`📊 Final status: ${afterStats.indexedTools}/${afterStats.totalTools} tools indexed`);
    console.log(`📈 Success rate: ${Math.round(afterStats.successRate)}%`);
    console.log(`⏱️ Total duration: ${duration}s`);

    // Get detailed health report
    const healthReport = await vectorSeedingService.getHealthReport();
    
    if (healthReport.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      healthReport.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    // Cleanup and exit
    await cleanupServices();
    process.exit(0);

  } catch (error) {
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    
    console.error('\n💥 Vector seeding failed!');
    console.error(`❌ Error: ${error}`);
    console.error(`⏱️ Failed after: ${duration}s`);
    
    // Get error details if available
    const stats = vectorSeedingService.getSeedingStats();
    if (stats.recentErrors.length > 0) {
      console.error('\n📋 Recent errors:');
      stats.recentErrors.forEach((err, index) => {
        console.error(`  ${index + 1}. [${err.timestamp.toISOString()}] ${err.message}`);
      });
    }
    
    // Cleanup and exit with error code
    await cleanupServices();
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const options = parseArguments();

  // Show help if requested
  if (options.help) {
    showUsage();
    process.exit(0);
  }

  // Run seeding
  await runSeeding(options);
}

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

/**
 * Handle process termination gracefully
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Process interrupted by user');
  process.exit(130); // Standard exit code for SIGINT
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Process terminated');
  process.exit(143); // Standard exit code for SIGTERM
});

// Execute main function if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Failed to start seeding process:', error);
    process.exit(1);
  });
}

export { main, runSeeding, parseArguments, showUsage };
