import { dynamicStageSkipperNode } from "../src/nodes/dynamic-stage-skipper.node";
import { StateAnnotation } from "../src/types/state";

/**
 * Test script for T034: Dynamic Stage Skipping based on query complexity
 * Tests various scenarios to ensure proper stage skipping and performance optimization
 */

// Test cases for different query complexities and expected stage skipping
const testCases = [
  {
    name: "Simple query - should skip 60% of stages",
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
          },
          {
            name: "context-enrichment",
            parameters: { maxEntities: 5 }
          },
          {
            name: "local-nlp",
            parameters: { model: "bert-base-NER" }
          },
          {
            name: "result-merging",
            parameters: { strategy: "weighted" }
          },
          {
            name: "quality-assessment",
            parameters: { threshold: 0.7 }
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
    expectedComplexity: "simple",
    expectedSkippedStages: ["context-enrichment", "local-nlp", "result-merging", "quality-assessment"],
    minOptimizationGain: 0.4
  },
  
  {
    name: "Medium complexity query - should skip 30% of stages",
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
            name: "context-enrichment",
            parameters: { maxEntities: 5 }
          },
          {
            name: "local-nlp",
            parameters: { model: "bert-base-NER" }
          },
          {
            name: "result-merging",
            parameters: { strategy: "weighted" }
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
    expectedComplexity: "moderate",
    expectedSkippedStages: ["result-merging"],
    minOptimizationGain: 0.1
  },
  
  {
    name: "Complex comparative query - should skip minimal stages",
    state: {
      query: "Compare Jest vs Mocha vs Vitest for testing with enterprise features",
      preprocessedQuery: "Compare Jest vs Mocha vs Vitest for testing with enterprise features",
      intent: {
        semanticQuery: "testing framework comparison Jest Mocha Vitest enterprise",
        toolNames: ["Jest", "Mocha", "Vitest"],
        categories: ["development"],
        functionality: ["testing"],
        userTypes: ["developer", "enterprise"],
        interface: ["CLI"],
        deployment: ["Self-Hosted", "Cloud"],
        isComparative: true,
        referenceTool: "Jest",
        keywords: ["compare", "jest", "mocha", "vitest", "testing", "enterprise"],
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
            name: "context-enrichment",
            parameters: { maxEntities: 10 }
          },
          {
            name: "local-nlp",
            parameters: { model: "bert-base-NER" }
          },
          {
            name: "merge-and-dedupe",
            parameters: { strategy: "weighted", limit: 20 },
            inputFromStep: 2
          },
          {
            name: "rank-by-relevance",
            parameters: { strategy: "comparative", limit: 15 },
            inputFromStep: 3
          },
          {
            name: "quality-assessment",
            parameters: { threshold: 0.8 }
          }
        ],
        description: "Comparative analysis of testing frameworks"
      },
      executionResults: [],
      queryResults: [],
      completion: {
        query: "Compare Jest vs Mocha vs Vitest for testing with enterprise features",
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
    expectedComplexity: "complex",
    expectedSkippedStages: [],
    minOptimizationGain: 0.0
  },
  
  {
    name: "Single tool query - should skip result merging",
    state: {
      query: "Find React",
      preprocessedQuery: "Find React",
      intent: {
        semanticQuery: "React",
        toolNames: ["React"],
        categories: [],
        functionality: [],
        userTypes: [],
        interface: [],
        deployment: [],
        isComparative: false,
        referenceTool: undefined,
        keywords: ["react"],
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
            name: "lookup-by-name",
            parameters: { toolNames: ["React"] }
          },
          {
            name: "result-merging",
            parameters: { strategy: "weighted" }
          }
        ],
        description: "Single tool lookup"
      },
      executionResults: [],
      queryResults: [],
      completion: {
        query: "Find React",
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
    expectedComplexity: "simple",
    expectedSkippedStages: ["context-enrichment", "local-nlp", "result-merging", "quality-assessment"],
    minOptimizationGain: 0.4
  },
  
  {
    name: "Recovery mode - should skip monitoring stages",
    state: {
      query: "Simple query during recovery",
      preprocessedQuery: "Simple query during recovery",
      intent: {
        semanticQuery: "simple query",
        toolNames: [],
        categories: [],
        functionality: [],
        userTypes: [],
        interface: [],
        deployment: [],
        isComparative: false,
        referenceTool: undefined,
        keywords: ["simple"],
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
            parameters: { query: "simple query", limit: 10 }
          },
          {
            name: "context-enrichment",
            parameters: { maxEntities: 5 }
          },
          {
            name: "performance-monitoring",
            parameters: { detailed: true }
          },
          {
            name: "detailed-logging",
            parameters: { level: "debug" }
          }
        ],
        description: "Simple query in recovery mode"
      },
      executionResults: [],
      queryResults: [],
      completion: {
        query: "Simple query during recovery",
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
    expectedComplexity: "simple",
    expectedSkippedStages: ["context-enrichment", "local-nlp", "performance-monitoring", "detailed-logging"],
    minOptimizationGain: 0.3
  }
];

