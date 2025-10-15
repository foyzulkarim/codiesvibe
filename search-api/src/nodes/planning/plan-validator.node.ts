import { StateAnnotation, State } from "../../types/state";
import { Plan, MultiStrategyPlan, Function, PlanReasoning, PlanContext } from "../../types/plan";
import { EntityStatisticsSchema, MetadataContextSchema } from "../../types/enhanced-state";
import { executionPlanSafetyValidator, SafetyValidationResult } from "../../utils/execution-plan-safety-validator";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number;
  reasoning: PlanReasoning[];
}

/**
 * Enhanced Plan Validator Node
 *
 * Validates the structure of both single and multi-strategy plans with context awareness.
 * Checks for missing function names, unknown functions, invalid inputFromStep values,
 * correct weight distribution in multi-strategy plans, valid merge strategies, and
 * validates plan decisions against entity statistics and context.
 */
export const planValidatorNode = async (state: State): Promise<Partial<State>> => {
  try {
    const { plan, entityStatistics, metadataContext } = state;
    
    if (!plan) {
      throw new Error("No plan found in state");
    }
    
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];
    let validatedPlan = plan;
    const validationReasoning: PlanReasoning[] = [];
    
    // Add initial validation reasoning
    validationReasoning.push({
      stage: "validation_start",
      decision: "Starting comprehensive plan validation",
      confidence: 0.9,
      supportingEvidence: [
        "Plan structure validation",
        "Context-aware validation",
        "Entity statistics validation",
        "Safety and security validation"
      ]
    });
    
    // NEW: T035 - Enhanced safety validation
    console.log("[plan-validator] Starting enhanced safety validation");
    const safetyValidation = await executionPlanSafetyValidator.validatePlanSafety(plan, state);
    
    // Integrate safety validation results
    validationErrors.push(...safetyValidation.criticalErrors);
    validationErrors.push(...safetyValidation.errors);
    validationWarnings.push(...safetyValidation.warnings);
    
    // Add safety validation reasoning
    validationReasoning.push({
      stage: "safety_validation",
      decision: `Safety validation completed: ${safetyValidation.safetyLevel}`,
      confidence: safetyValidation.confidence,
      supportingEvidence: [
        `Safety level: ${safetyValidation.safetyLevel}`,
        `Loop detection: ${safetyValidation.loopDetection.hasLoops ? 'FAILED' : 'PASSED'}`,
        `Resource validation: ${safetyValidation.resourceValidation.withinLimits ? 'PASSED' : 'FAILED'}`,
        `State validation: ${safetyValidation.stateValidation.requirementsMet ? 'PASSED' : 'FAILED'}`,
        `Sanitization: ${safetyValidation.sanitizationResult.sanitized ? 'REQUIRED' : 'NOT NEEDED'}`,
        `Critical errors: ${safetyValidation.criticalErrors.length}`,
        `Total errors: ${safetyValidation.errors.length}`,
        `Warnings: ${safetyValidation.warnings.length}`,
        `Recommendations: ${safetyValidation.recommendations.length}`
      ]
    });
    
    // If safety validation failed catastrophically, create emergency fallback
    if (safetyValidation.safetyLevel === "unsafe" || safetyValidation.criticalErrors.length > 0) {
      console.error("[plan-validator] Critical safety issues detected, creating emergency fallback");
      validatedPlan = createEmergencyFallbackPlan(state, safetyValidation, validationReasoning);
      validationErrors.push("Plan replaced with emergency fallback due to critical safety issues");
    }
    // If plan was sanitized, use the sanitized version
    else if (safetyValidation.sanitizationResult.sanitized) {
      console.warn("[plan-validator] Plan was sanitized for security");
      // The safety validator already sanitized the plan in place
      validatedPlan = plan;
      validationWarnings.push("Plan parameters were sanitized for security");
    }
    
    // Check if it's a multi-strategy plan
    if ('strategies' in plan) {
      const multiStrategyResult = validateMultiStrategyPlan(
        plan as MultiStrategyPlan,
        validationErrors,
        validationWarnings,
        entityStatistics,
        metadataContext,
        validationReasoning
      );
      validatedPlan = multiStrategyResult.plan;
      validationErrors.push(...multiStrategyResult.errors);
      validationWarnings.push(...multiStrategyResult.warnings);
    } else {
      const singlePlanResult = validateSinglePlan(
        plan,
        validationErrors,
        validationWarnings,
        entityStatistics,
        metadataContext,
        validationReasoning
      );
      validatedPlan = singlePlanResult.plan;
      validationErrors.push(...singlePlanResult.errors);
      validationWarnings.push(...singlePlanResult.warnings);
    }
    
    // Validate plan against context and statistics
    const contextValidationResult = validatePlanContext(
      validatedPlan,
      entityStatistics,
      metadataContext,
      validationReasoning
    );
    
    validationErrors.push(...contextValidationResult.errors);
    validationWarnings.push(...contextValidationResult.warnings);
    
    // Calculate overall validation confidence
    const overallConfidence = calculateValidationConfidence(
      validationErrors,
      validationWarnings,
      contextValidationResult.confidence
    );
    
    // Add final validation reasoning
    validationReasoning.push({
      stage: "validation_complete",
      decision: `Validation ${validationErrors.length === 0 ? 'passed' : 'failed with errors'}`,
      confidence: overallConfidence,
      supportingEvidence: [
        `Errors: ${validationErrors.length}`,
        `Warnings: ${validationWarnings.length}`,
        `Overall confidence: ${overallConfidence}`,
        `Context validation: ${contextValidationResult.confidence}`
      ]
    });
    
    // If there are remaining validation errors (non-critical), create a fallback plan
    if (validationErrors.length > 0 && safetyValidation.safetyLevel !== "unsafe") {
      console.warn("Plan validation errors:", validationErrors);
      validatedPlan = createFallbackPlan(state, validationErrors, validationReasoning);
    }
    
    // Update plan with validation results
    const finalPlan = {
      ...validatedPlan,
      validationPassed: validationErrors.length === 0 && safetyValidation.safetyLevel !== "unsafe",
      validationConfidence: Math.min(overallConfidence, safetyValidation.confidence),
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined,
      // NEW: T035 - Enhanced safety metadata
      safetyValidation: {
        safetyLevel: safetyValidation.safetyLevel,
        loopDetection: safetyValidation.loopDetection,
        resourceValidation: safetyValidation.resourceValidation,
        stateValidation: safetyValidation.stateValidation,
        sanitizationResult: safetyValidation.sanitizationResult,
        recommendations: safetyValidation.recommendations
      }
    };
    
    return {
      plan: finalPlan,
      metadata: {
        ...state.metadata,
        planValidation: {
          passed: validationErrors.length === 0 && safetyValidation.safetyLevel !== "unsafe",
          confidence: Math.min(overallConfidence, safetyValidation.confidence),
          errors: validationErrors,
          warnings: validationWarnings,
          reasoning: validationReasoning
        },
        // NEW: T035 - Enhanced safety metadata
        safetyValidation: {
          safetyLevel: safetyValidation.safetyLevel,
          loopDetection: safetyValidation.loopDetection,
          resourceValidation: safetyValidation.resourceValidation,
          stateValidation: safetyValidation.stateValidation,
          sanitizationResult: safetyValidation.sanitizationResult,
          recommendations: safetyValidation.recommendations,
          confidence: safetyValidation.confidence,
          isValid: safetyValidation.isValid,
          errors: safetyValidation.errors,
          warnings: safetyValidation.warnings,
          criticalErrors: safetyValidation.criticalErrors
        },
        executionPath: [...(state.metadata?.executionPath || []), "plan-validator"],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "plan-validator": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
    
  } catch (error) {
    console.error("Error in plan validator:", error);
    
    // Create emergency fallback plan
    const emergencyReasoning: PlanReasoning[] = [{
      stage: "validation_error",
      decision: "Emergency fallback due to validation error",
      confidence: 0.2,
      supportingEvidence: [
        "Validation process failed",
        "Using emergency fallback plan"
      ]
    }];
    
    const emergencyPlan = createFallbackPlan(state, ["Plan validation failed completely"], emergencyReasoning);
    
    return {
      plan: emergencyPlan,
      errors: [
        ...(state.errors || []),
        {
          node: "plan-validator",
          error: error instanceof Error ? error : new Error("Unknown error in plan validator"),
          timestamp: new Date()
        }
      ],
      metadata: {
        ...state.metadata,
        planValidation: {
          passed: false,
          confidence: 0.2,
          errors: ["Plan validation failed completely"],
          warnings: [],
          reasoning: emergencyReasoning
        },
        executionPath: [...(state.metadata?.executionPath || []), "plan-validator"],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "plan-validator": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
  }
};

/**
 * Validates a single strategy plan with context awareness
 */
function validateSinglePlan(
  plan: Plan,
  validationErrors: string[],
  validationWarnings: string[],
  entityStatistics?: Record<string, any>,
  metadataContext?: any,
  validationReasoning?: PlanReasoning[]
): { plan: Plan; errors: string[]; warnings: string[] } {
  if (!plan.steps || plan.steps.length === 0) {
    validationErrors.push("Plan has no steps");
    return {
      plan,
      errors: validationErrors,
      warnings: validationWarnings
    };
  }
  
  const validatedSteps: Function[] = [];
  const knownFunctions = getKnownFunctions();
  const stepWarnings: string[] = [];
  
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const stepErrors: string[] = [];
    
    // Check if function name exists
    if (!step.name) {
      stepErrors.push(`Step ${i}: Missing function name`);
    } else if (!knownFunctions.includes(step.name)) {
      stepErrors.push(`Step ${i}: Unknown function '${step.name}'`);
    }
    
    // Check inputFromStep validity
    if (step.inputFromStep !== undefined) {
      if (typeof step.inputFromStep !== 'number') {
        stepErrors.push(`Step ${i}: inputFromStep must be a number`);
      } else if (step.inputFromStep < 0 || step.inputFromStep >= i) {
        stepErrors.push(`Step ${i}: inputFromStep (${step.inputFromStep}) is invalid`);
      }
    }
    
    // Context-aware parameter validation
    if (step.parameters && entityStatistics) {
      const paramValidation = validateStepParameters(step, entityStatistics, metadataContext);
      stepWarnings.push(...paramValidation.warnings);
      if (paramValidation.errors.length > 0) {
        stepErrors.push(...paramValidation.errors);
      }
    }
    
    // Add validation reasoning for critical steps
    if (validationReasoning && (stepErrors.length > 0 || stepWarnings.length > 0)) {
      validationReasoning.push({
        stage: `step_validation_${i}`,
        decision: `Step ${i} (${step.name}) validation ${stepErrors.length > 0 ? 'failed' : 'passed with warnings'}`,
        confidence: stepErrors.length === 0 ? 0.8 : 0.4,
        supportingEvidence: [
          ...stepErrors.map(e => `Error: ${e}`),
          ...stepWarnings.map(w => `Warning: ${w}`)
        ]
      });
    }
    
    // If step has errors, try to fix or skip
    if (stepErrors.length > 0) {
      validationErrors.push(...stepErrors);
      
      // Try to fix the step
      const fixedStep = fixStep(step, i, knownFunctions, entityStatistics);
      if (fixedStep) {
        validatedSteps.push(fixedStep);
      }
    } else {
      validatedSteps.push(step);
    }
  }
  
  // Add warnings to the main list
  validationWarnings.push(...stepWarnings);
  
  // Check if plan seems too fragile (too few steps)
  if (validatedSteps.length < 2) {
    validationErrors.push("Plan seems too fragile with only " + validatedSteps.length + " step(s)");
    
    // Add a fallback ranking step if missing
    if (validatedSteps.length === 1 && validatedSteps[0].name !== "rank-by-relevance") {
      validatedSteps.push({
        name: "rank-by-relevance",
        parameters: {
          query: "fallback query",
          strategy: "semantic"
        },
        inputFromStep: 0
      });
    }
  }
  
  return {
    plan: {
      ...plan,
      steps: validatedSteps
    },
    errors: validationErrors,
    warnings: validationWarnings
  };
}

/**
 * Validates a multi-strategy plan with context awareness
 */
function validateMultiStrategyPlan(
  plan: MultiStrategyPlan,
  validationErrors: string[],
  validationWarnings: string[],
  entityStatistics?: Record<string, any>,
  metadataContext?: any,
  validationReasoning?: PlanReasoning[]
): { plan: MultiStrategyPlan; errors: string[]; warnings: string[] } {
  if (!plan.strategies || plan.strategies.length === 0) {
    validationErrors.push("Multi-strategy plan has no strategies");
    return {
      plan,
      errors: validationErrors,
      warnings: validationWarnings
    };
  }
  
  if (!plan.weights || plan.weights.length !== plan.strategies.length) {
    validationErrors.push("Multi-strategy plan weights don't match strategies count");
  }
  
  // Validate weight distribution
  if (plan.weights) {
    const weightSum = plan.weights.reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      validationErrors.push(`Multi-strategy plan weights don't sum to 1.0 (sum: ${weightSum})`);
      
      // Normalize weights
      const normalizedWeights = plan.weights.map(w => w / weightSum);
      plan = { ...plan, weights: normalizedWeights };
    }
  }
  
  // Validate merge strategy
  const validMergeStrategies = ["weighted", "best", "diverse"];
  if (!plan.mergeStrategy || !validMergeStrategies.includes(plan.mergeStrategy)) {
    validationErrors.push(`Invalid merge strategy: ${plan.mergeStrategy}`);
    plan = { ...plan, mergeStrategy: "weighted" };
  }
  
  // Validate each strategy
  const validatedStrategies: Plan[] = [];
  for (let i = 0; i < plan.strategies.length; i++) {
    const strategy = plan.strategies[i];
    const strategyErrors: string[] = [];
    const strategyWarnings: string[] = [];
    const validatedStrategyResult = validateSinglePlan(
      strategy,
      strategyErrors,
      strategyWarnings,
      entityStatistics,
      metadataContext,
      validationReasoning
    );
    
    if (strategyErrors.length > 0) {
      validationErrors.push(`Strategy ${i}: ${strategyErrors.join(", ")}`);
    }
    
    if (strategyWarnings.length > 0) {
      validationWarnings.push(`Strategy ${i}: ${strategyWarnings.join(", ")}`);
    }
    
    validatedStrategies.push(validatedStrategyResult.plan);
  }
  
  // Check for strategy diversity
  if (validatedStrategies.length > 1) {
    const firstStepNames = validatedStrategies.map(s => s.steps[0]?.name);
    const uniqueFirstSteps = new Set(firstStepNames);
    
    if (uniqueFirstSteps.size === 1) {
      validationErrors.push("All strategies start with the same function - lacks diversity");
      
      // Try to add a diverse strategy
      const diverseStrategy = createDiverseStrategy(validatedStrategies[0]);
      if (diverseStrategy) {
        validatedStrategies.push(diverseStrategy);
        plan = {
          ...plan,
          strategies: validatedStrategies,
          weights: [...(plan.weights || []), 0.2].map((w, i, arr) =>
            i === arr.length - 1 ? 0.2 : w * 0.8
          )
        };
      }
    }
  }
  
  return {
    plan: {
      ...plan,
      strategies: validatedStrategies
    },
    errors: validationErrors,
    warnings: validationWarnings
  };
}

/**
 * Validates step parameters against entity statistics and context
 */
function validateStepParameters(
  step: Function,
  entityStatistics?: Record<string, any>,
  metadataContext?: any
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!step.parameters || !entityStatistics) {
    return { errors, warnings };
  }
  
  // Validate threshold parameters
  if (step.parameters.threshold !== undefined) {
    const threshold = step.parameters.threshold;
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      errors.push(`Invalid threshold: ${threshold}. Must be between 0 and 1.`);
    } else if (threshold > 0.9) {
      warnings.push(`Very high threshold (${threshold}) may return few results.`);
    } else if (threshold < 0.3) {
      warnings.push(`Very low threshold (${threshold}) may return low-quality results.`);
    }
  }
  
  // Validate limit parameters
  if (step.parameters.limit !== undefined) {
    const limit = step.parameters.limit;
    if (typeof limit !== 'number' || limit < 1) {
      errors.push(`Invalid limit: ${limit}. Must be a positive number.`);
    } else if (limit > 100) {
      warnings.push(`High limit (${limit}) may impact performance.`);
    }
  }
  
  // Validate toolNames against entity statistics
  if (step.parameters.toolNames && Array.isArray(step.parameters.toolNames)) {
    const availableTools = Object.keys(entityStatistics);
    const missingTools = step.parameters.toolNames.filter(name =>
      !availableTools.some(available =>
        available.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(available.toLowerCase())
      )
    );
    
    if (missingTools.length > 0) {
      warnings.push(`Tool names not found in entity statistics: ${missingTools.join(", ")}`);
    }
  }
  
  return { errors, warnings };
}

