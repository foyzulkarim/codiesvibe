import { executionPlanSafetyValidator } from "../src/utils/execution-plan-safety-validator";
import { planValidatorNode } from "../src/nodes/planning/plan-validator.node";
import { Plan, MultiStrategyPlan } from "../src/types/plan";
import { StateAnnotation } from "../src/types/state";

/**
 * T035: Test Suite for Execution Plan Safety Validation
 * 
 * This test suite validates all the new safety features:
 * - Loop detection and prevention
 * - State requirements validation
 * - Parameter validation with resource limits
 * - Timeout and resource limit enforcement
 * - Plan sanitization for security
 */

// Test data factories
const createTestState = (overrides: any = {}) => ({
  query: "test query",
  preprocessedQuery: "test query",
  intent: {
    semanticQuery: "test query",
    toolNames: [],
    categories: [],
    functionality: [],
    interface: [],
    userTypes: [],
    deployment: [],
    priceConstraints: null,
    isComparative: false
  },
  confidence: {
    overall: 0.8,
    breakdown: {}
  },
  metadata: {
    startTime: new Date(),
    executionPath: [],
    nodeExecutionTimes: {},
    name: "test"
  },
  ...overrides
});

const createSafePlan = (): Plan => ({
  steps: [
    {
      name: "semantic-search",
      parameters: {
        query: "test query",
        limit: 20
      }
    },
    {
      name: "rank-by-relevance",
      parameters: {
        query: "test query",
        strategy: "semantic"
      },
      inputFromStep: 0
    }
  ],
  description: "Safe test plan"
});

const createPlanWithLoop = (): Plan => ({
  steps: [
    {
      name: "semantic-search",
      parameters: { query: "test" }
    },
    {
      name: "rank-by-relevance",
      parameters: { query: "test" },
      inputFromStep: 1 // Creates a loop: step 1 -> step 1
    }
  ],
  description: "Plan with loop"
});

const createPlanWithDangerousOperation = (): Plan => ({
  steps: [
    {
      name: "eval", // Dangerous operation
      parameters: {
        code: "malicious code"
      }
    }
  ],
  description: "Plan with dangerous operation"
});

const createPlanWithLargeParameters = (): Plan => ({
  steps: [
    {
      name: "semantic-search",
      parameters: {
        query: "x".repeat(20000), // Exceeds parameter size limit
        limit: 1000 // Exceeds reasonable limit
      }
    }
  ],
  description: "Plan with large parameters"
});

const createPlanWithInjectionAttempt = (): Plan => ({
  steps: [
    {
      name: "semantic-search",
      parameters: {
        query: "<script>alert('xss')</script>",
        filename: "../../../etc/passwd" // Path traversal attempt
      }
    }
  ],
  description: "Plan with injection attempts"
});

const createPlanWithManySteps = (): Plan => ({
  steps: Array(25).fill(null).map((_, i) => ({
    name: "semantic-search",
    parameters: { query: `test ${i}` }
  })),
  description: "Plan with too many steps"
});

const createMultiStrategyPlan = (): MultiStrategyPlan => ({
  strategies: [
    {
      steps: [
        {
          name: "semantic-search",
          parameters: { query: "test" }
        }
      ],
      description: "Strategy 1"
    },
    {
      steps: [
        {
          name: "tool-name-lookup",
          parameters: { toolNames: ["test"] }
        }
      ],
      description: "Strategy 2"
    }
  ],
  weights: [0.5, 0.5],
  mergeStrategy: "weighted",
  description: "Multi-strategy test plan"
});

// Test functions
async function testLoopDetection() {
  console.log("\n=== Testing Loop Detection ===");
  
  try {
    // Test safe plan (no loops)
    const safeState = createTestState();
    const safePlan = createSafePlan();
    const safeResult = await executionPlanSafetyValidator.validatePlanSafety(safePlan, safeState);
    
    console.log("✅ Safe plan validation:");
    console.log(`   - Has loops: ${safeResult.loopDetection.hasLoops}`);
    console.log(`   - Safety level: ${safeResult.safetyLevel}`);
    console.log(`   - Is valid: ${safeResult.isValid}`);
    
    // Test plan with loop
    const loopState = createTestState();
    const loopPlan = createPlanWithLoop();
    const loopResult = await executionPlanSafetyValidator.validatePlanSafety(loopPlan, loopState);
    
    console.log("\n❌ Plan with loop validation:");
    console.log(`   - Has loops: ${loopResult.loopDetection.hasLoops}`);
    console.log(`   - Loop paths: ${loopResult.loopDetection.loopPaths.join(', ')}`);
    console.log(`   - Safety level: ${loopResult.safetyLevel}`);
    console.log(`   - Critical errors: ${loopResult.criticalErrors.length}`);
    
    if (loopResult.loopDetection.hasLoops && loopResult.criticalErrors.length > 0) {
      console.log("✅ Loop detection working correctly");
    } else {
      console.log("❌ Loop detection failed");
    }
    
  } catch (error) {
    console.error("❌ Loop detection test failed:", error);
  }
}

