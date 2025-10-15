#!/usr/bin/env ts-node

/**
 * Enhanced Graph Flow Testing Script
 * 
 * This script tests the enhanced graph with new state transitions and ensures
 * the multi-stage pipeline works correctly with all new components.
 * 
 * Usage:
 * npm run test-enhanced-graph
 * or
 * npx ts-node -r tsconfig-paths/register test-enhanced-graph.ts
 */

import dotenv from 'dotenv';
import { intelligentSearch } from '../src/graphs/main.graph';
import { localNLPService } from '../src/services/local-nlp.service';
import { contextEnrichmentService } from '../src/services/context-enrichment.service';
import { multiVectorSearchService } from '../src/services/multi-vector-search.service';
import { defaultEnhancedSearchConfig } from '../src/config/enhanced-search-config';
import { validateEnhancedState } from '../src/types/enhanced-state';
import { initializeDebugServices, validateEnvironment as validateEnv } from './utils/debug-init';

// Load environment variables
dotenv.config();

interface EnhancedTestCase {
  name: string;
  query: string;
  description: string;
  expectedStages: string[];
  expectedFeatures: string[];
  options: {
    debug?: boolean;
    threadId?: string;
    enableRecovery?: boolean;
    enableStateValidation?: boolean;
    validationConfig?: any;
    performanceThresholds?: {
      totalTime?: number;
      contextEnrichment?: number;
      localNLP?: number;
      vectorSearch?: number;
    };
  };
}

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  stages: string[];
  features: string[];
  performance: Record<string, number>;
  stateTransitions: Array<{
    from: string;
    to: string;
    timestamp: number;
    duration: number;
  }>;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
    averagePerformance: Record<string, number>;
  };
}

// Comprehensive test cases for enhanced graph
const enhancedTestCases: EnhancedTestCase[] = [
  {
    name: 'Basic Enhanced Flow',
    query: 'react components for dashboard development',
    description: 'Test basic enhanced graph flow with all stages',
    expectedStages: ['intent-extraction', 'context-enrichment', 'query-planning', 'execution', 'final-completion'],
    expectedFeatures: ['contextEnrichment', 'localNLP', 'multiVectorSearch', 'enhancedResultMerging'],
    options: {
      debug: true,
      enableRecovery: true,
      enableStateValidation: true,
      validationConfig: {
        enableStrictValidation: true,
        enableConsistencyChecks: true,
        enableAutoRollback: true
      },
      performanceThresholds: {
        totalTime: 5000,
        contextEnrichment: 200,
        localNLP: 100,
        vectorSearch: 1000
      }
    }
  },
  {
    name: 'Complex Query with Context Enrichment',
    query: 'free API tools for developers with REST support and authentication',
    description: 'Test complex query with rich context enrichment',
    expectedStages: ['intent-extraction', 'context-enrichment', 'query-planning', 'execution', 'final-completion'],
    expectedFeatures: ['contextEnrichment', 'multiVectorSearch', 'enhancedResultMerging'],
    options: {
      debug: true,
      enableRecovery: true,
      enableStateValidation: true,
      performanceThresholds: {
        totalTime: 6000,
        contextEnrichment: 200,
        vectorSearch: 1500
      }
    }
  },
  {
    name: 'Local NLP Processing Test',
    query: 'compare vs code and vscode for javascript development',
    description: 'Test local NLP processing with comparison query',
    expectedStages: ['intent-extraction', 'context-enrichment', 'query-planning', 'execution', 'final-completion'],
    expectedFeatures: ['localNLP', 'enhancedResultMerging'],
    options: {
      debug: true,
      enableRecovery: true,
      enableStateValidation: true,
      performanceThresholds: {
        totalTime: 4000,
        localNLP: 100
      }
    }
  },
  {
    name: 'Multi-Vector Search Integration',
    query: 'database tools for web applications with caching and indexing',
    description: 'Test multi-vector search with multiple query aspects',
    expectedStages: ['intent-extraction', 'context-enrichment', 'query-planning', 'execution', 'final-completion'],
    expectedFeatures: ['multiVectorSearch', 'enhancedResultMerging'],
    options: {
      debug: true,
      enableRecovery: true,
      enableStateValidation: true,
      performanceThresholds: {
        totalTime: 5000,
        vectorSearch: 1200
      }
    }
  },
  {
    name: 'Error Recovery and Rollback',
    query: 'nonexistent tool category with specific requirements',
    description: 'Test error handling and recovery mechanisms',
    expectedStages: ['intent-extraction', 'context-enrichment', 'query-planning', 'execution', 'final-completion'],
    expectedFeatures: ['contextEnrichment', 'enhancedResultMerging'],
    options: {
      debug: true,
      enableRecovery: true,
      enableStateValidation: true,
      validationConfig: {
        enableStrictValidation: true,
        enableAutoRollback: true
      },
      performanceThresholds: {
        totalTime: 8000 // Allow more time for recovery
      }
    }
  },
  {
    name: 'Performance Stress Test',
    query: 'find tools for enterprise microservices architecture with kubernetes deployment monitoring logging and CI/CD pipeline integration',
    description: 'Test performance with complex multi-faceted query',
    expectedStages: ['intent-extraction', 'context-enrichment', 'query-planning', 'execution', 'final-completion'],
    expectedFeatures: ['contextEnrichment', 'localNLP', 'multiVectorSearch', 'enhancedResultMerging', 'dynamicExecutionPlanning'],
    options: {
      debug: true,
      enableRecovery: true,
      enableStateValidation: true,
      performanceThresholds: {
        totalTime: 10000,
        contextEnrichment: 300,
        localNLP: 150,
        vectorSearch: 2000
      }
    }
  }
];

