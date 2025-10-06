/**
 * Test for the enhanced query analyzer
 * This test verifies that the query pattern recognition and entity extraction work correctly
 */

import { QueryAnalyzer } from '../planning/query-analyzer';

// Test cases for different query patterns
const testCases = [
  {
    name: 'Brand Name Query',
    query: 'ChatGPT',
    expectedPattern: 'brand',
    expectedEntities: { brandNames: ['chatgpt'] }
  },
  {
    name: 'Category Query',
    query: 'AI writing tools',
    expectedPattern: 'category',
    expectedEntities: { categories: ['writing'] }
  },
  {
    name: 'Pricing Query',
    query: 'free AI tools under $50',
    expectedPattern: 'pricing',
    expectedEntities: { pricingTerms: ['free'], hasCurrency: true }
  },
  {
    name: 'Capability Query',
    query: 'tools with API access and webhooks',
    expectedPattern: 'capability',
    expectedEntities: { capabilities: ['api', 'webhook'] }
  },
  {
    name: 'Complex Query',
    query: 'show me free AI writing tools with API access under $30',
    expectedPattern: 'general', // Mixed patterns should default to general
    expectedEntities: { pricingTerms: ['free'], hasCurrency: true }
  }
];

/**
 * Run tests for the query analyzer
 */
function runQueryAnalyzerTests(): void {
  console.log('🧪 Running Query Analyzer Tests...\n');

  let passedTests = 0;
  let totalTests = testCases.length;

  testCases.forEach((testCase, index) => {
    console.log(`📝 Test ${index + 1}: ${testCase.name}`);
    console.log(`🔍 Query: "${testCase.query}"`);

    try {
      const result = QueryAnalyzer.analyzeQuery(testCase.query);
      
      console.log(`✅ Pattern: ${result.queryPattern.type} (confidence: ${result.queryPattern.confidence.toFixed(2)})`);
      console.log(`✅ Intent: ${result.interpretedIntent}`);
      console.log(`✅ Entities:`, JSON.stringify(result.extractedEntities, null, 2));
      console.log(`✅ Constraints:`, JSON.stringify(result.constraints, null, 2));
      console.log(`✅ Suggested Tools:`, result.suggestedTools.join(', '));
      console.log(`✅ Overall Confidence: ${result.confidence.toFixed(2)}`);

      // Verify expected pattern
      if (result.queryPattern.type === testCase.expectedPattern) {
        console.log('✅ Pattern detection: PASSED');
        passedTests++;
      } else {
        console.log(`❌ Pattern detection: FAILED (expected ${testCase.expectedPattern}, got ${result.queryPattern.type})`);
      }

      // Verify expected entities (partial match)
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
        console.log('✅ Entity extraction: PASSED');
      } else {
        console.log('❌ Entity extraction: FAILED');
        console.log(`   Expected entities: ${JSON.stringify(testCase.expectedEntities)}`);
        console.log(`   Actual entities: ${JSON.stringify(result.extractedEntities)}`);
      }

    } catch (error) {
      console.log(`❌ Test failed with error:`, error);
    }

    console.log('---\n');
  });

  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Query analyzer is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
}

/**
 * Test specific query pattern examples
 */
function testSpecificExamples(): void {
  console.log('🔬 Testing Specific Query Examples...\n');

  const examples = [
    'Midjourney',
    'free AI tools',
    'coding tools with API',
    'design software under $100',
    'ChatGPT alternatives',
    'project management platforms'
  ];

  examples.forEach((query, index) => {
    console.log(`📝 Example ${index + 1}: "${query}"`);
    
    try {
      const analysis = QueryAnalyzer.analyzeQuery(query);
      console.log(`   Pattern: ${analysis.queryPattern.type} (${(analysis.queryPattern.confidence * 100).toFixed(0)}% confidence)`);
      console.log(`   Intent: ${analysis.interpretedIntent}`);
      console.log(`   Suggested Tools: ${analysis.suggestedTools.join(', ')}`);
      console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
    } catch (error) {
      console.log(`   Error: ${error}`);
    }
    
    console.log('');
  });
}

// Run tests if this file is executed directly
if (require.main === module) {
  runQueryAnalyzerTests();
  console.log('\n' + '='.repeat(50) + '\n');
  testSpecificExamples();
}

export { runQueryAnalyzerTests, testSpecificExamples };
