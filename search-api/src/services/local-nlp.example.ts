/**
 * Example usage of the Local NLP Service
 * 
 * This file demonstrates how to use the local NLP service for text processing,
 * entity extraction, intent classification, and vocabulary extraction.
 */

import { localNLPService } from './local-nlp.service';
import { LocalNLPConfig } from '@/config/enhanced-search-config';

async function demonstrateLocalNLPService() {
  console.log('=== Local NLP Service Demo ===\n');

  // Initialize the service
  console.log('1. Initializing Local NLP Service...');
  await localNLPService.initialize();
  
  const health = await localNLPService.healthCheck();
  console.log(`Health Status: ${health.status}`);
  console.log(`Initialized: ${health.details.initialized}`);
  console.log(`Model Load Time: ${health.details.modelLoadTime}ms\n`);

  // Example 1: Basic text processing
  console.log('2. Basic Text Processing');
  console.log('------------------------');
  
  const query1 = 'Find free React components for dashboard development';
  console.log(`Query: "${query1}"`);
  
  const result1 = await localNLPService.processText(query1);
  console.log(`Processing Time: ${result1.processingTime}ms`);
  console.log(`Strategy: ${result1.processingStrategy}`);
  console.log(`Model Used: ${result1.modelUsed}`);
  
  console.log('\nEntities Found:');
  result1.entities.forEach(entity => {
    console.log(`  - ${entity.text} (${entity.type}) - Confidence: ${entity.confidence.toFixed(2)}`);
  });
  
  console.log(`\nIntent: ${result1.intent.label} (Confidence: ${result1.intent.confidence.toFixed(2)})`);
  
  console.log('\nVocabulary Candidates:');
  Object.entries(result1.vocabularyCandidates).forEach(([category, candidates]) => {
    if (candidates.length > 0) {
      console.log(`  ${category}:`);
      candidates.forEach(candidate => {
        console.log(`    - ${candidate.value} (${candidate.confidence.toFixed(2)})`);
      });
    }
  });
  console.log();

  // Example 2: Comparison query
  console.log('3. Comparison Query Processing');
  console.log('------------------------------');
  
  const query2 = 'React vs Vue vs Angular for enterprise applications';
  console.log(`Query: "${query2}"`);
  
  const result2 = await localNLPService.processText(query2);
  console.log(`Intent: ${result2.intent.label} (Confidence: ${result2.intent.confidence.toFixed(2)})`);
  
  console.log('\nEntities Found:');
  result2.entities.forEach(entity => {
    console.log(`  - ${entity.text} (${entity.type}) - Confidence: ${entity.confidence.toFixed(2)}`);
  });
  console.log();

  // Example 3: Filter search with specific options
  console.log('4. Filter Search with Options');
  console.log('-----------------------------');
  
  const query3 = 'Open source API tools for Node.js with TypeScript support';
  console.log(`Query: "${query3}"`);
  
  const result3 = await localNLPService.processText(query3, {
    extractEntities: true,
    classifyIntent: true,
    extractVocabulary: true
  });
  
  console.log(`Intent: ${result3.intent.label}`);
  console.log(`Processing Strategy: ${result3.processingStrategy}`);
  
  // Show pricing-related vocabulary
  if (result3.vocabularyCandidates.pricing) {
    console.log('\nPricing Vocabulary:');
    result3.vocabularyCandidates.pricing.forEach(candidate => {
      console.log(`  - ${candidate.value} (${candidate.confidence.toFixed(2)})`);
    });
  }
  
  // Show interface-related vocabulary
  if (result3.vocabularyCandidates.interfaces) {
    console.log('\nInterface Vocabulary:');
    result3.vocabularyCandidates.interfaces.forEach(candidate => {
      console.log(`  - ${candidate.value} (${candidate.confidence.toFixed(2)})`);
    });
  }
  console.log();

  // Example 4: Batch processing
  console.log('5. Batch Processing');
  console.log('-------------------');
  
  const queries = [
    'Find free React components',
    'Compare Vue and Angular',
    'API library for Python development',
    'Database tools for microservices',
    'Testing frameworks for TypeScript'
  ];
  
  console.log(`Processing ${queries.length} queries in batch...`);
  const startTime = Date.now();
  
  const batchResults = await localNLPService.processBatch(queries);
  
  const batchTime = Date.now() - startTime;
  console.log(`Batch processing time: ${batchTime}ms`);
  console.log(`Average time per query: ${(batchTime / queries.length).toFixed(2)}ms`);
  
  console.log('\nBatch Results Summary:');
  batchResults.forEach((result, index) => {
    console.log(`  ${index + 1}. "${queries[index]}"`);
    console.log(`     Intent: ${result.intent.label} (${result.processingTime}ms)`);
    console.log(`     Entities: ${result.entities.length}`);
  });
  console.log();

  // Example 5: Configuration customization
  console.log('6. Configuration Customization');
  console.log('--------------------------------');
  
  console.log('Current configuration:');
  const currentConfig = localNLPService.getConfig();
  console.log(`  Confidence Threshold: ${currentConfig.confidenceThreshold}`);
  console.log(`  Max Processing Time: ${currentConfig.maxProcessingTime}ms`);
  console.log(`  Fallback Enabled: ${currentConfig.fallbackEnabled}`);
  console.log(`  Batch Processing: ${currentConfig.batchProcessingEnabled}`);
  console.log(`  Max Batch Size: ${currentConfig.maxBatchSize}`);
  
  // Update configuration
  console.log('\nUpdating configuration...');
  localNLPService.updateConfig({
    confidenceThreshold: 0.8,
    maxProcessingTime: 150,
    fallbackEnabled: true
  });
  
  const updatedConfig = localNLPService.getConfig();
  console.log(`New Confidence Threshold: ${updatedConfig.confidenceThreshold}`);
  console.log(`New Max Processing Time: ${updatedConfig.maxProcessingTime}ms`);
  
  // Test with new configuration
  const query4 = 'Find development tools';
  const result4 = await localNLPService.processText(query4);
  console.log(`\nTest with new config: "${query4}"`);
  console.log(`Entities found: ${result4.entities.length} (higher confidence threshold)`);
  console.log(`Processing time: ${result4.processingTime}ms`);
  console.log();

  // Example 6: Cache statistics
  console.log('7. Cache Statistics');
  console.log('-------------------');
  
  const cacheStats = localNLPService.getCacheStats();
  console.log(`Model Cache Size: ${cacheStats.modelCache.size}/${cacheStats.modelCache.maxSize}`);
  console.log(`Result Cache Size: ${cacheStats.resultCache.size}`);
  
  if (cacheStats.modelCache.models.length > 0) {
    console.log('Cached Models:');
    cacheStats.modelCache.models.forEach(model => {
      console.log(`  - ${model}`);
    });
  }
  console.log();

  // Example 7: Performance monitoring
  console.log('8. Performance Monitoring');
  console.log('--------------------------');
  
  const performanceQueries = [
    'Short query',
    'This is a medium length query with some specific terms like React and TypeScript',
    'This is a very long query that contains many different terms and concepts that might take more time to process including various technology terms like React Vue Angular Node.js Python JavaScript TypeScript API CLI GUI library framework and many other terms'
  ];
  
  for (const query of performanceQueries) {
    const result = await localNLPService.processText(query);
    console.log(`Query length: ${query.length} chars, Processing time: ${result.processingTime}ms`);
  }
  console.log();

  // Example 8: Error handling and fallback
  console.log('9. Error Handling and Fallback');
  console.log('--------------------------------');
  
  // Test with edge cases
  const edgeCases = [
    '', // Empty string
    '   ', // Whitespace only
    'a'.repeat(1000), // Very long single character
    '🚀🔥💻📱' // Emojis only
  ];
  
  for (const edgeCase of edgeCases) {
    try {
      const result = await localNLPService.processText(edgeCase);
      console.log(`Edge case "${edgeCase.substring(0, 20)}${edgeCase.length > 20 ? '...' : ''}":`);
      console.log(`  Strategy: ${result.processingStrategy}`);
      console.log(`  Processing time: ${result.processingTime}ms`);
    } catch (error) {
      console.log(`Edge case failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log();

  // Final health check
  console.log('10. Final Health Check');
  console.log('----------------------');
  
  const finalHealth = await localNLPService.healthCheck();
  console.log(`Final Status: ${finalHealth.status}`);
  console.log(`Cache Size: ${finalHealth.details.cacheSize}`);
  console.log(`Fallback Enabled: ${finalHealth.details.fallbackEnabled}`);
  
  console.log('\n=== Demo Complete ===');
}

// Configuration examples
function demonstrateConfiguration() {
  console.log('\n=== Configuration Examples ===\n');
  
  // Example configurations for different use cases
  const configurations: Record<string, Partial<LocalNLPConfig>> = {
    'High Performance': {
      confidenceThreshold: 0.6,
      maxProcessingTime: 50,
      modelCacheEnabled: true,
      modelCacheSize: 3,
      batchProcessingEnabled: true,
      maxBatchSize: 20
    },
    'High Accuracy': {
      confidenceThreshold: 0.9,
      maxProcessingTime: 500,
      fallbackEnabled: true,
      fallbackThreshold: 0.7
    },
    'Resource Constrained': {
      modelCacheEnabled: false,
      batchProcessingEnabled: false,
      maxProcessingTime: 100,
      confidenceThreshold: 0.7
    },
    'Development': {
      confidenceThreshold: 0.5,
      fallbackEnabled: true,
      modelCacheEnabled: true,
      batchProcessingEnabled: true
    }
  };
  
  Object.entries(configurations).forEach(([name, config]) => {
    console.log(`${name} Configuration:`);
    Object.entries(config).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log();
  });
}

// Run the demonstration
if (require.main === module) {
  demonstrateLocalNLPService()
    .then(() => {
      demonstrateConfiguration();
      console.log('\nAll demonstrations completed successfully!');
    })
    .catch(error => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

export { demonstrateLocalNLPService, demonstrateConfiguration };
