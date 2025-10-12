import { StateAnnotation, State } from "../../types/state";
import { Plan, MultiStrategyPlan, Function } from "../../types/plan";

/**
 * Plan Validator Node
 * 
 * Validates the structure of both single and multi-strategy plans.
 * Checks for missing function names, unknown functions, invalid inputFromStep values,
 * correct weight distribution in multi-strategy plans, and valid merge strategies.
 */
export const planValidatorNode = (state: State): Partial<State> => {
  try {
    const { plan } = state;
    
    if (!plan) {
      throw new Error("No plan found in state");
    }
    
    const validationErrors: string[] = [];
    let validatedPlan = plan;
    
    // Check if it's a multi-strategy plan
    if ('strategies' in plan) {
      validatedPlan = validateMultiStrategyPlan(plan as MultiStrategyPlan, validationErrors);
    } else {
      validatedPlan = validateSinglePlan(plan, validationErrors);
    }
    
    // If there are validation errors, create a fallback plan
    if (validationErrors.length > 0) {
      console.warn("Plan validation errors:", validationErrors);
      validatedPlan = createFallbackPlan(state, validationErrors);
    }
    
    return {
      plan: validatedPlan,
      metadata: {
        ...state.metadata,
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
    const emergencyPlan = createFallbackPlan(state, ["Plan validation failed completely"]);
    
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
 * Validates a single strategy plan
 */
function validateSinglePlan(plan: Plan, validationErrors: string[]): Plan {
  if (!plan.steps || plan.steps.length === 0) {
    validationErrors.push("Plan has no steps");
    return plan;
  }
  
  const validatedSteps: Function[] = [];
  const knownFunctions = getKnownFunctions();
  
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
    
    // If step has errors, try to fix or skip
    if (stepErrors.length > 0) {
      validationErrors.push(...stepErrors);
      
      // Try to fix the step
      const fixedStep = fixStep(step, i, knownFunctions);
      if (fixedStep) {
        validatedSteps.push(fixedStep);
      }
    } else {
      validatedSteps.push(step);
    }
  }
  
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
    ...plan,
    steps: validatedSteps
  };
}

/**
 * Validates a multi-strategy plan
 */
function validateMultiStrategyPlan(plan: MultiStrategyPlan, validationErrors: string[]): MultiStrategyPlan {
  if (!plan.strategies || plan.strategies.length === 0) {
    validationErrors.push("Multi-strategy plan has no strategies");
    return plan;
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
    const validatedStrategy = validateSinglePlan(strategy, strategyErrors);
    
    if (strategyErrors.length > 0) {
      validationErrors.push(`Strategy ${i}: ${strategyErrors.join(", ")}`);
    }
    
    validatedStrategies.push(validatedStrategy);
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
    ...plan,
    strategies: validatedStrategies
  };
}

/**
 * Attempts to fix a problematic step
 */
function fixStep(step: Function, stepIndex: number, knownFunctions: string[]): Function | null {
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
 * Creates a fallback plan when validation fails
 */
function createFallbackPlan(state: State, errors: string[]): Plan {
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
    description: `Fallback plan due to validation errors: ${errors.join(", ")}`
  };
}

/**
 * Returns list of known function names
 */
function getKnownFunctions(): string[] {
  return [
    "semantic-search",
    "tool-name-lookup",
    "find-similar-tools",
    "merge-results",
    "filter-by-price",
    "filter-by-category",
    "filter-by-interface",
    "filter-by-functionality",
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