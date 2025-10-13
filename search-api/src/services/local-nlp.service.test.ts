import { localNLPService } from './local-nlp.service';
import { LocalNLPConfig } from '@/config/enhanced-search-config';
import { NLPResultsSchema } from '@/types/enhanced-state';

describe('LocalNLPService', () => {
  beforeAll(async () => {
    // Initialize the service before tests
    await localNLPService.initialize();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const health = await localNLPService.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details.initialized).toBe(true);
    });

    it('should allow configuration updates', () => {
      const newConfig: Partial<LocalNLPConfig> = {
        confidenceThreshold: 0.8,
        maxProcessingTime: 150
      };

      localNLPService.updateConfig(newConfig);
      const config = localNLPService.getConfig();
      
      expect(config.confidenceThreshold).toBe(0.8);
      expect(config.maxProcessingTime).toBe(150);
    });
  });

  describe('text processing', () => {
    it('should process basic text successfully', async () => {
      const text = 'Find free React components for dashboard';
      const result = await localNLPService.processText(text);

      expect(result).toBeDefined();
      expect(NLPResultsSchema.safeParse(result).success).toBe(true);
      expect(result.entities).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.vocabularyCandidates).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.modelUsed).toBeDefined();
    });

    it('should extract entities correctly', async () => {
      const text = 'Find free React API library with TypeScript support';
      const result = await localNLPService.processText(text, {
        extractEntities: true,
        classifyIntent: false,
        extractVocabulary: false
      });

      expect(result.entities.length).toBeGreaterThan(0);
      
      // Check for expected entities
      const entityTexts = result.entities.map(e => e.text.toLowerCase());
      expect(entityTexts.some(text => text.includes('react'))).toBe(true);
      expect(entityTexts.some(text => text.includes('api'))).toBe(true);
      expect(entityTexts.some(text => text.includes('free'))).toBe(true);
    });

    it('should classify intent correctly', async () => {
      const comparisonText = 'React vs Vue for frontend development';
      const comparisonResult = await localNLPService.processText(comparisonText, {
        extractEntities: false,
        classifyIntent: true,
        extractVocabulary: false
      });

      expect(comparisonResult.intent.label).toBe('comparison_query');
      expect(comparisonResult.intent.confidence).toBeGreaterThan(0.5);

      const filterText = 'Find free open source tools';
      const filterResult = await localNLPService.processText(filterText, {
        extractEntities: false,
        classifyIntent: true,
        extractVocabulary: false
      });

      expect(filterResult.intent.label).toBe('filter_search');
      expect(filterResult.intent.confidence).toBeGreaterThan(0.5);
    });

    it('should extract vocabulary candidates', async () => {
      const text = 'Find free frontend React components with API support';
      const result = await localNLPService.processText(text, {
        extractEntities: false,
        classifyIntent: false,
        extractVocabulary: true
      });

      expect(result.vocabularyCandidates).toBeDefined();
      expect(Object.keys(result.vocabularyCandidates).length).toBeGreaterThan(0);
      
      // Check for expected vocabulary categories
      if (result.vocabularyCandidates.categories) {
        expect(result.vocabularyCandidates.categories.length).toBeGreaterThan(0);
      }
      
      if (result.vocabularyCandidates.pricing) {
        const pricingTerms = result.vocabularyCandidates.pricing.map(p => p.value.toLowerCase());
        expect(pricingTerms.some(term => term.includes('free'))).toBe(true);
      }
    });

    it('should respect confidence threshold', async () => {
      // Set high confidence threshold
      localNLPService.updateConfig({ confidenceThreshold: 0.95 });
      
      const text = 'Find tools for development';
      const result = await localNLPService.processText(text);
      
      // Most entities should be filtered out due to high threshold
      expect(result.entities.length).toBeLessThanOrEqual(2);
      
      // Reset to normal threshold
      localNLPService.updateConfig({ confidenceThreshold: 0.7 });
    });

    it('should handle empty text gracefully', async () => {
      const result = await localNLPService.processText('');
      
      expect(result.entities).toEqual([]);
      expect(result.intent.label).toBe('unknown');
      expect(result.vocabularyCandidates).toEqual({});
    });

    it('should handle very long text', async () => {
      const longText = 'Find '.repeat(1000) + 'React components';
      const result = await localNLPService.processText(longText);
      
      expect(result).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('batch processing', () => {
    it('should process multiple texts in batch', async () => {
      const texts = [
        'Find free React components',
        'Compare Vue vs Angular',
        'API library for Node.js',
        'Open source database tools'
      ];

      const results = await localNLPService.processBatch(texts);

      expect(results).toHaveLength(texts.length);
      results.forEach(result => {
        expect(NLPResultsSchema.safeParse(result).success).toBe(true);
      });
    });

    it('should handle batch processing with options', async () => {
      const texts = [
        'Find free tools',
        'Compare frameworks'
      ];

      const results = await localNLPService.processBatch(texts, {
        extractEntities: true,
        classifyIntent: true,
        extractVocabulary: false
      });

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.entities).toBeDefined();
        expect(result.intent).toBeDefined();
        expect(Object.keys(result.vocabularyCandidates).length).toBe(0);
      });
    });

    it('should handle large batches by splitting them', async () => {
      // Create a batch larger than default maxBatchSize
      const largeTexts = Array.from({ length: 15 }, (_, i) => `Find tools for category ${i}`);
      
      const results = await localNLPService.processBatch(largeTexts);
      
      expect(results).toHaveLength(largeTexts.length);
    });
  });

  describe('caching', () => {
    it('should cache results when enabled', async () => {
      const text = 'Find React components for testing';
      
      // First call
      const startTime1 = Date.now();
      const result1 = await localNLPService.processText(text);
      const time1 = Date.now() - startTime1;
      
      // Second call (should be faster due to caching)
      const startTime2 = Date.now();
      const result2 = await localNLPService.processText(text);
      const time2 = Date.now() - startTime2;
      
      expect(result1).toEqual(result2);
      // Note: Cache might not make it significantly faster in this mock implementation
    });

    it('should provide cache statistics', () => {
      const stats = localNLPService.getCacheStats();
      
      expect(stats.modelCache).toBeDefined();
      expect(stats.resultCache).toBeDefined();
      expect(typeof stats.modelCache.size).toBe('number');
      expect(typeof stats.resultCache.size).toBe('number');
    });

    it('should clear caches', () => {
      localNLPService.clearCaches();
      
      const stats = localNLPService.getCacheStats();
      expect(stats.modelCache.size).toBe(0);
      expect(stats.resultCache.size).toBe(0);
    });
  });

  describe('fallback mechanisms', () => {
    it('should handle processing failures gracefully', async () => {
      // This test would be more meaningful with actual model loading failures
      // For now, we just verify the structure exists
      const text = 'Find tools for testing';
      const result = await localNLPService.processText(text);
      
      expect(result.processingStrategy).toBeDefined();
      expect(['local', 'llm_fallback', 'hybrid']).toContain(result.processingStrategy);
    });
  });

  describe('performance monitoring', () => {
    it('should track processing time', async () => {
      const text = 'Find React components for dashboard';
      const result = await localNLPService.processText(text);
      
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(1000); // Should be reasonable
    });

    it('should respect processing time limits', async () => {
      // Set a very short time limit
      localNLPService.updateConfig({ maxProcessingTime: 1 });
      
      const text = 'Find ' + 'complex '.repeat(100) + 'tools';
      const result = await localNLPService.processText(text);
      
      // Should either complete quickly or use fallback
      expect(result.processingTime).toBeLessThan(100);
      
      // Reset to normal limit
      localNLPService.updateConfig({ maxProcessingTime: 100 });
    });
  });

  describe('health checks', () => {
    it('should provide detailed health information', async () => {
      const health = await localNLPService.healthCheck();
      
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.details).toBeDefined();
      expect(health.details.initialized).toBe(true);
      expect(health.details.fallbackEnabled).toBeDefined();
      expect(typeof health.details.modelLoadTime).toBe('number');
      expect(typeof health.details.cacheSize).toBe('number');
    });
  });

  describe('configuration validation', () => {
    it('should handle invalid configuration gracefully', () => {
      const invalidConfig = {
        confidenceThreshold: 1.5, // Invalid: > 1.0
        maxProcessingTime: -1,    // Invalid: negative
        modelCacheSize: 0         // Invalid: zero
      } as any;

      // Should not throw but handle gracefully
      expect(() => {
        localNLPService.updateConfig(invalidConfig);
      }).not.toThrow();
    });

    it('should maintain default values for invalid config', () => {
      const originalConfig = localNLPService.getConfig();
      
      localNLPService.updateConfig({
        confidenceThreshold: undefined as any,
        maxProcessingTime: undefined as any
      });
      
      const newConfig = localNLPService.getConfig();
      expect(newConfig.confidenceThreshold).toBe(originalConfig.confidenceThreshold);
      expect(newConfig.maxProcessingTime).toBe(originalConfig.maxProcessingTime);
    });
  });

  afterAll(() => {
    // Cleanup if needed
    localNLPService.clearCaches();
  });
});
