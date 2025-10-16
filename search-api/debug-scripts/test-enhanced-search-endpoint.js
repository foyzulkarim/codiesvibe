#!/usr/bin/env node

/**
 * Simple test script for the Enhanced Search API endpoint
 * 
 * This script provides easy manual testing of the POST /api/search/enhanced endpoint
 * with various configurations and use cases.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4004';
const ENHANCED_SEARCH_URL = `${BASE_URL}/api/search/enhanced`;

// Test configurations
const testCases = [
  {
    name: 'Basic Search',
    description: 'Simple search with default options',
    request: {
      query: 'React testing tools',
      options: {
        pagination: {
          page: 1,
          limit: 10
        }
      }
    }
  },
  {
    name: 'Vector Only Search',
    description: 'Search using only vector search',
    request: {
      query: 'testing frameworks',
      options: {
        sources: {
          vector: true,
          traditional: false,
          hybrid: false
        },
        pagination: {
          page: 1,
          limit: 5
        }
      }
    }
  },
  {
    name: 'Traditional Only Search',
    description: 'Search using only traditional search',
    request: {
      query: 'development tools',
      options: {
        sources: {
          vector: false,
          traditional: true,
          hybrid: false
        },
        pagination: {
          page: 1,
          limit: 5
        }
      }
    }
  },
  {
    name: 'Hybrid Search with Duplicate Detection',
    description: 'Full hybrid search with duplicate detection enabled',
    request: {
      query: 'JavaScript libraries',
      options: {
        sources: {
          vector: true,
          traditional: true,
          hybrid: true
        },
        mergeOptions: {
          strategy: 'reciprocal_rank_fusion',
          rrfKValue: 60,
          maxResults: 50
        },
        duplicateDetectionOptions: {
          enabled: true,
          threshold: 0.8,
          strategies: ['EXACT_ID', 'CONTENT_SIMILARITY', 'VERSION_AWARE']
        },
        pagination: {
          page: 1,
          limit: 15
        }
      }
    }
  },
  {
    name: 'Search with Filters',
    description: 'Search with category and interface filters',
    request: {
      query: 'web development',
      options: {
        sources: {
          vector: true,
          traditional: true,
          hybrid: false
        },
        filters: {
          categories: ['development'],
          interfaces: ['web']
        },
        pagination: {
          page: 1,
          limit: 10
        }
      }
    }
  },
  {
    name: 'Debug Mode Search',
    description: 'Search with debug information enabled',
    request: {
      query: 'API testing',
      options: {
        sources: {
          vector: true,
          traditional: true
        },
        debug: true,
        includeMetadata: true,
        includeSourceAttribution: true,
        pagination: {
          page: 1,
          limit: 5
        }
      }
    }
  }
];

/**
 * Execute a single test case
 */
async function runTest(testCase) {
  console.log(`\n🧪 Running: ${testCase.name}`);
  console.log(`📝 Description: ${testCase.description}`);
  console.log(`🔍 Query: "${testCase.request.query}"`);
  
  try {
    const startTime = Date.now();
    const response = await axios.post(ENHANCED_SEARCH_URL, testCase.request, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const endTime = Date.now();
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`⏱️  Response Time: ${endTime - startTime}ms`);
    console.log(`📊 Results Summary:`);
    console.log(`   - Total Results: ${response.data.summary.totalResults}`);
    console.log(`   - Returned Results: ${response.data.summary.returnedResults}`);
    console.log(`   - Processing Time: ${response.data.summary.processingTime}ms`);
    console.log(`   - Sources Searched: ${response.data.summary.sourcesSearched.join(', ')}`);
    console.log(`   - Duplicates Removed: ${response.data.summary.duplicatesRemoved}`);
    console.log(`   - Search Strategy: ${response.data.summary.searchStrategy}`);
    
    if (response.data.sourceAttribution) {
      console.log(`📈 Source Attribution:`);
      response.data.sourceAttribution.forEach(source => {
        console.log(`   - ${source.source}: ${source.resultCount} results (${source.searchTime}ms)`);
      });
    }
    
    if (response.data.duplicateDetection) {
      console.log(`🔄 Duplicate Detection:`);
      console.log(`   - Enabled: ${response.data.duplicateDetection.enabled}`);
      console.log(`   - Duplicates Removed: ${response.data.duplicateDetection.duplicatesRemoved}`);
      console.log(`   - Processing Time: ${response.data.duplicateDetection.processingTime}ms`);
    }
    
    if (response.data.debug) {
      console.log(`🐛 Debug Info Available: true`);
      if (response.data.debug.executionPath) {
        console.log(`   - Execution Path: ${response.data.debug.executionPath.join(' -> ')}`);
      }
    }
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response:`, error.response.data);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Check if the enhanced search service is healthy
 */
async function checkHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/api/search/enhanced/health`);
    console.log(`🏥 Enhanced Search Service Health: ${response.data.status}`);
    console.log(`   Version: ${response.data.version}`);
    console.log(`   Cache Enabled: ${response.data.cache.enabled}`);
    console.log(`   Default Sources: ${response.data.configuration.defaultSources.join(', ')}`);
    return true;
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test execution function
 */
async function main() {
  console.log('🚀 Enhanced Search API Test Script');
  console.log('=====================================');
  
  // Check service health first
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.log('\n❌ Service is not healthy. Please ensure the server is running on port 4004.');
    process.exit(1);
  }
  
  // Run all test cases
  const results = [];
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push({ name: testCase.name, ...result });
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Print summary
  console.log('\n📊 Test Summary');
  console.log('=================');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n🎉 Test completed!');
  console.log('\n💡 You can also test the endpoint manually with curl:');
  console.log(`curl -X POST ${ENHANCED_SEARCH_URL} \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"query":"your search term","options":{"pagination":{"limit":10}}}\'');
}

// Run the tests
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });
}

module.exports = { runTest, checkHealth, testCases };
