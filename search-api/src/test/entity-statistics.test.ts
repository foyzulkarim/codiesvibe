import { contextEnrichmentService } from '../services/context-enrichment.service';
import { EntityStatisticsSchema } from '../types/enhanced-state';

describe('Entity Statistics Generation', () => {
  beforeAll(async () => {
    // Initialize the service
    await contextEnrichmentService.initialize();
  });

  describe('generateEntityStatistics', () => {
    it('should generate statistics for a known entity', async () => {
      const result = await contextEnrichmentService.generateEntityStatistics({
        entityName: 'api',
        entityType: 'category',
        minSampleSize: 10,
        maxSampleSize: 30,
        includeSourceAttribution: true,
        cacheEnabled: true
      });

      expect(result).not.toBeNull();
      
      if (result) {
        // Validate against schema
        const parsed = EntityStatisticsSchema.safeParse(result);
        expect(parsed.success).toBe(true);
        
        // Check required fields
        expect(result.totalCount).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.sampleTools.length).toBeGreaterThan(0);
        expect(result.source).toBe('semantic_search');
        
        // Check statistics arrays
        expect(Array.isArray(result.commonCategories)).toBe(true);
        expect(Array.isArray(result.commonInterfaces)).toBe(true);
        expect(Array.isArray(result.commonPricing)).toBe(true);
        
        // Check source attribution if enabled
        if (result.sourceAttribution) {
          expect(Array.isArray(result.sourceAttribution)).toBe(true);
          expect(result.sourceAttribution[0]).toHaveProperty('toolId');
          expect(result.sourceAttribution[0]).toHaveProperty('toolName');
          expect(result.sourceAttribution[0]).toHaveProperty('sources');
        }
      }
    }, 10000);

    it('should handle caching correctly', async () => {
      const entityName = 'database';
      const options = {
        entityName,
        entityType: 'category' as const,
        minSampleSize: 10,
        maxSampleSize: 30,
        includeSourceAttribution: false,
        cacheEnabled: true
      };

      // First call - should hit the database
      const startTime1 = Date.now();
      const result1 = await contextEnrichmentService.generateEntityStatistics(options);
      const time1 = Date.now() - startTime1;

      // Second call - should hit cache
      const startTime2 = Date.now();
      const result2 = await contextEnrichmentService.generateEntityStatistics(options);
      const time2 = Date.now() - startTime2;

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      
      if (result1 && result2) {
        // Results should be identical
        expect(result1.totalCount).toBe(result2.totalCount);
        expect(result1.confidence).toBe(result2.confidence);
        
        // Second call should be faster (cache hit)
        expect(time2).toBeLessThan(time1);
      }
    }, 10000);

    it('should handle low sample scenarios gracefully', async () => {
      const result = await contextEnrichmentService.generateEntityStatistics({
        entityName: 'very_specific_rare_entity_xyz',
        entityType: 'unknown',
        minSampleSize: 50, // High minimum to trigger low sample scenario
        maxSampleSize: 50,
        includeSourceAttribution: false,
        cacheEnabled: false
      });

      // Should either return null (no results) or results with low sample warning
      if (result) {
        expect(result.totalCount).toBeLessThan(50);
        expect(result.confidence).toBeLessThan(0.8); // Lower confidence for low samples
        
        // Check for low sample warning
        if (result.lowSampleWarning) {
          expect(result.lowSampleWarning).toContain('Low sample size');
        }
      }
    }, 10000);

    it('should meet performance requirements', async () => {
      const entityName = 'react';
      const startTime = Date.now();
      
      const result = await contextEnrichmentService.generateEntityStatistics({
        entityName,
        entityType: 'technology',
        minSampleSize: 15,
        maxSampleSize: 40,
        includeSourceAttribution: true,
        cacheEnabled: true
      });
      
      const processingTime = Date.now() - startTime;
      
      expect(result).not.toBeNull();
      expect(processingTime).toBeLessThan(200); // Should meet <200ms requirement
      
      if (result) {
        console.log(`✅ Performance test passed: ${entityName} in ${processingTime}ms`);
      }
    }, 10000);

    it('should extract meaningful statistics', async () => {
      const result = await contextEnrichmentService.generateEntityStatistics({
        entityName: 'payment',
        entityType: 'category',
        minSampleSize: 10,
        maxSampleSize: 25,
        includeSourceAttribution: true,
        cacheEnabled: false
      });

      expect(result).not.toBeNull();
      
      if (result) {
        // Should have meaningful categories
        if (result.commonCategories.length > 0) {
          const topCategory = result.commonCategories[0];
          expect(topCategory.percentage).toBeGreaterThan(0);
          expect(topCategory.percentage).toBeLessThanOrEqual(100);
          expect(typeof topCategory.category).toBe('string');
        }

        // Should have meaningful interfaces
        if (result.commonInterfaces.length > 0) {
          const topInterface = result.commonInterfaces[0];
          expect(topInterface.percentage).toBeGreaterThan(0);
          expect(topInterface.percentage).toBeLessThanOrEqual(100);
          expect(typeof topInterface.interface).toBe('string');
        }

        // Should have meaningful pricing models
        if (result.commonPricing.length > 0) {
          const topPricing = result.commonPricing[0];
          expect(topPricing.percentage).toBeGreaterThan(0);
          expect(topPricing.percentage).toBeLessThanOrEqual(100);
          expect(typeof topPricing.pricing).toBe('string');
        }

        // Should have sample tools
        expect(result.sampleTools.length).toBeGreaterThan(0);
        result.sampleTools.forEach((tool: string) => {
          expect(typeof tool).toBe('string');
          expect(tool.length).toBeGreaterThan(0);
        });
      }
    }, 10000);
  });

  describe('Cache Management', () => {
    it('should clear entity cache correctly', () => {
      expect(() => contextEnrichmentService.clearEntityCache()).not.toThrow();
    });

    it('should provide cache statistics', () => {
      const stats = contextEnrichmentService.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entityCacheSize');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalHits');
      expect(stats).toHaveProperty('totalMisses');
      
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.entityCacheSize).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
      expect(typeof stats.totalHits).toBe('number');
      expect(typeof stats.totalMisses).toBe('number');
    });
  });

  describe('Context Enrichment Integration', () => {
    it('should enrich context with entity statistics', async () => {
      const query = 'Find me free API tools for payment processing';
      const result = await contextEnrichmentService.enrichContext(query);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('entityStatistics');
      expect(result).toHaveProperty('metadataContext');
      
      // Check metadata context
      expect(result.metadataContext.enrichmentStrategy).toBe('qdrant_multi_vector');
      expect(result.metadataContext.processingTime).toBeGreaterThan(0);
      expect(Array.isArray(result.metadataContext.assumptions)).toBe(true);
      
      // Check entity statistics
      expect(typeof result.entityStatistics).toBe('object');
      
      // Should have extracted entities from the query
      const entityNames = Object.keys(result.entityStatistics);
      expect(entityNames.length).toBeGreaterThan(0);
      
      // Check that entities from the query are present
      expect(entityNames.some(name => 
        name.includes('api') || name.includes('payment') || name.includes('free')
      )).toBe(true);
    }, 15000);
  });
});
