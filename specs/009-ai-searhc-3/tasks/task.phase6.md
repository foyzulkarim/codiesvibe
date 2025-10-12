# Phase 6: Execution Nodes - Detailed Implementation Tasks

## Task 6.1: Single Plan Executor

### Implementation Details:

**nodes/execution/single-plan-executor.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { Plan, Function } from "@/types/plan";
import { functionRegistry } from "@/nodes/functions";

/**
 * Execute a single plan step-by-step, managing dependencies between steps
 */
export async function singlePlanExecutorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { plan } = state;
  
  if (!plan || ("strategies" in plan)) {
    return {
      queryResults: [],
      metadata: {
        ...state.metadata,
        executionError: "No valid single plan provided for execution"
      }
    };
  }
  
  try {
    const singlePlan = plan as Plan;
    const executionResults: any[] = [];
    let currentResults: any[] = [];
    
    // Execute each step in sequence
    for (let i = 0; i < singlePlan.steps.length; i++) {
      const step = singlePlan.steps[i];
      const startTime = Date.now();
      
      // Get the function to execute
      const executor = functionRegistry[step.name as keyof typeof functionRegistry];
      if (!executor) {
        throw new Error(`Unknown function: ${step.name}`);
      }
      
      // Prepare input data if step references previous results
      let stepParams = { ...step.parameters };
      if (step.inputFromStep !== undefined && step.inputFromStep >= 0 && step.inputFromStep < executionResults.length) {
        stepParams.input = executionResults[step.inputFromStep];
      }
      
      // Execute the function
      const stepResult = await executor(stepParams);
      executionResults.push(stepResult);
      
      // Update current results for the next step
      if (stepResult.results && Array.isArray(stepResult.results)) {
        currentResults = stepResult.results;
      } else if (Array.isArray(stepResult)) {
        currentResults = stepResult;
      }
      
      // Log execution time
      const executionTime = Date.now() - startTime;
      console.log(`Step ${i + 1} (${step.name}) completed in ${executionTime}ms`);
      
      // Update metadata with execution time
      state.metadata.nodeExecutionTimes[`${step.name}_${i}`] = executionTime;
    }
    
    return {
      executionResults,
      queryResults: currentResults,
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata.executionPath || []), "single-plan-executor"],
        lastExecutionPlan: singlePlan.description,
        stepsExecuted: singlePlan.steps.length
      }
    };
  } catch (error) {
    console.error("Error in singlePlanExecutorNode:", error);
    
    // Add error to errors array
    const newError = {
      node: "single-plan-executor",
      error: error instanceof Error ? error : new Error(String(error)),
      timestamp: new Date()
    };
    
    return {
      queryResults: [],
      metadata: {
        ...state.metadata,
        executionError: error instanceof Error ? error.message : String(error),
        executionPath: [...(state.metadata.executionPath || []), "single-plan-executor"]
      },
      errors: [...(state.errors || []), newError]
    };
  }
}
```

## Task 6.2: Multi-Strategy Executor

### Implementation Details:

**nodes/execution/multi-strategy-executor.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { MultiStrategyPlan, Plan } from "@/types/plan";
import { functionRegistry } from "@/nodes/functions";

/**
 * Execute multiple strategy plans in parallel
 */
export async function multiStrategyExecutorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { plan } = state;
  
  if (!plan || !("strategies" in plan)) {
    return {
      queryResults: [],
      metadata: {
        ...state.metadata,
        executionError: "No valid multi-strategy plan provided for execution"
      }
    };
  }
  
  try {
    const multiStrategyPlan = plan as MultiStrategyPlan;
    const strategyPromises: Promise<any>[] = [];
    
    // Execute all strategies in parallel
    multiStrategyPlan.strategies.forEach((strategy, index) => {
      const strategyPromise = executeSingleStrategy(strategy, index, state);
      strategyPromises.push(strategyPromise);
    });
    
    // Wait for all strategies to complete
    const strategyResults = await Promise.all(strategyPromises);
    
    // Organize results by strategy
    const executionResults = strategyResults.map((result, index) => ({
      strategyIndex: index,
      strategy: multiStrategyPlan.strategies[index],
      results: results,
      executionTime: result.executionTime,
      success: result.success,
      error: result.error
    }));
    
    return {
      executionResults,
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata.executionPath || []), "multi-strategy-executor"],
        strategiesExecuted: multiStrategyPlan.strategies.length,
        strategiesSuccessful: executionResults.filter(r => r.success).length,
        multiStrategyWeights: multiStrategyPlan.weights,
        mergeStrategy: multiStrategyPlan.mergeStrategy
      }
    };
  } catch (error) {
    console.error("Error in multiStrategyExecutorNode:", error);
    
    const newError = {
      node: "multi-strategy-executor",
      error: error instanceof Error ? error : new Error(String(error)),
      timestamp: new Date()
    };
    
    return {
      queryResults: [],
      metadata: {
        ...state.metadata,
        executionError: error instanceof Error ? error.message : String(error),
        executionPath: [...(state.metadata.executionPath || []), "multi-strategy-executor"]
      },
      errors: [...(state.errors || []), newError]
    };
  }
}

/**
 * Execute a single strategy and return results with timing
 */
async function executeSingleStrategy(strategy: Plan, strategyIndex: number, state: any): Promise<any> {
  const startTime = Date.now();
  
  try {
    const executionResults: any[] = [];
    let currentResults: any[] = [];
    
    // Execute each step in the strategy
    for (let i = 0; i < strategy.steps.length; i++) {
      const step = strategy.steps[i];
      
      // Get the function to execute
      const executor = functionRegistry[step.name as keyof typeof functionRegistry];
      if (!executor) {
        throw new Error(`Unknown function: ${step.name}`);
      }
      
      // Prepare input data if step references previous results
      let stepParams = { ...step.parameters };
      if (step.inputFromStep !== undefined && step.inputFromStep >= 0 && step.inputFromStep < executionResults.length) {
        stepParams.input = executionResults[step.inputFromStep];
      }
      
      // Execute the function
      const stepResult = await executor(stepParams);
      executionResults.push(stepResult);
      
      // Update current results
      if (stepResult.results && Array.isArray(stepResult.results)) {
        currentResults = stepResult.results;
      } else if (Array.isArray(stepResult)) {
        currentResults = stepResult;
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      results: currentResults,
      executionResults,
      executionTime,
      success: true,
      error: null
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    return {
      results: [],
      executionResults: [],
      executionTime,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
```

