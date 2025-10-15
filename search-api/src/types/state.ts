import { Annotation, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { Intent, IntentSchema } from "./intent";
import { Plan, PlanSchema } from "./plan";
import { EntityStatisticsSchema, MetadataContextSchema } from "./enhanced-state";

// State Schema using LangGraph's Annotation
export const StateAnnotation = Annotation.Root({
  // Input
  query: Annotation<string>,

  // Preprocessing
  preprocessedQuery: Annotation<string>,

  // Intent Extraction
  intent: Annotation<Intent>,
  confidence: Annotation<{
    overall: number;
    breakdown: Record<string, number>;
  }>,
  extractionSignals: Annotation<{
    nerResults: any[];
    fuzzyMatches: any[];
    semanticCandidates: Record<string, any[]>;
    classificationScores: Record<string, any[]>;
    combinedScores: Record<string, any[]>;
    resolvedToolNames: string[];
    comparativeFlag: boolean;
    comparativeConfidence: number;
    referenceTool: string | null;
    priceConstraints: any;
    interfacePreferences: string[];
    deploymentPreferences: string[];
  }>,

  // Routing
  routingDecision: Annotation<"optimal" | "multi-strategy" | "fallback">,

  // Planning
  plan: Annotation<Plan>,

  // Execution
  executionResults: Annotation<any[]>,
  queryResults: Annotation<any[]>,

  // Final Results
  completion: Annotation<{
    query: string;
    strategy: string;
    results: any[];
    explanation: string;
    metadata: {
      executionTime: string;
      resultsCount: number;
      error?: string;
    };
  }>,

  // Quality Assessment
  qualityAssessment: Annotation<{
    resultCount: number;
    averageRelevance: number;
    categoryDiversity: number;
    decision: "accept" | "refine" | "expand";
  }>,

  // Iteration Control
  iterations: Annotation<{
    refinementAttempts: number;
    expansionAttempts: number;
    maxAttempts: number;
  }>,

  // Error Handling
  errors: Annotation<Array<{
    node: string;
    error: Error;
    timestamp: Date;
  }>>,

  // Metadata
  metadata: Annotation<{
    startTime: Date;
    endTime?: Date;
    executionPath: string[];
    nodeExecutionTimes: Record<string, number>;
    threadId?: string;
    originalQuery?: string;
    recoveryTime?: Date;
    rollbackTime?: Date;
    name: string;
    planReasoning?: any[];
    planContext?: any;
    planningStrategy?: string;
    adaptivePlanning?: boolean;
    strategyWeights?: Array<{ name: string; weight: number }>;
    planValidation?: {
      passed: boolean;
      confidence: number;
      errors: string[];
      warnings: string[];
      reasoning: any[];
    };
    // Dynamic stage skipping metadata
    stageSkippingDecisions?: any;
    complexityAnalysis?: any;
    performanceMetrics?: any;
    qualityValidation?: any;
    // T035: Enhanced safety validation metadata
    safetyValidation?: {
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
      isValid: boolean;
      errors: string[];
      warnings: string[];
      criticalErrors: string[];
    };
  }>,
  
  // Context Enrichment
  entityStatistics: Annotation<Record<string, z.infer<typeof EntityStatisticsSchema>>>,
  metadataContext: Annotation<z.infer<typeof MetadataContextSchema>>
});

export type State = typeof StateAnnotation.State;
