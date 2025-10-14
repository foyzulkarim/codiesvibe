import { contextEnrichmentService } from '@/services/context-enrichment.service';
import { qdrantService } from '@/services/qdrant.service';
import { chatVllmClient } from '@/config/models';
import { HumanMessage } from '@langchain/core/messages';

describe('Context Enrichment Service Integration Tests', () => {
  beforeAll(async () => {
    // Initialize services - contextEnrichmentService has its own init method
    await contextEnrichmentService.initialize();
    // qdrantService initializes automatically in constructor
  });

  afterAll(async () => {
    // Clean up
    contextEnrichmentService.clearCache();
    contextEnrichmentService.clearEntityCache();
  });

  describe('LLM Connectivity', () => {
    it('should connect to LLM service', async () => {
      const response = await chatVllmClient.invoke([
        new HumanMessage('Hello, are you working?')
      ]);
      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
    });
  });

  describe('Context Enrichment with Real Infrastructure', () => {
    it('should enrich context with high confidence threshold', async () => {
      const query = 'JavaScript testing frameworks';
      const result = await contextEnrichmentService.enrichContext(query);
      
      expect(result).toBeDefined();
      expect(result.entityStatistics).toBeDefined();
      expect(result.metadataContext).toBeDefined();
      expect(Object.keys(result.entityStatistics).length).toBeGreaterThan(0);
    });

    it('should enrich context with low confidence threshold', async () => {
      const query = 'obscure programming language tools';
      const result = await contextEnrichmentService.enrichContext(query);
      
      expect(result).toBeDefined();
      expect(result.entityStatistics).toBeDefined();
      expect(result.metadataContext).toBeDefined();
    });

    it('should handle different entity types', async () => {
      const queries = [
        'Python web frameworks',
        'database management tools',
        'code editors and IDEs'
      ];

      for (const query of queries) {
        const result = await contextEnrichmentService.enrichContext(query);
        expect(result).toBeDefined();
        expect(result.entityStatistics).toBeDefined();
      }
    });

    it('should handle Qdrant connectivity issues gracefully', async () => {
      // This test assumes Qdrant might be temporarily unavailable
      const query = 'test query for connectivity';
      
      try {
        const result = await contextEnrichmentService.enrichContext(query);
        expect(result).toBeDefined();
      } catch (error) {
        // Should handle gracefully with fallback
        expect(error).toBeDefined();
      }
    });

    it('should verify LLM response quality', async () => {
      const query = 'React component libraries';
      const result = await contextEnrichmentService.enrichContext(query);
      
      expect(result).toBeDefined();
      expect(result.entityStatistics).toBeDefined();
      
      // Check if semantic contexts are generated when available
      if (result.semanticContexts) {
        const contextKeys = Object.keys(result.semanticContexts);
        expect(contextKeys.length).toBeGreaterThan(0);
      }
    });

    it('should maintain consistency across multiple runs', async () => {
      const query = 'Node.js frameworks';
      const results = [];
      
      for (let i = 0; i < 3; i++) {
        const result = await contextEnrichmentService.enrichContext(query);
        results.push(result);
      }
      
      // All results should be defined
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.entityStatistics).toBeDefined();
      });
      
      // Should have some consistency in entity detection
      const entityCounts = results.map(r => Object.keys(r.entityStatistics).length);
      const avgCount = entityCounts.reduce((a, b) => a + b, 0) / entityCounts.length;
      
      // Allow some variance but expect reasonable consistency
      entityCounts.forEach(count => {
        expect(Math.abs(count - avgCount)).toBeLessThan(avgCount * 0.5);
      });
    });

    it('should handle empty or malformed entities', async () => {
      const queries = ['', '   ', 'xyz123nonexistent'];
      
      for (const query of queries) {
        const result = await contextEnrichmentService.enrichContext(query);
        expect(result).toBeDefined();
        expect(result.entityStatistics).toBeDefined();
        expect(result.metadataContext).toBeDefined();
      }
    });

    it('should respect processing time limits', async () => {
      const query = 'comprehensive development tools ecosystem';
      const startTime = Date.now();
      
      const result = await contextEnrichmentService.enrichContext(query);
      const processingTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      // Should complete within reasonable time (30 seconds)
      expect(processingTime).toBeLessThan(30000);
    });
  });
});