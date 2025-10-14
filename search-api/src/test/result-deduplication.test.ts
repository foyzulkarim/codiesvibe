/**
 * Tests for Enhanced Result Deduplication Utilities
 */

import {
  ResultDeduplicator,
  DeduplicationConfig,
  deduplicateResults,
  calculateResultSimilarity,
  mergeResultsWithRRF,
  createMultiVectorDeduplicationConfig,
  DeduplicationPerformanceMonitor,
  SourceAttribution,
  RRFMergeResult
} from '../utils/result-deduplication';

describe('ResultDeduplicator', () => {
  let deduplicator: ResultDeduplicator;
  let mockResults: any[];

  beforeEach(() => {
    deduplicator = new ResultDeduplicator();
    
    // Create mock search results
    mockResults = [
      {
        id: 'tool1',
        score: 0.9,
        vectorType: 'semantic',
        rank: 1,
        payload: {
          id: 'tool1',
          name: 'React Tool',
          description: 'A tool for React development',
          category: 'Development'
        }
      },
      {
        id: 'tool2',
        score: 0.8,
        vectorType: 'categories',
        rank: 1,
        payload: {
          id: 'tool2',
          name: 'Vue Tool',
          description: 'A tool for Vue development',
          category: 'Development'
        }
      },
      {
        id: 'tool1',
        score: 0.85,
        vectorType: 'functionality',
        rank: 2,
        payload: {
          id: 'tool1',
          name: 'React Tool',
          description: 'A tool for React development',
          category: 'Development'
        }
      },
      {
        id: 'tool3',
        score: 0.7,
        vectorType: 'semantic',
        rank: 3,
        payload: {
          id: 'tool3',
          name: 'Angular Tool',
          description: 'A tool for Angular development',
          category: 'Development'
        }
      },
      {
        id: 'tool4',
        score: 0.6,
        vectorType: 'aliases',
        rank: 1,
        payload: {
          id: 'tool4',
          name: 'React Dev Tool',
          description: 'Similar to React Tool',
          category: 'Development'
        }
      }
    ];
  });

  describe('Basic Deduplication', () => {
    it('should deduplicate results by ID', () => {
      const result = deduplicator.deduplicate(mockResults);
      
      expect(result.uniqueResults).toHaveLength(4); // tool1 appears twice, should be deduplicated
      expect(result.duplicatesRemoved).toBe(1);
      expect(result.strategy).toBe('hybrid');
      expect(result.totalResultsProcessed).toBe(5);
    });

    it('should use ID-based strategy', () => {
      deduplicator.updateConfig({ strategy: 'id_based' });
      const result = deduplicator.deduplicate(mockResults);
      
      expect(result.uniqueResults).toHaveLength(4);
      expect(result.strategy).toBe('id_based');
    });

    it('should use content-based strategy', () => {
      deduplicator.updateConfig({ strategy: 'content_based' });
      const result = deduplicator.deduplicate(mockResults);
      
      expect(result.uniqueResults).toHaveLength(4);
      expect(result.strategy).toBe('content_based');
    });
  });

  describe('RRF Enhanced Deduplication', () => {
    it('should merge scores using RRF', () => {
      deduplicator.updateConfig({ 
        strategy: 'rrf_enhanced',
        enableScoreMergin: true,
        enableSourceAttribution: true
      });
      
      const result = deduplicator.deduplicate(mockResults);
      
      expect(result.uniqueResults).toHaveLength(4);
      expect(result.strategy).toBe('rrf_enhanced');
      
      // Check that tool1 has merged scores and attribution
      const tool1Result = result.uniqueResults.find(r => r.id === 'tool1');
      expect(tool1Result).toBeDefined();
      expect(tool1Result.rrfScore).toBeGreaterThan(0);
      expect(tool1Result.weightedScore).toBeGreaterThan(0);
      expect(tool1Result.sources).toBeDefined();
      expect(tool1Result.sources).toHaveLength(2); // From semantic and functionality
    });

    it('should preserve source attribution', () => {
      deduplicator.updateConfig({ 
        strategy: 'rrf_enhanced',
        enableSourceAttribution: true
      });
      
      const result = deduplicator.deduplicate(mockResults);
      
      const tool1Result = result.uniqueResults.find(r => r.id === 'tool1');
      expect(tool1Result.sources).toHaveLength(2);
      
      const semanticSource = tool1Result.sources.find((s: SourceAttribution) => s.vectorType === 'semantic');
      const functionalitySource = tool1Result.sources.find((s: SourceAttribution) => s.vectorType === 'functionality');
      
      expect(semanticSource).toBeDefined();
      expect(functionalitySource).toBeDefined();
      expect(semanticSource.rank).toBe(1);
      expect(functionalitySource.rank).toBe(2);
    });

    it('should apply vector type specific thresholds', () => {
      deduplicator.updateConfig({ 
        strategy: 'rrf_enhanced',
        vectorTypeThresholds: {
          semantic: 0.9,
          categories: 0.8,
          functionality: 0.7,
          aliases: 0.6,
          composites: 0.5
        }
      });
      
      const result = deduplicator.deduplicate(mockResults);
      expect(result.uniqueResults).toHaveLength(4);
    });
  });

  describe('Performance Optimization', () => {
    it('should handle large result sets with batching', () => {
      // Create a large set of results
      const largeResults: any[] = [];
      for (let i = 0; i < 250; i++) {
        largeResults.push({
          id: `tool${i % 50}`, // Create duplicates
          score: Math.random(),
          vectorType: ['semantic', 'categories', 'functionality'][i % 3],
          rank: Math.floor(i / 50) + 1,
          payload: {
            id: `tool${i % 50}`,
            name: `Tool ${i % 50}`,
            description: `Description for tool ${i % 50}`,
            category: 'Development'
          }
        });
      }
      
      deduplicator.updateConfig({ 
        batchSize: 100,
        enableParallelProcessing: false
      });
      
      const result = deduplicator.deduplicate(largeResults);
      
      expect(result.uniqueResults.length).toBeLessThan(largeResults.length);
      expect(result.duplicatesRemoved).toBeGreaterThan(0);
      expect(result.deduplicationTime).toBeGreaterThan(0);
    });
  });

  describe('Similarity Calculation', () => {
    it('should calculate field similarity correctly', () => {
      const similarity = deduplicator.calculateFieldSimilarity('React Tool', 'React Dev Tool', 'name');
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle exact matches', () => {
      const similarity = deduplicator.calculateFieldSimilarity('React Tool', 'React Tool', 'name');
      expect(similarity).toBe(1.0);
    });

    it('should handle category matches', () => {
      const similarity = deduplicator.calculateFieldSimilarity('Development', 'Development', 'category');
      expect(similarity).toBe(1.0);
      
      const noMatch = deduplicator.calculateFieldSimilarity('Development', 'Design', 'category');
      expect(noMatch).toBe(0.0);
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig: Partial<DeduplicationConfig> = {
        similarityThreshold: 0.95,
        strategy: 'id_based',
        rrfKValue: 100
      };
      
      deduplicator.updateConfig(newConfig);
      const config = deduplicator.getConfig();
      
      expect(config.similarityThreshold).toBe(0.95);
      expect(config.strategy).toBe('id_based');
      expect(config.rrfKValue).toBe(100);
    });

    it('should get field value from result', () => {
      const result = mockResults[0];
      const name = deduplicator.getFieldValue(result, 'name');
      expect(name).toBe('React Tool');
      
      const category = deduplicator.getFieldValue(result, 'category');
      expect(category).toBe('Development');
    });
  });
});

