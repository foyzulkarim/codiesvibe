import { StateAnnotation } from '../../types/state';
import { QueryPlan, QueryPlanSchema } from '../../types/query-plan';
import { vllmConfig } from '../../config/models';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';

// Configuration for logging
const LOG_CONFIG = {
  enabled: process.env.NODE_ENV !== 'production',
  prefix: '🗺️ Query Planner:',
};

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
 * System prompt for query planning
 */
const QUERY_PLANNING_SYSTEM_PROMPT = `
You are an AI Retrieval Planner for an agentic search engine specialized in AI tools and technologies.

You receive a structured IntentState object that describes the user's goal, features, pricing, and comparison intent.

You must design an optimal QueryPlan JSON according to the schema that combines:
- Vector-based similarity search (Qdrant collections)
- Metadata filtering (MongoDB)
- Optional reranking strategies

Guidelines:
1. For comparison queries with referenceTool, use "reference_tool_embedding" as queryVectorSource
2. For simple discovery, use "query_text" as queryVectorSource
3. Include semantic_variant sources when available
4. Apply structured filters for pricing, platform, category constraints
5. Use "hybrid" strategy for most queries
6. Set appropriate topK values (30-100 for vector, 50-100 for structured)
7. Choose fusion method: "rrf" for multi-source, "weighted_sum" for simpler cases
8. Provide clear explanation of the strategy
9. Set confidence based on intent clarity and strategy appropriateness

Available Collections:
- "tools" - Main vector collection for tool embeddings
- "descriptions" - Collection for tool description embeddings
- "features" - Collection for feature-specific embeddings

MongoDB Structured Fields (for filtering):
- "pricingModel" - Array of pricing models: ["free", "freemium", "paid"]
- "categories" - Array of tool categories (1-5 entries)
- "industries" - Array of industry verticals (1-10 entries)
- "userTypes" - Array of target user types (1-10 entries)
- "toolTypes" - Array of tool classifications (1-10 entries)
- "domains" - Array of operational domains (1-15 entries)
- "capabilities" - Array of tool capabilities (1-20 entries)
- "commonUseCases" - Array of common use cases (1-15 entries)
- "interface" - Array of interface types
- "functionality" - Array of functionality types
- "deployment" - Array of deployment types
- "status" - Tool status: "active" | "beta" | "deprecated" | "discontinued"
- "popularity" - Numeric popularity score
- "rating" - Numeric rating (0-5)
- "hasFreeTier" - Boolean indicating free tier availability
- "hasCustomPricing" - Boolean indicating custom pricing support

Strategy Types:
- "hybrid" - Combine vector search with metadata filtering (most common)
- "multi-vector" - Search multiple vector collections
- "vector-only" - Pure vector similarity search
- "metadata-only" - Structured database queries only
- "semantic-kg" - Knowledge graph enhanced search

Fusion Methods:
- "rrf" - Reciprocal Rank Fusion (best for multi-source)
- "weighted_sum" - Weighted score combination
- "concat" - Simple concatenation (no fusion)
- "none" - No fusion needed

Do not exceed topK=200 for any source.

Return ONLY a JSON object that follows the QueryPlan schema exactly. Do not provide any explanations or conversational text.
`;

/**
 * QueryPlannerNode - LLM-based retrieval strategy planning
 *
 * Input: IntentState JSON from state
 * Output: QueryPlan JSON with validated schema
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
          node: "query-planner",
          error: new Error("No intent state provided for query planning"),
          timestamp: new Date(),
          recovered: false
        }
      ]
    };
  }

  const startTime = Date.now();
  log('Starting query planning', {
    primaryGoal: intentState.primaryGoal,
    hasReferenceTool: !!intentState.referenceTool,
    constraintsCount: intentState.constraints?.length || 0
  });

  try {
    // Create the user prompt with intent context
    const userPrompt = `
Create an optimal query plan for this intent:

${JSON.stringify(intentState, null, 2)}

Consider:
- Primary goal: ${intentState.primaryGoal}
- Reference tool: ${intentState.referenceTool || 'None'}
- Comparison mode: ${intentState.comparisonMode || 'None'}
- Pricing constraint: ${intentState.pricing || 'None'}
- Platform preference: ${intentState.platform || 'None'}
- Category preference: ${intentState.category || 'None'}
- Features requested: ${intentState.desiredFeatures?.join(', ') || 'None'}
- Constraints: ${intentState.constraints?.join(', ') || 'None'}
- Semantic variants available: ${intentState.semanticVariants?.length || 0}

MongoDB Structured Sources Usage:
- Use "mongodb" as structuredSource when intentState has ANY of these:
  * pricing constraint (free/freemium/paid)
  * platform preference (web/desktop/cli/api)
  * category preference (IDE/API/CLI/Framework/Agent/Plugin)
  * specific features that map to MongoDB fields
- For hybrid strategy, ALWAYS include both vectorSources AND structuredSources
- Set appropriate MongoDB filters based on intentState constraints

Respond with a JSON object only, following the QueryPlan schema exactly.
`;

    log('Sending request to LLM', {
      promptLength: userPrompt.length,
      intentComplexity: intentState.constraints?.length || 0 + intentState.desiredFeatures?.length || 0
    });

    // Create LangChain client with structured output
    const llmWithStructuredOutput = new ChatOpenAI({
      modelName: vllmConfig.model,
      apiKey: "not-needed",
      configuration: {
        baseURL: `${vllmConfig.baseUrl}/v1`
      }
    }).withStructuredOutput<z.infer<typeof QueryPlanSchema>>(
      QueryPlanSchema,
      {
        name: "query_plan_generator",
      }
    );

    // Call the LLM with structured output
    const queryPlan = await llmWithStructuredOutput.invoke([
      { role: 'system', content: QUERY_PLANNING_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]);

    // raw queryPlan log 
    log('Raw query plan generated', {
      plan: JSON.stringify(queryPlan)
    });

    log('Query plan generated successfully', {
      strategy: queryPlan.strategy,
      vectorSourcesCount: queryPlan.vectorSources?.length || 0,
      structuredSourcesCount: queryPlan.structuredSources?.length || 0,
      fusionMethod: queryPlan.fusion || 'none',
      confidence: queryPlan.confidence
    });
    const executionTime = Date.now() - startTime;

    log('Query planning completed successfully', {
      strategy: queryPlan.strategy,
      vectorSourcesCount: queryPlan.vectorSources?.length || 0,
      structuredSourcesCount: queryPlan.structuredSources?.length || 0,
      fusionMethod: queryPlan.fusion || 'none',
      confidence: queryPlan.confidence,
      executionTime
    });

    return {
      executionPlan: queryPlan,
      executionStats: {
        ...state.executionStats,
        nodeTimings: {
          ...state.executionStats?.nodeTimings,
          "query-planner": executionTime
        }
      },
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "query-planner"],
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          "query-planner": executionTime
        }
      }
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logError('Query planning failed', {
      error: error instanceof Error ? error.message : String(error),
      executionTime
    });

    return {
      executionPlan: null,
      errors: [
        ...(state.errors || []),
        {
          node: "query-planner",
          error: error instanceof Error ? error : new Error("Unknown error in query planning"),
          timestamp: new Date(),
          recovered: false,
          recoveryStrategy: "Failed to create query plan - pipeline cannot continue"
        }
      ],
      executionStats: {
        ...state.executionStats,
        nodeTimings: {
          ...state.executionStats?.nodeTimings,
          "query-planner": executionTime
        }
      },
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "query-planner"],
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          "query-planner": executionTime
        }
      }
    };
  }
}