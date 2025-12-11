import { z } from "zod";
import { toolsSchema, TOOLS_PRICE_OPERATORS } from "#domains/tools/index.js";

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
      TOOLS_PRICE_OPERATORS.LESS_THAN,
      TOOLS_PRICE_OPERATORS.GREATER_THAN,
      TOOLS_PRICE_OPERATORS.EQUAL,
      TOOLS_PRICE_OPERATORS.NOT_EQUAL,
      TOOLS_PRICE_OPERATORS.AROUND,
      TOOLS_PRICE_OPERATORS.BETWEEN
    ]).describe("Price comparison operator"),
    value: z.number().describe("Reference price value"),
    billingPeriod: z.enum([toolsSchema.vocabularies.billingPeriods[0], toolsSchema.vocabularies.billingPeriods[1]]).nullable().optional().describe("Billing period context")
  }).nullable().optional().describe(
    "Price comparison constraint (e.g., 'under $50', 'around $20/month')"
  ),

  category: z.enum(toolsSchema.vocabularies.categories as [string, ...string[]]).nullable().optional().describe(
    "Tool type category mentioned or implied"
  ),

  interface: z.enum(toolsSchema.vocabularies.interface as [string, ...string[]]).nullable().optional().describe(
    "Platform or interface preference"
  ),

  functionality: z.enum(toolsSchema.vocabularies.functionality as [string, ...string[]]).describe(
    "Specific features or capabilities required or desired"
  ),

  deployment: z.enum(toolsSchema.vocabularies.deployment as [string, ...string[]]).describe(
    "Deployment preferences or requirements"
  ),

  industry: z.enum(toolsSchema.vocabularies.industries as [string, ...string[]]).describe(
    "Industry sectors or domains of interest"
  ),

  userType: z.enum(toolsSchema.vocabularies.userTypes as [string, ...string[]]).describe(
    "Target user groups or roles"
  ),

  pricing: z.enum(toolsSchema.vocabularies.pricingModels as [string, ...string[]]).nullable().optional().describe(
    "Primary pricing filter if explicitly mentioned"
  ),


  confidence: z.number().min(0).max(1).describe(
    "Model-estimated confidence in this structured intent"
  )
}).describe("Structured intent representation for AI tools search");

export type IntentState = z.infer<typeof IntentStateSchema>;
