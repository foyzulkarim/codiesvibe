import { JsonOutputParser } from '@langchain/core/output_parsers';

import { StateAnnotation } from '../../types/state';
import { QueryPlanSchema } from '../../types/query-plan';
import { llmService } from '../../services/llm.service';
import { CONTROLLED_VOCABULARIES, OPERATORS } from '../../shared/constants/controlled-vocabularies';
import { CollectionConfigService } from '../../services/collection-config.service';
import { VectorTypeRegistryService } from '../../services/vector-type-registry.service';
import { MultiCollectionOrchestrator } from '../../services/multi-collection-orchestrator.service';
import { ContentGeneratorFactory } from '../../services/content-generator-factory.service';

// Configuration for logging
const LOG_CONFIG = {
  enabled: process.env.NODE_ENV !== 'production',
  prefix: '🗺️ Query Planner:',
};

// Initialize multi-collection services
const collectionConfig = new CollectionConfigService();
const vectorTypeRegistry = new VectorTypeRegistryService(collectionConfig);
const contentFactory = new ContentGeneratorFactory(collectionConfig);
const multiCollectionOrchestrator = new MultiCollectionOrchestrator(
  collectionConfig,
  vectorTypeRegistry,
  contentFactory
);

// Helper function for conditional logging
const log = (message: string, data?: any) => {
  if (LOG_CONFIG.enabled) {
    console.log(`${LOG_CONFIG.prefix} ${message}`, data ? data : '');
  }
};

const logError = (message: string, error?: any) => {
  console.error(`${LOG_CONFIG.prefix} ERROR: ${message}`, error ? error : '');
};

/**
 * Get dynamic multi-collection configuration for query planning
 */
function getMultiCollectionConfig() {
  const enabledCollections = collectionConfig.getEnabledCollectionNames();
  const vectorTypes = vectorTypeRegistry.getAllVectorTypes();

  return {
    enabledCollections,
    vectorTypes: vectorTypes.map((vt) => vt.name),
    collectionConfigs: enabledCollections.map((name) =>
      collectionConfig.getCollectionByName(name)
    ),
    availableStrategies: [
      'multi-collection-hybrid', // Search across all relevant collections
      'identity-focused', // Focus on tools collection for tool identity
      'capability-focused', // Focus on functionality collection
      'usecase-focused', // Focus on usecases collection
      'technical-focused', // Focus on interface collection
      'adaptive-weighted', // Dynamically weight collections based on query
    ],
  };
}

/**
 * Generate dynamic system prompt with multi-collection configuration
 */
