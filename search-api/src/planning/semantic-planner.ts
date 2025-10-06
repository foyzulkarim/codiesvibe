/**
 * Semantic Planner
 *
 * Uses the new semantic analysis tools to create targeted search plans.
 * This planner specializes in handling multi-intent queries by decomposing them
 * and using field-specific search strategies.
 */

import { QueryContext, AgentState, LLMPlan } from '../types';
import { queryDecomposer } from '../tools/queryDecomposer';
import { selectFieldsFromComponents } from '../tools/intentBasedFieldSelector';
import { multiFieldKeywordSearch } from '../tools/multiFieldKeywordSearch';
import { getOriginalDataset } from '../data/loader';

export interface SemanticPlanningResult {
  plan: LLMPlan;
  reasoning: string;
  confidence: number;
  metadata: {
    decompositionTime: number;
    fieldSelectionTime: number;
    searchExecutionTime: number;
    totalPlanningTime: number;
    componentCount: number;
    selectedFieldCount: number;
    strategy: 'semantic_decomposition' | 'fallback';
  };
}

/**
 * Create a semantic plan for multi-intent queries
 */
export class SemanticPlanner {
  /**
   * Generate a plan using semantic analysis tools
   */
  static async generateSemanticPlan(
    context: QueryContext,
    state: AgentState,
    availableTools: string[]
  ): Promise<SemanticPlanningResult> {
    const startTime = Date.now();

    try {
      console.log(`🔥 SEMANTIC PLANNER: Starting semantic analysis for "${context.originalQuery}"`);

      // Step 1: Decompose the query
      const decompositionStart = Date.now();
      const decompositionResult = await queryDecomposer(
        {
          query: context.originalQuery,
          minConfidence: 0.3,
          maxComponents: 5,
          includeContext: true
        },
        {}
      );

      if (!decompositionResult.success || !decompositionResult.data) {
        console.warn(`🔥 SEMANTIC PLANNER: Query decomposition failed, using fallback`);
        return this.createFallbackPlan(context, startTime);
      }

      const decompositionTime = Date.now() - decompositionStart;
      const decomposition = decompositionResult.data;

      console.log(`🔥 SEMANTIC PLANNER: Decomposed into ${decomposition.components.length} components`);
      console.log(`🔥 SEMANTIC PLANNER: Primary intent: ${decomposition.primaryIntent}`);
      console.log(`🔥 SEMANTIC PLANNER: Complexity: ${decomposition.complexity}`);

      // Step 2: Select optimal fields for the components
      const fieldSelectionStart = Date.now();
      const fieldSelectionResult = await selectFieldsFromComponents(
        {
          components: decomposition.components,
          originalQuery: context.originalQuery,
          maxFields: 8,
          minWeight: 0.3
        },
        {}
      );

      if (!fieldSelectionResult.success || !fieldSelectionResult.data) {
        console.warn(`🔥 SEMANTIC PLANNER: Field selection failed, using fallback`);
        return this.createFallbackPlan(context, startTime);
      }

      const fieldSelectionTime = Date.now() - fieldSelectionStart;
      const fieldSelection = fieldSelectionResult.data;

      console.log(`🔥 SEMANTIC PLANNER: Selected ${fieldSelection.selectedFields.length} fields`);
      console.log(`🔥 SEMANTIC PLANNER: Strategy: ${fieldSelection.strategy}`);

      // Step 3: Create the semantic plan
      const plan = this.createSemanticPlan(context, decomposition, fieldSelection, availableTools);

      // Step 4: Calculate confidence and reasoning
      const confidence = this.calculateSemanticConfidence(decomposition, fieldSelection);
      const reasoning = this.generateSemanticReasoning(context, decomposition, fieldSelection);

      const totalPlanningTime = Date.now() - startTime;

      const result: SemanticPlanningResult = {
        plan,
        reasoning,
        confidence,
        metadata: {
          decompositionTime,
          fieldSelectionTime,
          searchExecutionTime: 0, // Will be populated during execution
          totalPlanningTime,
          componentCount: decomposition.components.length,
          selectedFieldCount: fieldSelection.selectedFields.length,
          strategy: 'semantic_decomposition'
        }
      };

      console.log(`🔥 SEMANTIC PLANNER: Semantic plan created with confidence ${confidence.toFixed(2)}`);
      console.log(`🔥 SEMANTIC PLANNER: Planning completed in ${totalPlanningTime}ms`);

      return result;

    } catch (error) {
      console.error(`🔥 SEMANTIC PLANNER: Error during semantic planning:`, error);
      return this.createFallbackPlan(context, startTime);
    }
  }

  /**
   * Create a semantic plan based on analysis results
   */
  private static createSemanticPlan(
    context: QueryContext,
    decomposition: any,
    fieldSelection: any,
    availableTools: string[]
  ): LLMPlan {
    // Check if multi-field keyword search is available
    const hasMultiFieldSearch = availableTools.includes('multiFieldKeywordSearch');

    if (hasMultiFieldSearch && fieldSelection.selectedFields.length > 0) {
      // Use the new multi-field search tool
      return {
        tool: 'multiFieldKeywordSearch',
        parameters: {
          query: context.originalQuery,
          fieldMappings: fieldSelection.selectedFields,
          maxResults: 50,
          minScore: 0.1,
          includeHighlights: true,
          boostFieldMatches: true
        },
        reasoning: `Using semantic decomposition to search ${decomposition.components.length} query components across ${fieldSelection.selectedFields.length} optimal fields`,
        confidence: Math.min(decomposition.confidence, fieldSelection.confidence),
        expectedOutcome: `Targeted search results with semantic field mapping for better relevance`,
        riskFactors: [
          'Semantic analysis depends on field mapping accuracy',
          'Multi-field search may be slower than single-field search'
        ],
        estimatedTime: 4000 + (fieldSelection.selectedFields.length * 200)
      };
    } else {
      // Fallback to enhanced text search
      const fields = fieldSelection.selectedFields.length > 0
        ? fieldSelection.selectedFields.map((f: any) => f.fieldPath).slice(0, 3)
        : ['name', 'description'];

      return {
        tool: 'searchByText',
        parameters: {
          query: context.originalQuery,
          fields,
          mode: 'any',
          caseSensitive: false,
          includeRelevanceScore: true
        },
        reasoning: `Enhanced text search using semantic field selection across ${fields.length} relevant fields`,
        confidence: Math.min(decomposition.confidence * 0.8, fieldSelection.confidence * 0.8),
        expectedOutcome: `Improved text search results with field-aware semantic targeting`,
        riskFactors: ['Limited to text search capabilities'],
        estimatedTime: 3000
      };
    }
  }

