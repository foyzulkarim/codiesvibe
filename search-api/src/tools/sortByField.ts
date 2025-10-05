import { ToolFunction, ToolParams, ToolResponse, createToolResponse, ReasoningGenerator } from './base';
import { getNestedValue, assertField, validateFieldValue } from './validators';
import { AllowedFields, FieldTypes, FieldTypeMap } from '../config/fields';

export interface SortByFieldParams extends ToolParams {
  field: string;
  order?: 'asc' | 'desc';
  nullsFirst?: boolean;
  caseSensitive?: boolean;
  numeric?: boolean;
}

/**
 * AI-Enhanced Sort by Field Tool
 *
 * Sorts a dataset by a specific field with intelligent handling of null/undefined values,
 * case sensitivity, and numeric sorting. Provides detailed reasoning about sorting strategy
 * and data distribution insights.
 */
export const sortByField: ToolFunction<SortByFieldParams> = (
  data: any[],
  params: SortByFieldParams
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

    const order = params.order || 'asc';
    const nullsFirst = params.nullsFirst !== false; // Default to true
    const caseSensitive = params.caseSensitive !== false; // Default to true
    const numeric = params.numeric === true; // Default to false

    // Create a stable copy of the data for sorting
    const sortableData = [...data];

    // Analyze field values before sorting
    const fieldAnalysis = analyzeFieldValues(sortableData, params.field);

    // Sort the data
    const sortedData = sortableData.sort((a, b) => {
      return compareFieldValues(
        a,
        b,
        params.field,
        order,
        nullsFirst,
        caseSensitive,
        numeric
      );
    });

    const executionTime = Date.now() - startTime;

    // Generate AI reasoning
    const reasoning = generateSortReasoning(
      params.field,
      order,
      nullsFirst,
      caseSensitive,
      numeric,
      data.length,
      executionTime,
      fieldAnalysis
    );

    // Calculate confidence
    const confidence = calculateSortConfidence(
      data.length,
      executionTime,
      fieldAnalysis,
      order,
      numeric
    );

    const warnings: string[] = [];

    // Add performance warnings
    if (executionTime > 100) {
      warnings.push(`Sort operation took ${executionTime}ms - consider indexing field '${params.field}'`);
    }

    // Add data quality warnings
    if (fieldAnalysis.nullCount > data.length * 0.5) {
      warnings.push(`Field '${params.field}' has many null/undefined values (${fieldAnalysis.nullCount}/${data.length})`);
    }

    if (fieldAnalysis.typeDiversity > 3) {
      warnings.push(`Field '${params.field}' has mixed data types - sorting may be unpredictable`);
    }

    // Add sorting warnings
    if (numeric && !fieldAnalysis.hasNumbers) {
      warnings.push('Numeric sorting enabled but no numeric values found in field');
    }

    return createToolResponse(
      sortedData,
      reasoning,
      confidence,
      data.length,
      startTime,
      warnings.length > 0 ? warnings : undefined
    );

  } catch (error) {
    return createToolResponse(
      [],
      `Sort operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0.0,
      0,
      startTime,
      ['Exception occurred during sorting']
    );
  }
};

/**
 * Compare two field values for sorting
 */
function compareFieldValues(
  a: any,
  b: any,
  field: string,
  order: 'asc' | 'desc',
  nullsFirst: boolean,
  caseSensitive: boolean,
  numeric: boolean
): number {
  const aValue = getNestedValue(a, field);
  const bValue = getNestedValue(b, field);

  // Handle null/undefined values
  if (aValue == null && bValue == null) {
    return 0; // Both null, maintain stable order
  }

  if (aValue == null) {
    return nullsFirst ? -1 : 1;
  }

  if (bValue == null) {
    return nullsFirst ? 1 : -1;
  }

  // Perform the actual comparison
  let comparison = 0;

  if (numeric || (typeof aValue === 'number' && typeof bValue === 'number')) {
    // Numeric comparison
    const aNum = Number(aValue);
    const bNum = Number(bValue);

    if (isNaN(aNum) && isNaN(bNum)) {
      comparison = 0;
    } else if (isNaN(aNum)) {
      comparison = 1; // NaN values go last
    } else if (isNaN(bNum)) {
      comparison = -1;
    } else {
      comparison = aNum - bNum;
    }
  } else {
    // String comparison
    const aStr = String(aValue);
    const bStr = String(bValue);

    if (!caseSensitive) {
      const aLower = aStr.toLowerCase();
      const bLower = bStr.toLowerCase();
      comparison = aLower.localeCompare(bLower);
    } else {
      comparison = aStr.localeCompare(bStr);
    }
  }

  // Apply order
  return order === 'desc' ? -comparison : comparison;
}

/**
 * Analyze field values in the dataset
 */
function analyzeFieldValues(data: any[], field: string): {
  nullCount: number;
  stringCount: number;
  numberCount: number;
  booleanCount: number;
  objectCount: number;
  arrayCount: number;
  hasNumbers: boolean;
  typeDiversity: number;
  uniqueValues: number;
  totalValues: number;
} {
  const types = new Set<string>();
  const uniqueValues = new Set<any>();
  let nullCount = 0;
  let stringCount = 0;
  let numberCount = 0;
  let booleanCount = 0;
  let objectCount = 0;
  let arrayCount = 0;
  let totalValues = 0;

  for (const item of data) {
    const value = getNestedValue(item, field);

    if (value == null) {
      nullCount++;
      continue;
    }

    totalValues++;
    uniqueValues.add(value);

    const type = typeof value;
    types.add(type);

    switch (type) {
      case 'string':
        stringCount++;
        break;
      case 'number':
        numberCount++;
        break;
      case 'boolean':
        booleanCount++;
        break;
      case 'object':
        if (Array.isArray(value)) {
          arrayCount++;
        } else {
          objectCount++;
        }
        break;
    }
  }

  return {
    nullCount,
    stringCount,
    numberCount,
    booleanCount,
    objectCount,
    arrayCount,
    hasNumbers: numberCount > 0,
    typeDiversity: types.size,
    uniqueValues: uniqueValues.size,
    totalValues
  };
}

/**
 * Generate AI-enhanced reasoning for the sort operation
 */
function generateSortReasoning(
  field: string,
  order: 'asc' | 'desc',
  nullsFirst: boolean,
  caseSensitive: boolean,
  numeric: boolean,
  itemCount: number,
  executionTime: number,
  analysis: ReturnType<typeof analyzeFieldValues>
): string {
  const hasNulls = analysis.nullCount > 0;
  const validCount = analysis.totalValues;
  const uniqueRatio = validCount > 0 ? analysis.uniqueValues / validCount : 0;

  let reasoning = `Applied ${order === 'desc' ? 'descending' : 'ascending'} sort on field '${field}'`;

  if (numeric) {
    reasoning += ' using numeric comparison';
  } else {
    reasoning += ` using ${caseSensitive ? 'case-sensitive' : 'case-insensitive'} string comparison`;
  }

  reasoning += `. ${hasNulls ? `Handled ${analysis.nullCount} null/undefined values by placing them ${nullsFirst ? 'first' : 'last'}. ` : 'No null values encountered. '}`;

  reasoning += `Sorted ${itemCount} items in ${executionTime}ms. `;

  // Add data distribution insights
  if (analysis.totalValues > 0) {
    reasoning += `Field contains ${analysis.totalValues} valid values with ${analysis.uniqueValues} unique entries (${(uniqueRatio * 100).toFixed(1)}% uniqueness). `;

    // Add type distribution
    const typeInfo = [];
    if (analysis.stringCount > 0) typeInfo.push(`${analysis.stringCount} strings`);
    if (analysis.numberCount > 0) typeInfo.push(`${analysis.numberCount} numbers`);
    if (analysis.booleanCount > 0) typeInfo.push(`${analysis.booleanCount} booleans`);
    if (analysis.objectCount > 0) typeInfo.push(`${analysis.objectCount} objects`);
    if (analysis.arrayCount > 0) typeInfo.push(`${analysis.arrayCount} arrays`);

    if (typeInfo.length > 0) {
      reasoning += `Data types: ${typeInfo.join(', ')}. `;
    }

    // Add uniqueness insights
    if (uniqueRatio === 1.0) {
      reasoning += 'All values are unique - optimal for sorting. ';
    } else if (uniqueRatio > 0.8) {
      reasoning += 'High uniqueness - good sorting potential. ';
    } else if (uniqueRatio < 0.3) {
      reasoning += 'Low uniqueness - many duplicate values. ';
    }
  }

  // Add performance insights
  if (executionTime < 10) {
    reasoning += 'Sort executed very quickly using efficient algorithm. ';
  } else if (executionTime < 50) {
    reasoning += 'Sort executed efficiently with stable performance. ';
  } else {
    reasoning += `Sort took ${executionTime}ms - consider optimization for large datasets. `;
  }

  // Add sorting strategy insights
  if (hasNulls) {
    const nullRatio = analysis.nullCount / itemCount;
    if (nullRatio > 0.3) {
      reasoning += `High null ratio (${(nullRatio * 100).toFixed(1)}%) - null placement significantly impacts ordering. `;
    }
  }

  if (order === 'desc') {
    reasoning += 'Descending order useful for finding highest/earliest values first. ';
  } else {
    reasoning += 'Ascending order useful for finding lowest/latest values first. ';
  }

  return reasoning;
}

/**
 * Calculate confidence score for the sort operation
 */
function calculateSortConfidence(
  itemCount: number,
  executionTime: number,
  analysis: ReturnType<typeof analyzeFieldValues>,
  order: 'asc' | 'desc',
  numeric: boolean
): number {
  let confidence = 0.9; // Base confidence for sorting operations

  // Adjust based on data quality
  const nullRatio = analysis.nullCount / itemCount;
  if (nullRatio > 0.5) {
    confidence -= 0.2; // High null ratio reduces confidence
  } else if (nullRatio > 0.2) {
    confidence -= 0.1; // Moderate null ratio reduces confidence
  }

  // Adjust based on type consistency
  if (analysis.typeDiversity > 2) {
    confidence -= 0.15; // Mixed types reduce confidence
  } else if (analysis.typeDiversity > 1) {
    confidence -= 0.05; // Some type variation
  }

  // Adjust based on uniqueness
  const uniqueRatio = analysis.totalValues > 0 ? analysis.uniqueValues / analysis.totalValues : 0;
  if (uniqueRatio < 0.3) {
    confidence -= 0.1; // Low uniqueness makes sorting less meaningful
  }

  // Adjust based on performance
  if (executionTime > 100) {
    confidence -= 0.1; // Slow sorting reduces confidence
  } else if (executionTime < 20) {
    confidence += 0.05; // Fast sorting increases confidence
  }

  // Adjust based on numeric mode appropriateness
  if (numeric && !analysis.hasNumbers) {
    confidence -= 0.1; // Inappropriate numeric mode
  } else if (numeric && analysis.numberCount / analysis.totalValues > 0.8) {
    confidence += 0.05; // Appropriate numeric mode
  }

  // Ensure confidence is within bounds
  return Math.max(0.0, Math.min(1.0, confidence));
}

export default sortByField;