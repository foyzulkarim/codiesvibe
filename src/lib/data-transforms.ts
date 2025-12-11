import type { BaseTool } from '@/types';

// Legacy v1.x data structure for transformation
interface LegacyTool {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  pricing: string[];
  interface: string[];
  functionality: string[];
  deployment: string[];
  popularity: number;
  rating: number;
  reviewCount: number;
  lastUpdated: string;
  logoUrl: string;
  features: Record<string, boolean>;
  searchKeywords: string[];
  tags: {
    primary: string[];
    secondary: string[];
  };
}

/**
 * Transforms legacy v1.x tool data to v2.0 BaseTool structure
 */
export function transformLegacyToV2(legacy: LegacyTool): BaseTool {
  return {
    id: legacy.id,
    name: legacy.name,
    slug: legacy.id, // Use id as slug for legacy data
    description: legacy.description,
    longDescription: legacy.longDescription,
    tagline: `${legacy.description.split('.')[0]}.`, // Extract first sentence as tagline

    categories: [
      ...legacy.tags.primary.slice(0, 3), // Limit to 3 for primary
      ...legacy.tags.secondary.slice(0, 5), // Limit to 5 for secondary
    ],
    industries: ["Technology", "Software Development"], // Default industries
    userTypes: ["Developers", "Software Engineers"], // Default user types

    pricing: legacy.pricing.map((tier) => ({
      tier: tier,
      billingPeriod: tier === "Enterprise" ? "custom" : "month",
      price: tier === "Free" || tier === "Open Source" ? 0 :
             tier === "Freemium" ? 0 :
             tier === "Enterprise" ? 0 : 20
    })),

    pricingModel: legacy.pricing.includes("Free") || legacy.pricing.includes("Open Source") ?
      ["Free"] :
      legacy.pricing.includes("Freemium") ?
        ["Paid"] :
        ["Paid"],

    interface: legacy.interface,
    functionality: legacy.functionality,
    deployment: legacy.deployment,

    logoUrl: legacy.logoUrl,
    website: `https://example.com/${legacy.id}`, // Default website
    status: "active",
    contributor: "frontend-mock",
    dateAdded: new Date(legacy.lastUpdated).toISOString(),
    lastUpdated: new Date(legacy.lastUpdated).toISOString(),
    approvalStatus: "approved" // Default approval status for legacy data
  };
}

/**
 * Batch transform multiple legacy tools
 */
export function transformLegacyTools(legacyTools: LegacyTool[]): BaseTool[] {
  return legacyTools.map(transformLegacyToV2);
}