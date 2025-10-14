#!/usr/bin/env ts-node

/**
 * Debug Script: Qdrant Multi-Vector Search Testing
 * 
 * This script tests the multi-vector search functionality with Qdrant,
 * including different vector types, merge strategies, and performance analysis.
 * 
 * Usage: npm run debug:multi-vector-search
 */

import dotenv from 'dotenv';
import path from 'path';
import { multiVectorSearchService } from '../src/services/multi-vector-search.service';
import { qdrantService } from '../src/services/qdrant.service';
import { embeddingService } from '../src/services/embedding.service';
import { initializeDebugServices, validateEnvironment as validateEnv } from './utils/debug-init';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Test configuration interface
interface TestConfig {
  queries: string[];
  vectorTypes: string[][];
  mergeStrategies: string[];
  limits: number[];
  performanceTests: boolean;
  cacheTests: boolean;
  deduplicationTests: boolean;
}

// Test results interface
interface TestResults {
  query: string;
  vectorTypes: string[];
  mergeStrategy: string;
  limit: number;
  results: any;
  metrics: {
    totalTime: number;
    searchTime: number;
    mergeTime: number;
    deduplicationTime: number;
    resultCount: number;
    cacheHit: boolean;
  };
}

// Performance analysis interface
interface PerformanceAnalysis {
  totalTests: number;
  averageSearchTime: number;
  averageMergeTime: number;
  averageDeduplicationTime: number;
  cacheHitRate: number;
  vectorTypePerformance: {
    [vectorType: string]: {
      averageTime: number;
      averageResults: number;
      successRate: number;
    };
  };
  mergeStrategyComparison: {
    [strategy: string]: {
      averageTime: number;
      averageResults: number;
      qualityScore: number;
    };
  };
}

// Environment validation - now handled by debug-init utility

// Service connectivity check - now handled by debug-init utility

// Test configuration
const testConfig: TestConfig = {
  queries: [
    'react components for dashboard',
    'free API testing tools',
    'machine learning frameworks',
    'database management systems',
    'code editors with syntax highlighting',
    'project management tools',
    'authentication libraries',
    'data visualization charts'
  ],
  vectorTypes: [
    ['semantic'],
    ['categories'],
    ['functionality'],
    ['semantic', 'categories'],
    ['semantic', 'functionality'],
    ['categories', 'functionality'],
    ['semantic', 'categories', 'functionality']
  ],
  mergeStrategies: [
    'reciprocal_rank_fusion',
    'weighted_average'
  ],
  limits: [5, 10, 20],
  performanceTests: true,
  cacheTests: true,
  deduplicationTests: true
};

// Perform multi-vector search test
async function performSearchTest(
  query: string,
  vectorTypes: string[],
  mergeStrategy: string,
  limit: number
): Promise<TestResults> {
  const startTime = Date.now();

  try {
    const result = await multiVectorSearchService.searchMultiVector(query, {
      limit,
      vectorTypes,
      mergeStrategy: mergeStrategy as any
    });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Get search metrics
    const searchMetrics = multiVectorSearchService.getLastSearchMetrics();

    return {
      query,
      vectorTypes,
      mergeStrategy,
      limit,
      results: result,
      metrics: {
        totalTime,
        searchTime: searchMetrics?.totalSearchTime || 0,
        mergeTime: searchMetrics?.mergeTime || 0,
        deduplicationTime: searchMetrics?.deduplicationTime || 0,
        resultCount: Object.values(result.vectorSearchResults).flat().length,
        cacheHit: (searchMetrics?.cacheHitRate || 0) > 0
      }
    };
  } catch (error) {
    console.error(`❌ Search test failed for query "${query}":`, error);
    throw error;
  }
}