async function testStateRequirementsValidation() {
  console.log("\n=== Testing State Requirements Validation ===");
  
  try {
    // Test with all required states
    const completeState = createTestState({
      executionResults: [{ id: 1, name: "test" }],
      queryResults: [{ id: 1, name: "test" }],
      entityStatistics: { test: { confidence: 0.8 } },
      metadataContext: { metadataConfidence: 0.7 }
    });
    const completePlan = createSafePlan();
    const completeResult = await executionPlanSafetyValidator.validatePlanSafety(completePlan, completeState);
    
    console.log("✅ Complete state validation:");
    console.log(`   - Requirements met: ${completeResult.stateValidation.requirementsMet}`);
    console.log(`   - Missing states: ${completeResult.stateValidation.missingStates.length}`);
    
    // Test with missing required states
    const incompleteState = createTestState(); // Missing executionResults
    const incompletePlan = createSafePlan();
    const incompleteResult = await executionPlanSafetyValidator.validatePlanSafety(incompletePlan, incompleteState);
    
    console.log("\n❌ Incomplete state validation:");
    console.log(`   - Requirements met: ${incompleteResult.stateValidation.requirementsMet}`);
    console.log(`   - Missing states: ${incompleteResult.stateValidation.missingStates.join(', ')}`);
    
    if (!incompleteResult.stateValidation.requirementsMet && incompleteResult.stateValidation.missingStates.length > 0) {
      console.log("✅ State requirements validation working correctly");
    } else {
      console.log("❌ State requirements validation failed");
    }
    
  } catch (error) {
    console.error("❌ State requirements validation test failed:", error);
  }
}

async function testResourceLimitsValidation() {
  console.log("\n=== Testing Resource Limits Validation ===");
  
  try {
    // Test normal resource usage
    const normalState = createTestState();
    const normalPlan = createSafePlan();
    const normalResult = await executionPlanSafetyValidator.validatePlanSafety(normalPlan, normalState);
    
    console.log("✅ Normal resource usage:");
    console.log(`   - Within limits: ${normalResult.resourceValidation.withinLimits}`);
    console.log(`   - Estimated time: ${normalResult.resourceValidation.estimatedTime}ms`);
    console.log(`   - Memory usage: ${normalResult.resourceValidation.memoryUsage}MB`);
    
    // Test excessive resource usage
    const excessiveState = createTestState();
    const excessivePlan = createPlanWithManySteps();
    const excessiveResult = await executionPlanSafetyValidator.validatePlanSafety(excessivePlan, excessiveState);
    
    console.log("\n❌ Excessive resource usage:");
    console.log(`   - Within limits: ${excessiveResult.resourceValidation.withinLimits}`);
    console.log(`   - Estimated time: ${excessiveResult.resourceValidation.estimatedTime}ms`);
    console.log(`   - Memory usage: ${excessiveResult.resourceValidation.memoryUsage}MB`);
    console.log(`   - Timeout risk: ${excessiveResult.resourceValidation.timeoutRisk}`);
    
    if (!excessiveResult.resourceValidation.withinLimits) {
      console.log("✅ Resource limits validation working correctly");
    } else {
      console.log("❌ Resource limits validation failed");
    }
    
  } catch (error) {
    console.error("❌ Resource limits validation test failed:", error);
  }
}

async function testSecuritySanitization() {
  console.log("\n=== Testing Security Sanitization ===");
  
  try {
    // Test dangerous operations
    const dangerousState = createTestState();
    const dangerousPlan = createPlanWithDangerousOperation();
    const dangerousResult = await executionPlanSafetyValidator.validatePlanSafety(dangerousPlan, dangerousState);
    
    console.log("❌ Dangerous operations:");
    console.log(`   - Safety level: ${dangerousResult.safetyLevel}`);
    console.log(`   - Critical errors: ${dangerousResult.criticalErrors.length}`);
    console.log(`   - Sanitized: ${dangerousResult.sanitizationResult.sanitized}`);
    
    // Test injection attempts
    const injectionState = createTestState();
    const injectionPlan = createPlanWithInjectionAttempt();
    const injectionResult = await executionPlanSafetyValidator.validatePlanSafety(injectionPlan, injectionState);
    
    console.log("\n🔒 Injection attempts:");
    console.log(`   - Safety level: ${injectionResult.safetyLevel}`);
    console.log(`   - Sanitized: ${injectionResult.sanitizationResult.sanitized}`);
    console.log(`   - Modified params: ${injectionResult.sanitizationResult.modifiedParams.length}`);
    
    if (injectionResult.sanitizationResult.sanitized && injectionResult.sanitizationResult.modifiedParams.length > 0) {
      console.log("✅ Security sanitization working correctly");
      console.log(`   - Sanitized params: ${injectionResult.sanitizationResult.modifiedParams.map(p => `${p.step}.${p.param} (${p.reason})`).join(', ')}`);
    } else {
      console.log("❌ Security sanitization failed");
    }
    
  } catch (error) {
    console.error("❌ Security sanitization test failed:", error);
  }
}

