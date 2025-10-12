import { z } from "zod";

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
});

// Multi-strategy plan schema
export const MultiStrategyPlanSchema = z.object({
  strategies: z.array(PlanSchema),
  weights: z.array(z.number()),
  mergeStrategy: z.enum(["weighted", "best", "diverse"]),
  description: z.string().optional(),
});

export type Plan = z.infer<typeof PlanSchema>;
export type MultiStrategyPlan = z.infer<typeof MultiStrategyPlanSchema>;
export type Function = z.infer<typeof FunctionSchema>;