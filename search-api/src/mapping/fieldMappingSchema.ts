/**
 * Field Mapping Schema
 *
 * Defines semantic intent to database field mappings for intelligent search routing.
 * This schema enables the system to map user queries to the most relevant database fields.
 */

export interface FieldMapping {
  fieldPath: string;
  weight: number; // Relevance weight for this field
  fieldType: 'string' | 'boolean' | 'number' | 'array';
  requiresExactMatch?: boolean;
  boostTerms?: string[]; // Terms that get extra weight in this field
}

export interface IntentMapping {
  intent: string;
  description: string;
  fields: FieldMapping[];
  keywords: string[]; // Keywords that trigger this intent
  confidence: number; // Base confidence for this intent
}

/**
 * Comprehensive field mapping schema for semantic intent recognition
 */
export const FIELD_MAPPING_SCHEMA: Record<string, IntentMapping> = {
  pricing: {
    intent: 'pricing',
    description: 'Queries related to cost, pricing models, and free tiers',
    confidence: 0.8,
    keywords: [
      'free', 'cost', 'price', 'pricing', 'cheap', 'expensive', 'affordable',
      'subscription', 'monthly', 'annual', 'paid', 'premium', 'enterprise',
      'freemium', 'open source', 'free tier', 'no cost', 'budget', '$', 'under', 'below'
    ],
    fields: [
      {
        fieldPath: 'pricingSummary.hasFreeTier',
        weight: 0.9,
        fieldType: 'boolean',
        boostTerms: ['free', 'freemium', 'no cost']
      },
      {
        fieldPath: 'pricingSummary.lowestMonthlyPrice',
        weight: 0.8,
        fieldType: 'number'
      },
      {
        fieldPath: 'pricingSummary.highestMonthlyPrice',
        weight: 0.6,
        fieldType: 'number'
      },
      {
        fieldPath: 'pricingSummary.pricingModel',
        weight: 0.7,
        fieldType: 'array',
        boostTerms: ['freemium', 'subscription', 'paid']
      },
      {
        fieldPath: 'pricingSummary.currency',
        weight: 0.4,
        fieldType: 'string'
      },
      {
        fieldPath: 'plans.price',
        weight: 0.7,
        fieldType: 'number'
      },
      {
        fieldPath: 'plans.name',
        weight: 0.5,
        fieldType: 'string',
        boostTerms: ['free', 'basic', 'premium', 'enterprise']
      }
    ]
  },

  interface: {
    intent: 'interface',
    description: 'Queries related to user interface and interaction methods',
    confidence: 0.8,
    keywords: [
      'cli', 'command line', 'gui', 'graphical', 'interface', 'ui', 'ux',
      'web', 'mobile', 'desktop', 'api', 'sdk', 'terminal', 'console',
      'command', 'script', 'code', 'programming'
    ],
    fields: [
      {
        fieldPath: 'interface.type',
        weight: 0.9,
        fieldType: 'string',
        boostTerms: ['cli', 'gui', 'web', 'api', 'sdk']
      },
      {
        fieldPath: 'interface.features',
        weight: 0.7,
        fieldType: 'array'
      },
      {
        fieldPath: 'capabilities.technical.sdkAvailable',
        weight: 0.6,
        fieldType: 'boolean',
        boostTerms: ['sdk', 'api', 'programming']
      },
      {
        fieldPath: 'capabilities.technical.apiAccess',
        weight: 0.6,
        fieldType: 'boolean',
        boostTerms: ['api', 'interface', 'programming']
      }
    ]
  },

  functionality: {
    intent: 'functionality',
    description: 'Queries about what the tool can do and its capabilities',
    confidence: 0.7,
    keywords: [
      'features', 'functionality', 'capabilities', 'what can it do', 'purpose',
      'use case', 'function', 'ability', 'skill', 'task', 'job', 'work'
    ],
    fields: [
      {
        fieldPath: 'capabilities.core',
        weight: 0.8,
        fieldType: 'array'
      },
      {
        fieldPath: 'features',
        weight: 0.8,
        fieldType: 'array'
      },
      {
        fieldPath: 'useCases',
        weight: 0.7,
        fieldType: 'array'
      },
      {
        fieldPath: 'description',
        weight: 0.6,
        fieldType: 'string'
      }
    ]
  },

  category: {
    intent: 'category',
    description: 'Queries about tool categories and types',
    confidence: 0.8,
    keywords: [
      'category', 'type', 'kind', 'tool', 'software', 'platform', 'app',
      'writing', 'coding', 'programming', 'development', 'design', 'image',
      'video', 'audio', 'music', 'productivity', 'automation', 'analytics'
    ],
    fields: [
      {
        fieldPath: 'categories.primary',
        weight: 0.9,
        fieldType: 'array'
      },
      {
        fieldPath: 'categories.secondary',
        weight: 0.7,
        fieldType: 'array'
      },
      {
        fieldPath: 'categories.industries',
        weight: 0.5,
        fieldType: 'array'
      },
      {
        fieldPath: 'categories.userTypes',
        weight: 0.5,
        fieldType: 'array'
      }
    ]
  },

  capability: {
    intent: 'capability',
    description: 'Queries about specific technical capabilities and features',
    confidence: 0.7,
    keywords: [
      'capability', 'feature', 'can it', 'does it support', 'able to',
      'webhook', 'sdk', 'offline', 'real-time', 'multi-user', 'cloud',
      'on-premise', 'mobile', 'desktop', 'browser', 'integration', 'api'
    ],
    fields: [
      {
        fieldPath: 'capabilities.aiFeatures.codeGeneration',
        weight: 0.8,
        fieldType: 'boolean',
        boostTerms: ['code', 'generation', 'programming']
      },
      {
        fieldPath: 'capabilities.aiFeatures.imageGeneration',
        weight: 0.8,
        fieldType: 'boolean',
        boostTerms: ['image', 'generation', 'create']
      },
      {
        fieldPath: 'capabilities.technical.webHooks',
        weight: 0.7,
        fieldType: 'boolean',
        boostTerms: ['webhook', 'integration', 'automate']
      },
      {
        fieldPath: 'capabilities.technical.sdkAvailable',
        weight: 0.7,
        fieldType: 'boolean',
        boostTerms: ['sdk', 'development', 'programming']
      },
      {
        fieldPath: 'capabilities.technical.apiAccess',
        weight: 0.7,
        fieldType: 'boolean',
        boostTerms: ['api', 'interface', 'integration']
      },
      {
        fieldPath: 'capabilities.features.realTimeFeatures',
        weight: 0.6,
        fieldType: 'boolean',
        boostTerms: ['real-time', 'live', 'instant']
      }
    ]
  },

  performance: {
    intent: 'performance',
    description: 'Queries about performance, speed, and efficiency',
    confidence: 0.6,
    keywords: [
      'fast', 'slow', 'performance', 'speed', 'efficient', 'quick',
      'optimize', 'latency', 'response time', 'throughput'
    ],
    fields: [
      {
        fieldPath: 'performanceMetrics',
        weight: 0.6,
        fieldType: 'string'
      },
      {
        fieldPath: 'description',
        weight: 0.4,
        fieldType: 'string',
        boostTerms: ['fast', 'efficient', 'performance']
      }
    ]
  },

  accessibility: {
    intent: 'accessibility',
    description: 'Queries about ease of use and accessibility',
    confidence: 0.6,
    keywords: [
      'easy', 'simple', 'beginner', 'user-friendly', 'accessible',
      'intuitive', 'straightforward', 'no-code', 'low-code'
    ],
    fields: [
      {
        fieldPath: 'complexity',
        weight: 0.6,
        fieldType: 'string'
      },
      {
        fieldPath: 'description',
        weight: 0.5,
        fieldType: 'string',
        boostTerms: ['easy', 'simple', 'user-friendly']
      }
    ]
  }
};

