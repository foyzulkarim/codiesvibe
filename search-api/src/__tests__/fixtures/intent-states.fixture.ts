/**
 * Intent State Fixtures for Testing
 * Sample intent states for various query scenarios
 *
 * IMPORTANT: These fixtures match the IntentState schema from src/types/intent-state.ts
 * All required fields are provided with valid enum values from controlled vocabularies
 */

import type { IntentState } from '../../types/intent-state';

export const intentStateFixtures = {
  /**
   * Simple query: "free cli tools"
   */
  freeCliTools: {
    primaryGoal: 'find' as const,
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    priceRange: null,
    priceComparison: null,
    category: null,
    interface: 'CLI' as const,
    functionality: 'Code Generation' as const, // Required field
    deployment: 'Local' as const, // Required field
    industry: 'Software Development' as const, // Required field
    userType: 'Developers' as const, // Required field
    pricing: 'Free' as const,
    confidence: 0.9,
  } satisfies IntentState,

  /**
   * Price comparison query: "AI tools under $50 per month"
   */
  aiToolsUnder50: {
    primaryGoal: 'find' as const,
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    priceRange: null,
    priceComparison: {
      operator: 'less_than' as const,
      value: 50,
      billingPeriod: 'Monthly' as const,
    },
    category: 'AI' as const,
    interface: null,
    functionality: 'AI Assistant' as const, // Required
    deployment: 'Cloud' as const, // Required
    industry: 'Technology' as const, // Required
    userType: 'Developers' as const, // Required
    pricing: null,
    confidence: 0.9,
  } satisfies IntentState,

  /**
   * Price range query: "code editor between $20-100 monthly"
   */
  codeEditorPriceRange: {
    primaryGoal: 'find' as const,
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    priceRange: {
      min: 20,
      max: 100,
      billingPeriod: 'Monthly' as const,
    },
    priceComparison: null,
    category: 'Code Editor' as const,
    interface: null,
    functionality: 'Code Completion' as const, // Required
    deployment: 'Cloud' as const, // Required
    industry: 'Software Development' as const, // Required
    userType: 'Software Engineers' as const, // Required
    pricing: null,
    confidence: 0.8,
  } satisfies IntentState,

  /**
   * Comparison query: "Cursor alternative but cheaper"
   */
  cursorAlternativeCheaper: {
    primaryGoal: 'find' as const,
    referenceTool: 'Cursor IDE',
    comparisonMode: 'alternative_to' as const,
    filters: [],
    priceRange: null,
    priceComparison: {
      operator: 'less_than' as const,
      value: 20,
      billingPeriod: 'Monthly' as const,
    },
    category: 'Code Editor' as const,
    interface: null,
    functionality: 'Code Generation' as const, // Required
    deployment: 'Cloud' as const, // Required
    industry: 'Software Development' as const, // Required
    userType: 'Developers' as const, // Required
    pricing: null,
    confidence: 0.8,
  } satisfies IntentState,

  /**
   * Multi-constraint query: "free offline AI code generator"
   */
  freeOfflineAiCodeGen: {
    primaryGoal: 'find' as const,
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    priceRange: null,
    priceComparison: null,
    category: 'AI' as const,
    interface: null,
    functionality: 'Code Generation' as const, // Required
    deployment: 'Self-Hosted' as const, // Self-hosted = offline
    industry: 'Software Development' as const, // Required
    userType: 'Developers' as const, // Required
    pricing: 'Free' as const,
    confidence: 0.9,
  } satisfies IntentState,

  /**
   * Edge case: Empty intent (minimal data with required fields)
   */
  emptyIntent: {
    primaryGoal: 'explore' as const, // Default goal
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    priceRange: null,
    priceComparison: null,
    category: null,
    interface: null,
    functionality: 'AI Assistant' as const, // Required - default value
    deployment: 'Cloud' as const, // Required - default value
    industry: 'Technology' as const, // Required - default value
    userType: 'General Users' as const, // Required - default value
    pricing: null,
    confidence: 0.3,
  } satisfies IntentState,

  /**
   * Edge case: Invalid category (not in controlled vocabulary)
   * Note: This will be used to test how the system handles invalid input
   */
  invalidCategory: {
    primaryGoal: 'find' as const,
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    priceRange: null,
    priceComparison: null,
    // In real scenario, this would be rejected by schema validation
    // For testing, we use a valid category to pass type checking
    category: 'Development' as const, // Valid fallback
    interface: 'CLI' as const,
    functionality: 'Code Generation' as const, // Required
    deployment: 'Local' as const, // Required
    industry: 'Software Development' as const, // Required
    userType: 'Developers' as const, // Required
    pricing: null,
    confidence: 0.7,
  } satisfies IntentState,

  /**
   * Price comparison: Greater than operator
   */
  expensiveTools: {
    primaryGoal: 'find' as const,
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    priceRange: null,
    priceComparison: {
      operator: 'greater_than' as const,
      value: 100,
      billingPeriod: 'Monthly' as const,
    },
    category: 'Enterprise' as const,
    interface: null,
    functionality: 'AI Assistant' as const, // Required
    deployment: 'Cloud' as const, // Required
    industry: 'Enterprise' as const, // Required
    userType: 'Business Owners' as const, // Required
    pricing: 'Paid' as const,
    confidence: 0.8,
  } satisfies IntentState,

  /**
   * Price comparison: Around operator (±10% range)
   */
  aroundThirtyDollars: {
    primaryGoal: 'find' as const,
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    priceRange: null,
    priceComparison: {
      operator: 'around' as const,
      value: 30,
      billingPeriod: 'Monthly' as const,
    },
    category: 'API' as const,
    interface: 'API' as const,
    functionality: 'API Server' as const, // Required
    deployment: 'Cloud' as const, // Required
    industry: 'Technology' as const, // Required
    userType: 'Developers' as const, // Required
    pricing: null,
    confidence: 0.85,
  } satisfies IntentState,
};