describe('Utility Functions', () => {
  describe('deduplicateResults', () => {
    it('should deduplicate results with default config', () => {
      const mockResults = [
        { id: 'tool1', payload: { name: 'Tool 1' } },
        { id: 'tool1', payload: { name: 'Tool 1' } },
        { id: 'tool2', payload: { name: 'Tool 2' } }
      ];
      
      const result = deduplicateResults(mockResults);
      expect(result.uniqueResults).toHaveLength(2);
      expect(result.duplicatesRemoved).toBe(1);
    });

    it('should use custom config', () => {
      const mockResults = [
        { id: 'tool1', payload: { name: 'Tool 1' } },
        { id: 'tool1', payload: { name: 'Tool 1' } },
        { id: 'tool2', payload: { name: 'Tool 2' } }
      ];
      
      const result = deduplicateResults(mockResults, { 
        strategy: 'id_based',
        similarityThreshold: 0.95 
      });
      
      expect(result.strategy).toBe('id_based');
      expect(result.similarityThreshold).toBe(0.95);
    });
  });

  describe('calculateResultSimilarity', () => {
    it('should calculate similarity between results', () => {
      const result1 = {
        payload: {
          name: 'React Tool',
          description: 'A tool for React development',
          category: 'Development'
        }
      };
      
      const result2 = {
        payload: {
          name: 'React Dev Tool',
          description: 'A tool for React development',
          category: 'Development'
        }
      };
      
      const similarity = calculateResultSimilarity(result1, result2);
      expect(similarity.similarity).toBeGreaterThan(0);
      expect(similarity.similarity).toBeLessThan(1);
      expect(similarity.reason).toBeDefined();
      expect(similarity.fields).toBeDefined();
    });

    it('should handle identical results', () => {
      const result = {
        payload: {
          name: 'React Tool',
          description: 'A tool for React development',
          category: 'Development'
        }
      };
      
      const similarity = calculateResultSimilarity(result, result);
      expect(similarity.similarity).toBe(1.0);
    });
  });

  describe('mergeResultsWithRRF', () => {
    it('should merge results using RRF', () => {
      const resultsByVectorType = {
        semantic: [
          { id: 'tool1', score: 0.9, payload: { name: 'Tool 1' } },
          { id: 'tool2', score: 0.8, payload: { name: 'Tool 2' } }
        ],
        categories: [
          { id: 'tool1', score: 0.7, payload: { name: 'Tool 1' } },
          { id: 'tool3', score: 0.6, payload: { name: 'Tool 3' } }
        ]
      };
      
      const merged = mergeResultsWithRRF(resultsByVectorType, 60, { semantic: 1.0, categories: 0.8 });
      
      expect(merged).toHaveLength(3);
      
      const tool1Merge = merged.find(m => m.id === 'tool1');
      expect(tool1Merge).toBeDefined();
      expect(tool1Merge.rrfScore).toBeGreaterThan(0);
      expect(tool1Merge.weightedScore).toBeGreaterThan(0);
      expect(tool1Merge.sources).toHaveLength(2);
      expect(tool1Merge.mergedFromCount).toBe(2);
    });

    it('should sort by weighted score', () => {
      const resultsByVectorType = {
        semantic: [
          { id: 'tool1', score: 0.9, payload: { name: 'Tool 1' } },
          { id: 'tool2', score: 0.8, payload: { name: 'Tool 2' } }
        ],
        categories: [
          { id: 'tool3', score: 0.95, payload: { name: 'Tool 3' } },
          { id: 'tool4', score: 0.7, payload: { name: 'Tool 4' } }
        ]
      };
      
      const merged = mergeResultsWithRRF(resultsByVectorType);
      
      // Results should be sorted by weighted score
      for (let i = 1; i < merged.length; i++) {
        expect(merged[i-1].weightedScore).toBeGreaterThanOrEqual(merged[i].weightedScore);
      }
    });
  });

  describe('createMultiVectorDeduplicationConfig', () => {
    it('should create default config', () => {
      const config = createMultiVectorDeduplicationConfig();
      
      expect(config.strategy).toBe('rrf_enhanced');
      expect(config.similarityThreshold).toBe(0.8);
      expect(config.rrfKValue).toBe(60);
      expect(config.enableScoreMergin).toBe(true);
      expect(config.enableSourceAttribution).toBe(true);
    });

    it('should create custom config', () => {
      const config = createMultiVectorDeduplicationConfig({
        similarityThreshold: 0.9,
        rrfKValue: 100,
        enableScoreMerging: false,
        batchSize: 200
      });
      
      expect(config.similarityThreshold).toBe(0.9);
      expect(config.rrfKValue).toBe(100);
      expect(config.enableScoreMergin).toBe(false);
      expect(config.batchSize).toBe(200);
    });
  });
});

