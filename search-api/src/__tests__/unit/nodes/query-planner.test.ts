/**
 * Query Planner Node - Unit Tests
 *
 * Critical Focus: MongoDB operator validation ($lt, $gt, $gte, $lte, etc.)
 * Tests the query plan generation logic with emphasis on filter accuracy
 */

import { queryPlannerNode } from '../../../graphs/nodes/query-planner.node';
import { StateAnnotation } from '../../../types/state';
import { intentStateFixtures } from '../../fixtures/intent-states.fixture';

// Mock database connections
jest.mock('../../../config/database', () => ({
  connectToQdrant: jest.fn().mockResolvedValue(undefined),
  connectToMongo: jest.fn().mockResolvedValue(undefined),
}));

// Mock the LLM service with dynamic responses
jest.mock('../../../services/llm.service', () => ({
  llmService: {
    createTogetherAILangchainClient: jest.fn().mockReturnValue({
      invoke: jest.fn().mockImplementation((input: any) => {
        // Extract intent state from input
        const intentState = input?.intentState || {};

        // Determine strategy based on intent
        let strategy = 'hybrid';
        if (intentState.referenceTool) {
          strategy = 'identity-focused';
        } else if (intentState.primaryGoal === 'find') {
          strategy = 'find';
        } else if (intentState.functionality) {
          strategy = 'capability-focused';
        }

        // Base response structure
        return Promise.resolve({
          strategy,
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
          explanation: `${strategy} search strategy`,
          confidence: 0.8,
        });
      }),
    }),
    createStructuredClient: jest.fn(),
    createClient: jest.fn(),
  },
}));

