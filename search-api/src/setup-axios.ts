import { MongoClient } from 'mongodb';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Setup script using axios instead of problematic clients
 */
async function setup(): Promise<void> {
  console.log("🚀 Starting LangGraph Search System setup (axios version)...");

  try {
    // Test MongoDB
    console.log("📦 Connecting to MongoDB...");
    const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/toolsearch');
    await mongoClient.connect();
    const db = mongoClient.db();
    await db.admin().ping();
    
    // Test basic MongoDB operations
    const toolCount = await db.collection('tools').countDocuments();
    console.log(`✅ MongoDB connection successful - Found ${toolCount} tools`);
    await mongoClient.close();

    // Test Qdrant using axios
    console.log("🔍 Testing Qdrant connection...");
    const qdrantResponse = await axios.get(`http://${process.env.QDRANT_HOST || 'localhost'}:${process.env.QDRANT_PORT || 6333}/collections`);
    console.log(`✅ Qdrant connection successful - Collections: ${qdrantResponse.data.result.collections.length}`);

    // Test Ollama using axios
    console.log("🤖 Testing Ollama connection...");
    const ollamaResponse = await axios.get('http://localhost:11434/api/tags');
    const models = ollamaResponse.data.models;
    console.log(`✅ Ollama connection successful - Available models: ${models.map((m: any) => m.name).join(', ')}`);

    // Check if required models are available
    const embeddingModel = models.find((m: any) => m.name.includes('mxbai-embed-large'));
    const llmModel = models.find((m: any) => m.name.includes('llama2') || m.name.includes('llama3'));
    
    if (!embeddingModel) {
      console.warn("⚠️  Warning: mxbai-embed-large model not found. Please run: ollama pull mxbai-embed-large");
    }
    
    if (!llmModel) {
      console.warn("⚠️  Warning: No suitable LLM model found. Please run: ollama pull llama2");
    }

    console.log("\n🎉 Complete setup finished successfully!");
    console.log("\n📋 System Status:");
    console.log("✅ MongoDB connection working");
    console.log("✅ Qdrant vector database working");
    console.log("✅ Ollama LLM integration working");
    console.log("✅ HTTP client integration working");
    console.log("\n📋 Ready for Phase 2:");
    console.log("1. Implement search functions");
    console.log("2. Create intent extraction nodes");
    console.log("3. Build planning and execution layers");

  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setup();
}

export { setup };