// Run comprehensive search tests
async function runSearchTests(): Promise<TestResults[]> {
  console.log('\n🧪 Running Multi-Vector Search Tests');
  console.log('====================================\n');

  const results: TestResults[] = [];
  let testCount = 0;
  const totalTests = testConfig.queries.length * testConfig.vectorTypes.length * testConfig.mergeStrategies.length;

  for (const query of testConfig.queries) {
    console.log(`\n📝 Testing query: "${query}"`);
    
    for (const vectorTypes of testConfig.vectorTypes) {
      for (const mergeStrategy of testConfig.mergeStrategies) {
        testCount++;
        console.log(`   [${testCount}/${totalTests}] Vector types: [${vectorTypes.join(', ')}], Strategy: ${mergeStrategy}`);

        try {
          const result = await performSearchTest(query, vectorTypes, mergeStrategy, 10);
          results.push(result);
          
          console.log(`      ✅ Results: ${result.metrics.resultCount}, Time: ${result.metrics.totalTime}ms`);
        } catch (error) {
          console.log(`      ❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  return results;
}

// Test caching functionality
async function testCaching(): Promise<void> {
  if (!testConfig.cacheTests) return;

  console.log('\n💾 Testing Caching Functionality');
  console.log('================================\n');

  const testQuery = 'react components';
  const searchOptions = {
    limit: 10,
    vectorTypes: ['semantic', 'categories']
  };

  // First search (cache miss)
  console.log('🔍 First search (cache miss)...');
  const startTime1 = Date.now();
  await multiVectorSearchService.searchMultiVector(testQuery, searchOptions);
  const firstSearchTime = Date.now() - startTime1;
  console.log(`   Time: ${firstSearchTime}ms`);

  // Second search (cache hit)
  console.log('🔍 Second search (cache hit)...');
  const startTime2 = Date.now();
  await multiVectorSearchService.searchMultiVector(testQuery, searchOptions);
  const secondSearchTime = Date.now() - startTime2;
  console.log(`   Time: ${secondSearchTime}ms`);

  const speedup = ((firstSearchTime - secondSearchTime) / firstSearchTime * 100).toFixed(1);
  console.log(`📊 Cache speedup: ${speedup}%`);

  // Cache statistics
  const cacheStats = multiVectorSearchService.getCacheStats();
  console.log('\n💾 Cache Statistics:');
  console.log(`   Size: ${cacheStats.size}`);
  console.log(`   Hit Rate: ${(cacheStats.hitRate * 100).toFixed(2)}%`);
}

// Test different merge strategies
async function testMergeStrategies(): Promise<void> {
  console.log('\n🔀 Testing Merge Strategies');
  console.log('===========================\n');

  const testQuery = 'javascript frameworks';
  const vectorTypes = ['semantic', 'categories', 'functionality'];

  for (const strategy of testConfig.mergeStrategies) {
    console.log(`\n📊 Testing ${strategy} strategy:`);
    
    const result = await multiVectorSearchService.searchMultiVector(testQuery, {
      limit: 15,
      vectorTypes,
      mergeStrategy: strategy as any
    });

    const metrics = multiVectorSearchService.getLastSearchMetrics();
    const resultCount = Object.values(result.vectorSearchResults).flat().length;

    console.log(`   Results: ${resultCount}`);
    console.log(`   Search Time: ${metrics?.totalSearchTime || 0}ms`);
    console.log(`   Merge Time: ${metrics?.mergeTime || 0}ms`);
    
    // Show top 3 results
    const allResults = Object.values(result.vectorSearchResults).flat();
    console.log('   Top 3 Results:');
    allResults.slice(0, 3).forEach((res: any, idx: number) => {
      console.log(`     ${idx + 1}. ${res.payload?.name || res.id} (score: ${res.score?.toFixed(3)})`);
    });
  }
}

// Test deduplication functionality
async function testDeduplication(): Promise<void> {
  if (!testConfig.deduplicationTests) return;

  console.log('\n🔄 Testing Deduplication');
  console.log('========================\n');

  const testQuery = 'web development tools';
  
  // Test with deduplication enabled
  console.log('🔍 Search with deduplication enabled:');
  multiVectorSearchService.updateConfig({ deduplicationEnabled: true });
  
  const resultWithDedup = await multiVectorSearchService.searchMultiVector(testQuery, {
    limit: 20,
    vectorTypes: ['semantic', 'categories', 'functionality']
  });

  const dedupMetrics = multiVectorSearchService.getLastSearchMetrics();
  const dedupCount = Object.values(resultWithDedup.vectorSearchResults).flat().length;

  console.log(`   Results: ${dedupCount}`);
  console.log(`   Deduplication Time: ${dedupMetrics?.deduplicationTime || 0}ms`);

  // Test with deduplication disabled
  console.log('\n🔍 Search with deduplication disabled:');
  multiVectorSearchService.updateConfig({ deduplicationEnabled: false });
  
  const resultWithoutDedup = await multiVectorSearchService.searchMultiVector(testQuery, {
    limit: 20,
    vectorTypes: ['semantic', 'categories', 'functionality']
  });

  const noDedupCount = Object.values(resultWithoutDedup.vectorSearchResults).flat().length;
  console.log(`   Results: ${noDedupCount}`);

  const duplicatesRemoved = noDedupCount - dedupCount;
  console.log(`📊 Duplicates removed: ${duplicatesRemoved} (${((duplicatesRemoved / noDedupCount) * 100).toFixed(1)}%)`);

  // Reset to enabled
  multiVectorSearchService.updateConfig({ deduplicationEnabled: true });
}

// Analyze performance results
function analyzePerformance(results: TestResults[]): PerformanceAnalysis {
  const analysis: PerformanceAnalysis = {
    totalTests: results.length,
    averageSearchTime: 0,
    averageMergeTime: 0,
    averageDeduplicationTime: 0,
    cacheHitRate: 0,
    vectorTypePerformance: {},
    mergeStrategyComparison: {}
  };

  if (results.length === 0) return analysis;

  // Calculate averages
  analysis.averageSearchTime = results.reduce((sum, r) => sum + r.metrics.searchTime, 0) / results.length;
  analysis.averageMergeTime = results.reduce((sum, r) => sum + r.metrics.mergeTime, 0) / results.length;
  analysis.averageDeduplicationTime = results.reduce((sum, r) => sum + r.metrics.deduplicationTime, 0) / results.length;
  analysis.cacheHitRate = results.filter(r => r.metrics.cacheHit).length / results.length;

  // Analyze vector type performance
  const vectorTypeStats: { [key: string]: { times: number[]; results: number[]; count: number } } = {};
  
  results.forEach(result => {
    const key = result.vectorTypes.join(',');
    if (!vectorTypeStats[key]) {
      vectorTypeStats[key] = { times: [], results: [], count: 0 };
    }
    vectorTypeStats[key].times.push(result.metrics.searchTime);
    vectorTypeStats[key].results.push(result.metrics.resultCount);
    vectorTypeStats[key].count++;
  });

  Object.entries(vectorTypeStats).forEach(([key, stats]) => {
    analysis.vectorTypePerformance[key] = {
      averageTime: stats.times.reduce((a, b) => a + b, 0) / stats.times.length,
      averageResults: stats.results.reduce((a, b) => a + b, 0) / stats.results.length,
      successRate: stats.count / results.filter(r => r.vectorTypes.join(',') === key).length
    };
  });

  // Analyze merge strategy performance
  const strategyStats: { [key: string]: { times: number[]; results: number[]; count: number } } = {};
  
  results.forEach(result => {
    const strategy = result.mergeStrategy;
    if (!strategyStats[strategy]) {
      strategyStats[strategy] = { times: [], results: [], count: 0 };
    }
    strategyStats[strategy].times.push(result.metrics.mergeTime);
    strategyStats[strategy].results.push(result.metrics.resultCount);
    strategyStats[strategy].count++;
  });

  Object.entries(strategyStats).forEach(([strategy, stats]) => {
    analysis.mergeStrategyComparison[strategy] = {
      averageTime: stats.times.reduce((a, b) => a + b, 0) / stats.times.length,
      averageResults: stats.results.reduce((a, b) => a + b, 0) / stats.results.length,
      qualityScore: stats.results.reduce((a, b) => a + b, 0) / stats.times.reduce((a, b) => a + b, 0) // Results per ms
    };
  });

  return analysis;
}

// Display performance analysis
function displayPerformanceAnalysis(analysis: PerformanceAnalysis): void {
  console.log('\n📊 Performance Analysis');
  console.log('=======================\n');

  console.log(`📈 Overall Statistics:`);
  console.log(`   Total Tests: ${analysis.totalTests}`);
  console.log(`   Average Search Time: ${analysis.averageSearchTime.toFixed(2)}ms`);
  console.log(`   Average Merge Time: ${analysis.averageMergeTime.toFixed(2)}ms`);
  console.log(`   Average Deduplication Time: ${analysis.averageDeduplicationTime.toFixed(2)}ms`);
  console.log(`   Cache Hit Rate: ${(analysis.cacheHitRate * 100).toFixed(2)}%`);

  console.log('\n🎯 Vector Type Performance:');
  Object.entries(analysis.vectorTypePerformance)
    .sort(([,a], [,b]) => a.averageTime - b.averageTime)
    .forEach(([vectorTypes, perf]) => {
      console.log(`   [${vectorTypes}]:`);
      console.log(`     Average Time: ${perf.averageTime.toFixed(2)}ms`);
      console.log(`     Average Results: ${perf.averageResults.toFixed(1)}`);
      console.log(`     Success Rate: ${(perf.successRate * 100).toFixed(1)}%`);
    });

  console.log('\n🔀 Merge Strategy Comparison:');
  Object.entries(analysis.mergeStrategyComparison)
    .sort(([,a], [,b]) => b.qualityScore - a.qualityScore)
    .forEach(([strategy, perf]) => {
      console.log(`   ${strategy}:`);
      console.log(`     Average Time: ${perf.averageTime.toFixed(2)}ms`);
      console.log(`     Average Results: ${perf.averageResults.toFixed(1)}`);
      console.log(`     Quality Score: ${perf.qualityScore.toFixed(3)} results/ms`);
    });
}

// Display service configuration
function displayConfiguration(): void {
  console.log('\n⚙️  Service Configuration');
  console.log('=========================\n');

  const config = multiVectorSearchService.getConfig();
  console.log(`Enabled: ${config.enabled}`);
  console.log(`Vector Types: ${config.vectorTypes.join(', ')}`);
  console.log(`Merge Strategy: ${config.mergeStrategy}`);
  console.log(`RRF K Value: ${config.rrfKValue}`);
  console.log(`Max Results Per Vector: ${config.maxResultsPerVector}`);
  console.log(`Parallel Search: ${config.parallelSearchEnabled}`);
  console.log(`Deduplication: ${config.deduplicationEnabled}`);
  console.log(`Deduplication Threshold: ${config.deduplicationThreshold}`);
  console.log(`Source Attribution: ${config.sourceAttributionEnabled}`);
  console.log(`Search Timeout: ${config.searchTimeout}ms`);
}

// Main execution function
async function main(): Promise<void> {
  console.log('🚀 Multi-Vector Search Debug Script');
  console.log('===================================\n');

  try {
    // Validate environment and initialize services
    validateEnv(['QDRANT_HOST', 'QDRANT_PORT']);
    await initializeDebugServices();

    // Display current configuration
    displayConfiguration();

    // Run comprehensive tests
    const testResults = await runSearchTests();

    // Run specialized tests
    await testCaching();
    await testMergeStrategies();
    await testDeduplication();

    // Analyze and display performance
    const analysis = analyzePerformance(testResults);
    displayPerformanceAnalysis(analysis);

    // Final service statistics
    console.log('\n📊 Final Service Statistics:');
    const performanceReport = multiVectorSearchService.getPerformanceReport();
    console.log(`   Cache Size: ${performanceReport.cacheStats.size}`);
    console.log(`   Cache Hit Rate: ${(performanceReport.cacheStats.hitRate * 100).toFixed(2)}%`);

    console.log('\n✅ Multi-vector search testing completed successfully!');

  } catch (error) {
    console.error('\n❌ Multi-vector search testing failed:', error);
    process.exit(1);
  }
}

// Execute the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

export { main, testConfig, performSearchTest, analyzePerformance };