# Phase 3: Intent Extraction Nodes - Detailed Implementation Tasks

Here's a detailed breakdown of Phase 3 tasks with specific implementation details, code structures, and configurations:

## Task 3.1: Query Preprocessor

### Implementation Details:

**nodes/preprocessing/query-preprocessor.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";

/**
 * Normalize and preprocess the user query
 */
export async function queryPreprocessorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { query } = state;
  
  if (!query) {
    return { preprocessedQuery: "" };
  }
  
  try {
    // Convert to lowercase and trim
    let preprocessed = query.toLowerCase().trim();
    
    // Replace common abbreviations
    const abbreviations = {
      "ui": "user interface",
      "ux": "user experience",
      "api": "application programming interface",
      "saas": "software as a service",
      "ci/cd": "continuous integration continuous deployment",
      "ide": "integrated development environment",
      "crm": "customer relationship management",
      "cms": "content management system",
      "ai": "artificial intelligence",
      "ml": "machine learning"
    };
    
    for (const [abbr, expansion] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${abbr}\\b`, "gi");
      preprocessed = preprocessed.replace(regex, expansion);
    }
    
    // Normalize punctuation
    preprocessed = preprocessed.replace(/[^\w\s]/g, " ");
    
    // Remove extra whitespace
    preprocessed = preprocessed.replace(/\s+/g, " ").trim();
    
    return { preprocessedQuery: preprocessed };
  } catch (error) {
    console.error("Error in queryPreprocessorNode:", error);
    // If preprocessing fails, use the original query
    return { preprocessedQuery: query };
  }
}
```

## Task 3.2: Semantic Pre-filter

### Implementation Details:

**nodes/extraction/semantic-prefilter.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { embeddingService } from "@/services/embedding.service";
import { enumValues } from "@/config/constants";
import { findMostSimilar } from "@/utils/cosine-similarity";

/**
 * Pre-filter enum candidates using semantic similarity
 */
export async function semanticPrefilterNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;
  
  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        semanticCandidates: {
          categories: [],
          functionality: [],
          userTypes: [],
          interface: [],
          deployment: [],
          pricingModel: []
        }
      }
    };
  }
  
  try {
    // Generate embedding for the preprocessed query
    const queryEmbedding = await embeddingService.generateEmbedding(preprocessedQuery);
    
    // Get pre-computed embeddings for enum values
    const enumEmbeddings = await embeddingService.getEnumEmbeddings();
    
    // Find similar candidates for each enum type
    const semanticCandidates: Record<string, Array<{ value: string; score: number }>> = {};
    
    // Categories
    const categoryCandidates = findMostSimilar(
      queryEmbedding,
      enumEmbeddings.categories.map(e => e.embedding),
      5
    );
    semanticCandidates.categories = categoryCandidates.map(c => ({
      value: enumValues.categories[c.index],
      score: c.similarity
    }));
    
    // Functionality
    const functionalityCandidates = findMostSimilar(
      queryEmbedding,
      enumEmbeddings.functionality.map(e => e.embedding),
      5
    );
    semanticCandidates.functionality = functionalityCandidates.map(c => ({
      value: enumValues.functionality[c.index],
      score: c.similarity
    }));
    
    // User types
    const userTypeCandidates = findMostSimilar(
      queryEmbedding,
      enumEmbeddings.userTypes.map(e => e.embedding),
      5
    );
    semanticCandidates.userTypes = userTypeCandidates.map(c => ({
      value: enumValues.userTypes[c.index],
      score: c.similarity
    }));
    
    // Interface
    const interfaceCandidates = findMostSimilar(
      queryEmbedding,
      enumEmbeddings.interface.map(e => e.embedding),
      5
    );
    semanticCandidates.interface = interfaceCandidates.map(c => ({
      value: enumValues.interface[c.index],
      score: c.similarity
    }));
    
    // Deployment
    const deploymentCandidates = findMostSimilar(
      queryEmbedding,
      enumEmbeddings.deployment.map(e => e.embedding),
      5
    );
    semanticCandidates.deployment = deploymentCandidates.map(c => ({
      value: enumValues.deployment[c.index],
      score: c.similarity
    }));
    
    // Pricing model
    const pricingModelCandidates = findMostSimilar(
      queryEmbedding,
      enumEmbeddings.pricingModel.map(e => e.embedding),
      5
    );
    semanticCandidates.pricingModel = pricingModelCandidates.map(c => ({
      value: enumValues.pricingModel[c.index],
      score: c.similarity
    }));
    
    return {
      extractionSignals: {
        ...state.extractionSignals,
        semanticCandidates
      }
    };
  } catch (error) {
    console.error("Error in semanticPrefilterNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        semanticCandidates: {
          categories: [],
          functionality: [],
          userTypes: [],
          interface: [],
          deployment: [],
          pricingModel: []
        }
      }
    };
  }
}
```

## Task 3.3: Zero-Shot Classifier

### Implementation Details:

**nodes/extraction/zero-shot-classifier.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { ollamaClient, modelConfigs } from "@/config/models";

/**
 * Classify query against filtered candidates using zero-shot classification
 */
export async function zeroShotClassifierNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery, extractionSignals } = state;
  
  if (!preprocessedQuery || !extractionSignals.semanticCandidates) {
    return {
      extractionSignals: {
        ...extractionSignals,
        classificationScores: {
          categories: [],
          functionality: [],
          userTypes: [],
          interface: [],
          deployment: [],
          pricingModel: []
        }
      }
    };
  }
  
  try {
    const classificationScores: Record<string, Array<{ value: string; score: number }>> = {};
    
    // For each enum type, perform zero-shot classification
    for (const [enumType, candidates] of Object.entries(extractionSignals.semanticCandidates)) {
      if (candidates.length === 0) {
        classificationScores[enumType] = [];
        continue;
      }
      
      // Create a prompt for zero-shot classification
      const candidateLabels = candidates.map(c => c.value).join(", ");
      const prompt = `