## Task 6.3: Result Merger

### Implementation Details:

**nodes/execution/result-merger.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";

/**
 * Merge results from multiple strategies using different merging strategies
 */
export async function resultMergerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { executionResults, plan } = state;
  
  if (!executionResults || executionResults.length === 0) {
    return {
      queryResults: [],
      metadata: {
        ...state.metadata,
        mergeError: "No execution results to merge"
      }
    };
  }
  
  // Check if this is multi-strategy execution
  const isMultiStrategy = plan && "strategies" in plan;
  
  if (!isMultiStrategy) {
    // For single strategy execution, just return the results
    const lastResult = executionResults[executionResults.length - 1];
    const results = lastResult.results || [];
    
    return {
      queryResults: results,
      metadata: {
        ...state.metadata,
        mergeStrategy: "single-strategy",
        resultsCount: results.length
      }
    };
  }
  
  try {
    const multiStrategyPlan = plan as any; // MultiStrategyPlan
    const mergeStrategy = multiStrategyPlan.mergeStrategy || "weighted";
    const weights = multiStrategyPlan.weights || [];
    
    let mergedResults: any[] = [];
    
    switch (mergeStrategy) {
      case "weighted":
        mergedResults = mergeWithWeighted(executionResults, weights);
        break;
      case "best":
        mergedResults = mergeWithBest(executionResults, weights);
        break;
      case "diverse":
        mergedResults = mergeWithDiverse(executionResults);
        break;
      default:
        mergedResults = mergeWithWeighted(executionResults, weights);
    }
    
    return {
      queryResults: mergedResults,
      metadata: {
        ...state.metadata,
        mergeStrategy,
        resultsBeforeMerge: executionResults.reduce((sum, result) => sum + (result.results?.length || 0), 0),
        resultsAfterMerge: mergedResults.length,
        strategiesMerged: executionResults.length
      }
    };
  } catch (error) {
    console.error("Error in resultMergerNode:", error);
    
    // Fallback: just concatenate all results
    const allResults = executionResults.flatMap(result => result.results || []);
    
    return {
      queryResults: allResults,
      metadata: {
        ...state.metadata,
        mergeStrategy: "fallback-concat",
        mergeError: error instanceof Error ? error.message : String(error),
        resultsCount: allResults.length
      }
    };
  }
}