describe('DeduplicationPerformanceMonitor', () => {
  let monitor: DeduplicationPerformanceMonitor;

  beforeEach(() => {
    monitor = new DeduplicationPerformanceMonitor();
  });

  it('should record and retrieve metrics', () => {
    const metrics = {
      totalProcessed: 100,
      uniqueResults: 80,
      duplicatesRemoved: 20,
      processingTime: 50,
      averageSimilarityScore: 0.85,
      batchCount: 2
    };
    
    monitor.recordMetrics(metrics);
    const retrieved = monitor.getMetrics();
    
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0]).toEqual(metrics);
  });

  it('should calculate average metrics', () => {
    const metrics1 = {
      totalProcessed: 100,
      uniqueResults: 80,
      duplicatesRemoved: 20,
      processingTime: 50,
      averageSimilarityScore: 0.85,
      batchCount: 2
    };
    
    const metrics2 = {
      totalProcessed: 200,
      uniqueResults: 160,
      duplicatesRemoved: 40,
      processingTime: 100,
      averageSimilarityScore: 0.90,
      batchCount: 4
    };
    
    monitor.recordMetrics(metrics1);
    monitor.recordMetrics(metrics2);
    
    const average = monitor.getAverageMetrics();
    expect(average).toBeDefined();
    expect(average!.totalProcessed).toBe(150);
    expect(average!.uniqueResults).toBe(120);
    expect(average!.duplicatesRemoved).toBe(30);
    expect(average!.processingTime).toBe(75);
    expect(average!.averageSimilarityScore).toBe(0.875);
    expect(average!.batchCount).toBe(3);
  });

  it('should handle empty metrics', () => {
    const average = monitor.getAverageMetrics();
    expect(average).toBeNull();
  });

  it('should limit stored metrics', () => {
    // Add more than 100 metrics
    for (let i = 0; i < 150; i++) {
      monitor.recordMetrics({
        totalProcessed: 100,
        uniqueResults: 80,
        duplicatesRemoved: 20,
        processingTime: 50,
        averageSimilarityScore: 0.85,
        batchCount: 2
      });
    }
    
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(100);
  });

  it('should clear metrics', () => {
    monitor.recordMetrics({
      totalProcessed: 100,
      uniqueResults: 80,
      duplicatesRemoved: 20,
      processingTime: 50,
      averageSimilarityScore: 0.85,
      batchCount: 2
    });
    
    expect(monitor.getMetrics()).toHaveLength(1);
    
    monitor.clear();
    expect(monitor.getMetrics()).toHaveLength(0);
  });
});

