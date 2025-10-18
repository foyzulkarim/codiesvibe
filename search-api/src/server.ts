import 'module-alias/register';
import express from 'express';
import axios from 'axios';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { StateAnnotation } from "./types/state";
import { vectorIndexingService, HealthReport } from "./services";

// Import LangGraph orchestration - NEW 3-Node Pipeline
import { searchWithAgenticPipeline, batchSearchWithAgenticPipeline } from "./graphs/agentic-search.graph";
import { threadManager } from "./utils/thread-manager";
import { checkpointManager } from "./utils/checkpoint-manager";

// Import enhanced search controller
import { enhancedSearchController } from "./controllers/enhanced-search.controller";


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

// Async search endpoints

/**
 * POST /search/async - Start an asynchronous search
 * Returns: { threadId: string, status: 'started' }
 */
app.post('/search/async', async (req, res) => {
  try {
    const { query, debug = false, checkpointConfig } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Query is required',
        status: 'error'
      });
    }

    console.log(`\n🚀 Starting async search for query: "${query}"`);
    
    // Create a new thread for the async search
    const threadId = threadManager.createThread({
      query,
      startTime: new Date(),
      enableCheckpoints: true,
      isAsync: true
    });

    // Configure checkpointing for this thread
    checkpointManager.configureThread(threadId, {
      enableCheckpoints: true,
      checkpointInterval: 1,
      maxCheckpointsPerThread: 10,
      enableCompression: false,
      ...checkpointConfig
    });

    // Update thread metadata
    threadManager.updateThreadMetadata(threadId, {
      status: 'started',
      startTime: new Date(),
      query
    });

    console.log(`[AsyncSearch] Created thread ${threadId} for async search`);

    // Start the search in the background using the new pipeline
    searchWithAgenticPipeline(query, {
      threadId: threadId,
      enableCheckpoints: false,
      metadata: { debug, asyncMode: true }
    }).catch(error => {
      console.error(`[AsyncSearch] Error in thread ${threadId}:`, error);
      // Update thread status to error
      threadManager.updateThreadMetadata(threadId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: new Date()
      });
    });

    res.json({
      threadId,
      status: 'started',
      message: 'Search has been started asynchronously'
    });

  } catch (error) {
    console.error("❌ Async search start error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    });
  }
});

/**
 * GET /search/status/:threadId - Check the status of an async search
 * Returns: { status, progress, currentNode, results? }
 */
app.get('/search/status/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;

    if (!threadId) {
      return res.status(400).json({
        error: 'Thread ID is required',
        status: 'error'
      });
    }

    console.log(`[AsyncSearch] Checking status for thread ${threadId}`);

    // Validate thread ID
    const validation = threadManager.validateThreadId(threadId);
    if (!validation.isValid) {
      return res.status(404).json({
        error: `Invalid thread ID: ${validation.error}`,
        status: 'not_found'
      });
    }

    // Get thread information
    const threadInfo = validation.threadInfo!;
    const metadata = threadInfo.metadata || {};

    // Get checkpoint statistics
    const checkpointStats = await checkpointManager.getCheckpointStats(threadId);

    // Determine status based on thread metadata
    let status = metadata.status || 'unknown';
    let progress = 0;
    let currentNode = 'unknown';
    let results = null;

    if (status === 'started' && !metadata.endTime) {
      status = 'running';
      // Calculate progress based on execution path if available
      if (metadata.executionPath && Array.isArray(metadata.executionPath)) {
        const totalNodes = 4; // intent-extraction, query-planning, execution, final-completion
        const completedNodes = metadata.executionPath.length;
        progress = Math.min(Math.round((completedNodes / totalNodes) * 100), 95);
        currentNode = metadata.executionPath[metadata.executionPath.length - 1] || 'processing';
      } else {
        progress = 50; // Default placeholder
        currentNode = metadata.currentNode || 'processing';
      }
    } else if (status === 'completed') {
      progress = 100;
      currentNode = 'completed';
      results = metadata.results || [];
    } else if (status === 'error') {
      currentNode = 'error';
    }

    const response = {
      threadId,
      status,
      progress,
      currentNode,
      results,
      startTime: threadInfo.createdAt,
      lastAccessed: threadInfo.lastAccessed,
      checkpointStats,
      metadata: {
        executionTime: metadata.endTime ?
          `${metadata.endTime.getTime() - threadInfo.createdAt.getTime()}ms` :
          'in_progress',
        resultsCount: results ? results.length : 0,
        error: metadata.error
      }
    };

    console.log(`[AsyncSearch] Status for thread ${threadId}: ${status} (${progress}%)`);
    res.json(response);

  } catch (error) {
    console.error("❌ Status check error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    });
  }
});

/**
 * POST /search/resume/:threadId - Resume a paused or failed search from checkpoint
 * Returns: { threadId: string, status: 'resumed' }
 */
