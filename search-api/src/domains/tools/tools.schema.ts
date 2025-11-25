/**
 * Tools Domain Schema Definition
 *
 * This schema defines the structure for the AI Tools directory domain.
 * It includes:
 * - Controlled vocabularies for tools, categories, functionality, etc.
 * - Intent field definitions for query understanding
 * - Vector collection configurations for Qdrant
 * - Structured database configuration for MongoDB
 *
 * Migrated from: src/shared/constants/controlled-vocabularies.ts
 *
 * @module domains/tools
 */

import { DomainSchema } from '@/core/types/schema.types';

/**
 * Tools Domain Schema
 *
 * This is the main configuration for the AI Tools directory search pipeline.
 * All vocabularies, intent fields, and collection configs are defined here.
 */
export const toolsSchema: DomainSchema = {
  name: 'tools',
  version: '1.0.0',

  metadata: {
    description: 'AI Tools Directory - Semantic search for developer tools, AI platforms, and productivity software',
    author: 'CodiesVibe',
    createdAt: '2025-01-25',
    tags: ['ai-tools', 'developer-tools', 'productivity'],
  },

  // ============================================================================
  // CONTROLLED VOCABULARIES
  // Migrated from: src/shared/constants/controlled-vocabularies.ts
  // ============================================================================
  vocabularies: {
    /**
     * Tool categories
     * Covers core technology, tool types, domains, and specializations
     */
    categories: [
      // Core Technology
      'AI',
      'Machine Learning',
      'Development',
      'Productivity',
      'Analytics',
      'Chatbot',
      // Tool Types
      'Code Editor',
      'IDE',
      'App Builder',
      'No-Code',
      'Cloud IDE',
      'Desktop App',
      // Domains
      'Local LLM',
      'Privacy',
      'Open Source',
      'Collaboration',
      'Deployment',
      // Specializations
      'Full-Stack',
      'Rapid Prototyping',
      'GUI',
      'Offline',
      'Text Generation',
      'Code Generation',
      'Code Completion',
    ],

    /**
     * Functional capabilities and features
     */
    functionality: [
      // Code-related
      'Code Generation',
      'Code Completion',
      'Debugging',
      'Refactoring',
      'Documentation',
      // AI Features
      'AI Chat',
      'AI Assistant',
      'Text Generation',
      'Translation',
      'Image Generation',
      'Video Generation',
      // Development
      'Deployment',
      'Database Setup',
      'Authentication',
      'Collaboration',
      'UI Prototyping',
      // Management
      'Model Management',
      'Local Inference',
      'API Server',
      'Model Customization',
      // Interface
      'Chat Interface',
      'Document RAG',
      'App Generation',
      // Niche
      'AWS Support',
    ],

    /**
     * Target user types
     */
    userTypes: [
      // Technical
      'Developers',
      'Software Engineers',
      'Full-Stack Developers',
      'AI Engineers',
      'Researchers',
      'Privacy Advocates',
      'UX Designers',
      // Business
      'Entrepreneurs',
      'Product Managers',
      'Non-Technical Founders',
      'Rapid Prototypers',
      'Business Owners',
      'Startup Teams',
      // General
      'Students',
      'Teachers',
      'Remote Teams',
      'Non-Technical Users',
      'Freelancers',
      'Consultants',
      'General Users',
      'Professionals',
    ],

    /**
     * Interface types
     */
    interface: ['Web', 'Desktop', 'Mobile', 'CLI', 'API', 'IDE', 'IDE Extension'],

    /**
     * Deployment models
     */
    deployment: ['Cloud', 'Local', 'Self-Hosted'],

    /**
     * Industry verticals
     */
    industries: [
      'Technology',
      'Software Development',
      'Startups',
      'Education',
      'Research',
      'Remote Work',
      'Innovation',
      'Small Business',
      'Enterprise',
      'Consulting',
      'Privacy-Focused',
      'Edge Computing',
      'Business',
      'Non-Profit',
      'Venture Capital',
      'Incubators',
      'Content Creation',
    ],

    /**
     * Pricing models
     */
    pricingModels: ['Free', 'Freemium', 'Paid'],

    /**
     * Billing periods
     */
    billingPeriods: ['Monthly', 'Yearly'],
  },

  // ============================================================================
  // INTENT FIELD DEFINITIONS
  // Based on: src/graphs/nodes/intent-extractor.node.ts (INTENT_EXTRACTION_SYSTEM_PROMPT)
  // ============================================================================
  intentFields: [
    {
      name: 'primaryGoal',
      type: 'enum',
      enumValues: ['find', 'compare', 'recommend', 'explore', 'analyze', 'explain'],
      required: true,
      description: 'Primary user goal or intent',
    },
    {
      name: 'referenceTool',
      type: 'string',
      required: false,
      description: 'Reference tool for comparison queries (e.g., "Cursor" in "Cursor alternative")',
    },
    {
      name: 'comparisonMode',
      type: 'enum',
      enumValues: ['similar_to', 'vs', 'alternative_to'],
      required: false,
      description: 'Type of comparison being requested',
    },
    {
      name: 'filters',
      type: 'array',
      required: false,
      description: 'Additional filters to apply',
    },
    {
      name: 'pricingModel',
      type: 'string',
      required: false,
      description: 'Pricing model constraint (Free, Freemium, Paid)',
    },
    {
      name: 'billingPeriod',
      type: 'string',
      required: false,
      description: 'Billing period preference (Monthly, Yearly)',
    },
    {
      name: 'priceRange',
      type: 'object',
      required: false,
      description: 'Price range constraints (min, max, currency, billingPeriod)',
      children: [
        { name: 'min', type: 'number', required: false, description: 'Minimum price' },
        { name: 'max', type: 'number', required: false, description: 'Maximum price' },
        { name: 'currency', type: 'string', required: false, description: 'Currency (default: USD)' },
        { name: 'billingPeriod', type: 'string', required: false, description: 'Billing period' },
      ],
    },
    {
      name: 'priceComparison',
      type: 'object',
      required: false,
      description: 'Price comparison operator (less_than, greater_than, equal_to, around, between)',
      children: [
        {
          name: 'operator',
          type: 'enum',
          enumValues: ['less_than', 'greater_than', 'equal_to', 'around', 'between'],
          required: true,
          description: 'Comparison operator',
        },
        { name: 'value', type: 'number', required: true, description: 'Price value to compare against' },
        { name: 'currency', type: 'string', required: false, description: 'Currency (default: USD)' },
        { name: 'billingPeriod', type: 'string', required: false, description: 'Billing period' },
      ],
    },
    {
      name: 'category',
      type: 'string',
      required: false,
      description: 'Tool category (AI, Code Editor, etc.)',
    },
    {
      name: 'interface',
      type: 'string',
      required: false,
      description: 'Interface type (Web, CLI, Desktop, etc.)',
    },
    {
      name: 'functionality',
      type: 'string',
      required: true,
      description: 'Functional capabilities or features',
    },
    {
      name: 'deployment',
      type: 'string',
      required: false,
      description: 'Deployment model (Cloud, Local, Self-Hosted)',
    },
    {
      name: 'industry',
      type: 'string',
      required: false,
      description: 'Industry vertical',
    },
    {
      name: 'userType',
      type: 'string',
      required: false,
      description: 'Target user type',
    },
    {
      name: 'semanticVariants',
      type: 'array',
      required: true,
      description: 'Semantic query variants for better matching',
    },
    {
      name: 'constraints',
      type: 'array',
      required: true,
      description: 'Additional constraints (e.g., "offline", "cheaper")',
    },
    {
      name: 'confidence',
      type: 'number',
      required: true,
      description: 'Confidence score for the intent extraction (0-1)',
    },
  ],

  // ============================================================================
  // VECTOR COLLECTION CONFIGURATIONS
  // Based on: src/config/database.ts and actual Qdrant collections
  // ============================================================================
  vectorCollections: [
    {
      name: 'tools',
      embeddingField: 'semantic',
      dimension: 768,
      description: 'Semantic embeddings of tool descriptions',
      enabled: true,
    },
    {
      name: 'functionality',
      embeddingField: 'entities.functionality',
      dimension: 768,
      description: 'Functional capability embeddings',
      enabled: true,
    },
    {
      name: 'usecases',
      embeddingField: 'entities.useCases',
      dimension: 768,
      description: 'Use case embeddings',
      enabled: true,
    },
    {
      name: 'interface',
      embeddingField: 'entities.interface',
      dimension: 768,
      description: 'Interface type embeddings',
      enabled: true,
    },
    {
      name: 'categories',
      embeddingField: 'entities.categories',
      dimension: 768,
      description: 'Category embeddings',
      enabled: false, // Optional collection
    },
    {
      name: 'industries',
      embeddingField: 'entities.industries',
      dimension: 768,
      description: 'Industry vertical embeddings',
      enabled: false, // Optional collection
    },
    {
      name: 'userTypes',
      embeddingField: 'entities.userTypes',
      dimension: 768,
      description: 'User type embeddings',
      enabled: false, // Optional collection
    },
    {
      name: 'aliases',
      embeddingField: 'entities.aliases',
      dimension: 768,
      description: 'Tool name aliases and synonyms',
      enabled: false, // Optional collection
    },
    {
      name: 'toolType',
      embeddingField: 'composites.toolType',
      dimension: 768,
      description: 'Composite tool type embeddings',
      enabled: false, // Optional collection
    },
  ],

  // ============================================================================
  // STRUCTURED DATABASE CONFIGURATION
  // Based on: src/models/tool.model.ts
  // ============================================================================
  structuredDatabase: {
    collection: 'tools',
    type: 'mongodb',
    searchFields: [
      'name',
      'description',
      'longDescription',
      'tagline',
      'categories',
      'functionality',
      'interface',
      'deployment',
      'industries',
      'userTypes',
    ],
    filterableFields: [
      'pricingSummary',
      'pricingSummary.lowestMonthlyPrice',
      'pricingSummary.highestMonthlyPrice',
      'pricingSummary.hasFreeTier',
      'pricingSummary.hasCustomPricing',
      'pricingSummary.pricingModel',
      'categories',
      'categories.primary',
      'categories.secondary',
      'functionality',
      'interface',
      'deployment',
      'industries',
      'userTypes',
      'status',
      'dateAdded',
      'lastUpdated',
    ],
  },
};

