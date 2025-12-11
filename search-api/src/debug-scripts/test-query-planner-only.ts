#!/usr/bin/env tsx

/**
 * Debug script to test ONLY the QueryPlannerNode in isolation
 *
 * This script bypasses all graph infrastructure and focuses solely on testing
 * the LLM-based query planning functionality.
 *
 * HOW TO RUN:
 * cd search-api
 * npx tsx src/debug-scripts/test-query-planner-only.ts
 */

import dotenv from 'dotenv';
import { queryPlannerNode } from '../graphs/nodes/query-planner.node.js';
import { StateAnnotation } from '../types/state.js';
import { toolsSchema } from '../domains/tools/tools.schema.js';
import { buildToolsFilters } from '../domains/tools/tools.filters.js';
import { validateToolsQueryPlan } from '../domains/tools/tools.validators.js';

// Load environment variables
dotenv.config();

// Test cases specifically for query planning
const queryPlannerTestCases = [
  {
    name: "Self-hosted CLI tools",
    query: "self hosted cli",
    mockIntentState: {
      primaryGoal: 'find',
      referenceTool: null,
      comparisonMode: null,
      filters: [],
      pricingModel: null,
      billingPeriod: null,
      priceRange: null,
      priceComparison: null,
      category: null,
      interface: 'CLI',
      functionality: [],
      deployment: 'Self-Hosted',
      industry: null,
      userType: null,
      semanticVariants: [],
      constraints: ['self-hosted'],
      confidence: 0.9
    },
    executionStats: {
      totalTimeMs: 0,
      nodeTimings: { 'intent-extractor': 2982 },
      vectorQueriesExecuted: 0,
      structuredQueriesExecuted: 0
    },
    metadata: {
      startTime: '2025-10-23T19:47:23.362Z',
      executionPath: ['intent-extractor'],
      nodeExecutionTimes: { 'intent-extractor': 2982 },
      totalNodesExecuted: 0,
      pipelineVersion: '2.0-llm-first',
      originalQuery: 'self hosted cli'
    }
  },
  {
    name: "Alternative tool comparison",
    query: "Cursor alternative but cheaper",
    mockIntentState: {
      primaryGoal: "find",
      referenceTool: "Cursor IDE",
      comparisonMode: "alternative_to",
      desiredFeatures: ["AI code assist", "local inference"],
      filters: [],
      pricing: "freemium",
      category: "IDE",
      platform: null,
      semanticVariants: [],
      constraints: ["cheaper"],
      confidence: 0.8
    },
    expectedPlan: {
      strategy: "hybrid_search",
      vectorSources: ["qdrant"],
      structuredSources: ["mongodb"],
      confidence: 0.7
    }
  },
  {
    name: "Direct tool comparison",
    query: "Amazon Q vs GitHub Copilot",
    mockIntentState: {
      primaryGoal: "compare",
      referenceTool: "Amazon Q",
      comparisonMode: "vs",
      desiredFeatures: [],
      filters: [],
      pricing: "free",
      category: "IDE",
      platform: null,
      semanticVariants: [],
      constraints: [],
      confidence: 1.0
    },
    expectedPlan: {
      strategy: "structured_search",
      vectorSources: [],
      structuredSources: ["mongodb"],
      confidence: 0.9
    }
  },
  {
    name: "Complex multi-constraint query",
    query: "AI code generator that works offline and supports Python",
    mockIntentState: {
      primaryGoal: "find",
      referenceTool: null,
      comparisonMode: null,
      desiredFeatures: ["AI code assist", "local inference"],
      filters: [],
      pricing: "free",
      category: "IDE",
      platform: null,
      semanticVariants: [],
      constraints: ["supports Python", "offline"],
      confidence: 0.8
    },
    expectedPlan: {
      strategy: "hybrid_search",
      vectorSources: ["qdrant"],
      structuredSources: ["mongodb"],
      confidence: 0.8
    }
  }
];

/**
 * Test only the QueryPlannerNode with a single test case
 */
