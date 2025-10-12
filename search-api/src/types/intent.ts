import { z } from "zod";

// Enums for various tool attributes
export const CategoryEnum = z.enum([
  "development", "design", "productivity", "communication",
  "marketing", "analytics", "security", "infrastructure", "other"
]).transform((val) => {
  // Handle case-insensitive matching
  const lowerVal = val.toLowerCase();
  switch (lowerVal) {
    case 'development': return 'development';
    case 'design': return 'design';
    case 'productivity': return 'productivity';
    case 'communication': return 'communication';
    case 'marketing': return 'marketing';
    case 'analytics': return 'analytics';
    case 'security': return 'security';
    case 'infrastructure': return 'infrastructure';
    case 'other': return 'other';
    default: return val; // Return original if no match
  }
});

export const FunctionalityEnum = z.enum([
  "code-editing", "version-control", "testing", "deployment",
  "ui-design", "wireframing", "collaboration", "automation",
  "monitoring", "documentation", "other"
]).transform((val) => {
  // Handle case-insensitive matching
  const lowerVal = val.toLowerCase();
  switch (lowerVal) {
    case 'code-editing': return 'code-editing';
    case 'version-control': return 'version-control';
    case 'testing': return 'testing';
    case 'deployment': return 'deployment';
    case 'ui-design': return 'ui-design';
    case 'wireframing': return 'wireframing';
    case 'collaboration': return 'collaboration';
    case 'automation': return 'automation';
    case 'monitoring': return 'monitoring';
    case 'documentation': return 'documentation';
    case 'other': return 'other';
    default: return val; // Return original if no match
  }
});

export const UserTypeEnum = z.enum([
  "developer", "designer", "product-manager", "marketer",
  "analyst", "administrator", "other"
]).transform((val) => {
  // Handle case-insensitive matching
  const lowerVal = val.toLowerCase();
  switch (lowerVal) {
    case 'developer': return 'developer';
    case 'designer': return 'designer';
    case 'product-manager': return 'product-manager';
    case 'marketer': return 'marketer';
    case 'analyst': return 'analyst';
    case 'administrator': return 'administrator';
    case 'other': return 'other';
    default: return val; // Return original if no match
  }
});

export const InterfaceEnum = z.enum([
  "Web", "Desktop", "Mobile", "CLI", "API", "IDE", "IDE Extension", "other"
]).transform((val) => {
  // Handle case-insensitive matching
  const lowerVal = val.toLowerCase();
  switch (lowerVal) {
    case 'web': return 'Web';
    case 'desktop': return 'Desktop';
    case 'mobile': return 'Mobile';
    case 'cli': return 'CLI';
    case 'api': return 'API';
    case 'ide': return 'IDE';
    case 'ide extension': return 'IDE Extension';
    case 'other': return 'other';
    default: return val; // Return original if no match
  }
});

export const DeploymentEnum = z.enum([
  "Cloud", "Self-Hosted", "Local", "Hybrid", "other"
]).transform((val) => {
  // Handle case-insensitive matching
  const lowerVal = val.toLowerCase();
  switch (lowerVal) {
    case 'cloud': return 'Cloud';
    case 'self-hosted': return 'Self-Hosted';
    case 'local': return 'Local';
    case 'hybrid': return 'Hybrid';
    case 'other': return 'other';
    default: return val; // Return original if no match
  }
});

export const PricingModelEnum = z.enum([
  "free", "free-tier", "freemium", "subscription", "one-time", "other"
]).transform((val) => {
  // Handle case-insensitive matching
  const lowerVal = val.toLowerCase();
  switch (lowerVal) {
    case 'free': return 'free';
    case 'freemium': return 'freemium';
    case 'subscription': return 'subscription';
    case 'one-time': return 'one-time';
    case 'other': return 'other';
    default: return val; // Return original if no match
  }
});

// Intent Schema
export const IntentSchema = z.object({
  // Tool names
  toolNames: z.array(z.string()).default([]),

  // Price constraints
  priceConstraints: z.object({
    hasFreeTier: z.boolean().optional(),
    maxPrice: z.number().optional(),
    minPrice: z.number().optional(),
    pricingModel: PricingModelEnum.optional(),
  }).optional().nullable(),

  // Categories
  categories: z.array(CategoryEnum).default([]),
  functionality: z.array(FunctionalityEnum).default([]),
  userTypes: z.array(UserTypeEnum).default([]),
  interface: z.array(InterfaceEnum).default([]),
  deployment: z.array(DeploymentEnum).default([]),

  // Comparative intent
  isComparative: z.boolean().default(false),
  referenceTool: z.string().optional().nullable(),

  // Semantic components
  semanticQuery: z.string().optional().nullable(),
  keywords: z.array(z.string()).default([]),

  // Exclusions
  excludeTools: z.array(z.string()).default([]),
});

export type Intent = z.infer<typeof IntentSchema>;