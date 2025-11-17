/**
 * Intent State Fixtures for Testing
 * Sample intent states for various query scenarios
 */

export const intentStateFixtures = {
  /**
   * Simple query: "free cli tools"
   */
  freeCliTools: {
    primaryGoal: 'find',
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    pricingModel: 'Free',
    billingPeriod: null,
    priceRange: null,
    priceComparison: null,
    category: null,
    interface: 'CLI',
    functionality: '',
    deployment: null,
    industry: null,
    userType: null,
    semanticVariants: ['command line tools', 'terminal tools'],
    constraints: [],
    confidence: 0.9,
  },

  /**
   * Price comparison query: "AI tools under $50 per month"
   */
  aiToolsUnder50: {
    primaryGoal: 'find',
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    pricingModel: null,
    billingPeriod: null,
    priceRange: null,
    priceComparison: {
      operator: 'less_than',
      value: 50,
      currency: 'USD',
      billingPeriod: 'Monthly',
    },
    category: null,
    interface: null,
    functionality: 'AI Integration',
    deployment: null,
    industry: null,
    userType: null,
    semanticVariants: [],
    constraints: [],
    confidence: 0.9,
  },

  /**
   * Price range query: "code editor between $20-100 monthly"
   */
  codeEditorPriceRange: {
    primaryGoal: 'find',
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    pricingModel: null,
    billingPeriod: null,
    priceRange: {
      min: 20,
      max: 100,
      currency: 'USD',
      billingPeriod: 'Monthly',
    },
    priceComparison: null,
    category: 'Code Editor',
    interface: null,
    functionality: '',
    deployment: null,
    industry: null,
    userType: null,
    semanticVariants: [],
    constraints: [],
    confidence: 0.8,
  },

  /**
   * Comparison query: "Cursor alternative but cheaper"
   */
  cursorAlternativeCheaper: {
    primaryGoal: 'find',
    referenceTool: 'Cursor IDE',
    comparisonMode: 'alternative_to',
    filters: [],
    pricingModel: null,
    billingPeriod: null,
    priceRange: null,
    priceComparison: {
      operator: 'less_than',
      value: 20,
      currency: 'USD',
      billingPeriod: 'Monthly',
    },
    category: 'Code Editor',
    interface: null,
    functionality: 'Code Generation',
    deployment: null,
    industry: null,
    userType: null,
    semanticVariants: [],
    constraints: ['cheaper'],
    confidence: 0.8,
  },

  /**
   * Multi-constraint query: "free offline AI code generator"
   */
  freeOfflineAiCodeGen: {
    primaryGoal: 'find',
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    pricingModel: 'Free',
    billingPeriod: null,
    priceRange: null,
    priceComparison: null,
    category: null,
    interface: null,
    functionality: 'Code Generation',
    deployment: 'Self-Hosted',
    industry: null,
    userType: null,
    semanticVariants: [],
    constraints: ['offline', 'local inference'],
    confidence: 0.9,
  },

  /**
   * Edge case: Empty intent (minimal data)
   */
  emptyIntent: {
    primaryGoal: null,
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    pricingModel: null,
    billingPeriod: null,
    priceRange: null,
    priceComparison: null,
    category: null,
    interface: null,
    functionality: '',
    deployment: null,
    industry: null,
    userType: null,
    semanticVariants: [],
    constraints: [],
    confidence: 0.3,
  },

  /**
   * Edge case: Invalid category (not in controlled vocabulary)
   */
  invalidCategory: {
    primaryGoal: 'find',
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    pricingModel: null,
    billingPeriod: null,
    priceRange: null,
    priceComparison: null,
    category: 'Code Editing Tool', // Invalid - not in controlled vocabulary
    interface: 'CLI',
    functionality: '',
    deployment: null,
    industry: null,
    userType: null,
    semanticVariants: [],
    constraints: [],
    confidence: 0.7,
  },

  /**
   * Price comparison: Greater than operator
   */
  expensiveTools: {
    primaryGoal: 'find',
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    pricingModel: null,
    billingPeriod: null,
    priceRange: null,
    priceComparison: {
      operator: 'greater_than',
      value: 100,
      currency: 'USD',
      billingPeriod: 'Monthly',
    },
    category: null,
    interface: null,
    functionality: '',
    deployment: null,
    industry: null,
    userType: null,
    semanticVariants: [],
    constraints: [],
    confidence: 0.8,
  },

  /**
   * Price comparison: Around operator
   */
  aroundThirtyDollars: {
    primaryGoal: 'find',
    referenceTool: null,
    comparisonMode: null,
    filters: [],
    pricingModel: null,
    billingPeriod: null,
    priceRange: null,
    priceComparison: {
      operator: 'around',
      value: 30,
      currency: 'USD',
      billingPeriod: 'Monthly',
    },
    category: 'API',
    interface: null,
    functionality: '',
    deployment: null,
    industry: null,
    userType: null,
    semanticVariants: [],
    constraints: [],
    confidence: 0.85,
  },
};
