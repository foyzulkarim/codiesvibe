import { ToolFunction, ToolParams, ToolResponse, createToolResponse, ReasoningGenerator } from './base';
import { getNestedValue, assertArrayField, deepEqual } from './validators';
import { AllowedFields, Operators } from '../config/fields';

export interface FilterByArrayContainsParams extends ToolParams {
  field: string;
  value: any;
  matchType?: 'any' | 'all' | 'exact';
  caseSensitive?: boolean;
}

/**
 * AI-Enhanced Filter by Array Contains Tool
 * 
 * Filters a dataset by checking if array fields contain specific values.
 * Supports multiple matching strategies with intelligent reasoning.
 */
export const filterByArrayContains: ToolFunction<FilterByArrayContainsParams> = (
  data: any[],
  params: FilterByArrayContainsParams
): ToolResponse => {
  const startTime = Date.now();
  
  try {
    // Validate inputs
    if (!Array.isArray(data)) {
      return createToolResponse(
        [],
        'Input data must be an array',
        0.0,
        0,
        startTime,
        ['Invalid data type provided']
      );
    }

    if (!params.field || typeof params.field !== 'string') {
      return createToolResponse(
        [],
        'Field parameter is required and must be a string',
        0.0,
        0,
        startTime,
        ['Missing or invalid field parameter']
      );
    }

    // Validate field is an array field
    assertArrayField(params.field);

    const matchType = params.matchType || 'any';
    const caseSensitive = params.caseSensitive !== false; // Default to true
    
    // Normalize search values
    const searchValues = Array.isArray(params.value) ? params.value : [params.value];
    
    // Filter the data
    const filteredData = data.filter(item => {
      const fieldValue = getNestedValue(item, params.field);
      
      if (!Array.isArray(fieldValue)) {
        return false; // Field must be an array
      }
      
      return matchesArrayCondition(fieldValue, searchValues, matchType, caseSensitive);
    });

    const executionTime = Date.now() - startTime;
    const filterRatio = data.length > 0 ? filteredData.length / data.length : 0;
    
    // Generate AI reasoning
    const reasoning = generateArrayContainsReasoning(
      params.field,
      searchValues,
      matchType,
      data.length,
      filteredData.length,
      executionTime,
      caseSensitive
    );

    // Calculate confidence
    const confidence = calculateArrayContainsConfidence(
      filteredData.length,
      data.length,
      matchType,
      searchValues.length,
      executionTime
    );

    const warnings: string[] = [];
    
    // Add performance warnings
    if (executionTime > 150) {
      warnings.push(`Array contains filter took ${executionTime}ms - consider optimizing array operations`);
    }
    
    // Add result warnings
    if (filteredData.length === 0) {
      warnings.push('No items matched the array contains criteria');
    } else if (filterRatio < 0.05) {
      warnings.push(`Very selective array filter (${(filterRatio * 100).toFixed(2)}% of data)`);
    }
    
    // Add match type warnings
    if (matchType === 'all' && searchValues.length > 5) {
      warnings.push('Matching ALL values with many search terms may be overly restrictive');
    }

    return createToolResponse(
      filteredData,
      reasoning,
      confidence,
      data.length,
      startTime,
      warnings.length > 0 ? warnings : undefined
    );

  } catch (error) {
    return createToolResponse(
      [],
      `Array contains filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0.0,
      0,
      startTime,
      ['Exception occurred during array filtering']
    );
  }
};

/**
 * Check if an array field matches the given condition
 */
function matchesArrayCondition(
  fieldArray: any[],
  searchValues: any[],
  matchType: 'any' | 'all' | 'exact',
  caseSensitive: boolean
): boolean {
  if (!Array.isArray(fieldArray) || fieldArray.length === 0) {
    return false;
  }

  // Normalize comparison function
  const isEqual = (a: any, b: any): boolean => {
    if (typeof a === 'string' && typeof b === 'string') {
      return caseSensitive ? a === b : a.toLowerCase() === b.toLowerCase();
    }
    return deepEqual(a, b);
  };

  switch (matchType) {
    case 'any':
      // Array contains ANY of the search values
      return searchValues.some(searchValue =>
        fieldArray.some(fieldItem => isEqual(fieldItem, searchValue))
      );

    case 'all':
      // Array contains ALL of the search values
      return searchValues.every(searchValue =>
        fieldArray.some(fieldItem => isEqual(fieldItem, searchValue))
      );

    case 'exact':
      // Array exactly matches the search values (same length and all elements match)
      if (fieldArray.length !== searchValues.length) {
        return false;
      }
      
      // Check if all search values are present (order doesn't matter)
      return searchValues.every(searchValue =>
        fieldArray.some(fieldItem => isEqual(fieldItem, searchValue))
      ) && fieldArray.every(fieldItem =>
        searchValues.some(searchValue => isEqual(fieldItem, searchValue))
      );

    default:
      return false;
  }
}

/**
 * Generate AI-enhanced reasoning for the array contains operation
 */
function generateArrayContainsReasoning(
  field: string,
  searchValues: any[],
  matchType: 'any' | 'all' | 'exact',
  originalCount: number,
  filteredCount: number,
  executionTime: number,
  caseSensitive: boolean
): string {
  const filterRatio = originalCount > 0 ? (filteredCount / originalCount) * 100 : 0;
  const matchTypeDescription = getMatchTypeDescription(matchType);
  
  let reasoning = `Applied array contains filter on field '${field}' using '${matchTypeDescription}' matching. `;
  
  if (searchValues.length === 1) {
    reasoning += `Searched for items containing '${JSON.stringify(searchValues[0])}'. `;
  } else {
    reasoning += `Searched for items containing ${searchValues.length} values: ${searchValues.map(v => JSON.stringify(v)).join(', ')}. `;
  }
  
  if (!caseSensitive) {
    reasoning += 'Used case-insensitive string matching. ';
  }
  
  reasoning += `Filtered ${originalCount} items down to ${filteredCount} items `;
  reasoning += `(${filterRatio.toFixed(1)}% retention). `;
  
  // Add performance insight
  if (executionTime < 20) {
    reasoning += 'Array filtering executed very efficiently. ';
  } else if (executionTime < 100) {
    reasoning += 'Array filtering executed efficiently. ';
  } else {
    reasoning += `Array filtering took ${executionTime}ms - consider array indexing. `;
  }
  
  // Add match type specific insights
  if (matchType === 'any' && filterRatio > 80) {
    reasoning += 'High match rate suggests common values in arrays.';
  } else if (matchType === 'all' && filterRatio < 10) {
    reasoning += 'Low match rate expected with ALL matching - very selective.';
  } else if (matchType === 'exact' && filterRatio < 5) {
    reasoning += 'Very low match rate expected with exact matching - highly selective.';
  } else {
    reasoning += `${matchTypeDescription} matching provided balanced selectivity.`;
  }
  
  return reasoning;
}

/**
 * Get human-readable description of match type
 */
function getMatchTypeDescription(matchType: 'any' | 'all' | 'exact'): string {
  const descriptions = {
    'any': 'contains any of the values',
    'all': 'contains all of the values',
    'exact': 'exactly matches the values'
  };
  
  return descriptions[matchType];
}

/**
 * Calculate confidence score for the array contains operation
 */
function calculateArrayContainsConfidence(
  resultCount: number,
  totalCount: number,
  matchType: 'any' | 'all' | 'exact',
  searchValueCount: number,
  executionTime: number
): number {
  let confidence = 0.85; // Base confidence for array operations
  
  // Adjust based on result ratio
  const ratio = totalCount > 0 ? resultCount / totalCount : 0;
  if (ratio === 0) {
    confidence = 0.6; // Lower confidence for no results
  } else if (ratio < 0.01 || ratio > 0.99) {
    confidence = 0.7; // Lower confidence for extreme selectivity
  }
  
  // Adjust based on match type complexity
  if (matchType === 'exact') {
    confidence -= 0.1; // Exact matching is more complex
  } else if (matchType === 'all' && searchValueCount > 3) {
    confidence -= 0.05; // Many values with ALL matching is complex
  }
  
  // Adjust based on performance
  if (executionTime > 150) {
    confidence -= 0.1; // Slow array operations are less reliable
  }
  
  // Adjust based on search value count
  if (searchValueCount > 10) {
    confidence -= 0.05; // Many search values increase complexity
  }
  
  // Ensure confidence is within bounds
  return Math.max(0.0, Math.min(1.0, confidence));
}

export default filterByArrayContains;