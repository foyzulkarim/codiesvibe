/**
 * Test script for T031: Context Enrichment Integration
 * 
 * This script tests the integration of the context enrichment stage
 * into the main search graph, including:
 * - Conditional paths for optimization
 * - Checkpointing support
 * - Error handling
 * - Backward compatibility
 */

import { intelligentSearch } from "../src/graphs/main.graph";
import { defaultEnhancedSearchConfig } from "../src/config/enhanced-search-config";

interface TestResult {
  testName: string;
  success: boolean;
  executionTime: number;
  resultsCount: number;
  executionPath: string[];
  error?: string;
  metadata?: any;
}

async function runTest(testName: string, query: string, options: any = {}): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`\n🧪 Running test: ${testName}`);
    console.log(`📝 Query: "${query}"`);
    
    const result = await intelligentSearch(query, {
      debug: true,
      enableRecovery: true,
      enableStateValidation: true,
      ...options
    });
    
    const executionTime = Date.now() - startTime;
    
    console.log(`✅ Test completed successfully`);
    console.log(`⏱️  Execution time: ${executionTime}ms`);
    console.log(`📊 Results count: ${result.results?.length || 0}`);
    console.log(`🛤️  Execution path: ${result.metadata?.executionPath?.join(' -> ') || 'N/A'}`);
    
    return {
      testName,
      success: true,
      executionTime,
      resultsCount: result.results?.length || 0,
      executionPath: result.metadata?.executionPath || [],
      metadata: result.metadata
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.log(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      testName,
      success: false,
      executionTime,
      resultsCount: 0,
      executionPath: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testContextEnrichmentIntegration(): Promise<void> {
  console.log('🎯 Starting Context Enrichment Integration Tests');
  console.log('=' .repeat(60));
  
  const results: TestResult[] = [];
  
  // Test 1: Normal query with entities (should use context enrichment)
  results.push(await runTest(
    "Normal query with entities",
    "React components for TypeScript",
    { enableRecovery: false }
  ));
  
  // Test 2: Query without entities (should skip context enrichment)
  results.push(await runTest(
    "Query without entities",
    "hello world",
    { enableRecovery: false }
  ));
  
  // Test 3: Context enrichment disabled (should skip)
  const originalConfig = defaultEnhancedSearchConfig.contextEnrichment.enabled;
  defaultEnhancedSearchConfig.contextEnrichment.enabled = false;
  
  results.push(await runTest(
    "Context enrichment disabled",
    "React TypeScript components",
    { enableRecovery: false }
  ));
  
  // Restore original config
  defaultEnhancedSearchConfig.contextEnrichment.enabled = originalConfig;
  
  // Test 4: Recovery mode (should skip context enrichment)
  results.push(await runTest(
    "Recovery mode test",
    "React components",
    { 
      enableRecovery: true,
      // Simulate recovery by providing a thread ID
      threadId: "recovery-test-" + Date.now()
    }
  ));
  
  // Test 5: Error handling test
  results.push(await runTest(
    "Error handling test",
    "React TypeScript components with very specific requirements that might cause issues",
    { 
      enableRecovery: true,
      validationConfig: {
        enableStrictValidation: true,
        enableAutoRollback: true
      }
    }
  ));
  
  // Test 6: Performance test with complex query
  results.push(await runTest(
    "Performance test - complex query",
    "React TypeScript components for enterprise applications with state management and testing",
    { enableRecovery: false }
  ));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successfulTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;
  
  console.log(`✅ Successful tests: ${successfulTests}/${totalTests}`);
  console.log(`⏱️  Average execution time: ${Math.round(avgExecutionTime)}ms`);
  
  // Analyze execution paths
  console.log('\n🛤️  EXECUTION PATH ANALYSIS:');
  results.forEach(result => {
    const hasContextEnrichment = result.executionPath.includes('context-enrichment');
    const hasSkipContextEnrichment = result.executionPath.includes('skip-context-enrichment');
    
    console.log(`\n📋 ${result.testName}:`);
    console.log(`   Path: ${result.executionPath.join(' -> ')}`);
    console.log(`   Context enrichment: ${hasContextEnrichment ? '✅ Executed' : hasSkipContextEnrichment ? '⏭️  Skipped' : '❓ Unknown'}`);
    console.log(`   Results: ${result.resultsCount} tools`);
    console.log(`   Time: ${result.executionTime}ms`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // Check for backward compatibility
  console.log('\n🔄 BACKWARD COMPATIBILITY CHECK:');
  const allPathsValid = results.every(r => 
    r.executionPath.length >= 3 && // Should have at least intent -> planning -> execution
    r.executionPath.includes('intent-extraction') &&
    r.executionPath.includes('query-planning') &&
    r.executionPath.includes('execution')
  );
  
  console.log(`   All paths maintain core flow: ${allPathsValid ? '✅ Yes' : '❌ No'}`);
  
  // Check conditional paths work correctly
  console.log('\n⚡ CONDITIONAL PATHS CHECK:');
  const contextEnrichmentUsed = results.some(r => r.executionPath.includes('context-enrichment'));
  const contextEnrichmentSkipped = results.some(r => r.executionPath.includes('skip-context-enrichment'));
  
  console.log(`   Context enrichment executed: ${contextEnrichmentUsed ? '✅ Yes' : '❌ No'}`);
  console.log(`   Context enrichment skipped: ${contextEnrichmentSkipped ? '✅ Yes' : '❌ No'}`);
  console.log(`   Conditional paths working: ${contextEnrichmentUsed && contextEnrichmentSkipped ? '✅ Yes' : '❌ No'}`);
  
  // Final verdict
  console.log('\n🎯 FINAL VERDICT:');
  if (successfulTests === totalTests && allPathsValid && contextEnrichmentUsed && contextEnrichmentSkipped) {
    console.log('✅ ALL TESTS PASSED - Context enrichment integration is working correctly!');
  } else {
    console.log('❌ Some tests failed - Please review the implementation');
  }
  
  console.log('\n🏁 Context Enrichment Integration Tests Complete!');
}

// Run the tests
if (require.main === module) {
  testContextEnrichmentIntegration().catch(console.error);
}

export { testContextEnrichmentIntegration };
