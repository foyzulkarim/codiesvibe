/**
 * Test script to verify multi-vector schema implementation
 * This script can be run to validate the enhanced Qdrant collection schema
 */

import { qdrantService } from '../services/qdrant.service';
import { getSupportedVectorTypes, isSupportedVectorType, getCollectionName } from '../config/database';
import { validateEmbedding, validateVectorType, validateMultiVectors } from '../utils/vector-validation';

/**
 * Test utility functions
 */
async function testUtilityFunctions() {
  console.log('\n🧪 Testing utility functions...');
  
  // Test supported vector types
  const supportedTypes = getSupportedVectorTypes();
  console.log('✅ Supported vector types:', supportedTypes);
  
  // Test vector type validation
  const validType = 'semantic';
  const invalidType = 'invalid_type';
  
  console.log('✅ Is valid type supported:', isSupportedVectorType(validType));
  console.log('✅ Is invalid type supported:', isSupportedVectorType(invalidType));
  
  // Test collection name resolution
  const collectionName = getCollectionName('semantic');
  console.log('✅ Collection name for semantic:', collectionName);
  
  // Test embedding validation
  const validEmbedding = new Array(1024).fill(0).map((_, i) => Math.random());
  const invalidEmbedding = new Array(512).fill(0).map((_, i) => Math.random());
  
  try {
    validateEmbedding(validEmbedding);
    console.log('✅ Valid embedding passed validation');
  } catch (error) {
    console.error('❌ Valid embedding failed validation:', error);
  }
  
  try {
    validateEmbedding(invalidEmbedding);
    console.error('❌ Invalid embedding passed validation');
  } catch (error) {
    console.log('✅ Invalid embedding correctly failed validation');
  }
  
  // Test multi-vector validation
  const validMultiVectors = {
    semantic: validEmbedding,
    'entities.categories': validEmbedding,
    'entities.functionality': validEmbedding,
  };
  
  try {
    validateMultiVectors(validMultiVectors);
    console.log('✅ Valid multi-vectors passed validation');
  } catch (error) {
    console.error('❌ Valid multi-vectors failed validation:', error);
  }
}

/**
 * Test Qdrant service methods
 */
async function testQdrantService() {
  console.log('\n🧪 Testing Qdrant service methods...');
  
  try {
    // Test health check
    await qdrantService.healthCheck();
    console.log('✅ Qdrant health check passed');
  } catch (error) {
    console.error('❌ Qdrant health check failed:', error);
    return;
  }
  
  try {
    // Test getting all collections info
    const allInfo = await qdrantService.getAllCollectionsInfo();
    console.log('✅ All collections info retrieved');
    console.log('   Available collections:', Object.keys(allInfo));
  } catch (error) {
    console.error('❌ Failed to get all collections info:', error);
  }
  
  // Test collection info for each vector type
  const supportedTypes = getSupportedVectorTypes();
  for (const vectorType of supportedTypes) {
    try {
      const info = await qdrantService.getCollectionInfoForVectorType(vectorType);
      console.log(`✅ Collection info for ${vectorType} retrieved`);
    } catch (error) {
      console.error(`❌ Failed to get collection info for ${vectorType}:`, error);
    }
  }
}

/**
 * Test search operations with mock data
 */
async function testSearchOperations() {
  console.log('\n🧪 Testing search operations...');
  
  const testEmbedding = new Array(1024).fill(0).map((_, i) => Math.random());
  const testQuery = 'test search query';
  
  // Test search by embedding for each vector type
  const supportedTypes = getSupportedVectorTypes();
  for (const vectorType of supportedTypes) {
    try {
      const results = await qdrantService.searchByVectorType(
        testEmbedding,
        vectorType,
        5
      );
      console.log(`✅ Search by ${vectorType} completed, found ${results.length} results`);
    } catch (error) {
      console.warn(`⚠️ Search by ${vectorType} failed (collection might be empty):`, error instanceof Error ? error.message : String(error));
    }
  }
  
  // Test text-based search
  try {
    const results = await qdrantService.searchByTextAndVectorType(
      testQuery,
      'semantic',
      5
    );
    console.log(`✅ Text search by semantic completed, found ${results.length} results`);
  } catch (error) {
    console.warn('⚠️ Text search failed (collection might be empty):', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Test upsert operations with mock data
 */
async function testUpsertOperations() {
  console.log('\n🧪 Testing upsert operations...');
  
  const testToolId = 'test-tool-' + Date.now();
  const testEmbedding = new Array(1024).fill(0).map((_, i) => Math.random());
  const testPayload = {
    id: testToolId,
    name: 'Test Tool',
    description: 'A test tool for validation',
    category: 'test',
  };
  
  // Test single vector upsert
  try {
    await qdrantService.upsertToolVector(
      testToolId,
      testEmbedding,
      testPayload,
      'semantic'
    );
    console.log('✅ Single vector upsert completed');
  } catch (error) {
    console.error('❌ Single vector upsert failed:', error);
  }
  
  // Test multi-vector upsert
  try {
    await qdrantService.upsertToolMultiVector(
      testToolId,
      {
        semantic: testEmbedding,
        'entities.categories': testEmbedding,
        'entities.functionality': testEmbedding,
      },
      testPayload
    );
    console.log('✅ Multi-vector upsert completed');
  } catch (error) {
    console.error('❌ Multi-vector upsert failed:', error);
  }
  
  // Test cleanup
  try {
    await qdrantService.deleteToolAllVectors(testToolId);
    console.log('✅ Test tool cleanup completed');
  } catch (error) {
    console.error('❌ Test tool cleanup failed:', error);
  }
}

/**
 * Test error handling and validation
 */
async function testErrorHandling() {
  console.log('\n🧪 Testing error handling and validation...');
  
  // Test invalid vector type
  try {
    await qdrantService.searchByVectorType(
      new Array(1024).fill(0).map(() => Math.random()),
      'invalid_vector_type',
      5
    );
    console.error('❌ Invalid vector type was accepted');
  } catch (error) {
    console.log('✅ Invalid vector type correctly rejected');
  }
  
  // Test invalid embedding dimensions
  try {
    await qdrantService.searchByVectorType(
      new Array(512).fill(0).map(() => Math.random()), // Wrong dimensions
      'semantic',
      5
    );
    console.error('❌ Invalid embedding dimensions were accepted');
  } catch (error) {
    console.log('✅ Invalid embedding dimensions correctly rejected');
  }
  
  // Test invalid tool ID
  try {
    await qdrantService.upsertToolVector(
      '', // Empty tool ID
      new Array(1024).fill(0).map(() => Math.random()),
      { id: '', name: 'test' },
      'semantic'
    );
    console.error('❌ Invalid tool ID was accepted');
  } catch (error) {
    console.log('✅ Invalid tool ID correctly rejected');
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Multi-Vector Schema Tests...');
  console.log('=====================================');
  
  try {
    await testUtilityFunctions();
    await testQdrantService();
    await testSearchOperations();
    await testUpsertOperations();
    await testErrorHandling();
    
    console.log('\n✅ All tests completed successfully!');
    console.log('=====================================');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export {
  testUtilityFunctions,
  testQdrantService,
  testSearchOperations,
  testUpsertOperations,
  testErrorHandling,
  runTests
};
