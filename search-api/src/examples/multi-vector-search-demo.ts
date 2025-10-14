/**
 * Enhanced Multi-Vector Search Demo
 * 
 * This script demonstrates the enhanced multi-vector search functionality with:
 * - Parallel search across multiple vector types
 * - Reciprocal Rank Fusion (RRF) with k=60
 * - Configurable merge strategies
 * - Result deduplication
 * - Source attribution and performance metrics
 */

import { multiVectorSearchService } from '../services/multi-vector-search.service';

async function demonstrateEnhancedMultiVectorSearch(): Promise<void> {
  console.log('🚀 Enhanced Multi-Vector Search Demo');
  console.log('=====================================');

  try {
    // Initialize the service
    console.log('\n1. Initializing multi-vector search service...');
    await multiVectorSearchService.initialize();
    console.log('✅ Service initialized successfully');

    // Get available vector types
    const vectorTypes = multiVectorSearchService.getAvailableVectorTypes();
    console.log(`\n2. Available vector types: ${vectorTypes.join(', ')}`);

    // Demonstrate different merge strategies
    const queries = [
      'react components for dashboard',
      'api library for nodejs',
      'free tools for development',
      'javascript frameworks'
    ];

    const mergeStrategies = ['reciprocal_rank_fusion', 'weighted_average', 'hybrid'];

    for (const query of queries) {
      console.log(`\n3. Searching for: "${query}"`);
      
      for (const strategy of mergeStrategies) {
        console.log(`\n   Using merge strategy: ${strategy}`);
        
        try {
          const startTime = Date.now();
          const result = await multiVectorSearchService.searchMultiVector(query, {
            limit: 10,
            vectorTypes: ['semantic', 'categories', 'functionality'],
            mergeStrategy: strategy,
            rrfKValue: 60,
            enableSourceAttribution: true
          });
          const searchTime = Date.now() - startTime;
          
          // Get performance metrics
          const metrics = multiVectorSearchService.getLastSearchMetrics();
          const vectorMetrics = multiVectorSearchService.getVectorTypeMetrics();
          
          console.log(`   ⏱️  Search completed in ${searchTime}ms`);
          console.log(`   📊 Total search time: ${metrics?.totalSearchTime}ms`);
          console.log(`   🔀 Merge time: ${metrics?.mergeTime}ms`);
          console.log(`   🔄 Deduplication time: ${metrics?.deduplicationTime}ms`);
          console.log(`   💾 Cache hit rate: ${metrics?.cacheHitRate || 0}`);
          
          // Display results summary
          let totalResults = 0;
          Object.entries(result.vectorSearchResults).forEach(([vectorType, results]) => {
            console.log(`   📈 ${vectorType}: ${results.length} results`);
            totalResults += results.length;
          });
          
          console.log(`   📋 Total results before deduplication: ${totalResults}`);
          
          // Display vector type performance
          console.log('   🔍 Vector Type Performance:');
          Object.entries(metrics?.vectorTypeMetrics || {}).forEach(([vectorType, metric]: [string, any]) => {
            console.log(`      ${vectorType}: ${metric.resultCount} results, ${metric.searchTime}ms, avg similarity: ${metric.avgSimilarity?.toFixed(3) || 'N/A'}`);
          });
          
        } catch (error) {
          console.log(`   ❌ Search failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    // Display overall performance report
    console.log('\n4. Performance Report');
    console.log('====================');
    const report = multiVectorSearchService.getPerformanceReport();
    
    console.log(`📊 Vector Types Performance:`);
    report.vectorTypes.forEach(metric => {
      console.log(`   ${metric.vectorType}:`);
      console.log(`     Search Time: ${metric.searchTime.toFixed(2)}ms`);
      console.log(`     Result Count: ${metric.resultCount.toFixed(1)}`);
      console.log(`     Avg Similarity: ${metric.avgSimilarity.toFixed(3)}`);
      console.log(`     Error Count: ${metric.errorCount}`);
      console.log(`     Timeout Count: ${metric.timeoutCount}`);
    });
    
    console.log(`\n⚙️  Configuration:`);
    console.log(`   Enabled: ${report.config.enabled}`);
    console.log(`   Vector Types: ${report.config.vectorTypes.join(', ')}`);
    console.log(`   Merge Strategy: ${report.config.mergeStrategy}`);
    console.log(`   RRF K Value: ${report.config.rrfKValue}`);
    console.log(`   Max Results Per Vector: ${report.config.maxResultsPerVector}`);
    console.log(`   Deduplication Enabled: ${report.config.deduplicationEnabled}`);
    console.log(`   Deduplication Threshold: ${report.config.deduplicationThreshold}`);
    console.log(`   Source Attribution Enabled: ${report.config.sourceAttributionEnabled}`);
    console.log(`   Parallel Search Enabled: ${report.config.parallelSearchEnabled}`);
    console.log(`   Search Timeout: ${report.config.searchTimeout}ms`);
    
    // Perform health check
    console.log('\n5. Health Check');
    console.log('===============');
    const healthStatus = await multiVectorSearchService.healthCheck();
    console.log(`Status: ${healthStatus.status}`);
    console.log(`Qdrant Connection: ${healthStatus.details.qdrantConnection}`);
    console.log(`Cache Size: ${healthStatus.details.cacheSize}`);
    
    console.log('\n✅ Demo completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
  } finally {
    // Clean up
    multiVectorSearchService.resetPerformanceMetrics();
    multiVectorSearchService.clearCache();
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateEnhancedMultiVectorSearch().catch(console.error);
}

export { demonstrateEnhancedMultiVectorSearch };
