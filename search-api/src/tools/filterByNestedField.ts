import { ToolFunction, ToolParams, ToolResponse, createToolResponse, ReasoningGenerator } from './base';
import { getNestedValue, assertField, deepEqual, normalizeFieldPath } from './validators';
import { AllowedFields, Operators, FieldTypes, FieldTypeMap } from '../config/fields';

export interface FilterByNestedFieldParams extends ToolParams {
  field: string;
  operator?: Operators;
  value: any;
  caseSensitive?: boolean;
  nullHandling?: 'include' | 'exclude' | 'treat_as_empty';
}

/**
 * AI-Enhanced Filter by Nested Field Tool
 * 
 * Filters a dataset by nested object properties with intelligent path resolution
 * and type-aware comparisons. Supports deep object traversal and complex conditions.
 */
export const filterByNestedField: ToolFunction<FilterByNestedFieldParams> = (
  data: any[],
  params: FilterByNestedFieldParams
): ToolResponse => {
  const startTime = Date.now();
  console.log('🔍 FilterByNestedField params:', { data, params });
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

    // Normalize and validate the nested field path
    const normalizedField = normalizeFieldPath(params.field);
    const fieldParts = normalizedField.split('.');

    // Validate root field if it's a known field
    if (fieldParts.length > 0 && fieldParts[0] && Object.values(AllowedFields).includes(fieldParts[0] as AllowedFields)) {
      assertField(fieldParts[0]);
    }

    const operator = params.operator || Operators.EQUALS;
    const caseSensitive = params.caseSensitive !== false; // Default to true
    const nullHandling = params.nullHandling || 'exclude';

    // Filter the data
    const filteredData = data.filter(item => {
      const fieldValue = getNestedValue(item, normalizedField);

      return matchesNestedCondition(
        fieldValue,
        operator,
        params.value,
        caseSensitive,
        nullHandling
      );
    });

    const executionTime = Date.now() - startTime;
    const filterRatio = data.length > 0 ? filteredData.length / data.length : 0;

    // Generate AI reasoning
    const reasoning = generateNestedFieldReasoning(
      normalizedField,
      operator,
      params.value,
      data.length,
      filteredData.length,
      executionTime,
      caseSensitive,
      nullHandling,
      fieldParts.length
    );

    // Calculate confidence
    const confidence = calculateNestedFieldConfidence(
      filteredData.length,
      data.length,
      operator,
      fieldParts.length,
      executionTime,
      nullHandling
    );

    const warnings: string[] = [];

    // Add performance warnings
    if (executionTime > 200) {
      warnings.push(`Nested field filter took ${executionTime}ms - deep nesting may impact performance`);
    }

    // Add path depth warnings
    if (fieldParts.length > 4) {
      warnings.push(`Very deep nesting (${fieldParts.length} levels) - consider data structure optimization`);
    }

    // Add result warnings
    if (filteredData.length === 0) {
      warnings.push('No items matched the nested field criteria');
    } else if (filterRatio < 0.05) {
      warnings.push(`Very selective nested filter (${(filterRatio * 100).toFixed(2)}% of data)`);
    }

    // Add null handling warnings
    if (nullHandling === 'include') {
      const nullCount = data.filter(item => getNestedValue(item, normalizedField) == null).length;
      if (nullCount > 0) {
        warnings.push(`Including ${nullCount} items with null/undefined nested values`);
      }
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
      `Nested field filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0.0,
      0,
      startTime,
      ['Exception occurred during nested field filtering']
    );
  }
};

/**
 * Check if a nested field value matches the given condition
 */
function matchesNestedCondition(
  fieldValue: any,
  operator: Operators,
  compareValue: any,
  caseSensitive: boolean,
  nullHandling: 'include' | 'exclude' | 'treat_as_empty'
): boolean {
  // Handle null/undefined values
  if (fieldValue == null) {
    switch (nullHandling) {
      case 'include':
        return operator === Operators.EQUALS ? compareValue == null : true;
      case 'exclude':
        return false;
      case 'treat_as_empty':
        fieldValue = '';
        break;
    }
  }

  // Handle string comparisons with case sensitivity
  if (typeof fieldValue === 'string' && typeof compareValue === 'string' && !caseSensitive) {
    fieldValue = fieldValue.toLowerCase();
    compareValue = compareValue.toLowerCase();
  }

  switch (operator) {
    case Operators.EQUALS:
      return deepEqual(fieldValue, compareValue);

    case Operators.NOT_EQUALS:
      return !deepEqual(fieldValue, compareValue);

    case Operators.GREATER_THAN:
      return fieldValue > compareValue;

    case Operators.GREATER_THAN_OR_EQUAL:
      return fieldValue >= compareValue;

    case Operators.LESS_THAN:
      return fieldValue < compareValue;

    case Operators.LESS_THAN_OR_EQUAL:
      return fieldValue <= compareValue;

    case Operators.CONTAINS:
      if (typeof fieldValue === 'string' && typeof compareValue === 'string') {
        return fieldValue.includes(compareValue);
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(item => deepEqual(item, compareValue));
      }
      return false;

    case Operators.STARTS_WITH:
      return typeof fieldValue === 'string' && typeof compareValue === 'string' &&
        fieldValue.startsWith(compareValue);

    case Operators.ENDS_WITH:
      return typeof fieldValue === 'string' && typeof compareValue === 'string' &&
        fieldValue.endsWith(compareValue);

    case Operators.IN:
      return Array.isArray(compareValue) &&
        compareValue.some(item => deepEqual(fieldValue, item));

    case Operators.NOT_IN:
      return !Array.isArray(compareValue) ||
        !compareValue.some(item => deepEqual(fieldValue, item));

    case Operators.REGEX:
      if (typeof fieldValue === 'string' && typeof compareValue === 'string') {
        try {
          const regex = new RegExp(compareValue, caseSensitive ? 'g' : 'gi');
          return regex.test(fieldValue);
        } catch {
          return false;
        }
      }
      return false;

    default:
      return false;
  }
}

/**
 * Generate AI-enhanced reasoning for the nested field operation
 */
function generateNestedFieldReasoning(
  field: string,
  operator: Operators,
  value: any,
  originalCount: number,
  filteredCount: number,
  executionTime: number,
  caseSensitive: boolean,
  nullHandling: string,
  nestingDepth: number
): string {
  const filterRatio = originalCount > 0 ? (filteredCount / originalCount) * 100 : 0;
  const operatorDescription = getOperatorDescription(operator);

  let reasoning = `Applied nested field filter on '${field}' (${nestingDepth} level${nestingDepth > 1 ? 's' : ''} deep) `;
  reasoning += `using '${operatorDescription}' operator with value '${JSON.stringify(value)}'. `;

  if (!caseSensitive && typeof value === 'string') {
    reasoning += 'Used case-insensitive string matching. ';
  }

  if (nullHandling !== 'exclude') {
    reasoning += `Null handling: ${nullHandling}. `;
  }

  reasoning += `Filtered ${originalCount} items down to ${filteredCount} items `;
  reasoning += `(${filterRatio.toFixed(1)}% retention). `;

  // Add performance insight
  if (executionTime < 30) {
    reasoning += 'Nested field access executed very efficiently. ';
  } else if (executionTime < 150) {
    reasoning += 'Nested field access executed efficiently. ';
  } else {
    reasoning += `Nested field access took ${executionTime}ms - deep nesting impacts performance. `;
  }

  // Add nesting specific insights
  if (nestingDepth > 3) {
    reasoning += `Deep nesting (${nestingDepth} levels) required careful traversal. `;
  }

  // Add selectivity insights
  if (filterRatio < 10) {
    reasoning += 'Highly selective nested filter - good for precise queries.';
  } else if (filterRatio > 80) {
    reasoning += 'Broad nested filter - most items matched the criteria.';
  } else {
    reasoning += 'Balanced nested filter selectivity achieved.';
  }

  return reasoning;
}

/**
 * Get human-readable description of operator
 */
function getOperatorDescription(operator: Operators): string {
  const descriptions: Partial<Record<Operators, string>> = {
    [Operators.EQUALS]: 'equals',
    [Operators.NOT_EQUALS]: 'not equals',
    [Operators.GREATER_THAN]: 'greater than',
    [Operators.GREATER_THAN_OR_EQUAL]: 'greater than or equal',
    [Operators.LESS_THAN]: 'less than',
    [Operators.LESS_THAN_OR_EQUAL]: 'less than or equal',
    [Operators.CONTAINS]: 'contains',
    [Operators.STARTS_WITH]: 'starts with',
    [Operators.ENDS_WITH]: 'ends with',
    [Operators.IN]: 'is in list',
    [Operators.NOT_IN]: 'is not in list',
    [Operators.REGEX]: 'matches regex',
    [Operators.ARRAY_CONTAINS]: 'array contains',
    [Operators.ARRAY_CONTAINS_ANY]: 'array contains any',
    [Operators.ARRAY_CONTAINS_ALL]: 'array contains all',
    [Operators.EXISTS]: 'exists',
    [Operators.IS_NULL]: 'is null',
    [Operators.IS_NOT_NULL]: 'is not null'
  };

  return descriptions[operator] || operator;
}

/**
 * Calculate confidence score for the nested field operation
 */
function calculateNestedFieldConfidence(
  resultCount: number,
  totalCount: number,
  operator: Operators,
  nestingDepth: number,
  executionTime: number,
  nullHandling: string
): number {
  let confidence = 0.85; // Base confidence for nested operations

  // Adjust based on result ratio
  const ratio = totalCount > 0 ? resultCount / totalCount : 0;
  if (ratio === 0) {
    confidence = 0.6; // Lower confidence for no results
  } else if (ratio < 0.01 || ratio > 0.99) {
    confidence = 0.7; // Lower confidence for extreme selectivity
  }

  // Adjust based on nesting depth
  if (nestingDepth > 4) {
    confidence -= 0.1; // Deep nesting is more error-prone
  } else if (nestingDepth > 2) {
    confidence -= 0.05; // Moderate nesting complexity
  }

  // Adjust based on operator complexity
  if (operator === Operators.REGEX) {
    confidence -= 0.1; // Regex is more complex and error-prone
  } else if ([Operators.IN, Operators.NOT_IN].includes(operator)) {
    confidence -= 0.05; // Array operations are slightly more complex
  }

  // Adjust based on performance
  if (executionTime > 200) {
    confidence -= 0.1; // Slow nested operations are less reliable
  }

  // Adjust based on null handling
  if (nullHandling === 'treat_as_empty') {
    confidence -= 0.05; // Null coercion adds complexity
  }

  // Ensure confidence is within bounds
  return Math.max(0.0, Math.min(1.0, confidence));
}

export default filterByNestedField;