/**
 * Get intent mapping by intent name
 */
export function getIntentMapping(intent: string): IntentMapping | undefined {
  return FIELD_MAPPING_SCHEMA[intent];
}

/**
 * Get all available intents
 */
export function getAllIntents(): string[] {
  return Object.keys(FIELD_MAPPING_SCHEMA);
}

/**
 * Get fields for a specific intent
 */
export function getFieldsForIntent(intent: string): FieldMapping[] {
  const mapping = getIntentMapping(intent);
  return mapping?.fields || [];
}

/**
 * Check if a keyword matches any intent
 */
export function getIntentForKeyword(keyword: string): { intent: string; confidence: number }[] {
  const matches: { intent: string; confidence: number }[] = [];
  const lowerKeyword = keyword.toLowerCase();

  for (const [intentName, mapping] of Object.entries(FIELD_MAPPING_SCHEMA)) {
    if (mapping.keywords.some(kw => kw.toLowerCase() === lowerKeyword)) {
      matches.push({
        intent: intentName,
        confidence: mapping.confidence
      });
    }
  }

  return matches;
}

/**
 * Get field mappings for multiple intents
 */
export function getFieldMappingsForIntents(intents: string[]): FieldMapping[] {
  const allFields: FieldMapping[] = [];

  for (const intent of intents) {
    const fields = getFieldsForIntent(intent);
    allFields.push(...fields);
  }

  // Remove duplicates and sort by weight
  const uniqueFields = allFields.filter((field, index, self) =>
    index === self.findIndex(f => f.fieldPath === field.fieldPath)
  );

  return uniqueFields.sort((a, b) => b.weight - a.weight);
}

export default FIELD_MAPPING_SCHEMA;