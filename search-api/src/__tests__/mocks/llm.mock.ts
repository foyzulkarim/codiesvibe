/**
 * Mock LLM Service for Testing
 * Provides deterministic responses for intent extraction and query planning
 */

export class MockLLMService {
  /**
   * Mock intent extraction responses
   */
  static mockIntentExtractionResponses: Record<string, any> = {
    'free cli tools': {
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
    'AI tools under $50 per month': {
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
    'code editor between $20-100 monthly': {
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
    'Cursor alternative but cheaper': {
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
  };

  /**
   * Mock query planning responses
   */
  static mockQueryPlanResponses: Record<string, any> = {
    identity_focused: {
      strategy: 'identity-focused',
      vectorSources: [
        {
          collection: 'tools',
          embeddingType: 'semantic',
          queryVectorSource: 'query_text',
          topK: 70,
        },
      ],
      structuredSources: [],
      reranker: null,
      fusion: 'none',
      maxRefinementCycles: 0,
      explanation: 'Identity-focused search for tool discovery',
      confidence: 0.8,
    },
    with_price_filters: {
      strategy: 'hybrid',
      vectorSources: [
        {
          collection: 'tools',
          embeddingType: 'semantic',
          queryVectorSource: 'query_text',
          topK: 70,
        },
      ],
      structuredSources: [
        {
          source: 'mongodb',
          filters: [
            {
              field: 'pricing',
              operator: 'elemMatch',
              value: {
                price: { $lt: 50 },
                billingPeriod: 'Monthly',
              },
            },
          ],
          limit: 100,
        },
      ],
      reranker: null,
      fusion: 'weighted_sum',
      maxRefinementCycles: 0,
      explanation: 'Hybrid search with price filtering',
      confidence: 0.85,
    },
  };

  /**
   * Create a mock LLM client that returns deterministic responses
   */
  static createMockClient(responseType: 'intent' | 'plan' = 'intent') {
    return {
      invoke: jest.fn().mockImplementation(async (input: any) => {
        if (responseType === 'intent') {
          const query =
            input.query || input.user_query || input.text || 'free cli tools';
          const cleanQuery = query.replace('Extract the intent from this query: "', '').replace('"', '');
          return (
            MockLLMService.mockIntentExtractionResponses[cleanQuery] ||
            MockLLMService.mockIntentExtractionResponses['free cli tools']
          );
        } else {
          return MockLLMService.mockQueryPlanResponses.identity_focused;
        }
      }),
    };
  }

  /**
   * Mock the LLM service module
   */
  static mockLLMServiceModule() {
    return {
      llmService: {
        createTogetherAILangchainClient: jest
          .fn()
          .mockReturnValue(MockLLMService.createMockClient('intent')),
        createStructuredClient: jest
          .fn()
          .mockReturnValue(MockLLMService.createMockClient('plan')),
        createClient: jest
          .fn()
          .mockReturnValue(MockLLMService.createMockClient('intent')),
      },
    };
  }
}
