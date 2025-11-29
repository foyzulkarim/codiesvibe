import { Annotation, StateGraph } from "@langchain/langgraph";
import { any, z } from "zod";
import { IntentState, IntentStateSchema } from "./intent-state";
import { QueryPlan, QueryPlanSchema } from "./query-plan";
import { Candidate, QueryExecutorOutput, QueryExecutorOutputSchema } from "./candidate";
import { ToolData } from "./tool.types";
import { DomainSchema } from "../core/types/schema.types";

// New Simplified State Schema using LangGraph's Annotation
export const StateAnnotation = Annotation.Root({
  // Core query information
  query: Annotation<string>,

  // Schema-driven configuration (NEW)
  schema: Annotation<DomainSchema>,

  // Domain-specific handlers (NEW)
  domainHandlers: Annotation<{
    buildFilters: (intentState: IntentState) => any[];
    validateQueryPlan: (plan: QueryPlan, intentState: IntentState) => {
      valid: boolean;
      errors: string[];
      warnings: string[];
    };
  }>,

  // New pipeline stages
  intentState: Annotation<IntentState | null>,
  executionPlan: Annotation<QueryPlan | null>,
  candidates: Annotation<Candidate[]>,
  results: Annotation<ToolData[]>,

  // Execution statistics and tracking
  executionStats: Annotation<{
    totalTimeMs: number;
    nodeTimings: Record<string, number>;
    vectorQueriesExecuted: number;
    structuredQueriesExecuted: number;
    fusionMethod?: string;
    cacheHit?: boolean;
    cacheSimilarity?: number;
    originalExecutionTime?: number;
    timeSaved?: number;
  }>,

  // Error handling and recovery
  errors: Annotation<Array<{
    node: string;
    error: Error;
    timestamp: Date;
    recovered: boolean;
    recoveryStrategy?: string;
  }>>,

  // Simplified metadata for observability
  metadata: Annotation<{
    vectorFiltersAndQueries?: { filters: any; query: string; candidatesLength: number }[];
    structuredFiltersAndQueries?: { filters: any; query: string; candidatesLength: number }[];
    startTime: Date;
    endTime?: Date;
    executionPath: string[];
    nodeExecutionTimes: Record<string, number>;
    threadId?: string;
    originalQuery?: string;
    totalNodesExecuted: number;
    pipelineVersion: string;
    // Cache-related metadata
    cacheHit?: boolean;
    cacheType?: 'exact' | 'similar' | 'miss' | 'error';
    cacheSimilarity?: number;
    cachedAt?: Date;
    planId?: string;
    usageCount?: number;
    cacheStored?: boolean;
    cacheStorageTime?: number;
    cacheStorageError?: string;
    cacheError?: string;
    skipToExecutor?: boolean;
    costSavings?: {
      llmCallsAvoided: number;
      estimatedCostSaved: number;
      timeSavedPercent: string;
    };
  }>
});

export type State = typeof StateAnnotation.State;
