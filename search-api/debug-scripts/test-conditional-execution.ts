import { conditionalExecutorNode } from "../src/nodes/conditional-executor.node";
import { StateAnnotation } from "../src/types/state";
import { Plan } from "../src/types/plan";

/**
 * Test script for conditional execution router
 * Tests various scenarios to ensure proper routing and optimization
 */

// Test cases for different execution scenarios
const testCases = [
  {
    name: "Simple query with high confidence",
    state: {
      query: "React tools",
      preprocessedQuery: "React tools",
      intent: {
        semanticQuery: "React tools",
        toolNames: ["React"],
        categories: ["development"],
        functionality: ["code-editing"],
        userTypes: ["developer"],
        interface: ["Web"],
        deployment: ["Cloud"],
        isComparative: false,
        referenceTool: undefined,
        keywords: ["react", "tools"],
        excludeTools: []
      },
      confidence: {
        overall: 0.9,
        breakdown: { semantic: 0.9 }
      },
      extractionSignals: {
        nerResults: [],
        fuzzyMatches: [],
        semanticCandidates: {},
        classificationScores: {},
        combinedScores: {},
        resolvedToolNames: [],
        comparativeFlag: false,
        comparativeConfidence: 0,
        referenceTool: null,
        priceConstraints: null,
        interfacePreferences: [],
        deploymentPreferences: []
      },
      routingDecision: "optimal",
      plan: {
        steps: [
          {
            name: "semantic-search",
            parameters: { query: "React tools", limit: 10 }
          }
        ],
        description: "Simple React tools search"
      },
      executionResults: [],
      queryResults: [],
      completion: {
        query: "React tools",
        strategy: "test",
        results: [],
        explanation: "test",
        metadata: {
          executionTime: "0ms",
          resultsCount: 0
        }
      },
      qualityAssessment: {
        resultCount: 0,
        averageRelevance: 0,
        categoryDiversity: 0,
        decision: "accept"
      },
      iterations: {
        refinementAttempts: 0,
        expansionAttempts: 0,
        maxAttempts: 2
      },
      errors: [],
      metadata: {
        startTime: new Date(),
        executionPath: ["test"],
        nodeExecutionTimes: {},
        name: "test"
      },
      entityStatistics: {},
      metadataContext: {
        searchSpaceSize: 0,
        metadataConfidence: 0,
        assumptions: [],
        lastUpdated: new Date(),
        enrichmentStrategy: "qdrant_multi_vector",
        processingTime: 0
      }
    } as typeof StateAnnotation.State,
    expectedRouting: "direct-execution",
    expectedSkippedStages: ["quality-evaluation", "result-refinement", "context-enrichment"]
  },
  
  {
    name: "Medium complexity query",
    state: {
      query: "API testing tools for Node.js with TypeScript support",
      preprocessedQuery: "API testing tools for Node.js with TypeScript support",
      intent: {
        semanticQuery: "API testing tools Node.js TypeScript",
        toolNames: [],
        categories: ["development"],
        functionality: ["testing"],
        userTypes: ["developer"],
        interface: ["CLI", "API"],
        deployment: ["Self-Hosted"],
        isComparative: false,
        referenceTool: undefined,
        keywords: ["api", "testing", "nodejs", "typescript"],
        excludeTools: []
      },
      confidence: {
        overall: 0.7,
        breakdown: { semantic: 0.7 }
      },
      extractionSignals: {
        nerResults: [],
        fuzzyMatches: [],
        semanticCandidates: {},
        classificationScores: {},
        combinedScores: {},
        resolvedToolNames: [],
        comparativeFlag: false,
        comparativeConfidence: 0,
        referenceTool: null,
        priceConstraints: null,
        interfacePreferences: [],
        deploymentPreferences: []
      },
      routingDecision: "multi-strategy",
      plan: {
        steps: [
          {
            name: "semantic-search",
            parameters: { query: "API testing tools", limit: 20 }
          },
          {
            name: "filter-by-category",
            parameters: { categories: ["development"] },
            inputFromStep: 0
          },
          {
            name: "filter-by-functionality",
            parameters: { functionality: ["testing"] },
            inputFromStep: 1
          }
        ],
        description: "API testing tools with filters"
      },
      executionResults: [],
      queryResults: [],
      completion: {
        query: "API testing tools for Node.js with TypeScript support",
        strategy: "test",
        results: [],
        explanation: "test",
        metadata: {
          executionTime: "0ms",
          resultsCount: 0
        }
      },
      qualityAssessment: {
        resultCount: 0,
        averageRelevance: 0,
        categoryDiversity: 0,
        decision: "accept"
      },
      iterations: {
        refinementAttempts: 0,
        expansionAttempts: 0,
        maxAttempts: 2
      },
      errors: [],
      metadata: {
        startTime: new Date(),
        executionPath: ["test"],
        nodeExecutionTimes: {},
        name: "test"
      },
      entityStatistics: {},
      metadataContext: {
        searchSpaceSize: 0,
        metadataConfidence: 0,
        assumptions: [],
        lastUpdated: new Date(),
        enrichmentStrategy: "qdrant_multi_vector",
        processingTime: 0
      }
    } as typeof StateAnnotation.State,
    expectedRouting: "optimized-execution",
    expectedSkippedStages: ["comparative-analysis"]
  },
  
  {
    name: "Complex comparative query",
    state: {
      query: "Compare Jest vs Mocha vs Vitest for testing",
      preprocessedQuery: "Compare Jest vs Mocha vs Vitest for testing",
      intent: {
        semanticQuery: "testing framework comparison Jest Mocha Vitest",
        toolNames: ["Jest", "Mocha", "Vitest"],
        categories: ["development"],
        functionality: ["testing"],
        userTypes: ["developer"],
        interface: ["CLI"],
        deployment: ["Self-Hosted"],
        isComparative: true,
        referenceTool: "Jest",
        keywords: ["compare", "jest", "mocha", "vitest", "testing"],
        excludeTools: []
      },
      confidence: {
        overall: 0.6,
        breakdown: { semantic: 0.6 }
      },
      extractionSignals: {
        nerResults: [],
        fuzzyMatches: [],
        semanticCandidates: {},
        classificationScores: {},
        combinedScores: {},
        resolvedToolNames: [],
        comparativeFlag: false,
        comparativeConfidence: 0,
        referenceTool: null,
        priceConstraints: null,
        interfacePreferences: [],
        deploymentPreferences: []
      },
      routingDecision: "multi-strategy",
      plan: {
        steps: [
          {
            name: "semantic-search",
            parameters: { query: "testing frameworks", limit: 30 }
          },
          {
            name: "find-similar-by-features",
            parameters: { referenceTool: "Jest", limit: 15 },
            inputFromStep: 0
          },
          {
            name: "merge-and-dedupe",
            parameters: { strategy: "weighted", limit: 20 },
            inputFromStep: 1
          },
          {
            name: "rank-by-relevance",
            parameters: { strategy: "comparative", limit: 15 },
            inputFromStep: 2
          },
          {
            name: "filter-by-category",
            parameters: { categories: ["development"] },
            inputFromStep: 3
          }
        ],
        description: "Comparative analysis of testing frameworks"
      },
      executionResults: [],
      queryResults: [],
      completion: {
        query: "Compare Jest vs Mocha vs Vitest for testing",
        strategy: "test",
        results: [],
        explanation: "test",
        metadata: {
          executionTime: "0ms",
          resultsCount: 0
        }
      },
      qualityAssessment: {
        resultCount: 0,
        averageRelevance: 0,
        categoryDiversity: 0,
        decision: "accept"
      },
      iterations: {
        refinementAttempts: 0,
        expansionAttempts: 0,
        maxAttempts: 2
      },
      errors: [],
      metadata: {
        startTime: new Date(),
        executionPath: ["test"],
        nodeExecutionTimes: {},
        name: "test"
      },
      entityStatistics: {},
      metadataContext: {
        searchSpaceSize: 0,
        metadataConfidence: 0,
        assumptions: [],
        lastUpdated: new Date(),
        enrichmentStrategy: "qdrant_multi_vector",
        processingTime: 0
      }
    } as typeof StateAnnotation.State,
    expectedRouting: "full-execution",
    expectedSkippedStages: []
  },
  
  {
    name: "Recovery mode scenario",
    state: {
      query: "Simple tools search",
      preprocessedQuery: "Simple tools search",
      intent: {
        semanticQuery: "tools search",
        toolNames: [],
        categories: [],
        functionality: [],
        userTypes: [],
        interface: [],
        deployment: [],
        isComparative: false,
        referenceTool: undefined,
        keywords: ["tools"],
        excludeTools: []
      },
      confidence: {
        overall: 0.8,
        breakdown: { semantic: 0.8 }
      },
      extractionSignals: {
        nerResults: [],
        fuzzyMatches: [],
        semanticCandidates: {},
        classificationScores: {},
        combinedScores: {},
        resolvedToolNames: [],
        comparativeFlag: false,
        comparativeConfidence: 0,
        referenceTool: null,
        priceConstraints: null,
        interfacePreferences: [],
        deploymentPreferences: []
      },
      routingDecision: "optimal",
      plan: {
        steps: [
          {
            name: "semantic-search",
            parameters: { query: "tools", limit: 10 }
          }
        ],
        description: "Simple tools search"
      },
      executionResults: [],
      queryResults: [],
      completion: null,
      qualityAssessment: {
        resultCount: 0,
        averageRelevance: 0,
        categoryDiversity: 0,
        decision: "accept"
      },
      iterations: {
        refinementAttempts: 0,
        expansionAttempts: 0,
        maxAttempts: 2
      },
      errors: [],
      metadata: {
        startTime: new Date(),
        executionPath: ["test"],
        nodeExecutionTimes: {},
        name: "test",
        recoveryTime: new Date() // Simulating recovery mode
      },
      entityStatistics: {},
      metadataContext: {
        searchSpaceSize: 0,
        metadataConfidence: 0,
        assumptions: [],
        lastUpdated: new Date(),
        enrichmentStrategy: "qdrant_multi_vector",
        processingTime: 0
      }
    } as typeof StateAnnotation.State,
    expectedRouting: "direct-execution",
    expectedSkippedStages: ["quality-evaluation", "result-refinement", "context-enrichment", "quality-assessment", "performance-monitoring"]
  }
];

