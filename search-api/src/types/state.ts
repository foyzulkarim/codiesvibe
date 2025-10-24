import { Annotation, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { IntentState, IntentStateSchema } from "./intent-state";
import { QueryPlan, QueryPlanSchema } from "./query-plan";
import { Candidate, QueryExecutorOutput, QueryExecutorOutputSchema } from "./candidate";

// New Simplified State Schema using LangGraph's Annotation
export const StateAnnotation = Annotation.Root({
  // Core query information
  query: Annotation<string>,

  // New pipeline stages
  intentState: Annotation<IntentState | null>,
  executionPlan: Annotation<QueryPlan | null>,
  candidates: Annotation<Candidate[]>,

  // Full MongoDB documents corresponding to candidates
  results: Annotation<any[]>,

  // Execution statistics and tracking
  executionStats: Annotation<{
    totalTimeMs: number;
    nodeTimings: Record<string, number>;
    vectorQueriesExecuted: number;
    structuredQueriesExecuted: number;
    fusionMethod?: string;
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
    startTime: Date;
    endTime?: Date;
    executionPath: string[];
    nodeExecutionTimes: Record<string, number>;
    threadId?: string;
    originalQuery?: string;
    totalNodesExecuted: number;
    pipelineVersion: string;
  }>
});

export type State = typeof StateAnnotation.State;
