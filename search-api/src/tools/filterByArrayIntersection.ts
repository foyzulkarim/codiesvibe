import { ToolFunction, ToolParams, ToolResponse, createToolResponse, ReasoningGenerator } from './base';
import { getNestedValue, assertArrayField, deepEqual } from './validators';
import { AllowedFields } from '../config/fields';

export interface FilterByArrayIntersectionParams extends ToolParams {
  field: string;
  values: any[];
  minIntersectionSize?: number;
  caseSensitive?: boolean;
}

/**
 * AI-Enhanced Filter by Array Intersection Tool
 * 
 * Filters a dataset by finding items where array fields have intersections
 * with provided arrays. Supports minimum intersection size requirements.
 */
export const filterByArrayIntersection: ToolFunction<FilterByArrayIntersectionParams> = (
  data: any[],
  params: FilterByArrayIntersectionParams
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

    if (!Array.isArray(params.values)) {
      return createToolResponse(
        [],
        'Values parameter must be an array',
        0.0,
        0,
        startTime,
        ['Values parameter must be an array']
      );
    }

    // Validate field is an array field
    assertArrayField(params.field);

    const minIntersectionSize = params.minIntersectionSize || 1;
    const caseSensitive = params.caseSensitive !== false; // Default to true
    
    // Filter the data
    const filteredData = data.filter(item => {
      const fieldValue = getNestedValue(item, params.field);
      
      if (!Array.isArray(fieldValue)) {
        return false; // Field must be an array
      }
      
      const intersectionSize = calculateIntersectionSize(
        fieldValue,
        params.values,
        caseSensitive
      );
      
      return intersectionSize >= minIntersectionSize;
    });

    const executionTime = Date.now() - startTime;
    const filterRatio = data.length > 0 ? filteredData.length / data.length : 0;
    
    // Generate AI reasoning
    const reasoning = generateArrayIntersectionReasoning(
      params.field,
      params.values,
      minIntersectionSize,
      data.length,
      filteredData.length,
      executionTime,
      caseSensitive
    );

    // Calculate confidence
    const confidence = calculateArrayIntersectionConfidence(
      filteredData.length,
      data.length,
      params.values.length,
      minIntersectionSize,
      executionTime
    );

    const warnings: string[] = [];
    
    // Add performance warnings
    if (executionTime > 200) {
      warnings.push(`Array intersection filter took ${executionTime}ms - consider optimizing array operations`);
    }
    
    // Add result warnings
    if (filteredData.length === 0) {
      warnings.push('No items matched the array intersection criteria');
    } else if (filterRatio < 0.05) {
      warnings.push(`Very selective intersection filter (${(filterRatio * 100).toFixed(2)}% of data)`);
    }
    
    // Add parameter warnings
    if (params.values.length > 20) {
      warnings.push('Large intersection array may impact performance');
    }
    
    if (minIntersectionSize > params.values.length) {
      warnings.push('Minimum intersection size exceeds provided values array length');
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
      `Array intersection filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0.0,
      0,
      startTime,
      ['Exception occurred during array intersection filtering']
    );
  }
};

/**
 * Calculate the intersection size between two arrays
 */
function calculateIntersectionSize(
  fieldArray: any[],
  compareArray: any[],
  caseSensitive: boolean
): number {
  if (!Array.isArray(fieldArray) || !Array.isArray(compareArray)) {
    return 0;
  }

  // Normalize comparison function
  const isEqual = (a: any, b: any): boolean => {
    if (typeof a === 'string' && typeof b === 'string') {
      return caseSensitive ? a === b : a.toLowerCase() === b.toLowerCase();
    }
    return deepEqual(a, b);
  };

  let intersectionCount = 0;
  const processedIndices = new Set<number>();

  // Count intersections (avoid double counting)
  for (const fieldItem of fieldArray) {
    for (let i = 0; i < compareArray.length; i++) {
      if (processedIndices.has(i)) continue;
      
      if (isEqual(fieldItem, compareArray[i])) {
        intersectionCount++;
        processedIndices.add(i);
        break; // Move to next field item
      }
    }
  }

  return intersectionCount;
}

/**
 * Get the actual intersection elements between two arrays
 */
function getIntersectionElements(
  fieldArray: any[],
  compareArray: any[],
  caseSensitive: boolean
): any[] {
  if (!Array.isArray(fieldArray) || !Array.isArray(compareArray)) {
    return [];
  }

  const isEqual = (a: any, b: any): boolean => {
    if (typeof a === 'string' && typeof b === 'string') {
      return caseSensitive ? a === b : a.toLowerCase() === b.toLowerCase();
    }
    return deepEqual(a, b);
  };

  const intersection: any[] = [];
  const processedIndices = new Set<number>();

  for (const fieldItem of fieldArray) {
    for (let i = 0; i < compareArray.length; i++) {
      if (processedIndices.has(i)) continue;
      
      if (isEqual(fieldItem, compareArray[i])) {
        intersection.push(fieldItem);
        processedIndices.add(i);
        break;
      }
    }
  }

  return intersection;
}

/**
 * Generate AI-enhanced reasoning for the array intersection operation
 */
function generateArrayIntersectionReasoning(
  field: string,
  values: any[],
  minIntersectionSize: number,
  originalCount: number,
  filteredCount: number,
  executionTime: number,
  caseSensitive: boolean
): string {
  const filterRatio = originalCount > 0 ? (filteredCount / originalCount) * 100 : 0;
  
  let reasoning = `Applied array intersection filter on field '${field}' requiring `;
  reasoning += `at least ${minIntersectionSize} matching element${minIntersectionSize > 1 ? 's' : ''} `;
  reasoning += `with provided array of ${values.length} values. `;
  
  if (!caseSensitive) {
    reasoning += 'Used case-insensitive string matching. ';
  }
  
  reasoning += `Filtered ${originalCount} items down to ${filteredCount} items `;
  reasoning += `(${filterRatio.toFixed(1)}% retention). `;
  
  // Add performance insight
  if (executionTime < 30) {
    reasoning += 'Array intersection executed very efficiently. ';
  } else if (executionTime < 150) {
    reasoning += 'Array intersection executed efficiently. ';
  } else {
    reasoning += `Array intersection took ${executionTime}ms - large arrays impact performance. `;
  }
  
  // Add selectivity insights
  if (filterRatio < 10) {
    reasoning += 'Highly selective intersection filter - good for precise matching.';
  } else if (filterRatio > 70) {
    reasoning += 'Broad intersection filter - many items had overlapping values.';
  } else {
    reasoning += 'Balanced intersection filter selectivity achieved.';
  }
  
  // Add intersection size insights
  if (minIntersectionSize > 1) {
    reasoning += ` Requiring ${minIntersectionSize}+ matches increased selectivity.`;
  }
  
  return reasoning;
}

/**
 * Calculate confidence score for the array intersection operation
 */
function calculateArrayIntersectionConfidence(
  resultCount: number,
  totalCount: number,
  valuesCount: number,
  minIntersectionSize: number,
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
  
  // Adjust based on array sizes
  if (valuesCount > 50) {
    confidence -= 0.1; // Large arrays are more complex
  } else if (valuesCount > 20) {
    confidence -= 0.05; // Moderate array size complexity
  }
  
  // Adjust based on minimum intersection requirements
  if (minIntersectionSize > 5) {
    confidence -= 0.05; // High intersection requirements are more complex
  }
  
  // Adjust based on performance
  if (executionTime > 200) {
    confidence -= 0.1; // Slow array operations are less reliable
  }
  
  // Adjust based on intersection complexity
  const intersectionRatio = valuesCount > 0 ? minIntersectionSize / valuesCount : 0;
  if (intersectionRatio > 0.8) {
    confidence -= 0.05; // Very high intersection requirements
  }
  
  // Ensure confidence is within bounds
  return Math.max(0.0, Math.min(1.0, confidence));
}

export default filterByArrayIntersection;