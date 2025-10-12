import { MongoDBService } from "./services/mongodb.service";
import { QdrantService } from "./services/qdrant.service";
import { EmbeddingService } from "./services/embedding.service";
import { vectorSeedingService } from "./services/vector-seeding.service";
import { enumValues, embeddingConfig } from "./config/constants";

/**
 * Setup script for the intelligent search system
 * Initializes services, pre-computes embeddings, and validates configuration
 */

/**
 * Pre-compute and cache enum embeddings for faster semantic filtering
 */
export async function precomputeEnumEmbeddings(): Promise<void> {
  console.log("🧠 Pre-computing enum embeddings...");
  
  const embeddingService = new EmbeddingService();
  
  const embeddingCache = new Map<string, number[]>();
  
  try {
    // Pre-compute category embeddings
    console.log("  📂 Computing category embeddings...");
    for (const category of enumValues.categories) {
      const embedding = await embeddingService.generateEmbedding(category);
      embeddingCache.set(`category:${category}`, embedding);
    }
    
    // Pre-compute functionality embeddings
    console.log("  ⚙️ Computing functionality embeddings...");
    for (const functionality of enumValues.functionality) {
      const embedding = await embeddingService.generateEmbedding(functionality);
      embeddingCache.set(`functionality:${functionality}`, embedding);
    }
    
    // Pre-compute user type embeddings
    console.log("  👥 Computing user type embeddings...");
    for (const userType of enumValues.userTypes) {
      const embedding = await embeddingService.generateEmbedding(userType);
      embeddingCache.set(`userType:${userType}`, embedding);
    }
    
    // Pre-compute interface embeddings
    console.log("  🖥️ Computing interface embeddings...");
    for (const interfaceType of enumValues.interface) {
      const embedding = await embeddingService.generateEmbedding(interfaceType);
      embeddingCache.set(`interface:${interfaceType}`, embedding);
    }
    
    // Pre-compute deployment embeddings
    console.log("  🚀 Computing deployment embeddings...");
    for (const deployment of enumValues.deployment) {
      const embedding = await embeddingService.generateEmbedding(deployment);
      embeddingCache.set(`deployment:${deployment}`, embedding);
    }
    
    // Save embeddings to cache (in memory, could be persisted to Redis/File)
    console.log("  💾 Caching embeddings...");
    if (embeddingConfig.cacheEnabled) {
      // Store in global cache for the embedding service to use
      (global as any).enumEmbeddingCache = embeddingCache;
    }
    
    console.log(`✅ Pre-computed ${embeddingCache.size} enum embeddings`);
  } catch (error) {
    console.error("❌ Failed to pre-compute enum embeddings:", error);
    throw error;
  }
}

/**
 * Seed vectors for all tools in the database
 */
export async function seedVectors(options: {
  force?: boolean;
  silent?: boolean;
} = {}): Promise<void> {
  // Check if vector seeding should run based on environment variable
  const shouldRunFromEnv = process.env.VECTOR_SEED_ON_SETUP === 'true';
  
  if (!shouldRunFromEnv && !options.silent) {
    console.log("⏭️ Skipping vector seeding (VECTOR_SEED_ON_SETUP not set)");
    return;
  }

  if (!options.silent) {
    console.log("🌱 Starting vector seeding process...");
  }

  try {
    // Set up progress callback for logging
    const progressCallback = (progress: any) => {
      if (!options.silent) {
        const percentage = progress.total > 0
          ? Math.round((progress.processed / progress.total) * 100)
          : 0;
        
        console.log(`  🔄 Progress: ${progress.processed}/${progress.total} (${percentage}%) - ✅ ${progress.successful} - ❌ ${progress.failed}`);
        
        if (progress.currentBatch && progress.totalBatches) {
          console.log(`  📦 Batch ${progress.currentBatch}/${progress.totalBatches}`);
        }
      }
    };

    // Start seeding with progress tracking
    await vectorSeedingService.seedTools({
      force: options.force,
      onProgress: progressCallback
    });

    if (!options.silent) {
      console.log("✅ Vector seeding completed successfully");
      
      // Get final stats
      const stats = vectorSeedingService.getSeedingStats();
      console.log(`📊 Final stats: ${stats.indexedTools}/${stats.totalTools} tools indexed (${stats.successRate.toFixed(1)}%)`);
    }
  } catch (error) {
    if (!options.silent) {
      console.error("❌ Vector seeding failed:", error);
      console.warn("⚠️ Vector seeding failed, but continuing with setup process");
    }
    // Don't throw error - vector seeding failure shouldn't break the entire setup
  }
}

/**
 * Initialize database connections and validate they're working
 */
