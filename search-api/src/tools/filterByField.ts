import { ToolFunction, ToolParams, ToolResponse, createToolResponse, ReasoningGenerator } from './base';
import { getNestedValue, assertField, validateFieldValue } from './validators';
import { AllowedFields, Operators, ValidOperatorsByType, FieldTypeMap } from '../config/fields';

export interface FilterByFieldParams extends ToolParams {
  field: string;
  value: any;
  operator?: Operators;
  caseSensitive?: boolean;
}

/**
 * AI-Enhanced Filter by Field Tool
 * 
 * Filters a dataset by a specific field value with intelligent operator selection
 * and comprehensive reasoning about the filtering process.
 */
export const filterByField: ToolFunction<FilterByFieldParams> = (
  data: any[],
  params: FilterByFieldParams
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

    // Validate field exists in schema
    assertField(params.field);

    // Get field type and determine appropriate operator
    const rootField = params.field.split('.')[0] as AllowedFields;
    const fieldType = FieldTypeMap[rootField];
    const validOperators = ValidOperatorsByType[fieldType] || [];
    
    // Default operator selection based on field type and value
    let operator = params.operator || Operators.EQUALS;
    
    // AI-enhanced operator selection
    if (!params.operator) {
      if (typeof params.value === 'string' && params.value.includes('*')) {
        operator = Operators.REGEX;
      } else if (Array.isArray(params.value)) {
        operator = Operators.IN;
      } else if (fieldType === 'string' && typeof params.value === 'string') {
        // For string searches, default to contains for better UX
        operator = Operators.CONTAINS;
      }
    }

    // Validate operator is supported for field type
    if (!validOperators.includes(operator)) {
      return createToolResponse(
        [],
        `Operator '${operator}' is not supported for field type '${fieldType}'`,
        0.0,
        0,
        startTime,
        [`Valid operators for ${fieldType}: ${validOperators.join(', ')}`]
      );
    }

    // Validate field value type
    if (!validateFieldValue(params.field, params.value)) {
      return createToolResponse(
        [],
        `Value type mismatch for field '${params.field}' (expected: ${fieldType})`,
        0.5,
        0,
        startTime,
        ['Value type validation failed']
      );
    }

    const caseSensitive = params.caseSensitive !== false; // Default to true
    
    // Filter the data
    const filteredData = data.filter(item => {
      const fieldValue = getNestedValue(item, params.field);
      return matchesCondition(fieldValue, params.value, operator, caseSensitive);
    });

    const executionTime = Date.now() - startTime;
    const filterRatio = data.length > 0 ? filteredData.length / data.length : 0;
    
    // Generate AI reasoning
    const reasoning = generateFilterReasoning(
      params.field,
      params.value,
      operator,
      data.length,
      filteredData.length,
      executionTime,
      fieldType,
      caseSensitive
    );

    // Calculate confidence based on various factors
    const confidence = calculateFilterConfidence(
      filteredData.length,
      data.length,
      operator,
      fieldType,
      executionTime
    );

    const warnings: string[] = [];
    
    // Add performance warnings
    if (executionTime > 100) {
      warnings.push(`Filter operation took ${executionTime}ms - consider indexing field '${params.field}'`);
    }
    
    // Add result warnings
    if (filteredData.length === 0) {
      warnings.push('No items matched the filter criteria');
    } else if (filterRatio < 0.01) {
      warnings.push(`Filter is very selective (${(filterRatio * 100).toFixed(2)}% of data)`);
    } else if (filterRatio > 0.95) {
      warnings.push(`Filter is not very selective (${(filterRatio * 100).toFixed(2)}% of data)`);
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
      `Filter operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0.0,
      0,
      startTime,
      ['Exception occurred during filtering']
    );
  }
};

/**
 * Check if a field value matches the given condition
 */
function matchesCondition(
  fieldValue: any,
  targetValue: any,
  operator: Operators,
  caseSensitive: boolean
): boolean {
  // Handle null/undefined cases
  if (fieldValue === null || fieldValue === undefined) {
    switch (operator) {
      case Operators.IS_NULL:
        return true;
      case Operators.IS_NOT_NULL:
      case Operators.EXISTS:
        return false;
      default:
        return false;
    }
  }

  // Handle existence checks
  if (operator === Operators.EXISTS) {
    return fieldValue !== null && fieldValue !== undefined;
  }
  if (operator === Operators.IS_NULL) {
    return fieldValue === null || fieldValue === undefined;
  }
  if (operator === Operators.IS_NOT_NULL) {
    return fieldValue !== null && fieldValue !== undefined;
  }

  // Normalize string comparisons
  const normalizeString = (val: any): string => {
    const str = String(val);
    return caseSensitive ? str : str.toLowerCase();
  };

  switch (operator) {
    case Operators.EQUALS:
      return caseSensitive ? fieldValue === targetValue : 
             normalizeString(fieldValue) === normalizeString(targetValue);

    case Operators.NOT_EQUALS:
      return caseSensitive ? fieldValue !== targetValue :
             normalizeString(fieldValue) !== normalizeString(targetValue);

    case Operators.CONTAINS:
      return normalizeString(fieldValue).includes(normalizeString(targetValue));

    case Operators.STARTS_WITH:
      return normalizeString(fieldValue).startsWith(normalizeString(targetValue));

    case Operators.ENDS_WITH:
      return normalizeString(fieldValue).endsWith(normalizeString(targetValue));

    case Operators.REGEX:
      try {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(targetValue, flags);
        return regex.test(String(fieldValue));
      } catch {
        return false;
      }

    case Operators.GREATER_THAN:
      return Number(fieldValue) > Number(targetValue);

    case Operators.GREATER_THAN_OR_EQUAL:
      return Number(fieldValue) >= Number(targetValue);

    case Operators.LESS_THAN:
      return Number(fieldValue) < Number(targetValue);

    case Operators.LESS_THAN_OR_EQUAL:
      return Number(fieldValue) <= Number(targetValue);

    case Operators.IN:
      if (!Array.isArray(targetValue)) return false;
      return targetValue.some(val => 
        caseSensitive ? fieldValue === val : 
        normalizeString(fieldValue) === normalizeString(val)
      );

    case Operators.NOT_IN:
      if (!Array.isArray(targetValue)) return true;
      return !targetValue.some(val => 
        caseSensitive ? fieldValue === val : 
        normalizeString(fieldValue) === normalizeString(val)
      );

    default:
      return false;
  }
}

/**
 * Generate AI-enhanced reasoning for the filter operation
 */
function generateFilterReasoning(
  field: string,
  value: any,
  operator: Operators,
  originalCount: number,
  filteredCount: number,
  executionTime: number,
  fieldType: string,
  caseSensitive: boolean
): string {
  const filterRatio = originalCount > 0 ? (filteredCount / originalCount) * 100 : 0;
  const operatorDescription = getOperatorDescription(operator);
  
  let reasoning = `Applied ${operatorDescription} filter on field '${field}' (${fieldType}) `;
  reasoning += `with value '${JSON.stringify(value)}'. `;
  
  if (!caseSensitive && fieldType === 'string') {
    reasoning += 'Used case-insensitive matching. ';
  }
  
  reasoning += `Filtered ${originalCount} items down to ${filteredCount} items `;
  reasoning += `(${filterRatio.toFixed(1)}% retention). `;
  
  // Add performance insight
  if (executionTime < 10) {
    reasoning += 'Filter executed very quickly. ';
  } else if (executionTime < 50) {
    reasoning += 'Filter executed efficiently. ';
  } else {
    reasoning += `Filter took ${executionTime}ms - consider optimization. `;
  }
  
  // Add selectivity insight
  if (filterRatio === 0) {
    reasoning += 'No matches found - consider broadening criteria.';
  } else if (filterRatio < 5) {
    reasoning += 'Highly selective filter - good for precise results.';
  } else if (filterRatio < 50) {
    reasoning += 'Moderately selective filter - balanced results.';
  } else if (filterRatio < 95) {
    reasoning += 'Broad filter - many items match criteria.';
  } else {
    reasoning += 'Very broad filter - most items match criteria.';
  }
  
  return reasoning;
}

/**
 * Get human-readable description of operator
 */
function getOperatorDescription(operator: Operators): string {
  const descriptions: Record<Operators, string> = {
    [Operators.EQUALS]: 'equality',
    [Operators.NOT_EQUALS]: 'inequality',
    [Operators.CONTAINS]: 'substring',
    [Operators.STARTS_WITH]: 'prefix',
    [Operators.ENDS_WITH]: 'suffix',
    [Operators.REGEX]: 'pattern matching',
    [Operators.GREATER_THAN]: 'greater than',
    [Operators.GREATER_THAN_OR_EQUAL]: 'greater than or equal',
    [Operators.LESS_THAN]: 'less than',
    [Operators.LESS_THAN_OR_EQUAL]: 'less than or equal',
    [Operators.IN]: 'inclusion',
    [Operators.NOT_IN]: 'exclusion',
    [Operators.EXISTS]: 'existence',
    [Operators.IS_NULL]: 'null check',
    [Operators.IS_NOT_NULL]: 'non-null check',
    [Operators.ARRAY_CONTAINS]: 'array contains',
    [Operators.ARRAY_CONTAINS_ANY]: 'array contains any',
    [Operators.ARRAY_CONTAINS_ALL]: 'array contains all'
  };
  
  return descriptions[operator] || operator;
}

/**
 * Calculate confidence score for the filter operation
 */
function calculateFilterConfidence(
  resultCount: number,
  totalCount: number,
  operator: Operators,
  fieldType: string,
  executionTime: number
): number {
  let confidence = 0.8; // Base confidence
  
  // Adjust based on result ratio
  const ratio = totalCount > 0 ? resultCount / totalCount : 0;
  if (ratio === 0) {
    confidence = 0.6; // Lower confidence for no results
  } else if (ratio < 0.01 || ratio > 0.99) {
    confidence = 0.7; // Lower confidence for extreme selectivity
  } else {
    confidence = 0.9; // Higher confidence for balanced results
  }
  
  // Adjust based on operator complexity
  if ([Operators.REGEX, Operators.ARRAY_CONTAINS_ALL].includes(operator)) {
    confidence -= 0.1; // Complex operators are less certain
  }
  
  // Adjust based on performance
  if (executionTime > 100) {
    confidence -= 0.1; // Slow operations are less reliable
  }
  
  // Ensure confidence is within bounds
  return Math.max(0.0, Math.min(1.0, confidence));
}

export default filterByField;