import express from 'express';
import axios from 'axios';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { StateAnnotation } from "./types/state";

// Import all nodes from Phase 2 (functions) and Phase 3 (extraction)
import {
  lookupByNameNode,
  semanticSearchNode,
  filterByPriceNode,
  filterByCategoryNode,
  filterByFunctionalityNode,
  filterByUserTypeNode,
  filterByInterfaceNode,
  filterByDeploymentNode,
  findSimilarByFeaturesNode,
  excludeToolsNode,
  mergeAndDedupeNode,
  rankByRelevanceNode,
  functionRegistry
} from "./nodes/functions";
import {
  queryPreprocessorNode,
  semanticPrefilterNode,
  zeroShotClassifierNode,
  scoreCombinerNode,
  nerExtractorNode,
  fuzzyMatcherNode,
  nameResolverNode,
  comparativeDetectorNode,
  referenceExtractorNode,
  priceExtractorNode,
  interfaceDetectorNode,
  deploymentDetectorNode,
  intentSynthesizerNode
} from "./nodes";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4003;

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

// Simple linear execution of Phase 3 intent extraction pipeline
async function executeIntentExtractionPipeline(query: string) {
  const startTime = Date.now();

  // Initialize the state
  let state: any = {
    query,
    preprocessedQuery: "",
    intent: {
      toolNames: [],
      categories: [],
      functionality: [],
      userTypes: [],
      interface: [],
      deployment: [],
      isComparative: false,
      referenceTool: null,
      semanticQuery: "",
      keywords: [],
      excludeTools: []
    },
    confidence: {
      overall: 0,
      breakdown: {}
    },
    extractionSignals: {
      nerResults: [],
      fuzzyMatches: [],
      semanticCandidates: {
        categories: [],
        functionality: [],
        userTypes: [],
        interface: [],
        deployment: [],
        pricingModel: []
      },
      classificationScores: {
        categories: [],
        functionality: [],
        userTypes: [],
        interface: [],
        deployment: [],
        pricingModel: []
      },
      combinedScores: {
        categories: [],
        functionality: [],
        userTypes: [],
        interface: [],
        deployment: [],
        pricingModel: []
      },
      resolvedToolNames: [],
      comparativeFlag: false,
      comparativeConfidence: 0,
      referenceTool: null,
      priceConstraints: {},
      interfacePreferences: [],
      deploymentPreferences: []
    },
    metadata: {
      startTime: new Date(),
      executionPath: [],
      nodeExecutionTimes: {}
    }
  };

  try {
    // Execute Phase 3 nodes in sequence
    console.log("🔍 Starting Phase 3: Intent Extraction Pipeline");

    // Step 1: Query preprocessing
    console.log("📝 Step 1: Query preprocessing");
    const preprocessedResult = await queryPreprocessorNode(state);
    state = { ...state, ...preprocessedResult };
    state.metadata.executionPath.push("query_preprocessor");

    // Step 2: Semantic prefilter
    console.log("🎯 Step 2: Semantic prefilter");
    const prefilterResult = await semanticPrefilterNode(state);
    state = { ...state, extractionSignals: { ...state.extractionSignals, ...prefilterResult.extractionSignals } };
    state.metadata.executionPath.push("semantic_prefilter");

    // Step 3: Zero-shot classification
    console.log("🔤 Step 3: Zero-shot classification");
    const classificationResult = await zeroShotClassifierNode(state);
    state = { ...state, extractionSignals: { ...state.extractionSignals, ...classificationResult.extractionSignals } };
    state.metadata.executionPath.push("zero_shot_classifier");

    // Step 4: Score combining
    console.log("🔢 Step 4: Score combining");
    const combinedResult = await scoreCombinerNode(state);
    state = { ...state, extractionSignals: { ...state.extractionSignals, ...combinedResult.extractionSignals } };
    state.metadata.executionPath.push("score_combiner");

    // Step 5: NER extraction
    console.log("🏷️  Step 5: NER extraction");
    const nerResult = await nerExtractorNode(state);
    state = { ...state, extractionSignals: { ...state.extractionSignals, ...nerResult.extractionSignals } };
    state.metadata.executionPath.push("ner_extractor");

    // Step 6: Fuzzy matching
    console.log("🔍 Step 6: Fuzzy matching");
    const fuzzyResult = await fuzzyMatcherNode(state);
    state = { ...state, extractionSignals: { ...state.extractionSignals, ...fuzzyResult.extractionSignals } };
    state.metadata.executionPath.push("fuzzy_matcher");

    // Step 7: Name resolution
    console.log("🔄 Step 7: Name resolution");
    const nameResult = await nameResolverNode(state);
    state = { ...state, extractionSignals: { ...state.extractionSignals, ...nameResult.extractionSignals } };
    state.metadata.executionPath.push("name_resolver");

    // Step 8: Comparative detection
    console.log("⚖️  Step 8: Comparative detection");
    const comparativeResult = await comparativeDetectorNode(state);
    state = { ...state, extractionSignals: { ...state.extractionSignals, ...comparativeResult.extractionSignals } };
    state.metadata.executionPath.push("comparative_detector");

    // Step 9: Reference extraction
    console.log("🎯 Step 9: Reference extraction");
    const referenceResult = await referenceExtractorNode(state);
    state = { ...state, extractionSignals: { ...state.extractionSignals, ...referenceResult.extractionSignals } };
    state.metadata.executionPath.push("reference_extractor");

    // Step 10: Price extraction
    console.log("💰 Step 10: Price extraction");
    const priceResult = await priceExtractorNode(state);
    state = { ...state, extractionSignals: { ...state.extractionSignals, ...priceResult.extractionSignals } };
    state.metadata.executionPath.push("price_extractor");

    // Step 11: Interface detection
    console.log("🖥️  Step 11: Interface detection");
    const interfaceResult = await interfaceDetectorNode(state);
    state = { ...state, extractionSignals: { ...state.extractionSignals, ...interfaceResult.extractionSignals } };
    state.metadata.executionPath.push("interface_detector");

    // Step 12: Deployment detection
    console.log("🚀 Step 12: Deployment detection");
    const deploymentResult = await deploymentDetectorNode(state);
    state = { ...state, extractionSignals: { ...state.extractionSignals, ...deploymentResult.extractionSignals } };
    state.metadata.executionPath.push("deployment_detector");

    // Step 13: Intent synthesis
    console.log("🧠 Step 13: Intent synthesis");
    const intentResult = await intentSynthesizerNode(state);
    state = { ...state, ...intentResult };
    state.metadata.executionPath.push("intent_synthesizer");

    const endTime = Date.now();
    state.metadata.executionTime = endTime - startTime;

    console.log("✅ Phase 3 completed successfully");
    return state;
  } catch (error) {
    console.error("❌ Error in intent extraction pipeline:", error);
    state.metadata.executionTime = Date.now() - startTime;
    state.metadata.error = error instanceof Error ? error.message : 'Unknown error';
    return state;
  }
}