/**
 * Initialize enhanced services for testing
 */
async function initializeEnhancedServices(): Promise<void> {
  console.log('🚀 Initializing Enhanced Services for Testing...');
  
  try {
    // Initialize debug services first
    await initializeDebugServices();
    
    // Initialize local NLP service
    await localNLPService.initialize();
    console.log('✅ Local NLP service initialized');
    
    // Initialize context enrichment service
    await contextEnrichmentService.initialize();
    console.log('✅ Context enrichment service initialized');
    
    // Initialize multi-vector search service
    await multiVectorSearchService.initialize();
    console.log('✅ Multi-vector search service initialized');
    
    // Display enhanced configuration
    console.log('\n📋 Enhanced Configuration:');
    console.log(`  - Context Enrichment: ${defaultEnhancedSearchConfig.contextEnrichment.enabled ? '✅' : '❌'}`);
    console.log(`  - Local NLP: ${defaultEnhancedSearchConfig.localNLP.enabled ? '✅' : '❌'}`);
    console.log(`  - Multi-Vector Search: ${defaultEnhancedSearchConfig.multiVectorSearch.enabled ? '✅' : '❌'}`);
    console.log(`  - Enhanced Result Merging: ${defaultEnhancedSearchConfig.featureFlags.enhancedResultMerging ? '✅' : '❌'}`);
    console.log(`  - Dynamic Execution Planning: ${defaultEnhancedSearchConfig.featureFlags.dynamicExecutionPlanning ? '✅' : '❌'}`);
    console.log(`  - Performance Optimization: ${defaultEnhancedSearchConfig.featureFlags.performanceOptimization ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize enhanced services:', error);
    throw error;
  }
}

/**
 * Test individual enhanced graph flow
 */
async function testEnhancedGraphFlow(testCase: EnhancedTestCase): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    testName: testCase.name,
    success: false,
    duration: 0,
    stages: [],
    features: [],
    performance: {},
    stateTransitions: [],
    errors: [],
    warnings: [],
    metadata: {}
  };
  
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`📝 Description: ${testCase.description}`);
  console.log(`🔍 Query: "${testCase.query}"`);
  console.log(`⚙️  Expected Stages: ${testCase.expectedStages.join(' → ')}`);
  console.log(`🎯 Expected Features: ${testCase.expectedFeatures.join(', ')}`);
  console.log('─'.repeat(80));
  
  try {
    // Execute enhanced search
    const searchResult = await intelligentSearch(testCase.query, testCase.options);
    const endTime = Date.now();
    
    result.duration = endTime - startTime;
    
    // Extract execution path and stages
    if (searchResult.metadata?.executionPath) {
      result.stages = searchResult.metadata.executionPath;
    }
    
    // Extract performance metrics
    if (searchResult.metadata?.nodeExecutionTimes) {
      result.performance = searchResult.metadata.nodeExecutionTimes;
    }
    
    // Validate expected stages
    const missingStages = testCase.expectedStages.filter(stage => !result.stages.includes(stage));
    if (missingStages.length > 0) {
      result.warnings.push(`Missing expected stages: ${missingStages.join(', ')}`);
    }
    
    // Validate enhanced features
    await validateEnhancedFeatures(searchResult, testCase, result);
    
    // Check performance thresholds
    validatePerformanceThresholds(testCase, result);
    
    // Validate state integrity
    await validateStateIntegrity(searchResult, result);
    
    // Extract metadata
    result.metadata = {
      resultsCount: searchResult.results?.length || 0,
      strategy: searchResult.strategy,
      explanation: searchResult.explanation,
      threadId: searchResult.threadId,
      enhancedFeatures: detectEnabledFeatures(searchResult)
    };
    
    // Log results
    console.log(`✅ Test completed in ${result.duration}ms`);
    console.log(`📊 Results: ${result.metadata.resultsCount} items found`);
    console.log(`🎯 Strategy: ${result.metadata.strategy}`);
    console.log(`🧵 Thread ID: ${result.metadata.threadId}`);
    
    if (result.stages.length > 0) {
      console.log(`🛤️  Execution Path: ${result.stages.join(' → ')}`);
    }
    
    if (Object.keys(result.performance).length > 0) {
      console.log(`⏱️  Performance Metrics:`);
      Object.entries(result.performance).forEach(([stage, time]) => {
        console.log(`    - ${stage}: ${time}ms`);
      });
    }
    
    if (result.metadata.enhancedFeatures.length > 0) {
      console.log(`🚀 Enhanced Features: ${result.metadata.enhancedFeatures.join(', ')}`);
    }
    
    // Display warnings and errors
    if (result.warnings.length > 0) {
      console.log(`⚠️  Warnings:`);
      result.warnings.forEach(warning => console.log(`    - ${warning}`));
    }
    
    if (result.errors.length > 0) {
      console.log(`❌ Errors:`);
      result.errors.forEach(error => console.log(`    - ${error}`));
    }
    
    result.success = result.errors.length === 0;
    
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.errors.push(`Test execution failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`❌ Test failed:`, error);
  }
  
  return result;
}

