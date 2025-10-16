/**
 * Performance tests for Duplicate Detection Service
 * 
 * This file contains performance tests specifically designed to test the
 * duplicate detection service with large datasets and measure performance metrics.
 */

import { 
  duplicateDetectionService,
  DuplicateDetectionService 
} from './duplicate-detection.service';
import { 
  DetectionStrategy,
  DuplicateDetectionConfig
} from './duplicate-detection.interfaces';
import { SearchResultItem, RankedResults } from './result-merger.service';

// Performance test configuration
interface PerformanceTestConfig {
  name: string;
  itemCount: number;
  sourceCount: number;
  duplicateRate: number;
  config?: Partial<DuplicateDetectionConfig>;
}

// Performance test result
interface PerformanceTestResult {
  testName: string;
  itemCount: number;
  sourceCount: number;
  duplicateRate: number;
  processingTime: number;
  memoryUsage?: number;
  duplicatesFound: number;
  uniqueItems: number;
  processingRate: number; // items per second
  cacheHitRate?: number;
  success: boolean;
  error?: string;
}

// Generate realistic test data
function generateTestData(config: PerformanceTestConfig): SearchResultItem[] {
  const baseTools = [
    { name: 'React', description: 'JavaScript library for building user interfaces', category: 'frontend', url: 'https://reactjs.org' },
    { name: 'Vue.js', description: 'Progressive JavaScript framework', category: 'frontend', url: 'https://vuejs.org' },
    { name: 'Angular', description: 'Platform for building mobile and desktop web applications', category: 'frontend', url: 'https://angular.io' },
    { name: 'Express.js', description: 'Fast, unopinionated web framework for Node.js', category: 'backend', url: 'https://expressjs.com' },
    { name: 'MongoDB', description: 'Document-oriented NoSQL database', category: 'database', url: 'https://mongodb.com' },
    { name: 'TypeScript', description: 'Typed superset of JavaScript', category: 'language', url: 'https://typescriptlang.org' },
    { name: 'Webpack', description: 'Module bundler for JavaScript', category: 'build', url: 'https://webpack.js.org' },
    { name: 'Jest', description: 'Testing framework with focus on simplicity', category: 'testing', url: 'https://jestjs.io' },
    { name: 'Docker', description: 'Platform for developing, shipping, and running applications', category: 'devops', url: 'https://docker.com' },
    { name: 'GraphQL', description: 'Query language and runtime for APIs', category: 'api', url: 'https://graphql.org' },
    { name: 'Next.js', description: 'React framework for production', category: 'frontend', url: 'https://nextjs.org' },
    { name: 'NestJS', description: 'Progressive Node.js framework', category: 'backend', url: 'https://nestjs.com' },
    { name: 'Tailwind CSS', description: 'Utility-first CSS framework', category: 'frontend', url: 'https://tailwindcss.com' },
    { name: 'Prisma', description: 'Next-generation ORM', category: 'database', url: 'https://prisma.io' },
    { name: 'Vite', description: 'Next generation frontend tooling', category: 'build', url: 'https://vitejs.dev' }
  ];

  const items: SearchResultItem[] = [];
  const duplicateCount = Math.floor(config.itemCount * config.duplicateRate);
  const uniqueCount = config.itemCount - duplicateCount;

  // Generate unique items
  for (let i = 0; i < uniqueCount; i++) {
    const tool = baseTools[i % baseTools.length];
    const sourceIndex = i % config.sourceCount;
    
    items.push({
      id: `${sourceIndex}-unique-${tool.name.toLowerCase()}-${i}`,
      score: Math.random() * 0.4 + 0.6,
      source: `source-${sourceIndex}`,
      payload: {
        name: `${tool.name} v${Math.floor(i / baseTools.length) + 1}`,
        description: `${tool.description} - version ${Math.floor(i / baseTools.length) + 1}`,
        category: tool.category,
        url: `${tool.url}/v${Math.floor(i / baseTools.length) + 1}`,
        version: `${Math.floor(i / baseTools.length) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
      },
      metadata: {
        searchTime: 100 + Math.random() * 200,
        rank: i + 1,
        source: `source-${sourceIndex}`
      }
    });
  }

  // Generate duplicate items
  for (let i = 0; i < duplicateCount; i++) {
    const originalItem = items[i % uniqueCount];
    const sourceIndex = (uniqueCount + i) % config.sourceCount;
    const tool = baseTools[i % baseTools.length];
    
    // Create variations of duplicates
    const duplicateVariation = Math.random();
    let duplicateItem: SearchResultItem;
    
    if (duplicateVariation < 0.3) {
      // Exact duplicate with different ID
      duplicateItem = {
        ...originalItem,
        id: `${sourceIndex}-dup-exact-${i}`,
        source: `source-${sourceIndex}`
      };
    } else if (duplicateVariation < 0.6) {
      // Content duplicate with slight variations
      duplicateItem = {
        id: `${sourceIndex}-dup-content-${i}`,
        score: originalItem.score * (0.9 + Math.random() * 0.2),
        source: `source-${sourceIndex}`,
        payload: {
          ...originalItem.payload,
          name: originalItem.payload?.name + (Math.random() > 0.5 ? ' Pro' : ''),
          description: originalItem.payload?.description + (Math.random() > 0.5 ? ' Enhanced' : ''),
          version: originalItem.payload?.version
        }
      };
    } else if (duplicateVariation < 0.8) {
      // Version duplicate
      const baseVersion = originalItem.payload?.version || '1.0.0';
      const versionParts = baseVersion.split('.').map(Number);
      versionParts[0] = versionParts[0] + Math.floor(Math.random() * 3) - 1; // +/- 1 major version
      
      duplicateItem = {
        id: `${sourceIndex}-dup-version-${i}`,
        score: originalItem.score * (0.85 + Math.random() * 0.3),
        source: `source-${sourceIndex}`,
        payload: {
          ...originalItem.payload,
          name: `${tool.name} v${versionParts.join('.')}`,
          version: versionParts.join('.')
        }
      };
    } else {
      // Fuzzy duplicate
      duplicateItem = {
        id: `${sourceIndex}-dup-fuzzy-${i}`,
        score: originalItem.score * (0.7 + Math.random() * 0.6),
        source: `source-${sourceIndex}`,
        payload: {
          name: originalItem.payload?.name + (Math.random() > 0.5 ? ' Tool' : ' Library'),
          description: originalItem.payload?.description + (Math.random() > 0.5 ? ' for developers' : ''),
          category: originalItem.payload?.category,
          url: originalItem.payload?.url,
          version: originalItem.payload?.version
        }
      };
    }
    
    items.push(duplicateItem);
  }

  // Shuffle items to randomize order
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}

// Measure memory usage
function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }
  return 0;
}

// Run a single performance test
async function runPerformanceTest(config: PerformanceTestConfig): Promise<PerformanceTestResult> {
  console.log(`\n🧪 Running ${config.name}...`);
  console.log(`   Items: ${config.itemCount}, Sources: ${config.sourceCount}, Duplicate Rate: ${(config.duplicateRate * 100).toFixed(1)}%`);
  
  const startMemory = getMemoryUsage();
  const startTime = Date.now();
  
  try {
    // Generate test data
    const testData = generateTestData(config);
    const generationTime = Date.now() - startTime;
    
    console.log(`   Data generation: ${generationTime}ms`);
    
    // Run duplicate detection
    const detectionStartTime = Date.now();
    
    const result = await duplicateDetectionService.detectDuplicates(
      testData,
      config.config
    );
    
    const detectionTime = Date.now() - detectionStartTime;
    const totalTime = Date.now() - startTime;
    const endMemory = getMemoryUsage();
    
    const processingRate = config.itemCount / (detectionTime / 1000);
    const duplicatesFound = config.itemCount - result.deduplicatedItems.length;
    
    console.log(`   Detection time: ${detectionTime}ms`);
    console.log(`   Processing rate: ${processingRate.toFixed(0)} items/sec`);
    console.log(`   Duplicates found: ${duplicatesFound}`);
    console.log(`   Memory usage: ${(endMemory - startMemory).toFixed(1)}MB`);
    
    return {
      testName: config.name,
      itemCount: config.itemCount,
      sourceCount: config.sourceCount,
      duplicateRate: config.duplicateRate,
      processingTime: detectionTime,
      memoryUsage: endMemory - startMemory,
      duplicatesFound,
      uniqueItems: result.deduplicatedItems.length,
      processingRate,
      cacheHitRate: result.stats.cacheStats?.hitRate,
      success: true
    };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`   ❌ Test failed: ${errorMessage}`);
    
    return {
      testName: config.name,
      itemCount: config.itemCount,
      sourceCount: config.sourceCount,
      duplicateRate: config.duplicateRate,
      processingTime: totalTime,
      duplicatesFound: 0,
      uniqueItems: 0,
      processingRate: 0,
      success: false,
      error: errorMessage
    };
  }
}

// Test different dataset sizes
export async function testDatasetSizeScaling(): Promise<PerformanceTestResult[]> {
  console.log('🚀 Testing Dataset Size Scaling');
  console.log('='.repeat(60));
  
  const sizeTests: PerformanceTestConfig[] = [
    {
      name: 'Small Dataset (100 items)',
      itemCount: 100,
      sourceCount: 3,
      duplicateRate: 0.3
    },
    {
      name: 'Medium Dataset (500 items)',
      itemCount: 500,
      sourceCount: 3,
      duplicateRate: 0.3
    },
    {
      name: 'Large Dataset (1000 items)',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.3
    },
    {
      name: 'Very Large Dataset (2000 items)',
      itemCount: 2000,
      sourceCount: 3,
      duplicateRate: 0.3
    }
  ];
  
  const results: PerformanceTestResult[] = [];
  
  for (const test of sizeTests) {
    const result = await runPerformanceTest(test);
    results.push(result);
  }
  
  // Print scaling analysis
  console.log('\n📊 Scaling Analysis:');
  console.log('Dataset Size | Time (ms) | Rate (items/sec) | Memory (MB)');
  console.log('-------------|-----------|------------------|------------');
  
  for (const result of results) {
    if (result.success) {
      console.log(`${result.itemCount.toString().padEnd(11)} | ${result.processingTime.toString().padEnd(9)} | ${(result.processingRate.toFixed(0)).padEnd(16)} | ${(result.memoryUsage?.toFixed(1) || 'N/A').padEnd(10)}`);
    }
  }
  
  return results;
}

// Test different duplicate rates
export async function testDuplicateRateImpact(): Promise<PerformanceTestResult[]> {
  console.log('\n🚀 Testing Duplicate Rate Impact');
  console.log('='.repeat(60));
  
  const duplicateRateTests: PerformanceTestConfig[] = [
    {
      name: 'No Duplicates (0%)',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.0
    },
    {
      name: 'Low Duplicates (10%)',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.1
    },
    {
      name: 'Medium Duplicates (30%)',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.3
    },
    {
      name: 'High Duplicates (50%)',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.5
    },
    {
      name: 'Very High Duplicates (70%)',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.7
    }
  ];
  
  const results: PerformanceTestResult[] = [];
  
  for (const test of duplicateRateTests) {
    const result = await runPerformanceTest(test);
    results.push(result);
  }
  
  // Print duplicate rate analysis
  console.log('\n📊 Duplicate Rate Impact Analysis:');
  console.log('Duplicate Rate | Time (ms) | Duplicates Found | Rate (items/sec)');
  console.log('--------------|-----------|------------------|----------------');
  
  for (const result of results) {
    if (result.success) {
      const ratePercent = (result.duplicateRate * 100).toFixed(0);
      console.log(`${ratePercent.padEnd(12)}% | ${result.processingTime.toString().padEnd(9)} | ${result.duplicatesFound.toString().padEnd(16)} | ${result.processingRate.toFixed(0).padEnd(14)}`);
    }
  }
  
  return results;
}

// Test different strategies
export async function testStrategyPerformance(): Promise<PerformanceTestResult[]> {
  console.log('\n🚀 Testing Strategy Performance');
  console.log('='.repeat(60));
  
  const strategyTests: PerformanceTestConfig[] = [
    {
      name: 'Exact ID Only',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.3,
      config: {
        enabled: true,
        strategies: [DetectionStrategy.EXACT_ID],
        thresholds: { contentSimilarity: 0.9 }
      }
    },
    {
      name: 'Content Similarity Only',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.3,
      config: {
        enabled: true,
        strategies: [DetectionStrategy.CONTENT_SIMILARITY],
        thresholds: { contentSimilarity: 0.8 }
      }
    },
    {
      name: 'Version Aware Only',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.3,
      config: {
        enabled: true,
        strategies: [DetectionStrategy.VERSION_AWARE],
        thresholds: { versionAware: 0.85 }
      }
    },
    {
      name: 'Fuzzy Match Only',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.3,
      config: {
        enabled: true,
        strategies: [DetectionStrategy.FUZZY_MATCH],
        thresholds: { fuzzyMatch: 0.7 }
      }
    },
    {
      name: 'All Strategies',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.3,
      config: {
        enabled: true,
        strategies: [
          DetectionStrategy.EXACT_ID,
          DetectionStrategy.CONTENT_SIMILARITY,
          DetectionStrategy.VERSION_AWARE,
          DetectionStrategy.FUZZY_MATCH
        ],
        thresholds: {
          contentSimilarity: 0.8,
          versionAware: 0.85,
          fuzzyMatch: 0.7
        }
      }
    }
  ];
  
  const results: PerformanceTestResult[] = [];
  
  for (const test of strategyTests) {
    const result = await runPerformanceTest(test);
    results.push(result);
  }
  
  // Print strategy performance analysis
  console.log('\n📊 Strategy Performance Analysis:');
  console.log('Strategy          | Time (ms) | Duplicates Found | Rate (items/sec)');
  console.log('-------------------|-----------|------------------|----------------');
  
  for (const result of results) {
    if (result.success) {
      const strategyName = result.testName.replace(' Only', '');
      console.log(`${strategyName.padEnd(17)} | ${result.processingTime.toString().padEnd(9)} | ${result.duplicatesFound.toString().padEnd(16)} | ${result.processingRate.toFixed(0).padEnd(14)}`);
    }
  }
  
  return results;
}

// Test caching performance
export async function testCachingPerformance(): Promise<PerformanceTestResult[]> {
  console.log('\n🚀 Testing Caching Performance');
  console.log('='.repeat(60));
  
  const cachingTests: PerformanceTestConfig[] = [
    {
      name: 'Without Cache',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.3,
      config: {
        enabled: true,
        strategies: [DetectionStrategy.CONTENT_SIMILARITY, DetectionStrategy.VERSION_AWARE],
        thresholds: { contentSimilarity: 0.8, versionAware: 0.85 },
        performance: {
          enableCache: false,
          enableParallel: false
        }
      }
    },
    {
      name: 'With Cache',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.3,
      config: {
        enabled: true,
        strategies: [DetectionStrategy.CONTENT_SIMILARITY, DetectionStrategy.VERSION_AWARE],
        thresholds: { contentSimilarity: 0.8, versionAware: 0.85 },
        performance: {
          enableCache: true,
          enableParallel: false
        }
      }
    },
    {
      name: 'With Cache + Parallel',
      itemCount: 1000,
      sourceCount: 3,
      duplicateRate: 0.3,
      config: {
        enabled: true,
        strategies: [DetectionStrategy.CONTENT_SIMILARITY, DetectionStrategy.VERSION_AWARE],
        thresholds: { contentSimilarity: 0.8, versionAware: 0.85 },
        performance: {
          enableCache: true,
          enableParallel: true,
          parallelWorkers: 4
        }
      }
    }
  ];
  
  const results: PerformanceTestResult[] = [];
  
  for (const test of cachingTests) {
    const result = await runPerformanceTest(test);
    results.push(result);
  }
  
  // Print caching performance analysis
  console.log('\n📊 Caching Performance Analysis:');
  console.log('Configuration     | Time (ms) | Rate (items/sec) | Cache Hit Rate');
  console.log('------------------|-----------|------------------|---------------');
  
  for (const result of results) {
    if (result.success) {
      const cacheHitRate = result.cacheHitRate ? (result.cacheHitRate * 100).toFixed(1) + '%' : 'N/A';
      console.log(`${result.testName.padEnd(16)} | ${result.processingTime.toString().padEnd(9)} | ${result.processingRate.toFixed(0).padEnd(16)} | ${cacheHitRate.padEnd(13)}`);
    }
  }
  
  return results;
}

// Generate comprehensive performance report
function generatePerformanceReport(
  sizeResults: PerformanceTestResult[],
  duplicateRateResults: PerformanceTestResult[],
  strategyResults: PerformanceTestResult[],
  cachingResults: PerformanceTestResult[]
): void {
  console.log('\n📊 Comprehensive Performance Report');
  console.log('='.repeat(80));
  
  // Overall statistics
  const allResults = [...sizeResults, ...duplicateRateResults, ...strategyResults, ...cachingResults];
  const successfulResults = allResults.filter(r => r.success);
  const failedResults = allResults.filter(r => !r.success);
  
  console.log(`\n📈 Overall Statistics:`);
  console.log(`   Total tests: ${allResults.length}`);
  console.log(`   Successful: ${successfulResults.length}`);
  console.log(`   Failed: ${failedResults.length}`);
  
  if (successfulResults.length > 0) {
    const avgProcessingRate = successfulResults.reduce((sum, r) => sum + r.processingRate, 0) / successfulResults.length;
    const maxProcessingRate = Math.max(...successfulResults.map(r => r.processingRate));
    const minProcessingRate = Math.min(...successfulResults.map(r => r.processingRate));
    const avgMemoryUsage = successfulResults.reduce((sum, r) => sum + (r.memoryUsage || 0), 0) / successfulResults.length;
    
    console.log(`   Average processing rate: ${avgProcessingRate.toFixed(0)} items/sec`);
    console.log(`   Max processing rate: ${maxProcessingRate.toFixed(0)} items/sec`);
    console.log(`   Min processing rate: ${minProcessingRate.toFixed(0)} items/sec`);
    console.log(`   Average memory usage: ${avgMemoryUsage.toFixed(1)}MB`);
  }
  
  // Performance recommendations
  console.log(`\n💡 Performance Recommendations:`);
  
  const bestSizeResult = sizeResults
    .filter(r => r.success)
    .sort((a, b) => b.processingRate - a.processingRate)[0];
  
  if (bestSizeResult) {
    console.log(`   Optimal dataset size: ${bestSizeResult.itemCount} items (${bestSizeResult.processingRate.toFixed(0)} items/sec)`);
  }
  
  const bestStrategyResult = strategyResults
    .filter(r => r.success)
    .sort((a, b) => b.processingRate - a.processingRate)[0];
  
  if (bestStrategyResult) {
    console.log(`   Fastest strategy: ${bestStrategyResult.testName} (${bestStrategyResult.processingRate.toFixed(0)} items/sec)`);
  }
  
  const bestCachingResult = cachingResults
    .filter(r => r.success)
    .sort((a, b) => b.processingRate - a.processingRate)[0];
  
  if (bestCachingResult) {
    console.log(`   Best caching configuration: ${bestCachingResult.testName} (${bestCachingResult.processingRate.toFixed(0)} items/sec)`);
  }
  
  // Failure analysis
  if (failedResults.length > 0) {
    console.log(`\n⚠️  Failed Tests Analysis:`);
    failedResults.forEach(result => {
      console.log(`   - ${result.testName}: ${result.error || 'Unknown error'}`);
    });
  }
}

// Run all performance tests
export async function runAllPerformanceTests(): Promise<void> {
  console.log('🚀 Duplicate Detection Performance Test Suite');
  console.log('='.repeat(80));
  
  try {
    const sizeResults = await testDatasetSizeScaling();
    const duplicateRateResults = await testDuplicateRateImpact();
    const strategyResults = await testStrategyPerformance();
    const cachingResults = await testCachingPerformance();
    
    generatePerformanceReport(sizeResults, duplicateRateResults, strategyResults, cachingResults);
    
    console.log('\n✅ All performance tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Performance test suite failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllPerformanceTests().catch(console.error);
}
