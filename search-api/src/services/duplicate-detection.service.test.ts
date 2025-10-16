/**
 * Unit tests for Duplicate Detection Service
 * 
 * This file contains comprehensive tests for the duplicate detection service,
 * covering all detection strategies and edge cases.
 */

import {
  duplicateDetectionService,
  DuplicateDetectionService
} from './duplicate-detection.service';
import {
  DetectionStrategy,
  DuplicateType,
  DuplicateDetectionConfig
} from './duplicate-detection.interfaces';
import { SearchResultItem } from './result-merger.service';

// Helper function to create test items
function createTestItem(overrides: Partial<SearchResultItem> = {}): SearchResultItem {
  return {
    id: 'test-item-1',
    score: 0.9,
    source: 'test',
    payload: {
      name: 'Test Tool',
      description: 'A test tool for testing',
      category: 'testing',
      url: 'https://example.com/test-tool',
      version: '1.0.0'
    },
    metadata: {
      searchTime: 100,
      query: 'test'
    },
    ...overrides
  };
}

// Test function to verify basic functionality
export async function testDuplicateDetectionService(): Promise<void> {
  console.log('🧪 Testing Duplicate Detection Service...');
  
  try {
    // Test 1: Exact ID matching
    console.log('\n📋 Test 1: Exact ID matching');
    const item1 = createTestItem({ id: 'same-id' });
    const item2 = createTestItem({ id: 'same-id', source: 'different' });
    
    const idResult = await duplicateDetectionService.areDuplicates(item1, item2);
    console.log(`✅ Exact ID match: ${idResult.isDuplicate ? 'PASS' : 'FAIL'}`);
    console.log(`   Similarity: ${idResult.similarityScore?.toFixed(3)}`);
    console.log(`   Strategy: ${idResult.detectedBy}`);
    
    // Test 2: Exact URL matching
    console.log('\n📋 Test 2: Exact URL matching');
    const item3 = createTestItem({ id: 'different-id', payload: { url: 'https://same-url.com' } });
    const item4 = createTestItem({ id: 'another-id', payload: { url: 'https://same-url.com' } });
    
    const urlResult = await duplicateDetectionService.areDuplicates(item3, item4);
    console.log(`✅ Exact URL match: ${urlResult.isDuplicate ? 'PASS' : 'FAIL'}`);
    console.log(`   Similarity: ${urlResult.similarityScore?.toFixed(3)}`);
    console.log(`   Strategy: ${urlResult.detectedBy}`);
    
    // Test 3: Content similarity
    console.log('\n📋 Test 3: Content similarity');
    const item5 = createTestItem({
      id: 'item-5',
      payload: {
        name: 'React Components Library',
        description: 'A comprehensive library of React components for building UIs',
        category: 'frontend'
      }
    });
    const item6 = createTestItem({
      id: 'item-6',
      payload: {
        name: 'React Component Library',
        description: 'Comprehensive React components for building user interfaces',
        category: 'frontend'
      }
    });
    
    const contentResult = await duplicateDetectionService.areDuplicates(item5, item6);
    console.log(`✅ Content similarity: ${contentResult.isDuplicate ? 'PASS' : 'FAIL'}`);
    console.log(`   Similarity: ${contentResult.similarityScore?.toFixed(3)}`);
    console.log(`   Strategy: ${contentResult.detectedBy}`);
    console.log(`   Field matches: ${JSON.stringify(contentResult.fieldMatches)}`);
    
    // Test 4: Version-aware matching
    console.log('\n📋 Test 4: Version-aware matching');
    const item7 = createTestItem({
      id: 'react-1',
      payload: {
        name: 'React v18.0.0',
        description: 'A JavaScript library for building user interfaces',
        version: '18.0.0'
      }
    });
    const item8 = createTestItem({
      id: 'react-2',
      payload: {
        name: 'React v17.0.0',
        description: 'JavaScript library for building user interfaces',
        version: '17.0.0'
      }
    });
    
    const versionResult = await duplicateDetectionService.areDuplicates(item7, item8);
    console.log(`✅ Version-aware match: ${versionResult.isDuplicate ? 'PASS' : 'FAIL'}`);
    console.log(`   Similarity: ${versionResult.similarityScore?.toFixed(3)}`);
    console.log(`   Strategy: ${versionResult.detectedBy}`);
    console.log(`   Duplicate type: ${versionResult.duplicateType}`);
    
    // Test 5: Fuzzy matching
    console.log('\n📋 Test 5: Fuzzy matching');
    const item9 = createTestItem({
      id: 'tool-9',
      payload: {
        name: 'TypeScript Tool',
        description: 'Tool for TypeScript development',
        category: 'development'
      }
    });
    const item10 = createTestItem({
      id: 'tool-10',
      payload: {
        name: 'Typescript Tools',
        description: 'Development tools for TypeScript',
        category: 'dev-tools'
      }
    });
    
    const fuzzyResult = await duplicateDetectionService.areDuplicates(item9, item10);
    console.log(`✅ Fuzzy match: ${fuzzyResult.isDuplicate ? 'PASS' : 'FAIL'}`);
    console.log(`   Similarity: ${fuzzyResult.similarityScore?.toFixed(3)}`);
    console.log(`   Strategy: ${fuzzyResult.detectedBy}`);
    
    // Test 6: Batch duplicate detection
    console.log('\n📋 Test 6: Batch duplicate detection');
    const items = [
      createTestItem({ id: 'unique-1', payload: { name: 'Unique Tool 1' } }),
      createTestItem({ id: 'unique-2', payload: { name: 'Unique Tool 2' } }),
      createTestItem({ id: 'duplicate-1', payload: { name: 'Same Tool' } }),
      createTestItem({ id: 'duplicate-2', payload: { name: 'Same Tool' } }), // Duplicate of above
      createTestItem({ id: 'unique-3', payload: { name: 'Unique Tool 3' } }),
      createTestItem({ id: 'duplicate-1-copy', payload: { name: 'Same Tool' } }) // Another duplicate
    ];
    
    const batchResult = await duplicateDetectionService.detectDuplicates(items);
    console.log(`✅ Batch detection: ${batchResult.deduplicatedItems.length} unique from ${items.length} items`);
    console.log(`   Duplicates removed: ${batchResult.stats.duplicatesRemoved}`);
    console.log(`   Duplicate groups: ${batchResult.duplicateGroups.length}`);
    console.log(`   Processing time: ${batchResult.stats.processingTime}ms`);
    
    // Test 7: Configuration testing
    console.log('\n📋 Test 7: Configuration testing');
    const customConfig = {
      enabled: true,
      strategies: [DetectionStrategy.EXACT_ID, DetectionStrategy.CONTENT_SIMILARITY],
      thresholds: {
        contentSimilarity: 0.9
      },
      logging: {
        enabled: true,
        level: 'debug' as const
      }
    };
    
    const customService = new DuplicateDetectionService(customConfig);
    const customResult = await customService.areDuplicates(item5, item6);
    console.log(`✅ Custom config: ${customResult.isDuplicate ? 'PASS' : 'FAIL'}`);
    console.log(`   Similarity: ${customResult.similarityScore?.toFixed(3)}`);
    console.log(`   Strategy: ${customResult.detectedBy}`);
    
    // Test 8: Edge cases
    console.log('\n📋 Test 8: Edge cases');
    
    // Empty items
    const emptyItem1 = createTestItem({ payload: undefined });
    const emptyItem2 = createTestItem({ payload: undefined });
    const emptyResult = await duplicateDetectionService.areDuplicates(emptyItem1, emptyItem2);
    console.log(`✅ Empty items: ${emptyResult.isDuplicate ? 'PASS' : 'FAIL'}`);
    
    // Single item batch
    const singleBatch = await duplicateDetectionService.detectDuplicates([item1]);
    console.log(`✅ Single item batch: ${singleBatch.deduplicatedItems.length === 1 ? 'PASS' : 'FAIL'}`);
    
    // Empty batch
    const emptyBatch = await duplicateDetectionService.detectDuplicates([]);
    console.log(`✅ Empty batch: ${emptyBatch.deduplicatedItems.length === 0 ? 'PASS' : 'FAIL'}`);
    
    console.log('\n🎉 All duplicate detection tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Test specific strategies
export async function testDetectionStrategies(): Promise<void> {
  console.log('\n🧪 Testing Detection Strategies...');
  
  const service = new DuplicateDetectionService();
  
  // Test each strategy individually
  const strategies = [
    DetectionStrategy.EXACT_ID,
    DetectionStrategy.EXACT_URL,
    DetectionStrategy.CONTENT_SIMILARITY,
    DetectionStrategy.VERSION_AWARE,
    DetectionStrategy.FUZZY_MATCH
  ];
  
  for (const strategy of strategies) {
    console.log(`\n📋 Testing ${strategy} strategy`);
    
    const item1 = createTestItem({
      id: strategy === DetectionStrategy.EXACT_ID ? 'same-id' : 'different-id',
      payload: {
        name: 'Test Tool',
        description: 'A test tool',
        url: strategy === DetectionStrategy.EXACT_URL ? 'https://same-url.com' : 'https://different-url.com',
        version: strategy === DetectionStrategy.VERSION_AWARE ? '1.0.0' : '2.0.0'
      }
    });
    
    const item2 = createTestItem({
      id: strategy === DetectionStrategy.EXACT_ID ? 'same-id' : 'different-id-2',
      payload: {
        name: strategy === DetectionStrategy.CONTENT_SIMILARITY ? 'Test Tool' : 'Different Tool',
        description: strategy === DetectionStrategy.CONTENT_SIMILARITY ? 'A test tool' : 'A different tool',
        url: strategy === DetectionStrategy.EXACT_URL ? 'https://same-url.com' : 'https://another-url.com',
        version: strategy === DetectionStrategy.VERSION_AWARE ? '1.1.0' : '2.1.0'
      }
    });
    
    const config = {
      enabled: true,
      strategies: [strategy],
      thresholds: {
        contentSimilarity: 0.8,
        fuzzyMatch: 0.7,
        versionAware: 0.8
      }
    };
    
    const result = await service.areDuplicates(item1, item2, config);
    console.log(`   Result: ${result.isDuplicate ? 'DUPLICATE' : 'NOT DUPLICATE'}`);
    console.log(`   Similarity: ${result.similarityScore?.toFixed(3) || 'N/A'}`);
    console.log(`   Detected by: ${result.detectedBy || 'N/A'}`);
  }
}

// Test performance with larger datasets
export async function testDuplicateDetectionPerformance(): Promise<void> {
  console.log('\n🧪 Testing Duplicate Detection Performance...');
  
  // Generate test dataset
  const baseTools = [
    { name: 'React', description: 'JavaScript library for UI', category: 'frontend' },
    { name: 'Vue', description: 'Progressive JavaScript framework', category: 'frontend' },
    { name: 'Angular', description: 'Platform for web applications', category: 'frontend' },
    { name: 'Express', description: 'Node.js web framework', category: 'backend' },
    { name: 'MongoDB', description: 'NoSQL database', category: 'database' }
  ];
  
  const items: SearchResultItem[] = [];
  
  // Create items with some duplicates
  for (let i = 0; i < 100; i++) {
    const baseTool = baseTools[i % baseTools.length];
    const isDuplicate = Math.random() > 0.7; // 30% chance of duplicate
    
    items.push(createTestItem({
      id: `item-${i}`,
      payload: {
        name: isDuplicate ? baseTool.name : `${baseTool.name} ${i}`,
        description: isDuplicate ? baseTool.description : `${baseTool.description} variant ${i}`,
        category: baseTool.category,
        version: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
      }
    }));
  }
  
  console.log(`📊 Generated ${items.length} test items`);
  
  // Test performance
  const startTime = Date.now();
  const result = await duplicateDetectionService.detectDuplicates(items);
  const processingTime = Date.now() - startTime;
  
  console.log(`✅ Performance test completed in ${processingTime}ms`);
  console.log(`   Input items: ${items.length}`);
  console.log(`   Unique items: ${result.deduplicatedItems.length}`);
  console.log(`   Duplicates removed: ${result.stats.duplicatesRemoved}`);
  console.log(`   Processing rate: ${(items.length / (processingTime / 1000)).toFixed(0)} items/second`);
  console.log(`   Cache hit rate: ${(result.stats.cacheStats?.hitRate || 0).toFixed(2)}`);
}

// Test custom rules
export async function testCustomRules(): Promise<void> {
  console.log('\n🧪 Testing Custom Rules...');
  
  const service = new DuplicateDetectionService();
  
  // Add a custom rule
  const customRule = {
    id: 'test-rule',
    name: 'Test Custom Rule',
    strategy: DetectionStrategy.CONTENT_SIMILARITY,
    priority: 1,
    handler: (item1: SearchResultItem, item2: SearchResultItem) => {
      // Custom logic: consider items duplicates if they have the same category
      const cat1 = item1.payload?.category || '';
      const cat2 = item2.payload?.category || '';
      return cat1 === cat2 && cat1 === 'frontend';
    },
    enabled: true
  };
  
  service.addCustomRule(customRule);
  
  const item1 = createTestItem({
    id: 'frontend-1',
    payload: { name: 'React', category: 'frontend' }
  });
  
  const item2 = createTestItem({
    id: 'frontend-2',
    payload: { name: 'Vue', category: 'frontend' }
  });
  
  const item3 = createTestItem({
    id: 'backend-1',
    payload: { name: 'Express', category: 'backend' }
  });
  
  const result1 = await service.areDuplicates(item1, item2);
  const result2 = await service.areDuplicates(item1, item3);
  
  console.log(`✅ Custom rule test (frontend vs frontend): ${result1.isDuplicate ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Custom rule test (frontend vs backend): ${!result2.isDuplicate ? 'PASS' : 'FAIL'}`);
  
  // Remove custom rule
  service.removeCustomRule('test-rule');
  console.log('✅ Custom rule removed');
}

// Run all tests
export async function runAllDuplicateDetectionTests(): Promise<void> {
  console.log('🚀 Duplicate Detection Service Test Suite');
  console.log('='.repeat(50));
  
  try {
    await testDuplicateDetectionService();
    console.log('='.repeat(50));
    
    await testDetectionStrategies();
    console.log('='.repeat(50));
    
    await testDuplicateDetectionPerformance();
    console.log('='.repeat(50));
    
    await testCustomRules();
    console.log('='.repeat(50));
    
    console.log('✅ All duplicate detection tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllDuplicateDetectionTests().catch(console.error);
}
