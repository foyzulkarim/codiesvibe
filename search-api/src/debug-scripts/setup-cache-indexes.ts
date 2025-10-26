import { Db, MongoClient } from "mongodb";
import { connectToMongoDB } from "@/config/database";
import { embeddingConfig } from "@/config/constants";

/**
 * Script to set up MongoDB indexes for the plans collection
 * This should be run once to initialize the cache database schema
 */

async function setupCacheIndexes(): Promise<void> {
  let client: MongoClient | null = null;

  try {
    console.log("🔧 Setting up cache database indexes...");

    // Connect to MongoDB
    const db = await connectToMongoDB();

    // Create indexes for plans collection
    const plansCollection = db.collection("plans");

    // 1. Unique index on query hash for exact matching
    console.log("Creating unique index on queryHash...");
    await plansCollection.createIndex(
      { queryHash: 1 },
      {
        unique: true,
        name: "idx_query_hash_unique"
      }
    );

    // 2. Text index for query text search (backup search method)
    console.log("Creating text index on originalQuery...");
    await plansCollection.createIndex(
      { originalQuery: "text" },
      {
        name: "idx_original_query_text"
      }
    );

    // 3. Compound index for usage statistics and cleanup
    console.log("Creating compound index for usage and cleanup...");
    await plansCollection.createIndex(
      {
        usageCount: -1,
        lastUsed: -1,
        confidence: -1
      },
      {
        name: "idx_usage_cleanup"
      }
    );

    // 4. TTL index for automatic cleanup of low-usage old documents
    console.log("Creating TTL index for old documents...");
    await plansCollection.createIndex(
      {
        createdAt: 1
      },
      {
        name: "idx_created_at_ttl",
        expireAfterSeconds: 365 * 24 * 60 * 60, // 1 year
        partialFilterExpression: {
          usageCount: { $lt: 5 }
        }
      }
    );

    // 5. Index for confidence-based queries
    console.log("Creating index on confidence...");
    await plansCollection.createIndex(
      { confidence: -1 },
      {
        name: "idx_confidence_desc"
      }
    );

    console.log("✅ Plans collection indexes created successfully!");

    // Create indexes for cache_stats collection
    const statsCollection = db.collection("cache_stats");

    console.log("Creating index for cache_stats...");
    await statsCollection.createIndex(
      { date: 1 },
      {
        unique: true,
        name: "idx_date_unique"
      }
    );

    await statsCollection.createIndex(
      { lastUpdated: -1 },
      {
        name: "idx_last_updated_desc"
      }
    );

    console.log("✅ Cache stats collection indexes created successfully!");

    // IMPORTANT: Vector Search Index Setup
    console.log("\n🚨 IMPORTANT: Vector Search Index Setup");
    console.log("The vector search index needs to be created manually in MongoDB Atlas UI:");
    console.log(`
    1. Go to your MongoDB Atlas dashboard
    2. Navigate to your cluster
    3. Go to the "Atlas Search" tab
    4. Click "Create Search Index"
    5. Select "JSON Editor"
    6. Use the following configuration:

    {
      "fields": [
        {
          "type": "vector",
          "path": "queryEmbedding",
          "numDimensions": ${embeddingConfig.dimensions},
          "similarity": "cosine"
        }
      ]
    }

    7. Name the index: "plans_vector_index"
    8. Select the "plans" collection
    9. Click "Create"
    `);

    // Verify indexes
    const plansIndexes = await plansCollection.listIndexes().toArray();
    console.log("\n📋 Plans collection indexes:");
    plansIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    const statsIndexes = await statsCollection.listIndexes().toArray();
    console.log("\n📋 Cache stats collection indexes:");
    statsIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Sample data insertion for testing
    console.log("\n🧪 Inserting sample cache data for testing...");

    // Use Together AI embedding service
    const { productionEmbeddingService } = await import("@/services/production-embedding.service");
    await productionEmbeddingService.initialize();

    const sampleQuery = "code editor";
    const sampleEmbedding = await productionEmbeddingService.generateEmbedding(sampleQuery);

    const samplePlan = {
      originalQuery: sampleQuery,
      queryEmbedding: sampleEmbedding,
      intentState: {
        primaryGoal: "find",
        referenceTool: null,
        comparisonMode: null,
        filters: [],
        pricingModel: null,
        billingPeriod: null,
        priceRange: null,
        priceComparison: null,
        category: "Code Editor",
        interface: null,
        functionality: [],
        deployment: null,
        industry: null,
        userType: null,
        semanticVariants: [],
        constraints: [],
        confidence: 0.9
      },
      executionPlan: {
        strategy: "hybrid",
        vectorSources: [
          {
            collection: "tools",
            embeddingType: "semantic",
            queryVectorSource: "query_text",
            topK: 70
          },
          {
            collection: "functionality",
            embeddingType: "entities.functionality",
            queryVectorSource: "query_text",
            topK: 40
          }
        ],
        structuredSources: [
          {
            collection: "mongodb",
            filters: [
              {
                field: "categories",
                operator: "in",
                value: ["Code Editor"]
              }
            ],
            topK: 50
          }
        ],
        fusion: "weighted_sum",
        confidence: 0.7,
        explanation: "Multi-collection search strategy: hybrid. Searching 2 specialized collections: tools, functionality. Combining with MongoDB structured filtering for precise constraints."
      },
      candidates: [],
      executionTime: 12873,
      usageCount: 1,
      lastUsed: new Date(),
      createdAt: new Date(),
      queryHash: require('crypto').createHash('md5').update(sampleQuery.trim().toLowerCase()).digest('hex'),
      confidence: 0.7,
      metadata: {
        executionPath: ["intent-extractor", "query-planner", "query-executor"],
        totalNodesExecuted: 3,
        pipelineVersion: "2.0-llm-first"
      }
    };

    try {
      await plansCollection.insertOne(samplePlan);
      console.log("✅ Sample cache data inserted successfully!");
    } catch (error: any) {
      if (error.code === 11000) {
        console.log("ℹ️ Sample data already exists (duplicate key error)");
      } else {
        console.log("⚠️ Error inserting sample data:", error.message);
      }
    }

    console.log("\n🎉 Cache database setup completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Create the vector search index in MongoDB Atlas UI (see instructions above)");
    console.log("2. Test the cache implementation with your search queries");
    console.log("3. Monitor cache performance using the getCacheStats() method");

  } catch (error) {
    console.error("❌ Error setting up cache indexes:", error);
    throw error;
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupCacheIndexes()
    .then(() => {
      console.log("✅ Setup completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Setup failed:", error);
      process.exit(1);
    });
}

export { setupCacheIndexes };