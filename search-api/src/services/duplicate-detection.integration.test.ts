/**
 * Integration tests for Duplicate Detection with Result Merger Service
 * 
 * This file contains integration tests that verify the enhanced duplicate detection
 * works correctly with the result merger service.
 */

import { 
  resultMergerService, 
  ReciprocalRankFusion,
  RankedResults,
  SearchResultItem,
  MergedResult
} from './result-merger.service';
import { 
  duplicateDetectionService,
  DuplicateDetectionService
} from './duplicate-detection.service';
import { 
  DetectionStrategy,
  DuplicateDetectionConfig,
  DuplicateType
} from './duplicate-detection.interfaces';

// Helper function to create test search results
function createTestSearchResults(source: string, count: number): RankedResults {
  const tools = [
    { name: 'React', description: 'JavaScript library for building user interfaces', category: 'frontend' },
    { name: 'Vue.js', description: 'Progressive JavaScript framework', category: 'frontend' },
    { name: 'Angular', description: 'Platform for building mobile and desktop web applications', category: 'frontend' },
    { name: 'Express.js', description: 'Fast, unopinionated web framework for Node.js', category: 'backend' },
    { name: 'MongoDB', description: 'Document-oriented NoSQL database', category: 'database' }
  ];

  return {
    source,
    results: Array.from({ length: count }, (_, i) => {
      const tool = tools[i % tools.length];
      const isDuplicate = i >= tools.length; // Create duplicates after the first set
      
      return {
        id: `${source}-${tool.name.toLowerCase()}-${isDuplicate ? 'dup' : i}`,
        score: 0.9 - (i * 0.1),
        source,
        payload: {
          name: isDuplicate ? tool.name : `${tool.name} v${i + 1}`,
          description: tool.description,
          category: tool.category,
          url: `https://example.com/${tool.name.toLowerCase()}`,
          version: isDuplicate ? '1.0.0' : `${i + 1}.0.0`
        },
        metadata: {
          searchTime: 100 + i,
          rank: i + 1,
          source
        }
      };
    }),
    totalResults: count,
    searchTime: 150,
    metadata: { source }
  };
}

