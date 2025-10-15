import { localNLPService } from '../src/services/local-nlp.service';

async function testZeroShotIntentClassification() {
  console.log('🧪 Testing zero-shot intent classification...\n');

  try {
    // Initialize the service
    console.log('📦 Initializing Local NLP Service...');
    await localNLPService.initialize();
    
    // Test cases for intent classification
    const testCases = [
      {
        text: 'Find free React components',
        expectedIntent: 'filter_search',
        description: 'Filter search with pricing constraint'
      },
      {
        text: 'Compare Vue.js vs Angular performance',
        expectedIntent: 'comparison_query',
        description: 'Comparison query between technologies'
      },
      {
        text: 'I need a Python API library for machine learning',
        expectedIntent: 'discovery',
        description: 'Discovery query for specific technology'
      },
      {
        text: 'Show me all frontend frameworks',
        expectedIntent: 'exploration',
        description: 'General exploration query'
      },
      {
        text: 'What are the best open source database tools?',
        expectedIntent: 'filter_search',
        description: 'Filter search with open source constraint'
      },
      {
        text: 'How does TypeScript compare to JavaScript?',
        expectedIntent: 'comparison_query',
        description: 'Comparison query for languages'
      },
      {
        text: 'Looking for REST API testing tools',
        expectedIntent: 'discovery',
        description: 'Discovery query with specific functionality'
      },
      {
        text: 'Browse all available development tools',
        expectedIntent: 'exploration',
        description: 'General browsing query'
      }
    ];

    console.log('🎯 Testing intent classification:\n');
    
    let correctClassifications = 0;
    let totalTime = 0;
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`Test ${i + 1}: ${testCase.description}`);
      console.log(`Input: "${testCase.text}"`);
      console.log(`Expected intent: ${testCase.expectedIntent}`);
      
      const startTime = Date.now();
      const result = await localNLPService.processText(testCase.text, {
        extractEntities: false,
        classifyIntent: true,
        extractVocabulary: false
      });
      const processingTime = Date.now() - startTime;
      totalTime += processingTime;
      
      console.log(`⏱️  Processing time: ${processingTime}ms`);
      console.log(`🎯 Classified intent: ${result.intent.label} (confidence: ${result.intent.confidence.toFixed(3)})`);
      console.log(`🤖 Model used: ${result.modelUsed}`);
      console.log(`📊 Processing strategy: ${result.processingStrategy}`);
      
      // Check performance
      if (processingTime > 50) {
        console.log(`⚠️  Warning: Processing time exceeded 50ms (${processingTime}ms)`);
      } else {
        console.log(`✅ Performance requirement met (< 50ms)`);
      }
      
      // Verify classification accuracy
      const isCorrect = result.intent.label === testCase.expectedIntent;
      if (isCorrect) {
        correctClassifications++;
        console.log(`✅ Correct classification`);
      } else {
        console.log(`❌ Incorrect classification (expected: ${testCase.expectedIntent})`);
      }
      
      console.log('---\n');
    }

    // Performance analysis
    const averageTime = totalTime / testCases.length;
    const accuracy = (correctClassifications / testCases.length) * 100;
    
    console.log('📈 Performance Analysis:');
    console.log(`Total processing time: ${totalTime}ms`);
    console.log(`Average time per classification: ${averageTime.toFixed(2)}ms`);
    console.log(`Accuracy: ${accuracy.toFixed(1)}% (${correctClassifications}/${testCases.length} correct)`);
    
    // Performance requirements check
    if (averageTime <= 50) {
      console.log(`✅ Performance requirement met: Average time < 50ms`);
    } else {
      console.log(`❌ Performance requirement failed: Average time > 50ms`);
    }
    
    // Accuracy check
    if (accuracy >= 80) {
      console.log(`✅ Good accuracy: ${accuracy.toFixed(1)}% ≥ 80%`);
    } else {
      console.log(`⚠️  Low accuracy: ${accuracy.toFixed(1)}% < 80%`);
    }

    // Test with confidence threshold
    console.log('\n🔍 Testing confidence threshold handling:');
    const lowConfidenceText = 'xyz abc 123 random text';
    const lowConfidenceResult = await localNLPService.processText(lowConfidenceText, {
      extractEntities: false,
      classifyIntent: true,
      extractVocabulary: false
    });
    
    console.log(`Low confidence test: "${lowConfidenceText}"`);
    console.log(`Intent: ${lowConfidenceResult.intent.label} (confidence: ${lowConfidenceResult.intent.confidence.toFixed(3)})`);
    console.log(`Strategy: ${lowConfidenceResult.processingStrategy}`);
    
    if (lowConfidenceResult.processingStrategy === 'llm_fallback') {
      console.log('✅ Fallback mechanism working for low confidence');
    } else {
      console.log('ℹ️  No fallback triggered (confidence may be above threshold)');
    }
    
    // Health check
    console.log(`\n🏥 Service health check:`);
    const healthCheck = await localNLPService.healthCheck();
    console.log(`  Status: ${healthCheck.status}`);
    console.log(`  Initialized: ${healthCheck.details.initialized}`);
    console.log(`  Model load time: ${healthCheck.details.modelLoadTime}ms`);
    console.log(`  Cache size: ${healthCheck.details.cacheSize}`);
    console.log(`  Fallback enabled: ${healthCheck.details.fallbackEnabled}`);
    
    // Get cache statistics
    const cacheStats = localNLPService.getCacheStats();
    console.log(`\n📈 Cache statistics:`);
    console.log(`  Model cache size: ${cacheStats.modelCache.size}/${cacheStats.modelCache.maxSize}`);
    console.log(`  Result cache size: ${cacheStats.resultCache.size}`);
    
    console.log('\n✅ Zero-shot intent classification test completed!');
    
    return {
      averageTime,
      accuracy,
      correctClassifications,
      totalTests: testCases.length
    };
    
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
testZeroShotIntentClassification()
  .then((results) => {
    console.log('\n📊 Test Results Summary:');
    console.log(`- Average processing time: ${results.averageTime.toFixed(2)}ms`);
    console.log(`- Classification accuracy: ${results.accuracy.toFixed(1)}%`);
    console.log(`- Tests passed: ${results.correctClassifications}/${results.totalTests}`);
    
    // Exit with error code if performance or accuracy is too low
    if (results.averageTime > 50 || results.accuracy < 70) {
      console.log('\n⚠️  Performance or accuracy below acceptable threshold');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed successfully!');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
