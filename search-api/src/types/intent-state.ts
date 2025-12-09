import { z } from "zod";
import { CONTROLLED_VOCABULARIES, OPERATORS } from "#shared/constants/controlled-vocabularies";

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

  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(["=", "<", ">", "<=", ">=", "contains", "in"]),
    value: z.any()
  })).default([]).describe(
    "Structured filters derived from constraints or attributes"
  ),

  priceRange: z.object({
    min: z.number().nullable().optional().describe("Minimum price threshold"),
    max: z.number().nullable().optional().describe("Maximum price threshold"),
    billingPeriod: z.enum(["Monthly", "Yearly", "One-time", "Per-use"]).nullable().optional().describe("Billing period for price comparison")
  }).nullable().optional().describe(
    "Specific price range or threshold mentioned in query"
  ),

  priceComparison: z.object({
    operator: z.enum([
      OPERATORS.LESS_THAN,
      OPERATORS.GREATER_THAN,
      OPERATORS.EQUAL,
      OPERATORS.NOT_EQUAL,
      OPERATORS.AROUND,
      OPERATORS.BETWEEN
    ]).describe("Price comparison operator"),
    value: z.number().describe("Reference price value"),
    billingPeriod: z.enum([CONTROLLED_VOCABULARIES.billingPeriods[0], CONTROLLED_VOCABULARIES.billingPeriods[1]]).nullable().optional().describe("Billing period context")
  }).nullable().optional().describe(
    "Price comparison constraint (e.g., 'under $50', 'around $20/month')"
  ),

  category: z.enum(CONTROLLED_VOCABULARIES.categories as [string, ...string[]]).nullable().optional().describe(
    "Tool type category mentioned or implied"
  ),

  interface: z.enum(CONTROLLED_VOCABULARIES.interface as [string, ...string[]]).nullable().optional().describe(
    "Platform or interface preference"
  ),

  functionality: z.enum(CONTROLLED_VOCABULARIES.functionality as [string, ...string[]]).describe(
    "Specific features or capabilities required or desired"
  ),

  deployment: z.enum(CONTROLLED_VOCABULARIES.deployment as [string, ...string[]]).describe(
    "Deployment preferences or requirements"
  ),

  industry: z.enum(CONTROLLED_VOCABULARIES.industries as [string, ...string[]]).describe(
    "Industry sectors or domains of interest"
  ),

  userType: z.enum(CONTROLLED_VOCABULARIES.userTypes as [string, ...string[]]).describe(
    "Target user groups or roles"
  ),

  pricing: z.enum(CONTROLLED_VOCABULARIES.pricingModels as [string, ...string[]]).nullable().optional().describe(
    "Primary pricing filter if explicitly mentioned"
  ),


  confidence: z.number().min(0).max(1).describe(
    "Model-estimated confidence in this structured intent"
  )
}).describe("Structured intent representation for AI tools search");

export type IntentState = z.infer<typeof IntentStateSchema>;
