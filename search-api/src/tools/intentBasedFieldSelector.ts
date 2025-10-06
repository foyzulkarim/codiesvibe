/**
 * Intent-Based Field Selector Tool
 *
 * Maps semantic intents to the most relevant database fields for targeted search.
 * This tool analyzes user intent and selects optimal fields for search operations.
 */

import { ToolFunction, ToolParams, ToolResult } from './base';
import {
  getIntentMapping,
  getFieldsForIntent,
  getFieldMappingsForIntents,
  FieldMapping,
  IntentMapping
} from '../mapping/fieldMappingSchema';
import { QueryComponent } from './queryDecomposer';

export interface FieldSelection {
  fieldPath: string;
  weight: number;
  fieldType: 'string' | 'boolean' | 'number' | 'array';
  requiresExactMatch: boolean;
  boostTerms: string[];
  sourceIntent: string;
  relevanceScore: number;
}

export interface FieldSelectionResult {
  originalQuery?: string;
  intents: string[];
  selectedFields: FieldSelection[];
  confidence: number;
  strategy: 'single_intent' | 'multi_intent' | 'fallback';
  recommendations: string[];
}

export interface IntentBasedFieldSelectorParams {
  intents: string[];
  query?: string; // Original query for context
  terms?: string[]; // Specific terms to map to fields
  maxFields?: number; // Maximum fields to return
  minWeight?: number; // Minimum field weight threshold
  includeBoostTerms?: boolean; // Include boost terms in results
}

/**
 * Select optimal database fields based on semantic intents
 */
export const intentBasedFieldSelector: ToolFunction<IntentBasedFieldSelectorParams, FieldSelectionResult> = async (
  params: IntentBasedFieldSelectorParams,
  context
): Promise<ToolResult<FieldSelectionResult>> => {
  const startTime = Date.now();

  try {
    const {
      intents,
      query,
      terms = [],
      maxFields = 10,
      minWeight = 0.3,
      includeBoostTerms = true
    } = params;

    if (!intents || !Array.isArray(intents) || intents.length === 0) {
      return {
        success: false,
        error: new Error('Intents parameter is required and must be a non-empty array'),
        confidence: { score: 0.0, reason: 'Invalid intents parameter' }
      };
    }

    // Validate intents
    const validIntents = intents.filter(intent => getIntentMapping(intent));
    if (validIntents.length === 0) {
      return {
        success: false,
        error: new Error('No valid intents provided'),
        confidence: { score: 0.0, reason: 'No valid intents found' }
      };
    }

    // Get field mappings for all intents
    const allFieldMappings = getFieldMappingsForIntents(validIntents);

    // Enhance field mappings with term-specific boosting
    const enhancedMappings = enhanceFieldMappingsWithTerms(allFieldMappings, terms, validIntents);

    // Filter by minimum weight and limit results
    const filteredMappings = enhancedMappings
      .filter(mapping => mapping.weight >= minWeight)
      .slice(0, maxFields);

    // Convert to field selection format
    const selectedFields: FieldSelection[] = filteredMappings.map(mapping => {
      const intentMapping = getIntentMapping(mapping.sourceIntent);
      const fieldMapping = intentMapping?.fields.find(f => f.fieldPath === mapping.fieldPath);

      return {
        fieldPath: mapping.fieldPath,
        weight: mapping.weight,
        fieldType: mapping.fieldType,
        requiresExactMatch: mapping.requiresExactMatch || false,
        boostTerms: includeBoostTerms ? (mapping.boostTerms || []) : [],
        sourceIntent: mapping.sourceIntent,
        relevanceScore: calculateRelevanceScore(mapping, terms, query)
      };
    });

    // Sort by relevance score and weight
    selectedFields.sort((a, b) => (b.relevanceScore * b.weight) - (a.relevanceScore * a.weight));

    // Determine strategy and confidence
    const strategy = validIntents.length === 1 ? 'single_intent' : 'multi_intent';
    const confidence = calculateSelectionConfidence(selectedFields, validIntents, terms);

    // Generate recommendations
    const recommendations = generateFieldRecommendations(selectedFields, validIntents, query);

    const result: FieldSelectionResult = {
      originalQuery: query,
      intents: validIntents,
      selectedFields,
      confidence,
      strategy,
      recommendations
    };

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      data: result,
      executionTime,
      confidence: {
        score: confidence,
        reason: `Selected ${selectedFields.length} fields for ${validIntents.length} intents using ${strategy} strategy`
      },
      metadata: {
        fieldCount: selectedFields.length,
        intentCount: validIntents.length,
        strategy,
        topField: selectedFields[0]?.fieldPath,
        averageWeight: selectedFields.length > 0
          ? selectedFields.reduce((sum, f) => sum + f.weight, 0) / selectedFields.length
          : 0
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error in field selection'),
      executionTime: Date.now() - startTime,
      confidence: { score: 0.0, reason: 'Error during field selection' }
    };
  }
};

