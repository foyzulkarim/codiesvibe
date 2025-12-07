import { Plan, MultiStrategyPlan, Function, PlanReasoning } from "../types/plan.js";
import { StateAnnotation } from "../types/state.js";
import { ExecutionPlanSchema, ExecutionStepSchema } from "../types/enhanced-state.js";
import { defaultEnhancedSearchConfig } from "../config/enhanced-search-config.js";

// Safety validation result interface
export interface SafetyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criticalErrors: string[];
  safetyLevel: "safe" | "caution" | "unsafe";
  loopDetection: {
    hasLoops: boolean;
    loopPaths: string[];
    circularDependencies: string[];
  };
  resourceValidation: {
    withinLimits: boolean;
    estimatedTime: number;
    memoryUsage: number;
    timeoutRisk: boolean;
  };
  stateValidation: {
    requirementsMet: boolean;
    missingStates: string[];
    invalidStates: string[];
  };
  sanitizationResult: {
    sanitized: boolean;
    removedSteps: string[];
    modifiedParams: Array<{ step: string; param: string; reason: string }>;
  };
  recommendations: string[];
  confidence: number;
}

// Resource limits configuration
export const RESOURCE_LIMITS = {
  MAX_STEPS_PER_PLAN: 20,
  MAX_EXECUTION_TIME: 30000, // 30 seconds in ms
  MAX_MEMORY_USAGE: 512, // MB
  MAX_PARAMETER_SIZE: 10000, // characters
  MAX_NESTED_PLANS: 3,
  MAX_CONCURRENT_OPERATIONS: 10,
  MIN_STEP_INTERVAL: 10, // ms between steps
  CRITICAL_TIMEOUT: 60000, // 60 seconds absolute timeout
} as const;

// Dangerous operations that need special validation
export const DANGEROUS_OPERATIONS = [
  "eval",
  "exec",
  "system",
  "shell",
  "spawn",
  "child_process",
  "fs",
  "file_system",
  "network",
  "http",
  "https",
  "database",
  "sql",
  "nosql",
  "delete",
  "remove",
  "write",
  "modify",
  "create",
  "update",
] as const;

// State requirements for each stage type
export const STAGE_STATE_REQUIREMENTS = {
  "semantic-search": ["query", "preprocessedQuery"],
  "tool-name-lookup": ["query", "intent"],
  "find-similar-tools": ["query", "executionResults"],
  "filter-by-price": ["executionResults", "intent"],
  "filter-by-category": ["executionResults", "intent"],
  "filter-by-interface": ["executionResults", "intent"],
  "filter-by-functionality": ["executionResults", "intent"],
  "filter-by-user-type": ["executionResults", "intent"],
  "filter-by-deployment": ["executionResults", "intent"],
  "exclude-tools": ["executionResults"],
  "rank-by-relevance": ["query", "executionResults"],
  "merge-results": ["executionResults"],
  "merge-and-dedupe": ["executionResults"],
  "deduplicate-results": ["executionResults"],
  "context-enrichment": ["entityStatistics", "metadataContext"],
  "local-nlp": ["query", "preprocessedQuery"],
  "quality-assessment": ["executionResults", "queryResults"],
  "result-refinement": ["executionResults", "qualityAssessment"],
} as const;

/**
 * Enhanced Execution Plan Safety Validator
 * 
 * Implements T035: Add execution plan validation and safety checks
 * 
 * Key features:
 * - Loop detection and prevention
 * - State requirements validation
 * - Parameter validation with resource limits
 * - Timeout and resource limit enforcement
 * - Plan sanitization for security
 * - Comprehensive safety scoring
 */
export class ExecutionPlanSafetyValidator {
  private config = defaultEnhancedSearchConfig;
  private visitedSteps = new Set<string>();
  private executionPath: string[] = [];
  private stepDependencies = new Map<string, string[]>();

