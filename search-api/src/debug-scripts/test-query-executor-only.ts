#!/usr/bin/env tsx

/**
 * Debug script to test ONLY the QueryExecutorNode in isolation
 *
 * This script bypasses all graph infrastructure and focuses solely on testing
 * the deterministic query execution functionality against Qdrant and MongoDB.
 *
 * PREREQUISITES:
 * 1. MongoDB running on localhost:27017
 * 2. Qdrant running on localhost:6333
 *
 * TO START SERVICES:
 * # Start MongoDB
 * docker run -d -p 27017:27017 --name mongodb mongo:latest
 *
 * # Start Qdrant
 * docker run -d -p 6333:6333 -p 6334:6334 --name qdrant qdrant/qdrant:latest
 *
 *
 * HOW TO RUN:
 * cd search-api
 * npx tsx src/debug-scripts/test-query-executor-only.ts
 */

import dotenv from 'dotenv';
import { queryExecutorNode } from '../graphs/nodes/query-executor.node.js';
import { StateAnnotation } from '../types/state.js';
import net from 'net';
import { toolsSchema } from '../domains/tools/tools.schema.js';
import { buildToolsFilters } from '../domains/tools/tools.filters.js';
import { validateToolsQueryPlan } from '../domains/tools/tools.validators.js';

// Load environment variables
dotenv.config();

/**
 * Check if a service is running on the specified host and port
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _checkServiceConnection(
  host: string,
  port: number,
  _serviceName: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(2000); // 2 second timeout

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

// Test cases specifically for query execution
const queryExecutorTestCases = [
  {
    name: 'Vector search only - free CLI tools',
    query: 'self hosted cli',
    executionPlan: {
      strategy: 'hybrid',
      fusion: 'weighted_sum',
      vectorSources: [
        {
          collection: 'tools',
          embeddingType: 'semantic',
          queryVectorSource: 'query_text',
          topK: 70,
        },
        {
          collection: 'functionality',
          embeddingType: 'entities.functionality',
          queryVectorSource: 'query_text',
          topK: 40,
        },
      ],
      structuredSources: [
        {
          collection: 'tools',
          filters: [
            { field: 'interface', operator: 'in', value: ['CLI'] },
            { field: 'deployment', operator: 'in', value: ['Self-Hosted'] },
          ],
          topK: 70,
          weight: 1,
        },
        {
          collection: 'functionality',
          filters: [
            { field: 'interface', operator: 'in', value: ['CLI'] },
            { field: 'deployment', operator: 'in', value: ['Self-Hosted'] },
          ],
          topK: 40,
          weight: 0.3,
        },
      ],
      rerank: { strategy: 'none' },
      confidence: 0.5,
      explanation:
        'Multi-collection search strategy: hybrid. Searching 2 specialized collections: tools, functionality. Adapted from recommended strategy (identity-focused) based on query analysis. Combining with MongoDB structured filtering for precise constraints. Using weighted score fusion for result combination.',
    },
    executionStats: {
      totalTimeMs: 0,
      nodeTimings: { 'query-planner': 12758 },
      vectorQueriesExecuted: 0,
      structuredQueriesExecuted: 0,
    },
    metadata: {
      startTime: '2025-10-24T05:52:44.469Z',
      executionPath: ['intent-extractor', 'query-planner'],
      nodeExecutionTimes: { 'query-planner': 12758 },
      totalNodesExecuted: 1,
      pipelineVersion: '2.0-llm-first',
    },
  },
];

/**
 * Test only the QueryExecutorNode with a single test case
 */
