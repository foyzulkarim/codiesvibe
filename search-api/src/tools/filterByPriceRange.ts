import { Tool } from '../types';
import { AllowedFields, FieldTypes } from '../config/fields';
import { createToolResponse, ToolParams, ToolResponse, ToolFunction, ReasoningGenerator } from './base';
import { assertField, getFieldType } from './validators';

export interface FilterByPriceRangeParams extends ToolParams {
  field: AllowedFields;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
}

/**
 * Validates input parameters for price range filtering
 */
function validateInput(params: FilterByPriceRangeParams): void {
  if (!params.field) {
    throw new Error('Field parameter is required');
  }

  assertField(params.field);
  
  const fieldType = getFieldType(params.field);
  if (fieldType !== FieldTypes.NUMBER && fieldType !== FieldTypes.STRING) {
    throw new Error(`Field ${params.field} must be a number or string type for price filtering`);
  }

  if (params.minPrice !== undefined && params.maxPrice !== undefined) {
    if (params.minPrice > params.maxPrice) {
      throw new Error('minPrice cannot be greater than maxPrice');
    }
  }

  if (params.minPrice !== undefined && params.minPrice < 0) {
    throw new Error('minPrice cannot be negative');
  }

  if (params.maxPrice !== undefined && params.maxPrice < 0) {
    throw new Error('maxPrice cannot be negative');
  }

  if (params.minPrice === undefined && params.maxPrice === undefined) {
    throw new Error('At least one of minPrice or maxPrice must be specified');
  }
}

/**
 * Extracts numeric price value from various formats
 */
function extractPriceValue(value: any): number | null {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Remove currency symbols and whitespace, then parse
    const cleaned = value.replace(/[$€£¥₹₽¢]/g, '').replace(/[,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

/**
 * Checks if a price value falls within the specified range
 */
function isPriceInRange(price: number, minPrice?: number, maxPrice?: number): boolean {
  if (minPrice !== undefined && price < minPrice) {
    return false;
  }
  
  if (maxPrice !== undefined && price > maxPrice) {
    return false;
  }
  
  return true;
}

/**
 * Filters data based on price range criteria
 */
function filterData(data: any[], params: FilterByPriceRangeParams): any[] {
  return data.filter(item => {
    const fieldValue = item[params.field];
    const priceValue = extractPriceValue(fieldValue);
    
    if (priceValue === null) {
      return false; // Skip items with invalid price values
    }
    
    return isPriceInRange(priceValue, params.minPrice, params.maxPrice);
  });
}

/**
 * Generates AI reasoning for price range filtering
 */
function generateReasoning(params: FilterByPriceRangeParams, data: any[], filteredData: any[]): string {
  const { field, minPrice, maxPrice, currency } = params;
  const currencySymbol = currency || '$';
  
  let rangeDescription = '';
  if (minPrice !== undefined && maxPrice !== undefined) {
    rangeDescription = `between ${currencySymbol}${minPrice} and ${currencySymbol}${maxPrice}`;
  } else if (minPrice !== undefined) {
    rangeDescription = `at least ${currencySymbol}${minPrice}`;
  } else if (maxPrice !== undefined) {
    rangeDescription = `at most ${currencySymbol}${maxPrice}`;
  }
  
  const validPriceCount = data.filter(item => extractPriceValue(item[field]) !== null).length;
  const invalidPriceCount = data.length - validPriceCount;
  
  let reasoning = `Filtered ${data.length} items to find those with ${field} ${rangeDescription}. `;
  reasoning += `Found ${filteredData.length} matching items out of ${validPriceCount} items with valid prices.`;
  
  if (invalidPriceCount > 0) {
    reasoning += ` ${invalidPriceCount} items were excluded due to invalid or missing price values.`;
  }
  
  if (filteredData.length === 0) {
    reasoning += ` No items found in the specified price range.`;
  } else if (filteredData.length === validPriceCount) {
    reasoning += ` All items with valid prices fall within the specified range.`;
  }
  
  return reasoning;
}

/**
 * Calculates confidence score for price range filtering
 */
function calculateConfidence(params: FilterByPriceRangeParams, data: any[], filteredData: any[]): number {
  const validPriceCount = data.filter(item => extractPriceValue(item[params.field]) !== null).length;
  const invalidPriceCount = data.length - validPriceCount;
  
  let confidence = 0.9; // Base confidence for price range filtering
  
  // Reduce confidence if many items have invalid prices
  if (invalidPriceCount > 0) {
    const invalidRatio = invalidPriceCount / data.length;
    confidence -= invalidRatio * 0.3;
  }
  
  // Adjust confidence based on result distribution
  if (validPriceCount > 0) {
    const matchRatio = filteredData.length / validPriceCount;
    if (matchRatio === 0 || matchRatio === 1) {
      confidence -= 0.1; // Slightly lower confidence for edge cases
    }
  }
  
  // Boost confidence for reasonable price ranges
  if (params.minPrice !== undefined && params.maxPrice !== undefined) {
    const range = params.maxPrice - params.minPrice;
    if (range > 0 && range < 10000) { // Reasonable range
      confidence += 0.05;
    }
  }
  
  return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Tool function for filtering by price range
 */
export const filterByPriceRange: ToolFunction<FilterByPriceRangeParams> = (data: Tool[], params: FilterByPriceRangeParams): ToolResponse => {
  const startTime = Date.now();
  
  try {
    validateInput(params);
    
    const filteredData = filterData(data, params);
    const reasoning = generateReasoning(params, data, filteredData);
    const confidence = calculateConfidence(params, data, filteredData);
    
    return createToolResponse(
      filteredData,
      reasoning,
      confidence,
      filteredData.length,
      startTime
    );
  } catch (error) {
    return createToolResponse(
      [],
      `Error in price range filtering: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0.1,
      0,
      startTime,
      [error instanceof Error ? error.message : 'Unknown error occurred']
    );
  }
};

export default {
  name: 'filterByPriceRange',
  description: 'Filter items based on price range criteria with support for various currency formats',
  function: filterByPriceRange,
  metadata: {
    category: 'filtering',
    tags: ['price', 'range', 'currency', 'numeric'],
    complexity: 'medium',
    performance: 'fast'
  }
};