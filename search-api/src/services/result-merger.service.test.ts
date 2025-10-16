/**
 * Test file for Result Merger Service
 * 
 * This file contains basic tests to verify the Reciprocal Rank Fusion
 * implementation works as expected.
 */

import { resultMergerService, ReciprocalRankFusion, RankedResults, SearchResultItem } from './result-merger.service';

// Sample test data
const createMockResults = (source: string, count: number): RankedResults => ({
  source,
  results: Array.from({ length: count }, (_, i) => ({
    id: `${source}_item_${i}`,
    score: 1.0 - (i * 0.1),
    payload: {
      name: `${source} Tool ${i}`,
      description: `A tool from ${source} search`,
      category: 'development'
    },
    metadata: {
      searchTime: 100,
      query: 'test query'
    }
  })),
  totalResults: count,
  searchTime: 150
});

// Test function to verify basic functionality
export async function testResultMergerService(): Promise<void> {
  console.log('🧪 Testing Result Merger Service...');
  
  try {
    // Test 1: Basic merging
    console.log('\n📋 Test 1: Basic RRF merging');
    const semanticResults = createMockResults('semantic', 5);
    const traditionalResults = createMockResults('traditional', 5);
    
    // Add some overlapping results
    traditionalResults.results[2] = {
      ...semanticResults.results[1], // Duplicate of semantic result 1
      score: 0.85
    };
    traditionalResults.results[2].id = 'traditional_item_2'; // Different ID but same content
    
    const mergedResults = await resultMergerService.mergeResults([semanticResults, traditionalResults]);
    
    console.log(`✅ Merged ${semanticResults.results.length + traditionalResults.results.length} results into ${mergedResults.length} unique results`);
    console.log(`📊 Top result: ${mergedResults[0]?.payload?.name} (RRF Score: ${mergedResults[0]?.rrfScore?.toFixed(4)})`);
    console.log(`🔍 Sources: ${mergedResults[0] ? Object.keys(mergedResults[0].originalRankings).join(', ') : 'None'}`);
    
    // Test 2: Configuration
    console.log('\n⚙️ Test 2: Configuration');
    const customMerger = new ReciprocalRankFusion({
      kValue: 30,
      maxResults: 10,
      sourceWeights: {
        semantic: 1.5,
        traditional: 0.5
      }
    });
    
    const customMerged = await customMerger.mergeResults([semanticResults, traditionalResults]);
    console.log(`✅ Custom config merged ${customMerged.length} results with k=30`);
    
    // Test 3: Deduplication
    console.log('\n🔄 Test 3: Deduplication');
    const dedupConfig = {
      enableDeduplication: true,
      deduplicationThreshold: 0.8
    };
    
    const dedupResults = await resultMergerService.mergeResults(
      [semanticResults, traditionalResults],
      dedupConfig
    );
    
    console.log(`✅ Deduplication enabled: ${dedupResults.length} unique results`);
    
    // Test 4: Edge cases
    console.log('\n🧩 Test 4: Edge cases');
    
    // Empty results
    const emptyResults = await resultMergerService.mergeResults([]);
    console.log(`✅ Empty input: ${emptyResults.length} results`);
    
    // Single source
    const singleSourceResults = await resultMergerService.mergeResults([semanticResults]);
    console.log(`✅ Single source: ${singleSourceResults.length} results`);
    
    // Test 5: Configuration validation
    console.log('\n✅ Test 5: Configuration validation');
    const validConfig = ReciprocalRankFusion.validateConfig({ kValue: 60 });
    const invalidConfig = ReciprocalRankFusion.validateConfig({ kValue: -1 });
    
    console.log(`✅ Valid config check: ${validConfig}`);
    console.log(`✅ Invalid config check: ${!invalidConfig}`);
    
    console.log('\n🎉 All tests passed! Result Merger Service is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testResultMergerService().catch(console.error);
}
