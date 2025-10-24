#!/usr/bin/env tsx

/**
 * Debug script to test ONLY the IntentExtractorNode in isolation
 *
 * This script bypasses all graph infrastructure and focuses solely on testing
 * the LLM-based intent understanding functionality.
 *
 * HOW TO RUN:
 * cd search-api
 * npx tsx src/debug-scripts/test-intent-extractor-only.ts
 */

import dotenv from 'dotenv';
import { intentExtractorNode } from '../graphs/nodes/intent-extractor.node';
import { StateAnnotation } from '../types/state';

// Load environment variables
dotenv.config();

// Test cases specifically for intent extraction
const intentTestCases = [
  {
    name: "Simple discovery query",
    query: "self hosted cli",
    expectedIntent: {
      primaryGoal: "find",
      pricing: "free",
      interface: "cli"
    }
  },
  {
    name: "Comparison query",
    query: "Cursor alternative but cheaper",
    expectedIntent: {
      primaryGoal: "find",
      referenceTool: "Cursor IDE",
      comparisonMode: "alternative_to",
      constraints: ["cheaper"]
    }
  },
  {
    name: "Head-to-head comparison",
    query: "Amazon Q vs GitHub Copilot",
    expectedIntent: {
      primaryGoal: "compare",
      referenceTool: "Amazon Q",
      comparisonMode: "vs"
    }
  },
  {
    name: "Complex query with multiple constraints",
    query: "AI code generator that works offline and supports Python",
    expectedIntent: {
      primaryGoal: "find",
      constraints: ["offline", "python"],
      capabilities: ["code_generation"]
    }
  },
  {
    name: "Vague discovery query",
    query: "something for React development",
    expectedIntent: {
      primaryGoal: "find",
      technologies: ["react"]
    }
  }
];

/**
 * Test only the IntentExtractorNode with a single query
 */
