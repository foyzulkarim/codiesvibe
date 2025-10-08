#!/usr/bin/env node

import { intelligentSearch, intelligentSearchStream, SearchOptions, SearchResult } from "./graphs/main.graph";
import { setupServices } from "./setup";

// Export main search functions
export {
  intelligentSearch,
  intelligentSearchStream,
  setupServices
};

// Export types for external use
export type { SearchOptions, SearchResult };

/**
 * Main entry point for the intelligent search system
 * Handles command line execution and provides the primary API
 */

/**
 * Search for tools using the intelligent search system
 * @param query - The search query
 * @param options - Optional configuration options
 * @returns Promise<SearchResult> - Search results with metadata
 */
export async function search(query: string, options?: SearchOptions): Promise<SearchResult> {
  if (!query || query.trim().length === 0) {
    throw new Error("Query cannot be empty");
  }

  try {
    return await intelligentSearch(query.trim(), options);
  } catch (error) {
    console.error("Search failed:", error);
    throw error;
  }
}

/**
 * Stream search results in real-time
 * @param query - The search query
 * @param options - Optional configuration options
 * @returns AsyncGenerator<SearchStreamEvent> - Stream of search events
 */
export async function* searchStream(query: string, options?: SearchOptions) {
  if (!query || query.trim().length === 0) {
    throw new Error("Query cannot be empty");
  }

  try {
    yield* intelligentSearchStream(query.trim(), options);
  } catch (error) {
    console.error("Stream search failed:", error);
    throw error;
  }
}

/**
 * Initialize the search system
 * Must be called before any search operations
 */
export async function initialize(): Promise<void> {
  try {
    await setupServices();
    console.log("✅ Intelligent search system initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize search system:", error);
    throw error;
  }
}

/**
 * Health check for the search system
 * @returns Promise<HealthStatus> - System health information
 */
export async function healthCheck(): Promise<{
  status: "healthy" | "degraded" | "unhealthy";
  services: Record<string, boolean>;
  timestamp: Date;
}> {
  const services = {
    mongodb: false,
    qdrant: false,
    embedding: false,
    ollama: false
  };

  try {
    // Check MongoDB connection
    const { MongoDBService } = await import("./services/mongodb.service");
    const mongoService = new MongoDBService();
    await mongoService.connect();
    await mongoService.ping();
    services.mongodb = true;
    await mongoService.disconnect();
  } catch (error) {
    console.warn("MongoDB health check failed:", error);
  }

  try {
    // Check Qdrant connection
    const { QdrantService } = await import("./services/qdrant.service");
    const qdrantService = new QdrantService();
    await qdrantService.healthCheck();
    services.qdrant = true;
  } catch (error) {
    console.warn("Qdrant health check failed:", error);
  }

  try {
    // Check embedding service
    const { EmbeddingService } = await import("./services/embedding.service");
    const embeddingService = new EmbeddingService();
    await embeddingService.initialize();
    const testEmbedding = await embeddingService.generateEmbedding("test");
    services.embedding = testEmbedding.length > 0;
  } catch (error) {
    console.warn("Embedding service health check failed:", error);
  }

  try {
    // Check Ollama service
    const response = await fetch(`${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}/api/tags`);
    services.ollama = response.ok;
  } catch (error) {
    console.warn("Ollama health check failed:", error);
  }

  const healthyCount = Object.values(services).filter(Boolean).length;
  const totalCount = Object.keys(services).length;

  return {
    status: healthyCount === totalCount ? "healthy" : 
            healthyCount >= totalCount / 2 ? "degraded" : "unhealthy",
    services,
    timestamp: new Date()
  };
}

/**
 * Get system statistics and metrics
 * @returns Promise<SystemStats> - System performance metrics
 */
export async function getStats(): Promise<{
  totalSearches: number;
  averageResponseTime: number;
  cacheHitRate: number;
  uptime: number;
}> {
  // This would typically connect to a metrics database
  // For now, return placeholder values
  return {
    totalSearches: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    uptime: process.uptime()
  };
}

/**
 * Command line interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔍 Intelligent Search System

Usage:
  npm start <query> [options]
  
Options:
  --debug           Enable debug mode
  --stream          Stream results in real-time
  --checkpointing   Enable checkpointing
  --thread-id <id>  Use specific thread ID for checkpointing
  
Examples:
  npm start "React tools for frontend development"
  npm start "database tools" --debug --stream
  npm start "AI/ML tools" --checkpointing --thread-id user123
  
Health Check:
  npm start --health
  
Initialize System:
  npm start --init
    `);
    process.exit(0);
  }

  const queryIndex = args.findIndex(arg => !arg.startsWith("--"));
  const query = queryIndex >= 0 ? args[queryIndex] : null;
  
  const options: SearchOptions = {
    debug: args.includes("--debug"),
    checkpointing: args.includes("--checkpointing"),
    threadId: args.includes("--thread-id") ? args[args.indexOf("--thread-id") + 1] : undefined
  };

  const isStream = args.includes("--stream");
  const isHealthCheck = args.includes("--health");
  const isInit = args.includes("--init");

  async function main() {
    try {
      if (isHealthCheck) {
        const health = await healthCheck();
        console.log("🏥 Health Check Results:");
        console.log(`Status: ${health.status}`);
        console.log("Services:");
        Object.entries(health.services).forEach(([service, healthy]) => {
          console.log(`  ${service}: ${healthy ? "✅" : "❌"}`);
        });
        console.log(`Timestamp: ${health.timestamp.toISOString()}`);
        return;
      }

      if (isInit) {
        await initialize();
        const health = await healthCheck();
        console.log("\n🏥 Post-Initialization Health Check:");
        console.log(`Status: ${health.status}`);
        return;
      }

      if (!query) {
        console.error("❌ Error: Query is required");
        process.exit(1);
      }

      // Initialize the system
      await initialize();

      console.log(`🔍 Searching for: "${query}"`);
      
      if (isStream) {
        console.log("📡 Streaming results...\n");
        
        for await (const event of searchStream(query, options)) {
          if (event.error) {
            console.error("❌ Error:", event.error);
            break;
          }
          
          // Display progress based on event type
          if (typeof event.event === 'object' && event.event !== null) {
            const nodeName = Object.keys(event.event)[0];
            if (nodeName && event.event[nodeName]) {
              console.log(`⚡ ${nodeName} completed`);
            }
          }
        }
        
        console.log("\n✅ Search completed");
      } else {
        const result = await search(query, options);
        
        console.log(`\n📊 Results (${result.results.length} tools found):`);
        console.log(`Strategy: ${result.strategy}`);
        console.log(`Execution time: ${result.metadata.executionTime}`);
        console.log(`Explanation: ${result.explanation}\n`);
        
        if (result.results.length > 0) {
          result.results.forEach((tool, index) => {
            console.log(`${index + 1}. ${tool.name}`);
            console.log(`   ${tool.description}`);
            console.log(`   Category: ${tool.category || 'N/A'}`);
            console.log(`   Relevance: ${(tool.relevanceScore * 100).toFixed(1)}%`);
            if (tool.website) console.log(`   Website: ${tool.website}`);
            console.log("");
          });
        } else {
          console.log("No tools found matching your query.");
        }
      }
    } catch (error) {
      console.error("❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  main();
}

// Export for testing
export default {
  search,
  searchStream,
  initialize,
  healthCheck,
  getStats
};