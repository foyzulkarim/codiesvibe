/**
 * Validation Test Fixtures for Enhanced Tool Schema
 * 
 * This file provides test data for validating the new enhanced tool fields
 * including complex objects, arrays, and edge cases as specified in data-model.md
 */

export const VALIDATION_FIXTURES = {
  // Valid tool data with all enhanced fields
  validCompleteTool: {
    name: "ChatGPT",
    description: "Advanced AI chatbot for natural conversations",
    longDescription: "ChatGPT is an advanced language model designed for natural language conversations and assistance across various domains.",
    pricing: ["Free", "Paid", "API"],
    interface: ["Web", "API", "Mobile"],
    functionality: ["Text Generation", "Translation", "Code Generation"],
    deployment: ["Cloud"],
    popularity: 95000,
    rating: 4.5,
    reviewCount: 2500,
    lastUpdated: new Date("2025-09-12T10:00:00Z"),
    logoUrl: "https://example.com/chatgpt-logo.png",
    features: {
      apiAccess: true,
      freeTier: true,
      multiLanguage: true,
      codeExecution: false
    },
    searchKeywords: ["chatbot", "AI", "conversation", "GPT", "OpenAI", "assistant"],
    tags: {
      primary: ["AI", "Chatbot"],
      secondary: ["Productivity", "Communication", "Language"]
    }
  },

  // Valid minimal tool data (only required fields)
  validMinimalTool: {
    name: "Simple Tool",
    description: "A simple tool description",
    pricing: ["Free"],
    interface: ["Web"],
    functionality: ["Basic"],
    deployment: ["Cloud"],
    logoUrl: "https://example.com/logo.png",
    searchKeywords: ["simple", "tool"],
    tags: {
      primary: ["Utility"],
      secondary: ["Basic"]
    }
  },

  // Edge case fixtures for validation testing
  edgeCases: {
    // String length boundaries
    maxLengthName: "a".repeat(100), // Exactly 100 characters
    maxLengthDescription: "a".repeat(500), // Exactly 500 characters
    maxLengthLongDescription: "a".repeat(2000), // Exactly 2000 characters
    maxLengthSearchKeyword: "a".repeat(256), // Exactly 256 characters (max per keyword)

    // Numeric boundaries
    maxPopularity: 1000000,
    maxRating: 5,
    maxReviewCount: 1000000,
    minPopularity: 0,
    minRating: 0,
    minReviewCount: 0,

    // Array boundaries
    singleItemArray: ["single"],
    largeArray: Array.from({ length: 50 }, (_, i) => `item${i}`), // Large but valid array
    emptyPrimaryTagsWithSecondary: {
      primary: [],
      secondary: ["some-tag"]
    },
    singlePrimaryTag: {
      primary: ["AI"],
      secondary: []
    },

    // Features object edge cases
    emptyFeatures: {},
    allTrueFeatures: {
      feature1: true,
      feature2: true,
      feature3: true
    },
    allFalseFeatures: {
      feature1: false,
      feature2: false,
      feature3: false
    },
    mixedFeatures: {
      feature1: true,
      feature2: false,
      feature3: true
    }
  },

  // Invalid data fixtures for testing validation failures
  invalidData: {
    // Missing required fields
    missingName: {
      description: "Missing name",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] }
    },

    missingDescription: {
      name: "Test Tool",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] }
    },

    // String validation failures
    emptyName: {
      name: "",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] }
    },

    nameTooLong: "a".repeat(101), // 101 characters (exceeds 100)

    descriptionTooLong: "a".repeat(501), // 501 characters (exceeds 500)

    longDescriptionTooLong: "a".repeat(2001), // 2001 characters (exceeds 2000)

    searchKeywordTooLong: "a".repeat(257), // 257 characters (exceeds 256)

    // Array validation failures
    emptyPricing: {
      name: "Test Tool",
      description: "Valid description",
      pricing: [],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] }
    },

    emptyInterface: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: [],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] }
    },

    emptyFunctionality: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: [],
      deployment: ["Cloud"],
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] }
    },

    emptyDeployment: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: [],
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] }
    },

    emptySearchKeywords: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      logoUrl: "https://example.com/logo.png",
      searchKeywords: [],
      tags: { primary: ["Test"], secondary: [] }
    },

    emptyTags: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: [], secondary: [] }
    },

    // Numeric validation failures
    negativePopularity: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      popularity: -1,
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] }
    },

    popularityTooHigh: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      popularity: 1000001,
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] }
    },

    ratingTooHigh: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      rating: 5.1,
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] }
    },

    ratingTooLow: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      rating: -0.1,
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] }
    },

    // URL validation failures
    invalidLogoUrl: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      logoUrl: "not-a-valid-url",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] }
    },

    // Features object validation failures
    invalidFeaturesValues: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["Test"], secondary: [] },
      features: {
        validBoolean: true,
        invalidString: "not a boolean",
        invalidNumber: 42,
        invalidObject: {},
        invalidArray: []
      }
    },

    // Tags structure validation failures
    missingTagsPrimary: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { secondary: ["test"] } // Missing primary
    },

    missingTagsSecondary: {
      name: "Test Tool",
      description: "Valid description",
      pricing: ["Free"],
      interface: ["Web"],
      functionality: ["Basic"],
      deployment: ["Cloud"],
      logoUrl: "https://example.com/logo.png",
      searchKeywords: ["test"],
      tags: { primary: ["test"] } // Missing secondary is allowed (empty array)
    }
  }
};

// Helper functions for generating test data
export const TestDataGenerator = {
  // Generate a valid tool with custom overrides
  generateValidTool(overrides = {}) {
    return {
      ...VALIDATION_FIXTURES.validCompleteTool,
      ...overrides
    };
  },

  // Generate a tool with specific field for testing
  generateToolWithField(field: string, value: any) {
    return {
      ...VALIDATION_FIXTURES.validCompleteTool,
      [field]: value
    };
  },

  // Generate array of tools for search/filter testing
  generateToolArray(count = 10): any[] {
    return Array.from({ length: count }, (_, i) => ({
      ...VALIDATION_FIXTURES.validCompleteTool,
      name: `Tool ${i + 1}`,
      description: `Description for tool ${i + 1}`,
      popularity: Math.floor(Math.random() * 100000),
      rating: Math.round((Math.random() * 4 + 1) * 10) / 10,
      functionality: [`Category${(i % 5) + 1}`],
      tags: {
        primary: [`Tag${(i % 3) + 1}`],
        secondary: [`Secondary${(i % 4) + 1}`]
      }
    }));
  }
};