// Simple Phase 2 search execution
async function executePhase2Search(state: any) {
  const results = [];
  const intent = state.intent || {};

  try {
    console.log("🔍 Starting Phase 2: Search Functions");

    // Execute semantic search
    if (intent.categories?.length > 0 || intent.functionality?.length > 0 || !intent.toolNames?.length) {
      console.log("🔍 Executing semantic search");
      try {
        const searchResult = await semanticSearchNode(state);
        if (searchResult.queryResults) {
          results.push(...searchResult.queryResults);
          console.log(`   Found ${searchResult.queryResults.length} semantic search results`);
        }
      } catch (error) {
        console.error("   Semantic search failed:", error);
      }
    }

    // Execute name lookup if tool names are specified
    if (intent.toolNames && intent.toolNames.length > 0) {
      console.log("🏷️  Executing name lookup for:", intent.toolNames);
      try {
        const nameResult = await lookupByNameNode(state);
        if (nameResult.queryResults) {
          results.push(...nameResult.queryResults);
          console.log(`   Found ${nameResult.queryResults.length} name lookup results`);
        }
      } catch (error) {
        console.error("   Name lookup failed:", error);
      }
    }

    // Rank results by relevance
    if (results.length > 0) {
      console.log("📊 Ranking results by relevance");
      try {
        const rankResult = await rankByRelevanceNode({
          ...state,
          queryResults: results
        });
        if (rankResult.queryResults) {
          console.log("✅ Phase 2 completed successfully");
          return rankResult.queryResults;
        }
      } catch (error) {
        console.error("   Relevance ranking failed:", error);
      }
    }

    console.log("✅ Phase 2 completed successfully");
    return results;
  } catch (error) {
    console.error("❌ Error in Phase 2 search:", error);
    return results;
  }
}

// Comprehensive search endpoint with intent extraction
app.post('/search', async (req, res) => {
  try {
    const { query, limit = 10, debug = false } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`\n🚀 Starting search for query: "${query}"`);

    // Phase 3: Intent Extraction
    const intentExtractionResult = await executeIntentExtractionPipeline(query);

    // Phase 2: Search Functions
    const searchResults = await executePhase2Search(intentExtractionResult);

    // Prepare response
    const response = {
      query,
      intent: intentExtractionResult.intent,
      confidence: intentExtractionResult.confidence,
      results: searchResults.slice(0, limit),
      executionTime: intentExtractionResult.metadata.executionTime,
      phase: "Phase 1 + Phase 2 + Phase 3 - Complete Implementation",
      debug: debug ? {
        extractionSignals: intentExtractionResult.extractionSignals,
        metadata: intentExtractionResult.metadata,
        executionPath: intentExtractionResult.metadata.executionPath
      } : undefined
    };

    console.log(`🎉 Search completed in ${response.executionTime}ms with ${response.results.length} results\n`);
    res.json(response);
  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      phase: 'Error during execution'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Search API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Search endpoint: http://localhost:${PORT}/search`);
});