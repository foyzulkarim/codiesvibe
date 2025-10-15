/**
 * Tests for result deduplication utilities
 * 
 * These tests verify the quality and accuracy of the deduplication algorithms
 * across different strategies and configurations.
 */

import {
  ResultDeduplicator,
  deduplicateResults,
  calculateResultSimilarity,
  mergeResultsWithRRF,
  createMultiVectorDeduplicationConfig,
  DeduplicationPerformanceMonitor,
  DeduplicationConfig,
  DeduplicationResult,
  SourceAttribution
} from '../result-deduplication';

describe('Result Deduplication Utilities', () => {
  // Sample test data
  const sampleResults = [
    {
      id: 'tool1',
      score: 0.9,
      vectorType: 'semantic',
      rank: 1,
      payload: {
        id: 'tool1',
        name: 'React',
        description: 'A JavaScript library for building user interfaces',
        category: 'frontend'
      }
    },
    {
      id: 'tool2',
      score: 0.85,
      vectorType: 'categories',
      rank: 1,
      payload: {
        id: 'tool2',
        name: 'React',
        description: 'JavaScript library for UI components',
        category: 'frontend'
      }
    },
    {
      id: 'tool3',
      score: 0.8,
      vectorType: 'functionality',
      rank: 2,
      payload: {
        id: 'tool3',
        name: 'Vue.js',
        description: 'Progressive JavaScript framework',
        category: 'frontend'
      }
    },
    {
      id: 'tool4',
      score: 0.75,
      vectorType: 'semantic',
      rank: 3,
      payload: {
        id: 'tool4',
        name: 'Angular',
        description: 'Platform for building mobile and desktop web applications',
        category: 'frontend'
      }
    },
    {
      id: 'tool5',
      score: 0.7,
      vectorType: 'aliases',
      rank: 1,
      payload: {
        id: 'tool5',
        name: 'ReactJS',
        description: 'A JavaScript library for building user interfaces',
        category: 'frontend'
      }
    }
  ];

  describe('ResultDeduplicator', () => {
    let deduplicator: ResultDeduplicator;

    beforeEach(() => {
      deduplicator = new ResultDeduplicator();
    });

    describe('ID-based deduplication', () => {
      it('should remove exact duplicates by ID', () => {
        const resultsWithDuplicates = [
          ...sampleResults,
          { ...sampleResults[0], score: 0.88, vectorType: 'composites' }
        ];

        const result = deduplicator.deduplicate(resultsWithDuplicates);

        expect(result.uniqueResults).toHaveLength(5);
        expect(result.duplicatesRemoved).toBe(1);
        expect(result.strategy).toBe('hybrid');
      });

      it('should handle results without IDs', () => {
        const resultsWithoutIds = [
          { score: 0.9, payload: { name: 'Tool A' } },
          { score: 0.8, payload: { name: 'Tool B' } }
        ];

        const result = deduplicator.deduplicate(resultsWithoutIds);

        expect(result.uniqueResults).toHaveLength(2);
        expect(result.duplicatesRemoved).toBe(0);
      });
    });

    describe('Content-based deduplication', () => {
      it('should detect similar content based on name and description', () => {
        const config: Partial<DeduplicationConfig> = {
          strategy: 'content_based',
          similarityThreshold: 0.8,
          fields: ['name', 'description']
        };

        const contentDeduplicator = new ResultDeduplicator(config);
        const result = contentDeduplicator.deduplicate(sampleResults);

        expect(result.uniqueResults.length).toBeLessThan(sampleResults.length);
        expect(result.duplicatesRemoved).toBeGreaterThan(0);
      });

      it('should preserve different content above threshold', () => {
        const differentResults = [
          {
            id: 'tool1',
            payload: { name: 'React', description: 'UI library', category: 'frontend' }
          },
          {
            id: 'tool2',
            payload: { name: 'Express', description: 'Web framework', category: 'backend' }
          },
          {
            id: 'tool3',
            payload: { name: 'MongoDB', description: 'Database', category: 'database' }
          }
        ];

        const result = deduplicator.deduplicate(differentResults);

        expect(result.uniqueResults).toHaveLength(3);
        expect(result.duplicatesRemoved).toBe(0);
      });
    });

    describe('Hybrid deduplication', () => {
      it('should combine ID and content-based deduplication', () => {
        const hybridConfig: Partial<DeduplicationConfig> = {
          strategy: 'hybrid',
          similarityThreshold: 0.7
        };

        const hybridDeduplicator = new ResultDeduplicator(hybridConfig);
        const result = hybridDeduplicator.deduplicate(sampleResults);

        expect(result.strategy).toBe('hybrid');
        expect(result.uniqueResults.length).toBeLessThanOrEqual(sampleResults.length);
      });
    });

    describe('RRF Enhanced deduplication', () => {
      it('should merge scores using RRF algorithm', () => {
        const rrfConfig: Partial<DeduplicationConfig> = {
          strategy: 'rrf_enhanced',
          rrfKValue: 60,
          enableScoreMergin: true,
          enableSourceAttribution: true
        };

        const rrfDeduplicator = new ResultDeduplicator(rrfConfig);
        const result = rrfDeduplicator.deduplicate(sampleResults);

        expect(result.strategy).toBe('rrf_enhanced');
        
        // Check that RRF scores are calculated
        const resultsWithRRF = result.uniqueResults.filter(r => r.rrfScore);
        expect(resultsWithRRF.length).toBeGreaterThan(0);

        // Check source attribution
        const resultsWithSources = result.uniqueResults.filter(r => r.sources && r.sources.length > 0);
        expect(resultsWithSources.length).toBeGreaterThan(0);
      });

      it('should preserve source attribution', () => {
        const rrfConfig: Partial<DeduplicationConfig> = {
          strategy: 'rrf_enhanced',
          enableSourceAttribution: true
        };

        const rrfDeduplicator = new ResultDeduplicator(rrfConfig);
        const result = rrfDeduplicator.deduplicate(sampleResults);

        // Check that source attribution is preserved
        result.uniqueResults.forEach(result => {
          if (result.sources) {
            expect(Array.isArray(result.sources)).toBe(true);
            result.sources.forEach((source: SourceAttribution) => {
              expect(source).toHaveProperty('vectorType');
              expect(source).toHaveProperty('score');
              expect(source).toHaveProperty('rank');
              expect(source).toHaveProperty('weight');
            });
          }
        });
      });
    });

    describe('Performance optimization', () => {
      it('should handle large result sets efficiently', () => {
        const largeResults = Array.from({ length: 500 }, (_, i) => ({
          id: `tool${i}`,
          score: Math.random(),
          vectorType: 'semantic',
          payload: {
            id: `tool${i}`,
            name: `Tool ${i}`,
            description: `Description for tool ${i}`,
            category: 'category'
          }
        }));

        const startTime = Date.now();
        const result = deduplicator.deduplicate(largeResults);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        expect(result.uniqueResults.length).toBe(500);
        expect(result.duplicatesRemoved).toBe(0);
      });

      it('should use batch processing when enabled', () => {
        const batchConfig: Partial<DeduplicationConfig> = {
          batchSize: 100,
          enableParallelProcessing: true
        };

        const batchDeduplicator = new ResultDeduplicator(batchConfig);
        const largeResults = Array.from({ length: 250 }, (_, i) => ({
          id: `tool${i}`,
          score: Math.random(),
          payload: { name: `Tool ${i}` }
        }));

        const result = batchDeduplicator.deduplicate(largeResults);

        expect(result.uniqueResults.length).toBe(250);
      });
    });

    describe('Configuration', () => {
      it('should allow configuration updates', () => {
        const newConfig = {
          similarityThreshold: 0.95,
          strategy: 'id_based' as const,
          rrfKValue: 100
        };

        deduplicator.updateConfig(newConfig);
        const config = deduplicator.getConfig();

        expect(config.similarityThreshold).toBe(0.95);
        expect(config.strategy).toBe('id_based');
        expect(config.rrfKValue).toBe(100);
      });

      it('should use vector type specific thresholds', () => {
        const config = deduplicator.getConfig();
        expect(config.vectorTypeThresholds).toBeDefined();
        expect(config.vectorTypeThresholds.semantic).toBe(0.8);
        expect(config.vectorTypeThresholds.categories).toBe(0.9);
      });
    });

    describe('Metrics', () => {
      it('should calculate accurate metrics', () => {
        const result = deduplicator.deduplicate(sampleResults);

        expect(result.totalResultsProcessed).toBe(sampleResults.length);
        expect(result.uniqueResults.length).toBeGreaterThan(0);
        expect(result.duplicatesRemoved).toBeGreaterThanOrEqual(0);
        expect(result.deduplicationTime).toBeGreaterThan(0);
        expect(result.averageMergedScore).toBeGreaterThanOrEqual(0);
        expect(typeof result.sourceAttributionSummary).toBe('object');
      });
    });
  });

  describe('Utility Functions', () => {
    describe('deduplicateResults', () => {
      it('should provide convenience function for quick deduplication', () => {
        const result = deduplicateResults(sampleResults, {
          strategy: 'id_based',
          similarityThreshold: 0.9
        });

        expect(result.uniqueResults).toBeDefined();
        expect(result.duplicatesRemoved).toBeDefined();
        expect(result.strategy).toBe('id_based');
      });
    });

    describe('calculateResultSimilarity', () => {
      it('should calculate similarity between two results', () => {
        const result1 = sampleResults[0];
        const result2 = sampleResults[1]; // Similar tool (React)

        const similarity = calculateResultSimilarity(result1, result2);

        expect(similarity.similarity).toBeGreaterThan(0);
        expect(similarity.reason).toBeDefined();
        expect(similarity.fields).toBeDefined();
        expect(typeof similarity.fields.name).toBe('number');
        expect(typeof similarity.fields.description).toBe('number');
      });

      it('should handle different field weights', () => {
        const result1 = sampleResults[0];
        const result2 = sampleResults[2]; // Different tool (Vue.js)

        const weights = { name: 0.9, description: 0.1 };
        const similarity = calculateResultSimilarity(result1, result2, ['name', 'description'], weights);

        expect(similarity.similarity).toBeLessThan(0.8);
      });
    });

    describe('mergeResultsWithRRF', () => {
      it('should merge results from multiple vector types', () => {
        const resultsByVectorType = {
          semantic: [sampleResults[0], sampleResults[3]],
          categories: [sampleResults[1], sampleResults[2]],
          functionality: [sampleResults[4]]
        };

        const merged = mergeResultsWithRRF(resultsByVectorType, 60, {
          semantic: 1.0,
          categories: 0.8,
          functionality: 0.7
        }, true);

        expect(merged).toHaveLength(3); // 3 unique tools
        expect(merged[0].rrfScore).toBeGreaterThan(0);
        expect(merged[0].weightedScore).toBeGreaterThan(0);
        expect(merged[0].sources).toBeDefined();
        expect(Array.isArray(merged[0].sources)).toBe(true);
      });

      it('should sort by weighted score', () => {
        const resultsByVectorType = {
          semantic: [sampleResults[2], sampleResults[0]], // Vue.js, React
          categories: [sampleResults[1], sampleResults[3]] // React, Angular
        };

        const merged = mergeResultsWithRRF(resultsByVectorType);

        // React should be first (appears in both vector types)
        expect(merged[0].result.payload.name).toBe('React');
        expect(merged[0].mergedFromCount).toBe(2);
      });
    });

    describe('createMultiVectorDeduplicationConfig', () => {
      it('should create appropriate configuration for multi-vector search', () => {
        const config = createMultiVectorDeduplicationConfig({
          similarityThreshold: 0.85,
          rrfKValue: 100,
          enableScoreMerging: true,
          enableSourceAttribution: true
        });

        expect(config.similarityThreshold).toBe(0.85);
        expect(config.rrfKValue).toBe(100);
        expect(config.enableScoreMergin).toBe(true);
        expect(config.enableSourceAttribution).toBe(true);
        expect(config.strategy).toBe('rrf_enhanced');
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
        uniqueResults: 85,
        duplicatesRemoved: 15,
        processingTime: 50,
        averageSimilarityScore: 0.7,
        batchCount: 1
      };

      monitor.recordMetrics(metrics);
      const retrievedMetrics = monitor.getMetrics();

      expect(retrievedMetrics).toHaveLength(1);
      expect(retrievedMetrics[0]).toEqual(metrics);
    });

    it('should calculate average metrics', () => {
      const metrics1 = {
        totalProcessed: 100,
        uniqueResults: 85,
        duplicatesRemoved: 15,
        processingTime: 50,
        averageSimilarityScore: 0.7,
        batchCount: 1
      };

      const metrics2 = {
        totalProcessed: 200,
        uniqueResults: 170,
        duplicatesRemoved: 30,
        processingTime: 75,
        averageSimilarityScore: 0.8,
        batchCount: 2
      };

      monitor.recordMetrics(metrics1);
      monitor.recordMetrics(metrics2);

      const averageMetrics = monitor.getAverageMetrics();

      expect(averageMetrics).toBeTruthy();
      expect(averageMetrics!.totalProcessed).toBe(150);
      expect(averageMetrics!.uniqueResults).toBe(128);
      expect(averageMetrics!.duplicatesRemoved).toBe(23);
      expect(averageMetrics!.processingTime).toBe(63);
      expect(averageMetrics!.averageSimilarityScore).toBe(0.75);
      expect(averageMetrics!.batchCount).toBe(2);
    });

    it('should limit stored metrics to last 100', () => {
      // Add 150 metrics
      for (let i = 0; i < 150; i++) {
        monitor.recordMetrics({
          totalProcessed: 100,
          uniqueResults: 85,
          duplicatesRemoved: 15,
          processingTime: 50,
          averageSimilarityScore: 0.7,
          batchCount: 1
        });
      }

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(100);
    });

    it('should clear metrics', () => {
      monitor.recordMetrics({
        totalProcessed: 100,
        uniqueResults: 85,
        duplicatesRemoved: 15,
        processingTime: 50,
        averageSimilarityScore: 0.7,
        batchCount: 1
      });

      monitor.clear();
      const metrics = monitor.getMetrics();

      expect(metrics).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty results array', () => {
      const result = deduplicator.deduplicate([]);

      expect(result.uniqueResults).toHaveLength(0);
      expect(result.duplicatesRemoved).toBe(0);
      expect(result.totalResultsProcessed).toBe(0);
    });

    it('should handle results with missing payload', () => {
      const resultsWithMissingPayload = [
        { id: 'tool1', score: 0.9 },
        { id: 'tool2', score: 0.8, payload: { name: 'Tool 2' } },
        { score: 0.7, payload: { name: 'Tool 3' } }
      ];

      const result = deduplicator.deduplicate(resultsWithMissingPayload);

      expect(result.uniqueResults).toHaveLength(3);
      expect(result.duplicatesRemoved).toBe(0);
    });

    it('should handle null/undefined values in fields', () => {
      const resultsWithNullValues = [
        {
          id: 'tool1',
          payload: { name: null, description: undefined, category: 'frontend' }
        },
        {
          id: 'tool2',
          payload: { name: 'Tool 2', description: '', category: null }
        }
      ];

      const result = deduplicator.deduplicate(resultsWithNullValues);

      expect(result.uniqueResults).toHaveLength(2);
    });

    it('should handle very long strings', () => {
      const longDescription = 'A'.repeat(10000);
      const resultsWithLongStrings = [
        {
          id: 'tool1',
          payload: { name: 'Tool 1', description: longDescription }
        },
        {
          id: 'tool2',
          payload: { name: 'Tool 2', description: longDescription + ' different' }
        }
      ];

      const result = deduplicator.deduplicate(resultsWithLongStrings);

      expect(result.uniqueResults).toHaveLength(2);
      expect(result.deduplicationTime).toBeLessThan(1000);
    });
  });

  describe('Quality and Accuracy Tests', () => {
    it('should maintain result quality during deduplication', () => {
      // Test that high-quality results are preserved
      const highQualityResults = [
        {
          id: 'tool1',
          score: 0.95,
          payload: { name: 'React', description: 'UI library', category: 'frontend' }
        },
        {
          id: 'tool2',
          score: 0.9,
          payload: { name: 'Vue', description: 'Progressive framework', category: 'frontend' }
        },
        {
          id: 'tool3',
          score: 0.85,
          payload: { name: 'Angular', description: 'Platform', category: 'frontend' }
        }
      ];

      const result = deduplicator.deduplicate(highQualityResults);

      expect(result.uniqueResults).toHaveLength(3);
      expect(result.duplicatesRemoved).toBe(0);
      
      // Check that high scores are preserved
      result.uniqueResults.forEach((uniqueResult, index) => {
        expect(uniqueResult.score).toBeGreaterThanOrEqual(0.85);
      });
    });

    it('should accurately identify near-duplicates', () => {
      const nearDuplicates = [
        {
          id: 'tool1',
          payload: { name: 'React', description: 'JavaScript library for UI' }
        },
        {
          id: 'tool2',
          payload: { name: 'ReactJS', description: 'JavaScript library for user interfaces' }
        },
        {
          id: 'tool3',
          payload: { name: 'React.js', description: 'JS library for building UIs' }
        }
      ];

      const result = deduplicator.deduplicate(nearDuplicates);

      // Should identify these as similar and deduplicate
      expect(result.uniqueResults.length).toBeLessThan(3);
      expect(result.duplicatesRemoved).toBeGreaterThan(0);
    });

    it('should preserve diverse results', () => {
      const diverseResults = [
        {
          id: 'tool1',
          payload: { name: 'React', description: 'UI library', category: 'frontend' }
        },
        {
          id: 'tool2',
          payload: { name: 'Express', description: 'Web framework', category: 'backend' }
        },
        {
          id: 'tool3',
          payload: { name: 'MongoDB', description: 'NoSQL database', category: 'database' }
        },
        {
          id: 'tool4',
          payload: { name: 'Docker', description: 'Container platform', category: 'devops' }
        },
        {
          id: 'tool5',
          payload: { name: 'Jest', description: 'Testing framework', category: 'testing' }
        }
      ];

      const result = deduplicator.deduplicate(diverseResults);

      // Should preserve all diverse results
      expect(result.uniqueResults).toHaveLength(5);
      expect(result.duplicatesRemoved).toBe(0);
    });
  });
});