function generateDynamicSystemPrompt(): string {
  const multiCollectionConfig = getMultiCollectionConfig();
  const enabledCollections = multiCollectionConfig.enabledCollections;

  return `
You are an AI Retrieval Planner for an advanced multi-collection search engine specialized in AI tools and technologies.

You receive a structured IntentState object that describes the user's goal, features, pricing, and comparison intent.

You must design an optimal QueryPlan JSON according to the schema that intelligently combines:
- Multi-collection vector-based similarity search (4 specialized Qdrant collections)
- Dynamic collection selection based on query analysis
- Metadata filtering (MongoDB)
- Optional reranking strategies

MULTI-COLLECTION ARCHITECTURE:
You have access to 4 specialized vector collections, each optimized for different search aspects:

1. "tools" - Identity Collection
   - Purpose: Core tool identification (name, description, tagline)
   - Best for: Tool discovery by name, basic descriptions
   - Weight: High for identity-focused queries
   - Content: name, description, longDescription, tagline

2. "functionality" - Capability Collection
   - Purpose: Tool features and capabilities
   - Best for: Functionality-specific searches, feature comparisons
   - Weight: High for capability-focused queries
   - Content: functionality, categories, capabilities

3. "usecases" - Use Case Collection
   - Purpose: Real-world applications and scenarios
   - Best for: Problem-solution matching, use case discovery
   - Weight: High for use case and scenario queries
   - Content: useCases, industry applications

4. "interface" - Technical Collection
   - Purpose: Technical specifications and deployment
   - Best for: Technical requirements, platform preferences
   - Weight: High for technical and deployment queries
   - Content: interface, deployment, technical specs

DYNAMIC COLLECTION SELECTION STRATEGY:

For "identity-focused" queries (tool names, basic discovery):
- Primary: "tools" (weight: 1.0)
- Secondary: "functionality" (weight: 0.3)

For "capability-focused" queries (features, functionality):
- Primary: "functionality" (weight: 1.0)
- Secondary: "tools" (weight: 0.6)
- Tertiary: "usecases" (weight: 0.4)

For "usecase-focused" queries (applications, scenarios):
- Primary: "usecases" (weight: 1.0)
- Secondary: "functionality" (weight: 0.7)
- Tertiary: "tools" (weight: 0.5)

For "technical-focused" queries (deployment, interface):
- Primary: "interface" (weight: 1.0)
- Secondary: "tools" (weight: 0.6)
- Tertiary: "functionality" (weight: 0.4)

For "multi-collection-hybrid" queries (complex, multi-faceted):
- Use all 4 collections with adaptive weighting
- Weights determined by query analysis and intent
- Apply RRF fusion for optimal result merging

For "adaptive-weighted" queries (unclear intent):
- Start with "tools" and "functionality" collections
- Dynamically expand based on initial results
- Use confidence-based collection expansion

QUERY PLANNING GUIDELINES:

1. Collection Selection:
   - Analyze query intent to determine primary collection focus
   - Use secondary collections for context and comprehensive results
   - Consider user's technical expertise level

2. Vector Source Strategy:
   - For comparison queries with referenceTool: use "reference_tool_embedding"
   - For discovery queries: use "query_text"
   - For semantic understanding: include "semantic_variant" when available

3. TopK Allocation:
   - Primary collections: topK 50-80
   - Secondary collections: topK 30-50
   - Total results before fusion: max 200

4. Filtering Strategy:
   - Apply MongoDB filters for constraints (pricing, platform, category)
   - Use structured fields for precise filtering
   - Combine with vector search for hybrid approach

5. Fusion Methods:
   - "rrf" for multi-source results (recommended)
   - "weighted_sum" for simpler 2-3 collection queries
   - "concat" when sources are non-overlapping

MongoDB Structured Fields (for filtering):
CRITICAL: You MUST use ONLY the exact values listed below. DO NOT create variations, synonyms, or modified versions of these values.

- "pricingModel" - EXACT values only: [${CONTROLLED_VOCABULARIES.pricingModels
      .map((p) => `"${p}"`)
      .join(', ')}]
- "categories" - EXACT values only: [${CONTROLLED_VOCABULARIES.categories
      .map((c) => `"${c}"`)
      .join(', ')}]
- "industries" - EXACT values only: [${CONTROLLED_VOCABULARIES.industries
      .map((i) => `"${i}"`)
      .join(', ')}]
- "userTypes" - EXACT values only: [${CONTROLLED_VOCABULARIES.userTypes
      .map((u) => `"${u}"`)
      .join(', ')}]
- "interface" - EXACT values only: [${CONTROLLED_VOCABULARIES.interface
      .map((i) => `"${i}"`)
      .join(', ')}]
- "functionality" - EXACT values only: [${CONTROLLED_VOCABULARIES.functionality
      .map((f) => `"${f}"`)
      .join(', ')}]
- "deployment" - EXACT values only: [${CONTROLLED_VOCABULARIES.deployment
      .map((d) => `"${d}"`)
      .join(', ')}]
- "status" - Tool status: "active" | "beta" | "deprecated" | "discontinued"
- "popularity" - Number for popularity filtering
- "rating" - Number for rating filtering

IMPORTANT FILTERING RULES:
1. Use ONLY the exact string values listed above - no variations, no synonyms, no modifications
2. If the intent mentions "CLI", use "CLI" for interface field, NOT for functionality field
3. Do not create compound terms like "CLI mode" - use only the exact controlled vocabulary values
4. If a concept doesn't match an exact controlled vocabulary value, do not create a filter for that field
5. Map intent concepts to the correct field: interface concepts go to interface, functionality concepts go to functionality

STRUCTURED FILTER FORMAT:
CRITICAL: When generating structuredSources, the "filters" field MUST be an array of filter objects, NOT a simple object.

Correct format example:
- collection: "tools"
- filters: [{"field": "interface", "operator": "in", "value": ["CLI"]}, {"field": "deployment", "operator": "in", "value": ["Self-Hosted"]}]
- topK: 70
- weight: 1

WRONG format (DO NOT USE):
- filters: {"interface": "CLI", "deployment": "Self-Hosted"}

Filter Object Structure:
- "field": The MongoDB field name (e.g., "interface", "deployment", "pricingModel")
- "operator": MongoDB operator (use "in" for array values, "=" for single values)
- "value": Array of values for in operator, or single value for "=" operator

Examples:
- Single value: {"field": "status", "operator": "=", "value": "active"}
- Multiple values: {"field": "interface", "operator": "in", "value": ["CLI", "Web"]}
- Array field: {"field": "categories", "operator": "in", "value": ["Development", "AI"]}

Always use the array format for filters in structuredSources!

Enhanced Strategy Types:
- "multi-collection-hybrid" - Use multiple specialized collections with intelligent weighting
- "identity-focused" - Tool identity discovery across collections
- "capability-focused" - Feature and capability matching
- "usecase-focused" - Use case and scenario discovery
- "technical-focused" - Technical requirements and deployment
- "adaptive-weighted" - Dynamic collection selection based on query analysis
- "hybrid" - Traditional hybrid vector + metadata (backward compatibility)
- "vector-only" - Pure vector similarity search
- "metadata-only" - Structured database queries only
- "semantic-kg" - Knowledge graph enhanced search

Fusion Methods:
- "rrf" - Reciprocal Rank Fusion (best for multi-collection)
- "weighted_sum" - Weighted score combination with collection weights
- "concat" - Simple concatenation (no fusion)
- "none" - No fusion needed

VECTOR TYPE CONFIGURATION:
CRITICAL: You MUST use ONLY the exact vector types listed below. DO NOT create variations or custom vector types.

Supported Vector Types:
- "semantic" - General semantic embeddings (default)
- "entities.categories" - Category-specific embeddings
- "entities.functionality" - Functionality-specific embeddings  
- "entities.interface" - Interface-specific embeddings
- "entities.industries" - Industry-specific embeddings
- "entities.userTypes" - User type-specific embeddings
- "entities.aliases" - Alias-specific embeddings
- "composites.toolType" - Tool type composite embeddings

VECTOR TYPE ASSIGNMENT RULES:
1. For "functionality" collection: use "entities.functionality"
2. For "interface" collection: use "entities.interface" 
3. For "tools" collection: use "semantic" (default)
4. For "usecases" collection: use "semantic" (default)
5. DO NOT use "entities.usecase" - this is NOT supported
6. When in doubt, use "semantic" as the default vector type

COLLECTION HEALTH CONSIDERATIONS:
Current enabled collections: [${enabledCollections.join(', ')}]
Always verify collection availability before including in plan.
If a collection is unavailable, fallback to available collections.

Do not exceed topK=200 for any single source.
Use appropriate collection weights based on query intent.
Provide clear explanation of multi-collection strategy.

Return ONLY a JSON object that follows the QueryPlan schema exactly. Do not provide any explanations or conversational text.
`;
}

