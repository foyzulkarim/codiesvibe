#!/usr/bin/env node

/**
 * Enhanced Vector Quality Test Script
 * 
 * This script tests the quality and search performance of the enhanced vectors
 * by running various search queries and analyzing the results.
 * 
 * Usage:
 *   npm run test-enhanced-vector-quality
 *   npm run test-enhanced-vector-quality -- --vectorTypes=semantic,entities.categories
 *   npm run test-enhanced-vector-quality -- --sampleQueries=react,docker,api
 */

import { qdrantService } from '../src/services/qdrant.service';
import { embeddingService } from '../src/services/embedding.service';
import { mongoDBService } from '../src/services/mongodb.service';
import { shouldUseEnhancedCollection, getSupportedVectorTypes } from '../src/config/database';
import { getEnabledVectorTypes } from '../src/config/enhanced-qdrant-schema';

// Test queries for different domains
const DEFAULT_TEST_QUERIES = [
  'react components',
  'docker container',
  'api development',
  'machine learning',
  'data visualization',
  'testing framework',
  'database management',
  'web scraping',
  'authentication',
  'cloud deployment'
];

// Parse command line arguments
const args = process.argv.slice(2);
const options: {
  vectorTypes?: string[];
  sampleQueries?: string[];
  limit?: number;
  detailed?: boolean;
} = {};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--vectorTypes=')) {
    options.vectorTypes = arg.split('=')[1].split(',').map(v => v.trim());
  } else if (arg.startsWith('--sampleQueries=')) {
    options.sampleQueries = arg.split('=')[1].split(',').map(v => v.trim());
  } else if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1], 10);
  } else if (arg === '--detailed') {
    options.detailed = true;
  }
}

// Set defaults
if (!options.vectorTypes || options.vectorTypes.length === 0) {
  options.vectorTypes = shouldUseEnhancedCollection() ? getEnabledVectorTypes() : getSupportedVectorTypes();
}
if (!options.sampleQueries || options.sampleQueries.length === 0) {
  options.sampleQueries = DEFAULT_TEST_QUERIES;
}
if (!options.limit) {
  options.limit = 10;
}

interface TestResult {
  query: string;
  vectorType: string;
  results: any[];
  searchTime: number;
  avgSimilarity: number;
  topResultScore: number;
  resultCategories: string[];
  resultFunctionality: string[];
}

interface QualityMetrics {
  avgSearchTime: number;
  avgResultCount: number;
  avgTopScore: number;
  avgSimilarity: number;
  categoryDiversity: number;
  functionalityDiversity: number;
  totalTests: number;
  successfulTests: number;
}

