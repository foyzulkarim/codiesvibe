#!/usr/bin/env ts-node

/**
 * Test script for intelligentSearch function
 * 
 * Usage:
 * npm run test-search
 * or
 * npx ts-node test-intelligent-search.ts
 * 
 * You can modify the test queries and options below to test different scenarios
 */

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import path from 'path';

// Load environment variables
dotenv.config();

// Import the intelligentSearch function
import { intelligentSearch } from '../src/graphs/main.graph';

interface SearchOptions {
  debug?: boolean;
  threadId?: string;
  enableRecovery?: boolean;
  validateState?: boolean;
  maxRetries?: number;
  timeout?: number;
}

interface TestCase {
  name: string;
  query: string;
  options?: SearchOptions;
  description: string;
}

// Environment validation
function validateEnvironment(): void {
  const requiredEnvVars = [
    'MONGODB_URI',
    'MONGODB_DB_NAME',
    'QDRANT_HOST',
    'QDRANT_PORT',
    'QDRANT_COLLECTION_NAME',
    'OLLAMA_BASE_URL',
    'OLLAMA_MODEL',
    'OLLAMA_EMBEDDING_MODEL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env file or copy from .env.example');
    process.exit(1);
  }
}

// Service health checks
async function checkServices(): Promise<void> {
  console.log('🔍 Checking service connectivity...');
  
  try {
    // Test MongoDB
    console.log('  📊 Testing MongoDB connection...');
    const mongoClient = new MongoClient(process.env.MONGODB_URI!);
    await mongoClient.connect();
    await mongoClient.db().admin().ping();
    await mongoClient.close();
    console.log('  ✅ MongoDB: Connected');

    // Test Qdrant
    console.log('  🔍 Testing Qdrant connection...');
    await axios.get(`http://${process.env.QDRANT_HOST}:${process.env.QDRANT_PORT}/collections`);
    console.log('  ✅ Qdrant: Connected');

    // Test Ollama
    console.log('  🤖 Testing Ollama connection...');
    await axios.get(`${process.env.OLLAMA_BASE_URL}/api/tags`);
    console.log('  ✅ Ollama: Connected');
    
    console.log('✅ All services are healthy!\n');
  } catch (error) {
    console.error('❌ Service connectivity check failed:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    console.error('\nPlease ensure all services are running:');
    console.error('  - MongoDB (check MONGODB_URI)');
    console.error('  - Qdrant (check QDRANT_HOST and QDRANT_PORT)');
    console.error('  - Ollama (check OLLAMA_BASE_URL)');
    process.exit(1);
  }
}

async function runTests() {
  console.log('🚀 Starting intelligentSearch tests...\n');
  
  // Validate environment and check services
  validateEnvironment();
  await checkServices();

  // Test cases - modify these as needed
  const testCases: TestCase[] = [
    {
      name: 'Basic Search Test',
      query: 'find tools for web development',
      description: 'Basic search functionality test',
      options: {
        debug: true
      }
    },
    {
      name: 'Search with Thread ID',
      query: 'javascript frameworks',
      description: 'Test search with specific thread ID',
      options: {
        debug: true,
        threadId: 'test-thread-001'
      }
    },
    {
      name: 'Search with Recovery Disabled',
      query: 'database tools',
      description: 'Test search with recovery disabled',
      options: {
        debug: true,
        enableRecovery: false
      }
    },
    {
      name: 'Search with State Validation',
      query: 'AI and machine learning tools',
      description: 'Test search with state validation enabled',
      options: {
        debug: true,
        validateState: true,
        maxRetries: 3,
        timeout: 30000
      }
    }
  ];

  // Run each test case
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📋 Test ${i + 1}: ${testCase.name}`);
    console.log(`📝 Description: ${testCase.description}`);
    console.log(`🔍 Query: "${testCase.query}"`);
    console.log(`⚙️  Options:`, JSON.stringify(testCase.options, null, 2));
    console.log('─'.repeat(50));

    try {
      const startTime = Date.now();
      const result = await intelligentSearch(testCase.query, testCase.options);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log('✅ Test completed successfully!');
      console.log(`⏱️  Execution time: ${executionTime}ms`);
      console.log(`🎯 Strategy: ${result.strategy}`);
      console.log(`📊 Results count: ${result.results?.length || 0}`);
      console.log(`🧵 Thread ID: ${result.threadId}`);
      console.log(`💡 Explanation: ${result.explanation}`);
      
      if (result.results && result.results.length > 0) {
        console.log('\n📋 Sample results:');
        result.results.slice(0, 3).forEach((item: any, index: number) => {
          console.log(`  ${index + 1}. ${item.name || item.title || 'Unknown'}`);
        });
      }

      if (result.metadata) {
        console.log('\n📈 Metadata:');
        console.log(`  - Execution path: ${result.metadata.executionPath?.join(' → ') || 'N/A'}`);
        console.log(`  - Results count: ${result.metadata.resultsCount || 0}`);
        if (result.metadata.error) {
          console.log(`  - Error: ${result.metadata.error}`);
        }
      }

    } catch (error) {
      console.error('❌ Test failed with error:');
      console.error(error);
    }

    console.log('\n' + '='.repeat(60));
  }

  console.log('\n🎉 All tests completed!');
}

// Custom test function - you can modify this to test specific scenarios
async function customTest() {
  console.log('\n🧪 Running custom test...');
  
  // Modify this section to test your specific use case
  const customQuery = 'free cli';
  const customOptions = {
    debug: true,
    // Add any other options you want to test
  };

  try {
    console.log(`🔍 Searching for: "${customQuery}"`);
    console.log(`⚙️ Options:`, JSON.stringify(customOptions, null, 2));
    
    const result = await intelligentSearch(customQuery, customOptions);
    
    console.log('\n📊 Custom test result:');
    console.log('- Results count:', result.results?.length || 0);
    console.log('- Strategy used:', result.strategy);
    console.log('- Thread ID:', result.threadId);
    console.log('- Explanation:', result.explanation);
    
    if (result.results && result.results.length > 0) {
      console.log('\n🎯 Sample results:');
      result.results.slice(0, 3).forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name} (Score: ${tool.score || 'N/A'})`);
      });
    } else {
      console.log('\n❌ No results found!');
      console.log('Full result object:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('Custom test failed:', error);
    console.error('Error stack:', error.stack);
  }
}

// Main execution
async function main() {
  try {
    // Run predefined tests
    // await runTests();
    
    // Uncomment the line below to run custom test
    await customTest();
    process.exit(0);
  } catch (error) {
    console.error('Script execution failed:', error);
    process.exit(1);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  main();
}

export { runTests, customTest };