/**
 * Validate and enhance query plan with multi-collection insights
 */
async function validateAndEnhanceQueryPlan(
  queryPlan: any,
  intentAnalysis: any,
  intentState: any
): Promise<any> {
  try {
    log('validating query plan received', {
      queryPlan: JSON.stringify(queryPlan),
    });

    // Validate collection availability
    const enabledCollections = collectionConfig.getEnabledCollectionNames();
    const validVectorSources =
      queryPlan.vectorSources?.filter((vs: any) =>
        enabledCollections.includes(vs.collection)
      ) || [];

    // Ensure primary collections are included
    const collectionsToInclude = new Set([
      ...intentAnalysis.primaryCollections,
      ...intentAnalysis.secondaryCollections,
      ...validVectorSources.map((vs: any) => vs.collection),
    ]);

    // Build enhanced vector sources with proper weights and topK values
    const enhancedVectorSources: any[] = [];

    for (const collectionName of Array.from(collectionsToInclude) as string[]) {
      if (!enabledCollections.includes(collectionName)) {
        log(`Skipping unavailable collection: ${collectionName}`);
        continue;
      }

      const isPrimary =
        intentAnalysis.primaryCollections.includes(collectionName);
      const isSecondary =
        intentAnalysis.secondaryCollections.includes(collectionName);

      // Determine appropriate topK based on collection priority
      let topK = 50; // default
      if (isPrimary) {
        topK = 70; // higher for primary collections
      } else if (isSecondary) {
        topK = 40; // lower for secondary collections
      }

      // Determine embedding type based on collection purpose
      let embeddingType = 'semantic';
      if (collectionName === 'functionality') {
        embeddingType = 'entities.functionality';
      }
      // else if (collectionName === 'usecases') {
      //   embeddingType = 'entities.usecase';
      // }

      enhancedVectorSources.push({
        collection: collectionName,
        embeddingType,
        queryVectorSource: intentState.referenceTool
          ? 'reference_tool_embedding'
          : 'query_text',
        topK: Math.min(topK, 200), // enforce max limit
      });
    }

    // Enhance fusion method for multi-collection
    let fusionMethod = queryPlan.fusion || 'rrf';
    if (enhancedVectorSources.length > 2) {
      fusionMethod = 'rrf'; // best for multiple collections
    } else if (enhancedVectorSources.length === 2) {
      fusionMethod = 'weighted_sum';
    }

    // Build enhanced structured sources if needed
    let enhancedStructuredSources = queryPlan.structuredSources || [];

    // Add MongoDB structured source for filtering if constraints exist
    const hasConstraints = intentState.priceRange || intentState.priceComparison;

    if (hasConstraints) {
      const filters: any[] = [];

      // Add price range filters
      if (intentState.priceRange) {
        const { min, max, billingPeriod } = intentState.priceRange;

        // Create base filter for pricing array
        const priceFilter: any = {
          field: 'pricing',
          operator: 'elemMatch',
          value: {},
        };

        // Add billing period filter if specified
        if (billingPeriod) {
          priceFilter.value.billingPeriod = billingPeriod;
        }

        // Add price range conditions
        if (min !== null && max !== null) {
          priceFilter.value.price = { $gte: min, $lte: max };
        } else if (min !== null) {
          priceFilter.value.price = { $gte: min };
        } else if (max !== null) {
          priceFilter.value.price = { $lte: max };
        }

        filters.push(priceFilter);
      }

      // Add price comparison filters
      if (intentState.priceComparison) {
        const { operator, value, billingPeriod } =
          intentState.priceComparison;

        const priceFilter: any = {
          field: 'pricing',
          operator: 'elemMatch',
          value: {},
        };

        // Add billing period filter if specified
        if (billingPeriod) {
          priceFilter.value.billingPeriod = billingPeriod;
        }

        // Add price comparison based on operator
        switch (operator) {
          case OPERATORS.LESS_THAN:
            priceFilter.value.price = { $lt: value };
            break;
          case OPERATORS.LESS_THAN_OR_EQUAL:
            priceFilter.value.price = { $lte: value };
            break;
          case OPERATORS.GREATER_THAN:
            priceFilter.value.price = { $gt: value };
            break;
          case OPERATORS.GREATER_THAN_OR_EQUAL:
            priceFilter.value.price = { $gte: value };
            break;
          case OPERATORS.EQUAL:
            priceFilter.value.price = value;
            break;
          case OPERATORS.NOT_EQUAL:
            priceFilter.value.price = { $ne: value };
            break;
          case OPERATORS.AROUND:
            // ±10% range for "around" operator
            const rangePercent = 0.1; // 10%
            const lowerBound = value * (1 - rangePercent);
            const upperBound = value * (1 + rangePercent);
            priceFilter.value.price = {
              $gte: Math.round(lowerBound),
              $lte: Math.round(upperBound),
            };
            break;
          case OPERATORS.BETWEEN:
            // BETWEEN should use priceRange instead, but handle gracefully
            priceFilter.value.price = { $gte: 0, $lte: value };
            break;
          default:
            // Unknown operator - log warning and use equality
            logError(`Unknown price comparison operator: ${operator}, using equality`);
            priceFilter.value.price = value;
            break;
        }

        filters.push(priceFilter);
      }

      if (filters.length > 0) {
        enhancedStructuredSources.push({
          source: 'mongodb',
          filters,
          limit: 100,
        });
      }
    }

    // Determine appropriate strategy based on collections and sources
    let strategy = queryPlan.strategy;
    if (enhancedVectorSources.length > 2) {
      strategy = 'multi-collection-hybrid';
    } else if (
      enhancedVectorSources.length > 0 &&
      enhancedStructuredSources.length > 0
    ) {
      strategy = 'hybrid';
    } else if (enhancedVectorSources.length > 0) {
      strategy = 'multi-vector';
    }

    // Calculate confidence based on multiple factors
    let confidence = queryPlan.confidence || 0.7;

    // Boost confidence if strategy matches analysis
    if (strategy === intentAnalysis.recommendedStrategy) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }

    // Adjust confidence based on collection coverage
    const collectionCoverage =
      intentAnalysis.primaryCollections.filter((coll) =>
        enhancedVectorSources.some((vs) => vs.collection === coll)
      ).length / intentAnalysis.primaryCollections.length;

    confidence = confidence * (0.7 + 0.3 * collectionCoverage);

    // Generate enhanced explanation
    const explanation = generateEnhancedExplanation(
      strategy,
      enhancedVectorSources,
      enhancedStructuredSources,
      intentAnalysis
    );

    log('Query plan enhanced with multi-collection validation', {
      originalCollections: queryPlan.vectorSources?.length || 0,
      enhancedCollections: enhancedVectorSources.length,
      strategy,
      confidence: confidence.toFixed(2),
      fusionMethod,
    });

    return {
      ...queryPlan,
      strategy,
      vectorSources: enhancedVectorSources,
      structuredSources: enhancedStructuredSources,
      fusion: fusionMethod,
      confidence: Math.round(confidence * 100) / 100,
      explanation,
    };
  } catch (error) {
    logError('Failed to enhance query plan', error);
    return queryPlan; // fallback to original plan
  }
}

