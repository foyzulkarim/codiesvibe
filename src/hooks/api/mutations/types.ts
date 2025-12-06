/**
 * Mutation Types for Tool Operations
 *
 * Defines TypeScript interfaces for CREATE, UPDATE, DELETE operations
 */

import { AITool } from '@/data/tools';
import { ToolResponseDto } from '@/api/types';

/**
 * Parameters for creating a new tool
 */
export interface CreateToolParams {
  // Core required fields
  name: string;
  slug: string;
  description: string;

  // Optional core fields
  longDescription?: string;
  tagline?: string;

  // v2.0 categorization
  categories: {
    primary: string[];
    secondary?: string[];
    industries?: string[];
    userTypes?: string[];
  };

  // Pricing information
  pricingSummary: {
    lowestMonthlyPrice: number;
    highestMonthlyPrice: number;
    currency: string;
    hasFreeTier: boolean;
    hasCustomPricing: boolean;
    billingPeriods: string[];
    pricingModel: ('Free' | 'Paid')[];
  };

  pricingDetails?: Array<{
    tier: string;
    monthlyPrice: number;
    annualPrice?: number;
    features: string[];
    limits?: Record<string, string | number>;
  }>;

  // Capabilities
  capabilities?: {
    core?: string[];
    aiFeatures?: {
      codeGeneration?: boolean;
      imageGeneration?: boolean;
      dataAnalysis?: boolean;
      voiceInteraction?: boolean;
      multimodal?: boolean;
      thinkingMode?: boolean;
    };
    technical?: {
      apiAccess?: boolean;
      webHooks?: boolean;
      sdkAvailable?: boolean;
      offlineMode?: boolean;
    };
    integrations?: {
      platforms?: string[];
      thirdParty?: string[];
      protocols?: string[];
    };
  };

  // Use cases
  useCases?: Array<{
    industry: string;
    scenario: string;
    description: string;
    complexity: 'beginner' | 'intermediate' | 'advanced';
  }>;

  // Search optimization
  searchKeywords?: string[];
  semanticTags?: string[];
  aliases?: string[];

  // Legacy fields (for backward compatibility)
  pricing?: string[];
  interface?: string[];
  functionality?: string[];
  deployment?: string[];
  popularity?: number;
  rating?: number;
  reviewCount?: number;

  // URLs and metadata
  logoUrl?: string;
  website?: string;
  documentation?: string;
  pricingUrl?: string;
  status?: 'active' | 'beta' | 'deprecated' | 'discontinued';
}

/**
 * Parameters for updating an existing tool
 * All fields are optional (partial update)
 */
export interface UpdateToolParams {
  id: string; // Required: which tool to update

  // All other fields are optional
  name?: string;
  slug?: string;
  description?: string;
  longDescription?: string;
  tagline?: string;

  categories?: Partial<{
    primary: string[];
    secondary: string[];
    industries: string[];
    userTypes: string[];
  }>;

  pricingSummary?: Partial<CreateToolParams['pricingSummary']>;
  pricingDetails?: CreateToolParams['pricingDetails'];

  capabilities?: Partial<CreateToolParams['capabilities']>;
  useCases?: CreateToolParams['useCases'];

  searchKeywords?: string[];
  semanticTags?: string[];
  aliases?: string[];

  pricing?: string[];
  interface?: string[];
  functionality?: string[];
  deployment?: string[];
  popularity?: number;
  rating?: number;
  reviewCount?: number;

  logoUrl?: string;
  website?: string;
  documentation?: string;
  pricingUrl?: string;
  status?: 'active' | 'beta' | 'deprecated' | 'discontinued';
}

/**
 * Parameters for deleting a tool
 */
export interface DeleteToolParams {
  id: string;
  /**
   * Soft delete (mark as deleted) vs hard delete (remove from database)
   * Default: false (hard delete)
   */
  soft?: boolean;
}

/**
 * Response from create/update operations
 */
export interface MutationResponse {
  success: boolean;
  data: AITool;
  message?: string;
}

/**
 * Response from delete operation
 */
export interface DeleteResponse {
  success: boolean;
  id: string;
  message?: string;
}

/**
 * Context for optimistic updates
 * Stores the previous state for rollback on error
 */
export interface OptimisticUpdateContext {
  previousTool?: AITool;
  previousTools?: AITool[];
}

/**
 * Mutation options that can be passed to mutation hooks
 */
export interface MutationHookOptions<TData, TVariables> {
  /**
   * Callback when mutation succeeds
   */
  onSuccess?: (data: TData, variables: TVariables) => void;

  /**
   * Callback when mutation fails
   */
  onError?: (error: Error, variables: TVariables) => void;

  /**
   * Callback before mutation starts (for optimistic updates)
   */
  onMutate?: (variables: TVariables) => void | Promise<OptimisticUpdateContext>;

  /**
   * Callback when mutation completes (success or error)
   */
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;

  /**
   * Enable optimistic updates
   * Default: false
   */
  optimistic?: boolean;

  /**
   * Show success toast notification
   * Default: true
   */
  showSuccessToast?: boolean;

  /**
   * Show error toast notification
   * Default: true
   */
  showErrorToast?: boolean;

  /**
   * Custom success message
   */
  successMessage?: string;

  /**
   * Custom error message
   */
  errorMessage?: string;
}