async function testIntentExtraction(testCase: any) {
  console.log(`\n🧪 Testing IntentExtractorNode: ${testCase.name}`);
  console.log(`📝 Query: "${testCase.query}"`);
  console.log(`─`.repeat(50));

  try {
    // Create minimal initial state for intent extraction
    const initialState: typeof StateAnnotation.State = {
      query: testCase.query,
      intentState: null,
      executionPlan: null,
      candidates: [],
      results: [], // Initialize empty results array
      executionStats: {
        totalTimeMs: 0,
        nodeTimings: {},
        vectorQueriesExecuted: 0,
        structuredQueriesExecuted: 0
      },
      errors: [],
      metadata: {
        startTime: new Date(),
        executionPath: [],
        nodeExecutionTimes: {},
        totalNodesExecuted: 0,
        pipelineVersion: "2.0-llm-first",
        originalQuery: testCase.query
      }
    };

    const startTime = Date.now();

    // Execute ONLY the IntentExtractorNode
    const result = await intentExtractorNode(initialState);

    const executionTime = Date.now() - startTime;

    // Display detailed results
    console.log(`⏱️  Intent extraction completed in ${executionTime}ms`, '\n', result);

    // Extract the intent state from the result
    const intentState = result?.intentState;
    
    if (intentState) {
      console.log(`\n🎯 Extracted Intent:`);
      console.log(`  Primary Goal: ${intentState.primaryGoal || 'Not detected'}`);
      console.log(`  Reference Tool: ${intentState.referenceTool || 'None'}`);
      console.log(`  Comparison Mode: ${intentState.comparisonMode || 'None'}`);
      console.log(`  Pricing: ${intentState.pricing || 'Not specified'}`);
      console.log(`  Platform: ${intentState.platform || 'Not specified'}`);
      console.log(`  Category: ${intentState.category || 'Not specified'}`);
      console.log(`  Desired Features: ${intentState.desiredFeatures?.join(', ') || 'None'}`);
      console.log(`  Constraints: ${intentState.constraints?.join(', ') || 'None'}`);
      console.log(`  Confidence: ${intentState.confidence || 'No confidence score'}`);
      console.log(`  Execution Time: ${result?.executionStats?.nodeTimings?.['intent-extractor'] || 'Not specified'}`);
    } else {
      console.log(`❌ No intent state returned!`);
    }

    // Check for errors
    if (result.errors && result.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.node}: ${error.error.message}`);
        console.log(`     Recovered: ${error.recovered}`);
        if (error.recoveryStrategy) {
          console.log(`     Recovery: ${error.recoveryStrategy}`);
        }
      });
    }

    // Basic validation
    const validationResults = {
      hasIntentState: !!result.intentState,
      hasPrimaryGoal: !!(result.intentState?.primaryGoal),
      hasConfidence: !!(result.intentState?.confidence),
      noErrors: !result.errors || result.errors.length === 0,
      reasonableConfidence: (result.intentState?.confidence || 0) > 0.5
    };

    console.log(`\n✅ Validation Results:`);
    Object.entries(validationResults).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    });

    // Compare with expected intent (if provided)
    if (testCase.expectedIntent) {
      console.log(`\n📋 Expected vs Actual Intent:`);
      Object.entries(testCase.expectedIntent).forEach(([key, expected]) => {
        const actual = result.intentState?.[key as keyof typeof result.intentState];
        const matches = JSON.stringify(actual) === JSON.stringify(expected);
        console.log(`  ${key}: ${expected} → ${actual} ${matches ? '✅' : '❌'}`);
      });
    }

    return {
      success: Object.values(validationResults).every(Boolean),
      result,
      executionTime,
      validationResults
    };

  } catch (error) {
    console.error(`❌ Intent extraction failed:`, error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error(`Stack trace:`, error.stack);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime: 0
    };
  }
}

/**
 * Main test runner for IntentExtractorNode only
 */
async function main() {
  console.log('🎯 IntentExtractorNode Isolated Testing');
  console.log('='.repeat(60));
  console.log('Testing LLM-based intent understanding without any');
  console.log('graph orchestration, database calls, or other nodes.');
  console.log('='.repeat(60));

  const results = [];

  // Run each test case
  // for (const testCase of intentTestCases) {
  //   const result = await testIntentExtraction(testCase);
  //   results.push({ ...testCase, ...result });
  // }

  // Run single test case
  const testCase = intentTestCases[0];
  const result = await testIntentExtraction(testCase);
  results.push({ ...testCase, ...result });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IntentExtractorNode Test Summary');
  console.log('='.repeat(60));

  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  const averageTime = results.reduce((sum, r) => sum + (r.executionTime || 0), 0) / totalTests;

  console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`⏱️  Average time: ${Math.round(averageTime)}ms`);

  // Show detailed results for each test
  console.log(`\n📋 Detailed Results:`);
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${index + 1}. ${status} ${result.name} (${result.executionTime}ms)`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });

  // Validation summary
  console.log(`\n📊 Validation Summary:`);
  const validationStats = {
    hasIntentState: results.filter(r => r.validationResults?.hasIntentState).length,
    hasPrimaryGoal: results.filter(r => r.validationResults?.hasPrimaryGoal).length,
    hasConfidence: results.filter(r => r.validationResults?.hasConfidence).length,
    noErrors: results.filter(r => r.validationResults?.noErrors).length,
    reasonableConfidence: results.filter(r => r.validationResults?.reasonableConfidence).length
  };

  Object.entries(validationStats).forEach(([key, count]) => {
    const percentage = Math.round((count / totalTests) * 100);
    console.log(`  ${key}: ${count}/${totalTests} (${percentage}%)`);
  });

  if (passedTests === totalTests) {
    console.log('\n🎉 All IntentExtractorNode tests passed!');
    console.log('✅ The intent extraction logic is working correctly.');
    console.log('✅ Ready to integrate with the full pipeline.');
  } else {
    console.log('\n❌ Some IntentExtractorNode tests failed.');
    console.log('🔧 Review the results above to identify issues.');
    console.log('💡 Consider checking LLM configuration, prompts, or error handling.');
  }

  console.log('\n🎯 Next Steps:');
  console.log('  1. If tests pass → Test QueryPlannerNode in isolation');
  console.log('  2. If tests fail → Debug IntentExtractorNode implementation');
  console.log('  3. Run the full pipeline test with: npm run test:refactored-pipeline');
}

// Run the tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as testIntentExtractorOnly };