/**
 * Enhanced field selector that works with query components
 */
export interface FieldSelectionFromComponentsParams {
  components: QueryComponent[];
  originalQuery?: string;
  maxFields?: number;
  minWeight?: number;
}

export const selectFieldsFromComponents: ToolFunction<FieldSelectionFromComponentsParams, FieldSelectionResult> = async (
  params: FieldSelectionFromComponentsParams,
  context
): Promise<ToolResult<FieldSelectionResult>> => {
  const { components, originalQuery, maxFields = 10, minWeight = 0.3 } = params;

  if (!components || components.length === 0) {
    return {
      success: false,
      error: new Error('Components parameter is required and must be a non-empty array'),
      confidence: { score: 0.0, reason: 'No components provided' }
    };
  }

  // Extract unique intents and terms
  const intents = [...new Set(components.map(c => c.intent))];
  const terms = components.map(c => c.term);

  // Use the main selector function
  return intentBasedFieldSelector(
    { intents, query: originalQuery, terms, maxFields, minWeight },
    context
  );
};

/**
 * Enhance field mappings with term-specific boosting
 */
function enhanceFieldMappingsWithTerms(
  mappings: FieldMapping[],
  terms: string[],
  intents: string[]
): (FieldMapping & { sourceIntent: string })[] {
  return mappings.map(mapping => {
    let enhancedMapping = { ...mapping };

    // Find which intent this mapping comes from
    const sourceIntent = intents.find(intent => {
      const intentFields = getFieldsForIntent(intent);
      return intentFields.some(field => field.fieldPath === mapping.fieldPath);
    }) || 'unknown';

    // Apply term-specific boosting
    if (terms.length > 0 && mapping.boostTerms) {
      const termMatches = terms.filter(term =>
        mapping.boostTerms!.some(boostTerm =>
          boostTerm.toLowerCase().includes(term.toLowerCase()) ||
          term.toLowerCase().includes(boostTerm.toLowerCase())
        )
      );

      if (termMatches.length > 0) {
        enhancedMapping.weight = Math.min(mapping.weight * (1 + termMatches.length * 0.1), 1.0);
      }
    }

    return { ...enhancedMapping, sourceIntent };
  });
}

/**
 * Calculate relevance score for a field mapping
 */
function calculateRelevanceScore(
  mapping: FieldMapping & { sourceIntent: string },
  terms: string[],
  query?: string
): number {
  let score = mapping.weight;

  // Boost based on term matching
  if (terms.length > 0 && mapping.boostTerms) {
    const termMatches = terms.filter(term =>
      mapping.boostTerms!.some(boostTerm =>
        boostTerm.toLowerCase() === term.toLowerCase() ||
        term.toLowerCase().includes(boostTerm.toLowerCase())
      )
    );
    score += termMatches.length * 0.1;
  }

  // Boost based on query relevance
  if (query && mapping.boostTerms) {
    const queryMatches = mapping.boostTerms.filter(boostTerm =>
      query.toLowerCase().includes(boostTerm.toLowerCase())
    );
    score += queryMatches.length * 0.05;
  }

  return Math.min(score, 1.0);
}

/**
 * Calculate overall confidence for field selection
 */
function calculateSelectionConfidence(
  fields: FieldSelection[],
  intents: string[],
  terms: string[]
): number {
  if (fields.length === 0) return 0.0;

  // Base confidence from field weights
  const avgWeight = fields.reduce((sum, field) => sum + field.weight, 0) / fields.length;

  // Boost from term matching
  const termMatchRatio = terms.length > 0
    ? fields.filter(field => field.boostTerms.length > 0).length / fields.length
    : 0;

  // Boost from intent coverage
  const intentCoverage = fields.length > 0
    ? new Set(fields.map(f => f.sourceIntent)).size / intents.length
    : 0;

  return Math.min(avgWeight + (termMatchRatio * 0.1) + (intentCoverage * 0.1), 1.0);
}