async function main() {
  console.log('🔍 Enhanced Vector Quality Test');
  console.log('===============================');
  console.log(`Using enhanced collection: ${shouldUseEnhancedCollection() ? 'Yes' : 'No'}`);
  console.log(`Vector types to test: ${options.vectorTypes.join(', ')}`);
  console.log(`Sample queries: ${options.sampleQueries.join(', ')}`);
  console.log(`Results limit: ${options.limit}`);
  console.log(`Detailed output: ${options.detailed ? 'Yes' : 'No'}`);
  console.log('');

  try {
    // Check if enhanced collection is available
    if (shouldUseEnhancedCollection()) {
      try {
        const collectionInfo = await qdrantService.getEnhancedCollectionInfo();
        console.log(`✅ Enhanced collection found with ${collectionInfo.points_count} points`);
      } catch (error) {
        console.error('❌ Enhanced collection not found. Please run the enhanced collection creation and seeding scripts first.');
        process.exit(1);
      }
    } else {
      console.log('⚠️ Using legacy collections (separate collection per vector type)');
    }

    // Get sample tools for comparison
    const sampleTools = await mongoDBService.getAllTools();
    console.log(`📊 Found ${sampleTools.length} tools in MongoDB for comparison`);
    console.log('');

    // Run search tests for each vector type and query
    const allResults: TestResult[] = [];
    
    for (const vectorType of options.vectorTypes!) {
      console.log(`🔍 Testing vector type: ${vectorType}`);
      console.log('-'.repeat(50));
      
      for (const query of options.sampleQueries!) {
        try {
          const startTime = Date.now();
          const results = await qdrantService.searchByTextAndVectorType(
            query,
            vectorType,
            options.limit!
          );
          const searchTime = Date.now() - startTime;
          
          // Calculate metrics
          const avgSimilarity = results.length > 0 
            ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
            : 0;
          const topResultScore = results.length > 0 ? results[0].score : 0;
          
          // Extract categories and functionality from results
          const resultCategories = new Set<string>();
          const resultFunctionality = new Set<string>();
          
          results.forEach(result => {
            const payload = result.payload;
            if (payload.categories && Array.isArray(payload.categories)) {
              payload.categories.forEach((cat: string) => resultCategories.add(cat));
            }
            if (payload.functionality && Array.isArray(payload.functionality)) {
              payload.functionality.forEach((func: string) => resultFunctionality.add(func));
            }
          });
          
          const testResult: TestResult = {
            query,
            vectorType,
            results,
            searchTime,
            avgSimilarity,
            topResultScore,
            resultCategories: Array.from(resultCategories),
            resultFunctionality: Array.from(resultFunctionality)
          };
          
          allResults.push(testResult);
          
          // Print detailed results if requested
          if (options.detailed) {
            console.log(`  Query: "${query}"`);
            console.log(`  Results: ${results.length} in ${searchTime}ms`);
            console.log(`  Top score: ${topResultScore.toFixed(4)}`);
            console.log(`  Avg similarity: ${avgSimilarity.toFixed(4)}`);
            console.log(`  Categories: ${testResult.resultCategories.join(', ')}`);
            console.log(`  Functionality: ${testResult.resultFunctionality.join(', ')}`);
            
            if (results.length > 0) {
              console.log('  Top results:');
              results.slice(0, 3).forEach((result, index) => {
                console.log(`    ${index + 1}. ${result.payload.name} (score: ${result.score.toFixed(4)})`);
              });
            }
            console.log('');
          } else {
            console.log(`  "${query}" → ${results.length} results (${searchTime}ms, top: ${topResultScore.toFixed(3)})`);
          }
        } catch (error) {
          console.error(`  ❌ Error searching for "${query}" with ${vectorType}:`, error);
        }
      }
      console.log('');
    }

    // Calculate and display quality metrics
    console.log('📊 Quality Metrics');
    console.log('=================');
    
    const metricsByVectorType: { [vectorType: string]: QualityMetrics } = {};
    
    // Group results by vector type
    for (const vectorType of options.vectorTypes!) {
      const vectorTypeResults = allResults.filter(r => r.vectorType === vectorType);
      
      if (vectorTypeResults.length === 0) {
        console.log(`❌ No results for vector type: ${vectorType}`);
        continue;
      }
      
      // Calculate metrics
      const avgSearchTime = vectorTypeResults.reduce((sum, r) => sum + r.searchTime, 0) / vectorTypeResults.length;
      const avgResultCount = vectorTypeResults.reduce((sum, r) => sum + r.results.length, 0) / vectorTypeResults.length;
      const avgTopScore = vectorTypeResults.reduce((sum, r) => sum + r.topResultScore, 0) / vectorTypeResults.length;
      const avgSimilarity = vectorTypeResults.reduce((sum, r) => sum + r.avgSimilarity, 0) / vectorTypeResults.length;
      
      // Calculate diversity metrics
      const allCategories = new Set<string>();
      const allFunctionality = new Set<string>();
      vectorTypeResults.forEach(result => {
        result.resultCategories.forEach(cat => allCategories.add(cat));
        result.resultFunctionality.forEach(func => allFunctionality.add(func));
      });
      
      const categoryDiversity = allCategories.size / vectorTypeResults.length;
      const functionalityDiversity = allFunctionality.size / vectorTypeResults.length;
      
      metricsByVectorType[vectorType] = {
        avgSearchTime,
        avgResultCount,
        avgTopScore,
        avgSimilarity,
        categoryDiversity,
        functionalityDiversity,
        totalTests: vectorTypeResults.length,
        successfulTests: vectorTypeResults.filter(r => r.results.length > 0).length
      };
      
      // Display metrics
      console.log(`${vectorType}:`);
      console.log(`  Average search time: ${avgSearchTime.toFixed(2)}ms`);
      console.log(`  Average result count: ${avgResultCount.toFixed(1)}`);
      console.log(`  Average top score: ${avgTopScore.toFixed(4)}`);
      console.log(`  Average similarity: ${avgSimilarity.toFixed(4)}`);
      console.log(`  Category diversity: ${categoryDiversity.toFixed(2)} categories/query`);
      console.log(`  Functionality diversity: ${functionalityDiversity.toFixed(2)} functionalities/query`);
      console.log(`  Success rate: ${(metricsByVectorType[vectorType].successfulTests / metricsByVectorType[vectorType].totalTests * 100).toFixed(1)}%`);
      console.log('');
    }
    
    // Compare vector types
    console.log('📈 Vector Type Comparison');
    console.log('=========================');
    
    const vectorTypes = Object.keys(metricsByVectorType);
    if (vectorTypes.length > 1) {
      // Find best performer for each metric
      const bestSearchTime = vectorTypes.reduce((best, vt) => 
        metricsByVectorType[vt].avgSearchTime < metricsByVectorType[best].avgSearchTime ? vt : best
      );
      const bestResultCount = vectorTypes.reduce((best, vt) => 
        metricsByVectorType[vt].avgResultCount > metricsByVectorType[best].avgResultCount ? vt : best
      );
      const bestTopScore = vectorTypes.reduce((best, vt) => 
        metricsByVectorType[vt].avgTopScore > metricsByVectorType[best].avgTopScore ? vt : best
      );
      const bestCategoryDiversity = vectorTypes.reduce((best, vt) => 
        metricsByVectorType[vt].categoryDiversity > metricsByVectorType[best].categoryDiversity ? vt : best
      );
      const bestFunctionalityDiversity = vectorTypes.reduce((best, vt) => 
        metricsByVectorType[vt].functionalityDiversity > metricsByVectorType[best].functionalityDiversity ? vt : best
      );
      
      console.log(`Fastest search: ${bestSearchTime} (${metricsByVectorType[bestSearchTime].avgSearchTime.toFixed(2)}ms)`);
      console.log(`Most results: ${bestResultCount} (${metricsByVectorType[bestResultCount].avgResultCount.toFixed(1)} avg)`);
      console.log(`Highest scores: ${bestTopScore} (${metricsByVectorType[bestTopScore].avgTopScore.toFixed(4)} avg)`);
      console.log(`Best category diversity: ${bestCategoryDiversity} (${metricsByVectorType[bestCategoryDiversity].categoryDiversity.toFixed(2)} categories/query)`);
      console.log(`Best functionality diversity: ${bestFunctionalityDiversity} (${metricsByVectorType[bestFunctionalityDiversity].functionalityDiversity.toFixed(2)} functionalities/query)`);
    } else {
      console.log('Only one vector type tested, no comparison available');
    }
    
    console.log('\n🎉 Enhanced vector quality test completed!');
    
  } catch (error) {
    console.error('💥 Error during enhanced vector quality test:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
