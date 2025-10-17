import { enhancedSearchService } from '../src/services/enhanced-search.service';
import { EnhancedSearchRequest } from '../src/dto/enhanced-search.dto';

async function testEnhancedSearchService() {
  console.log('🧪 Testing Enhanced Search Service with LangGraph integration...');
  
  const testRequest: EnhancedSearchRequest = {
    query: 'React component library for UI development',
    options: {
      sources: {
        vector: true,
        traditional: true,
        hybrid: true,
      },
      vectorOptions: {
        vectorTypes: ['semantic', 'categories', 'functionality'],
        limit: 10,
      },
      mergeOptions: {
        strategy: 'reciprocal_rank_fusion',
        rrfKValue: 60,
        maxResults: 20,
        sourceWeights: {
          semantic: 1.0,
          traditional: 0.9,
          hybrid: 0.95,
          vector: 0.85,
          fulltext: 0.8
        },
      },
      duplicateDetectionOptions: {
        enabled: true,
        useEnhancedDetection: true,
        threshold: 0.8,
        strategies: ['EXACT_ID', 'CONTENT_SIMILARITY', 'VERSION_AWARE'],
      },
      pagination: {
        page: 1,
        limit: 5,
      },
      sort: {
        field: 'relevance',
        order: 'desc',
      },
      performance: {
        timeout: 5000,
        enableCache: false,
        enableParallel: true,
      },
      filters: {},
      // Enhanced v2.0 options
      contextEnrichment: {
        enabled: true,
        maxEntitiesPerQuery: 5,
        confidenceThreshold: 0.6
      },
      localNLP: {
        enabled: true,
        intentClassification: true,
        entityExtraction: true,
        confidenceThreshold: 0.5
      },
      multiVectorSearch: {
        enabled: true,
        vectorTypes: ['semantic', 'categories', 'functionality'],
        deduplicationEnabled: true,
        deduplicationThreshold: 0.9
      },
      debug: true,
      includeMetadata: true,
      includeSourceAttribution: true,
      includeExecutionMetrics: true,
      includeConfidenceBreakdown: true,
    },
  };

  try {
    console.log('📤 Sending search request...');
    const startTime = Date.now();
    
    const response = await enhancedSearchService.search(testRequest);
    
    const endTime = Date.now();
    console.log(`✅ Search completed in ${endTime - startTime}ms`);
    
    console.log('📊 Response Summary:');
    console.log(`- Query: ${response.query}`);
    console.log(`- Total Results: ${response.summary.totalResults}`);
    console.log(`- Returned Results: ${response.summary.returnedResults}`);
    console.log(`- Processing Time: ${response.summary.processingTime}ms`);
    console.log(`- Sources Searched: ${response.summary.sourcesSearched.join(', ')}`);
    console.log(`- Search Strategy: ${response.summary.searchStrategy}`);
    
    if (response.results.length > 0) {
      console.log('\n🎯 Top Result:');
      const topResult = response.results[0];
      console.log(`- ID: ${topResult.id}`);
      console.log(`- Score: ${topResult.score}`);
      console.log(`- Tool Name: ${topResult.payload?.name || 'N/A'}`);
      console.log(`- Final Rank: ${topResult.finalRank}`);
      console.log(`- Source Count: ${topResult.sourceCount}`);
    }
    
    if (response.sourceAttribution && response.sourceAttribution.length > 0) {
      console.log('\n📈 Source Attribution:');
      response.sourceAttribution.forEach((attribution: any) => {
        console.log(`- ${attribution.source}: ${attribution.resultCount} results (${attribution.searchTime}ms)`);
      });
    }
    
    if (response.debug) {
      console.log('\n🔍 Debug Information:');
      console.log(`- Execution Path: ${response.debug.executionPath.join(' → ')}`);
      console.log(`- Source Metrics:`, response.debug.sourceMetrics || {});
    }
    
    console.log('\n✅ Enhanced Search Service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEnhancedSearchService().catch(console.error);