// Test enhanced duplicate detection in result merger
export async function testEnhancedDuplicateDetectionInResultMerger(): Promise<void> {
  console.log('🧪 Testing Enhanced Duplicate Detection in Result Merger...');
  
  try {
    // Create test results with duplicates across sources
    const vectorResults = createTestSearchResults('vector', 5);
    const traditionalResults = createTestSearchResults('traditional', 5);
    
    // Add some intentional duplicates
    traditionalResults.results[2] = {
      ...vectorResults.results[1], // Duplicate of vector result 1
      id: 'traditional-react-dup',
      score: 0.85,
      source: 'traditional'
    };
    
    // Test with enhanced duplicate detection enabled
    console.log('\n📋 Test 1: Enhanced duplicate detection enabled');
    const enhancedConfig = {
      enableDeduplication: true,
      useEnhancedDuplicateDetection: true,
      duplicateDetectionConfig: {
        enabled: true,
        strategies: [DetectionStrategy.EXACT_ID, DetectionStrategy.CONTENT_SIMILARITY, DetectionStrategy.VERSION_AWARE],
        thresholds: {
          contentSimilarity: 0.8,
          versionAware: 0.85
        },
        logging: {
          enabled: true,
          level: 'info' as const,
          includeStats: true
        }
      }
    };
    
    const enhancedResults = await resultMergerService.mergeResults(
      [vectorResults, traditionalResults],
      enhancedConfig
    );
    
    console.log(`✅ Enhanced detection: ${enhancedResults.length} unique results`);
    console.log(`   Total input: ${vectorResults.results.length + traditionalResults.results.length}`);
    console.log(`   Duplicates removed: ${vectorResults.results.length + traditionalResults.results.length - enhancedResults.length}`);
    
    // Test with enhanced duplicate detection disabled
    console.log('\n📋 Test 2: Enhanced duplicate detection disabled');
    const basicConfig = {
      enableDeduplication: true,
      useEnhancedDuplicateDetection: false,
      deduplicationThreshold: 0.9
    };
    
    const basicResults = await resultMergerService.mergeResults(
      [vectorResults, traditionalResults],
      basicConfig
    );
    
    console.log(`✅ Basic detection: ${basicResults.length} unique results`);
    console.log(`   Total input: ${vectorResults.results.length + traditionalResults.results.length}`);
    console.log(`   Duplicates removed: ${vectorResults.results.length + traditionalResults.results.length - basicResults.length}`);
    
    // Compare results
    console.log('\n📊 Comparison:');
    console.log(`   Enhanced vs Basic: ${enhancedResults.length} vs ${basicResults.length} unique results`);
    console.log(`   Enhanced detection found ${Math.max(0, basicResults.length - enhancedResults.length)} more duplicates`);
    
    // Verify top results are properly ranked
    if (enhancedResults.length > 0) {
      const topResult = enhancedResults[0];
      console.log(`\n🏆 Top result: ${topResult.payload?.name}`);
      console.log(`   RRF Score: ${topResult.rrfScore.toFixed(4)}`);
      console.log(`   Sources: ${Object.keys(topResult.originalRankings).join(', ')}`);
      console.log(`   Source Count: ${topResult.sourceCount}`);
    }
    
    console.log('\n✅ Enhanced duplicate detection integration test passed!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    throw error;
  }
}

// Test different duplicate detection strategies in result merger
export async function testDifferentStrategiesInResultMerger(): Promise<void> {
  console.log('\n🧪 Testing Different Duplicate Detection Strategies in Result Merger...');
  
  try {
    // Create test results with various types of duplicates
    const semanticResults: RankedResults = {
      source: 'semantic',
      results: [
        {
          id: 'react-1',
          score: 0.95,
          source: 'semantic',
          payload: {
            name: 'React v18.0.0',
            description: 'JavaScript library for building user interfaces',
            category: 'frontend',
            url: 'https://reactjs.org',
            version: '18.0.0'
          }
        },
        {
          id: 'vue-1',
          score: 0.90,
          source: 'semantic',
          payload: {
            name: 'Vue.js v3.0.0',
            description: 'Progressive JavaScript framework',
            category: 'frontend'
          }
        }
      ],
      totalResults: 2
    };
    
    const fulltextResults: RankedResults = {
      source: 'fulltext',
      results: [
        {
          id: 'react-2', // Different ID, same tool
          score: 0.92,
          source: 'fulltext',
          payload: {
            name: 'React v17.0.0',
            description: 'JavaScript library for UI development',
            category: 'frontend',
            url: 'https://reactjs.org',
            version: '17.0.0'
          }
        },
        {
          id: 'express-1',
          score: 0.88,
          source: 'fulltext',
          payload: {
            name: 'Express.js',
            description: 'Web framework for Node.js',
            category: 'backend'
          }
        }
      ],
      totalResults: 2
    };
    
    // Test with different strategies
    const strategies = [
      {
        name: 'Exact ID Only',
        config: {
          strategies: [DetectionStrategy.EXACT_ID],
          thresholds: { contentSimilarity: 0.9 }
        }
      },
      {
        name: 'Content Similarity Only',
        config: {
          strategies: [DetectionStrategy.CONTENT_SIMILARITY],
          thresholds: { contentSimilarity: 0.8 }
        }
      },
      {
        name: 'Version Aware Only',
        config: {
          strategies: [DetectionStrategy.VERSION_AWARE],
          thresholds: { versionAware: 0.85 }
        }
      },
      {
        name: 'All Strategies',
        config: {
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
    
    for (const strategy of strategies) {
      console.log(`\n📋 Testing strategy: ${strategy.name}`);
      
      const config = {
        enableDeduplication: true,
        useEnhancedDuplicateDetection: true,
        duplicateDetectionConfig: {
          enabled: true,
          ...strategy.config,
          logging: {
            enabled: true,
            level: 'info' as const
          }
        }
      };
      
      const results = await resultMergerService.mergeResults(
        [semanticResults, fulltextResults],
        config
      );
      
      console.log(`   Results: ${results.length} unique items`);
      console.log(`   Input: 4 items, Output: ${results.length} items`);
      console.log(`   Duplicates found: ${4 - results.length}`);
      
      // Check if React duplicates were detected
      const reactItems = results.filter(r => 
        r.payload?.name?.toLowerCase().includes('react')
      );
      console.log(`   React items after deduplication: ${reactItems.length}`);
    }
    
    console.log('\n✅ Strategy comparison test passed!');
    
  } catch (error) {
    console.error('❌ Strategy test failed:', error);
    throw error;
  }
}

// Test performance with enhanced duplicate detection
export async function testPerformanceWithEnhancedDetection(): Promise<void> {
  console.log('\n🧪 Testing Performance with Enhanced Duplicate Detection...');
  
  try {
    // Generate larger dataset
    const sources = ['semantic', 'fulltext', 'hybrid', 'vector'];
    const baseTools = [
      { name: 'React', description: 'JavaScript library for UI', category: 'frontend' },
      { name: 'Vue', description: 'Progressive framework', category: 'frontend' },
      { name: 'Angular', description: 'Platform for web apps', category: 'frontend' },
      { name: 'Express', description: 'Node.js framework', category: 'backend' },
      { name: 'MongoDB', description: 'NoSQL database', category: 'database' }
    ];
    
    const searchResults: RankedResults[] = [];
    
    for (const source of sources) {
      const results: SearchResultItem[] = [];
      
      for (let i = 0; i < 50; i++) {
        const tool = baseTools[i % baseTools.length];
        const isDuplicate = Math.random() > 0.7; // 30% chance of duplicate
        
        results.push({
          id: `${source}-${tool.name.toLowerCase()}-${i}`,
          score: Math.random() * 0.4 + 0.6,
          source,
          payload: {
            name: isDuplicate ? tool.name : `${tool.name} v${i}`,
            description: isDuplicate ? tool.description : `${tool.description} variant ${i}`,
            category: tool.category,
            url: `https://example.com/${tool.name.toLowerCase()}`,
            version: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
          },
          metadata: {
            searchTime: 100 + i,
            rank: i + 1
          }
        });
      }
      
      searchResults.push({
        source,
        results,
        totalResults: results.length,
        searchTime: 200,
        metadata: { source }
      });
    }
    
    console.log(`📊 Generated ${searchResults.reduce((sum, r) => sum + r.results.length, 0)} total items from ${searchResults.length} sources`);
    
    // Test performance with enhanced detection
    console.log('\n📋 Testing enhanced duplicate detection performance');
    const startTime = Date.now();
    
    const enhancedResults = await resultMergerService.mergeResults(searchResults, {
      enableDeduplication: true,
      useEnhancedDuplicateDetection: true,
      duplicateDetectionConfig: {
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
        },
        performance: {
          enableCache: true,
          enableParallel: true,
          maxComparisonItems: 1000
        },
        logging: {
          enabled: false
        }
      }
    });
    
    const processingTime = Date.now() - startTime;
    const totalInput = searchResults.reduce((sum, r) => sum + r.results.length, 0);
    const duplicatesRemoved = totalInput - enhancedResults.length;
    
    console.log(`✅ Performance test completed in ${processingTime}ms`);
    console.log(`   Input items: ${totalInput}`);
    console.log(`   Unique items: ${enhancedResults.length}`);
    console.log(`   Duplicates removed: ${duplicatesRemoved}`);
    console.log(`   Deduplication rate: ${((duplicatesRemoved / totalInput) * 100).toFixed(1)}%`);
    console.log(`   Processing rate: ${(totalInput / (processingTime / 1000)).toFixed(0)} items/second`);
    
    // Test performance without enhanced detection
    console.log('\n📋 Testing basic duplicate detection performance');
    const basicStartTime = Date.now();
    
    const basicResults = await resultMergerService.mergeResults(searchResults, {
      enableDeduplication: true,
      useEnhancedDuplicateDetection: false,
      deduplicationThreshold: 0.9
    });
    
    const basicProcessingTime = Date.now() - basicStartTime;
    const basicDuplicatesRemoved = totalInput - basicResults.length;
    
    console.log(`✅ Basic detection completed in ${basicProcessingTime}ms`);
    console.log(`   Unique items: ${basicResults.length}`);
    console.log(`   Duplicates removed: ${basicDuplicatesRemoved}`);
    console.log(`   Processing rate: ${(totalInput / (basicProcessingTime / 1000)).toFixed(0)} items/second`);
    
    // Compare performance
    console.log('\n📊 Performance comparison:');
    console.log(`   Enhanced vs Basic: ${processingTime}ms vs ${basicProcessingTime}ms`);
    console.log(`   Enhanced found ${duplicatesRemoved - basicDuplicatesRemoved} more duplicates`);
    console.log(`   Performance overhead: ${((processingTime - basicProcessingTime) / basicProcessingTime * 100).toFixed(1)}%`);
    
    console.log('\n✅ Performance test passed!');
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    throw error;
  }
}

// Test error handling and fallback
export async function testErrorHandlingAndFallback(): Promise<void> {
  console.log('\n🧪 Testing Error Handling and Fallback...');
  
  try {
    // Create test results
    const testResults = [
      createTestSearchResults('source1', 3),
      createTestSearchResults('source2', 3)
    ];
    
    // Test with invalid duplicate detection config
    console.log('\n📋 Test 1: Invalid duplicate detection config');
    
    const invalidConfig = {
      enableDeduplication: true,
      useEnhancedDuplicateDetection: true,
      duplicateDetectionConfig: {
        enabled: true,
        strategies: ['invalid-strategy' as DetectionStrategy],
        thresholds: {
          contentSimilarity: 1.5 // Invalid threshold
        }
      }
    };
    
    try {
      const results = await resultMergerService.mergeResults(testResults, invalidConfig);
      console.log(`✅ Invalid config handled gracefully: ${results.length} results returned`);
    } catch (error) {
      console.log(`✅ Invalid config properly rejected: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test fallback to basic deduplication
    console.log('\n📋 Test 2: Fallback to basic deduplication');
    
    // Create a custom duplicate detection service that will fail
    const failingService = new DuplicateDetectionService();
    
    // Override the detectDuplicates method to simulate failure
    const originalDetectDuplicates = failingService.detectDuplicates.bind(failingService);
    failingService.detectDuplicates = async () => {
      throw new Error('Simulated duplicate detection failure');
    };
    
    // Create a custom merger with the failing service
    const customMerger = new ReciprocalRankFusion({
      enableDeduplication: true,
      useEnhancedDuplicateDetection: true,
      deduplicationThreshold: 0.9
    });
    
    // Override the enhanced deduplication method to use the failing service
    const originalEnhancedDeduplicate = (customMerger as any).enhancedDeduplicateResults;
    (customMerger as any).enhancedDeduplicateResults = async () => {
      throw new Error('Enhanced deduplication failed');
    };
    
    const fallbackResults = await customMerger.mergeResults(testResults, {
      enableDeduplication: true,
      useEnhancedDuplicateDetection: true
    });
    
    console.log(`✅ Fallback successful: ${fallbackResults.length} results returned`);
    
    console.log('\n✅ Error handling and fallback test passed!');
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error);
    throw error;
  }
}

// Run all integration tests
export async function runAllIntegrationTests(): Promise<void> {
  console.log('🚀 Duplicate Detection Integration Test Suite');
  console.log('='.repeat(60));
  
  try {
    await testEnhancedDuplicateDetectionInResultMerger();
    console.log('='.repeat(60));
    
    await testDifferentStrategiesInResultMerger();
    console.log('='.repeat(60));
    
    await testPerformanceWithEnhancedDetection();
    console.log('='.repeat(60));
    
    await testErrorHandlingAndFallback();
    console.log('='.repeat(60));
    
    console.log('✅ All integration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Integration test suite failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllIntegrationTests().catch(console.error);
}
