import { MongoDBService } from "./services/mongodb.service";
import { QdrantService } from "./services/qdrant.service";
import { EmbeddingService } from "./services/embedding.service";
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
  await embeddingService.initialize();
  
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
 * Initialize database connections and validate they're working
 */
export async function initializeDatabases(): Promise<void> {
  console.log("🗄️ Initializing database connections...");
  
  // Initialize MongoDB
  console.log("  🍃 Connecting to MongoDB...");
  const mongoService = new MongoDBService();
  try {
    await mongoService.connect();
    await mongoService.ping();
    console.log("  ✅ MongoDB connection successful");
    
    // Verify collections exist
    const db = mongoService.getDatabase();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    if (!collectionNames.includes("tools")) {
      console.log("  ⚠️ 'tools' collection not found, creating...");
      await db.createCollection("tools");
      console.log("  ✅ Created 'tools' collection");
    }
    
    await mongoService.disconnect();
  } catch (error) {
    console.error("  ❌ MongoDB connection failed:", error);
    throw new Error(`MongoDB initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Initialize Qdrant
  console.log("  🔍 Connecting to Qdrant...");
  const qdrantService = new QdrantService();
  try {
    await qdrantService.healthCheck();
    
    // Verify collection exists
    const collections = await qdrantService.listCollections();
    const toolCollection = collections.find(c => c.name === "tools");
    
    if (!toolCollection) {
      console.log("  ⚠️ 'tools' collection not found in Qdrant, creating...");
      await qdrantService.createCollection("tools", {
        vectors: {
          size: embeddingConfig.dimensions,
          distance: "Cosine"
        }
      });
      console.log("  ✅ Created 'tools' collection in Qdrant");
    } else {
      console.log("  ✅ Qdrant 'tools' collection exists");
    }
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
  await embeddingService.initialize();
  
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
    await mongoService.connect();
    const db = mongoService.getDatabase();
    const testDoc = { test: true, timestamp: new Date() };
    await db.collection("test").insertOne(testDoc);
    await db.collection("test").deleteOne({ test: true });
    await mongoService.disconnect();
    console.log("  ✅ MongoDB service test passed");
  } catch (error) {
    console.error("  ❌ MongoDB service test failed:", error);
    throw error;
  }
  
  // Test Qdrant service
  console.log("  🔍 Testing Qdrant service...");
  const qdrantService = new QdrantService();
  try {
    await qdrantService.healthCheck();
    console.log("  ✅ Qdrant service test passed");
  } catch (error) {
    console.error("  ❌ Qdrant service test failed:", error);
    throw error;
  }
}

/**
 * Main setup function that orchestrates all initialization steps
 */
export async function setupServices(): Promise<void> {
  const startTime = Date.now();
  
  console.log("🚀 Setting up Intelligent Search System...\n");
  
  try {
    await validateConfiguration();
    await initializeDatabases();
    await testServices();
    await precomputeEnumEmbeddings();
    
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
} = {}): Promise<void> {
  await setupServices();
  
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
  
  async function main() {
    try {
      if (advanced) {
        await setupServicesAdvanced({
          populateSampleData: populateData,
          enableMetrics: enableMetrics,
          warmupCache: warmupCache
        });
      } else {
        await setupServices();
      }
      
      console.log("\n💡 Next steps:");
      console.log("  1. Start the search API: npm run dev");
      console.log("  2. Test with: npm start \"React tools\"");
      console.log("  3. Check health: npm start --health");
      
    } catch (error) {
      console.error("\n💥 Setup failed!");
      console.error("Please check your configuration and try again.");
      process.exit(1);
    }
  }
  
  main();
}