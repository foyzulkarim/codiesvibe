#!/usr/bin/env ts-node

/**
 * Script to test the enhanced Qdrant collection schema with sample data
 * This script validates the enhanced schema functionality by performing various operations
 */

import { QdrantClient } from "@qdrant/js-client-rest";
import { connectToQdrant, qdrantConfig } from "../src/config/database";
import {
  enhancedCollectionConfig,
  enhancedCollectionNames,
  getEnabledVectorTypes,
  validateEnhancedVectors,
  getVectorConfig
} from "../src/config/enhanced-qdrant-schema";
import { qdrantService } from "../src/services/qdrant.service";
import { embeddingService } from "../src/services/embedding.service";

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
  };
}

/**
 * Generate sample embedding vectors for testing
 */
function generateSampleEmbeddings(): { [vectorType: string]: number[] } {
  const enabledTypes = getEnabledVectorTypes();
  const embeddings: { [vectorType: string]: number[] } = {};
  
  for (const vectorType of enabledTypes) {
    // Generate deterministic random vectors based on vector type
    const seed = vectorType.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    embeddings[vectorType] = Array.from({ length: 1024 }, (_, i) => random(seed + i));
  }
  
  return embeddings;
}

/**
 * Test 1: Validate enhanced collection configuration
 */
async function testEnhancedConfiguration(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = "Enhanced Configuration Validation";
  
  try {
    console.log(`🔍 Testing: ${testName}`);
    
    // Check if enhanced collection is properly configured
    const enabledTypes = getEnabledVectorTypes();
    if (enabledTypes.length === 0) {
      throw new Error("No enabled vector types found");
    }
    
    // Validate vector configurations
    for (const vectorType of enabledTypes) {
      const config = getVectorConfig(vectorType);
      if (!config) {
        throw new Error(`No configuration found for vector type: ${vectorType}`);
      }
      
      if (config.size !== 1024) {
        throw new Error(`Invalid vector size for ${vectorType}: expected 1024, got ${config.size}`);
      }
      
      if (config.distance !== "Cosine") {
        throw new Error(`Invalid distance metric for ${vectorType}: expected Cosine, got ${config.distance}`);
      }
    }
    
    console.log(`   ✅ Configuration valid for ${enabledTypes.length} vector types`);
    console.log(`   ✅ Vector types: ${enabledTypes.join(', ')}`);
    
    return {
      testName,
      success: true,
      duration: Date.now() - startTime,
      details: { enabledTypes, configuration: enhancedCollectionConfig }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ ${testName} failed:`, errorMessage);
    
    return {
      testName,
      success: false,
      duration: Date.now() - startTime,
      error: errorMessage
    };
  }
}

/**
 * Test 2: Enhanced collection creation and validation
 */
async function testEnhancedCollection(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = "Enhanced Collection Operations";
  
  try {
    console.log(`🔍 Testing: ${testName}`);
    
    const client = await connectToQdrant();
    const collectionName = enhancedCollectionNames.primary;
    
    // Check if enhanced collection exists
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === collectionName);
    
    if (!exists) {
      throw new Error(`Enhanced collection ${collectionName} does not exist`);
    }
    
    // Get collection info
    const collectionInfo = await client.getCollection(collectionName);
    const vectorConfig = collectionInfo.config.params.vectors;
    
    if (!vectorConfig || typeof vectorConfig !== 'object') {
      throw new Error("Invalid vector configuration in enhanced collection");
    }
    
    const vectorTypes = Object.keys(vectorConfig);
    const expectedTypes = getEnabledVectorTypes();
    
    // Check if all expected vector types are present
    for (const expectedType of expectedTypes) {
      if (!vectorTypes.includes(expectedType)) {
        throw new Error(`Missing vector type in collection: ${expectedType}`);
      }
    }
    
    console.log(`   ✅ Enhanced collection exists: ${collectionName}`);
    console.log(`   ✅ Vector types configured: ${vectorTypes.join(', ')}`);
    console.log(`   ✅ Points in collection: ${collectionInfo.points_count || 0}`);
    
    return {
      testName,
      success: true,
      duration: Date.now() - startTime,
      details: { 
        collectionName, 
        vectorTypes, 
        pointsCount: collectionInfo.points_count 
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ ${testName} failed:`, errorMessage);
    
    return {
      testName,
      success: false,
      duration: Date.now() - startTime,
      error: errorMessage
    };
  }
}