Classify the following query into one of these categories: ${candidateLabels}

Query: "${preprocessedQuery}"

Respond with only the category name that best matches the query.
`;
      
      // Call the LLM for classification
      const response = await ollamaClient.generate({
        model: modelConfigs.intentExtraction.model,
        prompt,
        options: modelConfigs.intentExtraction.options
      });
      
      const classifiedValue = response.response.trim().toLowerCase();
      
      // Find the classified value in our candidates and assign a high score
      const matchedCandidate = candidates.find(c => 
        c.value.toLowerCase() === classifiedValue
      );
      
      if (matchedCandidate) {
        classificationScores[enumType] = [{
          value: matchedCandidate.value,
          score: 0.9 // High confidence for LLM classification
        }];
      } else {
        // If no match, use the top semantic candidate with lower confidence
        classificationScores[enumType] = [{
          value: candidates[0].value,
          score: 0.5
        }];
      }
    }
    
    return {
      extractionSignals: {
        ...extractionSignals,
        classificationScores
      }
    };
  } catch (error) {
    console.error("Error in zeroShotClassifierNode:", error);
    return {
      extractionSignals: {
        ...extractionSignals,
        classificationScores: {
          categories: [],
          functionality: [],
          userTypes: [],
          interface: [],
          deployment: [],
          pricingModel: []
        }
      }
    };
  }
}
```

## Task 3.4: Score Combiner

### Implementation Details:

**nodes/extraction/score-combiner.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";

/**
 * Combine semantic similarity and classification scores
 */