  /**
   * Comprehensive safety validation of execution plan
   */
  async validatePlanSafety(
    plan: Plan | MultiStrategyPlan,
    state: typeof StateAnnotation.State
  ): Promise<SafetyValidationResult> {
    console.log("[SafetyValidator] Starting comprehensive plan safety validation");
    
    const result: SafetyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      criticalErrors: [],
      safetyLevel: "safe",
      loopDetection: {
        hasLoops: false,
        loopPaths: [],
        circularDependencies: [],
      },
      resourceValidation: {
        withinLimits: true,
        estimatedTime: 0,
        memoryUsage: 0,
        timeoutRisk: false,
      },
      stateValidation: {
        requirementsMet: true,
        missingStates: [],
        invalidStates: [],
      },
      sanitizationResult: {
        sanitized: false,
        removedSteps: [],
        modifiedParams: [],
      },
      recommendations: [],
      confidence: 1.0,
    };

    try {
      // Reset internal state
      this.resetValidationState();

      // Convert to execution plan format if needed
      const executionPlan = this.convertToExecutionPlan(plan);
      
      // 1. Basic structure validation
      this.validatePlanStructure(executionPlan, result);
      
      // 2. Loop detection and prevention
      this.detectLoops(executionPlan, result);
      
      // 3. State requirements validation
      this.validateStateRequirements(executionPlan, state, result);
      
      // 4. Parameter validation with resource limits
      this.validateParametersAndResources(executionPlan, result);
      
      // 5. Timeout and resource limit enforcement
      this.validateTimeoutAndResources(executionPlan, result);
      
      // 6. Security sanitization
      this.sanitizePlan(executionPlan, result);
      
      // 7. Calculate overall safety score
      this.calculateSafetyScore(result);

      console.log(`[SafetyValidator] Validation completed: ${result.safetyLevel} (${result.confidence})`);
      
      return result;

    } catch (error) {
      console.error("[SafetyValidator] Critical validation error:", error);
      result.criticalErrors.push(`Validation system error: ${error instanceof Error ? error.message : String(error)}`);
      result.isValid = false;
      result.safetyLevel = "unsafe";
      result.confidence = 0.0;
      return result;
    }
  }

  /**
   * Reset internal validation state
   */
  private resetValidationState(): void {
    this.visitedSteps.clear();
    this.executionPath = [];
    this.stepDependencies.clear();
  }

  /**
   * Convert plan to execution plan format
   */
  private convertToExecutionPlan(plan: Plan | MultiStrategyPlan): any {
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
            estimatedTime: 100,
            inputFromStep: step.inputFromStep
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
          estimatedTime: 100,
          inputFromStep: step.inputFromStep
        })),
        adaptive_routing: {
          enabled: true,
          routing_decisions: []
        }
      };
    }
  }

  /**
   * Validate basic plan structure
   */
  private validatePlanStructure(executionPlan: any, result: SafetyValidationResult): void {
    if (!executionPlan) {
      result.criticalErrors.push("Execution plan is null or undefined");
      result.isValid = false;
      return;
    }

    if (!executionPlan.execution_plan || !Array.isArray(executionPlan.execution_plan)) {
      result.criticalErrors.push("Invalid execution_plan: must be an array");
      result.isValid = false;
      return;
    }

    if (executionPlan.execution_plan.length === 0) {
      result.errors.push("Execution plan has no steps");
      result.isValid = false;
      return;
    }

    if (executionPlan.execution_plan.length > RESOURCE_LIMITS.MAX_STEPS_PER_PLAN) {
      result.errors.push(`Too many steps (${executionPlan.execution_plan.length}). Maximum allowed: ${RESOURCE_LIMITS.MAX_STEPS_PER_PLAN}`);
      result.isValid = false;
    }

    // Validate each step structure
    executionPlan.execution_plan.forEach((step: any, index: number) => {
      const stepValidation = ExecutionStepSchema.safeParse(step);
      if (!stepValidation.success) {
        result.errors.push(`Invalid step at index ${index}: ${stepValidation.error.issues.map(i => i.message).join(', ')}`);
        result.isValid = false;
      }
    });
  }

  /**
   * Detect loops and circular dependencies
   */
  private detectLoops(executionPlan: any, result: SafetyValidationResult): void {
    const steps = executionPlan.execution_plan || [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const loopPaths: string[] = [];
    const circularDependencies: string[] = [];

    // Build dependency graph
    steps.forEach((step: any, index: number) => {
      const stepId = `${step.stage || `step-${index}`}`;
      const dependencies: string[] = [];
      
      if (step.inputFromStep !== undefined) {
        const depStep = steps[step.inputFromStep];
        if (depStep) {
          dependencies.push(depStep.stage || `step-${step.inputFromStep}`);
        }
      }
      
      this.stepDependencies.set(stepId, dependencies);
    });

    // DFS to detect cycles
    const detectCycle = (stepId: string, path: string[]): boolean => {
      if (recursionStack.has(stepId)) {
        const cycleStart = path.indexOf(stepId);
        if (cycleStart !== -1) {
          const cyclePath = path.slice(cycleStart).concat(stepId);
          loopPaths.push(cyclePath.join(" -> "));
          return true;
        }
      }

      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);
      path.push(stepId);

      const dependencies = this.stepDependencies.get(stepId) || [];
      for (const dep of dependencies) {
        if (detectCycle(dep, [...path])) {
          circularDependencies.push(`${stepId} -> ${dep}`);
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    // Check all steps for cycles
    steps.forEach((step: any, index: number) => {
      const stepId = step.stage || `step-${index}`;
      if (!visited.has(stepId)) {
        detectCycle(stepId, []);
      }
    });

    // Check for self-references
    steps.forEach((step: any, index: number) => {
      if (step.inputFromStep === index) {
        loopPaths.push(`Step ${index} references itself`);
        circularDependencies.push(`step-${index} -> step-${index}`);
      }
    });

    result.loopDetection = {
      hasLoops: loopPaths.length > 0 || circularDependencies.length > 0,
      loopPaths,
      circularDependencies,
    };

    if (result.loopDetection.hasLoops) {
      result.criticalErrors.push("Loops detected in execution plan");
      result.loopDetection.loopPaths.forEach(path => {
        result.criticalErrors.push(`Loop path: ${path}`);
      });
      result.isValid = false;
    }
  }

  /**
   * Validate state requirements for each stage
   */
  private validateStateRequirements(
    executionPlan: any,
    state: typeof StateAnnotation.State,
    result: SafetyValidationResult
  ): void {
    const steps = executionPlan.execution_plan || [];
    const missingStates: string[] = [];
    const invalidStates: string[] = [];

    steps.forEach((step: any, index: number) => {
      const stageName = step.tool;
      const requiredStates = STAGE_STATE_REQUIREMENTS[stageName as keyof typeof STAGE_STATE_REQUIREMENTS];

      if (requiredStates) {
        requiredStates.forEach(requiredState => {
          const stateValue = (state as any)[requiredState];
          
          if (stateValue === undefined || stateValue === null) {
            missingStates.push(`Step ${index} (${stageName}): Missing required state '${requiredState}'`);
          } else if (Array.isArray(stateValue) && stateValue.length === 0) {
            missingStates.push(`Step ${index} (${stageName}): Required state '${requiredState}' is empty array`);
          } else if (typeof stateValue === 'object' && Object.keys(stateValue).length === 0) {
            missingStates.push(`Step ${index} (${stageName}): Required state '${requiredState}' is empty object`);
          }
        });
      } else {
        result.warnings.push(`Step ${index} (${stageName}): Unknown stage type, cannot validate state requirements`);
      }
    });

    result.stateValidation = {
      requirementsMet: missingStates.length === 0,
      missingStates,
      invalidStates,
    };

    if (!result.stateValidation.requirementsMet) {
      result.errors.push("State requirements not met for some stages");
      result.errors.push(...missingStates);
      result.isValid = false;
    }
  }

  /**
   * Validate parameters and resource usage
   */
  private validateParametersAndResources(
    executionPlan: any,
    result: SafetyValidationResult
  ): void {
    const steps = executionPlan.execution_plan || [];
    let totalEstimatedTime = 0;
    let totalMemoryUsage = 0;

    steps.forEach((step: any, index: number) => {
      // Check for dangerous operations
      if (DANGEROUS_OPERATIONS.includes(step.tool)) {
        result.criticalErrors.push(`Dangerous operation '${step.tool}' at step ${index}`);
        result.isValid = false;
      }

      // Validate parameters
      if (step.params) {
        const paramSize = JSON.stringify(step.params).length;
        if (paramSize > RESOURCE_LIMITS.MAX_PARAMETER_SIZE) {
          result.errors.push(`Step ${index}: Parameters too large (${paramSize} chars). Max: ${RESOURCE_LIMITS.MAX_PARAMETER_SIZE}`);
          result.isValid = false;
        }

        // Check for suspicious parameter patterns
        this.validateParameterPatterns(step.params, index, result);
      }

      // Estimate resource usage
      const stepTime = step.estimatedTime || 100;
      const stepMemory = this.estimateStepMemoryUsage(step);
      
      totalEstimatedTime += stepTime;
      totalMemoryUsage += stepMemory;

      // Check individual step limits
      if (stepTime > 5000) { // 5 seconds per step
        result.warnings.push(`Step ${index}: High estimated execution time (${stepTime}ms)`);
      }

      if (stepMemory > 100) { // 100MB per step
        result.warnings.push(`Step ${index}: High estimated memory usage (${stepMemory}MB)`);
      }
    });

    result.resourceValidation = {
      withinLimits: totalEstimatedTime <= RESOURCE_LIMITS.MAX_EXECUTION_TIME && 
                    totalMemoryUsage <= RESOURCE_LIMITS.MAX_MEMORY_USAGE,
      estimatedTime: totalEstimatedTime,
      memoryUsage: totalMemoryUsage,
      timeoutRisk: totalEstimatedTime > RESOURCE_LIMITS.MAX_EXECUTION_TIME * 0.8,
    };

    if (!result.resourceValidation.withinLimits) {
      result.errors.push("Resource limits exceeded");
      if (totalEstimatedTime > RESOURCE_LIMITS.MAX_EXECUTION_TIME) {
        result.errors.push(`Total execution time (${totalEstimatedTime}ms) exceeds limit (${RESOURCE_LIMITS.MAX_EXECUTION_TIME}ms)`);
      }
      if (totalMemoryUsage > RESOURCE_LIMITS.MAX_MEMORY_USAGE) {
        result.errors.push(`Total memory usage (${totalMemoryUsage}MB) exceeds limit (${RESOURCE_LIMITS.MAX_MEMORY_USAGE}MB)`);
      }
      result.isValid = false;
    }

    if (result.resourceValidation.timeoutRisk) {
      result.warnings.push("High timeout risk due to long execution time");
    }
  }

  /**
   * Validate parameter patterns for security
   */
  private validateParameterPatterns(params: any, stepIndex: number, result: SafetyValidationResult): void {
    const paramStr = JSON.stringify(params).toLowerCase();
    
    // Check for code injection patterns
    const injectionPatterns = [
      /eval\s*\(/,
      /function\s*\(/,
      /=>\s*{/,
      /javascript:/,
      /data:script/,
      /<script/,
      /on\w+\s*=/,
    ];

    injectionPatterns.forEach(pattern => {
      if (pattern.test(paramStr)) {
        result.criticalErrors.push(`Step ${stepIndex}: Potential code injection detected in parameters`);
        result.isValid = false;
      }
    });

    // Check for path traversal patterns
    const pathTraversalPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e%2f/i,
      /%2e%2e\\/i,
    ];

    pathTraversalPatterns.forEach(pattern => {
      if (pattern.test(paramStr)) {
        result.criticalErrors.push(`Step ${stepIndex}: Potential path traversal detected in parameters`);
        result.isValid = false;
      }
    });

    // Check for command injection patterns
    const commandPatterns = [
      /;\s*rm\s+/,
      /;\s*del\s+/,
      /\|\s*sh/,
      /\|\s*cmd/,
      /&&\s*rm/,
      /&&\s*del/,
    ];

    commandPatterns.forEach(pattern => {
      if (pattern.test(paramStr)) {
        result.criticalErrors.push(`Step ${stepIndex}: Potential command injection detected in parameters`);
        result.isValid = false;
      }
    });
  }

  /**
   * Estimate memory usage for a step
   */
  private estimateStepMemoryUsage(step: any): number {
    let baseMemory = 10; // Base 10MB per step
    
    // Add memory based on parameters
    if (step.params) {
      const paramSize = JSON.stringify(step.params).length;
      baseMemory += Math.min(paramSize / 1000, 50); // Up to 50MB for parameters
    }

    // Add memory based on operation type
    const operationMemory: Record<string, number> = {
      "semantic-search": 30,
      "tool-name-lookup": 20,
      "find-similar-tools": 40,
      "filter-by-price": 15,
      "filter-by-category": 15,
      "filter-by-interface": 15,
      "filter-by-functionality": 15,
      "filter-by-user-type": 15,
      "filter-by-deployment": 15,
      "exclude-tools": 20,
      "rank-by-relevance": 35,
      "merge-results": 50,
      "merge-and-dedupe": 45,
      "deduplicate-results": 25,
      "context-enrichment": 60,
      "local-nlp": 80,
      "quality-assessment": 25,
      "result-refinement": 30,
    };

    baseMemory += operationMemory[step.tool] || 20;
    
    return baseMemory;
  }

  /**
   * Validate timeout and resource limits
   */
  private validateTimeoutAndResources(
    executionPlan: any,
    result: SafetyValidationResult
  ): void {
    const steps = executionPlan.execution_plan || [];
    
    // Check for critical timeout scenarios
    const criticalSteps = steps.filter((step: any) => 
      (step.estimatedTime || 100) > RESOURCE_LIMITS.CRITICAL_TIMEOUT / steps.length
    );

    if (criticalSteps.length > 0) {
      result.criticalErrors.push(`${criticalSteps.length} steps risk exceeding critical timeout`);
      result.isValid = false;
    }

    // Check concurrent operations
    const concurrentOps = steps.filter((step: any) => 
      step.params?.concurrent || step.params?.parallel
    ).length;

    if (concurrentOps > RESOURCE_LIMITS.MAX_CONCURRENT_OPERATIONS) {
      result.errors.push(`Too many concurrent operations (${concurrentOps}). Max: ${RESOURCE_LIMITS.MAX_CONCURRENT_OPERATIONS}`);
      result.isValid = false;
    }

    // Check for nested plans
    const nestedPlans = steps.filter((step: any) => 
      step.params?.subPlan || step.params?.nestedPlan
    ).length;

    if (nestedPlans > RESOURCE_LIMITS.MAX_NESTED_PLANS) {
      result.errors.push(`Too many nested plans (${nestedPlans}). Max: ${RESOURCE_LIMITS.MAX_NESTED_PLANS}`);
      result.isValid = false;
    }
  }

  /**
   * Sanitize plan for security
   */
  private sanitizePlan(executionPlan: any, result: SafetyValidationResult): void {
    const steps = executionPlan.execution_plan || [];
    const removedSteps: string[] = [];
    const modifiedParams: Array<{ step: string; param: string; reason: string }> = [];

    const sanitizedSteps = steps.filter((step: any, index: number) => {
      // Remove dangerous operations
      if (DANGEROUS_OPERATIONS.includes(step.tool)) {
        removedSteps.push(`Step ${index}: ${step.tool} (dangerous operation)`);
        return false;
      }

      // Sanitize parameters
      if (step.params) {
        const sanitizedParams = { ...step.params };
        
        // Remove suspicious parameters
        Object.keys(sanitizedParams).forEach(param => {
          const paramValue = sanitizedParams[param];
          const paramStr = String(paramValue).toLowerCase();
          
          // Remove script parameters
          if (paramStr.includes('<script') || paramStr.includes('javascript:')) {
            delete sanitizedParams[param];
            modifiedParams.push({
              step: `Step ${index}`,
              param,
              reason: "Potential script injection"
            });
          }
          
          // Remove system command parameters
          if (paramStr.includes('rm ') || paramStr.includes('del ') || paramStr.includes('&&')) {
            delete sanitizedParams[param];
            modifiedParams.push({
              step: `Step ${index}`,
              param,
              reason: "Potential command injection"
            });
          }
          
          // Sanitize file paths
          if (typeof paramValue === 'string' && (paramValue.includes('../') || paramValue.includes('..\\'))) {
            sanitizedParams[param] = paramValue.replace(/\.\.\/|\.\\.\\/g, '');
            modifiedParams.push({
              step: `Step ${index}`,
              param,
              reason: "Path traversal sanitized"
            });
          }
        });
        
        step.params = sanitizedParams;
      }

      return true;
    });

    executionPlan.execution_plan = sanitizedSteps;

    result.sanitizationResult = {
      sanitized: removedSteps.length > 0 || modifiedParams.length > 0,
      removedSteps,
      modifiedParams,
    };

    if (removedSteps.length > 0) {
      result.warnings.push(`${removedSteps.length} dangerous steps removed during sanitization`);
    }

    if (modifiedParams.length > 0) {
      result.warnings.push(`${modifiedParams.length} parameters modified during sanitization`);
    }
  }

  /**
   * Calculate overall safety score
   */
  private calculateSafetyScore(result: SafetyValidationResult): void {
    let confidence = 1.0;

    // Reduce confidence based on errors
    confidence -= result.criticalErrors.length * 0.4;
    confidence -= result.errors.length * 0.2;
    confidence -= result.warnings.length * 0.05;

    // Reduce confidence based on resource usage
    if (result.resourceValidation.timeoutRisk) {
      confidence -= 0.1;
    }

    // Reduce confidence based on sanitization
    if (result.sanitizationResult.sanitized) {
      confidence -= 0.1;
    }

    // Determine safety level
    if (result.criticalErrors.length > 0) {
      result.safetyLevel = "unsafe";
    } else if (result.errors.length > 0 || result.resourceValidation.timeoutRisk) {
      result.safetyLevel = "caution";
    } else {
      result.safetyLevel = "safe";
    }

    result.confidence = Math.max(0.0, Math.min(1.0, confidence));

    // Generate recommendations
    this.generateRecommendations(result);
  }

  /**
   * Generate safety recommendations
   */
  private generateRecommendations(result: SafetyValidationResult): void {
    const recommendations: string[] = [];

    if (result.loopDetection.hasLoops) {
      recommendations.push("Remove circular dependencies in execution plan");
    }

    if (result.resourceValidation.timeoutRisk) {
      recommendations.push("Consider breaking down long-running operations");
    }

    if (result.resourceValidation.memoryUsage > 200) {
      recommendations.push("Optimize memory usage by reducing result set sizes");
    }

    if (result.stateValidation.missingStates.length > 0) {
      recommendations.push("Ensure all required state is available before plan execution");
    }

    if (result.sanitizationResult.sanitized) {
      recommendations.push("Review plan parameters for security compliance");
    }

    if (result.warnings.length > 3) {
      recommendations.push("Consider simplifying the execution plan to reduce warnings");
    }

    result.recommendations = recommendations;
  }
}

// Export singleton instance
export const executionPlanSafetyValidator = new ExecutionPlanSafetyValidator();
