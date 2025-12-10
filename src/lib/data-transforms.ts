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

    categories: {
      primary: legacy.tags.primary.slice(0, 3), // Limit to 3 for primary
      secondary: legacy.tags.secondary.slice(0, 5), // Limit to 5 for secondary
      industries: ["Technology", "Software Development"], // Default industries
      userTypes: ["Developers", "Software Engineers"] // Default user types
    },

    pricingSummary: {
      lowestMonthlyPrice: legacy.pricing.includes("Free") || legacy.pricing.includes("Open Source") ? 0 : 10,
      highestMonthlyPrice: legacy.pricing.includes("Enterprise") ? 100 :
                           legacy.pricing.includes("Subscription") ? 50 :
                           legacy.pricing.includes("Free") ? 0 : 20,
      currency: "USD",
      hasFreeTier: legacy.pricing.includes("Free") || legacy.pricing.includes("Freemium") || legacy.pricing.includes("Open Source"),
      hasCustomPricing: legacy.pricing.includes("Enterprise"),
      billingPeriods: ["month"],
      pricingModel: legacy.pricing.includes("Free") || legacy.pricing.includes("Open Source") ?
        ["free"] :
        legacy.pricing.includes("Freemium") ?
          ["freemium", "subscription"] :
          ["subscription"]
    },

    pricingDetails: legacy.pricing.map((tier, index) => ({
      id: tier.toLowerCase().replace(/\s+/g, '-'),
      name: tier,
      price: tier === "Free" || tier === "Open Source" ? 0 :
             tier === "Freemium" ? 0 :
             tier === "Enterprise" ? null :
             tier === "Subscription" ? 20 : 10,
      billing: tier === "Enterprise" ? "custom" : "month",
      features: Object.keys(legacy.features).filter(key => legacy.features[key]),
      ...(tier === "Enterprise" && { isCustom: true }),
      ...(index === 1 && { isPopular: true }), // Mark second tier as popular
      sortOrder: index + 1
    })),

    capabilities: {
      core: legacy.functionality,
      aiFeatures: {
        codeGeneration: legacy.features["Code Completion"] || legacy.features["Code Generation"] || false,
        imageGeneration: false,
        dataAnalysis: legacy.functionality.includes("Code Analysis"),
        voiceInteraction: false,
        multimodal: false,
        thinkingMode: false
      },
      technical: {
        apiAccess: legacy.interface.includes("API"),
        webHooks: false,
        sdkAvailable: legacy.interface.includes("CLI"),
        offlineMode: legacy.features["Offline Mode"] || false
      },
      integrations: {
        platforms: legacy.interface,
        thirdParty: legacy.interface.includes("IDE") ? ["VS Code", "JetBrains"] : [],
        protocols: ["REST"]
      }
    },

    useCases: [
      {
        name: "Code Development",
        description: `Enhance development workflow with ${legacy.name}`,
        industries: ["Technology", "Software Development"],
        userTypes: ["Developers", "Software Engineers"],
        scenarios: legacy.functionality.map(func => func.toLowerCase()),
        complexity: "intermediate"
      }
    ],

    searchKeywords: legacy.searchKeywords,
    semanticTags: [...legacy.functionality.map(f => f.toLowerCase()), ...legacy.tags.primary.map(t => t.toLowerCase())],
    aliases: [legacy.name],

    // Legacy fields for backward compatibility
    pricing: legacy.pricing,
    interface: legacy.interface,
    functionality: legacy.functionality,
    deployment: legacy.deployment,
    popularity: legacy.popularity,
    rating: legacy.rating,
    reviewCount: legacy.reviewCount,

    logoUrl: legacy.logoUrl,
    website: `https://example.com/${legacy.id}`, // Default website
    status: "active",
    contributor: "frontend-mock",
    dateAdded: new Date(legacy.lastUpdated).toISOString(),
    lastUpdated: new Date(legacy.lastUpdated).toISOString()
  };
}

/**
 * Batch transform multiple legacy tools
 */
export function transformLegacyTools(legacyTools: LegacyTool[]): BaseTool[] {
  return legacyTools.map(transformLegacyToV2);
}