import { ToolFunction, ToolParams, ToolResponse, createToolResponse, ReasoningGenerator } from './base';
import { getNestedValue, assertField, hasNestedPath } from './validators';
import { AllowedFields, Operators } from '../config/fields';

export interface FilterByExistsParams extends ToolParams {
  field: string;
  exists: boolean;
  checkNull?: boolean;
  checkUndefined?: boolean;
  checkEmpty?: boolean;
  strict?: boolean;
}

/**
 * AI-Enhanced Filter by Field Existence Tool
 *
 * Filters a dataset by checking if fields exist, are null, undefined, or empty.
 * Supports various existence checking modes with intelligent reasoning about data completeness.
 */
export const filterByExists: ToolFunction<FilterByExistsParams> = (
  data: any[],
  params: FilterByExistsParams
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

    if (typeof params.exists !== 'boolean') {
      return createToolResponse(
        [],
        'Exists parameter must be a boolean',
        0.0,
        0,
        startTime,
        ['Invalid exists parameter']
      );
    }

    // Validate field exists in schema (for known fields)
    const fieldParts = params.field.split('.');
    if (fieldParts.length > 0 && fieldParts[0]) {
      try {
        assertField(fieldParts[0]);
      } catch {
        // For unknown fields, we still allow the operation but note it in reasoning
      }
    }

    const checkNull = params.checkNull !== false; // Default to true
    const checkUndefined = params.checkUndefined !== false; // Default to true
    const checkEmpty = params.checkEmpty === true; // Default to false (empty is different from null/undefined)
    const strict = params.strict === true; // Default to false

    // Filter the data
    const filteredData = data.filter(item => {
      return checkFieldExists(
        item,
        params.field,
        params.exists,
        checkNull,
        checkUndefined,
        checkEmpty,
        strict
      );
    });

    const executionTime = Date.now() - startTime;
    const filterRatio = data.length > 0 ? filteredData.length / data.length : 0;

    // Analyze field presence statistics
    const stats = analyzeFieldPresence(data, params.field);

    // Generate AI reasoning
    const reasoning = generateExistsReasoning(
      params.field,
      params.exists,
      checkNull,
      checkUndefined,
      checkEmpty,
      strict,
      data.length,
      filteredData.length,
      executionTime,
      stats
    );

    // Calculate confidence
    const confidence = calculateExistsConfidence(
      filteredData.length,
      data.length,
      params.exists,
      executionTime,
      stats
    );

    const warnings: string[] = [];

    // Add performance warnings
    if (executionTime > 100) {
      warnings.push(`Field existence filter took ${executionTime}ms - consider optimizing field access`);
    }

    // Add result warnings
    if (filteredData.length === 0) {
      warnings.push('No items matched the field existence criteria');
    } else if (filterRatio < 0.05) {
      warnings.push(`Very selective existence filter (${(filterRatio * 100).toFixed(2)}% of data)`);
    }

    // Add field analysis warnings
    if (stats.totalCount === 0) {
      warnings.push(`Field '${params.field}' not found in any items`);
    } else if (stats.nullCount === stats.totalCount && params.exists) {
      warnings.push(`Field '${params.field}' exists but is always null`);
    }

    // Add strict mode warnings
    if (strict && filterRatio < 0.1) {
      warnings.push('Strict mode is very restrictive - consider relaxed criteria');
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
      `Field existence filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0.0,
      0,
      startTime,
      ['Exception occurred during field existence filtering']
    );
  }
};

/**
 * Check if a field exists in an object based on the specified criteria
 */
function checkFieldExists(
  item: any,
  field: string,
  exists: boolean,
  checkNull: boolean,
  checkUndefined: boolean,
  checkEmpty: boolean,
  strict: boolean
): boolean {
  if (strict) {
    // Strict mode: field must exist with the exact same structure
    const pathExists = hasNestedPath(item, field);

    if (!pathExists) {
      return !exists; // Field doesn't exist, return true if we're looking for non-existence
    }

    if (exists) {
      // Field exists, check if it's not null/undefined/empty
      const value = getNestedValue(item, field);

      if (checkNull && value === null) return false;
      if (checkUndefined && value === undefined) return false;
      if (checkEmpty && isEmpty(value)) return false;

      return true;
    } else {
      // We're looking for non-existence, but field exists
      return false;
    }
  } else {
    // Relaxed mode: various levels of existence checking
    if (exists) {
      // Looking for existence - field must exist and not be null/undefined/empty
      const value = getNestedValue(item, field);

      if (value === undefined && checkUndefined) return false;
      if (value === null && checkNull) return false;
      if (checkEmpty && isEmpty(value)) return false;

      return true;
    } else {
      // Looking for non-existence - field doesn't exist or is null/undefined/empty
      const value = getNestedValue(item, field);

      if (value === undefined && checkUndefined) return true;
      if (value === null && checkNull) return true;
      if (checkEmpty && isEmpty(value)) return true;

      // If we get here, the field exists and has a non-empty value
      return false;
    }
  }
}

/**
 * Check if a value should be considered "empty"
 */
function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * Analyze field presence statistics across the dataset
 */
function analyzeFieldPresence(data: any[], field: string): {
  totalCount: number;
  existsCount: number;
  nullCount: number;
  undefinedCount: number;
  emptyCount: number;
  hasValueCount: number;
} {
  let existsCount = 0;
  let nullCount = 0;
  let undefinedCount = 0;
  let emptyCount = 0;
  let hasValueCount = 0;

  for (const item of data) {
    const pathExists = hasNestedPath(item, field);

    if (pathExists) {
      existsCount++;
      const value = getNestedValue(item, field);

      if (value === null) {
        nullCount++;
      } else if (value === undefined) {
        undefinedCount++;
      } else if (isEmpty(value)) {
        emptyCount++;
      } else {
        hasValueCount++;
      }
    }
  }

  return {
    totalCount: data.length,
    existsCount,
    nullCount,
    undefinedCount,
    emptyCount,
    hasValueCount
  };
}

/**
 * Generate AI-enhanced reasoning for the field existence operation
 */
function generateExistsReasoning(
  field: string,
  exists: boolean,
  checkNull: boolean,
  checkUndefined: boolean,
  checkEmpty: boolean,
  strict: boolean,
  originalCount: number,
  filteredCount: number,
  executionTime: number,
  stats: ReturnType<typeof analyzeFieldPresence>
): string {
  const filterRatio = originalCount > 0 ? (filteredCount / originalCount) * 100 : 0;

  let reasoning = `Applied field existence filter on '${field}' `;

  if (exists) {
    reasoning += 'for items where the field exists';
  } else {
    reasoning += 'for items where the field does not exist';
  }

  if (exists) {
    const criteria = [];
    if (checkNull) criteria.push('non-null');
    if (checkUndefined) criteria.push('defined');
    if (checkEmpty) criteria.push('non-empty');

    if (criteria.length > 0) {
      reasoning += ` (${criteria.join(', ')})`;
    }
  } else {
    const criteria = [];
    if (checkNull) criteria.push('null');
    if (checkUndefined) criteria.push('undefined');
    if (checkEmpty) criteria.push('empty');

    if (criteria.length > 0) {
      reasoning += ` (${criteria.join(' or ')})`;
    }
  }

  if (strict) {
    reasoning += ' using strict path checking';
  }

  reasoning += `. Filtered ${originalCount} items down to ${filteredCount} items `;
  reasoning += `(${filterRatio.toFixed(1)}% retention). `;

  // Add field analysis insights
  if (stats.totalCount > 0) {
    const fieldPresenceRate = (stats.existsCount / stats.totalCount) * 100;
    reasoning += `Field exists in ${stats.existsCount}/${stats.totalCount} items (${fieldPresenceRate.toFixed(1)}%). `;

    if (exists) {
      if (stats.hasValueCount > 0) {
        reasoning += `${stats.hasValueCount} items have actual values. `;
      }
      if (stats.nullCount > 0) {
        reasoning += `${stats.nullCount} items have null values. `;
      }
      if (stats.undefinedCount > 0) {
        reasoning += `${stats.undefinedCount} items have undefined values. `;
      }
      if (stats.emptyCount > 0) {
        reasoning += `${stats.emptyCount} items have empty values. `;
      }
    }
  }

  // Add performance insight
  if (executionTime < 20) {
    reasoning += 'Field existence check executed very efficiently. ';
  } else if (executionTime < 100) {
    reasoning += 'Field existence check executed efficiently. ';
  } else {
    reasoning += `Field existence check took ${executionTime}ms - deep field access may be slow. `;
  }

  // Add selectivity insights
  if (exists) {
    if (filterRatio < 10) {
      reasoning += 'Very selective existence filter - few items have this field populated.';
    } else if (filterRatio > 80) {
      reasoning += 'Broad existence filter - most items have this field populated.';
    } else {
      reasoning += 'Balanced field existence filtering achieved.';
    }
  } else {
    if (filterRatio < 10) {
      reasoning += 'Very selective non-existence filter - few items are missing this field.';
    } else if (filterRatio > 80) {
      reasoning += 'Broad non-existence filter - many items are missing this field.';
    } else {
      reasoning += 'Balanced field non-existence filtering achieved.';
    }
  }

  // Add mode-specific insights
  if (strict) {
    reasoning += ' Strict mode ensures precise path matching.';
  } else {
    reasoning += ' Relaxed mode provides flexible existence checking.';
  }

  return reasoning;
}

/**
 * Calculate confidence score for the field existence operation
 */
function calculateExistsConfidence(
  resultCount: number,
  totalCount: number,
  exists: boolean,
  executionTime: number,
  stats: ReturnType<typeof analyzeFieldPresence>
): number {
  let confidence = 0.9; // Base confidence for existence operations

  // Adjust based on result ratio
  const ratio = totalCount > 0 ? resultCount / totalCount : 0;
  if (ratio === 0) {
    confidence = 0.6; // Lower confidence for no results
  } else if (ratio < 0.01 || ratio > 0.99) {
    confidence = 0.7; // Lower confidence for extreme selectivity
  }

  // Adjust based on field statistics
  if (stats.totalCount > 0) {
    const fieldPresenceRate = stats.existsCount / stats.totalCount;

    if (exists && fieldPresenceRate < 0.1) {
      confidence -= 0.1; // Looking for existence when field is rare
    } else if (!exists && fieldPresenceRate > 0.9) {
      confidence -= 0.1; // Looking for non-existence when field is common
    } else {
      confidence += 0.05; // Expected distribution
    }
  }

  // Adjust based on performance
  if (executionTime > 100) {
    confidence -= 0.1; // Slow field access is less reliable
  }

  // Ensure confidence is within bounds
  return Math.max(0.0, Math.min(1.0, confidence));
}

export default filterByExists;