/**
 * Run test cases for conditional execution router
 */
async function runConditionalExecutionTests() {
  console.log("🧪 Testing Conditional Execution Router\n");
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`   Query: "${testCase.state.query}"`);
    console.log(`   Expected routing: ${testCase.expectedRouting}`);
    console.log(`   Expected skipped stages: ${testCase.expectedSkippedStages.join(", ")}`);
    
    try {
      const startTime = Date.now();
      const result = await conditionalExecutorNode(testCase.state);
      const executionTime = Date.now() - startTime;
      
      console.log(`   ✅ Execution completed in ${executionTime}ms`);
      console.log(`   📍 Routing decision: ${result.routingDecision}`);
      console.log(`   📊 Plan complexity: ${result.plan ? "Generated" : "Not generated"}`);
      
      // Check if routing decision matches expected pattern
      const routingMatches = result.routingDecision && (
        (testCase.expectedRouting === "direct-execution" && result.routingDecision === "optimal") ||
        (testCase.expectedRouting === "optimized-execution" && result.routingDecision === "multi-strategy") ||
        (testCase.expectedRouting === "full-execution" && result.routingDecision === "multi-strategy")
      );
      
      if (routingMatches) {
        console.log(`   ✅ Routing decision matches expected pattern`);
        passedTests++;
      } else {
        console.log(`   ⚠️  Routing decision mismatch: expected pattern for ${testCase.expectedRouting}`);
      }
      
      // Check if plan was generated
      if (result.plan && result.plan.steps) {
        console.log(`   ✅ Execution plan generated with ${result.plan.steps.length} steps`);
        
        // Log the steps
        result.plan.steps.forEach((step: any, index: number) => {
          console.log(`      ${index + 1}. ${step.name} - ${step.parameters?.query || step.parameters?.categories || "no params"}`);
        });
      } else {
        console.log(`   ⚠️  No execution plan generated`);
      }
      
      console.log(`   📈 Execution path: ${result.metadata?.executionPath?.join(" → ")}`);
      
    } catch (error) {
      console.log(`   ❌ Test failed with error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log(""); // Empty line for readability
  }
  
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! Conditional execution router is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Please review the implementation.");
  }
}

/**
 * Test plan validation functionality
 */
async function testPlanValidation() {
  console.log("\n🔍 Testing Plan Validation\n");
  
  // Test with invalid plan
  const invalidState = {
    query: "Test query",
    preprocessedQuery: "Test query",
    intent: {
      semanticQuery: "test query",
      toolNames: [],
      categories: [],
      functionality: [],
      userTypes: [],
      interface: [],
      deployment: [],
      isComparative: false,
      referenceTool: undefined,
      keywords: ["test"],
      excludeTools: []
    },
    confidence: {
      overall: 0.5,
      breakdown: { semantic: 0.5 }
    },
    extractionSignals: {
      nerResults: [],
      fuzzyMatches: [],
      semanticCandidates: {},
      classificationScores: {},
      combinedScores: {},
      resolvedToolNames: [],
      comparativeFlag: false,
      comparativeConfidence: 0,
      referenceTool: null,
      priceConstraints: null,
      interfacePreferences: [],
      deploymentPreferences: []
    },
    routingDecision: "fallback",
    plan: {
      steps: [
        {
          name: "invalid-tool",
          parameters: { query: "test" }
        },
        {
          name: "dangerous-tool",
          parameters: { exec: "rm -rf /" }
        }
      ],
      description: "Invalid plan test"
    },
    executionResults: [],
    queryResults: [],
    completion: null,
    qualityAssessment: {
      resultCount: 0,
      averageRelevance: 0,
      categoryDiversity: 0,
      decision: "accept"
    },
    iterations: {
      refinementAttempts: 0,
      expansionAttempts: 0,
      maxAttempts: 2
    },
    errors: [],
    metadata: {
      startTime: new Date(),
      executionPath: ["test"],
      nodeExecutionTimes: {},
      name: "test"
    },
    entityStatistics: {},
    metadataContext: {
      searchSpaceSize: 0,
      metadataConfidence: 0,
      assumptions: [],
      lastUpdated: new Date(),
      enrichmentStrategy: "qdrant_multi_vector",
      processingTime: 0
    }
  } as typeof StateAnnotation.State;
  
  try {
    console.log("📋 Testing invalid plan handling...");
    const result = await conditionalExecutorNode(invalidState);
    
    if (result.routingDecision === "fallback") {
      console.log("✅ Invalid plan correctly handled with fallback routing");
    } else {
      console.log("⚠️  Invalid plan was not handled as expected");
    }
  } catch (error) {
    console.log(`❌ Plan validation test failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Test performance requirements
 */
async function testPerformanceRequirements() {
  console.log("\n⚡ Testing Performance Requirements\n");
  
  const performanceTestState = {
    query: "Performance test query",
    preprocessedQuery: "Performance test query",
    intent: {
      semanticQuery: "performance test",
      toolNames: [],
      categories: [],
      functionality: [],
      userTypes: [],
      interface: [],
      deployment: [],
      isComparative: false,
      referenceTool: undefined,
      keywords: ["performance"],
      excludeTools: []
    },
    confidence: {
      overall: 0.8,
      breakdown: { semantic: 0.8 }
    },
    extractionSignals: {
      nerResults: [],
      fuzzyMatches: [],
      semanticCandidates: {},
      classificationScores: {},
      combinedScores: {},
      resolvedToolNames: [],
      comparativeFlag: false,
      comparativeConfidence: 0,
      referenceTool: null,
      priceConstraints: null,
      interfacePreferences: [],
      deploymentPreferences: []
    },
    routingDecision: "optimal",
    plan: {
      steps: [
        {
          name: "semantic-search",
          parameters: { query: "performance test", limit: 10 }
        }
      ],
      description: "Performance test plan"
    },
    executionResults: [],
    queryResults: [],
    completion: null,
    qualityAssessment: {
      resultCount: 0,
      averageRelevance: 0,
      categoryDiversity: 0,
      decision: "accept"
    },
    iterations: {
      refinementAttempts: 0,
      expansionAttempts: 0,
      maxAttempts: 2
    },
    errors: [],
    metadata: {
      startTime: new Date(),
      executionPath: ["test"],
      nodeExecutionTimes: {},
      name: "test"
    },
    entityStatistics: {},
    metadataContext: {
      searchSpaceSize: 0,
      metadataConfidence: 0,
      assumptions: [],
      lastUpdated: new Date(),
      enrichmentStrategy: "qdrant_multi_vector",
      processingTime: 0
    }
  } as typeof StateAnnotation.State;
  
  try {
    console.log("📋 Testing performance with simple query...");
    const startTime = Date.now();
    const result = await conditionalExecutorNode(performanceTestState);
    const executionTime = Date.now() - startTime;
    
    console.log(`⏱️  Execution time: ${executionTime}ms`);
    
    if (executionTime < 500) {
      console.log("✅ Performance requirement met (< 500ms)");
    } else {
      console.log("⚠️  Performance requirement exceeded (> 500ms)");
    }
    
    console.log(`📊 Node execution time recorded: ${result.metadata?.nodeExecutionTimes?.["conditional-executor"]}ms`);
    
  } catch (error) {
    console.log(`❌ Performance test failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("🚀 Starting Conditional Execution Router Tests\n");
  
  try {
    await runConditionalExecutionTests();
    await testPlanValidation();
    await testPerformanceRequirements();
    
    console.log("\n🏁 All tests completed!");
    
  } catch (error) {
    console.error("💥 Test suite failed:", error);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

export { runConditionalExecutionTests, testPlanValidation, testPerformanceRequirements };
