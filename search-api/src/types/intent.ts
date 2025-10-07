import { z } from "zod";

// Enums for various tool attributes
export const CategoryEnum = z.enum([
  "development", "design", "productivity", "communication",
  "marketing", "analytics", "security", "infrastructure", "other"
]);

export const FunctionalityEnum = z.enum([
  "code-editing", "version-control", "testing", "deployment",
  "ui-design", "wireframing", "collaboration", "automation",
  "monitoring", "documentation", "other"
]);

export const UserTypeEnum = z.enum([
  "developer", "designer", "product-manager", "marketer",
  "analyst", "administrator", "other"
]);

export const InterfaceEnum = z.enum([
  "web", "desktop", "mobile", "cli", "api", "other"
]);

export const DeploymentEnum = z.enum([
  "cloud", "self-hosted", "hybrid", "other"
]);

export const PricingModelEnum = z.enum([
  "free", "freemium", "subscription", "one-time", "other"
]);

// Intent Schema
export const IntentSchema = z.object({
  // Tool identification
  toolNames: z.array(z.string()).default([]),

  // Constraints
  priceConstraints: z.object({
    hasFreeTier: z.boolean().optional(),
    maxPrice: z.number().optional(),
    minPrice: z.number().optional(),
    pricingModel: PricingModelEnum.optional(),
  }).optional(),

  // Categories
  categories: z.array(CategoryEnum).default([]),
  functionality: z.array(FunctionalityEnum).default([]),
  userTypes: z.array(UserTypeEnum).default([]),
  interface: z.array(InterfaceEnum).default([]),
  deployment: z.array(DeploymentEnum).default([]),

  // Comparative intent
  isComparative: z.boolean().default(false),
  referenceTool: z.string().optional(),

  // Semantic components
  semanticQuery: z.string().optional(),
  keywords: z.array(z.string()).default([]),

  // Exclusions
  excludeTools: z.array(z.string()).default([]),
});

export type Intent = z.infer<typeof IntentSchema>;