async function testQueryExecutor(testCase: { name: string; query: string; executionPlan: Record<string, unknown>; mockIntentState?: Record<string, unknown> }) {
  console.log(`\n⚡ Testing QueryExecutorNode: ${testCase.name}`);
  console.log(`📝 Query: "${testCase.query}"`);
  console.log(`🗺️ Strategy: ${testCase.executionPlan.strategy}`);
  console.log(`─`.repeat(60));

  try {
    // Create initial state with execution plan
    const initialState: typeof StateAnnotation.State = {
      schema: toolsSchema,
      domainHandlers: { buildFilters: buildToolsFilters, validateQueryPlan: validateToolsQueryPlan },
      query: testCase.query,
      intentState: testCase.mockIntentState || {
        primaryGoal: 'find',
        referenceTool: null,
        comparisonMode: null,
        desiredFeatures: [],
        filters: [],
        pricing: 'free',
        category: 'CLI',
        platform: 'cli',
        semanticVariants: [],
        constraints: [],
        confidence: 0.8,
      },
      executionPlan: testCase.executionPlan,
      candidates: [],
      results: [],
      executionStats: {
        totalTimeMs: 0,
        nodeTimings: {},
        vectorQueriesExecuted: 0,
        structuredQueriesExecuted: 0,
      },
      errors: [],
      metadata: {
        startTime: new Date(),
        executionPath: ['query-planner'],
        nodeExecutionTimes: {},
        totalNodesExecuted: 2,
        pipelineVersion: '2.0-llm-first',
        originalQuery: testCase.query,
      },
    };

    const startTime = Date.now();

    // Execute ONLY the QueryExecutorNode
    const result = await queryExecutorNode(initialState);

    const executionTime = Date.now() - startTime;

    // Display detailed results
    console.log(`⏱️  Query execution completed in ${executionTime}ms`);
    console.log(`🧐 query executor result`, JSON.stringify(result));

    // if (result.candidates && result.candidates.length > 0) {
    //   console.log(`\n🎯 Found ${result.candidates.length} candidates:`);
    //   result.candidates.slice(0, 5).forEach((candidate, index) => {
    //     console.log(`  ${index + 1}. ${candidate.metadata?.name || 'Unknown Tool'}`);
    //     console.log(`     Score: ${candidate.score?.toFixed(3) || 'N/A'}`);
    //     console.log(`     Source: ${candidate.source}`);
    //     console.log(`     Category: ${candidate.metadata?.category || 'N/A'}`);
    //     console.log(`     Pricing: ${candidate.metadata?.pricing || 'N/A'}`);
    //     if (candidate.provenance?.filtersApplied?.length > 0) {
    //       console.log(`     Filters: ${candidate.provenance.filtersApplied.join(', ')}`);
    //     }
    //   });

    //   if (result.candidates.length > 5) {
    //     console.log(`  ... and ${result.candidates.length - 5} more candidates`);
    //   }
    // } else {
    //   console.log(`\n⚠️  No candidates found!`);
    // }

    // Display execution statistics
    if (result.executionStats) {
      console.log(`\n📊 Execution Statistics:`);
      console.log(
        `  Vector Queries: ${result.executionStats.vectorQueriesExecuted}`
      );
      console.log(
        `  Structured Queries: ${result.executionStats.structuredQueriesExecuted}`
      );
      console.log(`  Fusion Method: ${result.executionStats.fusionMethod}`);
      console.log(`  Total Time: ${result.executionStats.totalTimeMs}ms`);
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

    // Validation
    // const validationResults = {
    //   hasCandidates: !!(result.candidates && result.candidates.length > 0),
    //   vectorQueriesCorrect: result.executionStats?.vectorQueriesExecuted === testCase.expectedResults.vectorQueriesExecuted,
    //   structuredQueriesCorrect: result.executionStats?.structuredQueriesExecuted === testCase.expectedResults.structuredQueriesExecuted,
    //   fusionMethodCorrect: result.executionStats?.fusionMethod === testCase.expectedResults.fusionMethod,
    //   noErrors: !result.errors || result.errors.length === 0,
    //   reasonableExecutionTime: executionTime < 5000 // 5 seconds max
    // };

    // console.log(`\n✅ Validation Results:`);
    // Object.entries(validationResults).forEach(([key, value]) => {
    //   console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    // });

    return {
      // success: Object.values(validationResults).every(Boolean),
      result,
      executionTime,
      // validationResults,
      candidateCount: result.candidates?.length || 0,
    };
  } catch (error) {
    console.error(
      `❌ Query execution failed:`,
      error instanceof Error ? error.message : String(error)
    );

    // Check if this is a connection error
    if (error instanceof Error) {
      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('fetch failed')
      ) {
        console.log(`\n💡 This appears to be a connection error.`);
        console.log(`   Make sure your services are running:`);
        console.log(`   - MongoDB on localhost:27017`);
        console.log(`   - Qdrant on localhost:6333`);
        console.log(`   - Ollama on localhost:11434`);
      }

      if (error.stack) {
        console.error(`Stack trace:`, error.stack);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime: 0,
      candidateCount: 0,
    };
  }
}

/**
 * Main test runner for QueryExecutorNode only
 */
async function main() {
  console.log('⚡ QueryExecutorNode Isolated Testing');
  console.log('='.repeat(60));
  console.log('Testing deterministic query execution against');
  console.log('Qdrant (vector search) and MongoDB (structured search).');
  console.log('='.repeat(60));

  const results = [];

  // Run each test case
  for (const testCase of queryExecutorTestCases) {
    const result = await testQueryExecutor(testCase);
    results.push({ ...testCase, ...result });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 QueryExecutorNode Test Summary');
  console.log('='.repeat(60));

  const passedTests = results.filter((r) => r.success).length;
  const totalTests = results.length;
  const averageTime =
    results.reduce((sum, r) => sum + (r.executionTime || 0), 0) / totalTests;
  const totalCandidates = results.reduce(
    (sum, r) => sum + (r.candidateCount || 0),
    0
  );

  console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`⏱️  Average time: ${Math.round(averageTime)}ms`);
  console.log(`🎯 Total candidates found: ${totalCandidates}`);

  // Show detailed results for each test
  console.log(`\n📋 Detailed Results:`);
  results.forEach((result) => {
    // const status = result.success ? '✅' : '❌';
    // console.log(`  ${index + 1}. ${status} ${result.name} (${result.executionTime}ms, ${result.candidateCount} candidates)`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
    // log the result
    console.log(`     Result:`, {
      result: JSON.stringify(result.result.candidates),
    });
  });
}

// Run the tests if this file is executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Test execution completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test execution failed:', error);
      process.exit(1);
    });
}

export { main as testQueryExecutorOnly };
