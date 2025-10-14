import dotenv from 'dotenv';
import { contextEnrichmentService } from '../src/services/context-enrichment.service';
import { qdrantService } from '../src/services/qdrant.service';
import { mongoDBService } from '../src/services/mongodb.service';
import { embeddingService } from '../src/services/embedding.service';
import { multiVectorSearchService } from '../src/services/multi-vector-search.service';
import { connectToMongoDB, connectToQdrant } from '../src/config/database';
import { initializeDebugServices, validateEnvironment as validateEnv } from './utils/debug-init';

// Load environment variables
dotenv.config();

interface TestCase {
  name: string;
  query: string;
  expectedEntities?: string[];
  description: string;
}

const testCases: TestCase[] = [
  {
    name: 'Basic Tech Query',
    query: 'react components for dashboard',
    expectedEntities: ['categories', 'interfaces', 'pricing'],
    description: 'Test basic technology-focused query enrichment'
  },
  {
    name: 'API Tools Query',
    query: 'free api tools for developers',
    expectedEntities: ['categories', 'pricing', 'interfaces'],
    description: 'Test API-focused query with pricing considerations'
  },
  {
    name: 'Project Management Query',
    query: 'project management tools with team collaboration',
    expectedEntities: ['categories', 'interfaces', 'pricing'],
    description: 'Test business tool query enrichment'
  },
  {
    name: 'Development Environment Query',
    query: 'code editors with syntax highlighting',
    expectedEntities: ['categories', 'interfaces'],
    description: 'Test development tool query enrichment'
  },
  {
    name: 'Database Query',
    query: 'nosql databases for web applications',
    expectedEntities: ['categories', 'interfaces', 'pricing'],
    description: 'Test database-focused query enrichment'
  }
];

// Removed - functionality now handled by debug-init utility

// Removed - functionality now handled by debug-init utility

async function initializeContextEnrichmentService(): Promise<void> {
  console.log('\n🚀 Initializing Context Enrichment Service...');
  
  try {
    await contextEnrichmentService.initialize();
    console.log('✅ Context enrichment service initialized successfully');

    // Display current configuration
    const config = contextEnrichmentService.getConfig();
    console.log('\n📋 Current Configuration:');
    console.log(`  - Enabled: ${config.enabled}`);
    console.log(`  - Strategy: ${config.enrichmentStrategy}`);
    console.log(`  - Max Entities Per Query: ${config.maxEntitiesPerQuery}`);
    console.log(`  - Min Sample Size: ${config.minSampleSize}`);
    console.log(`  - Confidence Threshold: ${config.confidenceThreshold}`);
    console.log(`  - Cache Enabled: ${config.cacheEnabled}`);
    console.log(`  - Cache TTL: ${config.cacheTTL}ms`);
    console.log(`  - Max Processing Time: ${config.maxProcessingTime}ms`);
    console.log(`  - Fallback Enabled: ${config.fallbackEnabled}`);

  } catch (error) {
    console.error('❌ Failed to initialize context enrichment service:', error);
    throw error;
  }
}

async function runContextEnrichmentTest(testCase: TestCase): Promise<void> {
  console.log(`\n🧪 Running Test: ${testCase.name}`);
  console.log(`📝 Description: ${testCase.description}`);
  console.log(`🔍 Query: "${testCase.query}"`);

  const startTime = Date.now();

  try {
    const result = await contextEnrichmentService.enrichContext(testCase.query);
    const processingTime = Date.now() - startTime;

    console.log(`⏱️  Processing Time: ${processingTime}ms`);
    console.log(`📊 Entity Statistics Found: ${Object.keys(result.entityStatistics).length}`);

    // Display entity statistics
    for (const [entityType, stats] of Object.entries(result.entityStatistics)) {
      console.log(`\n  📈 ${entityType.toUpperCase()} Statistics:`);
      console.log(`    - Total Count: ${stats.totalCount}`);
      console.log(`    - Confidence: ${(stats.confidence * 100).toFixed(1)}%`);
      
      if (stats.commonCategories && stats.commonCategories.length > 0) {
        console.log(`    - Common Categories: ${stats.commonCategories.slice(0, 3).join(', ')}`);
      }
      
      if (stats.commonInterfaces && stats.commonInterfaces.length > 0) {
        console.log(`    - Common Interfaces: ${stats.commonInterfaces.slice(0, 3).join(', ')}`);
      }
      
      if (stats.commonPricing && stats.commonPricing.length > 0) {
        console.log(`    - Common Pricing: ${stats.commonPricing.slice(0, 3).join(', ')}`);
      }

      if (stats.confidenceBreakdown) {
        console.log(`    - Confidence Breakdown:`);
        console.log(`      * Data Quality: ${(stats.confidenceBreakdown.dataQuality * 100).toFixed(1)}%`);
        console.log(`      * Sample Size: ${(stats.confidenceBreakdown.sampleSize * 100).toFixed(1)}%`);
        console.log(`      * Vector Consistency: ${(stats.confidenceBreakdown.consistency * 100).toFixed(1)}%`);
      }

      if (stats.qualityIndicators) {
        console.log(`    - Quality Indicators:`);
        console.log(`      * Source Diversity: ${(stats.qualityIndicators.sourceDiversity * 100).toFixed(1)}%`);
        console.log(`      * Cross Validation: ${(stats.qualityIndicators.crossValidationScore * 100).toFixed(1)}%`);
      }
    }

    // Display metadata context
    console.log(`\n  🔍 Metadata Context:`);
    console.log(`    - Search Space Size: ${result.metadataContext.searchSpaceSize}`);
    console.log(`    - Metadata Confidence: ${(result.metadataContext.metadataConfidence * 100).toFixed(1)}%`);
    console.log(`    - Enrichment Strategy: ${result.metadataContext.enrichmentStrategy}`);
    console.log(`    - Processing Time: ${result.metadataContext.processingTime}ms`);
    
    if (result.metadataContext.assumptions && result.metadataContext.assumptions.length > 0) {
      console.log(`    - Assumptions: ${result.metadataContext.assumptions.slice(0, 2).join(', ')}`);
    }

    // Display semantic contexts if available
    if (result.semanticContexts && Object.keys(result.semanticContexts).length > 0) {
      console.log(`\n  🧠 Semantic Contexts Generated: ${Object.keys(result.semanticContexts).length}`);
      for (const [entityName, context] of Object.entries(result.semanticContexts)) {
        console.log(`    - ${entityName}: ${typeof context === 'string' ? context.substring(0, 100) + '...' : 'Complex object'}`);
      }
    }

    // Validate expected entities if provided
    if (testCase.expectedEntities) {
      const foundEntities = Object.keys(result.entityStatistics);
      const missingEntities = testCase.expectedEntities.filter(entity => !foundEntities.includes(entity));
      
      if (missingEntities.length === 0) {
        console.log(`✅ All expected entities found: ${foundEntities.join(', ')}`);
      } else {
        console.log(`⚠️  Missing expected entities: ${missingEntities.join(', ')}`);
        console.log(`   Found entities: ${foundEntities.join(', ')}`);
      }
    }

    console.log(`✅ Test "${testCase.name}" completed successfully`);

  } catch (error) {
    console.error(`❌ Test "${testCase.name}" failed:`, error);
    throw error;
  }
}

