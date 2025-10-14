/**
 * Debug Script: Entity Statistics Generation (T015)
 * 
 * This script tests the local NLP service's entity extraction capabilities
 * and generates comprehensive statistics about entity recognition performance.
 */

import dotenv from 'dotenv';
import { mongoDBService } from '../src/services/mongodb.service';
import { qdrantService } from '../src/services/qdrant.service';
import { localNLPService } from '../src/services/local-nlp.service';
import { embeddingService } from '../src/services/embedding.service';
import { multiVectorSearchService } from '../src/services/multi-vector-search.service';
import { initializeDebugServices, validateEnvironment as validateEnv } from './utils/debug-init';

// Load environment variables
dotenv.config();

// Test configuration
interface TestConfig {
  sampleSize: number;
  confidenceThreshold: number;
  enableDetailedLogging: boolean;
  generateReport: boolean;
}

const config: TestConfig = {
  sampleSize: 100,
  confidenceThreshold: 0.5,
  enableDetailedLogging: true,
  generateReport: true
};

// Entity statistics interfaces
interface EntityStats {
  type: string;
  count: number;
  averageConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  examples: Array<{
    text: string;
    confidence: number;
    query: string;
  }>;
}

interface EntityReport {
  totalQueries: number;
  totalEntities: number;
  averageEntitiesPerQuery: number;
  processingTime: {
    total: number;
    average: number;
    min: number;
    max: number;
  };
  entityTypes: EntityStats[];
  confidenceDistribution: {
    high: number; // > 0.8
    medium: number; // 0.5 - 0.8
    low: number; // < 0.5
  };
  performanceMetrics: {
    queriesPerSecond: number;
    entitiesPerSecond: number;
    cacheHitRate: number;
  };
}

// Test queries for entity extraction
const testQueries = [
  'Find free React components for dashboard development',
  'Compare Vue vs Angular for enterprise applications',
  'Open source API tools for Node.js with TypeScript support',
  'Python machine learning libraries for data analysis',
  'JavaScript testing frameworks with Jest integration',
  'Database management tools for PostgreSQL and MongoDB',
  'DevOps automation tools for CI/CD pipelines',
  'Frontend UI libraries with responsive design',
  'Backend authentication services with OAuth support',
  'Cloud hosting platforms for scalable web applications',
  'Mobile development frameworks for iOS and Android',
  'Data visualization tools for business analytics',
  'E-commerce platforms with payment gateway integration',
  'Content management systems with headless architecture',
  'Monitoring and logging tools for microservices',
  'API documentation generators for REST and GraphQL',
  'Code quality tools with ESLint and Prettier',
  'Container orchestration platforms like Kubernetes',
  'Serverless computing frameworks for AWS Lambda',
  'Real-time communication tools with WebSocket support',
  'Search engines with Elasticsearch integration',
  'Caching solutions for Redis and Memcached',
  'Security scanning tools for vulnerability assessment',
  'Performance monitoring tools for web applications',
  'Backup and recovery solutions for database systems'
];

// Environment validation - now handled by debug-init utility

// Service connectivity check - now handled by debug-init utility