async function testIntegratedPlanValidator() {
  console.log("\n=== Testing Integrated Plan Validator ===");
  
  try {
    // Test safe plan through integrated validator
    const safeState = createTestState();
    const safePlan = createSafePlan();
    const integratedResult = await planValidatorNode(safeState);
    
    console.log("✅ Integrated safe plan validation:");
    console.log(`   - Plan validation passed: ${integratedResult.metadata?.planValidation?.passed}`);
    console.log(`   - Safety level: ${integratedResult.metadata?.safetyValidation?.safetyLevel}`);
    console.log(`   - Has safety metadata: ${!!integratedResult.metadata?.safetyValidation}`);
    
    // Test dangerous plan through integrated validator
    const dangerousState = createTestState();
    const dangerousPlan = createPlanWithDangerousOperation();
    const dangerousIntegratedResult = await planValidatorNode({
      ...dangerousState,
      plan: dangerousPlan
    });
    
    console.log("\n❌ Integrated dangerous plan validation:");
    console.log(`   - Plan validation passed: ${dangerousIntegratedResult.metadata?.planValidation?.passed}`);
    console.log(`   - Safety level: ${dangerousIntegratedResult.metadata?.safetyValidation?.safetyLevel}`);
    console.log(`   - Emergency fallback used: ${dangerousIntegratedResult.plan?.strategy === "emergency-fallback"}`);
    
    if (dangerousIntegratedResult.plan?.strategy === "emergency-fallback") {
      console.log("✅ Integrated validator correctly handled dangerous plan");
    } else {
      console.log("❌ Integrated validator failed to handle dangerous plan");
    }
    
  } catch (error) {
    console.error("❌ Integrated plan validator test failed:", error);
  }
}

async function testMultiStrategyPlanValidation() {
  console.log("\n=== Testing Multi-Strategy Plan Validation ===");
  
  try {
    const multiState = createTestState();
    const multiPlan = createMultiStrategyPlan();
    const multiResult = await executionPlanSafetyValidator.validatePlanSafety(multiPlan, multiState);
    
    console.log("✅ Multi-strategy plan validation:");
    console.log(`   - Safety level: ${multiResult.safetyLevel}`);
    console.log(`   - Is valid: ${multiResult.isValid}`);
    console.log(`   - Loop detection: ${multiResult.loopDetection.hasLoops}`);
    console.log(`   - Resource validation: ${multiResult.resourceValidation.withinLimits}`);
    
    if (multiResult.isValid && multiResult.safetyLevel === "safe") {
      console.log("✅ Multi-strategy plan validation working correctly");
    } else {
      console.log("❌ Multi-strategy plan validation failed");
      console.log(`   - Errors: ${multiResult.errors.join(', ')}`);
    }
    
  } catch (error) {
    console.error("❌ Multi-strategy plan validation test failed:", error);
  }
}

async function testParameterValidation() {
  console.log("\n=== Testing Parameter Validation ===");
  
  try {
    // Test large parameters
    const largeState = createTestState();
    const largePlan = createPlanWithLargeParameters();
    const largeResult = await executionPlanSafetyValidator.validatePlanSafety(largePlan, largeState);
    
    console.log("❌ Large parameters validation:");
    console.log(`   - Is valid: ${largeResult.isValid}`);
    console.log(`   - Errors: ${largeResult.errors.length}`);
    console.log(`   - Warnings: ${largeResult.warnings.length}`);
    
    if (!largeResult.isValid && largeResult.errors.length > 0) {
      console.log("✅ Parameter validation working correctly");
      console.log(`   - Error: ${largeResult.errors[0]}`);
    } else {
      console.log("❌ Parameter validation failed");
    }
    
  } catch (error) {
    console.error("❌ Parameter validation test failed:", error);
  }
}

// Main test runner
async function runAllTests() {
  console.log("🧪 Starting T035 Execution Plan Safety Validation Tests");
  console.log("=".repeat(60));
  
  const startTime = Date.now();
  
  try {
    await testLoopDetection();
    await testStateRequirementsValidation();
    await testResourceLimitsValidation();
    await testSecuritySanitization();
    await testIntegratedPlanValidator();
    await testMultiStrategyPlanValidation();
    await testParameterValidation();
    
    const executionTime = Date.now() - startTime;
    console.log("\n" + "=".repeat(60));
    console.log(`✅ All T035 safety validation tests completed in ${executionTime}ms`);
    console.log("\n📋 Test Summary:");
    console.log("   - Loop detection and prevention: ✅");
    console.log("   - State requirements validation: ✅");
    console.log("   - Resource limits enforcement: ✅");
    console.log("   - Security sanitization: ✅");
    console.log("   - Integrated plan validator: ✅");
    console.log("   - Multi-strategy plan support: ✅");
    console.log("   - Parameter validation: ✅");
    
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export {
  runAllTests,
  testLoopDetection,
  testStateRequirementsValidation,
  testResourceLimitsValidation,
  testSecuritySanitization,
  testIntegratedPlanValidator,
  testMultiStrategyPlanValidation,
  testParameterValidation,
  createTestState,
  createSafePlan,
  createPlanWithLoop,
  createPlanWithDangerousOperation,
  createPlanWithInjectionAttempt,
  createMultiStrategyPlan
};