/**
 * Validate enhanced features in search result
 */
async function validateEnhancedFeatures(
  searchResult: any,
  testCase: EnhancedTestCase,
  result: TestResult
): Promise<void> {
  const enabledFeatures = detectEnabledFeatures(searchResult);
  result.features = enabledFeatures;
  
  // Check if expected features are present
  const missingFeatures = testCase.expectedFeatures.filter(feature => !enabledFeatures.includes(feature));
  if (missingFeatures.length > 0) {
    result.warnings.push(`Missing expected features: ${missingFeatures.join(', ')}`);
  }
  
  // Validate context enrichment
  if (enabledFeatures.includes('contextEnrichment')) {
    if (!searchResult.entityStatistics || Object.keys(searchResult.entityStatistics).length === 0) {
      result.warnings.push('Context enrichment enabled but no entity statistics found');
    }
  }
  
  // Validate local NLP processing
  if (enabledFeatures.includes('localNLP')) {
    // Check if local NLP was used (might be in metadata or state)
    if (!searchResult.metadata?.localNLPUsed) {
      result.warnings.push('Local NLP feature enabled but no evidence of usage found');
    }
  }
  
  // Validate multi-vector search
  if (enabledFeatures.includes('multiVectorSearch')) {
    if (!searchResult.metadata?.vectorTypes || searchResult.metadata.vectorTypes.length < 2) {
      result.warnings.push('Multi-vector search enabled but limited vector types found');
    }
  }
}

/**
 * Validate performance thresholds
 */
function validatePerformanceThresholds(testCase: EnhancedTestCase, result: TestResult): void {
  if (!testCase.options.performanceThresholds) return;
  
  const thresholds = testCase.options.performanceThresholds;
  
  // Check total execution time
  if (thresholds.totalTime && result.duration > thresholds.totalTime) {
    result.warnings.push(`Total execution time ${result.duration}ms exceeds threshold ${thresholds.totalTime}ms`);
  }
  
  // Check individual stage performance
  if (thresholds.contextEnrichment && result.performance['context-enrichment']) {
    if (result.performance['context-enrichment'] > thresholds.contextEnrichment) {
      result.warnings.push(`Context enrichment time ${result.performance['context-enrichment']}ms exceeds threshold ${thresholds.contextEnrichment}ms`);
    }
  }
  
  if (thresholds.localNLP && result.performance['intent-extraction']) {
    if (result.performance['intent-extraction'] > thresholds.localNLP) {
      result.warnings.push(`Local NLP processing time ${result.performance['intent-extraction']}ms exceeds threshold ${thresholds.localNLP}ms`);
    }
  }
  
  if (thresholds.vectorSearch && result.performance['execution']) {
    if (result.performance['execution'] > thresholds.vectorSearch) {
      result.warnings.push(`Vector search time ${result.performance['execution']}ms exceeds threshold ${thresholds.vectorSearch}ms`);
    }
  }
}

