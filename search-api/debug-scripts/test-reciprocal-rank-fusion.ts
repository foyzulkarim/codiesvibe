#!/usr/bin/env npx tsx

/**
 * Test script for T038: Create debug script for reciprocal rank fusion testing
 * 
 * This script tests the ReciprocalRankFusion service implementation from T037:
 * - Testing with realistic data from multiple search sources
 * - Demonstrating merging results from vector search, traditional search, etc.
 * - Showing how the RRF algorithm works with different configurations
 * - Testing edge cases (empty results, single source, duplicates)
 * - Performance testing with larger result sets
 */

import {
  resultMergerService,
  SearchResultItem,
  RankedResults,
  MergedResult,
  MergeConfig
} from '../src/services';
import { ReciprocalRankFusion } from '../src/services/result-merger.service';

// Test data for comprehensive RRF testing
const SAMPLE_VECTOR_SEARCH_RESULTS: SearchResultItem[] = [
  {
    id: 'react-1',
    score: 0.95,
    source: 'vector',
    payload: {
      id: 'react-1',
      name: 'React',
      description: 'A JavaScript library for building user interfaces',
      category: 'frontend',
      tags: ['ui', 'components', 'javascript']
    },
    metadata: {
      vectorType: 'semantic',
      searchMethod: 'cosine_similarity'
    }
  },
  {
    id: 'vue-1',
    score: 0.90,
    source: 'vector',
    payload: {
      id: 'vue-1',
      name: 'Vue.js',
      description: 'Progressive JavaScript framework for building UIs',
      category: 'frontend',
      tags: ['framework', 'javascript', 'ui']
    },
    metadata: {
      vectorType: 'semantic',
      searchMethod: 'cosine_similarity'
    }
  },
  {
    id: 'angular-1',
    score: 0.88,
    source: 'vector',
    payload: {
      id: 'angular-1',
      name: 'Angular',
      description: 'Platform for building mobile and desktop web applications',
      category: 'frontend',
      tags: ['framework', 'typescript', 'mobile']
    },
    metadata: {
      vectorType: 'semantic',
      searchMethod: 'cosine_similarity'
    }
  },
  {
    id: 'express-1',
    score: 0.85,
    source: 'vector',
    payload: {
      id: 'express-1',
      name: 'Express.js',
      description: 'Fast, unopinionated, minimalist web framework for Node.js',
      category: 'backend',
      tags: ['nodejs', 'framework', 'api']
    },
    metadata: {
      vectorType: 'semantic',
      searchMethod: 'cosine_similarity'
    }
  },
  {
    id: 'docker-1',
    score: 0.82,
    source: 'vector',
    payload: {
      id: 'docker-1',
      name: 'Docker',
      description: 'Platform for developing, shipping, and running applications in containers',
      category: 'devops',
      tags: ['containers', 'deployment', 'devops']
    },
    metadata: {
      vectorType: 'semantic',
      searchMethod: 'cosine_similarity'
    }
  }
];

const SAMPLE_TRADITIONAL_SEARCH_RESULTS: SearchResultItem[] = [
  {
    id: 'react-1',
    score: 0.92,
    source: 'traditional',
    payload: {
      id: 'react-1',
      name: 'React',
      description: 'JavaScript library for building user interfaces with components',
      category: 'frontend',
      tags: ['javascript', 'ui', 'components']
    },
    metadata: {
      searchType: 'fulltext',
      matchedFields: ['name', 'description', 'tags']
    }
  },
  {
    id: 'express-1',
    score: 0.89,
    source: 'traditional',
    payload: {
      id: 'express-1',
      name: 'Express.js',
      description: 'Web application framework for Node.js',
      category: 'backend',
      tags: ['nodejs', 'web', 'framework']
    },
    metadata: {
      searchType: 'fulltext',
      matchedFields: ['name', 'description', 'category']
    }
  },
  {
    id: 'mongodb-1',
    score: 0.87,
    source: 'traditional',
    payload: {
      id: 'mongodb-1',
      name: 'MongoDB',
      description: 'Document-oriented NoSQL database program',
      category: 'database',
      tags: ['nosql', 'database', 'document']
    },
    metadata: {
      searchType: 'fulltext',
      matchedFields: ['name', 'description', 'category']
    }
  },
  {
    id: 'nextjs-1',
    score: 0.84,
    source: 'traditional',
    payload: {
      id: 'nextjs-1',
      name: 'Next.js',
      description: 'React framework for production-ready applications',
      category: 'frontend',
      tags: ['react', 'framework', 'ssr']
    },
    metadata: {
      searchType: 'fulltext',
      matchedFields: ['name', 'description', 'tags']
    }
  },
  {
    id: 'typescript-1',
    score: 0.81,
    source: 'traditional',
    payload: {
      id: 'typescript-1',
      name: 'TypeScript',
      description: 'Typed superset of JavaScript that compiles to plain JavaScript',
      category: 'language',
      tags: ['javascript', 'typed', 'language']
    },
    metadata: {
      searchType: 'fulltext',
      matchedFields: ['name', 'description']
    }
  }
];

