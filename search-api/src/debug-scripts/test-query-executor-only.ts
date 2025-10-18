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
import { queryExecutorNode } from '../nodes/query-executor.node';
import { StateAnnotation } from '../types/state';
import net from 'net';

// Load environment variables
dotenv.config();

/**
 * Check if a service is running on the specified host and port
 */
async function checkServiceConnection(host: string, port: number, serviceName: string): Promise<boolean> {
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

/**
 * Check all required services
 */
async function checkRequiredServices() {
  console.log('🔍 Checking required services...');
  
  const services = [
    { name: 'MongoDB', host: process.env.MONGODB_HOST || 'localhost', port: 27017 },
    { name: 'Qdrant', host: process.env.QDRANT_HOST || 'localhost', port: 6333 },
  ];
  
  const results = await Promise.all(
    services.map(async (service) => {
      const isConnected = await checkServiceConnection(service.host, service.port, service.name);
      return { ...service, isConnected };
    })
  );
  
  console.log('\n📊 Service Status:');
  results.forEach(result => {
    const status = result.isConnected ? '✅' : '❌';
    console.log(`  ${status} ${result.name} (${result.host}:${result.port})`);
  });
  
  const allConnected = results.every(result => result.isConnected);
  
  if (!allConnected) {
    console.log('\n⚠️  Some services are not running. The tests may fail.');
    console.log('💡 Please start the required services using the instructions in the header comment.');
  }
  
  return allConnected;
}

// Test cases specifically for query execution
const queryExecutorTestCases = [
  {
    name: "Vector search only - free CLI tools",
    query: "free cli",
    mockExecutionPlan: {
      "strategy": "hybrid",
      "vectorSources": [
        {
          "collection": "tools",
          "embeddingType": "vector",
          "queryVectorSource": "query_text",
          "topK": 100
        },
        {
          "collection": "descriptions",
          "embeddingType": "vector",
          "queryVectorSource": "query_text",
          "topK": 100
        },
        {
          "collection": "features",
          "embeddingType": "vector",
          "queryVectorSource": "query_text",
          "topK": 100
        }
      ],
      "structuredSources": [
        {
          "source": "mongodb",
          "filters": [
            {
              "field": "pricingModel",
              "operator": "=",
              "value": "free"
            }
          ],
          "limit": 100
        },
        {
          "source": "mongodb",
          "filters": [
            {
              "field": "platform",
              "operator": "=",
              "value": "cli"
            }
          ],
          "limit": 100
        },
        {
          "source": "mongodb",
          "filters": [
            {
              "field": "category",
              "operator": "=",
              "value": "CLI"
            }
          ],
          "limit": 100
        },
        {
          "source": "mongodb",
          "filters": [
            {
              "field": "features",
              "operator": "in",
              "value": "CLI mode"
            }
          ],
          "limit": 100
        }
      ],
      "reranker": {
        "type": "none",
        "model": "hybrid",
        "maxCandidates": 200
      },
      "fusion": "rrf",
      "maxRefinementCycles": 1,
      "explanation": "Hybrid strategy combines vector-based similarity search with MongoDB filtering to efficiently find relevant results, ensuring both comprehensive data retrieval and targeted filtering based on user constraints.",
      "confidence": 0.9
    },
    expectedResults: {
      hasCandidates: true,
      minCandidates: 1,
      maxCandidates: 10,
      vectorQueriesExecuted: 1,
      structuredQueriesExecuted: 0,
      fusionMethod: "none"
    }
  },
];

/**
 * Test only the QueryExecutorNode with a single test case
 */
async function testQueryExecutor(testCase: any, mockMode: boolean = false) {
  console.log(`\n⚡ Testing QueryExecutorNode: ${testCase.name}`);
  console.log(`📝 Query: "${testCase.query}"`);
  console.log(`🗺️ Strategy: ${testCase.mockExecutionPlan.strategy}`);
  if (mockMode) {
    console.log(`🎭 Running in MOCK MODE - services unavailable`);
  }
  console.log(`─`.repeat(60));

  try {
    // Create initial state with mock execution plan
    const initialState: typeof StateAnnotation.State = {
      query: testCase.query,
      intentState: testCase.mockIntentState || {
        primaryGoal: "find",
        referenceTool: null,
        comparisonMode: null,
        desiredFeatures: [],
        filters: [],
        pricing: "free",
        category: "CLI",
        platform: "cli",
        semanticVariants: [],
        constraints: [],
        confidence: 0.8
      },
      executionPlan: testCase.mockExecutionPlan,
      candidates: [],
      executionStats: {
        totalTimeMs: 0,
        nodeTimings: {},
        vectorQueriesExecuted: 0,
        structuredQueriesExecuted: 0
      },
      errors: [],
      metadata: {
        startTime: new Date(),
        executionPath: ["query-planner"],
        nodeExecutionTimes: {},
        totalNodesExecuted: 2,
        pipelineVersion: "2.0-llm-first",
        originalQuery: testCase.query
      }
    };

    const startTime = Date.now();

    // Execute ONLY the QueryExecutorNode
    const result = await queryExecutorNode(initialState);

    const executionTime = Date.now() - startTime;

    // Display detailed results
    console.log(`⏱️  Query execution completed in ${executionTime}ms`);

    if (result.candidates && result.candidates.length > 0) {
      console.log(`\n🎯 Found ${result.candidates.length} candidates:`);
      result.candidates.slice(0, 5).forEach((candidate, index) => {
        console.log(`  ${index + 1}. ${candidate.metadata?.name || 'Unknown Tool'}`);
        console.log(`     Score: ${candidate.score?.toFixed(3) || 'N/A'}`);
        console.log(`     Source: ${candidate.source}`);
        console.log(`     Category: ${candidate.metadata?.category || 'N/A'}`);
        console.log(`     Pricing: ${candidate.metadata?.pricing || 'N/A'}`);
        if (candidate.provenance?.filtersApplied?.length > 0) {
          console.log(`     Filters: ${candidate.provenance.filtersApplied.join(', ')}`);
        }
      });

      if (result.candidates.length > 5) {
        console.log(`  ... and ${result.candidates.length - 5} more candidates`);
      }
    } else {
      console.log(`\n⚠️  No candidates found!`);
    }

    // Display execution statistics
    if (result.executionStats) {
      console.log(`\n📊 Execution Statistics:`);
      console.log(`  Vector Queries: ${result.executionStats.vectorQueriesExecuted}`);
      console.log(`  Structured Queries: ${result.executionStats.structuredQueriesExecuted}`);
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
    const validationResults = {
      hasCandidates: !!(result.candidates && result.candidates.length > 0),
      candidatesInRange: result.candidates?.length >= testCase.expectedResults.minCandidates &&
        result.candidates?.length <= testCase.expectedResults.maxCandidates,
      vectorQueriesCorrect: result.executionStats?.vectorQueriesExecuted === testCase.expectedResults.vectorQueriesExecuted,
      structuredQueriesCorrect: result.executionStats?.structuredQueriesExecuted === testCase.expectedResults.structuredQueriesExecuted,
      fusionMethodCorrect: result.executionStats?.fusionMethod === testCase.expectedResults.fusionMethod,
      noErrors: !result.errors || result.errors.length === 0,
      reasonableExecutionTime: executionTime < 5000 // 5 seconds max
    };

    console.log(`\n✅ Validation Results:`);
    Object.entries(validationResults).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    });

    return {
      success: Object.values(validationResults).every(Boolean),
      result,
      executionTime,
      validationResults,
      candidateCount: result.candidates?.length || 0
    };

  } catch (error) {
    console.error(`❌ Query execution failed:`, error instanceof Error ? error.message : String(error));

    // Check if this is a connection error
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
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
      candidateCount: 0
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

  // Check required services first
  const servicesAvailable = await checkRequiredServices();
  
  if (!servicesAvailable) {
    console.log('\n🤔 Would you like to continue anyway? (y/N)');
    // For now, let's continue but with a warning
    console.log('⏳ Continuing with tests despite missing services...\n');
  }

  const results = [];

  // Run each test case
  for (const testCase of queryExecutorTestCases) {
    const result = await testQueryExecutor(testCase, !servicesAvailable);
    results.push({ ...testCase, ...result });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 QueryExecutorNode Test Summary');
  console.log('='.repeat(60));

  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  const averageTime = results.reduce((sum, r) => sum + (r.executionTime || 0), 0) / totalTests;
  const totalCandidates = results.reduce((sum, r) => sum + (r.candidateCount || 0), 0);

  console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`⏱️  Average time: ${Math.round(averageTime)}ms`);
  console.log(`🎯 Total candidates found: ${totalCandidates}`);

  // Show detailed results for each test
  console.log(`\n📋 Detailed Results:`);
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${index + 1}. ${status} ${result.name} (${result.executionTime}ms, ${result.candidateCount} candidates)`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });

  // Validation summary
  console.log(`\n📊 Validation Summary:`);
  const validationStats = {
    hasCandidates: results.filter(r => r.validationResults?.hasCandidates).length,
    candidatesInRange: results.filter(r => r.validationResults?.candidatesInRange).length,
    vectorQueriesCorrect: results.filter(r => r.validationResults?.vectorQueriesCorrect).length,
    structuredQueriesCorrect: results.filter(r => r.validationResults?.structuredQueriesCorrect).length,
    fusionMethodCorrect: results.filter(r => r.validationResults?.fusionMethodCorrect).length,
    noErrors: results.filter(r => r.validationResults?.noErrors).length,
    reasonableExecutionTime: results.filter(r => r.validationResults?.reasonableExecutionTime).length
  };

  Object.entries(validationStats).forEach(([key, count]) => {
    const percentage = Math.round((count / totalTests) * 100);
    console.log(`  ${key}: ${count}/${totalTests} (${percentage}%)`);
  });

  // Strategy distribution
  console.log(`\n📈 Strategy Distribution:`);
  const strategyCounts = results
    .filter(r => r.mockExecutionPlan?.strategy)
    .reduce((acc, r) => {
      const strategy = r.mockExecutionPlan.strategy;
      acc[strategy] = (acc[strategy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  Object.entries(strategyCounts).forEach(([strategy, count]) => {
    console.log(`  ${strategy}: ${count} tests`);
  });

  // Source distribution
  console.log(`\n📈 Source Usage:`);
  const sourceStats = {
    vectorOnly: results.filter(r => r.mockExecutionPlan?.vectorSources?.length > 0 &&
      (!r.mockExecutionPlan?.structuredSources?.length || r.mockExecutionPlan?.structuredSources?.length === 0)).length,
    structuredOnly: results.filter(r => (!r.mockExecutionPlan?.vectorSources?.length || r.mockExecutionPlan?.vectorSources?.length === 0) &&
      r.mockExecutionPlan?.structuredSources?.length > 0).length,
    hybrid: results.filter(r => r.mockExecutionPlan?.vectorSources?.length > 0 &&
      r.mockExecutionPlan?.structuredSources?.length > 0).length
  };

  Object.entries(sourceStats).forEach(([source, count]) => {
    console.log(`  ${source}: ${count} tests`);
  });

  if (passedTests === totalTests) {
    console.log('\n🎉 All QueryExecutorNode tests passed!');
    console.log('✅ Vector search against Qdrant is working correctly.');
    console.log('✅ Structured search against MongoDB is working correctly.');
    console.log('✅ Fusion methods are working correctly.');
    console.log('✅ Ready to integrate with the full pipeline.');
  } else {
    console.log('\n❌ Some QueryExecutorNode tests failed.');
    console.log('🔧 Review the results above to identify issues.');
    console.log('💡 Consider checking:');
    console.log('   - Qdrant connection and collection availability');
    console.log('   - MongoDB connection and data availability');
    console.log('   - Embedding service configuration');
    console.log('   - Database service implementations');
  }

  console.log('\n🎯 Next Steps:');
  console.log('  1. If tests pass → Test the full agentic search pipeline');
  console.log('  2. If tests fail → Debug QueryExecutorNode implementation');
  console.log('  3. Run the full pipeline test with: npm run test:refactored-pipeline');
}

// Run the tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as testQueryExecutorOnly };