/**
 * Run dynamic stage skipping tests
 */
async function runDynamicStageSkippingTests() {
  console.log("🧪 Testing Dynamic Stage Skipping (T034)\n");
  
  let passedTests = 0;
  let totalTests = testCases.length;
  let totalOptimizationGain = 0;
  let totalStagesSkipped = 0;
  
  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`   Query: "${testCase.state.query}"`);
    console.log(`   Expected complexity: ${testCase.expectedComplexity}`);
    console.log(`   Expected skipped stages: ${testCase.expectedSkippedStages.join(", ")}`);
    
    try {
      const startTime = Date.now();
      const result = await dynamicStageSkipperNode(testCase.state);
      const executionTime = Date.now() - startTime;
      
      console.log(`   ✅ Execution completed in ${executionTime}ms`);
      console.log(`   📍 Routing decision: ${result.routingDecision}`);
      
      // Check complexity analysis
      const complexityAnalysis = result.metadata?.complexityAnalysis;
      if (complexityAnalysis) {
        console.log(`   📊 Complexity analysis: ${complexityAnalysis.complexity}`);
        console.log(`   📈 Confidence level: ${complexityAnalysis.confidenceLevel}`);
        console.log(`   🔍 Term complexity: ${complexityAnalysis.factors.termComplexity.toFixed(2)}`);
        console.log(`   🎯 Intent complexity: ${complexityAnalysis.factors.intentComplexity.toFixed(2)}`);
        
        if (complexityAnalysis.complexity === testCase.expectedComplexity) {
          console.log(`   ✅ Complexity analysis matches expected`);
          passedTests++;
        } else {
          console.log(`   ⚠️  Complexity mismatch: expected ${testCase.expectedComplexity}, got ${complexityAnalysis.complexity}`);
        }
      }
      
      // Check stage skipping decisions
      const skippingDecisions = result.metadata?.stageSkippingDecisions;
      if (skippingDecisions) {
        console.log(`   🚫 Skipped stages: ${skippingDecisions.skippedStages.join(", ")}`);
        console.log(`   ⚡ Optimization gain: ${(skippingDecisions.optimizationGain * 100).toFixed(1)}%`);
        console.log(`   ⚠️  Risk assessment: ${skippingDecisions.riskAssessment}`);
        
        totalOptimizationGain += skippingDecisions.optimizationGain;
        totalStagesSkipped += skippingDecisions.skippedStages.length;
        
        // Check if optimization gain meets minimum
        if (skippingDecisions.optimizationGain >= testCase.minOptimizationGain) {
          console.log(`   ✅ Optimization gain meets minimum (${testCase.minOptimizationGain * 100}%)`);
        } else {
          console.log(`   ⚠️  Optimization gain below minimum: expected >=${testCase.minOptimizationGain * 100}%, got ${(skippingDecisions.optimizationGain * 100).toFixed(1)}%`);
        }
        
        // Check if expected stages were skipped
        const expectedSkipped = testCase.expectedSkippedStages;
        const actualSkipped = skippingDecisions.skippedStages;
        const missingSkips = expectedSkipped.filter(stage => !actualSkipped.includes(stage));
        
        if (missingSkips.length === 0) {
          console.log(`   ✅ All expected stages were skipped`);
        } else {
          console.log(`   ⚠️  Some expected stages not skipped: ${missingSkips.join(", ")}`);
        }
      }
      
      // Check performance metrics
      const performanceMetrics = result.metadata?.performanceMetrics;
      if (performanceMetrics) {
        console.log(`   📊 Performance metrics:`);
        console.log(`      - Stages skipped: ${performanceMetrics.stagesSkipped}`);
        console.log(`      - Estimated time saved: ${performanceMetrics.estimatedTimeSaved}ms`);
        console.log(`      - Processing time: ${performanceMetrics.processingTime}ms`);
      }
      
      // Check quality validation
      const qualityValidation = result.metadata?.qualityValidation;
      if (qualityValidation) {
        console.log(`   🛡️  Quality validation:`);
        console.log(`      - Quality score: ${qualityValidation.qualityScore}`);
        console.log(`      - Risk level: ${qualityValidation.riskLevel}`);
        console.log(`      - Validation passed: ${qualityValidation.validationPassed}`);
        
        if (qualityValidation.validationPassed) {
          console.log(`   ✅ Quality validation passed`);
        } else {
          console.log(`   ⚠️  Quality validation failed`);
        }
      }
      
      // Check optimized plan
      if (result.plan && result.plan.steps) {
        console.log(`   📋 Optimized plan: ${result.plan.steps.length} steps`);
        result.plan.steps.forEach((step: any, index: number) => {
          console.log(`      ${index + 1}. ${step.name}`);
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Test failed with error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log(""); // Empty line for readability
  }
  
  // Summary statistics
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`📈 Average optimization gain: ${(totalOptimizationGain / totalTests * 100).toFixed(1)}%`);
  console.log(`🚫 Average stages skipped: ${(totalStagesSkipped / totalTests).toFixed(1)}`);
  
  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! Dynamic stage skipping is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Please review the implementation.");
  }
  
  return {
    passedTests,
    totalTests,
    averageOptimizationGain: totalOptimizationGain / totalTests,
    averageStagesSkipped: totalStagesSkipped / totalTests
  };
}