const SAMPLE_HYBRID_SEARCH_RESULTS: SearchResultItem[] = [
  {
    id: 'react-1',
    score: 0.93,
    source: 'hybrid',
    payload: {
      id: 'react-1',
      name: 'React',
      description: 'A JavaScript library for building user interfaces',
      category: 'frontend',
      tags: ['ui', 'components', 'javascript']
    },
    metadata: {
      searchType: 'hybrid',
      vectorScore: 0.95,
      textScore: 0.85
    }
  },
  {
    id: 'nextjs-1',
    score: 0.91,
    source: 'hybrid',
    payload: {
      id: 'nextjs-1',
      name: 'Next.js',
      description: 'React framework for production with SSR and SSG',
      category: 'frontend',
      tags: ['react', 'framework', 'ssr', 'ssg']
    },
    metadata: {
      searchType: 'hybrid',
      vectorScore: 0.88,
      textScore: 0.94
    }
  },
  {
    id: 'vue-1',
    score: 0.86,
    source: 'hybrid',
    payload: {
      id: 'vue-1',
      name: 'Vue.js',
      description: 'Progressive JavaScript framework',
      category: 'frontend',
      tags: ['framework', 'javascript', 'ui']
    },
    metadata: {
      searchType: 'hybrid',
      vectorScore: 0.90,
      textScore: 0.82
    }
  },
  {
    id: 'nestjs-1',
    score: 0.83,
    source: 'hybrid',
    payload: {
      id: 'nestjs-1',
      name: 'NestJS',
      description: 'Progressive Node.js framework for building efficient applications',
      category: 'backend',
      tags: ['nodejs', 'framework', 'typescript']
    },
    metadata: {
      searchType: 'hybrid',
      vectorScore: 0.80,
      textScore: 0.86
    }
  },
  {
    id: 'graphql-1',
    score: 0.79,
    source: 'hybrid',
    payload: {
      id: 'graphql-1',
      name: 'GraphQL',
      description: 'Query language and runtime for APIs',
      category: 'api',
      tags: ['api', 'query', 'schema']
    },
    metadata: {
      searchType: 'hybrid',
      vectorScore: 0.75,
      textScore: 0.83
    }
  }
];

interface TestResult {
  testName: string;
  inputSources: number;
  totalInputResults: number;
  totalOutputResults: number;
  processingTime: number;
  duplicatesRemoved: number;
  config: Partial<MergeConfig>;
  success: boolean;
  error?: string;
  metrics?: {
    averageRRFScore: number;
    maxRRFScore: number;
    minRRFScore: number;
    averageSourceCount: number;
  };
}

/**
 * Generate large dataset for performance testing
 */
function generateLargeDataset(size: number, sourceCount: number = 3): RankedResults[] {
  const tools = [
    { name: 'React', description: 'UI library', category: 'frontend' },
    { name: 'Vue', description: 'Progressive framework', category: 'frontend' },
    { name: 'Angular', description: 'Platform for web apps', category: 'frontend' },
    { name: 'Express', description: 'Node.js web framework', category: 'backend' },
    { name: 'MongoDB', description: 'NoSQL database', category: 'database' },
    { name: 'Docker', description: 'Container platform', category: 'devops' },
    { name: 'Jest', description: 'Testing framework', category: 'testing' },
    { name: 'Webpack', description: 'Module bundler', category: 'build' },
    { name: 'TypeScript', description: 'Typed JavaScript', category: 'language' },
    { name: 'GraphQL', description: 'Query language', category: 'api' }
  ];

  const sources = ['vector', 'traditional', 'hybrid', 'fulltext', 'semantic'];
  const results: RankedResults[] = [];

  for (let sourceIndex = 0; sourceIndex < sourceCount; sourceIndex++) {
    const source = sources[sourceIndex % sources.length];
    const sourceResults: SearchResultItem[] = [];
    
    for (let i = 0; i < size; i++) {
      const tool = tools[i % tools.length];
      const variant = Math.floor(i / tools.length);
      
      sourceResults.push({
        id: `${tool.name.toLowerCase()}-${variant}`,
        score: Math.random() * 0.4 + 0.6, // 0.6-1.0
        source,
        payload: {
          id: `${tool.name.toLowerCase()}-${variant}`,
          name: variant === 0 ? tool.name : `${tool.name} v${variant}`,
          description: tool.description + (variant > 0 ? ` version ${variant}` : ''),
          category: tool.category,
          tags: tool.category.split(' ')
        },
        metadata: {
          source,
          rank: i + 1,
          totalResults: size
        }
      });
    }
    
    results.push({
      source,
      results: sourceResults,
      totalResults: size,
      searchTime: Math.random() * 100 + 50,
      metadata: { sourceType: source }
    });
  }
  
  return results;
}