async function testCachePerformance(): Promise<void> {
  console.log('\n🚀 Testing Cache Performance...');

  const testQuery = 'react components for dashboard';
  
  // First run (no cache)
  console.log('First run (no cache):');
  const startTime1 = Date.now();
  await contextEnrichmentService.enrichContext(testQuery);
  const time1 = Date.now() - startTime1;
  console.log(`  Time: ${time1}ms`);

  // Second run (with cache)
  console.log('Second run (with cache):');
  const startTime2 = Date.now();
  await contextEnrichmentService.enrichContext(testQuery);
  const time2 = Date.now() - startTime2;
  console.log(`  Time: ${time2}ms`);

  const speedup = time1 / time2;
  console.log(`📈 Cache speedup: ${speedup.toFixed(2)}x faster`);

  // Display cache stats
  const cacheStats = contextEnrichmentService.getCacheStats();
  console.log(`📊 Cache Stats: ${cacheStats.size} entries, ${cacheStats.totalHits} hits, ${cacheStats.totalMisses} misses`);
}

async function testConfigurationUpdates(): Promise<void> {
  console.log('\n⚙️  Testing Configuration Updates...');

  // Get original configuration
  const originalConfig = contextEnrichmentService.getConfig();
  console.log('Original max entities per query:', originalConfig.maxEntitiesPerQuery);

  // Update configuration
  contextEnrichmentService.updateConfig({
    maxEntitiesPerQuery: 15,
    confidenceThreshold: 0.7,
    minSampleSize: 20
  });

  const updatedConfig = contextEnrichmentService.getConfig();
  console.log('Updated max entities per query:', updatedConfig.maxEntitiesPerQuery);
  console.log('Updated confidence threshold:', updatedConfig.confidenceThreshold);
  console.log('Updated min sample size:', updatedConfig.minSampleSize);

  // Test with updated configuration
  const result = await contextEnrichmentService.enrichContext('api testing tools');
  console.log(`✅ Configuration update test completed. Found ${Object.keys(result.entityStatistics).length} entity types`);

  // Restore original configuration
  contextEnrichmentService.updateConfig(originalConfig);
  console.log('✅ Original configuration restored');
}

async function runAllTests(): Promise<void> {
  console.log('🎯 Starting Context Enrichment Service Debug Tests');
  console.log('=' .repeat(60));

  try {
    // Validate environment
    validateEnv(['MONGODB_URI', 'QDRANT_HOST', 'QDRANT_PORT']);

    // Initialize all debug services
    await initializeDebugServices();

    // Initialize context enrichment service
    await initializeContextEnrichmentService();

    // Run individual test cases
    console.log('\n📋 Running Individual Test Cases...');
    for (const testCase of testCases) {
      await runContextEnrichmentTest(testCase);
    }

    // Test cache performance
    await testCachePerformance();

    // Test configuration updates
    await testConfigurationUpdates();

    console.log('\n🎉 All Context Enrichment Tests Completed Successfully!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n💥 Context Enrichment Tests Failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n✅ Debug script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Debug script failed:', error);
      process.exit(1);
    });
}

export { runAllTests, testCases };