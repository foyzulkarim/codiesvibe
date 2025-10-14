import { contextEnrichmentNode } from '../nodes/context-enrichment.node';
import { StateAnnotation } from '../types/state';

describe('Context Enrichment Node', () => {
  const mockState: typeof StateAnnotation.State = {
    query: 'React tools for frontend development',
    preprocessedQuery: 'React tools for frontend development',
    intent: {
      toolNames: ['React'],
      categories: ['development'],
      functionality: ['code-editing'],
      userTypes: ['developer'],
      interface: ['API'],
      deployment: ['Cloud'],
      isComparative: false,
      semanticQuery: 'React development tools',
      keywords: ['react', 'frontend', 'development'],
      excludeTools: [],
      priceConstraints: {
        hasFreeTier: true
      }
    },
    confidence: {
      overall: 0.8,
      breakdown: {
        toolNames: 0.9,
        categories: 0.8,
        functionality: 0.7
      }
    },
    extractionSignals: {
      nerResults: ['React', 'frontend'],
      fuzzyMatches: [],
      semanticCandidates: {},
      classificationScores: {},
      combinedScores: {},
      resolvedToolNames: ['React'],
      comparativeFlag: false,
      comparativeConfidence: 0.5,
      referenceTool: null,
      priceConstraints: {
        hasFreeTier: true
      },
      interfacePreferences: ['api'],
      deploymentPreferences: ['cloud']
    },
    routingDecision: 'optimal',
    plan: {
      steps: [],
      description: 'Search for React tools',
      mergeStrategy: 'weighted'
    },
    executionResults: [],
    queryResults: [],
    completion: {
      query: 'React tools for frontend development',
      strategy: 'semantic search',
      results: [],
      explanation: 'Search completed',
      metadata: {
        executionTime: '100ms',
        resultsCount: 0
      }
    },
    qualityAssessment: {
      resultCount: 0,
      averageRelevance: 0.8,
      categoryDiversity: 0.7,
      decision: 'accept'
    },
    iterations: {
      refinementAttempts: 0,
      expansionAttempts: 0,
      maxAttempts: 3
    },
    errors: [],
    metadata: {
      startTime: new Date(),
      executionPath: ['intent-extraction'],
      nodeExecutionTimes: {},
      threadId: 'test-thread-123',
      name: 'test-search'
    },
    entityStatistics: {},
    metadataContext: {
      searchSpaceSize: 0,
      metadataConfidence: 0,
      assumptions: [],
      lastUpdated: new Date(),
      enrichmentStrategy: 'qdrant_multi_vector',
      processingTime: 0
    }
  };

  it('should process entities from extraction signals', async () => {
    // Mock the context enrichment service
    jest.mock('../services/context-enrichment.service', () => ({
      contextEnrichmentService: {
        enrichContext: jest.fn().mockResolvedValue({
          entityStatistics: {
            semantic: {
              commonInterfaces: [{ interface: 'api', percentage: 80 }],
              commonPricing: [{ pricing: 'free', percentage: 60 }],
              commonCategories: [{ category: 'frontend', percentage: 90 }],
              totalCount: 100,
              confidence: 0.8,
              semanticMatches: 50,
              avgSimilarityScore: 0.75,
              source: 'semantic_search',
              sampleTools: ['React', 'Vue', 'Angular']
            }
          },
          metadataContext: {
            searchSpaceSize: 1000,
            metadataConfidence: 0.8,
            assumptions: ['User is looking for frontend tools'],
            lastUpdated: new Date(),
            enrichmentStrategy: 'qdrant_multi_vector',
            processingTime: 150
          }
        })
      }
    }));

    const result = await contextEnrichmentNode(mockState);

    expect(result).toHaveProperty('entityStatistics');
    expect(result).toHaveProperty('metadataContext');
    expect(result.metadata?.executionPath).toContain('context-enrichment');
    expect(result.metadata?.nodeExecutionTimes).toHaveProperty('context-enrichment');
  });

  it('should handle missing entities gracefully', async () => {
    const stateWithNoEntities = {
      ...mockState,
      extractionSignals: {
        ...mockState.extractionSignals,
        nerResults: [],
        resolvedToolNames: []
      }
    };

    const result = await contextEnrichmentNode(stateWithNoEntities);

    expect(result).toHaveProperty('entityStatistics');
    expect(result).toHaveProperty('metadataContext');
  });

  it('should handle errors and provide fallback', async () => {
    // Mock the context enrichment service to throw an error
    jest.mock('../services/context-enrichment.service', () => ({
      contextEnrichmentService: {
        enrichContext: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      }
    }));

    const result = await contextEnrichmentNode(mockState);

    expect(result).toHaveProperty('entityStatistics');
    expect(result).toHaveProperty('metadataContext');
    expect(result.metadataContext?.assumptions).toContain(
      expect.stringContaining('Fallback mode')
    );
  });

  it('should respect performance requirements', async () => {
    const startTime = Date.now();
    
    await contextEnrichmentNode(mockState);
    
    const executionTime = Date.now() - startTime;
    expect(executionTime).toBeLessThan(200); // Should complete within 200ms
  });
});
