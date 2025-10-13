import { multiVectorSearchService } from './multi-vector-search.service';
import { MultiVectorSearchConfig } from '@/config/enhanced-search-config';

/**
 * Example usage of the MultiVectorSearchService
 * 
 * This file demonstrates how to use the multi-vector search service
 * for performing searches across different vector types.
 */

async function demonstrateMultiVectorSearch() {
  console.log('🔍 Multi-Vector Search Service Example');
  console.log('=====================================\n');

  try {
    // Initialize the service
    console.log('1. Initializing multi-vector search service...');
    await multiVectorSearchService.initialize();
    console.log('✅ Service initialized successfully\n');

    // Display current configuration
    console.log('2. Current configuration:');
    const config = multiVectorSearchService.getConfig();
    console.log(`   - Enabled: ${config.enabled}`);
    console.log(`   - Vector Types: ${config.vectorTypes.join(', ')}`);
    console.log(`   - Merge Strategy: ${config.mergeStrategy}`);
    console.log(`   - Max Results Per Vector: ${config.maxResultsPerVector}`);
    console.log(`   - Parallel Search: ${config.parallelSearchEnabled}`);
    console.log(`   - Deduplication: ${config.deduplicationEnabled}\n`);

    // Perform basic multi-vector search
    console.log('3. Performing basic multi-vector search...');
    const basicQuery = 'react components for dashboard';
    const basicResults = await multiVectorSearchService.searchMultiVector(basicQuery, {
      limit: 10,
      vectorTypes: ['semantic']
    });

    console.log(`   Query: "${basicQuery}"`);
    console.log(`   Results found: ${Object.values(basicResults.vectorSearchResults).flat().length}`);
    console.log(`   Search metrics:`, basicResults.searchMetrics);
    console.log(`   Merge strategy used: ${basicResults.mergeStrategy}\n`);

    // Perform advanced multi-vector search with multiple vector types
    console.log('4. Performing advanced multi-vector search...');
    const advancedQuery = 'free api library for nodejs';
    const advancedResults = await multiVectorSearchService.searchMultiVector(advancedQuery, {
      limit: 15,
      vectorTypes: ['semantic', 'categories', 'functionality'],
      filter: {
        must: [
          { key: 'pricing_model', match: { value: 'free' } }
        ]
      }
    });

    console.log(`   Query: "${advancedQuery}"`);
    console.log(`   Vector types searched: ${Object.keys(advancedResults.vectorSearchResults).join(', ')}`);
    
    // Display results by vector type
    Object.entries(advancedResults.vectorSearchResults).forEach(([vectorType, results]) => {
      console.log(`   - ${vectorType}: ${results.length} results`);
    });
    
    console.log(`   Total unique results: ${Object.values(advancedResults.vectorSearchResults).flat().length}\n`);

    // Demonstrate different merge strategies
    console.log('5. Testing different merge strategies...');
    
    const mergeStrategies = ['reciprocal_rank_fusion', 'weighted_average', 'custom'] as const;
    
    for (const strategy of mergeStrategies) {
      console.log(`   Testing ${strategy} strategy...`);
      
      // Update configuration
      multiVectorSearchService.updateConfig({ mergeStrategy: strategy });
      
      const results = await multiVectorSearchService.searchMultiVector('javascript framework', {
        limit: 5,
        vectorTypes: ['semantic', 'categories']
      });
      
      console.log(`   - Results: ${Object.values(results.vectorSearchResults).flat().length}`);
      console.log(`   - Merge time: ${results.searchMetrics.mergeTime || 'N/A'}ms`);
    }
    console.log();

    // Demonstrate configuration updates
    console.log('6. Updating service configuration...');
    const newConfig: Partial<MultiVectorSearchConfig> = {
      maxResultsPerVector: 25,
      rrfKValue: 100,
      deduplicationThreshold: 0.85,
      sourceAttributionEnabled: true
    };

    multiVectorSearchService.updateConfig(newConfig);
    const updatedConfig = multiVectorSearchService.getConfig();
    
    console.log(`   Updated max results per vector: ${updatedConfig.maxResultsPerVector}`);
    console.log(`   Updated RRF K value: ${updatedConfig.rrfKValue}`);
    console.log(`   Updated deduplication threshold: ${updatedConfig.deduplicationThreshold}`);
    console.log(`   Source attribution enabled: ${updatedConfig.sourceAttributionEnabled}\n`);

    // Demonstrate caching
    console.log('7. Testing caching functionality...');
    const cacheQuery = 'machine learning tools';
    
    console.log('   Performing first search (cache miss)...');
    const startTime1 = Date.now();
    await multiVectorSearchService.searchMultiVector(cacheQuery, { limit: 10 });
    const firstSearchTime = Date.now() - startTime1;
    
    console.log('   Performing second search (cache hit)...');
    const startTime2 = Date.now();
    await multiVectorSearchService.searchMultiVector(cacheQuery, { limit: 10 });
    const secondSearchTime = Date.now() - startTime2;
    
    console.log(`   First search time: ${firstSearchTime}ms`);
    console.log(`   Second search time: ${secondSearchTime}ms`);
    console.log(`   Performance improvement: ${firstSearchTime - secondSearchTime}ms (${((firstSearchTime - secondSearchTime) / firstSearchTime * 100).toFixed(1)}%)`);
    
    const cacheStats = multiVectorSearchService.getCacheStats();
    console.log(`   Cache size: ${cacheStats.size} entries\n`);

    // Health check
    console.log('8. Performing health check...');
    const health = await multiVectorSearchService.healthCheck();
    console.log(`   Service status: ${health.status}`);
    console.log(`   Qdrant connection: ${health.details.qdrantConnection}`);
    console.log(`   Available vector types: ${health.details.vectorTypes.join(', ')}\n`);

    // Performance metrics
    console.log('9. Performance metrics:');
    const metrics = multiVectorSearchService.getLastSearchMetrics();
    if (metrics) {
      console.log(`   Total search time: ${metrics.totalSearchTime}ms`);
      console.log(`   Vector type metrics:`, metrics.vectorTypeMetrics);
      console.log(`   Merge time: ${metrics.mergeTime}ms`);
    } else {
      console.log('   No recent search metrics available');
    }
    console.log();

    console.log('✅ Multi-vector search example completed successfully!');

  } catch (error) {
    console.error('❌ Error in multi-vector search example:', error);
    
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  demonstrateMultiVectorSearch().catch(console.error);
}

export { demonstrateMultiVectorSearch };