app.post('/search/resume/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    const { query, debug = false } = req.body;

    if (!threadId) {
      return res.status(400).json({
        error: 'Thread ID is required',
        status: 'error'
      });
    }

    console.log(`[AsyncSearch] Resuming search for thread ${threadId}`);

    // Validate thread ID
    const validation = threadManager.validateThreadId(threadId);
    if (!validation.isValid) {
      return res.status(404).json({
        error: `Invalid thread ID: ${validation.error}`,
        status: 'not_found'
      });
    }

    const threadInfo = validation.threadInfo!;
    const metadata = threadInfo.metadata || {};

    // Check if thread can be resumed
    if (metadata.status === 'running') {
      return res.status(409).json({
        error: 'Search is already running',
        status: 'running'
      });
    }

    // Use the original query if not provided
    const resumeQuery = query || metadata.query;
    if (!resumeQuery) {
      return res.status(400).json({
        error: 'Query is required for resume',
        status: 'error'
      });
    }

    // Update thread metadata
    threadManager.updateThreadMetadata(threadId, {
      status: 'resumed',
      resumeTime: new Date(),
      query: resumeQuery
    });

    console.log(`[AsyncSearch] Resuming search for thread ${threadId} with query: "${resumeQuery}"`);

    // Resume the search in the background using new pipeline
    searchWithAgenticPipeline(resumeQuery, {
      threadId: threadId,
      enableCheckpoints: false,
      metadata: { debug, resumingFrom: true }
    }).catch(error => {
      console.error(`[AsyncSearch] Error resuming thread ${threadId}:`, error);
      // Update thread status to error
      threadManager.updateThreadMetadata(threadId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: new Date()
      });
    });

    res.json({
      threadId,
      status: 'resumed',
      message: 'Search has been resumed from checkpoint',
      query: resumeQuery
    });

  } catch (error) {
    console.error("❌ Resume error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    });
  }
});

/**
 * DELETE /search/cancel/:threadId - Cancel a running search and clean up resources
 * Returns: { threadId: string, status: 'cancelled' }
 */
app.delete('/search/cancel/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;

    if (!threadId) {
      return res.status(400).json({
        error: 'Thread ID is required',
        status: 'error'
      });
    }

    console.log(`[AsyncSearch] Cancelling search for thread ${threadId}`);

    // Validate thread ID
    const validation = threadManager.validateThreadId(threadId);
    if (!validation.isValid) {
      return res.status(404).json({
        error: `Invalid thread ID: ${validation.error}`,
        status: 'not_found'
      });
    }

    const threadInfo = validation.threadInfo!;
    const metadata = threadInfo.metadata || {};

    // Update thread status to cancelled
    threadManager.updateThreadMetadata(threadId, {
      status: 'cancelled',
      cancelledTime: new Date(),
      previousStatus: metadata.status
    });

    // Clear checkpoints for this thread
    const clearedCheckpoints = await checkpointManager.clearThreadCheckpoints(threadId);

    // Delete the thread (using threadManager instead of old function)
    const deleted = threadManager.deleteThread(threadId);

    if (deleted) {
      console.log(`[AsyncSearch] Successfully cancelled and cleaned up thread ${threadId}`);
      console.log(`[AsyncSearch] Cleared ${clearedCheckpoints} checkpoints`);

      res.json({
        threadId,
        status: 'cancelled',
        message: 'Search has been cancelled and resources cleaned up',
        clearedCheckpoints
      });
    } else {
      throw new Error('Failed to delete thread');
    }

  } catch (error) {
    console.error("❌ Cancel error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    });
  }
});

// Enhanced Search endpoints

/**
 * POST /api/search/enhanced - Enhanced search with result merging and duplicate detection
 */
app.post('/api/search/enhanced', enhancedSearchController.enhancedSearch.bind(enhancedSearchController));

/**
 * GET /api/search/enhanced/health - Enhanced search health check
 */
app.get('/api/search/enhanced/health', enhancedSearchController.healthCheck.bind(enhancedSearchController));

/**
 * POST /api/search/enhanced/cache/clear - Clear enhanced search cache
 */
app.post('/api/search/enhanced/cache/clear', enhancedSearchController.clearCache.bind(enhancedSearchController));

/**
 * GET /api/search/enhanced/config - Get enhanced search configuration
 */
app.get('/api/search/enhanced/config', enhancedSearchController.getConfig.bind(enhancedSearchController));

/**
 * PUT /api/search/enhanced/config - Update enhanced search configuration
 */
app.put('/api/search/enhanced/config', enhancedSearchController.updateConfig.bind(enhancedSearchController));

/**
 * GET /api/search/enhanced/stats - Get enhanced search statistics
 */
app.get('/api/search/enhanced/stats', enhancedSearchController.getStats.bind(enhancedSearchController));

// Start server with vector index validation
async function startServer() {
  // Perform vector index validation before starting the server
  await validateVectorIndexOnStartup();
  
  app.listen(PORT, () => {
    console.log(`🚀 Search API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 Search endpoint: http://localhost:${PORT}/search`);
    console.log(`🔄 Async search endpoint: http://localhost:${PORT}/search/async`);
    console.log(`📈 Status endpoint: http://localhost:${PORT}/search/status/:threadId`);
    console.log(`▶️  Resume endpoint: http://localhost:${PORT}/search/resume/:threadId`);
    console.log(`❌ Cancel endpoint: http://localhost:${PORT}/search/cancel/:threadId`);
    console.log(`🚀 Enhanced search endpoint: http://localhost:${PORT}/api/search/enhanced`);
    console.log(`🔧 Enhanced search health: http://localhost:${PORT}/api/search/enhanced/health`);
    console.log(`⚙️  Enhanced search config: http://localhost:${PORT}/api/search/enhanced/config`);
    console.log(`📊 Enhanced search stats: http://localhost:${PORT}/api/search/enhanced/stats`);
    console.log(`📚 Enhanced search docs: ./docs/enhanced-search-api.md`);
    console.log(`🔧 Vector validation: ${ENABLE_VECTOR_VALIDATION ? 'enabled' : 'disabled'}`);
  });
}

// Start the server
startServer().catch(error => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});
