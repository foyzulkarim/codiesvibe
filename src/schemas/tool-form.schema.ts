import { z } from 'zod';

// Controlled vocabularies (should match backend)
export const CONTROLLED_VOCABULARIES = {
  categories: [
    'AI', 'Machine Learning', 'Development', 'Productivity', 'Analytics', 'Chatbot',
    'Code Editor', 'IDE', 'App Builder', 'No-Code', 'Cloud IDE', 'Desktop App',
    'Local LLM', 'Privacy', 'Open Source', 'Collaboration', 'Deployment',
    'Full-Stack', 'Rapid Prototyping', 'GUI', 'Offline', 'Text Generation',
    'Code Generation', 'Code Completion',
  ],
  interface: ['Web', 'Desktop', 'Mobile', 'CLI', 'API', 'IDE', 'IDE Extension'],
  functionality: [
    'Code Generation', 'Code Completion', 'Code Execution', 'Debugging', 'Refactoring', 'Documentation',
    'AI Chat', 'AI Assistant', 'Text Generation', 'Translation', 'Image Generation', 'Video Generation',
    'Deployment', 'Database Setup', 'Authentication', 'Collaboration', 'UI Prototyping',
    'Model Management', 'Local Inference', 'API Server', 'Model Customization',
    'Chat Interface', 'Document RAG', 'App Generation', 'AWS Support',
  ],
  deployment: ['Cloud', 'Local', 'Self-Hosted'],
  industries: [
    'Technology', 'Software Development', 'Startups', 'Education', 'Research',
    'Remote Work', 'Innovation', 'Small Business', 'Enterprise', 'Consulting',
    'Privacy-Focused', 'Edge Computing', 'Business', 'Non-Profit', 'Venture Capital',
    'Incubators', 'Content Creation',
  ],
  userTypes: [
    'Developers', 'Software Engineers', 'Full-Stack Developers', 'AI Engineers',
    'Researchers', 'Privacy Advocates', 'UX Designers', 'Entrepreneurs',
    'Product Managers', 'Non-Technical Founders', 'Rapid Prototypers',
    'Business Owners', 'Startup Teams', 'Students', 'Teachers', 'Remote Teams',
    'Non-Technical Users', 'Freelancers', 'Consultants', 'General Users', 'Professionals',
  ],
  pricingModels: ['Free', 'Freemium', 'Paid'] as const,
  billingPeriods: ['Monthly', 'Yearly'] as const,
  statuses: ['active', 'beta', 'deprecated', 'discontinued'] as const,
};

// Pricing tier schema
export const PricingTierSchema = z.object({
  tier: z.string().min(1, 'Tier name is required'),
  billingPeriod: z.enum(CONTROLLED_VOCABULARIES.billingPeriods),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
});

// Tool form schema
export const ToolFormSchema = z.object({
  // Identity fields
  id: z
    .string()
    .min(1, 'ID is required')
    .max(100, 'ID must be at most 100 characters')
    .regex(/^[a-z0-9-]+$/, 'ID must contain only lowercase letters, numbers, and hyphens'),

  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(200, 'Description must be at most 200 characters'),

  longDescription: z
    .string()
    .min(50, 'Long description must be at least 50 characters')
    .max(2000, 'Long description must be at most 2000 characters')
    .optional()
    .or(z.literal('')),

  tagline: z
    .string()
    .max(100, 'Tagline must be at most 100 characters')
    .optional()
    .or(z.literal('')),

  // Categorization
  categories: z
    .array(z.string())
    .min(1, 'At least one category is required')
    .max(5, 'At most 5 categories allowed'),

  industries: z
    .array(z.string())
    .min(1, 'At least one industry is required')
    .max(10, 'At most 10 industries allowed'),

  userTypes: z
    .array(z.string())
    .min(1, 'At least one user type is required')
    .max(10, 'At most 10 user types allowed'),

  // Pricing
  pricing: z
    .array(PricingTierSchema)
    .min(1, 'At least one pricing tier is required'),

  pricingModel: z.enum(CONTROLLED_VOCABULARIES.pricingModels),

  pricingUrl: z
    .string()
    .url('Pricing URL must be a valid URL')
    .optional()
    .or(z.literal('')),

  // Technical specifications
  interface: z
    .array(z.string())
    .min(1, 'At least one interface is required'),

  functionality: z
    .array(z.string())
    .min(1, 'At least one functionality is required'),

  deployment: z
    .array(z.string())
    .min(1, 'At least one deployment option is required'),

  // Metadata
  logoUrl: z
    .string()
    .url('Logo URL must be a valid URL')
    .optional()
    .or(z.literal('')),

  website: z
    .string()
    .url('Website must be a valid URL')
    .optional()
    .or(z.literal('')),

  documentation: z
    .string()
    .url('Documentation URL must be a valid URL')
    .optional()
    .or(z.literal('')),

  status: z.enum(CONTROLLED_VOCABULARIES.statuses).default('active'),

  contributor: z.string().min(1, 'Contributor is required').default('system'),
});

// Type exports
export type ToolFormValues = z.infer<typeof ToolFormSchema>;
export type PricingTier = z.infer<typeof PricingTierSchema>;

// Default form values
export const defaultToolFormValues: Partial<ToolFormValues> = {
  id: '',
  name: '',
  description: '',
  longDescription: '',
  tagline: '',
  categories: [],
  industries: [],
  userTypes: [],
  pricing: [{ tier: 'Free', billingPeriod: 'Monthly', price: 0 }],
  pricingModel: 'Free',
  pricingUrl: '',
  interface: [],
  functionality: [],
  deployment: [],
  logoUrl: '',
  website: '',
  documentation: '',
  status: 'active',
  contributor: 'system',
};
