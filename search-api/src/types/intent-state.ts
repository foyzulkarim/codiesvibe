import { z } from "zod";

/**
 * Structured representation of a user's search or discovery intent for AI tools and technologies
 */
export const IntentStateSchema = z.object({
  primaryGoal: z.enum([
    "find",
    "compare",
    "recommend",
    "explore",
    "analyze",
    "explain"
  ], {
    description: "High-level intent category representing the user's purpose"
  }),

  referenceTool: z.string().nullable().optional().describe(
    "Canonical tool name or ID used as a comparison or reference (e.g., 'Cursor IDE')"
  ),

  comparisonMode: z.enum([
    "similar_to",
    "vs",
    "alternative_to"
  ]).nullable().optional().describe(
    "Specifies comparative relationship between tools"
  ),

  desiredFeatures: z.array(z.enum([
    "AI code assist",
    "local inference",
    "RAG support",
    "multi-agent orchestration",
    "LLM integration",
    "context awareness",
    "CLI mode",
    "open-source"
  ])).default([]).describe(
    "List of specific feature tags the user cares about"
  ),

  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(["=", "<", ">", "<=", ">=", "contains"]),
    value: z.any()
  })).default([]).describe(
    "Structured filters derived from constraints or attributes"
  ),

  pricing: z.enum([
    "free",
    "freemium",
    "paid",
    "enterprise"
  ]).nullable().optional().describe(
    "Primary pricing filter if explicitly mentioned"
  ),

  priceRange: z.object({
    min: z.number().nullable().optional().describe("Minimum price threshold"),
    max: z.number().nullable().optional().describe("Maximum price threshold"),
    currency: z.string().default("USD").describe("Currency for price values"),
    billingPeriod: z.enum(["Monthly", "Yearly", "One-time", "Per-use"]).nullable().optional().describe("Billing period for price comparison")
  }).nullable().optional().describe(
    "Specific price range or threshold mentioned in query"
  ),

  priceComparison: z.object({
    operator: z.enum(["less_than", "greater_than", "equal_to", "around", "between"]).describe("Price comparison operator"),
    value: z.number().describe("Reference price value"),
    currency: z.string().default("USD").describe("Currency for comparison"),
    billingPeriod: z.enum(["Monthly", "Yearly", "One-time", "Per-use"]).nullable().optional().describe("Billing period context")
  }).nullable().optional().describe(
    "Price comparison constraint (e.g., 'under $50', 'around $20/month')"
  ),

  category: z.enum([
    "IDE",
    "API",
    "CLI",
    "Framework",
    "Agent",
    "Plugin"
  ]).nullable().optional().describe(
    "Tool type category mentioned or implied"
  ),

  platform: z.enum([
    "web",
    "desktop",
    "cli",
    "api"
  ]).nullable().optional().describe(
    "Platform or interface preference"
  ),

  semanticVariants: z.array(z.string()).default([]).describe(
    "List of paraphrased queries or search variants"
  ),

  constraints: z.array(z.string()).default([]).describe(
    "List of qualitative constraints ('cheaper', 'newer', 'simpler')"
  ),

  confidence: z.number().min(0).max(1).describe(
    "Model-estimated confidence in this structured intent"
  )
}).describe("Structured intent representation for AI tools search");

export type IntentState = z.infer<typeof IntentStateSchema>;