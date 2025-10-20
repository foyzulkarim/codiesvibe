import { z } from "zod";

// Plan reasoning schema
export const PlanReasoningSchema = z.object({
  stage: z.string(),
  decision: z.string(),
  confidence: z.number(),
  supportingEvidence: z.array(z.string())
});

// Plan context schema
export const PlanContextSchema = z.object({
  complexity: z.enum(["simple", "moderate", "complex"]),
  confidenceLevel: z.number(),
  entityStatsAvailable: z.boolean(),
  metadataConfidence: z.number(),
  suggestedStrategies: z.array(z.string())
});

// Function definition schema
export const FunctionSchema = z.object({
  name: z.string(),
  parameters: z.record(z.any()).optional(),
  inputFromStep: z.number().optional(),
});

// Execution plan schema
export const PlanSchema = z.object({
  steps: z.array(FunctionSchema),
  description: z.string().optional(),
  mergeStrategy: z.enum(["weighted", "best", "diverse"]).optional(),
  reasoning: z.array(PlanReasoningSchema).optional(),
  context: PlanContextSchema.optional(),
  strategy: z.string().optional(),
  adaptive: z.boolean().optional(),
  validationPassed: z.boolean().optional()
});

// Multi-strategy plan schema
export const MultiStrategyPlanSchema = z.object({
  strategies: z.array(PlanSchema),
  weights: z.array(z.number()),
  mergeStrategy: z.enum(["weighted", "best", "diverse"]),
  description: z.string().optional(),
  reasoning: z.array(PlanReasoningSchema).optional(),
  context: PlanContextSchema.optional(),
  strategy: z.string().optional(),
  adaptive: z.boolean().optional(),
  validationPassed: z.boolean().optional()
});

export type Plan = z.infer<typeof PlanSchema>;
export type MultiStrategyPlan = z.infer<typeof MultiStrategyPlanSchema>;
export type Function = z.infer<typeof FunctionSchema>;
export type PlanReasoning = z.infer<typeof PlanReasoningSchema>;
export type PlanContext = z.infer<typeof PlanContextSchema>;
