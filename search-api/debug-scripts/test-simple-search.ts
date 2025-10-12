import { QdrantService } from '../src/services/qdrant.service';
import { MongoDBService } from '../src/services/mongodb.service';
import { EmbeddingService } from '../src/services/embedding.service';

async function testSimpleSearch() {
  console.log('Starting simple search test...');
  
  try {
    // Initialize services
    const qdrantService = new QdrantService();
    const mongoService = new MongoDBService();
    const embeddingService = new EmbeddingService();
    
    console.log('Services initialized');
    
    // Test query
    const query = "code editor";
    console.log(`Testing query: "${query}"`);
    
    // Step 1: Generate embedding
    console.log('Step 1: Generating embedding...');
    const embedding = await embeddingService.generateEmbedding(query);
    console.log(`Embedding generated, length: ${embedding.length}`);
    
    // Step 2: Search Qdrant
    console.log('Step 2: Searching Qdrant...');
    const qdrantResults = await qdrantService.searchByEmbedding(embedding, 5);
    console.log(`Qdrant results: ${qdrantResults.length} found`);
    console.log('Qdrant results:', JSON.stringify(qdrantResults, null, 2));
    
    // Step 3: Extract tool IDs
    const toolIds = qdrantResults.map(result => {
      if (result.payload && result.payload.toolId) {
        return result.payload.toolId;
      }
      return result.id;
    });
    console.log('Tool IDs:', toolIds);
    
    // Step 4: Get tools from MongoDB
    console.log('Step 4: Getting tools from MongoDB...');
    const tools = await mongoService.getToolsByIds(toolIds);
    console.log(`MongoDB results: ${tools.length} tools found`);
    console.log('Tools:', JSON.stringify(tools, null, 2));
    
    console.log('Simple search test completed successfully!');
    
  } catch (error) {
    console.error('Error in simple search test:', error);
  }
}

testSimpleSearch();