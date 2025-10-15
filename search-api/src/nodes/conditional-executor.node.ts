import { StateAnnotation } from "../types/state";
import { EnhancedStateAnnotation, ExecutionPlanSchema, ExecutionStepSchema } from "../types/enhanced-state";
import { Plan, MultiStrategyPlan, PlanSchema } from "../types/plan";
import { functionMappings } from "../config/constants";
import { checkpointManager } from "../utils/checkpoint-manager";
import { stateMonitor } from "../utils/state-monitor";
import { defaultEnhancedSearchConfig } from "../config/enhanced-search-config";
import { dynamicStageSkipperNode } from "./dynamic-stage-skipper.node";

const nodeId = "conditional-executor";

/**
 * Conditional Execution Router Node
 * 
 * Dynamically selects which stages to execute based on the query plan and complexity.
 * Parses execution plan from state, routes to appropriate next stage, skips unnecessary
 * stages for simple queries, handles conditional and optional stages, and maintains
 * state integrity through routing.
 */
export async function conditionalExecutorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const startTime = Date.now();
  const threadId = state.metadata?.threadId || "default";
  
  try {
    console.log(`[${nodeId}] Starting conditional execution for query: "${state.query}"`);
    
    // Check if conditional execution is enabled
    const config = defaultEnhancedSearchConfig.featureFlags.dynamicExecutionPlanning;
    if (!config) {
      console.log(`[${nodeId}] Conditional execution disabled, using standard execution`);
      return await routeToStandardExecution(state, startTime, nodeId);
    }

    // Parse execution plan from state
    const executionPlan = parseExecutionPlan(state);
    
    if (!executionPlan) {
      console.log(`[${nodeId}] No execution plan found, using standard execution`);
      return await routeToStandardExecution(state, startTime, nodeId);
    }

    // Validate the execution plan
    const validation = validateExecutionPlan(executionPlan);
    if (!validation.isValid) {
      console.warn(`[${nodeId}] Invalid execution plan: ${validation.errors.join(', ')}, using standard execution`);
      return await routeToStandardExecution(state, startTime, nodeId);
    }

    // Check if we should use dynamic stage skipping
    if (defaultEnhancedSearchConfig.featureFlags.dynamicExecutionPlanning &&
        defaultEnhancedSearchConfig.featureFlags.performanceOptimization) {
      console.log(`[${nodeId}] Using dynamic stage skipping for enhanced optimization`);
      return await dynamicStageSkipperNode(state);
    }
    
    // Analyze plan complexity and determine optimal routing
    const routingAnalysis = analyzePlanComplexity(executionPlan, state);
    
    // Create optimized execution path
    const optimizedPath = createOptimizedExecutionPath(executionPlan, routingAnalysis);
    
    // Update state with routing information
    const updatedState: Partial<typeof StateAnnotation.State> = {
      ...state,
      routingDecision: routingAnalysis.decision as "optimal" | "multi-strategy" | "fallback",
      plan: convertEnhancedPlanToLegacy(executionPlan),
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), nodeId],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          [nodeId]: Date.now() - startTime
        }
      }
    };

    // Create checkpoint after successful routing
    await checkpointManager.createCheckpoint(
      threadId,
      `${nodeId}-${Date.now()}`,
      state as any, // Use original state for checkpoint
      nodeId,
      Date.now() - startTime
    );

    // Track successful transition
    stateMonitor.trackTransition(
      threadId,
      "query-planning",
      nodeId,
      Date.now() - startTime,
      state as any // Use original state for tracking
    );

    const executionTime = Date.now() - startTime;
    console.log(`[${nodeId}] Completed conditional execution routing in ${executionTime}ms`);
    console.log(`[${nodeId}] Routing decision: ${routingAnalysis.decision}, skipped ${routingAnalysis.skippedStages.length} stages`);

    return updatedState;

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[${nodeId}] Error in conditional execution:`, error);
    
    // Track error
    stateMonitor.trackValidationFailure(
      threadId,
      nodeId,
      [error instanceof Error ? error.message : String(error)],
      state
    );

    // Return fallback result if enabled
    if (defaultEnhancedSearchConfig.featureFlags.dynamicExecutionPlanning) {
      console.log(`[${nodeId}] Using fallback execution due to error`);
      return await routeToStandardExecution(state, startTime, nodeId, error);
    }

    // Return error state
    return {
      errors: [
        ...(state.errors || []),
        {
          node: nodeId,
          error: error instanceof Error ? error : new Error("Unknown error in conditional execution"),
          timestamp: new Date()
        }
      ],
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), nodeId],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          [nodeId]: executionTime
        }
      }
    };
  }
}

/**
 * Parse execution plan from state
 */
function parseExecutionPlan(state: typeof StateAnnotation.State): any {
  // Check for enhanced execution plan first (using plan property)
  if (state.plan) {
    // Try to parse as enhanced plan first
    const enhancedResult = ExecutionPlanSchema.safeParse(state.plan);
    if (enhancedResult.success) {
      return state.plan;
    }
    
    // Try to parse as legacy plan and convert
    const legacyResult = PlanSchema.safeParse(state.plan);
    if (legacyResult.success) {
      return convertLegacyPlanToEnhanced(state.plan);
    }
  }
  
  // Check for legacy plan format
  if (state.plan) {
    return convertLegacyPlanToEnhanced(state.plan);
  }
  
  return null;
}

/**
 * Convert legacy plan format to enhanced execution plan
 */
function convertLegacyPlanToEnhanced(plan: Plan | MultiStrategyPlan): any {
  if ("strategies" in plan) {
    // Multi-strategy plan
    const multiStrategyPlan = plan as MultiStrategyPlan;
    return {
      semantic_understanding: {
        intent: "multi-strategy-search",
        constraints: {},
        comparisons: [],
        price_sentiment: "neutral",
        domain: "general",
        assumptions: ["Multi-strategy execution"],
        confidence_level: 0.7,
        contextualEvidence: []
      },
      execution_plan: multiStrategyPlan.strategies.flatMap((strategy, strategyIndex) => 
        strategy.steps.map((step, stepIndex) => ({
          stage: `strategy-${strategyIndex}-step-${stepIndex}`,
          tool: step.name,
          params: step.parameters || {},
          reason: `Part of ${multiStrategyPlan.description || 'multi-strategy plan'}`,
          optional: false,
          estimatedTime: 100
        }))
      ),
      adaptive_routing: {
        enabled: true,
        routing_decisions: []
      }
    };
  } else {
    // Single plan
    const singlePlan = plan as Plan;
    return {
      semantic_understanding: {
        intent: "single-strategy-search",
        constraints: {},
        comparisons: [],
        price_sentiment: "neutral",
        domain: "general",
        assumptions: ["Single strategy execution"],
        confidence_level: 0.8,
        contextualEvidence: []
      },
      execution_plan: singlePlan.steps.map((step, index) => ({
        stage: `step-${index}`,
        tool: step.name,
        params: step.parameters || {},
        reason: singlePlan.description || `Step ${index} of execution plan`,
        optional: false,
        estimatedTime: 100
      })),
      adaptive_routing: {
        enabled: true,
        routing_decisions: []
      }
    };
  }
}

/**
 * Convert enhanced execution plan back to legacy format
 */
function convertEnhancedPlanToLegacy(enhancedPlan: any): Plan | MultiStrategyPlan {
  if (!enhancedPlan || !enhancedPlan.execution_plan) {
    // Return a simple fallback plan
    return {
      steps: [
        {
          name: "semantic-search",
          parameters: {
            query: "",
            limit: 20
          }
        }
      ],
      description: "Fallback plan"
    };
  }
  
  const steps = enhancedPlan.execution_plan.map((step: any) => ({
    name: step.tool,
    parameters: step.params || {},
    inputFromStep: step.inputFromStep
  }));
  
  return {
    steps,
    description: enhancedPlan.semantic_understanding?.intent || "Converted from enhanced plan"
  };
}

/**
 * Validate execution plan for safety and correctness
 */
function validateExecutionPlan(plan: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    // Validate against schema
    const schemaResult = ExecutionPlanSchema.safeParse(plan);
    if (!schemaResult.success) {
      errors.push(`Schema validation failed: ${schemaResult.error.issues.map(i => i.message).join(', ')}`);
      return { isValid: false, errors };
    }
    
    // Validate execution steps
    if (!plan.execution_plan || !Array.isArray(plan.execution_plan)) {
      errors.push("Invalid execution_plan: must be an array");
      return { isValid: false, errors };
    }
    
    if (plan.execution_plan.length === 0) {
      errors.push("Invalid execution_plan: no steps defined");
      return { isValid: false, errors };
    }
    
    // Validate each step
    plan.execution_plan.forEach((step: any, index: number) => {
      const stepResult = ExecutionStepSchema.safeParse(step);
      if (!stepResult.success) {
        errors.push(`Invalid step at index ${index}: ${stepResult.error.issues.map(i => i.message).join(', ')}`);
      }
      
      // Validate tool mapping
      if (step.tool && !functionMappings[step.tool as keyof typeof functionMappings]) {
        errors.push(`Unknown tool '${step.tool}' at step ${index}`);
      }
    });
    
    // Check for dangerous operations
    const dangerousTools = ["eval", "exec", "system", "shell"];
    plan.execution_plan.forEach((step: any, index: number) => {
      if (dangerousTools.includes(step.tool)) {
        errors.push(`Dangerous tool '${step.tool}' at step ${index}`);
      }
    });
    
    // Validate semantic understanding
    if (!plan.semantic_understanding || typeof plan.semantic_understanding.confidence_level !== 'number') {
      errors.push("Invalid semantic_understanding: missing or invalid confidence_level");
    }
    
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Analyze plan complexity to determine optimal routing strategy
 */
function analyzePlanComplexity(executionPlan: any, state: typeof StateAnnotation.State): {
  complexity: "simple" | "medium" | "complex";
  decision: string;
  skippedStages: string[];
  optimizationGain: number;
} {
  const steps = executionPlan.execution_plan || [];
  const confidence = executionPlan.semantic_understanding?.confidence_level || 0.5;
  const hasComparisons = executionPlan.semantic_understanding?.comparisons?.length > 0;
  const hasConstraints = Object.keys(executionPlan.semantic_understanding?.constraints || {}).length > 0;
  
  let complexity: "simple" | "medium" | "complex";
  let decision: string;
  const skippedStages: string[] = [];
  let optimizationGain = 0;
  
  // Determine complexity
  if (steps.length <= 2 && confidence > 0.8 && !hasComparisons && !hasConstraints) {
    complexity = "simple";
    decision = "optimal"; // Map to expected routing decision
    
    // Skip optimization stages for simple queries
    skippedStages.push("quality-evaluation", "result-refinement", "context-enrichment");
    optimizationGain = 0.3; // 30% performance improvement
    
  } else if (steps.length <= 5 && confidence > 0.6) {
    complexity = "medium";
    decision = "multi-strategy"; // Map to expected routing decision
    
    // Skip some optimization stages for medium complexity
    if (!hasComparisons) {
      skippedStages.push("comparative-analysis");
    }
    if (!hasConstraints) {
      skippedStages.push("constraint-validation");
    }
    optimizationGain = 0.2; // 20% performance improvement
    
  } else {
    complexity = "complex";
    decision = "multi-strategy"; // Map to expected routing decision
    
    // For complex queries, execute all stages but with optimizations
    optimizationGain = 0.1; // 10% performance improvement
  }
  
  // Additional optimizations based on query characteristics
  if (state.intent?.toolNames?.length > 0 && confidence > 0.7) {
    skippedStages.push("semantic-expansion");
    optimizationGain += 0.05;
  }
  
  if (state.metadata?.recoveryTime) {
    // Skip non-essential stages during recovery
    skippedStages.push("quality-assessment", "performance-monitoring");
    optimizationGain += 0.15;
  }
  
  return {
    complexity,
    decision,
    skippedStages: [...new Set(skippedStages)], // Remove duplicates
    optimizationGain
  };
}

/**
 * Create optimized execution path based on analysis
 */
function createOptimizedExecutionPath(executionPlan: any, routingAnalysis: any): any[] {
  const originalSteps = executionPlan.execution_plan || [];
  const skippedStages = routingAnalysis.skippedStages || [];
  
  // Filter out optional stages that should be skipped
  const optimizedSteps = originalSteps.filter((step: any) => {
    // Skip if step is in skipped stages
    if (skippedStages.includes(step.stage)) {
      return false;
    }
    
    // Skip optional steps if we're optimizing
    if (step.optional && routingAnalysis.complexity === "simple") {
      return false;
    }
    
    // Keep all other steps
    return true;
  });
  
  // Add routing decision markers
  const pathWithMarkers = optimizedSteps.map((step: any, index: number) => ({
    ...step,
    optimizedIndex: index,
    routingDecision: routingAnalysis.decision,
    complexityLevel: routingAnalysis.complexity
  }));
  
  return pathWithMarkers;
}

/**
 * Route to standard execution as fallback
 */
async function routeToStandardExecution(
  state: typeof StateAnnotation.State,
  startTime: number,
  nodeId: string,
  error?: any
): Promise<Partial<typeof StateAnnotation.State>> {
  console.log(`[${nodeId}] Routing to standard execution${error ? ` due to error: ${error.message}` : ''}`);
  
  // Create a simple execution plan for standard execution
  const standardPlan = {
    semantic_understanding: {
      intent: state.intent?.semanticQuery || "standard-search",
      constraints: {},
      comparisons: [],
      price_sentiment: "neutral",
      domain: "general",
      assumptions: ["Standard execution"],
      confidence_level: 0.7,
      contextualEvidence: []
    },
    execution_plan: [
      {
        stage: "semantic-search",
        tool: "semantic-search",
        params: {
          query: state.query || "",
          limit: 20
        },
        reason: "Standard semantic search",
        optional: false,
        estimatedTime: 200
      }
    ],
    adaptive_routing: {
      enabled: false,
      routing_decisions: [{
        node: nodeId,
        decision: "standard-execution",
        reasoning: error ? `Error in conditional execution: ${error.message}` : "Conditional execution disabled or unavailable",
        timestamp: new Date()
      }]
    }
  };
  
  return {
    routingDecision: "fallback" as "optimal" | "multi-strategy" | "fallback",
    plan: convertEnhancedPlanToLegacy(standardPlan),
    metadata: {
      ...state.metadata,
      executionPath: [...(state.metadata?.executionPath || []), nodeId],
      nodeExecutionTimes: {
        ...(state.metadata?.nodeExecutionTimes || {}),
        [nodeId]: Date.now() - startTime
      }
    }
  };
}

/**
 * Check if execution is within performance requirements
 */
function checkPerformanceRequirements(executionTime: number): boolean {
  const maxTime = defaultEnhancedSearchConfig.performance.requestTimeout || 500;
  if (executionTime > maxTime) {
    console.warn(`[${nodeId}] Performance warning: Execution time ${executionTime}ms exceeds requirement of ${maxTime}ms`);
    return false;
  }
  return true;
}
