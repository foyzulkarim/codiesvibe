/**
 * @deprecated This file is deprecated as of v3.0 (schema-driven pipeline)
 *
 * Controlled vocabularies are now defined in the domain schema instead of this shared file.
 * This provides better type safety, validation, and domain-specific configuration.
 *
 * Migration path:
 * - For tools domain: Use `toolsSchema` from `@/domains/tools/tools.schema`
 * - Access vocabularies via: `schema.vocabularies.categories`, `schema.vocabularies.functionality`, etc.
 * - In pipeline nodes: Extract schema from state: `const { schema } = state;`
 *
 * Related files:
 * - Schema definition: `src/domains/tools/tools.schema.ts`
 * - Schema types: `src/core/types/schema.types.ts`
 * - Schema validator: `src/core/validators/schema.validator.ts`
 * - Pipeline initialization: `src/core/pipeline.init.ts`
 *
 * This file is kept for backward compatibility and will be removed in a future version.
 */
export const CONTROLLED_VOCABULARIES = {
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

  interface: ['Web', 'Desktop', 'Mobile', 'CLI', 'API', 'IDE', 'IDE Extension'],

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

    // niche
    'AWS Support',
  ],

  deployment: ['Cloud', 'Local', 'Self-Hosted'],

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

  pricingModels: ['Free', 'Freemium', 'Paid'],

  billingPeriods: ['Monthly', 'Yearly'],
};

/**
 * @deprecated This constant is deprecated as of v3.0 (schema-driven pipeline)
 *
 * Vocabulary mappings are now defined in the domain schema.
 * Use `schema.vocabularies` from `@/domains/tools/tools.schema` instead.
 *
 * For tools domain, import: `import { TOOLS_VOCABULARY_MAPPINGS } from '@/domains/tools';`
 */
export const VOCABULARY_MAPPINGS = {
  // Synonym mappings for LLM context
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
 * @deprecated This constant is deprecated as of v3.0 (schema-driven pipeline)
 *
 * Price operators are now defined in the domain schema.
 * Use `TOOLS_PRICE_OPERATORS` from `@/domains/tools/tools.schema` instead.
 *
 * For tools domain, import: `import { TOOLS_PRICE_OPERATORS } from '@/domains/tools';`
 */
export const OPERATORS = {
  LESS_THAN: 'less_than',
  LESS_THAN_OR_EQUAL: 'less_than_or_equal',
  GREATER_THAN: 'greater_than',
  GREATER_THAN_OR_EQUAL: 'greater_than_or_equal',
  EQUAL: 'equal',
  NOT_EQUAL: 'not_equal',
  AROUND: 'around',
  BETWEEN: 'between',
};