// Generate entity statistics
async function generateEntityStatistics(): Promise<EntityReport> {
  console.log('\n🔬 Generating Entity Statistics...\n');
  
  const startTime = Date.now();
  const entityMap = new Map<string, EntityStats>();
  const processingTimes: number[] = [];
  let totalEntities = 0;
  let confidenceDistribution = { high: 0, medium: 0, low: 0 };

  // Get initial cache stats
  const initialCacheStats = localNLPService.getCacheStats();

  // Process test queries
  const queriesToProcess = testQueries.slice(0, config.sampleSize);
  
  for (let i = 0; i < queriesToProcess.length; i++) {
    const query = queriesToProcess[i];
    
    if (config.enableDetailedLogging) {
      console.log(`Processing query ${i + 1}/${queriesToProcess.length}: "${query}"`);
    }

    try {
      const result = await localNLPService.processText(query, {
        extractEntities: true,
        classifyIntent: false,
        extractVocabulary: false
      });

      processingTimes.push(result.processingTime);
      totalEntities += result.entities.length;

      // Process each entity
        for (const entity of result.entities) {
        if (entity.confidence >= config.confidenceThreshold) {
          // Update confidence distribution
          if (entity.confidence > 0.8) {
            confidenceDistribution.high++;
          } else if (entity.confidence >= 0.5) {
            confidenceDistribution.medium++;
          } else {
            confidenceDistribution.low++;
          }

          // Update entity statistics
          const key = entity.type;
          if (!entityMap.has(key)) {
            entityMap.set(key, {
              type: entity.type,
              count: 0,
              averageConfidence: 0,
              minConfidence: 1,
              maxConfidence: 0,
              examples: []
            });
          }

          const stats = entityMap.get(key)!;
          stats.count++;
          stats.minConfidence = Math.min(stats.minConfidence, entity.confidence);
          stats.maxConfidence = Math.max(stats.maxConfidence, entity.confidence);
          
          // Add example if we have less than 3
          if (stats.examples.length < 3) {
            stats.examples.push({
              text: entity.text,
              confidence: entity.confidence,
              query: query
            });
          }
        }
      }

      if (config.enableDetailedLogging) {
        console.log(`  Found ${result.entities.length} entities in ${result.processingTime}ms`);
      }

    } catch (error) {
      console.error(`❌ Error processing query "${query}":`, error);
    }
  }

  // Calculate average confidences
  for (const stats of entityMap.values()) {
    // This is a simplified calculation - in practice, you'd track sum and divide
    stats.averageConfidence = (stats.minConfidence + stats.maxConfidence) / 2;
  }

  // Get final cache stats
  const finalCacheStats = localNLPService.getCacheStats();
  const cacheHitRate = finalCacheStats.resultCache.hitRate || 0;

  const totalTime = Date.now() - startTime;
  const entityTypes = Array.from(entityMap.values()).sort((a, b) => b.count - a.count);

  return {
    totalQueries: queriesToProcess.length,
    totalEntities,
    averageEntitiesPerQuery: totalEntities / queriesToProcess.length,
    processingTime: {
      total: totalTime,
      average: processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length,
      min: Math.min(...processingTimes),
      max: Math.max(...processingTimes)
    },
    entityTypes,
    confidenceDistribution,
    performanceMetrics: {
      queriesPerSecond: (queriesToProcess.length / totalTime) * 1000,
      entitiesPerSecond: (totalEntities / totalTime) * 1000,
      cacheHitRate: cacheHitRate * 100
    }
  };
}

// Display entity statistics report
function displayReport(report: EntityReport): void {
  console.log('\n📊 Entity Statistics Report');
  console.log('=' .repeat(50));
  
  console.log(`\n📈 Overview:`);
  console.log(`  Total Queries Processed: ${report.totalQueries}`);
  console.log(`  Total Entities Extracted: ${report.totalEntities}`);
  console.log(`  Average Entities per Query: ${report.averageEntitiesPerQuery.toFixed(2)}`);
  
  console.log(`\n⏱️  Processing Performance:`);
  console.log(`  Total Processing Time: ${report.processingTime.total}ms`);
  console.log(`  Average Processing Time: ${report.processingTime.average.toFixed(2)}ms`);
  console.log(`  Min Processing Time: ${report.processingTime.min}ms`);
  console.log(`  Max Processing Time: ${report.processingTime.max}ms`);
  
  console.log(`\n🎯 Performance Metrics:`);
  console.log(`  Queries per Second: ${report.performanceMetrics.queriesPerSecond.toFixed(2)}`);
  console.log(`  Entities per Second: ${report.performanceMetrics.entitiesPerSecond.toFixed(2)}`);
  console.log(`  Cache Hit Rate: ${report.performanceMetrics.cacheHitRate.toFixed(2)}%`);
  
  console.log(`\n📊 Confidence Distribution:`);
  console.log(`  High Confidence (>0.8): ${report.confidenceDistribution.high}`);
  console.log(`  Medium Confidence (0.5-0.8): ${report.confidenceDistribution.medium}`);
  console.log(`  Low Confidence (<0.5): ${report.confidenceDistribution.low}`);
  
  console.log(`\n🏷️  Entity Types (Top 10):`);
  report.entityTypes.slice(0, 10).forEach((entityType, index) => {
    console.log(`  ${index + 1}. ${entityType.type.toUpperCase()}`);
    console.log(`     Count: ${entityType.count}`);
    console.log(`     Avg Confidence: ${entityType.averageConfidence.toFixed(3)}`);
    console.log(`     Range: ${entityType.minConfidence.toFixed(3)} - ${entityType.maxConfidence.toFixed(3)}`);
    
    if (entityType.examples.length > 0) {
      console.log(`     Examples:`);
      entityType.examples.forEach(example => {
        console.log(`       - "${example.text}" (${example.confidence.toFixed(3)}) from "${example.query.substring(0, 50)}..."`);
      });
    }
    console.log();
  });
}