export async function scoreCombinerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { extractionSignals } = state;
  
  if (!extractionSignals.semanticCandidates || !extractionSignals.classificationScores) {
    return {
      extractionSignals: {
        ...extractionSignals,
        combinedScores: {
          categories: [],
          functionality: [],
          userTypes: [],
          interface: [],
          deployment: [],
          pricingModel: []
        }
      }
    };
  }
  
  try {
    const combinedScores: Record<string, Array<{ value: string; score: number }>> = {};
    
    // For each enum type, combine semantic and classification scores
    for (const enumType of Object.keys(extractionSignals.semanticCandidates)) {
      const semanticCandidates = extractionSignals.semanticCandidates[enumType] || [];
      const classificationScores = extractionSignals.classificationScores[enumType] || [];
      
      // Create a map of value to combined score
      const scoreMap = new Map<string, number>();
      
      // Add semantic scores (weighted by 0.6)
      semanticCandidates.forEach(candidate => {
        scoreMap.set(candidate.value, candidate.score * 0.6);
      });
      
      // Add classification scores (weighted by 0.4)
      classificationScores.forEach(score => {
        const existingScore = scoreMap.get(score.value) || 0;
        scoreMap.set(score.value, existingScore + score.score * 0.4);
      });
      
      // Convert back to array and sort by score
      combinedScores[enumType] = Array.from(scoreMap.entries())
        .map(([value, score]) => ({ value, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3); // Keep top 3 candidates
    }
    
    return {
      extractionSignals: {
        ...extractionSignals,
        combinedScores
      }
    };
  } catch (error) {
    console.error("Error in scoreCombinerNode:", error);
    return {
      extractionSignals: {
        ...extractionSignals,
        combinedScores: {
          categories: [],
          functionality: [],
          userTypes: [],
          interface: [],
          deployment: [],
          pricingModel: []
        }
      }
    };
  }
}
```

## Task 3.5: NER Extractor

### Implementation Details:

**nodes/extraction/ner-extractor.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { ollamaClient, modelConfigs } from "@/config/models";

/**
 * Extract tool names using Named Entity Recognition
 */
export async function nerExtractorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;
  
  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        nerResults: []
      }
    };
  }
  
  try {
    // Create a prompt for NER
    const prompt = `
Extract tool names from the following query. A tool name is typically a proper noun that refers to a software application, framework, or platform.

Query: "${preprocessedQuery}"

Respond with a JSON array of tool names found in the query. If no tool names are found, return an empty array.
Example response: ["GitHub", "VS Code", "React"]
`;
    
    // Call the LLM for NER
    const response = await ollamaClient.generate({
      model: modelConfigs.intentExtraction.model,
      prompt,
      options: modelConfigs.intentExtraction.options,
      format: "json"
    });
    
    let nerResults: string[] = [];
    
    try {
      // Parse the JSON response
      nerResults = JSON.parse(response.response);
      
      // Ensure it's an array
      if (!Array.isArray(nerResults)) {
        nerResults = [];
      }
    } catch (parseError) {
      console.error("Error parsing NER response:", parseError);
      // If parsing fails, return empty array
      nerResults = [];
    }
    
    return {
      extractionSignals: {
        ...state.extractionSignals,
        nerResults
      }
    };
  } catch (error) {
    console.error("Error in nerExtractorNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        nerResults: []
      }
    };
  }
}
```

## Task 3.6: Fuzzy Matcher

### Implementation Details:

**nodes/extraction/fuzzy-matcher.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { mongoDBService } from "@/services/mongodb.service";
import Fuse from "fuse.js";

/**
 * Match query terms to known tool names using fuzzy matching
 */
export async function fuzzyMatcherNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;
  
  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        fuzzyMatches: []
      }
    };
  }
  
  try {
    // Get all tools from the database
    const allTools = await mongoDBService.getAllTools();
    
    // Extract tool names for fuzzy matching
    const toolNames = allTools.map(tool => tool.name);
    
    // Configure Fuse.js for fuzzy searching
    const fuseOptions = {
      keys: ["name"],
      threshold: 0.4, // Lower threshold = more strict matching
      includeScore: true,
      minMatchCharLength: 2,
    };
    
    // Create a Fuse instance with tool names
    const fuse = new Fuse(allTools, fuseOptions);
    
    // Split the query into terms and search for each
    const queryTerms = preprocessedQuery.split(/\s+/).filter(term => term.length > 2);
    const fuzzyMatches: Array<{ name: string; score: number; toolId: string }> = [];
    
    for (const term of queryTerms) {
      const results = fuse.search(term);
      
      // Add top results
      for (const result of results.slice(0, 2)) {
        // Check if we already have this tool
        const existingMatch = fuzzyMatches.find(
          match => match.toolId === result.item._id.toString()
        );
        
        if (!existingMatch) {
          fuzzyMatches.push({
            name: result.item.name,
            score: result.score || 0,
            toolId: result.item._id.toString()
          });
        }
      }
    }
    
    // Sort by score (lower is better in Fuse.js)
    fuzzyMatches.sort((a, b) => a.score - b.score);
    
    return {
      extractionSignals: {
        ...state.extractionSignals,
        fuzzyMatches
      }
    };
  } catch (error) {
    console.error("Error in fuzzyMatcherNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        fuzzyMatches: []
      }
    };
  }
}
```

## Task 3.7: Name Resolver

### Implementation Details:

**nodes/extraction/name-resolver.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";

/**
 * Resolve conflicts between NER and fuzzy matching results
 */
export async function nameResolverNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { extractionSignals } = state;
  
  if (!extractionSignals.nerResults && !extractionSignals.fuzzyMatches) {
    return {
      extractionSignals: {
        ...extractionSignals,
        resolvedToolNames: []
      }
    };
  }
  
  try {
    const nerResults = extractionSignals.nerResults || [];
    const fuzzyMatches = extractionSignals.fuzzyMatches || [];
    
    // Create a map of tool names to confidence scores
    const toolNameMap = new Map<string, number>();
    
    // Add NER results with high confidence
    nerResults.forEach(name => {
      toolNameMap.set(name, 0.9);
    });
    
    // Add fuzzy matches with confidence based on score
    fuzzyMatches.forEach(match => {
      // Convert Fuse.js score to confidence (lower score = higher confidence)
      const confidence = 1 - Math.min(match.score, 1);
      
      // Only add if confidence is reasonable
      if (confidence > 0.5) {
        const existingConfidence = toolNameMap.get(match.name) || 0;
        // Use the higher confidence
        toolNameMap.set(match.name, Math.max(existingConfidence, confidence));
      }
    });
    
    // Convert to array and sort by confidence
    const resolvedToolNames = Array.from(toolNameMap.entries())
      .map(([name, confidence]) => ({ name, confidence }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5) // Keep top 5
      .map(item => item.name);
    
    return {
      extractionSignals: {
        ...extractionSignals,
        resolvedToolNames
      }
    };
  } catch (error) {
    console.error("Error in nameResolverNode:", error);
    return {
      extractionSignals: {
        ...extractionSignals,
        resolvedToolNames: []
      }
    };
  }
}
```

