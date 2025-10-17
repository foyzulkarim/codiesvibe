import { EnhancedState } from "@/types/enhanced-state";
import { localNLPService } from "@/services/local-nlp.service";

/**
 * Local NLP Processing Node for AI Search Enhancement v2.0
 * 
 * This node performs local NLP processing using transformers.js,
 * extracts entities, intent, and vocabulary candidates,
 * and updates the state with NLP results.
 */
export async function localNLPProcessingNode(state: EnhancedState): Promise<Partial<EnhancedState>> {
  const startTime = Date.now();
  
  console.log('localNLPProcessingNode(): Starting local NLP processing', {
    query: state.query
  });

  try {
    // Extract query from state
    const query = state.query || '';
    
    if (!query) {
      throw new Error('No query found in state for local NLP processing');
    }

    // Perform local NLP processing using the service
    const nlpResults = await localNLPService.processText(query, {
      extractEntities: true,
      classifyIntent: true,
      extractVocabulary: true
    });

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Update metadata with execution information
    const updatedMetadata = {
      ...state.metadata,
      nodeExecutionTimes: {
        ...state.metadata?.nodeExecutionTimes,
        'local-nlp-processing': executionTime
      },
      executionPath: [
        ...(state.metadata?.executionPath || []),
        'local-nlp-processing'
      ]
    };

    console.log('localNLPProcessingNode(): Completed successfully', {
      executionTime,
      entitiesCount: nlpResults.entities?.length || 0,
      intent: nlpResults.intent?.label,
      processingStrategy: nlpResults.processingStrategy
    });

    // Return the enhanced state with NLP results
    return {
      nlpResults,
      metadata: updatedMetadata
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    console.error('localNLPProcessingNode(): Error during local NLP processing', {
      error: error instanceof Error ? error.message : String(error),
      executionTime,
      fallingBack: true
    });

    // Fallback to minimal NLP processing
    try {
      console.log('localNLPProcessingNode(): Attempting fallback to minimal processing');
      
      const query = state.query || '';
      if (!query) {
        throw new Error('No query found in state for fallback processing');
      }

      // Create minimal NLP results
      const fallbackResults = {
        entities: [],
        intent: {
          label: 'search',
          confidence: 0.5
        },
        vocabularyCandidates: {},
        processingStrategy: 'minimal' as const,
        processingTime: executionTime,
        modelUsed: 'fallback'
      };

      // Update metadata with fallback information
      const updatedMetadata = {
        ...state.metadata,
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'local-nlp-processing': executionTime
        },
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'local-nlp-processing-fallback'
        ],
        fallbackUsed: 'minimal-processing',
        fallbackReason: error instanceof Error ? error.message : String(error)
      };

      console.log('localNLPProcessingNode(): Fallback completed successfully', {
        executionTime,
        processingStrategy: fallbackResults.processingStrategy
      });

      return {
        nlpResults: fallbackResults as any,
        metadata: updatedMetadata
      };

    } catch (fallbackError) {
      console.error('localNLPProcessingNode(): Fallback also failed', {
        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      });

      // Even fallback failed, return empty state with error information
      const updatedMetadata = {
        ...state.metadata,
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'local-nlp-processing': executionTime
        },
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'local-nlp-processing-error'
        ],
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        fallbackFailed: true
      };

      return {
        nlpResults: {
          entities: [],
          intent: {
            label: 'unknown',
            confidence: 0
          },
          vocabularyCandidates: {},
          processingStrategy: 'llm_fallback' as const,
          processingTime: executionTime,
          modelUsed: 'none'
        },
        metadata: updatedMetadata
      };
    }
  }
}