  /**
   * Calculate confidence for semantic planning
   */
  private static calculateSemanticConfidence(decomposition: any, fieldSelection: any): number {
    const decompositionConfidence = decomposition.confidence || 0.5;
    const fieldSelectionConfidence = fieldSelection.confidence || 0.5;

    // Factor in component count (more components = more complex but potentially better)
    const componentFactor = Math.min(decomposition.components.length * 0.05, 0.2);

    // Factor in field coverage
    const fieldFactor = Math.min(fieldSelection.selectedFields.length * 0.03, 0.15);

    // Factor in complexity (simple queries get a small boost)
    const complexityFactor = decomposition.complexity === 'simple' ? 0.05 : 0;

    const combinedConfidence = (decompositionConfidence * 0.4) +
                             (fieldSelectionConfidence * 0.4) +
                             componentFactor +
                             fieldFactor +
                             complexityFactor;

    return Math.min(combinedConfidence, 1.0);
  }

  /**
   * Generate reasoning for the semantic plan
   */
  private static generateSemanticReasoning(
    context: QueryContext,
    decomposition: any,
    fieldSelection: any
  ): string {
    const parts = [
      `Semantic analysis identified ${decomposition.components.length} distinct components`,
      `Primary intent: ${decomposition.primaryIntent}`,
      `Query complexity: ${decomposition.complexity}`,
      `Selected ${fieldSelection.selectedFields.length} optimal fields for targeting`
    ];

    if (decomposition.components.length > 1) {
      parts.push(`Multi-intent query detected - using field-specific targeting for each component`);
    }

    if (fieldSelection.recommendations.length > 0) {
      parts.push(`Field recommendations: ${fieldSelection.recommendations.slice(0, 2).join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Create a fallback plan when semantic analysis fails
   */
  private static createFallbackPlan(context: QueryContext, startTime: number): SemanticPlanningResult {
    const fallbackPlan: LLMPlan = {
      tool: 'searchByText',
      parameters: {
        query: context.originalQuery,
        fields: ['name', 'description', 'tags'],
        mode: 'any',
        caseSensitive: false,
        includeRelevanceScore: true
      },
      reasoning: 'Fallback to general text search due to semantic analysis failure',
      confidence: 0.3,
      expectedOutcome: 'Basic search results using general text matching',
      riskFactors: ['Semantic analysis failed', 'Using generic search approach'],
      estimatedTime: 2000
    };

    const planningTime = Date.now() - startTime;

    return {
      plan: fallbackPlan,
      reasoning: 'Semantic analysis failed, using fallback text search',
      confidence: 0.3,
      metadata: {
        decompositionTime: 0,
        fieldSelectionTime: 0,
        searchExecutionTime: 0,
        totalPlanningTime: planningTime,
        componentCount: 0,
        selectedFieldCount: 0,
        strategy: 'fallback'
      }
    };
  }

  /**
   * Check if semantic planning should be used for this query
   */
  static shouldUseSemanticPlanning(
    enhancedAnalysis: any,
    availableTools: string[]
  ): boolean {
    // Check if required tools are available
    const hasRequiredTools = availableTools.includes('queryDecomposer') &&
                            availableTools.includes('selectFieldsFromComponents') &&
                            availableTools.includes('multiFieldKeywordSearch');

    if (!hasRequiredTools) {
      console.log(`🔥 SEMANTIC PLANNER: Required tools not available, skipping semantic planning`);
      return false;
    }

    // Check if query has multiple components
    const hasMultipleIntents = enhancedAnalysis.suggestedTools &&
                               enhancedAnalysis.suggestedTools.length > 1;

    // Check if confidence in pattern analysis is reasonable
    const hasGoodPatternAnalysis = enhancedAnalysis.queryPattern &&
                                   enhancedAnalysis.queryPattern.confidence > 0.4;

    // Check if it's a multi-intent query (like "free cli")
    const hasMultipleSemanticUnits = enhancedAnalysis.originalQuery.split(/\s+/).length >= 2;

    const shouldUseSemantic = hasMultipleIntents || hasGoodPatternAnalysis || hasMultipleSemanticUnits;

    console.log(`🔥 SEMANTIC PLANNER: Semantic planning decision: ${shouldUseSemantic}`);
    console.log(`🔥 SEMANTIC PLANNER: - Multiple intents: ${hasMultipleIntents}`);
    console.log(`🔥 SEMANTIC PLANNER: - Good pattern analysis: ${hasGoodPatternAnalysis}`);
    console.log(`🔥 SEMANTIC PLANNER: - Multiple semantic units: ${hasMultipleSemanticUnits}`);

    return shouldUseSemantic;
  }
}

export default SemanticPlanner;