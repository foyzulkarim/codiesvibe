/**
 * Simplified Test Cases for Query Analyzer Performance
 * 
 * This test file validates the query analyzer's performance across different query types:
 * - Specific tool names (e.g., "ChatGPT")
 * - Category queries (e.g., "AI writing tools")
 * - Pricing queries (e.g., "free AI tools")
 * - Capability queries (e.g., "tools with API access")
 * - General queries (e.g., "AI tools for productivity")
 */

import { QueryAnalyzer } from '../planning/query-analyzer';

/**
 * Test case interface for comprehensive planner testing
 */
interface AnalyzerTestCase {
  name: string;
  query: string;
  expectedPattern: 'brand' | 'category' | 'pricing' | 'capability' | 'general';
  expectedIntent: string;
  expectedEntities: Record<string, any>;
  expectedConstraints: Record<string, any>;
  expectedSuggestedTools: string[];
  minConfidence: number;
}

/**
 * Comprehensive test cases covering all query types
 */
const testCases: AnalyzerTestCase[] = [
  // Brand-specific queries
  {
    name: 'Brand Name - ChatGPT',
    query: 'ChatGPT',
    expectedPattern: 'brand',
    expectedIntent: 'find_brand',
    expectedEntities: { brandNames: ['chatgpt'] },
    expectedConstraints: {},
    expectedSuggestedTools: ['filterByField', 'searchByText'],
    minConfidence: 0.7
  },
  {
    name: 'Brand Name - Multiple Tools',
    query: 'ChatGPT vs Claude',
    expectedPattern: 'brand',
    expectedIntent: 'compare_brands',
    expectedEntities: { brandNames: ['chatgpt', 'claude'] },
    expectedConstraints: {},
    expectedSuggestedTools: ['filterByField', 'searchByText'],
    minConfidence: 0.6
  },
  
  // Category queries
  {
    name: 'Category - AI Writing Tools',
    query: 'AI writing tools',
    expectedPattern: 'category',
    expectedIntent: 'find_category_tools',
    expectedEntities: { categories: ['writing'], categoryIndicators: true },
    expectedConstraints: {},
    expectedSuggestedTools: ['filterByArrayContains', 'searchByText'],
    minConfidence: 0.6
  },
  {
    name: 'Category - Development Tools',
    query: 'coding development software',
    expectedPattern: 'category',
    expectedIntent: 'find_category_tools',
    expectedEntities: { categories: ['coding', 'development'] },
    expectedConstraints: {},
    expectedSuggestedTools: ['filterByArrayContains', 'searchByText'],
    minConfidence: 0.6
  },
  
  // Pricing queries
  {
    name: 'Pricing - Free Tools',
    query: 'free AI tools',
    expectedPattern: 'pricing',
    expectedIntent: 'find_pricing_type_tools',
    expectedEntities: { pricingTerms: ['free'] },
    expectedConstraints: { hasFreeTier: true },
    expectedSuggestedTools: ['filterByNestedField'],
    minConfidence: 0.6
  },
  {
    name: 'Pricing - Price Range',
    query: 'AI tools under $50',
    expectedPattern: 'pricing',
    expectedIntent: 'find_tools_in_price_range',
    expectedEntities: { pricingTerms: ['under'], hasCurrency: true },
    expectedConstraints: { maxPrice: 50 },
    expectedSuggestedTools: ['filterByPriceRange', 'filterByNestedField'],
    minConfidence: 0.7
  },
  {
    name: 'Pricing - Complex Range',
    query: 'tools between $20 and $100 monthly',
    expectedPattern: 'pricing',
    expectedIntent: 'find_tools_in_price_range',
    expectedEntities: { pricingTerms: ['between'], hasCurrency: true },
    expectedConstraints: { minPrice: 20, maxPrice: 100 },
    expectedSuggestedTools: ['filterByPriceRange', 'filterByNestedField'],
    minConfidence: 0.7
  },
  
  // Capability queries
  {
    name: 'Capability - API Access',
    query: 'tools with API access',
    expectedPattern: 'capability',
    expectedIntent: 'find_capability_tools',
    expectedEntities: { capabilities: ['api'], technicalTerms: ['api'] },
    expectedConstraints: { apiAccess: true },
    expectedSuggestedTools: ['filterByNestedField', 'searchByKeywords'],
    minConfidence: 0.6
  },
  {
    name: 'Capability - Multiple Features',
    query: 'tools with webhooks and real-time collaboration',
    expectedPattern: 'capability',
    expectedIntent: 'find_capability_tools',
    expectedEntities: { capabilities: ['webhook', 'real-time', 'collaboration'] },
    expectedConstraints: { apiAccess: true },
    expectedSuggestedTools: ['filterByNestedField', 'searchByKeywords'],
    minConfidence: 0.6
  },
  
  // General queries
  {
    name: 'General - Productivity Tools',
    query: 'AI tools for productivity',
    expectedPattern: 'general',
    expectedIntent: 'general_search',
    expectedEntities: { categories: ['productivity'] },
    expectedConstraints: {},
    expectedSuggestedTools: ['searchByText', 'searchByKeywords'],
    minConfidence: 0.4
  },
  {
    name: 'General - Complex Query',
    query: 'show me free AI writing tools with API access under $30',
    expectedPattern: 'general',
    expectedIntent: 'general_search',
    expectedEntities: { pricingTerms: ['free'], hasCurrency: true },
    expectedConstraints: { maxPrice: 30, hasFreeTier: true, apiAccess: true },
    expectedSuggestedTools: ['searchByText', 'searchByKeywords'],
    minConfidence: 0.3
  },
  
  // Edge cases and ambiguous queries
  {
    name: 'Edge Case - Very Short Query',
    query: 'AI',
    expectedPattern: 'general',
    expectedIntent: 'general_search',
    expectedEntities: {},
    expectedConstraints: {},
    expectedSuggestedTools: ['searchByText', 'searchByKeywords'],
    minConfidence: 0.2
  },
  {
    name: 'Edge Case - Subjective Terms',
    query: 'best AI tools',
    expectedPattern: 'general',
    expectedIntent: 'recommend_tools',
    expectedEntities: { sortPreference: 'rating' },
    expectedConstraints: {},
    expectedSuggestedTools: ['searchByText', 'searchByKeywords', 'sortByField'],
    minConfidence: 0.3
  },
  {
    name: 'Edge Case - Ambiguous Brand',
    query: 'AI assistant',
    expectedPattern: 'general',
    expectedIntent: 'general_search',
    expectedEntities: { categories: ['assistant'] },
    expectedConstraints: {},
    expectedSuggestedTools: ['searchByText', 'searchByKeywords'],
    minConfidence: 0.3
  }
];

