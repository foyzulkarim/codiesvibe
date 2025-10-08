/**
 * Validation Test Fixtures for v2.0 Tool Schema
 *
 * This file provides test data for validating the v2.0 tool structure
 * including categories, capabilities, pricing details, and use cases
 */

export const VALIDATION_FIXTURES_V2 = {
  // Valid tool data with all v2.0 fields
  validCompleteTool: {
    id: 'claude-ai-v2',
    name: 'Claude AI',
    slug: 'claude-ai',
    description:
      'AI assistant by Anthropic for helpful, harmless, and honest conversations',
    longDescription:
      'Claude is an AI assistant created by Anthropic that can engage in helpful conversations, answer questions, help with analysis and writing, and much more. Claude is designed to be helpful, harmless, and honest.',
    tagline: 'Your thoughtful AI assistant for safe and helpful interactions',

    categories: ['AI', 'Assistant', 'Productivity', 'Analysis'],
    industries: ['Technology', 'Education', 'Research'],
    userTypes: ['Researchers', 'Writers', 'Students'],

    pricingSummary: {
      lowestMonthlyPrice: 0,
      highestMonthlyPrice: 20,
      currency: 'USD',
      hasFreeTier: true,
      hasCustomPricing: false,
      billingPeriods: ['month'],
      pricingModel: ['freemium', 'subscription'],
    },

    
    
    // Legacy fields for backward compatibility
    pricing: ['Free', 'Paid'],
    interface: ['Web', 'API'],
    functionality: ['Text Generation', 'Analysis'],
    deployment: ['Cloud'],
    popularity: 85,
    rating: 4.6,
    reviewCount: 1200,

    logoUrl: 'https://example.com/claude-logo.png',
    website: 'https://claude.ai',
    documentation: 'https://docs.anthropic.com',
    pricingUrl: 'https://claude.ai/pricing',
    status: 'active',
    contributor: 'system',
    dateAdded: '2025-09-14T09:17:00Z',
    lastUpdated: '2025-09-29T08:40:00Z',
  },

  // Valid minimal tool data (only required v2.0 fields)
  validMinimalTool: {
    id: 'simple-tool-v2',
    name: 'Simple Tool V2',
    slug: 'simple-tool-v2',
    description: 'A simple tool for v2.0 testing',
    longDescription: 'Extended description for the simple tool.',
    tagline: 'Simple and effective tool',

    categories: {
      primary: ['Utility'],
      secondary: [],
      industries: ['Technology'],
      userTypes: ['Developers'],
    },

    pricingSummary: {
      lowestMonthlyPrice: 0,
      highestMonthlyPrice: 0,
      currency: 'USD',
      hasFreeTier: true,
      hasCustomPricing: false,
      billingPeriods: ['month'],
      pricingModel: ['free'],
    },

    pricingDetails: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        billing: 'month',
        features: ['Basic functionality'],
        sortOrder: 1,
      },
    ],

    capabilities: {
      core: ['Basic Functionality'],
      aiFeatures: {
        codeGeneration: false,
        imageGeneration: false,
        dataAnalysis: false,
        voiceInteraction: false,
        multimodal: false,
        thinkingMode: false,
      },
      technical: {
        apiAccess: false,
        webHooks: false,
        sdkAvailable: false,
        offlineMode: false,
      },
      integrations: {
        platforms: ['Web'],
        thirdParty: [],
        protocols: ['HTTP'],
      },
    },

    useCases: [
      {
        name: 'Basic Usage',
        description: 'Simple use case for basic functionality',
        industries: ['Technology'],
        userTypes: ['Developers'],
        scenarios: ['Simple tasks'],
        complexity: 'beginner',
      },
    ],

    searchKeywords: ['simple', 'tool', 'basic'],
    semanticTags: ['utility', 'basic'],
    aliases: ['Simple Tool'],

    // Legacy fields
    pricing: ['Free'],
    interface: ['Web'],
    functionality: ['Basic'],
    deployment: ['Cloud'],
    popularity: 50,
    rating: 3.5,
    reviewCount: 100,

    logoUrl: 'https://example.com/logo.png',
    website: 'https://example.com',
    status: 'active',
    contributor: 'test-user',
    dateAdded: '2025-09-29T10:00:00Z',
    lastUpdated: '2025-09-29T10:00:00Z',
  },

  // Invalid data fixtures for testing validation failures
  invalidData: {
    // Missing required v2.0 fields
    missingCategories: {
      id: 'missing-categories',
      name: 'Missing Categories',
      slug: 'missing-categories',
      description: 'Tool missing categories',
      longDescription: 'Extended description',
      tagline: 'Missing categories test',
      // categories: missing
      pricingSummary: {
        lowestMonthlyPrice: 0,
        highestMonthlyPrice: 0,
        currency: 'USD',
        hasFreeTier: true,
        hasCustomPricing: false,
        billingPeriods: ['month'],
        pricingModel: ['free'],
      },
    },

    missingPricingSummary: {
      id: 'missing-pricing',
      name: 'Missing Pricing',
      slug: 'missing-pricing',
      description: 'Tool missing pricing summary',
      longDescription: 'Extended description',
      tagline: 'Missing pricing test',
      categories: {
        primary: ['Test'],
        secondary: [],
        industries: ['Technology'],
        userTypes: ['Developers'],
      },
      // pricingSummary: missing
    },

    // Invalid category structure
    invalidCategoriesStructure: {
      id: 'invalid-categories',
      name: 'Invalid Categories',
      slug: 'invalid-categories',
      description: 'Tool with invalid categories',
      categories: {
        primary: [], // Empty primary categories - should fail
        secondary: ['Test'],
        industries: ['Technology'],
        userTypes: ['Developers'],
      },
    },

    // Invalid pricing structure
    invalidPricingStructure: {
      id: 'invalid-pricing',
      name: 'Invalid Pricing',
      pricingSummary: {
        lowestMonthlyPrice: -10, // Negative price - should fail
        highestMonthlyPrice: 20,
        currency: 'USD',
        hasFreeTier: true,
        hasCustomPricing: false,
        billingPeriods: ['month'],
        pricingModel: ['freemium'],
      },
    },

    // Invalid use case complexity
    invalidUseCaseComplexity: {
      id: 'invalid-use-case',
      name: 'Invalid Use Case',
      useCases: [
        {
          name: 'Test Use Case',
          description: 'Test description',
          industries: ['Technology'],
          userTypes: ['Developers'],
          scenarios: ['Test scenario'],
          complexity: 'invalid-complexity', // Should be 'beginner', 'intermediate', or 'advanced'
        },
      ],
    },

    // Invalid pricing details
    invalidPricingDetails: {
      id: 'invalid-pricing-details',
      name: 'Invalid Pricing Details',
      pricingDetails: [
        {
          id: 'invalid',
          name: 'Invalid Plan',
          price: 'not-a-number', // Should be number or null
          billing: 'invalid-billing', // Should be valid billing period
          features: 'not-an-array', // Should be array
          sortOrder: 'not-a-number', // Should be number
        },
      ],
    },

    // Invalid capabilities structure
    invalidCapabilities: {
      id: 'invalid-capabilities',
      name: 'Invalid Capabilities',
      capabilities: {
        core: 'not-an-array', // Should be array
        aiFeatures: {
          codeGeneration: 'not-a-boolean', // Should be boolean
          imageGeneration: false,
        },
        technical: 'not-an-object', // Should be object
        integrations: {
          platforms: 'not-an-array', // Should be array
        },
      },
    },
  },

  // Edge cases for boundary testing
  edgeCases: {
    maxCategories: {
      primary: ['Cat1', 'Cat2', 'Cat3', 'Cat4', 'Cat5'], // Max 5 primary
      secondary: Array.from({ length: 10 }, (_, i) => `Secondary${i + 1}`), // Max 10 secondary
      industries: Array.from({ length: 10 }, (_, i) => `Industry${i + 1}`),
      userTypes: Array.from({ length: 10 }, (_, i) => `UserType${i + 1}`),
    },

    minimalCategories: {
      primary: ['Single'],
      secondary: [],
      industries: ['Technology'],
      userTypes: ['Users'],
    },

    maxPricingDetails: Array.from({ length: 10 }, (_, i) => ({
      id: `plan-${i}`,
      name: `Plan ${i + 1}`,
      price: i * 10,
      billing: 'month',
      features: [`Feature ${i + 1}`],
      sortOrder: i + 1,
    })),

    maxUseCases: Array.from({ length: 10 }, (_, i) => ({
      name: `Use Case ${i + 1}`,
      description: `Description for use case ${i + 1}`,
      industries: ['Technology'],
      userTypes: ['Developers'],
      scenarios: [`Scenario ${i + 1}`],
      complexity: ['beginner', 'intermediate', 'advanced'][i % 3],
    })),

    // String length boundaries for v2.0 fields
    maxLengthTagline: 'a'.repeat(200), // Max 200 characters
    maxLengthSlug: 'a'.repeat(100), // Max 100 characters
    longSemanticTags: Array.from({ length: 50 }, (_, i) => `semantic-tag-${i}`),
    longAliases: Array.from({ length: 20 }, (_, i) => `Alias ${i + 1}`),
  },
};

