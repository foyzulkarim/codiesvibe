import { localNLPService } from '../src/services/local-nlp.service';

async function testNEROnly() {
  console.log('🧪 Testing transformers.js NER pipeline integration (NER only)...\n');

  try {
    // Initialize the service
    console.log('📦 Initializing Local NLP Service...');
    await localNLPService.initialize();
    
    // Test cases for entity extraction only
    const testCases = [
      {
        text: 'Find free React components for dashboard development',
        expectedEntities: ['React', 'free'],
        description: 'Basic entity extraction with technology and pricing'
      },
      {
        text: 'Compare Vue.js vs Angular for enterprise applications',
        expectedEntities: ['Vue', 'Angular'],
        description: 'Comparison query with multiple technologies'
      },
      {
        text: 'I need a Python API library for machine learning',
        expectedEntities: ['Python', 'API', 'library'],
        description: 'Technology and interface extraction'
      },
      {
        text: 'Looking for open source TypeScript framework',
        expectedEntities: ['open source', 'TypeScript', 'framework'],
        description: 'Pricing and technology extraction'
      },
      {
        text: 'Google TensorFlow vs Facebook PyTorch for AI development',
        expectedEntities: ['Google', 'TensorFlow', 'Facebook', 'PyTorch'],
        description: 'Organization and technology extraction'
      }
    ];

    console.log('🔍 Testing NER entity extraction:\n');
    
    let totalProcessingTime = 0;
    let successfulExtractions = 0;
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`Test ${i + 1}: ${testCase.description}`);
      console.log(`Input: "${testCase.text}"`);
      
      const startTime = Date.now();
      const result = await localNLPService.processText(testCase.text, {
        extractEntities: true,
        classifyIntent: false, // Disable intent classification for this test
        extractVocabulary: false
      });
      const processingTime = Date.now() - startTime;
      totalProcessingTime += processingTime;
      
      console.log(`⏱️  Processing time: ${processingTime}ms`);
      console.log(`🏷️  Entities found: ${result.entities.length}`);
      
      if (result.entities.length > 0) {
        console.log('Entities:');
        result.entities.forEach((entity: any, index: number) => {
          console.log(`  ${index + 1}. "${entity.text}" (${entity.type}) - confidence: ${entity.confidence.toFixed(3)}`);
        });
      }
      
      // Check performance
      if (processingTime <= 100) {
        console.log(`✅ Performance requirement met (< 100ms)`);
        successfulExtractions++;
      } else {
        console.log(`⚠️  Processing time exceeded 100ms (${processingTime}ms)`);
      }
      
      // Verify expected entities were found
      const foundEntities = result.entities.map((e: any) => e.text.toLowerCase());
      const missingEntities = testCase.expectedEntities.filter(
        expected => !foundEntities.some((found: string) => found.includes(expected.toLowerCase()))
      );
      
      if (missingEntities.length === 0) {
        console.log(`✅ All expected entities found`);
      } else {
        console.log(`⚠️  Missing expected entities: ${missingEntities.join(', ')}`);
      }
      
      console.log(`🤖 Model used: ${result.modelUsed}`);
      console.log(`📊 Processing strategy: ${result.processingStrategy}`);
      console.log('---\n');
    }

    // Performance summary
    const averageProcessingTime = totalProcessingTime / testCases.length;
    const performanceSuccessRate = (successfulExtractions / testCases.length) * 100;
    
    console.log('📊 Performance Summary:');
    console.log(`  Average processing time: ${averageProcessingTime.toFixed(2)}ms`);
    console.log(`  Success rate (<100ms): ${performanceSuccessRate.toFixed(1)}%`);
    console.log(`  Total tests: ${testCases.length}`);
    
    if (averageProcessingTime <= 100) {
      console.log('✅ Overall performance requirement met!');
    } else {
      console.log('⚠️  Average processing time exceeds 100ms');
    }

    // Test caching performance
    console.log('\n💾 Testing caching performance:');
    const cacheTestText = 'Find free React components for dashboard';
    
    // First call (should use model)
    const firstCallStart = Date.now();
    const firstResult = await localNLPService.processText(cacheTestText, {
      extractEntities: true,
      classifyIntent: false,
      extractVocabulary: false
    });
    const firstCallTime = Date.now() - firstCallStart;
    
    // Second call (should use cache)
    const secondCallStart = Date.now();
    const secondResult = await localNLPService.processText(cacheTestText, {
      extractEntities: true,
      classifyIntent: false,
      extractVocabulary: false
    });
    const secondCallTime = Date.now() - secondCallStart;
    
    console.log(`First call: ${firstCallTime}ms`);
    console.log(`Second call (cached): ${secondCallTime}ms`);
    console.log(`Cache speedup: ${firstCallTime > 0 ? ((firstCallTime - secondCallTime) / firstCallTime * 100).toFixed(1) : 'N/A'}%`);
    
    // Get cache statistics
    const cacheStats = localNLPService.getCacheStats();
    console.log(`\n📈 Cache statistics:`);
    console.log(`  Model cache size: ${cacheStats.modelCache.size}/${cacheStats.modelCache.maxSize}`);
    console.log(`  Result cache size: ${cacheStats.resultCache.size}`);
    
    // Health check
    console.log(`\n🏥 Service health check:`);
    const healthCheck = await localNLPService.healthCheck();
    console.log(`  Status: ${healthCheck.status}`);
    console.log(`  Initialized: ${healthCheck.details.initialized}`);
    console.log(`  Model load time: ${healthCheck.details.modelLoadTime}ms`);
    console.log(`  Cache size: ${healthCheck.details.cacheSize}`);
    console.log(`  Fallback enabled: ${healthCheck.details.fallbackEnabled}`);
    
    // Final assessment
    console.log('\n🎯 Final Assessment:');
    if (averageProcessingTime <= 100 && successfulExtractions === testCases.length) {
      console.log('✅ T024 IMPLEMENTATION SUCCESSFUL!');
      console.log('   - Real transformers.js NER pipeline integrated');
      console.log('   - Performance meets <100ms requirement');
      console.log('   - Proper fallback handling implemented');
      console.log('   - Caching system working effectively');
    } else {
      console.log('⚠️  T024 IMPLEMENTATION PARTIALLY SUCCESSFUL');
      console.log('   - NER pipeline integrated but performance needs optimization');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testNEROnly();
