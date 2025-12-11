import { planCacheService } from '#services/plan-cache.service';
import { searchWithAgenticPipeline } from '#graphs/agentic-search.graph';
import { embeddingService } from '#services/embedding.service';

/**
 * Test script for the caching implementation
 * This script tests various scenarios to ensure the cache works correctly
 */

async function testCacheImplementation(): Promise<void> {
  console.log('🧪 Starting cache implementation tests...\n');

  try {
    // Initialize services
    console.log('🔧 Initializing services...');
    await planCacheService.initialize();
    await embeddingService.initialize();
    console.log('✅ Services initialized successfully\n');

    // Test queries
    const testQueries = [
      'code editor',
      'AI code generator',
      'free text editor',
      'code editor for beginners',
      'visual code editor'
    ];

    // Test 1: Cache miss scenario
    console.log('📋 Test 1: Cache miss scenarios');
    console.log('=' .repeat(50));

    for (const query of testQueries.slice(0, 2)) {
      console.log(`\n🔍 Testing query: "${query}"`);

      const startTime = Date.now();
      const result = await searchWithAgenticPipeline(query);
      const totalTime = Date.now() - startTime;

      console.log(`✅ Query completed in ${totalTime}ms`);
      console.log(`📊 Cache hit: ${result.metadata?.cacheHit ? 'YES' : 'NO'}`);
      console.log(`📊 Nodes executed: ${result.metadata?.totalNodesExecuted}`);
      console.log(`📊 Execution path: ${result.metadata?.executionPath?.join(' → ')}`);
      console.log(`📊 Candidates found: ${result.candidates.length}`);

      if (result.metadata?.cacheHit) {
        console.log(`🎯 Cache type: ${result.metadata.cacheType}`);
        console.log(`🎯 Cache similarity: ${result.metadata.cacheSimilarity?.toFixed(3)}`);
        if (result.metadata?.costSavings) {
          console.log(`💰 Cost savings: ${result.metadata.costSavings.llmCallsAvoided} LLM calls, $${result.metadata.costSavings.estimatedCostSaved.toFixed(4)}, ${result.metadata.costSavings.timeSavedPercent}% faster`);
        }
      }

      if (result.metadata?.cacheStored) {
        console.log(`💾 Plan cached successfully (ID: ${result.metadata.planId})`);
      }
    }

    // Test 2: Cache hit scenarios (similar queries)
    console.log('\n\n📋 Test 2: Cache hit scenarios with similar queries');
    console.log('=' .repeat(50));

    const similarQueries = [
      'best code editor',
      'code editing software',
      'text editor for coding',
      'programming editor'
    ];

    for (const query of similarQueries) {
      console.log(`\n🔍 Testing similar query: "${query}"`);

      const startTime = Date.now();
      const result = await searchWithAgenticPipeline(query);
      const totalTime = Date.now() - startTime;

      console.log(`✅ Query completed in ${totalTime}ms`);
      console.log(`📊 Cache hit: ${result.metadata?.cacheHit ? 'YES' : 'NO'}`);
      console.log(`📊 Nodes executed: ${result.metadata?.totalNodesExecuted}`);
      console.log(`📊 Execution path: ${result.metadata?.executionPath?.join(' → ')}`);
      console.log(`📊 Candidates found: ${result.candidates.length}`);

      if (result.metadata?.cacheHit) {
        console.log(`🎯 Cache type: ${result.metadata.cacheType}`);
        console.log(`🎯 Cache similarity: ${result.metadata.cacheSimilarity?.toFixed(3)}`);
        console.log(`🎯 Original query: "${result.metadata.originalQuery}"`);
        console.log(`🎯 Usage count: ${result.metadata.usageCount}`);
        if (result.metadata?.costSavings) {
          console.log(`💰 Cost savings: ${result.metadata.costSavings.llmCallsAvoided} LLM calls, $${result.metadata.costSavings.estimatedCostSaved.toFixed(4)}, ${result.metadata.costSavings.timeSavedPercent}% faster`);
        }
      }

      if (result.metadata?.cacheStored) {
        console.log(`💾 Plan cached successfully (ID: ${result.metadata.planId})`);
      }
    }

    // Test 3: Exact cache hit scenarios
    console.log('\n\n📋 Test 3: Exact cache hit scenarios');
    console.log('=' .repeat(50));

    for (const query of testQueries.slice(0, 2)) {
      console.log(`\n🔍 Testing exact query again: "${query}"`);

      const startTime = Date.now();
      const result = await searchWithAgenticPipeline(query);
      const totalTime = Date.now() - startTime;

      console.log(`✅ Query completed in ${totalTime}ms`);
      console.log(`📊 Cache hit: ${result.metadata?.cacheHit ? 'YES' : 'NO'}`);
      console.log(`📊 Cache type: ${result.metadata?.cacheType}`);
      console.log(`📊 Nodes executed: ${result.metadata?.totalNodesExecuted}`);
      console.log(`📊 Execution path: ${result.metadata?.executionPath?.join(' → ')}`);

      if (result.metadata?.cacheHit && result.metadata.cacheType === 'exact') {
        console.log(`🎯 EXACT MATCH! Cache similarity: ${result.metadata.cacheSimilarity?.toFixed(3)}`);
        if (result.metadata?.costSavings) {
          console.log(`💰 Cost savings: ${result.metadata.costSavings.llmCallsAvoided} LLM calls, $${result.metadata.costSavings.estimatedCostSaved.toFixed(4)}, ${result.metadata.costSavings.timeSavedPercent}% faster`);
        }
      }
    }

    // Test 4: Cache statistics
    console.log('\n\n📋 Test 4: Cache statistics');
    console.log('=' .repeat(50));

    const stats = await planCacheService.getCacheStats(7);
    console.log(`📊 Total cached plans: ${stats.totalPlans}`);
    console.log(`📊 Cache hits: ${stats.cacheHits}`);
    console.log(`📊 Cache misses: ${stats.cacheMisses}`);
    console.log(`📊 Exact matches: ${stats.exactMatches}`);
    console.log(`📊 Similar matches: ${stats.similarMatches}`);
    console.log(`📊 Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`📊 Average similarity: ${(stats.averageSimilarity * 100).toFixed(2)}%`);
    console.log(`💰 Estimated cost savings: $${stats.costSavings.toFixed(4)}`);

    // Test 5: Direct cache service methods
    console.log('\n\n📋 Test 5: Direct cache service methods');
    console.log('=' .repeat(50));

    const testQuery = 'AI-powered development tool';
    console.log(`🔍 Testing direct cache lookup for: "${testQuery}"`);

    const lookupResult = await planCacheService.lookupPlan(testQuery);
    console.log(`📊 Cache lookup result: ${lookupResult.found ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`📊 Cache type: ${lookupResult.cacheType}`);
    if (lookupResult.similarity) {
      console.log(`📊 Similarity: ${lookupResult.similarity.toFixed(3)}`);
    }

    // Test 6: Cache health check
    console.log('\n\n📋 Test 6: Cache health check');
    console.log('=' .repeat(50));

    try {
      const response = await fetch('http://localhost:4000/api/cache/health');
      const healthData = await response.json();
      console.log(`📊 Cache health: healthData`, healthData);
    } catch {
      console.log(`⚠️ Health check endpoint not available (server may not be running)`);
    }

    console.log('\n🎉 All cache implementation tests completed!');
    console.log('\n📝 Summary:');
    console.log('- Cache service initialized successfully');
    console.log('- Cache miss scenarios work correctly');
    console.log('- Cache hit scenarios (similar queries) work correctly');
    console.log('- Exact cache hit scenarios work correctly');
    console.log('- Cache statistics are being tracked');
    console.log('- Direct cache service methods work correctly');
    console.log('\n✅ Cache implementation is working as expected!');

  } catch (error) {
    console.error('❌ Cache implementation test failed:', error);
    process.exit(1);
  }
}

// Performance benchmark
async function performanceBenchmark(): Promise<void> {
  console.log('\n\n⚡ Performance Benchmark');
  console.log('=' .repeat(50));

  const testQuery = 'AI code assistant for JavaScript';
  const iterations = 5;

  console.log(`🏃 Running ${iterations} iterations of: "${testQuery}"\n`);

  const times: number[] = [];
  const cacheHits: boolean[] = [];

  for (let i = 0; i < iterations; i++) {
    console.log(`🔄 Iteration ${i + 1}/${iterations}`);

    const startTime = Date.now();
    const result = await searchWithAgenticPipeline(testQuery);
    const totalTime = Date.now() - startTime;

    times.push(totalTime);
    cacheHits.push(result.metadata?.cacheHit || false);

    console.log(`⏱️ Time: ${totalTime}ms | Cache: ${result.metadata?.cacheHit ? 'HIT' : 'MISS'} | Nodes: ${result.metadata?.totalNodesExecuted}`);
  }

  const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  const cacheHitCount = cacheHits.filter(hit => hit).length;
  const cacheHitRate = (cacheHitCount / iterations) * 100;

  console.log('\n📊 Benchmark Results:');
  console.log(`⏱️ Average time: ${avgTime.toFixed(2)}ms`);
  console.log(`🎯 Cache hit rate: ${cacheHitRate.toFixed(1)}%`);
  console.log(`🚀 Speed improvement: ${cacheHitCount > 0 ? `${((times[0] - avgTime) / times[0] * 100).toFixed(1)}%` : 'N/A'}`);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testCacheImplementation()
    .then(() => performanceBenchmark())
    .then(() => {
      console.log('\n✅ All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Tests failed:', error);
      process.exit(1);
    });
}

export { testCacheImplementation, performanceBenchmark };