/**
 * Test 3: Enhanced upsert operations
 */
async function testEnhancedUpsert(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = "Enhanced Upsert Operations";
  
  try {
    console.log(`🔍 Testing: ${testName}`);
    
    const sampleEmbeddings = generateSampleEmbeddings();
    const testToolId = "test-enhanced-tool-001";
    const testPayload = {
      id: testToolId,
      name: "Test Enhanced Tool",
      description: "A test tool for enhanced schema validation",
      category: "test",
      tags: ["test", "enhanced", "schema"]
    };
    
    // Validate sample embeddings
    validateEnhancedVectors(sampleEmbeddings);
    
    // Perform enhanced upsert
    await qdrantService.upsertToolEnhanced(testToolId, sampleEmbeddings, testPayload);
    
    console.log(`   ✅ Successfully upserted tool with ${Object.keys(sampleEmbeddings).length} vectors`);
    
    // Verify the tool was upserted by retrieving vector types
    const vectorTypes = await qdrantService.getToolVectorTypes(testToolId);
    const expectedTypes = Object.keys(sampleEmbeddings);
    
    for (const expectedType of expectedTypes) {
      if (!vectorTypes.includes(expectedType)) {
        throw new Error(`Missing vector type after upsert: ${expectedType}`);
      }
    }
    
    console.log(`   ✅ Verified vector types: ${vectorTypes.join(', ')}`);
    
    return {
      testName,
      success: true,
      duration: Date.now() - startTime,
      details: { 
        toolId: testToolId, 
        vectorTypes: Object.keys(sampleEmbeddings),
        verifiedTypes: vectorTypes
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ ${testName} failed:`, errorMessage);
    
    return {
      testName,
      success: false,
      duration: Date.now() - startTime,
      error: errorMessage
    };
  }
}

/**
 * Test 4: Enhanced search operations
 */
async function testEnhancedSearch(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = "Enhanced Search Operations";
  
  try {
    console.log(`🔍 Testing: ${testName}`);
    
    const testQuery = "test tool for enhanced schema";
    const enabledTypes = getEnabledVectorTypes();
    const searchResults: { [vectorType: string]: any[] } = {};
    
    // Test search for each vector type
    for (const vectorType of enabledTypes) {
      const results = await qdrantService.searchByTextAndVectorType(
        testQuery,
        vectorType,
        5,
        { category: "test" }
      );
      
      searchResults[vectorType] = results;
      console.log(`   ✅ Search ${vectorType}: ${results.length} results`);
    }
    
    // Test multi-vector search
    const embedding = await embeddingService.generateEmbedding(testQuery);
    const semanticResults = await qdrantService.searchByEmbedding(
      embedding,
      10,
      { category: "test" },
      "semantic"
    );
    
    searchResults.semantic = semanticResults;
    console.log(`   ✅ Semantic search: ${semanticResults.length} results`);
    
    return {
      testName,
      success: true,
      duration: Date.now() - startTime,
      details: { 
        query: testQuery,
        vectorTypes: enabledTypes,
        resultCounts: Object.fromEntries(
          Object.entries(searchResults).map(([type, results]) => [type, results.length])
        )
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ ${testName} failed:`, errorMessage);
    
    return {
      testName,
      success: false,
      duration: Date.now() - startTime,
      error: errorMessage
    };
  }
}

/**
 * Test 5: Similar tools search
 */
async function testSimilarToolsSearch(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = "Similar Tools Search";
  
  try {
    console.log(`🔍 Testing: ${testName}`);
    
    const testToolId = "test-enhanced-tool-001";
    const enabledTypes = getEnabledVectorTypes();
    const similarityResults: { [vectorType: string]: any[] } = {};
    
    // Test similar tools search for each vector type
    for (const vectorType of enabledTypes) {
      try {
        const results = await qdrantService.findSimilarTools(
          testToolId,
          3,
          undefined,
          vectorType
        );
        
        similarityResults[vectorType] = results;
        console.log(`   ✅ Similar tools ${vectorType}: ${results.length} results`);
      } catch (error) {
        console.log(`   ⚠️  Similar tools ${vectorType}: ${error instanceof Error ? error.message : String(error)}`);
        similarityResults[vectorType] = [];
      }
    }
    
    return {
      testName,
      success: true,
      duration: Date.now() - startTime,
      details: { 
        referenceToolId: testToolId,
        vectorTypes: enabledTypes,
        resultCounts: Object.fromEntries(
          Object.entries(similarityResults).map(([type, results]) => [type, results.length])
        )
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ ${testName} failed:`, errorMessage);
    
    return {
      testName,
      success: false,
      duration: Date.now() - startTime,
      error: errorMessage
    };
  }
}

/**
 * Test 6: Enhanced collection health check
 */
async function testHealthCheck(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = "Enhanced Health Check";
  
  try {
    console.log(`🔍 Testing: ${testName}`);
    
    const healthInfo = await qdrantService.healthCheck();
    const vectorSupport = qdrantService.getEnhancedVectorSupport();
    
    console.log(`   ✅ Health status: ${healthInfo.status}`);
    console.log(`   ✅ Enhanced enabled: ${vectorSupport.enabled}`);
    console.log(`   ✅ Supported types: ${vectorSupport.supportedTypes.length}`);
    
    if (healthInfo.status !== "healthy") {
      console.warn(`   ⚠️  Health status is not healthy: ${healthInfo.status}`);
    }
    
    return {
      testName,
      success: true,
      duration: Date.now() - startTime,
      details: { 
        healthStatus: healthInfo.status,
        vectorSupport,
        collections: Object.keys(healthInfo.collections)
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ ${testName} failed:`, errorMessage);
    
    return {
      testName,
      success: false,
      duration: Date.now() - startTime,
      error: errorMessage
    };
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData(): Promise<void> {
  try {
    console.log(`\n🧹 Cleaning up test data...`);
    
    const testToolId = "test-enhanced-tool-001";
    await qdrantService.deleteToolFromEnhanced(testToolId);
    
    console.log(`   ✅ Cleaned up test tool: ${testToolId}`);
  } catch (error) {
    console.warn(`   ⚠️  Cleanup failed:`, error);
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<TestSuite> {
  const startTime = Date.now();
  
  console.log("🧪 Starting Enhanced Qdrant Schema Tests");
  console.log(`   Target: ${qdrantConfig.host}:${qdrantConfig.port}`);
  console.log(`   Enhanced collection: ${enhancedCollectionNames.primary}`);
  
  const tests = [
    testEnhancedConfiguration,
    testEnhancedCollection,
    testEnhancedUpsert,
    testEnhancedSearch,
    testSimilarToolsSearch,
    testHealthCheck
  ];
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        testName: test.name,
        success: false,
        duration: 0,
        error: errorMessage
      });
    }
    
    // Add small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const endTime = Date.now();
  const passedTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;
  
  const testSuite: TestSuite = {
    name: "Enhanced Qdrant Schema Tests",
    results,
    summary: {
      totalTests: results.length,
      passedTests,
      failedTests,
      totalDuration: endTime - startTime
    }
  };
  
  // Display results
  console.log(`\n📊 Test Results:`);
  console.log(`   Total tests: ${testSuite.summary.totalTests}`);
  console.log(`   Passed: ${testSuite.summary.passedTests}`);
  console.log(`   Failed: ${testSuite.summary.failedTests}`);
  console.log(`   Duration: ${testSuite.summary.totalDuration}ms`);
  
  console.log(`\n📋 Test Details:`);
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const duration = `${result.duration}ms`;
    console.log(`   ${status} ${result.testName} (${duration})`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  }
  
  // Cleanup
  await cleanupTestData();
  
  return testSuite;
}

/**
 * Main script execution
 */
async function main(): Promise<void> {
  try {
    const testSuite = await runTests();
    
    if (testSuite.summary.failedTests > 0) {
      console.log(`\n❌ Some tests failed. Check the logs above for details.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All tests passed! Enhanced schema is working correctly.`);
    }
  } catch (error) {
    console.error(`❌ Test execution failed:`, error);
    process.exit(1);
  }
}

// Execute script if run directly
if (require.main === module) {
  main().catch(error => {
    console.error("❌ Unhandled error:", error);
    process.exit(1);
  });
}

export { main as testEnhancedSchema };