## Task 3.8: Comparative Detector

### Implementation Details:

**nodes/extraction/comparative-detector.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { embeddingService } from "@/services/embedding.service";
import { cosineSimilarity } from "@/utils/cosine-similarity";
import { comparativePatterns } from "@/utils/pattern-matchers";

/**
 * Detect comparative intent in the query
 */
export async function comparativeDetectorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;
  
  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        comparativeFlag: false,
        comparativeConfidence: 0
      }
    };
  }
  
  try {
    // First, check for explicit comparative patterns
    let comparativeFlag = false;
    let comparativeConfidence = 0;
    
    for (const [patternType, pattern] of Object.entries(comparativePatterns)) {
      if (pattern.test(preprocessedQuery)) {
        comparativeFlag = true;
        
        // Set confidence based on pattern type
        switch (patternType) {
          case "direct":
            comparativeConfidence = 0.9;
            break;
          case "difference":
            comparativeConfidence = 0.8;
            break;
          case "similarity":
            comparativeConfidence = 0.7;
            break;
        }
        break;
      }
    }
    
    // If no explicit pattern found, use semantic similarity
    if (!comparativeFlag) {
      // Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(preprocessedQuery);
      
      // Get embeddings for comparative patterns
      const comparativePatterns = [
        "compare tools",
        "alternative to",
        "vs",
        "instead of",
        "similar to",
        "better than",
        "replacement for"
      ];
      
      const patternEmbeddings = await embeddingService.generateEmbeddings(comparativePatterns);
      
      // Calculate similarities
      const similarities = patternEmbeddings.map(embedding => 
        cosineSimilarity(queryEmbedding, embedding)
      );
      
      // Find the highest similarity
      const maxSimilarity = Math.max(...similarities);
      
      // If similarity is above threshold, consider it comparative
      if (maxSimilarity > 0.7) {
        comparativeFlag = true;
        comparativeConfidence = maxSimilarity * 0.8; // Slightly lower confidence for semantic detection
      }
    }
    
    return {
      extractionSignals: {
        ...state.extractionSignals,
        comparativeFlag,
        comparativeConfidence
      }
    };
  } catch (error) {
    console.error("Error in comparativeDetectorNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        comparativeFlag: false,
        comparativeConfidence: 0
      }
    };
  }
}
```

## Task 3.9: Reference Extractor

### Implementation Details:

**nodes/extraction/reference-extractor.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { ollamaClient, modelConfigs } from "@/config/models";
import { extractReferenceTool } from "@/utils/pattern-matchers";

/**
 * Extract reference tool name from comparative query
 */
export async function referenceExtractorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery, extractionSignals } = state;
  
  if (!preprocessedQuery || !extractionSignals.comparativeFlag) {
    return {
      extractionSignals: {
        ...extractionSignals,
        referenceTool: null
      }
    };
  }
  
  try {
    // First, try pattern-based extraction
    let referenceTool = extractReferenceTool(preprocessedQuery);
    
    // If pattern-based extraction fails, use LLM
    if (!referenceTool) {
      const prompt = `