/**
 * Test performance requirements
 */
async function testPerformanceRequirements() {
  console.log("\n⚡ Testing Performance Requirements\n");
  
  const simpleQuery = {
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
  } as typeof StateAnnotation.State;
  
  try {
    console.log("📋 Testing performance with simple query...");
    const startTime = Date.now();
    const result = await dynamicStageSkipperNode(simpleQuery);
    const executionTime = Date.now() - startTime;
    
    console.log(`⏱️  Execution time: ${executionTime}ms`);
    
    if (executionTime < 100) {
      console.log("✅ Performance requirement met (< 100ms)");
    } else {
      console.log("⚠️  Performance requirement exceeded (> 100ms)");
    }
    
    const skippingDecisions = result.metadata?.stageSkippingDecisions;
    if (skippingDecisions && skippingDecisions.optimizationGain >= 0.4) {
      console.log("✅ Optimization requirement met (>= 40% improvement)");
    } else {
      console.log("⚠️  Optimization requirement not met");
    }
    
  } catch (error) {
    console.log(`❌ Performance test failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("🚀 Starting Dynamic Stage Skipping Tests (T034)\n");
  
  try {
    const results = await runDynamicStageSkippingTests();
    await testPerformanceRequirements();
    
    console.log("\n🏁 All tests completed!");
    console.log("\n📋 Summary:");
    console.log(`   - Tests passed: ${results.passedTests}/${results.totalTests}`);
    console.log(`   - Average optimization gain: ${(results.averageOptimizationGain * 100).toFixed(1)}%`);
    console.log(`   - Average stages skipped: ${results.averageStagesSkipped.toFixed(1)}`);
    
    // Check if success criteria are met
    if (results.averageOptimizationGain >= 0.4 && results.averageStagesSkipped >= 2) {
      console.log("🎉 Success criteria met: Simple queries skip 60% of processing stages!");
    } else {
      console.log("⚠️  Success criteria not fully met. Need more optimization.");
    }
    
  } catch (error) {
    console.error("💥 Test suite failed:", error);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

export { runDynamicStageSkippingTests, testPerformanceRequirements };