async function testQueryPlanner(testCase: { name: string; query: string; mockIntentState: Record<string, unknown> }) {
  console.log(`\n🧪 Testing QueryPlannerNode: ${testCase.name}`);
  console.log(`📝 Query: "${testCase.query}"`);
  console.log(`─`.repeat(50));

  try {
    // Create initial state with mock intent
    const initialState: typeof StateAnnotation.State = {
      schema: toolsSchema,
      domainHandlers: { buildFilters: buildToolsFilters, validateQueryPlan: validateToolsQueryPlan },
      query: testCase.query,
      intentState: testCase.mockIntentState,
      executionPlan: null,
      candidates: [],
      results: [],
      executionStats: {
        totalTimeMs: 0,
        nodeTimings: {},
        vectorQueriesExecuted: 0,
        structuredQueriesExecuted: 0
      },
      errors: [],
      metadata: {
        startTime: new Date(),
        executionPath: ["intent-extractor"],
        nodeExecutionTimes: {},
        totalNodesExecuted: 1,
        pipelineVersion: "2.0-llm-first",
        originalQuery: testCase.query
      }
    };

    const startTime = Date.now();

    // Execute ONLY the QueryPlannerNode
    const result = await queryPlannerNode(initialState);

    const executionTime = Date.now() - startTime;

    // Display detailed results
    console.log(`⏱️  Query planning completed in ${executionTime}ms`);

    // log the result
    console.log(`\n🔍 Result:`, JSON.stringify(result));

    // if (result.executionPlan) {
    //   console.log(`\n🗺️ Execution Plan:`);
    //   console.log(`  Strategy: ${result.executionPlan.strategy || 'Not specified'}`);
    //   console.log(`  Confidence: ${result.executionPlan.confidence || 'No confidence score'}`);
    //   console.log(`  Fusion Method: ${result.executionPlan.fusion || 'None'}`);
    //   console.log(`  Vector Sources: ${result.executionPlan.vectorSources?.join(', ') || 'None'}`);
    //   console.log(`  Structured Sources: ${result.executionPlan.structuredSources?.join(', ') || 'None'}`);
    //   // console.log(`  Query Transformations: ${result.executionPlan.queryTransformations?.join(', ') || 'None'}`);
    //   // console.log(`  Filters Applied: ${result.executionPlan.filtersApplied?.join(', ') || 'None'}`);
    //   // console.log(`  Priority Features: ${result.executionPlan.priorityFeatures?.join(', ') || 'None'}`);
    // } else {
    //   console.log(`❌ No execution plan returned!`);
    // }

    // Check for errors
    // if (result.errors && result.errors.length > 0) {
    //   console.log(`\n❌ Errors encountered:`);
    //   result.errors.forEach((error, index) => {
    //     console.log(`  ${index + 1}. ${error.node}: ${error.error.message}`);
    //     console.log(`     Recovered: ${error.recovered}`);
    //     if (error.recoveryStrategy) {
    //       console.log(`     Recovery: ${error.recoveryStrategy}`);
    //     }
    //   });
    // }

    // Basic validation
    const validationResults = {
      hasExecutionPlan: !!result.executionPlan,
      hasStrategy: !!(result.executionPlan?.strategy),
      hasSources: !!(result.executionPlan?.vectorSources || result.executionPlan?.structuredSources),
      hasConfidence: !!(result.executionPlan?.confidence),
      noErrors: !result.errors || result.errors.length === 0,
      reasonableConfidence: (result.executionPlan?.confidence || 0) >= 0.5
    };

    console.log(`\n✅ Validation Results:`);
    Object.entries(validationResults).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    });

    // Compare with expected plan (if provided)
    // if (testCase.expectedPlan) {
    //   console.log(`\n📋 Expected vs Actual Plan:`);
    //   Object.entries(testCase.expectedPlan).forEach(([key, expected]) => {
    //     const actual = result.executionPlan?.[key as keyof typeof result.executionPlan];
    //     const matches = JSON.stringify(actual) === JSON.stringify(expected);
    //     console.log(`  ${key}: ${expected} → ${actual} ${matches ? '✅' : '❌'}`);
    //   });
    // }

    return {
      success: Object.values(validationResults).every(Boolean),
      result,
      executionTime,
      validationResults
    };

  } catch (error) {
    console.error(`❌ Query planning failed:`, error instanceof Error ? error.message : String(error));

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
 * Main test runner for QueryPlannerNode only
 */
async function main() {
  console.log('🗺️ QueryPlannerNode Isolated Testing');
  console.log('='.repeat(60));
  console.log('Testing LLM-based query planning without any');
  console.log('graph orchestration, database calls, or other nodes.');
  console.log('='.repeat(60));

  const results = [];

  // Run each test case
  // for (const testCase of queryPlannerTestCases) {
  //   const result = await testQueryPlanner(testCase);
  //   results.push({ ...testCase, ...result });
  // }

  // Run the first test case
  const firstTestCase = queryPlannerTestCases[0];
  const firstResult = await testQueryPlanner(firstTestCase);
  results.push({ ...firstTestCase, ...firstResult });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 QueryPlannerNode Test Summary');
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
    hasExecutionPlan: results.filter(r => r.validationResults?.hasExecutionPlan).length,
    hasStrategy: results.filter(r => r.validationResults?.hasStrategy).length,
    hasSources: results.filter(r => r.validationResults?.hasSources).length,
    hasConfidence: results.filter(r => r.validationResults?.hasConfidence).length,
    noErrors: results.filter(r => r.validationResults?.noErrors).length,
    reasonableConfidence: results.filter(r => r.validationResults?.reasonableConfidence).length
  };

  Object.entries(validationStats).forEach(([key, count]) => {
    const percentage = Math.round((count / totalTests) * 100);
    console.log(`  ${key}: ${count}/${totalTests} (${percentage}%)`);
  });

  // Strategy distribution
  console.log(`\n📈 Strategy Distribution:`);
  const strategyCounts = results
    .filter(r => r.result?.executionPlan?.strategy)
    .reduce((acc, r) => {
      const strategy = r.result.executionPlan.strategy;
      acc[strategy] = (acc[strategy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);


  console.log('strategyCounts  └───', strategyCounts);

  if (passedTests === totalTests) {
    console.log('\n🎉 All QueryPlannerNode tests passed!');
    console.log('✅ The query planning logic is working correctly.');
    console.log('✅ Ready to integrate with the full pipeline.');
  } else {
    console.log('\n❌ Some QueryPlannerNode tests failed.');
    console.log('🔧 Review the results above to identify issues.');
    console.log('💡 Consider checking LLM configuration, prompts, or error handling.');
  }

  console.log('\n🎯 Next Steps:');
  console.log('  1. If tests pass → Test QueryExecutorNode in isolation');
  console.log('  2. If tests fail → Debug QueryPlannerNode implementation');
  console.log('  3. Run the full pipeline test with: npm run test:refactored-pipeline');
}

// Run the tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as testQueryPlannerOnly };