Extract the reference tool name from the following comparative query. The reference tool is the one being compared against.

Query: "${preprocessedQuery}"

Respond with only the name of the reference tool. If no reference tool is found, respond with "none".
`;
      
      const response = await ollamaClient.generate({
        model: modelConfigs.intentExtraction.model,
        prompt,
        options: modelConfigs.intentExtraction.options
      });
      
      const extractedTool = response.response.trim();
      
      if (extractedTool.toLowerCase() !== "none") {
        referenceTool = extractedTool;
      }
    }
    
    return {
      extractionSignals: {
        ...extractionSignals,
        referenceTool
      }
    };
  } catch (error) {
    console.error("Error in referenceExtractorNode:", error);
    return {
      extractionSignals: {
        ...extractionSignals,
        referenceTool: null
      }
    };
  }
}
```

## Task 3.10: Price Extractor

### Implementation Details:

**nodes/extraction/price-extractor.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { extractPriceConstraints } from "@/utils/pattern-matchers";

/**
 * Extract price constraints from the query
 */
export async function priceExtractorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;
  
  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        priceConstraints: {}
      }
    };
  }
  
  try {
    // Use pattern matching to extract price constraints
    const priceConstraints = extractPriceConstraints(preprocessedQuery);
    
    return {
      extractionSignals: {
        ...state.extractionSignals,
        priceConstraints
      }
    };
  } catch (error) {
    console.error("Error in priceExtractorNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        priceConstraints: {}
      }
    };
  }
}
```

## Task 3.11: Interface Detector

### Implementation Details:

**nodes/extraction/interface-detector.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { extractInterfacePreferences } from "@/utils/pattern-matchers";

/**
 * Detect interface preferences from the query
 */
export async function interfaceDetectorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;
  
  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        interfacePreferences: []
      }
    };
  }
  
  try {
    // Use pattern matching to extract interface preferences
    const interfacePreferences = extractInterfacePreferences(preprocessedQuery);
    
    return {
      extractionSignals: {
        ...state.extractionSignals,
        interfacePreferences
      }
    };
  } catch (error) {
    console.error("Error in interfaceDetectorNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        interfacePreferences: []
      }
    };
  }
}
```

## Task 3.12: Deployment Detector

### Implementation Details:

**nodes/extraction/deployment-detector.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { extractDeploymentPreferences } from "@/utils/pattern-matchers";

/**
 * Detect deployment preferences from the query
 */