describe('Integration Tests', () => {
  it('should handle real-world multi-vector search scenario', () => {
    // Simulate results from different vector types
    const semanticResults = [
      { id: 'react-tool', score: 0.95, vectorType: 'semantic', rank: 1, payload: { name: 'React DevTools', description: 'Developer tools for React', category: 'Development' } },
      { id: 'vue-tool', score: 0.90, vectorType: 'semantic', rank: 2, payload: { name: 'Vue DevTools', description: 'Developer tools for Vue', category: 'Development' } },
      { id: 'angular-tool', score: 0.85, vectorType: 'semantic', rank: 3, payload: { name: 'Angular DevTools', description: 'Developer tools for Angular', category: 'Development' } }
    ];
    
    const categoryResults = [
      { id: 'react-tool', score: 0.88, vectorType: 'categories', rank: 1, payload: { name: 'React DevTools', description: 'Developer tools for React', category: 'Development' } },
      { id: 'webpack-tool', score: 0.82, vectorType: 'categories', rank: 2, payload: { name: 'Webpack Tool', description: 'Module bundler', category: 'Build Tools' } }
    ];
    
    const functionalityResults = [
      { id: 'react-tool', score: 0.92, vectorType: 'functionality', rank: 1, payload: { name: 'React DevTools', description: 'Developer tools for React', category: 'Development' } },
      { id: 'babel-tool', score: 0.78, vectorType: 'functionality', rank: 2, payload: { name: 'Babel Tool', description: 'JavaScript compiler', category: 'Development' } }
    ];
    
    const allResults = [...semanticResults, ...categoryResults, ...functionalityResults];
    
    // Use enhanced deduplication
    const config = createMultiVectorDeduplicationConfig({
      enableScoreMerging: true,
      enableSourceAttribution: true
    });
    
    const deduplicator = new ResultDeduplicator(config);
    const result = deduplicator.deduplicate(allResults);
    
    expect(result.uniqueResults).toHaveLength(5); // react-tool appears 3 times, should be deduplicated
    expect(result.duplicatesRemoved).toBe(2);
    expect(result.strategy).toBe('rrf_enhanced');
    
    // Check that React DevTools has merged attribution
    const reactTool = result.uniqueResults.find(r => r.id === 'react-tool');
    expect(reactTool).toBeDefined();
    expect(reactTool.sources).toHaveLength(3);
    expect(reactTool.rrfScore).toBeGreaterThan(0);
    expect(reactTool.weightedScore).toBeGreaterThan(0);
    
    // Check source attribution summary
    expect(result.sourceAttributionSummary.semantic).toBe(3);
    expect(result.sourceAttributionSummary.categories).toBe(2);
    expect(result.sourceAttributionSummary.functionality).toBe(2);
  });
});