/**
 * Weighted merging: combine results with weights applied to relevance scores
 */
function mergeWithWeighted(executionResults: any[], weights: number[]): any[] {
  const toolScores = new Map<string, { tool: any; totalScore: number; count: number }>();
  
  executionResults.forEach((result, index) => {
    const weight = weights[index] || (1 / executionResults.length);
    const results = result.results || [];
    
    results.forEach((tool: any) => {
      const toolId = tool._id?.toString() || tool.name;
      const relevanceScore = tool.relevanceScore || 0.5;
      const weightedScore = relevanceScore * weight;
      
      if (toolScores.has(toolId)) {
        const existing = toolScores.get(toolId)!;
        existing.totalScore += weightedScore;
        existing.count += 1;
        
        // Update tool with better data if available
        if (relevanceScore > existing.tool.relevanceScore) {
          existing.tool = { ...existing.tool, ...tool };
        }
      } else {
        toolScores.set(toolId, {
          tool: { ...tool, relevanceScore: weightedScore },
          totalScore: weightedScore,
          count: 1
        });
      }
    });
  });
  
  // Convert back to array and sort by average weighted score
  return Array.from(toolScores.values())
    .map(({ tool, totalScore, count }) => ({
      ...tool,
      relevanceScore: totalScore / count,
      mergeSources: count
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Best merging: take the best results from each strategy
 */
function mergeWithBest(executionResults: any[], weights: number[]): any[] {
  const allResults: any[] = [];
  
  executionResults.forEach((result, index) => {
    const weight = weights[index] || (1 / executionResults.length);
    const results = result.results || [];
    
    results.forEach((tool: any) => ({
      ...tool,
      relevanceScore: (tool.relevanceScore || 0.5) * weight,
      sourceStrategy: index
    }));
    
    allResults.push(...results);
  });
  
  // Deduplicate and sort by relevance
  const uniqueTools = new Map<string, any>();
  
  allResults.forEach(tool => {
    const toolId = tool._id?.toString() || tool.name;
    if (!uniqueTools.has(toolId) || tool.relevanceScore > uniqueTools.get(toolId).relevanceScore) {
      uniqueTools.set(toolId, tool);
    }
  });
  
  return Array.from(uniqueTools.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Diverse merging: ensure diversity in categories and functionality
 */
function mergeWithDiverse(executionResults: any[]): any[] {
  const allResults: any[] = [];
  
  // Collect all results
  executionResults.forEach(result => {
    allResults.push(...(result.results || []));
  });
  
  // Sort by relevance score
  allResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  
  // Select diverse results
  const selected: any[] = [];
  const categories = new Set<string>();
  const functionality = new Set<string>();
  
  allResults.forEach(tool => {
    const toolCategory = tool.category || 'other';
    const toolFunctionality = tool.functionality?.[0] || 'other';
    
    // Add tool if it adds diversity or we don't have many results yet
    if (selected.length < 5 || 
        !categories.has(toolCategory) || 
        !functionality.has(toolFunctionality)) {
      selected.push(tool);
      categories.add(toolCategory);
      functionality.add(toolFunctionality);
    }
  });
  
  return selected;
}
```

## Task 6.4: Completion

### Implementation Details:

**nodes/execution/completion.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";

/**
 * Format final results and add explanations about the search strategy used
 */
export async function completionNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { queryResults, metadata, routingDecision, plan, qualityAssessment } = state;
  
  try {
    const endTime = new Date();
    const executionTime = metadata.startTime ? endTime.getTime() - metadata.startTime.getTime() : 0;
    
    // Format results for user consumption
    const formattedResults = queryResults?.map(tool => ({
      id: tool._id?.toString() || tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      categories: tool.categories,
      functionality: tool.functionality,
      userTypes: tool.userTypes,
      interface: tool.interface,
      deployment: tool.deployment,
      pricing: tool.pricing,
      relevanceScore: tool.relevanceScore,
      website: tool.website,
      github: tool.github,
      tags: tool.tags,
      mergeSources: tool.mergeSources,
      sourceStrategy: tool.sourceStrategy
    })) || [];
    
    // Generate explanation about the search strategy
    let explanation = "";
    let strategy = "";
    
    if (routingDecision === "optimal") {
      strategy = "Optimal Search";
      explanation = `I used an optimal search strategy based on high confidence in understanding your query. `;
    } else if (routingDecision === "multi-strategy") {
      strategy = "Multi-Strategy Search";
      explanation = `I used multiple search approaches to find the best results. `;
      if (metadata.strategiesSuccessful !== undefined) {
        explanation += `${metadata.strategiesSuccessful} strategies were successfully executed. `;
      }
    } else {
      strategy = "Broad Search";
      explanation = `I used a broad search approach to find relevant tools. `;
    }
    
    // Add details about the execution plan
    if (plan?.description) {
      explanation += `Execution plan: ${plan.description}. `;
    }
    
    // Add quality assessment information
    if (qualityAssessment) {
      if (qualityAssessment.decision === "refine") {
        explanation += `Results were refined to improve quality. `;
      } else if (qualityAssessment.decision === "expand") {
        explanation += `Search was expanded to find more results. `;
      }
      
      explanation += `Found ${qualityAssessment.resultCount} results with average relevance of ${(qualityAssessment.averageRelevance * 100).toFixed(1)}%. `;
    }
    
    // Add suggested refinements if available
    if (state.suggestedRefinements && state.suggestedRefinements.length > 0) {
      explanation += `For better results, consider: ${state.suggestedRefinements.join(", ")}.`;
    }
    
    // Create completion response
    const completion = {
      query: state.query,
      strategy,
      results: formattedResults,
      explanation: explanation.trim(),
      metadata: {
        executionTime: `${executionTime}ms`,
        resultsCount: formattedResults.length,
        confidence: state.confidence?.overall || 0,
        routingDecision,
        qualityMetrics: qualityAssessment ? {
          resultCount: qualityAssessment.resultCount,
          averageRelevance: qualityAssessment.averageRelevance,
          categoryDiversity: qualityAssessment.categoryDiversity,
          decision: qualityAssessment.decision
        } : undefined,
        executionPath: metadata.executionPath || [],
        nodeExecutionTimes: metadata.nodeExecutionTimes || {}
      }
    };
    
    return {
      completion,
      metadata: {
        ...metadata,
        endTime,
        totalExecutionTime: executionTime,
        finalResultsCount: formattedResults.length,
        completionGenerated: true
      }
    };
  } catch (error) {
    console.error("Error in completionNode:", error);
    
    // Fallback completion
    const fallbackCompletion = {
      query: state.query || "",
      strategy: "Error Recovery",
      results: [],
      explanation: "An error occurred during search completion. Please try again.",
      metadata: {
        executionTime: "0ms",
        resultsCount: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    };
    
    return {
      completion: fallbackCompletion,
      metadata: {
        ...state.metadata,
        endTime: new Date(),
        completionError: error instanceof Error ? error.message : String(error)
      }
    };
  }
}
```

**nodes/execution/index.ts**
```typescript
// Export all execution nodes for easy importing
export { singlePlanExecutorNode } from "./single-plan-executor.node";
export { multiStrategyExecutorNode } from "./multi-strategy-executor.node";
export { resultMergerNode } from "./result-merger.node";
export { completionNode } from "./completion.node";
```

---

## Phase 6 Summary

**Total: 4 tasks, 5 files**

**Key Features Implemented:**

1. **Single Plan Executor**: 
   - Step-by-step execution with dependency management
   - Error handling and timing tracking
   - Result propagation between steps

2. **Multi-Strategy Executor**:
   - Parallel execution of multiple strategies
   - Individual strategy success/failure tracking
   - Comprehensive execution metadata

3. **Result Merger**:
   - Weighted merging with relevance score combination
   - Best result selection from strategies
   - Diverse merging for category/functionality variety
   - Fallback concatenation for error recovery

4. **Completion**:
   - User-friendly result formatting
   - Search strategy explanations
   - Comprehensive execution metadata
   - Error recovery with fallback responses

**Estimated complexity:** 2-3 days for complete implementation

These execution nodes provide the core runtime engine for the LangGraph search system, handling both simple and complex execution patterns with robust error handling and detailed tracking.