/**
 * Helper function to define a schema (for future validation/type checking)
 */
export function defineToolsSchema(schema: DomainSchema): DomainSchema {
  return schema;
}

/**
 * Vocabulary synonym mappings (for LLM context)
 * Migrated from: VOCABULARY_MAPPINGS in controlled-vocabularies.ts
 */
export const TOOLS_VOCABULARY_MAPPINGS = {
  categories: {
    'Artificial Intelligence': 'AI',
    'Dev Tools': 'Development',
    'Developer Tools': 'Development',
    'Development Platform': 'Development',
  },
  functionality: {
    'Database Management': 'Database Setup',
  },
  deployment: {
    'On-Premise': 'Self-Hosted',
    'On-Premises': 'Self-Hosted',
    Remote: 'Cloud',
  },
};

/**
 * Price comparison operators
 * Migrated from: OPERATORS in controlled-vocabularies.ts
 */
export const TOOLS_PRICE_OPERATORS = {
  LESS_THAN: 'less_than',
  LESS_THAN_OR_EQUAL: 'less_than_or_equal',
  GREATER_THAN: 'greater_than',
  GREATER_THAN_OR_EQUAL: 'greater_than_or_equal',
  EQUAL: 'equal',
  NOT_EQUAL: 'not_equal',
  AROUND: 'around',
  BETWEEN: 'between',
} as const;
