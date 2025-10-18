import 'module-alias/register';
import express from 'express';
import axios from 'axios';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { StateAnnotation } from "./types/state";
import { vectorIndexingService, HealthReport } from "./services";

// Import LangGraph orchestration - NEW 3-Node Pipeline
import { searchWithAgenticPipeline } from "./graphs/agentic-search.graph";
import { threadManager } from "./utils/thread-manager";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4003;
const ENABLE_VECTOR_VALIDATION = process.env.ENABLE_VECTOR_VALIDATION !== 'false'; // Default to true

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test MongoDB
    const mongoClient = new MongoClient(process.env.MONGODB_URI!);
    await mongoClient.connect();
    await mongoClient.db().admin().ping();
    await mongoClient.close();

    // Test Qdrant
    await axios.get(`http://${process.env.QDRANT_HOST}:${process.env.QDRANT_PORT}/collections`);

    // Test Ollama
    await axios.get('http://localhost:11434/api/tags');

    res.json({
      status: 'healthy',
      services: {
        mongodb: 'connected',
        qdrant: 'connected',
        ollama: 'connected'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Validate vector index health on startup
 * This function checks if vectors exist in Qdrant and validates index integrity
 * It doesn't block server startup but provides clear feedback about any issues
 */
async function validateVectorIndexOnStartup(): Promise<void> {
  // Skip validation if explicitly disabled
  if (!ENABLE_VECTOR_VALIDATION) {
    console.log('🔄 Vector index validation is disabled via ENABLE_VECTOR_VALIDATION=false');
    return;
  }

  console.log('\n🔍 Starting vector index health validation...');

  try {
    // Use the VectorIndexingService's validateIndex method
    const healthReport: HealthReport = await vectorIndexingService.validateIndex();

    // Log appropriate messages based on health report
    if (healthReport.collectionHealthy &&
      healthReport.sampleValidationPassed &&
      healthReport.missingVectors === 0 &&
      healthReport.orphanedVectors === 0) {
      console.log('✅ Vector index is healthy and fully synchronized');
      console.log(`   📊 MongoDB Tools: ${healthReport.mongoToolCount}`);
      console.log(`   📊 Qdrant Vectors: ${healthReport.qdrantVectorCount}`);
    } else {
      // Log warnings if there are issues
      console.log('⚠️  Vector index health issues detected:');

      if (!healthReport.collectionHealthy) {
        console.log('   ❌ Vector collection configuration is unhealthy');
      }

      if (!healthReport.sampleValidationPassed) {
        console.log('   ❌ Sample embedding validation failed');
      }

      if (healthReport.missingVectors > 0) {
        console.log(`   ⚠️  ${healthReport.missingVectors} tools missing from vector index`);
      }

      if (healthReport.orphanedVectors > 0) {
        console.log(`   ⚠️  ${healthReport.orphanedVectors} orphaned vectors found`);
      }

      // Log recommendations
      if (healthReport.recommendations.length > 0) {
        console.log('\n📝 Recommendations:');
        healthReport.recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });

        console.log('\n💡 To fix vector index issues, consider running:');
        console.log('   npm run seed-vectors  # Re-index all tools to Qdrant');
        console.log('   npm run seed-vectors -- --force  # Force re-index (clears existing data)');
        console.log('   or use the VectorIndexingService directly');
      }
    }

    console.log('🔍 Vector index validation completed\n');

  } catch (error) {
    // Don't fail startup, but provide clear feedback
    console.log('🔄 Vector index validation could not be completed:');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('   This may be due to services not being available yet');
    console.log('   The server will continue starting, but vector search may not work properly\n');

    // Provide troubleshooting tips
    console.log('💡 Troubleshooting tips:');
    console.log('   • Ensure MongoDB and Qdrant services are running');
    console.log('   • Check environment variables for service connections');
    console.log('   • Run validation manually after startup if needed\n');
  }
}


app.post('/search', async (req, res) => {
  try {
    const { query, limit = 10, debug = false } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`\n🚀 Starting search for query: "${query}"`);
    const startTime = Date.now();

    // NEW: Agentic search orchestration with 3-node LLM-first pipeline
    const searchResult = await searchWithAgenticPipeline(query, {
      enableCheckpoints: false,
      metadata: { debug: debug }
    });

    const executionTime = Date.now() - startTime;

    const response = {
      query,
      // NEW: Intent from our 3-node pipeline
      intentState: searchResult.intentState || null,
      executionPlan: searchResult.executionPlan || null,
      candidates: searchResult.candidates?.slice(0, limit) || [],
      executionStats: searchResult.executionStats || {
        totalTimeMs: executionTime,
        nodeTimings: {},
        vectorQueriesExecuted: 0,
        structuredQueriesExecuted: 0
      },
      executionTime: `${executionTime}ms`,
      phase: "3-Node LLM-First Pipeline",
      strategy: searchResult.executionPlan?.strategy || "agentic-search",
      explanation: searchResult.executionPlan?.explanation || "Search completed using 3-node LLM-first agentic pipeline",
      // Convert candidates to results format for backward compatibility
      results: searchResult.candidates?.slice(0, limit).map(candidate => ({
        id: candidate.id,
        name: candidate.metadata.name,
        description: candidate.metadata.description,
        category: candidate.metadata.category,
        score: candidate.score,
        source: candidate.source,
        metadata: candidate.metadata
      })) || [],
      debug: debug ? {
        metadata: searchResult.metadata,
        executionPath: searchResult.metadata?.executionPath || [],
        nodeExecutionTimes: searchResult.metadata?.nodeExecutionTimes || {},
        errors: searchResult.errors || []
      } : undefined
    };

    console.log(`🎉 Search completed in ${executionTime}ms with ${response.results.length} results\n`);
    res.json(response);
  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      phase: 'Error during search execution'
    });
  }
});

// Start server with vector index validation
async function startServer() {
  // Perform vector index validation before starting the server
  await validateVectorIndexOnStartup();

  app.listen(PORT, () => {
    console.log(`🚀 Search API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 Search endpoint: http://localhost:${PORT}/search`);
  });
}

// Start the server
startServer().catch(error => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});
