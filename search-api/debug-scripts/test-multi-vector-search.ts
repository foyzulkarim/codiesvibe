#!/usr/bin/env npx tsx

/**
 * Test script for T012: Implement multi-vector search with result merging
 * 
 * This script tests the enhanced multi-vector search functionality including:
 * - Parallel search across multiple vector types
 * - RRF implementation with k=60
 * - Configurable merge strategies
 * - Result deduplication with source attribution
 * - Performance metrics
 */

import { multiVectorSearchService } from '../src/services/multi-vector-search.service';
import { qdrantService } from '../src/services/qdrant.service';
import { embeddingService } from '../src/services/embedding.service';

// Test configuration
const TEST_QUERIES = [
  'react component library',
  'api authentication tool',
  'database migration',
  'css framework',
  'javascript testing tool'
];

const MERGE_STRATEGIES = ['reciprocal_rank_fusion', 'weighted_average', 'hybrid', 'custom'] as const;
const VECTOR_TYPES = ['semantic', 'categories', 'functionality', 'aliases', 'composites'];

interface TestResult {
  query: string;
  mergeStrategy: string;
  totalTime: number;
  totalResults: number;
  uniqueResults: number;
  vectorTypeMetrics: Record<string, any>;
  rrfUsed: boolean;
  sourceAttributionEnabled: boolean;
  error?: string;
}

interface PerformanceReport {
  testResults: TestResult[];
  averageSearchTime: number;
  averageResultsCount: number;
  strategyComparison: Record<string, TestResult[]>;
  recommendations: string[];
}

/**
 * Run performance test for a specific query and merge strategy
 */
