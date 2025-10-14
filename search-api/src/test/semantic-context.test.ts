import { contextEnrichmentService } from '../services/context-enrichment.service';
import { EntityStatisticsSchema } from '../types/enhanced-state';

describe('Semantic Context Generation', () => {
  beforeAll(async () => {
    // Initialize the service
    await contextEnrichmentService.initialize();
  });

  describe('generateSemanticContext', () => {
    it('should generate semantic context for entity statistics', async () => {
      // Create mock entity statistics
      const mockEntityStatistics = {
        commonCategories: [
          { category: 'frontend', percentage: 75 },
          { category: 'development', percentage: 25 }
        ],
        commonInterfaces: [
          { interface: 'api', percentage: 80 },
          { interface: 'cli', percentage: 20 }
        ],
        commonPricing: [
          { pricing: 'free', percentage: 60 },
          { pricing: 'freemium', percentage: 40 }
        ],
        totalCount: 25,
        confidence: 0.75,
        semanticMatches: 20,
        avgSimilarityScore: 0.8,
        source: 'semantic_search' as const,
        sampleTools: ['React', 'Vue.js', 'Angular', 'Next.js', 'Svelte']
      };

      const result = await contextEnrichmentService.generateSemanticContext(
        'react',
        mockEntityStatistics,
        {
          includeAssumptions: true,
          includeSampleTools: true,
          includeConfidenceIndicators: true,
          maxSampleTools: 5,
          minConfidenceThreshold: 0.3,
          verboseMode: true
        }
      );

      expect(result).toBeDefined();
      expect(result.entityName).toBe('react');
      expect(result.entityType).toBeDefined();
      expect(result.naturalLanguageDescription).toContain('react');
      expect(result.naturalLanguageDescription).toContain('25');
      
      // Check assumptions
      expect(result.assumptions.length).toBeGreaterThan(0);
      expect(result.assumptions[0]).toHaveProperty('assumption');
      expect(result.assumptions[0]).toHaveProperty('confidence');
      expect(result.assumptions[0]).toHaveProperty('rationale');
      
      // Check sample tools
      expect(result.sampleTools.length).toBeGreaterThan(0);
      expect(result.sampleTools[0]).toHaveProperty('name');
      expect(result.sampleTools[0]).toHaveProperty('relevance');
      
      // Check confidence metrics
      expect(result.confidence).toHaveProperty('overall');
      expect(result.confidence).toHaveProperty('dataQuality');
      expect(result.confidence).toHaveProperty('sampleSize');
      
      // Should not have low confidence warning for decent statistics
      expect(result.lowConfidenceWarning).toBeUndefined();
    });

    it('should generate low confidence warning for poor statistics', async () => {
      // Create mock entity statistics with low confidence
      const mockEntityStatistics = {
        commonCategories: [],
        commonInterfaces: [],
        commonPricing: [],
        totalCount: 3, // Very small sample
        confidence: 0.2, // Low confidence
        semanticMatches: 1,
        avgSimilarityScore: 0.3, // Low similarity
        source: 'semantic_search' as const,
        sampleTools: ['Tool1', 'Tool2', 'Tool3']
      };

      const result = await contextEnrichmentService.generateSemanticContext(
        'rare_entity',
        mockEntityStatistics,
        {
          minConfidenceThreshold: 0.5 // Higher threshold to trigger warning
        }
      );

      expect(result).toBeDefined();
      expect(result.lowConfidenceWarning).toBeDefined();
      expect(result.lowConfidenceWarning).toContain('Limited confidence');
      expect(result.lowConfidenceWarning).toContain('rare_entity');
    });

    it('should handle empty statistics gracefully', async () => {
      // Create mock entity statistics with minimal data
      const mockEntityStatistics = {
        commonCategories: [],
        commonInterfaces: [],
        commonPricing: [],
        totalCount: 1,
        confidence: 0.1,
        semanticMatches: 0,
        avgSimilarityScore: 0.1,
        source: 'semantic_search' as const,
        sampleTools: ['SingleTool']
      };

      const result = await contextEnrichmentService.generateSemanticContext(
        'minimal_entity',
        mockEntityStatistics
      );

      expect(result).toBeDefined();
      expect(result.entityName).toBe('minimal_entity');
      expect(result.naturalLanguageDescription).toContain('minimal_entity');
      expect(result.naturalLanguageDescription).toContain('1');
    });
  });

  describe('formatSemanticContextForLLM', () => {
    it('should format semantic context for LLM consumption', async () => {
      // Create mock semantic context
      const mockSemanticContext = {
        entityName: 'react',
        entityType: 'technology',
        naturalLanguageDescription: 'Based on analysis of 25 related tools, "react" primarily belongs to the frontend category.',
        assumptions: [
          {
            assumption: 'Tools related to "react" are likely in the frontend domain',
            confidence: 0.9,
            rationale: '75.0% of analyzed tools belong to this category'
          }
        ],
        sampleTools: [
          {
            name: 'React',
            relevance: 1.0,
            description: 'Example tool #1 representing frontend'
          }
        ],
        confidence: {
          overall: 0.75,
          dataQuality: 0.8,
          sampleSize: 0.7
        }
      };

      const formatted = contextEnrichmentService.formatSemanticContextForLLM(mockSemanticContext);

      expect(formatted).toContain('## Entity: react (technology)');
      expect(formatted).toContain('### Overview');
      expect(formatted).toContain('### Key Assumptions');
      expect(formatted).toContain('### Representative Examples');
      expect(formatted).toContain('### Confidence Metrics');
      expect(formatted).toContain('High confidence: 90.0%');
      expect(formatted).toContain('Overall confidence: 75.0%');
    });
  });

  describe('Integration with enrichContext', () => {
    it('should include semantic contexts in enrichContext result', async () => {
      // Mock the generateEntityStatistics method to return predictable results
      const mockStatistics = {
        commonCategories: [
          { category: 'api', percentage: 80 }
        ],
        commonInterfaces: [
          { interface: 'rest', percentage: 90 }
        ],
        commonPricing: [
          { pricing: 'free', percentage: 60 }
        ],
        totalCount: 20,
        confidence: 0.8,
        semanticMatches: 15,
        avgSimilarityScore: 0.85,
        source: 'semantic_search' as const,
        sampleTools: ['API Tool 1', 'API Tool 2', 'API Tool 3']
      };

      // Mock the generateEntityStatistics method
      jest.spyOn(contextEnrichmentService, 'generateEntityStatistics')
        .mockResolvedValue(mockStatistics);

      const result = await contextEnrichmentService.enrichContext('api tools');

      expect(result).toHaveProperty('semanticContexts');
      expect(result.semanticContexts).toBeDefined();
      expect(typeof result.semanticContexts).toBe('object');
      
      // Should have semantic context for at least one entity
      if (result.semanticContexts) {
        const entityNames = Object.keys(result.semanticContexts);
        expect(entityNames.length).toBeGreaterThan(0);
        
        // Check that semantic context is properly formatted
        if (entityNames.length > 0) {
          const firstEntityContext = result.semanticContexts[entityNames[0]];
          expect(typeof firstEntityContext).toBe('string');
          expect(firstEntityContext).toContain('## Entity:');
        }
      }

      // Restore the original method
      jest.restoreAllMocks();
    }, 15000);
  });

  describe('Performance', () => {
    it('should generate semantic context within acceptable time limits', async () => {
      // Create mock entity statistics
      const mockEntityStatistics = {
        commonCategories: [
          { category: 'database', percentage: 70 },
          { category: 'backend', percentage: 30 }
        ],
        commonInterfaces: [
          { interface: 'api', percentage: 85 },
          { interface: 'sql', percentage: 15 }
        ],
        commonPricing: [
          { pricing: 'free', percentage: 40 },
          { pricing: 'paid', percentage: 60 }
        ],
        totalCount: 30,
        confidence: 0.8,
        semanticMatches: 25,
        avgSimilarityScore: 0.82,
        source: 'semantic_search' as const,
        sampleTools: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch']
      };

      const startTime = Date.now();
      
      const result = await contextEnrichmentService.generateSemanticContext(
        'database',
        mockEntityStatistics
      );
      
      const processingTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(100); // Should complete within 100ms
    });
  });
});