// Helper functions for generating v2.0 test data
export const TestDataGeneratorV2 = {
  // Generate a valid v2.0 tool with custom overrides
  generateValidTool(overrides = {}) {
    return {
      ...VALIDATION_FIXTURES_V2.validCompleteTool,
      ...overrides,
    };
  },

  // Generate a tool with specific v2.0 field for testing
  generateToolWithField(field: string, value: any) {
    return {
      ...VALIDATION_FIXTURES_V2.validCompleteTool,
      [field]: value,
    };
  },

  // Generate minimal valid v2.0 tool
  generateMinimalTool(overrides = {}) {
    return {
      ...VALIDATION_FIXTURES_V2.validMinimalTool,
      ...overrides,
    };
  },

  // Generate array of v2.0 tools for testing
  generateToolArray(count = 10): any[] {
    return Array.from({ length: count }, (_, i) => ({
      ...VALIDATION_FIXTURES_V2.validCompleteTool,
      id: `tool-${i + 1}`,
      name: `Tool ${i + 1}`,
      slug: `tool-${i + 1}`,
      description: `Description for tool ${i + 1}`,
      popularity: Math.floor(Math.random() * 100),
      rating: Math.round((Math.random() * 4 + 1) * 10) / 10,
      categories: {
        primary: [`Category${(i % 3) + 1}`],
        secondary: [`Secondary${(i % 4) + 1}`],
        industries: [`Industry${(i % 5) + 1}`],
        userTypes: [`UserType${(i % 3) + 1}`],
      },
    }));
  },
};
