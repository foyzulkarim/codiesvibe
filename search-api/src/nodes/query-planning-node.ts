import { EnhancedState } from "@/types/enhanced-state";

/**
 * Query Planning Node for AI Search Enhancement v2.0
 * 
 * This node creates an execution plan based on the NLP results and context,
 * determines the optimal search strategy, and updates the state with the plan.
 */
export async function queryPlanningNode(state: EnhancedState): Promise<Partial<EnhancedState>> {
  const startTime = Date.now();
  
  console.log('queryPlanningNode(): Starting query planning', {
    query: state.query,
    hasNLPResults: !!state.nlpResults,
    hasContextEnrichment: !!state.entityStatistics
  });

  try {
    // Extract query and analysis results from state
    const query = state.query || '';
    const nlpResults = state.nlpResults;
    const entityStatistics = state.entityStatistics;
    
    if (!query) {
      throw new Error('No query found in state for query planning');
    }

    // Create execution plan based on analysis
    const executionPlan = {
      semantic_understanding: {
        intent: nlpResults?.intent?.label || 'exploration',
        constraints: {},
        comparisons: [],
        price_sentiment: 'neutral',
        domain: 'general',
        assumptions: [
          'User is looking for relevant tools',
          'Standard search capabilities are sufficient'
        ],
        confidence_level: nlpResults?.intent?.confidence || 0.5,
        contextualEvidence: []
      },
      execution_plan: [
        {
          stage: 'multi-vector-search',
          tool: 'multiVectorSearchService',
          params: {
            query,
            vectorTypes: ['semantic', 'categories', 'functionality'],
            limit: 20
          },
          reason: 'Perform comprehensive multi-vector search',
          optional: false,
          estimatedTime: 200
        },
        {
          stage: 'result-merging',
          tool: 'resultMergerService',
          params: {
            mergeStrategy: 'reciprocal_rank_fusion',
            enableDeduplication: true
          },
          reason: 'Merge and deduplicate results from multiple sources',
          optional: false,
          estimatedTime: 50
        }
      ],
      adaptive_routing: {
        enabled: true,
        routing_decisions: [
          {
            node: 'query-planning',
            decision: 'standard_execution',
            reasoning: 'Standard multi-vector search is appropriate for this query',
            timestamp: new Date()
          }
        ]
      }
    };

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Update metadata with execution information
    const updatedMetadata = {
      ...state.metadata,
      nodeExecutionTimes: {
        ...state.metadata?.nodeExecutionTimes,
        'query-planning': executionTime
      },
      executionPath: [
        ...(state.metadata?.executionPath || []),
        'query-planning'
      ]
    };

    console.log('queryPlanningNode(): Completed successfully', {
      executionTime,
      planStages: executionPlan.execution_plan.length,
      intent: executionPlan.semantic_understanding.intent
    });

    // Return the enhanced state with execution plan
    return {
      executionPlan,
      metadata: updatedMetadata
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    console.error('queryPlanningNode(): Error during query planning', {
      error: error instanceof Error ? error.message : String(error),
      executionTime
    });

    // Fallback to minimal execution plan
    try {
      console.log('queryPlanningNode(): Attempting fallback to minimal planning');
      
      const query = state.query || '';
      if (!query) {
        throw new Error('No query found in state for fallback planning');
      }

      // Create minimal execution plan
      const fallbackPlan = {
        semantic_understanding: {
          intent: 'exploration',
          constraints: {},
          comparisons: [],
          price_sentiment: 'neutral',
          domain: 'general',
          assumptions: ['Fallback planning due to error'],
          confidence_level: 0.3,
          contextualEvidence: []
        },
        execution_plan: [
          {
            stage: 'multi-vector-search',
            tool: 'multiVectorSearchService',
            params: {
              query,
              vectorTypes: ['semantic'],
              limit: 10
            },
            reason: 'Fallback to basic semantic search',
            optional: false,
            estimatedTime: 100
          }
        ],
        adaptive_routing: {
          enabled: false,
          routing_decisions: [
            {
              node: 'query-planning',
              decision: 'fallback_execution',
              reasoning: `Error in query planning: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date()
            }
          ]
        }
      };

      // Update metadata with fallback information
      const updatedMetadata = {
        ...state.metadata,
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'query-planning': executionTime
        },
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'query-planning-fallback'
        ],
        fallbackUsed: 'minimal-planning',
        fallbackReason: error instanceof Error ? error.message : String(error)
      };

      console.log('queryPlanningNode(): Fallback completed successfully', {
        executionTime,
        planStages: fallbackPlan.execution_plan.length
      });

      return {
        executionPlan: fallbackPlan,
        metadata: updatedMetadata
      };

    } catch (fallbackError) {
      console.error('queryPlanningNode(): Fallback also failed', {
        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      });

      // Even fallback failed, return empty plan with error information
      const updatedMetadata = {
        ...state.metadata,
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'query-planning': executionTime
        },
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'query-planning-error'
        ],
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        fallbackFailed: true
      };

      return {
        executionPlan: {
          semantic_understanding: {
            intent: 'error',
            constraints: {},
            comparisons: [],
            price_sentiment: 'neutral',
            domain: 'general',
            assumptions: ['Planning failed completely'],
            confidence_level: 0,
            contextualEvidence: []
          },
          execution_plan: [],
          adaptive_routing: {
            enabled: false,
            routing_decisions: []
          }
        },
        metadata: updatedMetadata
      };
    }
  }
}
