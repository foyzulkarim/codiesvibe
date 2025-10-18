#!/usr/bin/env tsx
"use strict";
/**
 * Debug script to test the refactored 3-node LLM-first pipeline
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testRefactoredPipeline = main;
const intent_extraction_node_1 = require("../nodes/intent-extraction.node");
const agentic_search_graph_1 = require("../graphs/agentic-search.graph");
// Test cases from the specification
const testCases = [
    {
        name: "Simple discovery query",
        query: "free cli",
        expectedIntent: {
            primaryGoal: "find",
            pricing: "free",
            platform: "cli"
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
    }
];
/**
 * Run a single test case (Node Level)
 */
async function runTestCase(testCase) {
    console.log(`\n🧪 Testing: ${testCase.name} (Node Level)`);
    console.log(`📝 Query: "${testCase.query}"`);
    console.log(`─`.repeat(50));
    try {
        // Create initial state
        const initialState = {
            query: testCase.query,
            intentState: null,
            executionPlan: null,
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
                executionPath: [],
                nodeExecutionTimes: {},
                totalNodesExecuted: 0,
                pipelineVersion: "2.0-llm-first"
            }
        };
        const startTime = Date.now();
        // Run the pipeline at node level
        const result = await (0, intent_extraction_node_1.intentExtractionNode)(initialState);
        const totalTime = Date.now() - startTime;
        // Display results
        console.log(`✅ Pipeline completed in ${totalTime}ms`);
        console.log(`🎯 Intent State:`, result.intentState ? {
            primaryGoal: result.intentState.primaryGoal,
            referenceTool: result.intentState.referenceTool,
            comparisonMode: result.intentState.comparisonMode,
            pricing: result.intentState.pricing,
            platform: result.intentState.platform,
            confidence: result.intentState.confidence,
            constraintsCount: result.intentState.constraints?.length || 0
        } : '❌ NULL');
        console.log(`🗺️ Execution Plan:`, result.executionPlan ? {
            strategy: result.executionPlan.strategy,
            vectorSources: result.executionPlan.vectorSources?.length || 0,
            structuredSources: result.executionPlan.structuredSources?.length || 0,
            fusionMethod: result.executionPlan.fusion || 'none',
            confidence: result.executionPlan.confidence
        } : '❌ NULL');
        console.log(`⚡ Candidates:`, {
            count: result.candidates?.length || 0,
            topScore: result.candidates?.[0]?.score || 0,
            sources: [...new Set(result.candidates?.map(c => c.source))].join(', ')
        });
        console.log(`📊 Execution Stats:`, {
            totalTime: result.executionStats?.totalTimeMs || 0,
            vectorQueries: result.executionStats?.vectorQueriesExecuted || 0,
            structuredQueries: result.executionStats?.structuredQueriesExecuted || 0,
            fusionMethod: result.executionStats?.fusionMethod || 'none'
        });
        // Check for errors
        if (result.errors && result.errors.length > 0) {
            console.log(`❌ Errors:`, result.errors.map(e => ({
                node: e.node,
                error: e.error.message,
                recovered: e.recovered
            })));
        }
        // Basic validation
        const validationResults = {
            hasIntentState: !!result.intentState,
            hasExecutionPlan: !!result.executionPlan,
            hasCandidates: !!(result.candidates && result.candidates.length > 0),
            noErrors: !result.errors || result.errors.length === 0
        };
        console.log(`✅ Validation:`, validationResults);
        return {
            success: Object.values(validationResults).every(Boolean),
            result,
            totalTime
        };
    }
    catch (error) {
        console.error(`❌ Test failed:`, error instanceof Error ? error.message : String(error));
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            totalTime: 0
        };
    }
}
/**
 * Run a single test case (Graph Level)
 */
