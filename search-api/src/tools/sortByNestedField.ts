import { ToolFunction, ToolParams, ToolResponse, createToolResponse, ReasoningGenerator } from './base';
import { getNestedValue, assertField, normalizeFieldPath } from './validators';
import { AllowedFields, FieldTypes, FieldTypeMap } from '../config/fields';

export interface SortByNestedFieldParams extends ToolParams {
  path: string;
  order?: 'asc' | 'desc';
  nullsFirst?: boolean;
  caseSensitive?: boolean;
  numeric?: boolean;
  undefinedAsNull?: boolean;
}

/**
 * AI-Enhanced Sort by Nested Field Tool
 *
 * Sorts a dataset by nested object properties with deep path traversal and intelligent
 * handling of missing paths, null/undefined values, and type conversion. Provides detailed
 * reasoning about the nested sorting strategy and data structure insights.
 */
export const sortByNestedField: ToolFunction<SortByNestedFieldParams> = (
  data: any[],
  params: SortByNestedFieldParams
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

    if (!params.path || typeof params.path !== 'string') {
      return createToolResponse(
        [],
        'Path parameter is required and must be a string',
        0.0,
        0,
        startTime,
        ['Missing or invalid path parameter']
      );
    }

    // Normalize and validate the nested path
    const normalizedPath = normalizeFieldPath(params.path);
    const pathParts = normalizedPath.split('.');

    // Validate root field if it's a known field
    if (pathParts.length > 0 && pathParts[0]) {
      try {
        assertField(pathParts[0]);
      } catch {
        // For unknown fields, we still allow the operation but note it in reasoning
      }
    }

    const order = params.order || 'asc';
    const nullsFirst = params.nullsFirst !== false; // Default to true
    const caseSensitive = params.caseSensitive !== false; // Default to true
    const numeric = params.numeric === true; // Default to false
    const undefinedAsNull = params.undefinedAsNull !== false; // Default to true

    // Create a stable copy of the data for sorting
    const sortableData = [...data];

    // Analyze nested field values before sorting
    const fieldAnalysis = analyzeNestedFieldValues(sortableData, normalizedPath);

    // Sort the data
    const sortedData = sortableData.sort((a, b) => {
      return compareNestedFieldValues(
        a,
        b,
        normalizedPath,
        order,
        nullsFirst,
        caseSensitive,
        numeric,
        undefinedAsNull
      );
    });

    const executionTime = Date.now() - startTime;

    // Generate AI reasoning
    const reasoning = generateNestedSortReasoning(
      normalizedPath,
      pathParts.length,
      order,
      nullsFirst,
      caseSensitive,
      numeric,
      undefinedAsNull,
      data.length,
      executionTime,
      fieldAnalysis
    );

    // Calculate confidence
    const confidence = calculateNestedSortConfidence(
      data.length,
      executionTime,
      fieldAnalysis,
      pathParts.length,
      order,
      numeric
    );

    const warnings: string[] = [];

    // Add performance warnings
    if (executionTime > 150) {
      warnings.push(`Nested sort took ${executionTime}ms - deep path access impacts performance`);
    }

    // Add nesting warnings
    if (pathParts.length > 4) {
      warnings.push(`Very deep nesting (${pathParts.length} levels) - consider data structure optimization`);
    }

    // Add data quality warnings
    if (fieldAnalysis.missingPathCount > data.length * 0.5) {
      warnings.push(`Path '${normalizedPath}' missing in ${fieldAnalysis.missingPathCount}/${data.length} items`);
    }

    if (fieldAnalysis.typeDiversity > 3) {
      warnings.push(`Nested field has mixed data types - sorting may be unpredictable`);
    }

    // Add sorting warnings
    if (numeric && !fieldAnalysis.hasNumbers) {
      warnings.push('Numeric sorting enabled but no numeric values found in nested field');
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
      `Nested sort operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0.0,
      0,
      startTime,
      ['Exception occurred during nested field sorting']
    );
  }
};

/**
 * Compare two nested field values for sorting
 */
function compareNestedFieldValues(
  a: any,
  b: any,
  path: string,
  order: 'asc' | 'desc',
  nullsFirst: boolean,
  caseSensitive: boolean,
  numeric: boolean,
  undefinedAsNull: boolean
): number {
  const aValue = getNestedValue(a, path);
  const bValue = getNestedValue(b, path);

  // Handle undefined based on configuration
  const aProcessed = aValue === undefined ? (undefinedAsNull ? null : undefined) : aValue;
  const bProcessed = bValue === undefined ? (undefinedAsNull ? null : undefined) : bValue;

  // Handle null/undefined values
  if (aProcessed == null && bProcessed == null) {
    return 0; // Both null, maintain stable order
  }

  if (aProcessed == null) {
    return nullsFirst ? -1 : 1;
  }

  if (bProcessed == null) {
    return nullsFirst ? 1 : -1;
  }

  // Perform the actual comparison
  let comparison = 0;

  if (numeric || (typeof aProcessed === 'number' && typeof bProcessed === 'number')) {
    // Numeric comparison
    const aNum = Number(aProcessed);
    const bNum = Number(bProcessed);

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
    const aStr = String(aProcessed);
    const bStr = String(bProcessed);

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
 * Analyze nested field values in the dataset
 */
function analyzeNestedFieldValues(data: any[], path: string): {
  missingPathCount: number;
  nullCount: number;
  undefinedCount: number;
  stringCount: number;
  numberCount: number;
  booleanCount: number;
  objectCount: number;
  arrayCount: number;
  hasNumbers: boolean;
  typeDiversity: number;
  uniqueValues: number;
  totalValues: number;
  pathDepth: number;
} {
  const types = new Set<string>();
  const uniqueValues = new Set<any>();
  let missingPathCount = 0;
  let nullCount = 0;
  let undefinedCount = 0;
  let stringCount = 0;
  let numberCount = 0;
  let booleanCount = 0;
  let objectCount = 0;
  let arrayCount = 0;
  let totalValues = 0;

  const pathDepth = path.split('.').length;

  for (const item of data) {
    const value = getNestedValue(item, path);

    if (value === undefined) {
      undefinedCount++;
      missingPathCount++;
      continue;
    }

    if (value === null) {
      nullCount++;
      totalValues++;
      uniqueValues.add(value);
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
    missingPathCount,
    nullCount,
    undefinedCount,
    stringCount,
    numberCount,
    booleanCount,
    objectCount,
    arrayCount,
    hasNumbers: numberCount > 0,
    typeDiversity: types.size,
    uniqueValues: uniqueValues.size,
    totalValues,
    pathDepth
  };
}

/**
 * Generate AI-enhanced reasoning for the nested sort operation
 */
function generateNestedSortReasoning(
  path: string,
  pathDepth: number,
  order: 'asc' | 'desc',
  nullsFirst: boolean,
  caseSensitive: boolean,
  numeric: boolean,
  undefinedAsNull: boolean,
  itemCount: number,
  executionTime: number,
  analysis: ReturnType<typeof analyzeNestedFieldValues>
): string {
  const hasNulls = analysis.nullCount > 0;
  const hasUndefined = analysis.undefinedCount > 0;
  const validCount = analysis.totalValues;
  const uniqueRatio = validCount > 0 ? analysis.uniqueValues / validCount : 0;
  const missingRatio = analysis.missingPathCount / itemCount;

  let reasoning = `Applied ${order === 'desc' ? 'descending' : 'ascending'} sort on nested path '${path}' (${pathDepth} level${pathDepth > 1 ? 's' : ''} deep)`;

  if (numeric) {
    reasoning += ' using numeric comparison';
  } else {
    reasoning += ` using ${caseSensitive ? 'case-sensitive' : 'case-insensitive'} string comparison`;
  }

  reasoning += `. `;

  // Add missing path handling
  if (analysis.missingPathCount > 0) {
    reasoning += `Path missing in ${analysis.missingPathCount} items (${(missingRatio * 100).toFixed(1)}% of dataset). `;
    if (undefinedAsNull) {
      reasoning += `Undefined values treated as null and positioned ${nullsFirst ? 'first' : 'last'}. `;
    } else {
      reasoning += `Undefined values positioned ${nullsFirst ? 'first' : 'last'}. `;
    }
  }

  // Add null handling
  if (hasNulls) {
    reasoning += `Found ${analysis.nullCount} null values positioned ${nullsFirst ? 'first' : 'last'}. `;
  }

  reasoning += `Sorted ${itemCount} items in ${executionTime}ms. `;

  // Add data distribution insights
  if (analysis.totalValues > 0) {
    reasoning += `Nested field contains ${analysis.totalValues} valid values with ${analysis.uniqueValues} unique entries (${(uniqueRatio * 100).toFixed(1)}% uniqueness). `;

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
      reasoning += 'Low uniqueness - many duplicate values in nested field. ';
    }
  }

  // Add performance insights
  if (executionTime < 20) {
    reasoning += 'Nested sort executed very efficiently. ';
  } else if (executionTime < 100) {
    reasoning += 'Nested sort executed efficiently. ';
  } else {
    reasoning += `Nested sort took ${executionTime}ms - deep path access impacts performance. `;
  }

  // Add nesting-specific insights
  if (pathDepth > 3) {
    reasoning += `Deep nesting (${pathDepth} levels) required careful traversal - may affect performance. `;
  }

  // Add sorting strategy insights
  if (missingRatio > 0.3) {
    reasoning += `High missing path ratio (${(missingRatio * 100).toFixed(1)}%) significantly impacts ordering. `;
  }

  if (order === 'desc') {
    reasoning += 'Descending order useful for finding highest/earliest nested values first. ';
  } else {
    reasoning += 'Ascending order useful for finding lowest/latest nested values first. ';
  }

  return reasoning;
}

/**
 * Calculate confidence score for the nested sort operation
 */
function calculateNestedSortConfidence(
  itemCount: number,
  executionTime: number,
  analysis: ReturnType<typeof analyzeNestedFieldValues>,
  pathDepth: number,
  order: 'asc' | 'desc',
  numeric: boolean
): number {
  let confidence = 0.85; // Base confidence for nested sorting operations

  // Adjust based on path depth
  if (pathDepth > 4) {
    confidence -= 0.15; // Very deep nesting reduces confidence
  } else if (pathDepth > 2) {
    confidence -= 0.05; // Moderate nesting reduces confidence
  }

  // Adjust based on data availability
  const missingRatio = analysis.missingPathCount / itemCount;
  if (missingRatio > 0.5) {
    confidence -= 0.25; // High missing ratio significantly reduces confidence
  } else if (missingRatio > 0.2) {
    confidence -= 0.1; // Moderate missing ratio reduces confidence
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
  if (executionTime > 150) {
    confidence -= 0.15; // Slow nested sorting reduces confidence
  } else if (executionTime < 30) {
    confidence += 0.05; // Fast nested sorting increases confidence
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

export default sortByNestedField;