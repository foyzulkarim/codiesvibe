import { localNLPService } from '../src/services/local-nlp.service';

async function testTransformersIntegration() {
  console.log('🧪 Testing transformers.js NER pipeline integration...\n');

  try {
    // Initialize the service
    console.log('📦 Initializing Local NLP Service...');
    await localNLPService.initialize();
    
    // Test cases for entity extraction
    const testCases = [
      {
        text: 'Find free React components for dashboard development',
        expectedEntities: ['React', 'free'],
        description: 'Basic entity extraction with technology and pricing'
      },
      {
        text: 'Compare Vue.js vs Angular for enterprise applications',
        expectedEntities: ['Vue.js', 'Angular'],
        description: 'Comparison query with multiple technologies'
      },
      {
        text: 'I need a Python API library for machine learning',
        expectedEntities: ['Python', 'API'],
        description: 'Technology and interface extraction'
      },
      {
        text: 'Looking for open source TypeScript framework',
        expectedEntities: ['open source', 'TypeScript'],
        description: 'Pricing and technology extraction'
      }
    ];

    console.log('🔍 Testing entity extraction:\n');
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`Test ${i + 1}: ${testCase.description}`);
      console.log(`Input: "${testCase.text}"`);
      
      const startTime = Date.now();
      const result = await localNLPService.processText(testCase.text, {
        extractEntities: true,
        classifyIntent: true,
        extractVocabulary: false
      });
      const processingTime = Date.now() - startTime;
      
      console.log(`⏱️  Processing time: ${processingTime}ms`);
      console.log(`🏷️  Entities found: ${result.entities.length}`);
      
      if (result.entities.length > 0) {
        console.log('Entities:');
        result.entities.forEach((entity: any, index: number) => {
          console.log(`  ${index + 1}. "${entity.text}" (${entity.type}) - confidence: ${entity.confidence.toFixed(3)}`);
        });
      }
      
      console.log(`🎯 Intent: ${result.intent.label} (confidence: ${result.intent.confidence.toFixed(3)})`);
      console.log(`🤖 Model used: ${result.modelUsed}`);
      console.log(`📊 Processing strategy: ${result.processingStrategy}`);
      
      // Check performance
      if (processingTime > 100) {
        console.log(`⚠️  Warning: Processing time exceeded 100ms (${processingTime}ms)`);
      } else {
        console.log(`✅ Performance requirement met (< 100ms)`);
      }
      
      // Verify expected entities were found
      const foundEntities = result.entities.map((e: any) => e.text.toLowerCase());
      const missingEntities = testCase.expectedEntities.filter(
        expected => !foundEntities.some((found: string) => found.includes(expected.toLowerCase()))
      );
      
      if (missingEntities.length > 0) {
        console.log(`⚠️  Missing expected entities: ${missingEntities.join(', ')}`);
      } else {
        console.log(`✅ All expected entities found`);
      }
      
      console.log('---\n');
    }

    // Test batch processing
    console.log('🔄 Testing batch processing:\n');
    const batchTexts = [
      'Find free React components',
      'Compare Vue vs Angular',
      'Python API library needed',
      'TypeScript framework for enterprise'
    ];
    
    const batchStartTime = Date.now();
    const batchResults = await localNLPService.processBatch(batchTexts, {
      extractEntities: true,
      classifyIntent: true,
      extractVocabulary: false
    });
    const batchProcessingTime = Date.now() - batchStartTime;
    
    console.log(`⏱️  Batch processing time: ${batchProcessingTime}ms for ${batchTexts.length} texts`);
    console.log(`📊 Average time per text: ${(batchProcessingTime / batchTexts.length).toFixed(2)}ms`);
    
    batchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. "${batchTexts[index]}" -> ${result.entities.length} entities, intent: ${result.intent.label}`);
    });
    
    // Test caching
    console.log('\n💾 Testing caching performance:\n');
    const cacheTestText = 'Find free React components for dashboard';
    
    // First call (should load from model)
    const firstCallStart = Date.now();
    const firstResult = await localNLPService.processText(cacheTestText);
    const firstCallTime = Date.now() - firstCallStart;
    
    // Second call (should use cache)
    const secondCallStart = Date.now();
    const secondResult = await localNLPService.processText(cacheTestText);
    const secondCallTime = Date.now() - secondCallStart;
    
    console.log(`First call: ${firstCallTime}ms`);
    console.log(`Second call (cached): ${secondCallTime}ms`);
    console.log(`Cache speedup: ${((firstCallTime - secondCallTime) / firstCallTime * 100).toFixed(1)}%`);
    
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
    
    console.log('\n✅ transformers.js integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Check if it's a model loading error
    if ((error as Error).message.includes('Failed to load')) {
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Check internet connection for model download');
      console.log('2. Ensure sufficient disk space for model cache');
      console.log('3. Verify TRANSFORMERS_CACHE environment variable is set');
      console.log('4. Try running with fallback mode enabled');
    }
    
    process.exit(1);
  }
}

// Run the test
testTransformersIntegration();