/**
 * Validates plan against context and statistics
 */
function validatePlanContext(
  plan: Plan,
  entityStatistics?: Record<string, any>,
  metadataContext?: any,
  validationReasoning?: PlanReasoning[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let confidence = 0.8; // Base confidence
  
  // Check if plan uses context appropriately
  if (entityStatistics && Object.keys(entityStatistics).length > 0) {
    if (!plan.adaptive) {
      warnings.push("Entity statistics available but plan is not adaptive");
      confidence -= 0.1;
    }
    
    // Check if plan complexity matches context
    const avgConfidence = Object.values(entityStatistics)
      .reduce((sum: number, stats: any) => sum + (stats.confidence || 0), 0) / Object.keys(entityStatistics).length;
    
    if (avgConfidence > 0.8 && plan.strategy === "fallback") {
      warnings.push("High confidence context but using fallback strategy");
      confidence -= 0.2;
    }
  } else {
    if (plan.adaptive) {
      warnings.push("Plan is adaptive but no entity statistics available");
      confidence -= 0.1;
    }
  }
  
  // Validate metadata context
  if (metadataContext) {
    if (metadataContext.metadataConfidence < 0.3 && plan.strategy === "optimal") {
      warnings.push("Low metadata confidence but using optimal strategy");
      confidence -= 0.15;
    }
  }
  
  // Add validation reasoning
  if (validationReasoning) {
    validationReasoning.push({
      stage: "context_validation",
      decision: `Context validation ${errors.length === 0 ? 'passed' : 'failed'}`,
      confidence,
      supportingEvidence: [
        `Entity statistics available: ${!!entityStatistics && Object.keys(entityStatistics).length > 0}`,
        `Plan adaptive: ${plan.adaptive || false}`,
        `Plan strategy: ${plan.strategy || 'unknown'}`,
        `Errors: ${errors.length}`,
        `Warnings: ${warnings.length}`
      ]
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    confidence: Math.max(0.1, Math.min(1.0, confidence)),
    reasoning: validationReasoning || []
  };
}

/**
 * Calculates overall validation confidence
 */
function calculateValidationConfidence(
  errors: string[],
  warnings: string[],
  contextConfidence: number
): number {
  let confidence = contextConfidence;
  
  // Reduce confidence based on errors
  confidence -= errors.length * 0.15;
  
  // Reduce confidence based on warnings
  confidence -= warnings.length * 0.05;
  
  return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Attempts to fix a problematic step with context awareness
 */
function fixStep(
  step: Function,
  stepIndex: number,
  knownFunctions: string[],
  entityStatistics?: Record<string, any>
): Function | null {
  const fixedStep = { ...step };
  
  // Fix missing function name
  if (!fixedStep.name) {
    if (stepIndex === 0) {
      fixedStep.name = "semantic-search";
    } else {
      fixedStep.name = "rank-by-relevance";
    }
  }
  
  // Fix unknown function name
  if (!knownFunctions.includes(fixedStep.name)) {
    // Try to find a similar function
    const similarFunction = findSimilarFunction(fixedStep.name, knownFunctions);
    if (similarFunction) {
      fixedStep.name = similarFunction;
    } else {
      // Default to semantic search or ranking
      fixedStep.name = stepIndex === 0 ? "semantic-search" : "rank-by-relevance";
    }
  }
  
  // Fix inputFromStep
  if (fixedStep.inputFromStep !== undefined) {
    if (typeof fixedStep.inputFromStep !== 'number' || fixedStep.inputFromStep >= stepIndex) {
      fixedStep.inputFromStep = stepIndex > 0 ? stepIndex - 1 : undefined;
    }
  }
  
  return fixedStep;
}

/**
 * Creates a diverse strategy based on an existing strategy
 */
function createDiverseStrategy(baseStrategy: Plan): Plan | null {
  if (!baseStrategy.steps || baseStrategy.steps.length === 0) {
    return null;
  }
  
  const firstStep = baseStrategy.steps[0];
  
  // If first step is semantic search, create a tool name lookup strategy
  if (firstStep.name === "semantic-search") {
    return {
      steps: [
        {
          name: "tool-name-lookup",
          parameters: {
            toolNames: ["example-tool"],
            fuzzy: true
          },
          inputFromStep: undefined
        },
        {
          name: "rank-by-relevance",
          parameters: {
            query: "diverse ranking",
            strategy: "hybrid"
          },
          inputFromStep: 0
        }
      ],
      description: "Diverse tool name lookup strategy"
    };
  }
  
  // If first step is tool name lookup, create a semantic search strategy
  if (firstStep.name === "tool-name-lookup") {
    return {
      steps: [
        {
          name: "semantic-search",
          parameters: {
            query: "diverse search",
            limit: 30
          },
          inputFromStep: undefined
        },
        {
          name: "rank-by-relevance",
          parameters: {
            query: "diverse ranking",
            strategy: "semantic"
          },
          inputFromStep: 0
        }
      ],
      description: "Diverse semantic search strategy"
    };
  }
  
  return null;
}

/**
 * Creates a fallback plan when validation fails with reasoning
 */
function createFallbackPlan(
  state: State,
  errors: string[],
  reasoning?: PlanReasoning[]
): Plan {
  const query = state.preprocessedQuery || state.query || "fallback search";
  
  return {
    steps: [
      {
        name: "semantic-search",
        parameters: {
          query,
          limit: 30
        },
        inputFromStep: undefined
      },
      {
        name: "rank-by-relevance",
        parameters: {
          query,
          strategy: "semantic"
        },
        inputFromStep: 0
      }
    ],
    description: `Fallback plan due to validation errors: ${errors.join(", ")}`,
    reasoning: reasoning || [{
      stage: "fallback_creation",
      decision: "Created fallback plan due to validation errors",
      confidence: 0.3,
      supportingEvidence: errors.map(e => `Error: ${e}`)
    }],
    strategy: "fallback-validation",
    adaptive: false,
    validationPassed: false
  };
}

/**
 * NEW: T035 - Create emergency fallback plan for critical safety issues
 */
function createEmergencyFallbackPlan(
  state: State,
  safetyValidation: SafetyValidationResult,
  reasoning?: PlanReasoning[]
): Plan {
  const query = state.preprocessedQuery || state.query || "emergency fallback search";
  
  // Create minimal safe plan with no dangerous operations
  const emergencyPlan: Plan = {
    steps: [
      {
        name: "semantic-search",
        parameters: {
          query,
          limit: 10, // Very conservative limit
          safeMode: true // Flag to indicate safe mode
        },
        inputFromStep: undefined
      }
    ],
    description: `EMERGENCY FALLBACK PLAN due to critical safety issues: ${safetyValidation.criticalErrors.join(", ")}`,
    reasoning: reasoning || [{
      stage: "emergency_fallback",
      decision: "Created emergency fallback plan due to critical safety issues",
      confidence: 0.1, // Very low confidence
      supportingEvidence: [
        ...safetyValidation.criticalErrors.map(e => `Critical: ${e}`),
        ...safetyValidation.recommendations.map(r => `Recommendation: ${r}`)
      ]
    }],
    strategy: "emergency-fallback",
    adaptive: false,
    validationPassed: false
  };
  
  console.warn("[plan-validator] Emergency fallback plan created with minimal safe operations");
  return emergencyPlan;
}

/**
 * Returns list of known function names
 */
function getKnownFunctions(): string[] {
  return [
    "semantic-search",
    "lookup-by-name",
    "tool-name-lookup",
    "find-similar-tools",
    "find-similar-by-features",
    "merge-results",
    "merge-and-dedupe",
    "filter-by-price",
    "filter-by-category",
    "filter-by-interface",
    "filter-by-functionality",
    "filter-by-user-type",
    "filter-by-user-types",
    "filter-by-deployment",
    "exclude-tools",
    "rank-by-relevance",
    "deduplicate-results"
  ];
}

/**
 * Finds a similar function name using simple string similarity
 */
function findSimilarFunction(target: string, knownFunctions: string[]): string | null {
  const targetLower = target.toLowerCase();
  
  for (const func of knownFunctions) {
    const funcLower = func.toLowerCase();
    
    // Check if target contains function name or vice versa
    if (targetLower.includes(funcLower) || funcLower.includes(targetLower)) {
      return func;
    }
    
    // Check for common prefixes
    if (targetLower.startsWith("filter") && funcLower.startsWith("filter")) {
      return func;
    }
    
    if (targetLower.startsWith("rank") && funcLower.startsWith("rank")) {
      return func;
    }
    
    if (targetLower.includes("search") && funcLower.includes("search")) {
      return func;
    }
  }
  
  return null;
}