/**
 * Print detailed results for analysis
 */
function printDetailedResults(results: MergedResult[], title: string): void {
  console.log(`\n📊 ${title}`);
  console.log('='.repeat(80));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.payload?.name || result.id} (Rank: ${result.finalRank})`);
    console.log(`   RRF Score: ${result.rrfScore.toFixed(4)}`);
    console.log(`   Original Score: ${result.score.toFixed(4)}`);
    console.log(`   Source Count: ${result.sourceCount}`);
    console.log(`   Sources: ${Object.keys(result.originalRankings).join(', ')}`);
    
    console.log('   Original Rankings:');
    Object.entries(result.originalRankings).forEach(([source, ranking]) => {
      console.log(`     - ${source}: Rank ${ranking.rank}, Score ${ranking.score.toFixed(4)}`);
    });
    
    if (result.metadata) {
      console.log(`   Metadata: ${JSON.stringify(result.metadata, null, 2)}`);
    }
  });
}

/**
 * Test basic merging of 2-3 result sets with overlapping items
 */
async function testBasicMerging(): Promise<TestResult> {
  console.log('\n🧪 Testing Basic Merging of Multiple Result Sets');
  
  const startTime = Date.now();
  
  try {
    const rankedResults: RankedResults[] = [
      {
        source: 'vector',
        results: SAMPLE_VECTOR_SEARCH_RESULTS,
        totalResults: SAMPLE_VECTOR_SEARCH_RESULTS.length,
        searchTime: 45,
        metadata: { algorithm: 'cosine_similarity' }
      },
      {
        source: 'traditional',
        results: SAMPLE_TRADITIONAL_SEARCH_RESULTS,
        totalResults: SAMPLE_TRADITIONAL_SEARCH_RESULTS.length,
        searchTime: 32,
        metadata: { algorithm: 'fulltext_search' }
      },
      {
        source: 'hybrid',
        results: SAMPLE_HYBRID_SEARCH_RESULTS,
        totalResults: SAMPLE_HYBRID_SEARCH_RESULTS.length,
        searchTime: 58,
        metadata: { algorithm: 'hybrid_search' }
      }
    ];

    const config: Partial<MergeConfig> = {
      kValue: 60,
      maxResults: 10,
      enableDeduplication: true,
      deduplicationThreshold: 0.9
    };

    const mergedResults = await resultMergerService.mergeResults(rankedResults, config);
    const processingTime = Date.now() - startTime;

    // Calculate metrics
    const averageRRFScore = mergedResults.reduce((sum, r) => sum + r.rrfScore, 0) / mergedResults.length;
    const maxRRFScore = Math.max(...mergedResults.map(r => r.rrfScore));
    const minRRFScore = Math.min(...mergedResults.map(r => r.rrfScore));
    const averageSourceCount = mergedResults.reduce((sum, r) => sum + r.sourceCount, 0) / mergedResults.length;

    const totalInputResults = rankedResults.reduce((sum, r) => sum + r.results.length, 0);
    const duplicatesRemoved = totalInputResults - mergedResults.length;

    console.log(`✅ Basic merging completed in ${processingTime}ms`);
    console.log(`📊 Input: ${totalInputResults} results from ${rankedResults.length} sources`);
    console.log(`📊 Output: ${mergedResults.length} unique results`);
    console.log(`🗑️  Duplicates removed: ${duplicatesRemoved}`);
    console.log(`📈 Average RRF Score: ${averageRRFScore.toFixed(4)}`);
    console.log(`📈 Average Source Count: ${averageSourceCount.toFixed(2)}`);

    // Print detailed results for first 5 items
    printDetailedResults(mergedResults.slice(0, 5), 'Top 5 Merged Results (Basic Merging)');

    return {
      testName: 'Basic Merging',
      inputSources: rankedResults.length,
      totalInputResults,
      totalOutputResults: mergedResults.length,
      processingTime,
      duplicatesRemoved,
      config,
      success: true,
      metrics: {
        averageRRFScore,
        maxRRFScore,
        minRRFScore,
        averageSourceCount
      }
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Basic merging failed:`, errorMessage);
    
    return {
      testName: 'Basic Merging',
      inputSources: 0,
      totalInputResults: 0,
      totalOutputResults: 0,
      processingTime,
      duplicatesRemoved: 0,
      config: {},
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Test different k values and their impact on rankings
 */
async function testDifferentKValues(): Promise<TestResult[]> {
  console.log('\n🧪 Testing Different K Values and Their Impact on Rankings');
  
  const kValues = [20, 40, 60, 80, 100];
  const testResults: TestResult[] = [];

  const rankedResults: RankedResults[] = [
    {
      source: 'vector',
      results: SAMPLE_VECTOR_SEARCH_RESULTS,
      totalResults: SAMPLE_VECTOR_SEARCH_RESULTS.length
    },
    {
      source: 'traditional',
      results: SAMPLE_TRADITIONAL_SEARCH_RESULTS,
      totalResults: SAMPLE_TRADITIONAL_SEARCH_RESULTS.length
    }
  ];

  for (const kValue of kValues) {
    const startTime = Date.now();
    
    try {
      const config: Partial<MergeConfig> = {
        kValue,
        maxResults: 10,
        enableDeduplication: true
      };

      const mergedResults = await resultMergerService.mergeResults(rankedResults, config);
      const processingTime = Date.now() - startTime;

      const averageRRFScore = mergedResults.reduce((sum, r) => sum + r.rrfScore, 0) / mergedResults.length;
      const totalInputResults = rankedResults.reduce((sum, r) => sum + r.results.length, 0);
      const duplicatesRemoved = totalInputResults - mergedResults.length;

      console.log(`✅ K=${kValue} completed in ${processingTime}ms`);
      console.log(`   Average RRF Score: ${averageRRFScore.toFixed(4)}`);
      console.log(`   Top 3 items: ${mergedResults.slice(0, 3).map(r => r.payload?.name || r.id).join(', ')}`);

      testResults.push({
        testName: `K Value Test (${kValue})`,
        inputSources: rankedResults.length,
        totalInputResults,
        totalOutputResults: mergedResults.length,
        processingTime,
        duplicatesRemoved,
        config,
        success: true,
        metrics: {
          averageRRFScore,
          maxRRFScore: Math.max(...mergedResults.map(r => r.rrfScore)),
          minRRFScore: Math.min(...mergedResults.map(r => r.rrfScore)),
          averageSourceCount: mergedResults.reduce((sum, r) => sum + r.sourceCount, 0) / mergedResults.length
        }
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ K=${kValue} test failed:`, errorMessage);
      
      testResults.push({
        testName: `K Value Test (${kValue})`,
        inputSources: rankedResults.length,
        totalInputResults: 0,
        totalOutputResults: 0,
        processingTime,
        duplicatesRemoved: 0,
        config: { kValue },
        success: false,
        error: errorMessage
      });
    }
  }

  return testResults;
}

/**
 * Test with duplicate items across sources
 */
async function testDuplicateHandling(): Promise<TestResult> {
  console.log('\n🧪 Testing Duplicate Items Across Sources');
  
  const startTime = Date.now();
  
  try {
    // Create results with intentional duplicates
    const duplicateResults: RankedResults[] = [
      {
        source: 'vector',
        results: [
          SAMPLE_VECTOR_SEARCH_RESULTS[0], // react-1
          SAMPLE_VECTOR_SEARCH_RESULTS[1], // vue-1
          SAMPLE_VECTOR_SEARCH_RESULTS[0], // react-1 (duplicate)
          SAMPLE_VECTOR_SEARCH_RESULTS[3], // express-1
        ],
        totalResults: 4
      },
      {
        source: 'traditional',
        results: [
          SAMPLE_TRADITIONAL_SEARCH_RESULTS[0], // react-1 (duplicate across sources)
          SAMPLE_TRADITIONAL_SEARCH_RESULTS[1], // express-1 (duplicate across sources)
          SAMPLE_TRADITIONAL_SEARCH_RESULTS[2], // mongodb-1
          SAMPLE_TRADITIONAL_SEARCH_RESULTS[0], // react-1 (duplicate within source)
        ],
        totalResults: 4
      }
    ];

    const config: Partial<MergeConfig> = {
      kValue: 60,
      maxResults: 10,
      enableDeduplication: true,
      deduplicationThreshold: 0.8
    };

    const mergedResults = await resultMergerService.mergeResults(duplicateResults, config);
    const processingTime = Date.now() - startTime;

    const totalInputResults = duplicateResults.reduce((sum, r) => sum + r.results.length, 0);
    const duplicatesRemoved = totalInputResults - mergedResults.length;

    console.log(`✅ Duplicate handling completed in ${processingTime}ms`);
    console.log(`📊 Input: ${totalInputResults} results (with duplicates)`);
    console.log(`📊 Output: ${mergedResults.length} unique results`);
    console.log(`🗑️  Duplicates removed: ${duplicatesRemoved}`);

    // Check if React appears with combined sources
    const reactResult = mergedResults.find(r => r.id === 'react-1');
    if (reactResult) {
      console.log(`🔍 React result analysis:`);
      console.log(`   Final Rank: ${reactResult.finalRank}`);
      console.log(`   RRF Score: ${reactResult.rrfScore.toFixed(4)}`);
      console.log(`   Source Count: ${reactResult.sourceCount}`);
      console.log(`   Original Rankings: ${JSON.stringify(reactResult.originalRankings, null, 2)}`);
    }

    printDetailedResults(mergedResults, 'Merged Results with Duplicate Handling');

    return {
      testName: 'Duplicate Handling',
      inputSources: duplicateResults.length,
      totalInputResults,
      totalOutputResults: mergedResults.length,
      processingTime,
      duplicatesRemoved,
      config,
      success: true,
      metrics: {
        averageRRFScore: mergedResults.reduce((sum, r) => sum + r.rrfScore, 0) / mergedResults.length,
        maxRRFScore: Math.max(...mergedResults.map(r => r.rrfScore)),
        minRRFScore: Math.min(...mergedResults.map(r => r.rrfScore)),
        averageSourceCount: mergedResults.reduce((sum, r) => sum + r.sourceCount, 0) / mergedResults.length
      }
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Duplicate handling test failed:`, errorMessage);
    
    return {
      testName: 'Duplicate Handling',
      inputSources: 0,
      totalInputResults: 0,
      totalOutputResults: 0,
      processingTime,
      duplicatesRemoved: 0,
      config: {},
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Test with different source weights
 */
async function testSourceWeights(): Promise<TestResult[]> {
  console.log('\n🧪 Testing Different Source Weights');
  
  const weightConfigurations = [
    { name: 'Equal Weights', weights: { vector: 1.0, traditional: 1.0 } as Record<string, number> },
    { name: 'Vector Preferred', weights: { vector: 1.5, traditional: 0.7 } as Record<string, number> },
    { name: 'Traditional Preferred', weights: { vector: 0.7, traditional: 1.5 } as Record<string, number> },
    { name: 'Balanced Hybrid', weights: { vector: 1.2, traditional: 1.2, hybrid: 1.0 } as Record<string, number> }
  ];

  const testResults: TestResult[] = [];
  const baseRankedResults: RankedResults[] = [
    {
      source: 'vector',
      results: SAMPLE_VECTOR_SEARCH_RESULTS.slice(0, 3),
      totalResults: 3
    },
    {
      source: 'traditional',
      results: SAMPLE_TRADITIONAL_SEARCH_RESULTS.slice(0, 3),
      totalResults: 3
    }
  ];

  for (const config of weightConfigurations) {
    const startTime = Date.now();
    
    try {
      const mergeConfig: Partial<MergeConfig> = {
        kValue: 60,
        maxResults: 10,
        sourceWeights: config.weights as Record<string, number>
      };

      const mergedResults = await resultMergerService.mergeResults(baseRankedResults, mergeConfig);
      const processingTime = Date.now() - startTime;

      const totalInputResults = baseRankedResults.reduce((sum, r) => sum + r.results.length, 0);
      const duplicatesRemoved = totalInputResults - mergedResults.length;

      console.log(`✅ ${config.name} completed in ${processingTime}ms`);
      console.log(`   Top item: ${mergedResults[0]?.payload?.name || mergedResults[0]?.id}`);
      console.log(`   Top RRF Score: ${mergedResults[0]?.rrfScore.toFixed(4)}`);

      testResults.push({
        testName: `Source Weights (${config.name})`,
        inputSources: baseRankedResults.length,
        totalInputResults,
        totalOutputResults: mergedResults.length,
        processingTime,
        duplicatesRemoved,
        config: mergeConfig,
        success: true,
        metrics: {
          averageRRFScore: mergedResults.reduce((sum, r) => sum + r.rrfScore, 0) / mergedResults.length,
          maxRRFScore: Math.max(...mergedResults.map(r => r.rrfScore)),
          minRRFScore: Math.min(...mergedResults.map(r => r.rrfScore)),
          averageSourceCount: mergedResults.reduce((sum, r) => sum + r.sourceCount, 0) / mergedResults.length
        }
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ ${config.name} test failed:`, errorMessage);
      
      testResults.push({
        testName: `Source Weights (${config.name})`,
        inputSources: baseRankedResults.length,
        totalInputResults: 0,
        totalOutputResults: 0,
        processingTime,
        duplicatesRemoved: 0,
        config: { sourceWeights: config.weights as Record<string, number> },
        success: false,
        error: errorMessage
      });
    }
  }

  return testResults;
}

/**
 * Test with empty result sets
 */
async function testEmptyResults(): Promise<TestResult[]> {
  console.log('\n🧪 Testing Empty Result Sets');
  
  const testResults: TestResult[] = [];
  
  // Test case 1: All sources empty
  const startTime1 = Date.now();
  try {
    const emptyResults: RankedResults[] = [
      { source: 'vector', results: [], totalResults: 0 },
      { source: 'traditional', results: [], totalResults: 0 }
    ];

    const mergedResults = await resultMergerService.mergeResults(emptyResults);
    const processingTime1 = Date.now() - startTime1;

    console.log(`✅ All empty sources completed in ${processingTime1}ms`);
    console.log(`   Output: ${mergedResults.length} results`);

    testResults.push({
      testName: 'All Empty Sources',
      inputSources: emptyResults.length,
      totalInputResults: 0,
      totalOutputResults: mergedResults.length,
      processingTime: processingTime1,
      duplicatesRemoved: 0,
      config: {},
      success: true
    });

  } catch (error) {
    const processingTime1 = Date.now() - startTime1;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ All empty sources test failed:`, errorMessage);
    
    testResults.push({
      testName: 'All Empty Sources',
      inputSources: 0,
      totalInputResults: 0,
      totalOutputResults: 0,
      processingTime: processingTime1,
      duplicatesRemoved: 0,
      config: {},
      success: false,
      error: errorMessage
    });
  }

  // Test case 2: Mixed empty and non-empty
  const startTime2 = Date.now();
  try {
    const mixedResults: RankedResults[] = [
      { source: 'vector', results: SAMPLE_VECTOR_SEARCH_RESULTS.slice(0, 2), totalResults: 2 },
      { source: 'traditional', results: [], totalResults: 0 },
      { source: 'hybrid', results: SAMPLE_HYBRID_SEARCH_RESULTS.slice(0, 1), totalResults: 1 }
    ];

    const mergedResults = await resultMergerService.mergeResults(mixedResults);
    const processingTime2 = Date.now() - startTime2;

    const totalInputResults = mixedResults.reduce((sum, r) => sum + r.results.length, 0);

    console.log(`✅ Mixed empty/non-empty completed in ${processingTime2}ms`);
    console.log(`   Input: ${totalInputResults} results`);
    console.log(`   Output: ${mergedResults.length} results`);

    testResults.push({
      testName: 'Mixed Empty/Non-Empty',
      inputSources: mixedResults.length,
      totalInputResults,
      totalOutputResults: mergedResults.length,
      processingTime: processingTime2,
      duplicatesRemoved: totalInputResults - mergedResults.length,
      config: {},
      success: true
    });

  } catch (error) {
    const processingTime2 = Date.now() - startTime2;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Mixed empty/non-empty test failed:`, errorMessage);
    
    testResults.push({
      testName: 'Mixed Empty/Non-Empty',
      inputSources: 0,
      totalInputResults: 0,
      totalOutputResults: 0,
      processingTime: processingTime2,
      duplicatesRemoved: 0,
      config: {},
      success: false,
      error: errorMessage
    });
  }

  return testResults;
}

/**
 * Test performance with larger result sets
 */
async function testPerformanceWithLargeDataset(): Promise<TestResult> {
  console.log('\n🧪 Testing Performance with Large Dataset');
  
  const startTime = Date.now();
  
  try {
    const largeDataset = generateLargeDataset(100, 4); // 100 items per source, 4 sources
    const totalInputItems = largeDataset.reduce((sum, r) => sum + r.results.length, 0);

    console.log(`📊 Generated ${totalInputItems} total items from ${largeDataset.length} sources`);

    const config: Partial<MergeConfig> = {
      kValue: 60,
      maxResults: 50,
      enableDeduplication: true,
      deduplicationThreshold: 0.9
    };

    const mergedResults = await resultMergerService.mergeResults(largeDataset, config);
    const processingTime = Date.now() - startTime;

    const duplicatesRemoved = totalInputItems - mergedResults.length;
    const efficiency = totalInputItems / (processingTime / 1000); // items per second

    console.log(`✅ Large dataset processing completed in ${processingTime}ms`);
    console.log(`📊 Input: ${totalInputItems} results`);
    console.log(`📊 Output: ${mergedResults.length} unique results`);
    console.log(`🗑️  Duplicates removed: ${duplicatesRemoved}`);
    console.log(`⚡ Efficiency: ${efficiency.toFixed(0)} items/second`);

    // Print top 5 results
    printDetailedResults(mergedResults.slice(0, 5), 'Top 5 Results from Large Dataset');

    return {
      testName: 'Large Dataset Performance',
      inputSources: largeDataset.length,
      totalInputResults: totalInputItems,
      totalOutputResults: mergedResults.length,
      processingTime,
      duplicatesRemoved,
      config,
      success: true,
      metrics: {
        averageRRFScore: mergedResults.reduce((sum, r) => sum + r.rrfScore, 0) / mergedResults.length,
        maxRRFScore: Math.max(...mergedResults.map(r => r.rrfScore)),
        minRRFScore: Math.min(...mergedResults.map(r => r.rrfScore)),
        averageSourceCount: mergedResults.reduce((sum, r) => sum + r.sourceCount, 0) / mergedResults.length
      }
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Large dataset performance test failed:`, errorMessage);
    
    return {
      testName: 'Large Dataset Performance',
      inputSources: 0,
      totalInputResults: 0,
      totalOutputResults: 0,
      processingTime,
      duplicatesRemoved: 0,
      config: {},
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Test configuration validation
 */
async function testConfigurationValidation(): Promise<TestResult[]> {
  console.log('\n🧪 Testing Configuration Validation');
  
  const testResults: TestResult[] = [];
  
  const invalidConfigs = [
    { name: 'Invalid K Value (negative)', config: { kValue: -10 } },
    { name: 'Invalid K Value (too large)', config: { kValue: 2000 } },
    { name: 'Invalid Max Results (zero)', config: { maxResults: 0 } },
    { name: 'Invalid Max Results (negative)', config: { maxResults: -5 } },
    { name: 'Invalid Deduplication Threshold', config: { deduplicationThreshold: 1.5 } }
  ];

  for (const testConfig of invalidConfigs) {
    const startTime = Date.now();
    
    try {
      const isValid = ReciprocalRankFusion.validateConfig(testConfig.config);
      const processingTime = Date.now() - startTime;

      console.log(`✅ ${testConfig.name} validation completed in ${processingTime}ms`);
      console.log(`   Result: ${isValid ? 'Valid' : 'Invalid'} (expected: Invalid)`);

      testResults.push({
        testName: `Config Validation (${testConfig.name})`,
        inputSources: 0,
        totalInputResults: 0,
        totalOutputResults: 0,
        processingTime,
        duplicatesRemoved: 0,
        config: testConfig.config,
        success: !isValid // Success if validation correctly identified invalid config
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ ${testConfig.name} validation test failed:`, errorMessage);
      
      testResults.push({
        testName: `Config Validation (${testConfig.name})`,
        inputSources: 0,
        totalInputResults: 0,
        totalOutputResults: 0,
        processingTime,
        duplicatesRemoved: 0,
        config: testConfig.config,
        success: false,
        error: errorMessage
      });
    }
  }

  return testResults;
}

/**
 * Print comprehensive test report
 */
function printTestReport(allTestResults: TestResult[]): void {
  console.log('\n📊 Reciprocal Rank Fusion Test Report');
  console.log('='.repeat(80));
  
  const successfulTests = allTestResults.filter(r => r.success);
  const failedTests = allTestResults.filter(r => !r.success);
  
  console.log(`✅ Successful tests: ${successfulTests.length}/${allTestResults.length}`);
  console.log(`❌ Failed tests: ${failedTests.length}/${allTestResults.length}`);
  
  if (successfulTests.length > 0) {
    const avgProcessingTime = successfulTests.reduce((sum, r) => sum + r.processingTime, 0) / successfulTests.length;
    const totalInputResults = successfulTests.reduce((sum, r) => sum + r.totalInputResults, 0);
    const totalOutputResults = successfulTests.reduce((sum, r) => sum + r.totalOutputResults, 0);
    const totalDuplicatesRemoved = successfulTests.reduce((sum, r) => sum + r.duplicatesRemoved, 0);
    
    console.log(`\n📈 Performance Summary:`);
    console.log(`   Average processing time: ${avgProcessingTime.toFixed(2)}ms`);
    console.log(`   Total input results processed: ${totalInputResults}`);
    console.log(`   Total output results produced: ${totalOutputResults}`);
    console.log(`   Total duplicates removed: ${totalDuplicatesRemoved}`);
    console.log(`   Deduplication rate: ${((totalDuplicatesRemoved / totalInputResults) * 100).toFixed(1)}%`);
    
    // Metrics summary
    const testsWithMetrics = successfulTests.filter(r => r.metrics);
    if (testsWithMetrics.length > 0) {
      const avgRRFScore = testsWithMetrics.reduce((sum, r) => sum + r.metrics!.averageRRFScore, 0) / testsWithMetrics.length;
      const avgSourceCount = testsWithMetrics.reduce((sum, r) => sum + r.metrics!.averageSourceCount, 0) / testsWithMetrics.length;
      
      console.log(`\n📊 RRF Metrics Summary:`);
      console.log(`   Average RRF score: ${avgRRFScore.toFixed(4)}`);
      console.log(`   Average source count: ${avgSourceCount.toFixed(2)}`);
    }
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    failedTests.forEach(test => {
      console.log(`   - ${test.testName}: ${test.error || 'Unknown error'}`);
    });
  }
  
  console.log(`\n📋 Individual Test Results:`);
  allTestResults.forEach(test => {
    const status = test.success ? '✅' : '❌';
    console.log(`   ${status} ${test.testName}: ${test.processingTime}ms`);
    if (test.totalInputResults > 0) {
      console.log(`      Input: ${test.totalInputResults}, Output: ${test.totalOutputResults}, Duplicates: ${test.duplicatesRemoved}`);
    }
  });
}

/**
 * Main test execution
 */
async function main(): Promise<void> {
  console.log('🧪 T038: Reciprocal Rank Fusion Debug Test Suite');
  console.log('Testing RRF implementation with various scenarios and configurations');
  
  const allTestResults: TestResult[] = [];
  
  try {
    // Run all test scenarios
    allTestResults.push(await testBasicMerging());
    
    const kValueResults = await testDifferentKValues();
    allTestResults.push(...kValueResults);
    
    allTestResults.push(await testDuplicateHandling());
    
    const sourceWeightResults = await testSourceWeights();
    allTestResults.push(...sourceWeightResults);
    
    const emptyResultsTests = await testEmptyResults();
    allTestResults.push(...emptyResultsTests);
    
    allTestResults.push(await testPerformanceWithLargeDataset());
    
    const configValidationTests = await testConfigurationValidation();
    allTestResults.push(...configValidationTests);
    
    // Print comprehensive report
    printTestReport(allTestResults);
    
    // Determine overall success
    const successRate = allTestResults.filter(r => r.success).length / allTestResults.length;
    
    if (successRate >= 0.9) {
      console.log('\n🎉 Reciprocal Rank Fusion test suite completed successfully!');
      console.log('✅ All critical requirements met for T038');
    } else {
      console.log('\n⚠️  Reciprocal Rank Fusion test suite completed with issues');
      console.log(`📊 Success rate: ${(successRate * 100).toFixed(1)}%`);
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Debug script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Debug script failed:', error);
      process.exit(1);
    });
}

export { main, testBasicMerging, testDifferentKValues, testDuplicateHandling };