export async function deploymentDetectorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;
  
  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        deploymentPreferences: []
      }
    };
  }
  
  try {
    // Use pattern matching to extract deployment preferences
    const deploymentPreferences = extractDeploymentPreferences(preprocessedQuery);
    
    return {
      extractionSignals: {
        ...state.extractionSignals,
        deploymentPreferences
      }
    };
  } catch (error) {
    console.error("Error in deploymentDetectorNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        deploymentPreferences: []
      }
    };
  }
}
```

## Task 3.13: Intent Synthesizer

### Implementation Details:

**nodes/extraction/intent-synthesizer.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { IntentSchema } from "@/types/intent";
import { ollamaClient, modelConfigs } from "@/config/models";
import { confidenceThresholds } from "@/config/constants";

/**
 * Synthesize all extraction signals into a unified intent
 */
export async function intentSynthesizerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { 
    query, 
    preprocessedQuery, 
    extractionSignals 
  } = state;
  
  if (!preprocessedQuery) {
    return {
      intent: {
        toolNames: [],
        categories: [],
        functionality: [],
        userTypes: [],
        interface: [],
        deployment: [],
        isComparative: false,
        semanticQuery: "",
        keywords: [],
        excludeTools: []
      },
      confidence: {
        overall: 0,
        breakdown: {}
      }
    };
  }
  
  try {
    // Create a prompt for intent synthesis
    const prompt = `
Synthesize the following extraction signals into a unified intent object for the query: "${query}"

Extraction signals:
- Tool names: ${JSON.stringify(extractionSignals.resolvedToolNames || [])}
- Categories: ${JSON.stringify(extractionSignals.combinedScores?.categories?.map(c => c.value) || [])}
- Functionality: ${JSON.stringify(extractionSignals.combinedScores?.functionality?.map(c => c.value) || [])}
- User types: ${JSON.stringify(extractionSignals.combinedScores?.userTypes?.map(c => c.value) || [])}
- Interface: ${JSON.stringify(extractionSignals.interfacePreferences || [])}
- Deployment: ${JSON.stringify(extractionSignals.deploymentPreferences || [])}
- Comparative: ${extractionSignals.comparativeFlag ? "Yes" : "No"}
- Reference tool: ${extractionSignals.referenceTool || "None"}
- Price constraints: ${JSON.stringify(extractionSignals.priceConstraints || {})}