/**
 * Test the query analyzer with different query types
 */
function testQueryAnalyzer(): void {
  console.log('🧪 Testing Query Analyzer with Different Query Types...\n');
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  testCases.forEach((testCase, index) => {
    console.log(`📝 Test ${index + 1}: ${testCase.name}`);
    console.log(`🔍 Query: "${testCase.query}"`);
    
    try {
      const result = QueryAnalyzer.analyzeQuery(testCase.query);
      
      // Test pattern detection
      const patternMatch = result.queryPattern.type === testCase.expectedPattern;
      if (patternMatch) {
        console.log(`✅ Pattern detection: ${result.queryPattern.type} (${(result.queryPattern.confidence * 100).toFixed(0)}% confidence)`);
      } else {
        console.log(`❌ Pattern detection: Expected ${testCase.expectedPattern}, got ${result.queryPattern.type}`);
      }
      
      // Test intent recognition
      const intentMatch = result.interpretedIntent === testCase.expectedIntent;
      if (intentMatch) {
        console.log(`✅ Intent recognition: ${result.interpretedIntent}`);
      } else {
        console.log(`❌ Intent recognition: Expected ${testCase.expectedIntent}, got ${result.interpretedIntent}`);
      }
      
      // Test entity extraction (partial match)
      let entitiesMatch = true;
      for (const [key, expectedValue] of Object.entries(testCase.expectedEntities)) {
        const actualValue = result.extractedEntities[key];
        if (Array.isArray(expectedValue) && Array.isArray(actualValue)) {
          const hasMatch = expectedValue.some(val => 
            actualValue.some(actual => actual.toLowerCase().includes(val.toLowerCase()))
          );
          if (!hasMatch) {
            entitiesMatch = false;
            break;
          }
        } else if (actualValue !== expectedValue) {
          entitiesMatch = false;
          break;
        }
      }
      
      if (entitiesMatch) {
        console.log(`✅ Entity extraction: Matched expected entities`);
      } else {
        console.log(`❌ Entity extraction: Mismatch`);
        console.log(`   Expected: ${JSON.stringify(testCase.expectedEntities)}`);
        console.log(`   Actual: ${JSON.stringify(result.extractedEntities)}`);
      }
      
      // Test constraint extraction
      let constraintsMatch = true;
      for (const [key, expectedValue] of Object.entries(testCase.expectedConstraints)) {
        if (result.constraints[key] !== expectedValue) {
          constraintsMatch = false;
          break;
        }
      }
      
      if (constraintsMatch) {
        console.log(`✅ Constraint extraction: Matched expected constraints`);
      } else {
        console.log(`❌ Constraint extraction: Mismatch`);
        console.log(`   Expected: ${JSON.stringify(testCase.expectedConstraints)}`);
        console.log(`   Actual: ${JSON.stringify(result.constraints)}`);
      }
      
      // Test suggested tools
      const suggestedToolsMatch = testCase.expectedSuggestedTools.some(tool => 
        result.suggestedTools.includes(tool)
      );
      
      if (suggestedToolsMatch) {
        console.log(`✅ Suggested tools: ${result.suggestedTools.join(', ')}`);
      } else {
        console.log(`❌ Suggested tools: No match with expected tools`);
        console.log(`   Expected one of: ${testCase.expectedSuggestedTools.join(', ')}`);
        console.log(`   Actual: ${result.suggestedTools.join(', ')}`);
      }
      
      // Test confidence threshold
      const confidenceMatch = result.confidence >= testCase.minConfidence;
      if (confidenceMatch) {
        console.log(`✅ Confidence: ${(result.confidence * 100).toFixed(0)}% (above minimum ${(testCase.minConfidence * 100).toFixed(0)}%)`);
      } else {
        console.log(`❌ Confidence: ${(result.confidence * 100).toFixed(0)}% (below minimum ${(testCase.minConfidence * 100).toFixed(0)}%)`);
      }
      
      // Overall test result
      if (patternMatch && intentMatch && entitiesMatch && constraintsMatch && 
          suggestedToolsMatch && confidenceMatch) {
        passedTests++;
        console.log('🎉 TEST PASSED');
      } else {
        console.log('❌ TEST FAILED');
      }
      
    } catch (error) {
      console.log(`❌ Test failed with error:`, error);
    }
    
    console.log('---\n');
  });
  
  console.log(`📊 Query Analyzer Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All query analyzer tests passed!');
  } else {
    console.log('⚠️  Some query analyzer tests failed.');
  }
}

/**
 * Test edge cases and error handling
 */
function testEdgeCases(): void {
  console.log('\n🧪 Testing Edge Cases and Error Handling...\n');
  
  const edgeCases = [
    {
      name: 'Empty Query',
      query: '',
      expectFailure: true
    },
    {
      name: 'Null Query',
      query: null as any,
      expectFailure: true
    },
    {
      name: 'Very Long Query',
      query: 'AI '.repeat(1000),
      expectFailure: false
    },
    {
      name: 'Special Characters',
      query: 'AI tools with @#$%^&*(){}[]|\\:";\'<>?,./',
      expectFailure: false
    },
    {
      name: 'Unicode Characters',
      query: 'AI工具 for productivity with émojis 🚀',
      expectFailure: false
    }
  ];
  
  let passedTests = 0;
  let totalTests = edgeCases.length;
  
  edgeCases.forEach((edgeCase, index) => {
    console.log(`📝 Edge Case ${index + 1}: ${edgeCase.name}`);
    
    try {
      const result = QueryAnalyzer.analyzeQuery(edgeCase.query);
      
      if (edgeCase.expectFailure) {
        console.log(`❌ Expected failure but got result: ${JSON.stringify(result)}`);
      } else {
        console.log(`✅ Handled gracefully: Pattern ${result.queryPattern.type}, Confidence ${(result.confidence * 100).toFixed(0)}%`);
        passedTests++;
      }
    } catch (error) {
      if (edgeCase.expectFailure) {
        console.log(`✅ Failed as expected: ${error}`);
        passedTests++;
      } else {
        console.log(`❌ Unexpected error: ${error}`);
      }
    }
    
    console.log('---\n');
  });
  
  console.log(`📊 Edge Cases Test Results: ${passedTests}/${totalTests} tests passed`);
}

/**
 * Test performance with batch queries
 */
function testPerformance(): void {
  console.log('\n🧪 Testing Performance with Batch Queries...\n');
  
  const batchQueries = [
    'ChatGPT',
    'AI writing tools',
    'free AI tools',
    'tools with API access',
    'AI tools for productivity',
    'design software under $100',
    'coding tools with integration',
    'project management platforms',
    'automation software',
    'AI assistants for research'
  ];
  
  console.log(`Processing ${batchQueries.length} queries in batch...`);
  
  const startTime = Date.now();
  const results = batchQueries.map(query => {
    const queryStart = Date.now();
    const result = QueryAnalyzer.analyzeQuery(query);
    const queryTime = Date.now() - queryStart;
    
    return {
      query,
      pattern: result.queryPattern.type,
      confidence: result.confidence,
      processingTime: queryTime
    };
  });
  const totalTime = Date.now() - startTime;
  
  console.log(`✅ Batch processing completed in ${totalTime}ms`);
  console.log(`✅ Average time per query: ${(totalTime / batchQueries.length).toFixed(2)}ms`);
  
  // Display results
  results.forEach((result, index) => {
    console.log(`   ${index + 1}. "${result.query}" -> ${result.pattern} (${(result.confidence * 100).toFixed(0)}%, ${result.processingTime}ms)`);
  });
  
  // Performance validation
  const avgTime = totalTime / batchQueries.length;
  const maxAcceptableTime = 100; // 100ms per query
  
  if (avgTime <= maxAcceptableTime) {
    console.log(`✅ Performance test PASSED: Average time ${avgTime.toFixed(2)}ms is within acceptable limit`);
  } else {
    console.log(`❌ Performance test FAILED: Average time ${avgTime.toFixed(2)}ms exceeds acceptable limit of ${maxAcceptableTime}ms`);
  }
}

/**
 * Main test runner
 */
function runPlannerAnalyzerTests(): void {
  console.log('🚀 Starting Comprehensive Query Analyzer Tests...\n');
  console.log('='.repeat(60));
  
  try {
    // Run all test suites
    testQueryAnalyzer();
    testEdgeCases();
    testPerformance();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All query analyzer test suites completed!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runPlannerAnalyzerTests();
}

export { runPlannerAnalyzerTests, testQueryAnalyzer, testEdgeCases, testPerformance };
