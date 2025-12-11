import { JsonOutputParser } from '@langchain/core/output_parsers';

import { StateAnnotation } from '../../types/state.js';
import { QueryPlanSchema, QueryPlan } from '../../types/query-plan.js';
import { IntentState } from '../../types/intent-state.js';
import { llmService } from '../../services/llm/llm.service.js';
import { generateQueryPlanningPrompt } from '../../core/prompts/prompt.generator.js';
import {
  getEnabledCollections,
  getRecommendedEmbeddingType,
  getRecommendedTopK,
  getRecommendedFusionMethod
} from '../../domains/tools/tools.validators.js';
// Keep these services for now - they provide collection orchestration
import { QdrantCollectionConfigService } from '../../services/database/qdrant-collection-config.service.js';
import { VectorTypeRegistryService } from '../../services/embedding/vector-type-registry.service.js';
import { MultiCollectionOrchestrator } from '../../services/search/multi-collection-orchestrator.service.js';
import { ContentGeneratorFactory } from '../../services/embedding/content-generator-factory.service.js';
import { CONFIG } from '#config/env.config';
import type { LogMetadata } from '#types/logger.types.js';
import type { DomainSchema } from '#core/types/schema.types.js';

// Local types for intent analysis
interface IntentAnalysisResult {
  recommendedStrategy: string;
  primaryCollections: string[];
  secondaryCollections: string[];
  confidence: number;
  reasoning: string;
}

// Configuration for logging
const LOG_CONFIG = {
  enabled: !CONFIG.env.IS_PRODUCTION,
  prefix: '🗺️ Query Planner:',
};

// Initialize multi-collection services
const collectionConfig = new QdrantCollectionConfigService();
const vectorTypeRegistry = new VectorTypeRegistryService(collectionConfig);
const contentFactory = new ContentGeneratorFactory(collectionConfig);
const multiCollectionOrchestrator = new MultiCollectionOrchestrator(
  collectionConfig,
  vectorTypeRegistry,
  contentFactory
);

// Helper function for conditional logging
const log = (message: string, data?: LogMetadata) => {
  if (LOG_CONFIG.enabled) {
    console.log(`${LOG_CONFIG.prefix} ${message}`, data ? data : '');
  }
};

const logError = (message: string, error?: LogMetadata) => {
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
 * Generate schema-driven system prompt for query planning
 * Now uses generateQueryPlanningPrompt from prompt generator
 */
function generateDynamicSystemPrompt(schema: DomainSchema, enabledCollections?: string[]): string {
  return generateQueryPlanningPrompt(schema, enabledCollections);
}

/**
 * Validate and enhance query plan with schema and domain handlers
 * Now uses domain-specific filter building from domainHandlers
 */
async function validateAndEnhanceQueryPlan(
  queryPlan: QueryPlan,
  intentAnalysis: IntentAnalysisResult,
  intentState: IntentState,
  schema: DomainSchema,
  domainHandlers: {
    buildFilters: (intentState: IntentState) => Array<{ field: string; operator: string; value: unknown }>;
    validateQueryPlan: (plan: QueryPlan, intentState: IntentState) => { valid: boolean; errors: string[]; warnings: string[] };
  }
): Promise<QueryPlan> {
  try {
    log('validating query plan received', {
      queryPlan: JSON.stringify(queryPlan),
    });

    // Validate collection availability using schema
    const enabledCollections = getEnabledCollections(schema);
    const validVectorSources =
      queryPlan.vectorSources?.filter((vs) =>
        enabledCollections.includes(vs.collection)
      ) || [];

    log('Validated vector sources against schema', {
      totalSources: queryPlan.vectorSources?.length || 0,
      validSources: validVectorSources.length,
      enabledCollections,
    });

    // Ensure primary collections are included
    const collectionsToInclude = new Set([
      ...intentAnalysis.primaryCollections,
      ...intentAnalysis.secondaryCollections,
      ...validVectorSources.map((vs) => vs.collection),
    ]);

    // Build enhanced vector sources with proper weights and topK values
    const enhancedVectorSources: NonNullable<QueryPlan['vectorSources']> = [];

    for (const collectionName of Array.from(collectionsToInclude) as string[]) {
      if (!enabledCollections.includes(collectionName)) {
        log(`Skipping unavailable collection: ${collectionName}`);
        continue;
      }

      const isPrimary =
        intentAnalysis.primaryCollections.includes(collectionName);
      const isSecondary =
        intentAnalysis.secondaryCollections.includes(collectionName);

      // Determine appropriate topK based on collection priority using validator
      const topK = getRecommendedTopK(isPrimary, isSecondary);

      // Determine embedding type based on collection using validator
      const embeddingType = getRecommendedEmbeddingType(collectionName);

      enhancedVectorSources.push({
        collection: collectionName,
        embeddingType,
        queryVectorSource: intentState.referenceTool
          ? 'reference_tool_embedding'
          : 'query_text',
        topK: Math.min(topK, 200), // enforce max limit
      });
    }

    // Enhance fusion method using domain validator
    let fusionMethod: QueryPlan['fusion'] = queryPlan.fusion || (getRecommendedFusionMethod(enhancedVectorSources.length) as QueryPlan['fusion']);

    // Build enhanced structured sources using domain-specific filter builder
    let enhancedStructuredSources = queryPlan.structuredSources || [];

    // Use domain handler to build filters from intent state
    const filters = domainHandlers.buildFilters(intentState);

    log('Built filters using domain handler', {
      filtersCount: filters.length,
      filters: filters.map(f => ({ field: f.field, operator: f.operator })),
    });

    if (filters.length > 0) {
      enhancedStructuredSources.push({
        source: 'mongodb',
        filters,
        limit: 100,
      });
    }

    // Determine appropriate strategy based on collections and sources
    let strategy: QueryPlan['strategy'] = queryPlan.strategy;
    if (enhancedVectorSources.length > 2) {
      // multi-collection-hybrid is not in the enum, fallback to multi-vector
      strategy = 'multi-vector';
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
  vectorSources: NonNullable<QueryPlan['vectorSources']>,
  structuredSources: NonNullable<QueryPlan['structuredSources']>,
  intentAnalysis: IntentAnalysisResult
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
function analyzeQueryIntent(intentState: IntentState): IntentAnalysisResult {
  const primaryGoal = intentState.primaryGoal?.toLowerCase() || '';
  // Note: desiredFeatures and constraints are in schema but not IntentState type
  const features = (intentState as Record<string, unknown>).desiredFeatures as string[] || [];
  const constraints = (intentState as Record<string, unknown>).constraints as string[] || [];
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
  const { intentState, schema, domainHandlers } = state;

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

  log('Starting schema-driven query planning', {
    schemaName: schema.name,
    schemaVersion: schema.version,
    intentState,
    intentAnalysis,
  });

  try {
    // Get enabled collections from schema
    const enabledCollections = getEnabledCollections(schema);

    // Generate system prompt from schema
    const systemPrompt = generateDynamicSystemPrompt(schema, enabledCollections);

    log('Generated query planning prompt from schema', {
      promptLength: systemPrompt.length,
      enabledCollections,
    });

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

    // Validate and enhance query plan with schema and domain handlers
    const enhancedQueryPlan = await validateAndEnhanceQueryPlan(
      queryPlan,
      intentAnalysis,
      intentState,
      schema,
      domainHandlers
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