Respond with a JSON object representing the intent, following this schema:
{
  "toolNames": ["array of tool names"],
  "priceConstraints": {
    "hasFreeTier": boolean,
    "maxPrice": number,
    "minPrice": number,
    "pricingModel": string
  },
  "categories": ["array of categories"],
  "functionality": ["array of functionality"],
  "userTypes": ["array of user types"],
  "interface": ["array of interface types"],
  "deployment": ["array of deployment types"],
  "isComparative": boolean,
  "referenceTool": "string or null",
  "semanticQuery": "string representing the semantic intent",
  "keywords": ["array of keywords"],
  "excludeTools": ["array of tools to exclude"]
}
`;
    
    // Call the LLM for intent synthesis
    const response = await ollamaClient.generate({
      model: modelConfigs.intentExtraction.model,
      prompt,
      options: modelConfigs.intentExtraction.options,
      format: "json"
    });
    
    let intent: any;
    
    try {
      // Parse the JSON response
      intent = JSON.parse(response.response);
      
      // Validate against schema
      intent = IntentSchema.parse(intent);
    } catch (parseError) {
      console.error("Error parsing intent synthesis response:", parseError);
      
      // If parsing fails, create a minimal intent
      intent = {
        toolNames: extractionSignals.resolvedToolNames || [],
        categories: extractionSignals.combinedScores?.categories?.map(c => c.value) || [],
        functionality: extractionSignals.combinedScores?.functionality?.map(c => c.value) || [],
        userTypes: extractionSignals.combinedScores?.userTypes?.map(c => c.value) || [],
        interface: extractionSignals.interfacePreferences || [],
        deployment: extractionSignals.deploymentPreferences || [],
        isComparative: extractionSignals.comparativeFlag || false,
        referenceTool: extractionSignals.referenceTool || null,
        semanticQuery: preprocessedQuery,
        keywords: preprocessedQuery.split(/\s+/),
        excludeTools: [],
        priceConstraints: extractionSignals.priceConstraints || {}
      };
    }
    
    // Calculate confidence scores
    const confidenceBreakdown: Record<string, number> = {};
    
    // Tool names confidence
    if (intent.toolNames && intent.toolNames.length > 0) {
      confidenceBreakdown.toolNames = 0.9;
    } else {
      confidenceBreakdown.toolNames = 0;
    }
    
    // Categories confidence
    if (intent.categories && intent.categories.length > 0) {
      const categoryScores = extractionSignals.combinedScores?.categories || [];
      confidenceBreakdown.categories = categoryScores.length > 0 
        ? categoryScores[0].score 
        : 0.5;
    } else {
      confidenceBreakdown.categories = 0;
    }
    
    // Functionality confidence
    if (intent.functionality && intent.functionality.length > 0) {
      const functionalityScores = extractionSignals.combinedScores?.functionality || [];
      confidenceBreakdown.functionality = functionalityScores.length > 0 
        ? functionalityScores[0].score 
        : 0.5;
    } else {
      confidenceBreakdown.functionality = 0;
    }
    
    // User types confidence
    if (intent.userTypes && intent.userTypes.length > 0) {
      const userTypeScores = extractionSignals.combinedScores?.userTypes || [];
      confidenceBreakdown.userTypes = userTypeScores.length > 0 
        ? userTypeScores[0].score 
        : 0.5;
    } else {
      confidenceBreakdown.userTypes = 0;
    }
    
    // Interface confidence
    if (intent.interface && intent.interface.length > 0) {
      confidenceBreakdown.interface = 0.8; // High confidence for pattern matching
    } else {
      confidenceBreakdown.interface = 0;
    }
    
    // Deployment confidence
    if (intent.deployment && intent.deployment.length > 0) {
      confidenceBreakdown.deployment = 0.8; // High confidence for pattern matching
    } else {
      confidenceBreakdown.deployment = 0;
    }
    
    // Comparative confidence
    confidenceBreakdown.comparative = extractionSignals.comparativeConfidence || 0;
    
    // Calculate overall confidence as weighted average
    const weights = {
      toolNames: 0.2,
      categories: 0.15,
      functionality: 0.15,
      userTypes: 0.1,
      interface: 0.1,
      deployment: 0.1,
      comparative: 0.2
    };
    
    let overallConfidence = 0;
    let totalWeight = 0;
    
    for (const [key, weight] of Object.entries(weights)) {
      if (confidenceBreakdown[key] !== undefined) {
        overallConfidence += confidenceBreakdown[key] * weight;
        totalWeight += weight;
      }
    }
    
    overallConfidence = totalWeight > 0 ? overallConfidence / totalWeight : 0;
    
    return {
      intent,
      confidence: {
        overall: overallConfidence,
        breakdown: confidenceBreakdown
      }
    };
  } catch (error) {
    console.error("Error in intentSynthesizerNode:", error);
    return {
      intent: {
        toolNames: [],
        categories: [],
        functionality: [],
        userTypes: [],
        interface: [],
        deployment: [],
        isComparative: false,
        semanticQuery: preprocessedQuery || "",
        keywords: (preprocessedQuery || "").split(/\s+/),
        excludeTools: []
      },
      confidence: {
        overall: 0,
        breakdown: {}
      }
    };
  }
}
```

## Additional Implementation Files

**nodes/extraction/index.ts**
```typescript
// Export all extraction nodes for easy importing
export { queryPreprocessorNode } from "../preprocessing/query-preprocessor.node";
export { semanticPrefilterNode } from "./semantic-prefilter.node";
export { zeroShotClassifierNode } from "./zero-shot-classifier.node";
export { scoreCombinerNode } from "./score-combiner.node";
export { nerExtractorNode } from "./ner-extractor.node";
export { fuzzyMatcherNode } from "./fuzzy-matcher.node";
export { nameResolverNode } from "./name-resolver.node";
export { comparativeDetectorNode } from "./comparative-detector.node";
export { referenceExtractorNode } from "./reference-extractor.node";
export { priceExtractorNode } from "./price-extractor.node";
export { interfaceDetectorNode } from "./interface-detector.node";
export { deploymentDetectorNode } from "./deployment-detector.node";
export { intentSynthesizerNode } from "./intent-synthesizer.node";
```

With these detailed implementations for Phase 3, you'll have a comprehensive set of intent extraction nodes that can work together to understand user queries and extract structured information. Each node is designed to handle a specific aspect of intent extraction, with clear input/output interfaces and consistent error handling. The nodes can be connected in a LangGraph to create a sophisticated intent extraction pipeline.