/**
 * Generate recommendations based on field selection
 */
function generateFieldRecommendations(
  fields: FieldSelection[],
  intents: string[],
  query?: string
): string[] {
  const recommendations: string[] = [];

  if (fields.length === 0) {
    recommendations.push('Consider broadening search criteria or using general text search');
    return recommendations;
  }

  // High-confidence field recommendations
  const highConfidenceFields = fields.filter(f => f.relevanceScore >= 0.7);
  if (highConfidenceFields.length > 0) {
    recommendations.push(`Focus on ${highConfidenceFields.length} high-relevance fields for best results`);
  }

  // Intent-specific recommendations
  if (intents.includes('pricing')) {
    recommendations.push('Consider using price range filters for precise results');
  }

  if (intents.includes('interface')) {
    recommendations.push('Interface-specific searches may benefit from exact matching');
  }

  if (intents.length > 1) {
    recommendations.push('Multi-intent query: consider combining results from different field types');
  }

  // Query-specific recommendations
  if (query && query.length < 10) {
    recommendations.push('Short query: consider broader field coverage for better results');
  }

  return recommendations;
}

/**
 * Get field statistics for debugging and analysis
 */
export function getFieldSelectionStats(fields: FieldSelection[]): {
  totalFields: number;
  uniqueIntents: number;
  averageWeight: number;
  averageRelevance: number;
  fieldTypes: Record<string, number>;
} {
  if (fields.length === 0) {
    return {
      totalFields: 0,
      uniqueIntents: 0,
      averageWeight: 0,
      averageRelevance: 0,
      fieldTypes: {}
    };
  }

  const uniqueIntents = new Set(fields.map(f => f.sourceIntent)).size;
  const averageWeight = fields.reduce((sum, f) => sum + f.weight, 0) / fields.length;
  const averageRelevance = fields.reduce((sum, f) => sum + f.relevanceScore, 0) / fields.length;

  const fieldTypes: Record<string, number> = {};
  fields.forEach(field => {
    fieldTypes[field.fieldType] = (fieldTypes[field.fieldType] || 0) + 1;
  });

  return {
    totalFields: fields.length,
    uniqueIntents,
    averageWeight,
    averageRelevance,
    fieldTypes
  };
}

// Export tools for registration
export const intentBasedFieldSelectorTool = {
  func: intentBasedFieldSelector,
  metadata: {
    name: 'intentBasedFieldSelector',
    category: 'analysis' as const,
    description: 'Map semantic intents to optimal database fields for targeted search',
    schema: {
      intents: { type: 'array', required: true, description: 'Array of semantic intents' },
      query: { type: 'string', required: false, description: 'Original query for context' },
      terms: { type: 'array', required: false, description: 'Specific terms to map to fields' },
      maxFields: { type: 'number', required: false, default: 10, description: 'Maximum fields to return' },
      minWeight: { type: 'number', required: false, default: 0.3, description: 'Minimum field weight threshold' },
      includeBoostTerms: { type: 'boolean', required: false, default: true, description: 'Include boost terms' }
    },
    examples: [
      'Map ["pricing", "interface"] intents to optimal database fields',
      'Select fields for "free cli" query with pricing and interface intents',
      'Find best fields for multi-intent search across categories and capabilities'
    ],
    performance: {
      complexity: 'O(n)',
      memoryUsage: 'low'
    }
  }
};

export const selectFieldsFromComponentsTool = {
  func: selectFieldsFromComponents,
  metadata: {
    name: 'selectFieldsFromComponents',
    category: 'analysis' as const,
    description: 'Select fields from pre-analyzed query components',
    schema: {
      components: { type: 'array', required: true, description: 'Query components from decomposer' },
      originalQuery: { type: 'string', required: false, description: 'Original query' },
      maxFields: { type: 'number', required: false, default: 10, description: 'Maximum fields' },
      minWeight: { type: 'number', required: false, default: 0.3, description: 'Minimum weight' }
    },
    examples: [
      'Select fields from query decomposition results',
      'Map decomposed components to optimal search fields',
      'Convert query analysis into field mappings'
    ],
    performance: {
      complexity: 'O(n)',
      memoryUsage: 'low'
    }
  }
};