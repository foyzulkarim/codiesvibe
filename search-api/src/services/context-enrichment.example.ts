import { contextEnrichmentService } from './context-enrichment.service';

/**
 * Example usage of the ContextEnrichmentService
 * This file demonstrates how to use the service for enriching search context
 */

async function demonstrateContextEnrichment() {
  try {
    // Initialize the service
    console.log('Initializing Context Enrichment Service...');
    await contextEnrichmentService.initialize();
    
    // Example 1: Basic context enrichment
    console.log('\n=== Example 1: Basic Context Enrichment ===');
    const query1 = 'react components for dashboard';
    const result1 = await contextEnrichmentService.enrichContext(query1);
    
    console.log('Query:', query1);
    console.log('Entity Statistics:', Object.keys(result1.entityStatistics));
    console.log('Metadata Context:', {
      searchSpaceSize: result1.metadataContext.searchSpaceSize,
      metadataConfidence: result1.metadataContext.metadataConfidence,
      enrichmentStrategy: result1.metadataContext.enrichmentStrategy,
      processingTime: result1.metadataContext.processingTime,
      assumptions: result1.metadataContext.assumptions
    });
    
    // Example 2: Configuration update
    console.log('\n=== Example 2: Configuration Update ===');
    const originalConfig = contextEnrichmentService.getConfig();
    console.log('Original maxEntitiesPerQuery:', originalConfig.maxEntitiesPerQuery);
    
    // Update configuration
    contextEnrichmentService.updateConfig({
      maxEntitiesPerQuery: 10,
      confidenceThreshold: 0.8
    });
    
    const newConfig = contextEnrichmentService.getConfig();
    console.log('Updated maxEntitiesPerQuery:', newConfig.maxEntitiesPerQuery);
    console.log('Updated confidenceThreshold:', newConfig.confidenceThreshold);
    
    // Example 3: Qdrant multi-vector strategy
    console.log('\n=== Example 3: Qdrant Multi-Vector Strategy ===');
    
    // Test with qdrant_multi_vector strategy (only available strategy)
    contextEnrichmentService.updateConfig({
      enrichmentStrategy: 'qdrant_multi_vector'
    });
    
    const query2 = 'free api tools';
    const result2 = await contextEnrichmentService.enrichContext(query2);
    
    console.log('Query:', query2);
    console.log('Strategy:', result2.metadataContext.enrichmentStrategy);
    console.log('Entity Types Found:', Object.keys(result2.entityStatistics));
    
    // Display entity statistics if available
    if (result2.entityStatistics.categories) {
      console.log('Categories:', result2.entityStatistics.categories.commonCategories?.slice(0, 3));
    }
    
    if (result2.entityStatistics.pricing) {
      console.log('Pricing:', result2.entityStatistics.pricing.commonPricing?.slice(0, 3));
    }
    
    // Example 4: Cache management
    console.log('\n=== Example 4: Cache Management ===');
    console.log('Cache size before:', contextEnrichmentService.getCacheStats().size);
    
    // Make same query again (should use cache)
    const startTime = Date.now();
    await contextEnrichmentService.enrichContext(query2);
    const cachedTime = Date.now() - startTime;
    
    console.log('Time for cached query:', cachedTime, 'ms');
    console.log('Cache size after:', contextEnrichmentService.getCacheStats().size);
    
    // Clear cache
    contextEnrichmentService.clearCache();
    console.log('Cache size after clear:', contextEnrichmentService.getCacheStats().size);
    
    // Restore original configuration
    contextEnrichmentService.updateConfig(originalConfig);
    
    console.log('\n=== Context Enrichment Demonstration Complete ===');
    
  } catch (error) {
    console.error('Error in context enrichment demonstration:', error);
  }
}

// Export the demonstration function
export { demonstrateContextEnrichment };

// Run the demonstration if this file is executed directly
if (require.main === module) {
  demonstrateContextEnrichment();
}