/**
 * Validate state integrity
 */
async function validateStateIntegrity(searchResult: any, result: TestResult): Promise<void> {
  try {
    // Create a mock state for validation
    const mockState = {
      query: searchResult.query,
      completion: searchResult,
      metadata: searchResult.metadata,
      entityStatistics: searchResult.entityStatistics,
      // Add other relevant fields
    };
    
    const validation = validateEnhancedState(mockState);
    if (!validation.isValid) {
      result.errors.push(...validation.errors);
    }
  } catch (error) {
    result.warnings.push(`State validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Detect enabled enhanced features from search result
 */
function detectEnabledFeatures(searchResult: any): string[] {
  const features: string[] = [];
  
  // Check context enrichment
  if (searchResult.entityStatistics || searchResult.metadataContext) {
    features.push('contextEnrichment');
  }
  
  // Check local NLP
  if (searchResult.metadata?.localNLPUsed || searchResult.extractionSignals?.nerResults) {
    features.push('localNLP');
  }
  
  // Check multi-vector search
  if (searchResult.metadata?.vectorTypes && searchResult.metadata.vectorTypes.length > 1) {
    features.push('multiVectorSearch');
  }
  
  // Check enhanced result merging
  if (searchResult.metadata?.mergingStrategy || searchResult.metadata?.diversityScore) {
    features.push('enhancedResultMerging');
  }
  
  // Check dynamic execution planning
  if (searchResult.metadata?.adaptiveRouting || searchResult.plan?.execution_plan?.length > 1) {
    features.push('dynamicExecutionPlanning');
  }
  
  // Check performance optimization
  if (searchResult.metadata?.cacheMetrics || searchResult.metadata?.resourceUsage) {
    features.push('performanceOptimization');
  }
  
  return features;
}

/**
 * Run comprehensive enhanced graph tests
 */
async function runEnhancedGraphTests(): Promise<TestSuite> {
  console.log('🎯 Starting Enhanced Graph Flow Testing');
  console.log('=' .repeat(80));
  
  const startTime = Date.now();
  const results: TestResult[] = [];
  
  // Initialize enhanced services
  await initializeEnhancedServices();
  
  // Run each test case
  for (const testCase of enhancedTestCases) {
    const result = await testEnhancedGraphFlow(testCase);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const endTime = Date.now();
  const passedTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;
  
  // Calculate average performance
  const averagePerformance: Record<string, number> = {};
  const allStages = new Set<string>();
  results.forEach(result => Object.keys(result.performance).forEach(stage => allStages.add(stage)));
  
  allStages.forEach(stage => {
    const stageTimes = results
      .map(r => r.performance[stage])
      .filter(time => time !== undefined);
    
    if (stageTimes.length > 0) {
      averagePerformance[stage] = stageTimes.reduce((sum, time) => sum + time, 0) / stageTimes.length;
    }
  });
  
  const testSuite: TestSuite = {
    name: "Enhanced Graph Flow Tests",
    results,
    summary: {
      totalTests: results.length,
      passedTests,
      failedTests,
      totalDuration: endTime - startTime,
      averagePerformance
    }
  };
  
  // Display summary
  console.log('\n📊 Test Suite Summary');
  console.log('=' .repeat(80));
  console.log(`Total Tests: ${testSuite.summary.totalTests}`);
  console.log(`Passed: ${testSuite.summary.passedTests} ✅`);
  console.log(`Failed: ${testSuite.summary.failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
  console.log(`Total Duration: ${testSuite.summary.totalDuration}ms`);
  
  if (Object.keys(averagePerformance).length > 0) {
    console.log('\n⏱️  Average Performance by Stage:');
    Object.entries(averagePerformance).forEach(([stage, time]) => {
      console.log(`  - ${stage}: ${Math.round(time)}ms`);
    });
  }
  
  // Display detailed results
  console.log('\n📋 Detailed Test Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const duration = `${result.duration}ms`;
    const stages = result.stages.length > 0 ? `(${result.stages.length} stages)` : '';
    const features = result.features.length > 0 ? `[${result.features.length} features]` : '';
    
    console.log(`  ${status} ${index + 1}. ${result.testName} ${duration} ${stages} ${features}`);
    
    if (result.warnings.length > 0) {
      console.log(`     ⚠️  ${result.warnings.length} warning(s)`);
    }
    
    if (result.errors.length > 0) {
      console.log(`     ❌ ${result.errors.length} error(s)`);
    }
  });
  
  return testSuite;
}

/**
 * Test specific enhanced features in isolation
 */
async function testEnhancedFeaturesIsolation(): Promise<void> {
  console.log('\n🔬 Testing Enhanced Features in Isolation');
  console.log('=' .repeat(80));
  
  // Test context enrichment
  console.log('\n🧪 Testing Context Enrichment...');
  try {
    const enrichmentResult = await contextEnrichmentService.enrichContext('react components');
    console.log(`✅ Context enrichment: Found ${Object.keys(enrichmentResult.entityStatistics).length} entity types`);
  } catch (error) {
    console.error(`❌ Context enrichment failed:`, error);
  }
  
  // Test local NLP
  console.log('\n🧪 Testing Local NLP...');
  try {
    const nlpResult = await localNLPService.processText('compare react vs vue', {
      extractEntities: true,
      classifyIntent: true,
      extractVocabulary: true
    });
    console.log(`✅ Local NLP: Found ${nlpResult.entities.length} entities, intent: ${nlpResult.intent.label}`);
  } catch (error) {
    console.error(`❌ Local NLP failed:`, error);
  }
  
  // Test multi-vector search
  console.log('\n🧪 Testing Multi-Vector Search...');
  try {
    const vectorResult = await multiVectorSearchService.searchMultiVector('database tools', {
      vectorTypes: ['semantic', 'categories'],
      limit: 5
    });
    const totalResults = Object.values(vectorResult.vectorSearchResults || {}).reduce((sum: number, results: any) => sum + (Array.isArray(results) ? results.length : 0), 0);
    console.log(`✅ Multi-vector search: Found ${totalResults} results`);
  } catch (error) {
    console.error(`❌ Multi-vector search failed:`, error);
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    // Validate environment
    validateEnv([
      'MONGODB_URI',
      'QDRANT_HOST',
      'QDRANT_PORT',
      'OLLAMA_BASE_URL',
      'OLLAMA_MODEL'
    ]);
    
    // Run comprehensive tests
    const testSuite = await runEnhancedGraphTests();
    
    // Test features in isolation
    await testEnhancedFeaturesIsolation();
    
    // Final summary
    console.log('\n🎉 Enhanced Graph Flow Testing Complete!');
    console.log('=' .repeat(80));
    
    if (testSuite.summary.failedTests > 0) {
      console.log(`❌ ${testSuite.summary.failedTests} test(s) failed. Check the logs above for details.`);
      process.exit(1);
    } else {
      console.log('✅ All tests passed! Enhanced graph is working correctly.');
      
      // Display performance summary
      console.log('\n📈 Performance Summary:');
      Object.entries(testSuite.summary.averagePerformance).forEach(([stage, time]) => {
        const requirement = getPerformanceRequirement(stage);
        const status = time <= requirement ? '✅' : '⚠️';
        console.log(`  ${status} ${stage}: ${Math.round(time)}ms (requirement: ${requirement}ms)`);
      });
    }
    
  } catch (error) {
    console.error('\n💥 Enhanced graph testing failed:', error);
    process.exit(1);
  }
}

/**
 * Get performance requirement for a stage
 */
function getPerformanceRequirement(stage: string): number {
  const requirements: Record<string, number> = {
    'context-enrichment': 200,
    'intent-extraction': 100,
    'query-planning': 150,
    'execution': 1000,
    'final-completion': 50
  };
  
  return requirements[stage] || 500;
}

// Execute script if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { main as testEnhancedGraph, runEnhancedGraphTests, testEnhancedFeaturesIsolation };