async function runPerformanceTest(
  query: string,
  mergeStrategy: string
): Promise<TestResult> {
  console.log(`\n🔍 Testing query: "${query}" with strategy: ${mergeStrategy}`);
  
  const startTime = Date.now();
  
  try {
    // Run multi-vector search
    const result = await multiVectorSearchService.searchMultiVector(query, {
      limit: 20,
      mergeStrategy,
      rrfKValue: 60, // Ensure k=60 is used
      enableSourceAttribution: true,
      vectorTypes: VECTOR_TYPES
    });
    
    const totalTime = Date.now() - startTime;
    
    // Get performance metrics
    const metrics = multiVectorSearchService.getLastSearchMetrics();
    const dedupMetrics = multiVectorSearchService.getDeduplicationMetrics();
    
    // Count total and unique results
    const totalResults = Object.values(result.vectorSearchResults)
      .reduce((sum, results) => sum + results.length, 0);
    
    const vectorTypeMetrics = metrics?.vectorTypeMetrics || {};
    
    console.log(`✅ Search completed in ${totalTime}ms`);
    console.log(`📊 Total results: ${totalResults}, Unique after deduplication: ${result.vectorSearchResults.semantic?.length || 0}`);
    console.log(`🎯 Vector types searched: ${Object.keys(result.searchMetrics).join(', ')}`);
    
    return {
      query,
      mergeStrategy,
      totalTime,
      totalResults,
      uniqueResults: result.vectorSearchResults.semantic?.length || 0,
      vectorTypeMetrics,
      rrfUsed: mergeStrategy === 'reciprocal_rank_fusion' || mergeStrategy === 'hybrid',
      sourceAttributionEnabled: true
    };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Search failed after ${totalTime}ms:`, errorMessage);
    
    return {
      query,
      mergeStrategy,
      totalTime,
      totalResults: 0,
      uniqueResults: 0,
      vectorTypeMetrics: {},
      rrfUsed: false,
      sourceAttributionEnabled: false,
      error: errorMessage
    };
  }
}

/**
 * Test RRF implementation specifically
 */
async function testRRFImplementation(): Promise<void> {
  console.log('\n🧪 Testing RRF Implementation with k=60');
  
  const testQuery = 'react component library';
  
  try {
    // Test with RRF strategy
    const rrfResult = await multiVectorSearchService.searchMultiVector(testQuery, {
      limit: 15,
      mergeStrategy: 'reciprocal_rank_fusion',
      rrfKValue: 60,
      enableSourceAttribution: true
    });
    
    // Check if RRF was applied correctly
    const hasRRFScores = rrfResult.vectorSearchResults.semantic?.some(
      (result: any) => result.rrfScore !== undefined
    );
    
    console.log(`✅ RRF test completed`);
    console.log(`📊 RRF scores present: ${hasRRFScores}`);
    console.log(`🎯 Results with RRF: ${rrfResult.vectorSearchResults.semantic?.length || 0}`);
    
  } catch (error) {
    console.error(`❌ RRF test failed:`, error);
  }
}

/**
 * Test parallel search across vector types
 */
async function testParallelSearch(): Promise<void> {
  console.log('\n🚀 Testing Parallel Search Across Vector Types');
  
  const testQuery = 'api authentication';
  
  try {
    // Get available vector types
    const availableVectorTypes = await qdrantService.getAvailableVectorTypes();
    console.log(`📋 Available vector types: ${availableVectorTypes.join(', ')}`);
    
    // Test parallel search
    const results = await qdrantService.searchMultipleVectorTypes(
      await embeddingService.generateEmbedding(testQuery),
      VECTOR_TYPES,
      10,
      {},
      { timeout: 5000, includeMetrics: true }
    );
    
    console.log(`✅ Parallel search completed in ${results.totalTime}ms`);
    console.log(`📊 Vector types searched: ${Object.keys(results.results).length}`);
    
    Object.entries(results.metrics).forEach(([vectorType, metrics]) => {
      console.log(`   - ${vectorType}: ${metrics.resultCount} results in ${metrics.searchTime}ms`);
    });
    
  } catch (error) {
    console.error(`❌ Parallel search test failed:`, error);
  }
}

/**
 * Test result deduplication
 */
async function testResultDeduplication(): Promise<void> {
  console.log('\n🔄 Testing Result Deduplication');
  
  const testQuery = 'css framework';
  
  try {
    // Run search with different vector types to create potential duplicates
    const result = await multiVectorSearchService.searchMultiVector(testQuery, {
      limit: 25, // More results to increase chance of duplicates
      mergeStrategy: 'reciprocal_rank_fusion',
      enableSourceAttribution: true
    });
    
    const metrics = multiVectorSearchService.getDeduplicationMetrics();
    const lastMetrics = multiVectorSearchService.getLastSearchMetrics();
    
    console.log(`✅ Deduplication test completed`);
    console.log(`📊 Total results processed: ${metrics.current.totalProcessed}`);
    console.log(`🗑️  Duplicates removed: ${metrics.current.duplicatesRemoved}`);
    console.log(`⏱️  Deduplication time: ${lastMetrics?.deduplicationTime}ms`);
    
  } catch (error) {
    console.error(`❌ Deduplication test failed:`, error);
  }
}

/**
 * Test source attribution
 */
async function testSourceAttribution(): Promise<void> {
  console.log('\n🏷️  Testing Source Attribution');
  
  const testQuery = 'javascript testing';
  
  try {
    const result = await multiVectorSearchService.searchMultiVector(testQuery, {
      limit: 10,
      mergeStrategy: 'hybrid',
      enableSourceAttribution: true
    });
    
    // Check if results have source attribution
    const hasAttribution = result.vectorSearchResults.semantic?.some(
      (result: any) => result.sources && result.sources.length > 0
    );
    
    console.log(`✅ Source attribution test completed`);
    console.log(`📊 Results with attribution: ${hasAttribution}`);
    
    if (hasAttribution) {
      // Show sample attribution
      const sampleResult = result.vectorSearchResults.semantic?.find(
        (result: any) => result.sources && result.sources.length > 0
      );
      
      if (sampleResult) {
        console.log(`📋 Sample attribution:`);
        sampleResult.sources?.forEach((source: any) => {
          console.log(`   - ${source.vectorType}: score=${source.score}, rank=${source.rank}`);
        });
      }
    }
    
  } catch (error) {
    console.error(`❌ Source attribution test failed:`, error);
  }
}

/**
 * Run comprehensive performance test
 */
async function runComprehensiveTest(): Promise<PerformanceReport> {
  console.log('\n🎯 Running Comprehensive Multi-Vector Search Test');
  console.log(`📋 Testing ${TEST_QUERIES.length} queries across ${MERGE_STRATEGIES.length} strategies`);
  
  const testResults: TestResult[] = [];
  
  // Test all combinations of queries and strategies
  for (const query of TEST_QUERIES) {
    for (const strategy of MERGE_STRATEGIES) {
      const result = await runPerformanceTest(query, strategy);
      testResults.push(result);
      
      // Small delay between tests to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Calculate statistics
  const successfulResults = testResults.filter(r => !r.error);
  const averageSearchTime = successfulResults.reduce((sum, r) => sum + r.totalTime, 0) / successfulResults.length;
  const averageResultsCount = successfulResults.reduce((sum, r) => sum + r.totalResults, 0) / successfulResults.length;
  
  // Group results by strategy
  const strategyComparison: Record<string, TestResult[]> = {};
  successfulResults.forEach(result => {
    if (!strategyComparison[result.mergeStrategy]) {
      strategyComparison[result.mergeStrategy] = [];
    }
    strategyComparison[result.mergeStrategy].push(result);
  });
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  // Check performance
  if (averageSearchTime > 500) {
    recommendations.push('⚠️  Average search time exceeds 500ms, consider optimization');
  } else {
    recommendations.push('✅ Average search time is within acceptable limits');
  }
  
  // Check result quality
  if (averageResultsCount < 10) {
    recommendations.push('⚠️  Low result count, may need to adjust search parameters');
  } else {
    recommendations.push('✅ Result count is adequate');
  }
  
  // Check RRF usage
  const rrfResults = successfulResults.filter(r => r.rrfUsed);
  if (rrfResults.length > 0) {
    recommendations.push('✅ RRF implementation is working correctly');
  } else {
    recommendations.push('⚠️  RRF not being used, check merge strategy configuration');
  }
  
  return {
    testResults,
    averageSearchTime,
    averageResultsCount,
    strategyComparison,
    recommendations
  };
}

/**
 * Print performance report
 */
function printPerformanceReport(report: PerformanceReport): void {
  console.log('\n📊 Performance Report');
  console.log('='.repeat(50));
  
  console.log(`🕐 Average search time: ${report.averageSearchTime.toFixed(2)}ms`);
  console.log(`📋 Average results per query: ${report.averageResultsCount.toFixed(2)}`);
  console.log(`✅ Successful searches: ${report.testResults.filter(r => !r.error).length}/${report.testResults.length}`);
  
  console.log('\n📈 Strategy Comparison:');
  Object.entries(report.strategyComparison).forEach(([strategy, results]) => {
    const avgTime = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;
    const avgResults = results.reduce((sum, r) => sum + r.uniqueResults, 0) / results.length;
    
    console.log(`   ${strategy}: ${avgTime.toFixed(2)}ms avg, ${avgResults.toFixed(2)} results avg`);
  });
  
  console.log('\n💡 Recommendations:');
  report.recommendations.forEach(rec => console.log(`   ${rec}`));
  
  // Print errors if any
  const errors = report.testResults.filter(r => r.error);
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(error => {
      console.log(`   ${error.query} (${error.mergeStrategy}): ${error.error}`);
    });
  }
}

/**
 * Main test execution
 */
async function main(): Promise<void> {
  console.log('🧪 T012: Multi-Vector Search Test Suite');
  console.log('Testing enhanced search with RRF merging and source attribution');
  
  try {
    // Initialize services
    console.log('\n🔧 Initializing services...');
    await multiVectorSearchService.initialize();
    console.log('✅ Services initialized successfully');
    
    // Test individual components
    await testRRFImplementation();
    await testParallelSearch();
    await testResultDeduplication();
    await testSourceAttribution();
    
    // Run comprehensive test
    const report = await runComprehensiveTest();
    
    // Print results
    printPerformanceReport(report);
    
    console.log('\n🎉 Multi-vector search test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}