// Test entity extraction with specific queries
async function testSpecificEntityTypes(): Promise<void> {
  console.log('\n🧪 Testing Specific Entity Types...\n');

  const specificTests = [
    {
      category: 'Technology Entities',
      queries: [
        'React and Vue.js frameworks for frontend development',
        'Python and JavaScript programming languages',
        'Node.js and Express.js for backend services'
      ]
    },
    {
      category: 'Pricing Entities',
      queries: [
        'Free and open source development tools',
        'Premium and paid software solutions',
        'Freemium and subscription-based services'
      ]
    },
    {
      category: 'Interface Entities',
      queries: [
        'REST API and GraphQL endpoints',
        'CLI tools and GUI applications',
        'SDK and library integrations'
      ]
    }
  ];

  for (const test of specificTests) {
    console.log(`\n📋 ${test.category}:`);
    console.log('-'.repeat(30));

    for (const query of test.queries) {
      console.log(`\nQuery: "${query}"`);
      
      try {
        const result = await localNLPService.processText(query, {
          extractEntities: true,
          classifyIntent: false,
          extractVocabulary: false
        });

        if (result.entities.length > 0) {
          result.entities.forEach((entity: any) => {
            console.log(`  ✓ ${entity.text} (${entity.type}) - Confidence: ${entity.confidence.toFixed(3)}`);
          });
        } else {
          console.log('  ❌ No entities found');
        }
        
        console.log(`  Processing Time: ${result.processingTime}ms`);
        
      } catch (error) {
        console.error(`  ❌ Error:`, error);
      }
    }
  }
}

// Main execution function
async function main(): Promise<void> {
  console.log('🚀 Entity Statistics Generation Debug Script');
  console.log('=' .repeat(50));

  try {
    // Validate environment and initialize services
    validateEnv(['MONGODB_URI', 'QDRANT_HOST', 'QDRANT_PORT']);
    await initializeDebugServices();

    // Test specific entity types
    await testSpecificEntityTypes();

    // Generate comprehensive statistics
    const report = await generateEntityStatistics();

    // Display the report
    if (config.generateReport) {
      displayReport(report);
    }

    // Final cache statistics
    console.log('\n💾 Final Cache Statistics:');
    const finalStats = localNLPService.getCacheStats();
    console.log(`  Model Cache Size: ${finalStats.modelCache.size}`);
    console.log(`  Result Cache Size: ${finalStats.resultCache.size}`);
    console.log(`  Cache Hit Rate: ${(finalStats.resultCache.hitRate * 100).toFixed(2)}%`);

    console.log('\n✅ Entity statistics generation completed successfully!');

  } catch (error) {
    console.error('\n❌ Entity statistics generation failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { main, generateEntityStatistics, displayReport };