/**
 * Generate enhanced explanation for multi-collection query plan
 */
function generateEnhancedExplanation(
  strategy: string,
  vectorSources: any[],
  structuredSources: any[],
  intentAnalysis: any
): string {
  const collections = vectorSources.map((vs) => vs.collection);
  const hasStructured = structuredSources.length > 0;

  let explanation = `Multi-collection search strategy: ${strategy}. `;

  if (collections.length > 0) {
    explanation += `Searching ${collections.length} specialized collection${collections.length > 1 ? 's' : ''
      }: `;
    explanation += collections.join(', ');
    explanation += '. ';
  }

  if (intentAnalysis.recommendedStrategy !== strategy) {
    explanation += `Adapted from recommended strategy (${intentAnalysis.recommendedStrategy}) based on query analysis. `;
  }

  if (hasStructured) {
    explanation +=
      'Combining with MongoDB structured filtering for precise constraints. ';
  }

  if (vectorSources.length > 2) {
    explanation +=
      'Using Reciprocal Rank Fusion (RRF) for optimal result merging across multiple collections.';
  } else if (vectorSources.length === 2) {
    explanation += 'Using weighted score fusion for result combination.';
  }

  return explanation.trim();
}

/**
 * Analyze query intent and recommend collection strategy
 */
function analyzeQueryIntent(intentState: any): {
  recommendedStrategy: string;
  primaryCollections: string[];
  secondaryCollections: string[];
  confidence: number;
  reasoning: string;
} {
  const primaryGoal = intentState.primaryGoal?.toLowerCase() || '';
  const features = intentState.desiredFeatures || [];
  const constraints = intentState.constraints || [];
  const hasReferenceTool = !!intentState.referenceTool;

  // Identity-focused queries
  if (
    primaryGoal.includes('find') ||
    primaryGoal.includes('discover') ||
    primaryGoal.includes('search') ||
    hasReferenceTool
  ) {
    return {
      recommendedStrategy: 'identity-focused',
      primaryCollections: ['tools'],
      secondaryCollections: ['functionality'], // TODO: remove it?
      confidence: 0.8,
      reasoning: 'Query focuses on tool identification and discovery',
    };
  }

  // Capability-focused queries
  if (
    features.length > 0 ||
    primaryGoal.includes('feature') ||
    primaryGoal.includes('capability') ||
    primaryGoal.includes('function')
  ) {
    return {
      recommendedStrategy: 'capability-focused',
      primaryCollections: ['functionality'],
      secondaryCollections: ['tools', 'usecases'],
      confidence: 0.85,
      reasoning: 'Query emphasizes specific features and capabilities',
    };
  }

  // Use case-focused queries
  if (
    primaryGoal.includes('use case') ||
    primaryGoal.includes('application') ||
    primaryGoal.includes('scenario') ||
    primaryGoal.includes('solve')
  ) {
    return {
      recommendedStrategy: 'usecase-focused',
      primaryCollections: ['usecases'],
      secondaryCollections: ['functionality', 'tools'],
      confidence: 0.9,
      reasoning: 'Query targets specific use cases and applications',
    };
  }

  // Technical-focused queries
  if (
    primaryGoal.includes('deployment') ||
    primaryGoal.includes('install') ||
    primaryGoal.includes('platform') ||
    primaryGoal.includes('technical')
  ) {
    return {
      recommendedStrategy: 'technical-focused',
      primaryCollections: ['interface'],
      secondaryCollections: ['tools', 'functionality'],
      confidence: 0.85,
      reasoning: 'Query focuses on technical requirements and deployment',
    };
  }

  // Complex multi-faceted queries
  if (
    features.length > 2 ||
    constraints.length > 2 ||
    (features.length > 0 && constraints.length > 0)
  ) {
    return {
      recommendedStrategy: 'multi-collection-hybrid',
      primaryCollections: ['tools', 'functionality'],
      secondaryCollections: ['usecases', 'interface'],
      confidence: 0.75,
      reasoning:
        'Complex query benefits from comprehensive multi-collection search',
    };
  }

  // Default to adaptive weighted
  return {
    recommendedStrategy: 'adaptive-weighted',
    primaryCollections: ['tools', 'functionality'],
    secondaryCollections: [],
    confidence: 0.6,
    reasoning: 'Query intent unclear, using adaptive approach',
  };
}

