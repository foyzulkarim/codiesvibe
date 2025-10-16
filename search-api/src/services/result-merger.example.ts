/**
 * Example usage of the Result Merger Service
 * 
 * This file demonstrates how to use the Reciprocal Rank Fusion algorithm
 * to merge search results from multiple sources.
 */

import { resultMergerService, ReciprocalRankFusion, RankedResults } from './result-merger.service';

// Example 1: Basic usage with different search sources
export async function basicExample() {
  console.log('🔍 Basic Result Merger Example\n');
  
  // Simulate results from different search sources
  const vectorSearchResults: RankedResults = {
    source: 'vector',
    results: [
      {
        id: 'tool_1',
        score: 0.95,
        payload: {
          name: 'React Components',
          description: 'A library of reusable React components',
          category: 'frontend'
        }
      },
      {
        id: 'tool_2',
        score: 0.87,
        payload: {
          name: 'TypeScript Utils',
          description: 'TypeScript utility functions',
          category: 'development'
        }
      },
      {
        id: 'tool_3',
        score: 0.82,
        payload: {
          name: 'CSS Framework',
          description: 'Modern CSS framework for styling',
          category: 'frontend'
        }
      }
    ],
    totalResults: 3,
    searchTime: 120
  };
  
  const traditionalSearchResults: RankedResults = {
    source: 'traditional',
    results: [
      {
        id: 'tool_4',
        score: 0.91,
        payload: {
          name: 'JavaScript SDK',
          description: 'JavaScript SDK for API integration',
          category: 'development'
        }
      },
      {
        id: 'tool_2', // Same as vector search result
        score: 0.85,
        payload: {
          name: 'TypeScript Utils',
          description: 'TypeScript utility functions and helpers',
          category: 'development'
        }
      },
      {
        id: 'tool_5',
        score: 0.78,
        payload: {
          name: 'Node.js Server',
          description: 'Lightweight Node.js server framework',
          category: 'backend'
        }
      }
    ],
    totalResults: 3,
    searchTime: 85
  };
  
  // Merge results using RRF
  const mergedResults = await resultMergerService.mergeResults([
    vectorSearchResults,
    traditionalSearchResults
  ]);
  
  console.log(`Merged ${vectorSearchResults.results.length + traditionalSearchResults.results.length} results into ${mergedResults.length} unique results:\n`);
  
  mergedResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.payload.name}`);
    console.log(`   RRF Score: ${result.rrfScore.toFixed(4)}`);
    console.log(`   Sources: ${Object.keys(result.originalRankings).join(', ')}`);
    console.log(`   Final Rank: ${result.finalRank}\n`);
  });
}

// Example 2: Custom configuration with source weights
export async function customConfigExample() {
  console.log('⚙️ Custom Configuration Example\n');
  
  // Create a custom merger with specific weights
  const customMerger = new ReciprocalRankFusion({
    kValue: 60, // Standard k value for RRF
    maxResults: 10,
    enableDeduplication: true,
    deduplicationThreshold: 0.8,
    sourceWeights: {
      semantic: 1.2,    // Give more weight to semantic search
      traditional: 0.8,  // Less weight to traditional search
      hybrid: 1.0        // Standard weight for hybrid
    }
  });
  
  // Simulate results from semantic search
  const semanticResults: RankedResults = {
    source: 'semantic',
    results: [
      {
        id: 'semantic_1',
        score: 0.92,
        payload: { name: 'Semantic Tool 1', category: 'ai' }
      },
      {
        id: 'semantic_2',
        score: 0.88,
        payload: { name: 'Semantic Tool 2', category: 'ai' }
      }
    ]
  };
  
  // Simulate results from traditional search
  const traditionalResults: RankedResults = {
    source: 'traditional',
    results: [
      {
        id: 'traditional_1',
        score: 0.90,
        payload: { name: 'Traditional Tool 1', category: 'database' }
      },
      {
        id: 'semantic_2', // Duplicate
        score: 0.85,
        payload: { name: 'Semantic Tool 2', category: 'ai' }
      }
    ]
  };
  
  const mergedResults = await customMerger.mergeResults([
    semanticResults,
    traditionalResults
  ]);
  
  console.log('Results with custom weights (semantic: 1.2, traditional: 0.8):\n');
  
  mergedResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.payload.name}`);
    console.log(`   RRF Score: ${result.rrfScore.toFixed(4)}`);
    console.log(`   Source Count: ${result.sourceCount}`);
    console.log(`   Original Rankings: ${JSON.stringify(result.originalRankings, null, 2)}\n`);
  });
}

// Example 3: Real-world scenario with multiple search types
export async function realWorldExample() {
  console.log('🌍 Real-World Example\n');
  
  // Simulate a complex search scenario
  const searchQuery = 'react components library';
  
  const searchResults = [
    {
      source: 'semantic',
      results: [
        {
          id: 'react_lib_1',
          score: 0.94,
          payload: {
            name: 'React UI Components',
            description: 'Comprehensive React component library',
            category: 'frontend',
            tags: ['react', 'components', 'ui']
          }
        },
        {
          id: 'react_lib_2',
          score: 0.89,
          payload: {
            name: 'React Design System',
            description: 'Enterprise design system for React',
            category: 'frontend',
            tags: ['react', 'design-system']
          }
        }
      ]
    },
    {
      source: 'fulltext',
      results: [
        {
          id: 'react_lib_3',
          score: 0.91,
          payload: {
            name: 'React Component Kit',
            description: 'Kit of reusable React components',
            category: 'frontend',
            tags: ['react', 'kit', 'components']
          }
        },
        {
          id: 'react_lib_1', // Duplicate
          score: 0.88,
          payload: {
            name: 'React UI Components',
            description: 'Comprehensive React component library with TypeScript support',
            category: 'frontend',
            tags: ['react', 'components', 'ui', 'typescript']
          }
        }
      ]
    },
    {
      source: 'hybrid',
      results: [
        {
          id: 'react_lib_4',
          score: 0.93,
          payload: {
            name: 'React Material Components',
            description: 'Material Design components for React',
            category: 'frontend',
            tags: ['react', 'material', 'components']
          }
        },
        {
          id: 'react_lib_2', // Duplicate
          score: 0.87,
          payload: {
            name: 'React Design System',
            description: 'Enterprise design system for React applications',
            category: 'frontend',
            tags: ['react', 'design-system', 'enterprise']
          }
        }
      ]
    }
  ];
  
  const mergedResults = await resultMergerService.mergeResults(searchResults, {
    enableDeduplication: true,
    deduplicationThreshold: 0.85,
    preserveMetadata: true
  });
  
  console.log(`Search results for query: "${searchQuery}"\n`);
  console.log(`Found ${mergedResults.length} unique results from ${searchResults.length} search sources:\n`);
  
  mergedResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.payload.name}`);
    console.log(`   Description: ${result.payload.description}`);
    console.log(`   RRF Score: ${result.rrfScore.toFixed(4)}`);
    console.log(`   Found in: ${Object.keys(result.originalRankings).join(', ')}`);
    console.log(`   Tags: ${(result.payload.tags || []).join(', ')}`);
    console.log('');
  });
}

// Run all examples
export async function runAllExamples() {
  console.log('🚀 Result Merger Service Examples\n');
  console.log('=' .repeat(50));
  
  basicExample();
  console.log('=' .repeat(50));
  
  customConfigExample();
  console.log('=' .repeat(50));
  
  realWorldExample();
  console.log('=' .repeat(50));
  
  console.log('✅ All examples completed successfully!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
