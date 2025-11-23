import { z } from 'zod';
import { CONTROLLED_VOCABULARIES } from '../shared/constants/controlled-vocabularies';

// Pricing tier schema
export const PricingSchema = z.object({
  tier: z.string().min(1, 'Tier name is required'),
  billingPeriod: z.enum(CONTROLLED_VOCABULARIES.billingPeriods as [string, ...string[]], {
    errorMap: () => ({ message: `billingPeriod must be one of: ${CONTROLLED_VOCABULARIES.billingPeriods.join(', ')}` }),
  }),
  price: z.number().min(0, 'Price must be non-negative'),
});

// Create tool schema
export const CreateToolSchema = z.object({
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

  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be at most 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),

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
    .array(z.enum(CONTROLLED_VOCABULARIES.categories as [string, ...string[]]))
    .min(1, 'At least one category is required')
    .max(5, 'At most 5 categories allowed'),

  industries: z
    .array(z.enum(CONTROLLED_VOCABULARIES.industries as [string, ...string[]]))
    .min(1, 'At least one industry is required')
    .max(10, 'At most 10 industries allowed'),

  userTypes: z
    .array(z.enum(CONTROLLED_VOCABULARIES.userTypes as [string, ...string[]]))
    .min(1, 'At least one user type is required')
    .max(10, 'At most 10 user types allowed'),

  // Pricing
  pricing: z
    .array(PricingSchema)
    .min(1, 'At least one pricing tier is required'),

  pricingModel: z.enum(CONTROLLED_VOCABULARIES.pricingModels as [string, ...string[]], {
    errorMap: () => ({ message: `pricingModel must be one of: ${CONTROLLED_VOCABULARIES.pricingModels.join(', ')}` }),
  }),

  pricingUrl: z
    .string()
    .url('Pricing URL must be a valid URL')
    .optional()
    .or(z.literal('')),

  // Technical specifications
  interface: z
    .array(z.enum(CONTROLLED_VOCABULARIES.interface as [string, ...string[]]))
    .min(1, 'At least one interface is required'),

  functionality: z
    .array(z.enum(CONTROLLED_VOCABULARIES.functionality as [string, ...string[]]))
    .min(1, 'At least one functionality is required'),

  deployment: z
    .array(z.enum(CONTROLLED_VOCABULARIES.deployment as [string, ...string[]]))
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

  status: z
    .enum(['active', 'beta', 'deprecated', 'discontinued'])
    .default('active'),

  contributor: z
    .string()
    .min(1, 'Contributor is required')
    .default('system'),
});

// Update tool schema (all fields optional)
export const UpdateToolSchema = CreateToolSchema.partial();

// Query parameters schema for listing tools
export const GetToolsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'dateAdded', 'status']).default('dateAdded'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['active', 'beta', 'deprecated', 'discontinued']).optional(),
  category: z.string().optional(),
  industry: z.string().optional(),
  pricingModel: z.enum(['Free', 'Freemium', 'Paid']).optional(),
});

// Type exports
export type CreateToolInput = z.infer<typeof CreateToolSchema>;
export type UpdateToolInput = z.infer<typeof UpdateToolSchema>;
export type GetToolsQuery = z.infer<typeof GetToolsQuerySchema>;