/**
 * QueryPlannerNode - LLM-based retrieval strategy planning with multi-collection support
 *
 * Input: IntentState JSON from state
 * Output: QueryPlan JSON with validated schema and multi-collection optimization
 */

export async function queryPlannerNode(
  state: typeof StateAnnotation.State
): Promise<Partial<typeof StateAnnotation.State>> {
  const { intentState } = state;

  if (!intentState) {
    logError('No intent state provided for query planning');
    return {
      executionPlan: null,
      errors: [
        ...(state.errors || []),
        {
          node: 'query-planner',
          error: new Error('No intent state provided for query planning'),
          timestamp: new Date(),
          recovered: false,
        },
      ],
    };
  }

  const startTime = Date.now();

  // Analyze query intent for multi-collection strategy
  const intentAnalysis = analyzeQueryIntent(intentState);

  log('Starting multi-collection query planning', {
    intentState,
    intentAnalysis,
  });

  try {
    // Get dynamic system prompt with current multi-collection configuration
    const systemPrompt = generateDynamicSystemPrompt();

    // Create enhanced user prompt with intent context and analysis
    const userPrompt = `
Create an optimal multi-collection query plan for this intent:

${JSON.stringify(intentState, null, 2)}

QUERY INTENT ANALYSIS:
- Recommended Strategy: ${intentAnalysis.recommendedStrategy}
- Reasoning: ${intentAnalysis.reasoning}
- Confidence: ${intentAnalysis.confidence}
- Primary Collections: ${intentAnalysis.primaryCollections.join(', ')}

CONTEXT CONSIDERATIONS:
- Primary goal: ${intentState.primaryGoal}
- Reference tool: ${intentState.referenceTool || 'None'}
- Comparison mode: ${intentState.comparisonMode || 'None'}
- Category preference: ${intentState.category || 'None'}
- Interface preference: ${intentState.interface || 'None'}
- Functionality preference: ${intentState.functionality || 'None'}
- Deployment preference: ${intentState.deployment || 'None'}
- Industry preference: ${intentState.industry || 'None'}
- User type preference: ${intentState.userType || 'None'}
- Pricing constraint: ${intentState.pricing || 'None'}


MULTI-COLLECTION GUIDELINES:
1. Use the recommended strategy (${intentAnalysis.recommendedStrategy
      }) as primary guidance
2. Include primary collections with higher topK values (10-20)
3. Apply appropriate collection weights based on query intent
4. Use "rrf" fusion for multi-collection results
5. Include MongoDB structured sources for filtering constraints

MongoDB Structured Sources Usage:
- Use "mongodb" as structuredSource when intentState has ANY of these:
  * category preference 
  * interface preference 
  * functionality preference
  * deployment preference
  * industry preference
  * user type preference
  * pricing constraint 
  * And any other specific features that map to MongoDB fields

- For hybrid strategy, ALWAYS include both vectorSources AND structuredSources
- Set appropriate MongoDB filters for structuredSources based on intentState constraints

Respond with a JSON object only, following the QueryPlan schema exactly.
`;

    log('Sending request to LLM with multi-collection configuration', {
      promptLength: userPrompt.length,
      systemPromptLength: systemPrompt.length,
      recommendedStrategy: intentAnalysis.recommendedStrategy,
    });

    // Create LangChain client with structured output using LLM service
    const llmClient =
      llmService.createTogetherAILangchainClient();

    log('Sending request to Together AI for query planning', {
      taskType: 'query-planner',
      model: 'openai/gpt-oss-20b via Together API',
    });

    const parser = new JsonOutputParser();
    // Call the LLM with dynamic structured output
    const queryPlan = await llmClient.invoke({
      system_prompt: systemPrompt,
      format_instructions: parser.getFormatInstructions(),
      query: userPrompt,
    });

    // Validate and enhance query plan with multi-collection insights
    const enhancedQueryPlan = await validateAndEnhanceQueryPlan(
      queryPlan,
      intentAnalysis,
      intentState
    );

    log('Multi-collection query plan generated and validated', {
      ...enhancedQueryPlan,
      executionTime: Date.now() - startTime,
    });

    return {
      executionPlan: enhancedQueryPlan,
      executionStats: {
        ...state.executionStats,
        nodeTimings: {
          ...state.executionStats?.nodeTimings,
          'query-planner': Date.now() - startTime,
        },
      },
      metadata: {
        ...state.metadata,
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'query-planner',
        ],
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'query-planner': Date.now() - startTime,
        },
      },
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logError('Query planning failed', {
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    });

    return {
      executionPlan: null,
      errors: [
        ...(state.errors || []),
        {
          node: 'query-planner',
          error:
            error instanceof Error
              ? error
              : new Error('Unknown error in query planning'),
          timestamp: new Date(),
          recovered: false,
          recoveryStrategy:
            'Failed to create query plan - pipeline cannot continue',
        },
      ],
      executionStats: {
        ...state.executionStats,
        nodeTimings: {
          ...state.executionStats?.nodeTimings,
          'query-planner': executionTime,
        },
      },
      metadata: {
        ...state.metadata,
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'query-planner',
        ],
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'query-planner': executionTime,
        },
      },
    };
  }
}