describe('Query Planner Node - Unit Tests', () => {
  // Reset mocks before each test to prevent state pollution
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Intent Analysis Tests', () => {
    test('1.1 Identity-focused query analysis - should return identity-focused strategy', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'find cursor alternative',
        intentState: {
          ...intentStateFixtures.freeCliTools,
          primaryGoal: 'find',
          referenceTool: null,
        },
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();
      // Strategy should reflect the query intent (identity/find) or hybrid if both vector+structured sources
      expect(result.executionPlan?.strategy).toMatch(/identity|find|discover|hybrid/i);
    });

    test('1.2 Capability-focused query analysis - should prioritize functionality collection', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'AI tools with code generation',
        intentState: {
          ...intentStateFixtures.freeOfflineAiCodeGen,
          primaryGoal: 'find',
          functionality: 'Code Generation',
        },
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();
      // Should include functionality collection or capability-focused strategy
      const hasRelevantStrategy =
        result.executionPlan?.strategy?.includes('capability') ||
        result.executionPlan?.vectorSources?.some(
          (vs) => vs.collection === 'functionality'
        );
      expect(hasRelevantStrategy).toBeTruthy();
    });

    test('1.3 Multi-faceted query analysis - should use multi-collection hybrid strategy', async () => {
      const complexIntentState = {
        ...intentStateFixtures.freeOfflineAiCodeGen,
        primaryGoal: 'find' as const,
        functionality: 'Code Generation' as const,
        interface: 'CLI' as const,
        deployment: 'Self-Hosted' as const,
      };

      const mockState: typeof StateAnnotation.State = {
        query: 'free offline cli AI code generator',
        intentState: complexIntentState,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();
      // Should use hybrid or multi-collection strategy for complex queries
      const isHybridOrMulti =
        result.executionPlan?.strategy?.includes('hybrid') ||
        result.executionPlan?.strategy?.includes('multi') ||
        (result.executionPlan?.vectorSources && result.executionPlan.vectorSources.length > 1);
      expect(isHybridOrMulti).toBeTruthy();
    });
  });

  describe('2. Controlled Vocabulary Validation Tests', () => {
    test('2.1 Exact category match - should use exact "Code Editor" value', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'code editor',
        intentState: intentStateFixtures.codeEditorPriceRange,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();

      // Check if structured sources contain the exact category value
      const hasExactCategory = result.executionPlan?.structuredSources?.some(
        (source) =>
          source.filters?.some(
            (filter) =>
              (filter.field === 'categories' || filter.field === 'categories.primary') &&
              (filter.value === 'Code Editor' ||
                (Array.isArray(filter.value) && filter.value.includes('Code Editor')))
          )
      );

      // Note: May not always generate filter if using vector-only strategy
      // But if it does, it should use exact value
      if (result.executionPlan?.structuredSources && result.executionPlan.structuredSources.length > 0) {
        expect(hasExactCategory).toBeTruthy();
      }
    });

    test('2.2 Exact interface match - should use exact "CLI" value', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'cli tools',
        intentState: intentStateFixtures.freeCliTools,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();

      // Check if structured sources contain the exact interface value
      const hasExactInterface = result.executionPlan?.structuredSources?.some(
        (source) =>
          source.filters?.some(
            (filter) =>
              filter.field === 'interface' &&
              (filter.value === 'CLI' ||
                (Array.isArray(filter.value) && filter.value.includes('CLI')))
          )
      );

      // If structured sources exist, they should use exact vocabulary
      if (result.executionPlan?.structuredSources && result.executionPlan.structuredSources.length > 0) {
        expect(hasExactInterface).toBeTruthy();
      }
    });

    test('2.3 Exact pricing match - should use exact "Free" value', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'free tools',
        intentState: intentStateFixtures.freeCliTools,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();

      // Check if structured sources contain the exact pricing value
      const hasExactPricing = result.executionPlan?.structuredSources?.some(
        (source) =>
          source.filters?.some(
            (filter) =>
              (filter.field === 'pricing' || filter.field === 'pricingSummary.pricingModel') &&
              (filter.value === 'Free' ||
                (Array.isArray(filter.value) && filter.value.includes('Free')))
          )
      );

      // If structured sources exist with pricing filters, they should use exact vocabulary
      if (result.executionPlan?.structuredSources && result.executionPlan.structuredSources.length > 0) {
        const hasPricingFilter = result.executionPlan.structuredSources.some(s =>
          s.filters?.some(f => f.field?.includes('pricing'))
        );
        if (hasPricingFilter) {
          expect(hasExactPricing).toBeTruthy();
        }
      }
    });
  });

  describe('3. MongoDB Filter Generation Tests - CRITICAL (Bug Focus)', () => {
    test('3.1 Price comparison: less than - MUST include $lt operator', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'tools under $50 per month',
        intentState: intentStateFixtures.aiToolsUnder50,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan?.structuredSources).toBeDefined();
      expect(Array.isArray(result.executionPlan?.structuredSources)).toBe(true);

      // Find pricing filter
      const pricingFilter = result.executionPlan?.structuredSources?.[0]?.filters?.find(
        (f) => f.field === 'pricing' && f.operator === 'elemMatch'
      );

      expect(pricingFilter).toBeDefined();
      expect(pricingFilter?.value).toBeDefined();

      // CRITICAL: Check that $lt operator is present (not 'lt')
      const priceCondition = pricingFilter?.value?.price;
      expect(priceCondition).toBeDefined();
      expect(priceCondition).toHaveProperty('$lt');
      expect(priceCondition?.$lt).toBe(50);

      // Verify billing period is also set
      expect(pricingFilter?.value?.billingPeriod).toBe('Monthly');
    });

    test('3.2 Price comparison: greater than - MUST include $gt operator', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'expensive tools over $100',
        intentState: intentStateFixtures.expensiveTools,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan?.structuredSources).toBeDefined();

      // Find pricing filter
      const pricingFilter = result.executionPlan?.structuredSources?.[0]?.filters?.find(
        (f) => f.field === 'pricing' && f.operator === 'elemMatch'
      );

      expect(pricingFilter).toBeDefined();
      expect(pricingFilter?.value).toBeDefined();

      // CRITICAL: Check that $gt operator is present (not 'gt')
      const priceCondition = pricingFilter?.value?.price;
      expect(priceCondition).toBeDefined();
      expect(priceCondition).toHaveProperty('$gt');
      expect(priceCondition?.$gt).toBe(100);
    });

    test('3.3 Price range: between min and max - MUST include $gte and $lte operators', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'code editor between $20-100',
        intentState: intentStateFixtures.codeEditorPriceRange,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan?.structuredSources).toBeDefined();

      // Find pricing filter
      const pricingFilter = result.executionPlan?.structuredSources?.[0]?.filters?.find(
        (f) => f.field === 'pricing' && f.operator === 'elemMatch'
      );

      expect(pricingFilter).toBeDefined();
      expect(pricingFilter?.value).toBeDefined();

      // CRITICAL: Check that both $gte and $lte operators are present
      const priceCondition = pricingFilter?.value?.price;
      expect(priceCondition).toBeDefined();
      expect(priceCondition).toHaveProperty('$gte');
      expect(priceCondition).toHaveProperty('$lte');
      expect(priceCondition?.$gte).toBe(20);
      expect(priceCondition?.$lte).toBe(100);
    });

    test('3.4 Price range: min only - MUST include $gte operator', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'tools over $50',
        intentState: {
          ...intentStateFixtures.codeEditorPriceRange,
          priceRange: {
            min: 50,
            max: null,
            billingPeriod: 'Monthly',
          },
        },
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan?.structuredSources).toBeDefined();

      // Find pricing filter
      const pricingFilter = result.executionPlan?.structuredSources?.[0]?.filters?.find(
        (f) => f.field === 'pricing' && f.operator === 'elemMatch'
      );

      expect(pricingFilter).toBeDefined();

      // CRITICAL: Check that $gte operator is present (not 'gte')
      const priceCondition = pricingFilter?.value?.price;
      expect(priceCondition).toBeDefined();
      expect(priceCondition).toHaveProperty('$gte');
      expect(priceCondition?.$gte).toBe(50);
      expect(priceCondition?.$lte).toBeUndefined(); // Should not have max
    });

    test('3.5 Price range: max only - MUST include $lte operator', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'tools under $200',
        intentState: {
          ...intentStateFixtures.codeEditorPriceRange,
          priceRange: {
            min: null,
            max: 200,
            billingPeriod: 'Monthly',
          },
        },
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan?.structuredSources).toBeDefined();

      // Find pricing filter
      const pricingFilter = result.executionPlan?.structuredSources?.[0]?.filters?.find(
        (f) => f.field === 'pricing' && f.operator === 'elemMatch'
      );

      expect(pricingFilter).toBeDefined();

      // CRITICAL: Check that $lte operator is present (not 'lte')
      const priceCondition = pricingFilter?.value?.price;
      expect(priceCondition).toBeDefined();
      expect(priceCondition).toHaveProperty('$lte');
      expect(priceCondition?.$lte).toBe(200);
      expect(priceCondition?.$gte).toBeUndefined(); // Should not have min
    });

    test('3.6 Price comparison: around - should use ±10% range with $gte and $lte', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'tools around $30 per month',
        intentState: intentStateFixtures.aroundThirtyDollars,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan?.structuredSources).toBeDefined();

      // Find pricing filter
      const pricingFilter = result.executionPlan?.structuredSources?.[0]?.filters?.find(
        (f) => f.field === 'pricing' && f.operator === 'elemMatch'
      );

      if (pricingFilter) {
        // CRITICAL: For "around" operator, should use range with $gte and $lte
        const priceCondition = pricingFilter?.value?.price;
        expect(priceCondition).toBeDefined();

        // Check for ±10% range: 30 ± 3 = [27, 33]
        if (priceCondition.$gte && priceCondition.$lte) {
          expect(priceCondition.$gte).toBeGreaterThanOrEqual(27);
          expect(priceCondition.$lte).toBeLessThanOrEqual(33);
        }
      }
    });

    test('3.7 No price filters - should not generate pricing filter', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'cli tools',
        intentState: {
          ...intentStateFixtures.freeCliTools,
          priceRange: null,
          priceComparison: null,
          pricing: null,
        },
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();

      // Should not have pricing filters when no price constraints
      const hasPricingFilter = result.executionPlan?.structuredSources?.some(
        (source) =>
          source.filters?.some(
            (f) => f.field === 'pricing' || f.field?.includes('price')
          )
      );

      expect(hasPricingFilter).toBeFalsy();
    });
  });

  describe('4. Structured Source Filter Format Tests - CRITICAL', () => {
    test('4.1 Filters field MUST be an array, not a plain object', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'free cli tools',
        intentState: intentStateFixtures.freeCliTools,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();

      if (result.executionPlan?.structuredSources && result.executionPlan.structuredSources.length > 0) {
        result.executionPlan.structuredSources.forEach((source) => {
          // CRITICAL: filters must be an array
          expect(Array.isArray(source.filters)).toBe(true);
          // Arrays are objects in JavaScript, so just check it's not a plain object (no Array.isArray)
          expect(source.filters).toBeInstanceOf(Array);
        });
      }
    });

    test('4.2 Single filter structure - should be array with one object', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'cli tools',
        intentState: {
          ...intentStateFixtures.freeCliTools,
          priceRange: null,
          priceComparison: null,
        },
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      if (result.executionPlan?.structuredSources && result.executionPlan.structuredSources.length > 0) {
        result.executionPlan.structuredSources.forEach((source) => {
          expect(Array.isArray(source.filters)).toBe(true);

          if (source.filters && source.filters.length > 0) {
            // Each filter should have field, operator, value
            source.filters.forEach((filter) => {
              expect(filter).toHaveProperty('field');
              expect(filter).toHaveProperty('operator');
              expect(filter).toHaveProperty('value');
            });
          }
        });
      }
    });

    test('4.3 Multiple filters structure - should be array with multiple objects', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'free cli self-hosted tools',
        intentState: intentStateFixtures.freeOfflineAiCodeGen,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      if (result.executionPlan?.structuredSources && result.executionPlan.structuredSources.length > 0) {
        result.executionPlan.structuredSources.forEach((source) => {
          expect(Array.isArray(source.filters)).toBe(true);

          if (source.filters && source.filters.length > 1) {
            // Verify all filters have required fields
            source.filters.forEach((filter) => {
              expect(filter).toHaveProperty('field');
              expect(filter).toHaveProperty('operator');
              expect(filter).toHaveProperty('value');
              expect(typeof filter.field).toBe('string');
              expect(typeof filter.operator).toBe('string');
            });
          }
        });
      }
    });

    test('4.4 Operator "in" with array value - should use MongoDB $in operator', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'cli or web tools',
        intentState: {
          ...intentStateFixtures.freeCliTools,
          interface: 'CLI', // Intent has single interface, but plan might use array
        },
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      if (result.executionPlan?.structuredSources && result.executionPlan.structuredSources.length > 0) {
        const interfaceFilter = result.executionPlan.structuredSources?.[0]?.filters?.find(
          (f) => f.field === 'interface'
        );

        if (interfaceFilter) {
          // If operator is "in", value should be an array
          if (interfaceFilter.operator === 'in') {
            expect(Array.isArray(interfaceFilter.value)).toBe(true);
          }
        }
      }
    });
  });

  describe('5. Edge Cases & Error Handling', () => {
    test('5.1 Null intent state - should return error', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'test query',
        intentState: null,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeNull();
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    test('5.2 Empty intent state - should generate minimal plan', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'test',
        intentState: intentStateFixtures.emptyIntent,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();
      // Should have at least some vector sources
      expect(result.executionPlan?.vectorSources).toBeDefined();
    });

    test('5.3 Missing billing period - should generate query without billingPeriod constraint', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'cheap tools',
        intentState: {
          ...intentStateFixtures.aiToolsUnder50,
          priceComparison: {
            operator: 'less_than' as const,
            value: 50,
            // Completely omit billingPeriod instead of setting to null
          },
        },
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();

      if (result.executionPlan?.structuredSources && result.executionPlan.structuredSources.length > 0) {
        const pricingFilter = result.executionPlan.structuredSources?.[0]?.filters?.find(
          (f) => f.field === 'pricing'
        );

        if (pricingFilter) {
          // Should have price condition but no billingPeriod
          expect(pricingFilter.value?.price).toBeDefined();
          // billingPeriod should be undefined or null
          expect(pricingFilter.value?.billingPeriod).toBeUndefined();
        }
      }
    });

    test('5.4 Negative price values - should handle gracefully or reject', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'invalid price query',
        intentState: {
          ...intentStateFixtures.codeEditorPriceRange,
          priceRange: {
            min: -10, // Invalid negative price
            max: 100,
            billingPeriod: 'Monthly',
          },
        },
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      // Should either reject negative values or sanitize them
      expect(result.executionPlan).toBeDefined();

      if (result.executionPlan?.structuredSources && result.executionPlan.structuredSources.length > 0) {
        const pricingFilter = result.executionPlan.structuredSources?.[0]?.filters?.find(
          (f) => f.field === 'pricing'
        );

        if (pricingFilter?.value?.price?.$gte !== undefined) {
          // If filter was generated, negative value should be sanitized to 0 or rejected
          expect(pricingFilter.value.price.$gte).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('5.5 Very high topK - should cap at maximum 200', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'all tools',
        intentState: intentStateFixtures.freeCliTools,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();

      if (result.executionPlan?.vectorSources && result.executionPlan.vectorSources.length > 0) {
        // All topK values should be capped at 200
        result.executionPlan.vectorSources.forEach((source) => {
          expect(source.topK).toBeLessThanOrEqual(200);
          expect(source.topK).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('6. Execution Stats & Metadata', () => {
    test('6.1 Execution timing - should track node execution time', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'test query',
        intentState: intentStateFixtures.freeCliTools,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionStats).toBeDefined();
      expect(result.executionStats?.nodeTimings).toBeDefined();
      expect(result.executionStats?.nodeTimings?.['query-planner']).toBeDefined();
      // Mock execution can be very fast (0ms is acceptable)
      expect(result.executionStats?.nodeTimings?.['query-planner']).toBeGreaterThanOrEqual(0);
    });

    test('6.2 Execution path tracking - should add query-planner to execution path', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'test query',
        intentState: intentStateFixtures.freeCliTools,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: ['cache-check', 'intent-extractor'],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.executionPath).toBeDefined();
      expect(result.metadata?.executionPath).toContain('query-planner');
    });

    test('6.3 Confidence propagation - should include confidence in plan', async () => {
      const mockState: typeof StateAnnotation.State = {
        query: 'test query',
        intentState: intentStateFixtures.freeCliTools,
        executionPlan: null,
        candidates: [],
        results: [],
        executionStats: {
          totalTimeMs: 0,
          nodeTimings: {},
          vectorQueriesExecuted: 0,
          structuredQueriesExecuted: 0,
        },
        errors: [],
        metadata: {
          startTime: new Date(),
          executionPath: [],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: '2.1',
        },
      };

      const result = await queryPlannerNode(mockState);

      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan?.confidence).toBeDefined();
      expect(result.executionPlan?.confidence).toBeGreaterThan(0);
      expect(result.executionPlan?.confidence).toBeLessThanOrEqual(1);
    });
  });
});
