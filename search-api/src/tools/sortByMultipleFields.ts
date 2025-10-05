import { ToolFunction, ToolParams, ToolResponse, createToolResponse, ReasoningGenerator } from './base';
import { getNestedValue, assertField, normalizeFieldPath } from './validators';
import { AllowedFields, FieldTypes, FieldTypeMap } from '../config/fields';

export interface SortField {
  field: string;
  order?: 'asc' | 'desc';
  nullsFirst?: boolean;
  caseSensitive?: boolean;
  numeric?: boolean;
}

export interface SortByMultipleFieldsParams extends ToolParams {
  fields: SortField[];
  tieBreaker?: 'stable' | 'original' | 'random';
  maxIterations?: number;
}

/**
 * AI-Enhanced Sort by Multiple Fields Tool
 *
 * Sorts a dataset by multiple fields with priority-based ordering and intelligent
 * tie-breaking strategies. Provides detailed reasoning about multi-level sorting
 * strategy and field interaction insights.
 */
export const sortByMultipleFields: ToolFunction<SortByMultipleFieldsParams> = (
  data: any[],
  params: SortByMultipleFieldsParams
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

    if (!Array.isArray(params.fields) || params.fields.length === 0) {
      return createToolResponse(
        [],
        'Fields parameter must be a non-empty array',
        0.0,
        0,
        startTime,
        ['Missing or invalid fields parameter']
      );
    }

    if (params.fields.length > 5) {
      return createToolResponse(
        [],
        'Maximum 5 sorting fields allowed for performance reasons',
        0.0,
        0,
        startTime,
        ['Too many sorting fields']
      );
    }

    const maxIterations = params.maxIterations || 1000;
    const tieBreaker = params.tieBreaker || 'stable';

    // Validate and normalize each sort field
    const normalizedFields = params.fields.map((fieldConfig, index) => {
      if (!fieldConfig.field || typeof fieldConfig.field !== 'string') {
        throw new Error(`Field ${index + 1}: field name is required and must be a string`);
      }

      // Validate field exists in schema (for known fields)
      const rootField = fieldConfig.field.split('.')[0];
      if (rootField) {
        try {
          assertField(rootField);
        } catch {
          // For unknown fields, we still allow the operation but note it in reasoning
        }
      }

      return {
        field: normalizeFieldPath(fieldConfig.field),
        order: fieldConfig.order || 'asc',
        nullsFirst: fieldConfig.nullsFirst !== false,
        caseSensitive: fieldConfig.caseSensitive !== false,
        numeric: fieldConfig.numeric === true,
        priority: index + 1
      };
    });

    // Create a stable copy of the data for sorting
    const sortableData = data.map((item, originalIndex) => ({
      ...item,
      __originalIndex: originalIndex,
      __sortKey: generateSortKey(item, normalizedFields)
    }));

    // Analyze field values before sorting
    const fieldsAnalysis = normalizedFields.map(fieldConfig => ({
      config: fieldConfig,
      analysis: analyzeFieldValues(data, fieldConfig.field)
    }));

    // Sort the data
    const sortedData = sortableData.sort((a, b) => {
      return compareMultiFieldValues(a, b, normalizedFields, tieBreaker);
    }).map(item => {
      // Remove temporary sorting metadata
      const { __originalIndex, __sortKey, ...cleanItem } = item;
      return cleanItem;
    });

    const executionTime = Date.now() - startTime;

    // Generate AI reasoning
    const reasoning = generateMultiFieldSortReasoning(
      normalizedFields,
      tieBreaker,
      data.length,
      executionTime,
      fieldsAnalysis
    );

    // Calculate confidence
    const confidence = calculateMultiFieldSortConfidence(
      data.length,
      executionTime,
      normalizedFields.length,
      fieldsAnalysis,
      tieBreaker
    );

    const warnings: string[] = [];

    // Add performance warnings
    if (executionTime > 200) {
      warnings.push(`Multi-field sort took ${executionTime}ms - consider reducing number of sort fields`);
    }

    // Add field count warnings
    if (normalizedFields.length > 3) {
      warnings.push(`Many sort fields (${normalizedFields.length}) may impact performance`);
    }

    // Add data quality warnings
    fieldsAnalysis.forEach(({ config, analysis }) => {
      const nullRatio = analysis.nullCount / data.length;
      if (nullRatio > 0.5) {
        warnings.push(`Field '${config.field}' has many null values (${(nullRatio * 100).toFixed(1)}%)`);
      }

      if (analysis.typeDiversity > 3) {
        warnings.push(`Field '${config.field}' has mixed data types - sorting may be unpredictable`);
      }
    });

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
      `Multi-field sort operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0.0,
      0,
      startTime,
      ['Exception occurred during multi-field sorting']
    );
  }
};

/**
 * Generate sort key for multi-field comparison
 */
function generateSortKey(item: any, fields: Array<any>): string[] {
  return fields.map(fieldConfig => {
    const value = getNestedValue(item, fieldConfig.field);

    if (value == null) {
      return fieldConfig.nullsFirst ? '\x00' : '\xFF'; // Special values for null handling
    }

    let sortValue: string;

    if (fieldConfig.numeric || typeof value === 'number') {
      sortValue = String(Number(value)).padStart(20, '0'); // Zero-padded numeric sorting
    } else {
      sortValue = fieldConfig.caseSensitive ? String(value) : String(value).toLowerCase();
    }

    return sortValue;
  });
}

/**
 * Compare two items using multiple fields
 */
function compareMultiFieldValues(
  a: any,
  b: any,
  fields: Array<any>,
  tieBreaker: 'stable' | 'original' | 'random'
): number {
  // Compare by each field in priority order
  for (const fieldConfig of fields) {
    const aValue = getNestedValue(a, fieldConfig.field);
    const bValue = getNestedValue(b, fieldConfig.field);

    let comparison = 0;

    // Handle null/undefined values
    if (aValue == null && bValue == null) {
      comparison = 0;
    } else if (aValue == null) {
      comparison = fieldConfig.nullsFirst ? -1 : 1;
    } else if (bValue == null) {
      comparison = fieldConfig.nullsFirst ? 1 : -1;
    } else {
      // Perform actual comparison
      if (fieldConfig.numeric || (typeof aValue === 'number' && typeof bValue === 'number')) {
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        comparison = aNum - bNum;
      } else {
        const aStr = String(aValue);
        const bStr = String(bValue);
        comparison = fieldConfig.caseSensitive
          ? aStr.localeCompare(bStr)
          : aStr.toLowerCase().localeCompare(bStr.toLowerCase());
      }
    }

    // Apply order and check if we have a decision
    const orderedComparison = fieldConfig.order === 'desc' ? -comparison : comparison;
    if (orderedComparison !== 0) {
      return orderedComparison;
    }
  }

  // All fields equal - apply tie-breaking
  return applyTieBreaker(a, b, tieBreaker);
}

/**
 * Apply tie-breaking strategy
 */
function applyTieBreaker(
  a: any,
  b: any,
  tieBreaker: 'stable' | 'original' | 'random'
): number {
  switch (tieBreaker) {
    case 'stable':
      // Use original index for stable sorting
      return (a.__originalIndex || 0) - (b.__originalIndex || 0);

    case 'original':
      // Keep original order (same as stable for our implementation)
      return (a.__originalIndex || 0) - (b.__originalIndex || 0);

    case 'random':
      // Random tie-breaking (less deterministic but useful for some cases)
      return Math.random() - 0.5;

    default:
      return 0;
  }
}

/**
 * Analyze field values for a single field
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
 * Generate AI-enhanced reasoning for multi-field sort operation
 */
function generateMultiFieldSortReasoning(
  fields: Array<any>,
  tieBreaker: string,
  itemCount: number,
  executionTime: number,
  fieldsAnalysis: Array<{ config: any; analysis: any }>
): string {
  let reasoning = `Applied multi-field sort with ${fields.length} priorit${fields.length === 1 ? 'y' : 'ies'}: `;

  reasoning += fields.map((field, index) => {
    const fieldDesc = `${field.field} (${field.order === 'desc' ? 'descending' : 'ascending'})`;
    return index === 0 ? fieldDesc : `then ${fieldDesc}`;
  }).join(', ');

  reasoning += `. Used ${tieBreaker} tie-breaking for completely equal items. `;

  reasoning += `Sorted ${itemCount} items in ${executionTime}ms. `;

  // Add field analysis insights
  let totalNulls = 0;
  let totalValidValues = 0;
  let totalUnique = 0;

  fieldsAnalysis.forEach(({ config, analysis }) => {
    totalNulls += analysis.nullCount;
    totalValidValues += analysis.totalValues;
    totalUnique += analysis.uniqueValues;

    if (analysis.nullCount > 0) {
      const nullRatio = analysis.nullCount / itemCount;
      reasoning += `Field '${config.field}' has ${analysis.nullCount} null values (${(nullRatio * 100).toFixed(1)}%). `;
    }

    if (analysis.typeDiversity > 1) {
      reasoning += `Field '${config.field}' contains mixed data types. `;
    }
  });

  // Add overall data insights
  if (totalValidValues > 0) {
    const avgUniqueness = totalUnique / totalValidValues;
    reasoning += `Average field uniqueness: ${(avgUniqueness * 100).toFixed(1)}%. `;

    if (avgUniqueness > 0.9) {
      reasoning += 'High uniqueness across fields provides good sort discrimination. ';
    } else if (avgUniqueness < 0.3) {
      reasoning += 'Low uniqueness may result in many ties requiring tie-breaking. ';
    }
  }

  // Add performance insights
  if (executionTime < 50) {
    reasoning += 'Multi-field sort executed very efficiently. ';
  } else if (executionTime < 150) {
    reasoning += 'Multi-field sort executed efficiently. ';
  } else {
    reasoning += `Multi-field sort took ${executionTime}ms - consider reducing field count. `;
  }

  // Add sorting strategy insights
  reasoning += `Priority-based sorting ensures primary field (${fields[0].field}) dominates ordering, `;

  if (fields.length > 1) {
    reasoning += `with ${fields.length - 1} secondary field${fields.length - 1 === 1 ? '' : 's'} providing fine-grained control. `;
  } else {
    reasoning += 'with no secondary sorting criteria. ';
  }

  // Add tie-breaking insights
  if (tieBreaker === 'stable') {
    reasoning += 'Stable tie-breaking preserves original order for equal items. ';
  } else if (tieBreaker === 'random') {
    reasoning += 'Random tie-breaking introduces variability for equal items. ';
  }

  return reasoning;
}

/**
 * Calculate confidence score for multi-field sort operation
 */
function calculateMultiFieldSortConfidence(
  itemCount: number,
  executionTime: number,
  fieldCount: number,
  fieldsAnalysis: Array<{ config: any; analysis: any }>,
  tieBreaker: string
): number {
  let confidence = 0.85; // Base confidence for multi-field sorting

  // Adjust based on field count
  if (fieldCount > 4) {
    confidence -= 0.1; // Many fields reduce confidence
  } else if (fieldCount > 2) {
    confidence -= 0.05; // Moderate field count
  }

  // Adjust based on data quality across all fields
  let totalNullRatio = 0;
  let totalTypeDiversity = 0;

  fieldsAnalysis.forEach(({ analysis }) => {
    totalNullRatio += analysis.nullCount / itemCount;
    totalTypeDiversity += analysis.typeDiversity;
  });

  const avgNullRatio = totalNullRatio / fieldCount;
  const avgTypeDiversity = totalTypeDiversity / fieldCount;

  if (avgNullRatio > 0.4) {
    confidence -= 0.15; // High null ratio across fields
  } else if (avgNullRatio > 0.2) {
    confidence -= 0.05; // Moderate null ratio
  }

  if (avgTypeDiversity > 2) {
    confidence -= 0.1; // Mixed types across fields
  } else if (avgTypeDiversity > 1.5) {
    confidence -= 0.05; // Some type variation
  }

  // Adjust based on performance
  if (executionTime > 200) {
    confidence -= 0.15; // Slow multi-field sorting
  } else if (executionTime < 50) {
    confidence += 0.05; // Fast sorting
  }

  // Adjust based on tie-breaker
  if (tieBreaker === 'random') {
    confidence -= 0.05; // Random tie-breaking is less predictable
  }

  // Ensure confidence is within bounds
  return Math.max(0.0, Math.min(1.0, confidence));
}

export default sortByMultipleFields;