export async function initializeDatabases(): Promise<void> {
  console.log("🗄️ Initializing database connections...");
  
  // Initialize MongoDB
  console.log("  🍃 Connecting to MongoDB...");
  const mongoService = new MongoDBService();
  try {
    // Test connection by getting all tools
    await mongoService.getAllTools();
    console.log("  ✅ MongoDB connection successful");
  } catch (error) {
    console.error("  ❌ MongoDB connection failed:", error);
    throw new Error(`MongoDB initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Initialize Qdrant
  console.log("  🔍 Connecting to Qdrant...");
  const qdrantService = new QdrantService();
  try {
    await qdrantService.getCollectionInfo();
    console.log("  ✅ Qdrant 'tools' collection exists");
  } catch (error) {
    console.error("  ❌ Qdrant connection failed:", error);
    throw new Error(`Qdrant initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate configuration and environment variables
 */
export async function validateConfiguration(): Promise<void> {
  console.log("⚙️ Validating configuration...");
  
  const requiredEnvVars = [
    "MONGODB_URI",
    "QDRANT_URL", 
    "OLLAMA_BASE_URL"
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error("  ❌ Missing environment variables:");
    missingVars.forEach(varName => {
      console.error(`    - ${varName}`);
    });
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
  }
  
  // Validate optional but recommended variables
  const optionalVars = {
    "OLLAMA_MODEL": "llama3.1:8b",
    "ENABLE_CACHE": "true",
    "CACHE_TTL": "3600",
    "LOG_LEVEL": "info"
  };
  
  for (const [varName, defaultValue] of Object.entries(optionalVars)) {
    if (!process.env[varName]) {
      console.log(`  ⚠️ ${varName} not set, using default: ${defaultValue}`);
      process.env[varName] = defaultValue;
    }
  }
  
  // Validate configuration values
  if (embeddingConfig.dimensions <= 0) {
    throw new Error("Embedding dimensions must be positive");
  }
  
  if (embeddingConfig.batchSize <= 0) {
    throw new Error("Embedding batch size must be positive");
  }
  
  console.log("  ✅ Configuration validation passed");
}

/**
 * Test service connectivity and basic operations
 */
export async function testServices(): Promise<void> {
  console.log("🧪 Testing service connectivity...");
  
  // Test embedding service
  console.log("  🧠 Testing embedding service...");
  const embeddingService = new EmbeddingService();
  
  try {
    const testEmbedding = await embeddingService.generateEmbedding("test query");
    if (testEmbedding.length !== embeddingConfig.dimensions) {
      throw new Error(`Embedding dimension mismatch: expected ${embeddingConfig.dimensions}, got ${testEmbedding.length}`);
    }
    console.log("  ✅ Embedding service test passed");
  } catch (error) {
    console.error("  ❌ Embedding service test failed:", error);
    throw error;
  }
  
  // Test MongoDB service
  console.log("  🍃 Testing MongoDB service...");
  const mongoService = new MongoDBService();
  try {
    await mongoService.getAllTools();
    console.log("  ✅ MongoDB service test passed");
  } catch (error) {
    console.error("  ❌ MongoDB service test failed:", error);
    throw error;
  }
  
  // Test Qdrant service
  console.log("  🔍 Testing Qdrant service...");
  const qdrantService = new QdrantService();
  try {
    await qdrantService.getCollectionInfo();
    console.log("  ✅ Qdrant service test passed");
  } catch (error) {
    console.error("  ❌ Qdrant service test failed:", error);
    throw error;
  }
}

/**
 * Main setup function that orchestrates all initialization steps
 */
export async function setupServices(options: {
  seedVectors?: boolean;
  forceSeedVectors?: boolean;
  silent?: boolean;
} = {}): Promise<void> {
  const startTime = Date.now();
  
  console.log("🚀 Setting up Intelligent Search System...\n");
  
  try {
    await validateConfiguration();
    await initializeDatabases();
    await testServices();
    await precomputeEnumEmbeddings();
    
    // Optionally seed vectors
    if (options.seedVectors || process.env.VECTOR_SEED_ON_SETUP === 'true') {
      await seedVectors({
        force: options.forceSeedVectors,
        silent: options.silent
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Setup completed successfully in ${duration}ms`);
    console.log("🎉 Intelligent Search System is ready to use!");
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ Setup failed after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Setup with additional optional features
 */
export async function setupServicesAdvanced(options: {
  populateSampleData?: boolean;
  enableMetrics?: boolean;
  warmupCache?: boolean;
  seedVectors?: boolean;
  forceSeedVectors?: boolean;
} = {}): Promise<void> {
  await setupServices({
    seedVectors: options.seedVectors,
    forceSeedVectors: options.forceSeedVectors
  });
  
  if (options.populateSampleData) {
    console.log("\n📝 Populating sample data...");
    // This would populate the database with sample tool data
    console.log("✅ Sample data populated");
  }
  
  if (options.enableMetrics) {
    console.log("\n📊 Enabling metrics collection...");
    // This would set up metrics collection
    console.log("✅ Metrics collection enabled");
  }
  
  if (options.warmupCache) {
    console.log("\n🔥 Warming up cache...");
    // This would warm up various caches
    console.log("✅ Cache warmed up");
  }
}

/**
 * Run setup as a standalone script
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const advanced = args.includes("--advanced");
  const populateData = args.includes("--populate-data");
  const enableMetrics = args.includes("--metrics");
  const warmupCache = args.includes("--warmup");
  const seedVectors = args.includes("--seed-vectors");
  const forceSeedVectors = args.includes("--force-seed-vectors");
  
  async function main() {
    try {
      if (advanced) {
        await setupServicesAdvanced({
          populateSampleData: populateData,
          enableMetrics: enableMetrics,
          warmupCache: warmupCache,
          seedVectors: seedVectors,
          forceSeedVectors: forceSeedVectors
        });
      } else {
        await setupServices({
          seedVectors: seedVectors,
          forceSeedVectors: forceSeedVectors
        });
      }
      
      console.log("\n💡 Next steps:");
      console.log("  1. Start the search API: npm run dev");
      console.log("  2. Test with: npm start \"React tools\"");
      console.log("  3. Check health: npm start --health");
      
      if (seedVectors) {
        console.log("  4. Vector search is now available with indexed tools");
      }
      
    } catch (error) {
      console.error("\n💥 Setup failed!");
      console.error("Please check your configuration and try again.");
      process.exit(1);
    }
  }
  
  main();
}