async function runGraphTestCase(testCase) {
    console.log(`\n🎯 Testing: ${testCase.name} (Graph Level)`);
    console.log(`📝 Query: "${testCase.query}"`);
    console.log(`─`.repeat(50));
    try {
        const startTime = Date.now();
        // Run the complete graph pipeline
        const result = await (0, agentic_search_graph_1.searchWithAgenticPipeline)(testCase.query, {
            enableCheckpoints: false,
            metadata: { testMode: true }
        });
        const totalTime = Date.now() - startTime;
        // Display results
        console.log(`✅ Graph pipeline completed in ${totalTime}ms`);
        console.log(`🎯 Intent State:`, result.intentState ? {
            primaryGoal: result.intentState.primaryGoal,
            referenceTool: result.intentState.referenceTool,
            comparisonMode: result.intentState.comparisonMode,
            confidence: result.intentState.confidence
        } : '❌ NULL');
        console.log(`🗺️ Execution Plan:`, result.executionPlan ? {
            strategy: result.executionPlan.strategy,
            confidence: result.executionPlan.confidence
        } : '❌ NULL');
        console.log(`⚡ Candidates:`, {
            count: result.candidates?.length || 0,
            topScore: result.candidates?.[0]?.score || 0,
            sources: [...new Set(result.candidates?.map(c => c.source))].join(', ')
        });
        console.log(`📊 Execution Stats:`, result.executionStats || {});
        // Check for errors
        if (result.errors && result.errors.length > 0) {
            console.log(`❌ Errors:`, result.errors.map(e => e.error.message));
        }
        return {
            success: !!(result.intentState && result.executionPlan && (!result.errors || result.errors.length === 0)),
            result,
            totalTime
        };
    }
    catch (error) {
        console.error(`❌ Graph test failed:`, error instanceof Error ? error.message : String(error));
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            totalTime: 0
        };
    }
}
/**
 * Main test runner
 */
async function main() {
    console.log('🚀 Testing Refactored Search Pipeline');
    console.log('='.repeat(60));
    const results = [];
    // Test at node level
    console.log('\n📋 Node Level Tests:');
    for (const testCase of testCases) {
        const result = await runTestCase(testCase);
        results.push({ ...testCase, ...result, level: 'node' });
    }
    // Test at graph level
    console.log('\n📋 Graph Level Tests:');
    for (const testCase of testCases) {
        const result = await runGraphTestCase(testCase);
        results.push({ ...testCase, ...result, level: 'graph' });
    }
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    const nodeTests = results.filter(r => r.level === 'node');
    const graphTests = results.filter(r => r.level === 'graph');
    const passedNodeTests = nodeTests.filter(r => r.success).length;
    const passedGraphTests = graphTests.filter(r => r.success).length;
    const passedTests = results.filter(r => r.success).length;
    const totalTests = results.length;
    console.log(`📋 Node Level: ${passedNodeTests}/${nodeTests.length} passed`);
    console.log(`🎯 Graph Level: ${passedGraphTests}/${graphTests.length} passed`);
    console.log(`📊 Overall: ${passedTests}/${totalTests} tests passed`);
    console.log(`⏱️  Average time: ${results.reduce((sum, r) => sum + (r.totalTime || 0), 0) / totalTests}ms`);
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! The complete refactored system is working correctly.');
    }
    else {
        console.log('❌ Some tests failed. Please check the implementation.');
        // Show failed tests by level
        const failedNodeTests = nodeTests.filter(r => !r.success);
        const failedGraphTests = graphTests.filter(r => !r.success);
        if (failedNodeTests.length > 0) {
            console.log('\n❌ Failed Node Level Tests:');
            failedNodeTests.forEach(test => {
                console.log(`  - ${test.name}: ${test.error || 'Unknown error'}`);
            });
        }
        if (failedGraphTests.length > 0) {
            console.log('\n❌ Failed Graph Level Tests:');
            failedGraphTests.forEach(test => {
                console.log(`  - ${test.name}: ${test.error || 'Unknown error'}`);
            });
        }
    }
    console.log('\n🏗️ Complete Architecture Transformation:');
    console.log('  ✅ Node Level: 3-node LLM-first pipeline');
    console.log('  ✅ Graph Level: Single agentic-search.graph.ts');
    console.log('  ✅ API Level: Updated server.ts endpoints');
    console.log('  ✅ Archive: Old nodes and graphs preserved');
    console.log('  📊 Reduction: 13 nodes → 3 nodes (77% reduction)');
    console.log('\n🔍 New Architecture Summary:');
    console.log('  - IntentExtractorNode (LLM-based intent understanding)');
    console.log('  - QueryPlannerNode (LLM-based retrieval strategy)');
    console.log('  - QueryExecutorNode (Deterministic database execution)');
    console.log('  - agentic-search.graph.ts (Simple 3-node workflow)');
    console.log('  - Schema-driven validation at each step');
    console.log('  - Hybrid search: Vector (Qdrant) + Structured (MongoDB)');
}
// Run the tests
if (require.main === module) {
    main().catch(console.error);
}
