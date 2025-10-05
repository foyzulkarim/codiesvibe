import { ToolFunction, ToolParams, ToolResponse, createToolResponse, ReasoningGenerator } from './base';
import { getNestedValue, assertField, validateFieldValue } from './validators';
import { AllowedFields, Operators, FieldTypes, FieldTypeMap } from '../config/fields';

export interface FilterByDateRangeParams extends ToolParams {
  field: string;
  startDate?: string | Date;
  endDate?: string | Date;
  dateFormat?: string;
  timezone?: string;
  inclusive?: boolean;
}

/**
 * AI-Enhanced Filter by Date Range Tool
 *
 * Filters a dataset by date fields with flexible date parsing and timezone support.
 * Handles multiple date formats and provides intelligent reasoning about temporal filtering.
 */
export const filterByDateRange: ToolFunction<FilterByDateRangeParams> = (
  data: any[],
  params: FilterByDateRangeParams
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

    if (!params.startDate && !params.endDate) {
      return createToolResponse(
        [],
        'At least one of startDate or endDate must be specified',
        0.0,
        0,
        startTime,
        ['Missing date range bounds']
      );
    }

    // Validate field exists in schema
    assertField(params.field);

    const dateFormat = params.dateFormat || 'auto';
    const timezone = params.timezone || 'UTC';
    const inclusive = params.inclusive !== false; // Default to true

    // Parse dates
    const startDate = params.startDate ? parseDate(params.startDate, dateFormat, timezone) : null;
    const endDate = params.endDate ? parseDate(params.endDate, dateFormat, timezone) : null;

    if (params.startDate && !startDate) {
      return createToolResponse(
        [],
        `Invalid startDate format: ${params.startDate}`,
        0.0,
        0,
        startTime,
        ['Failed to parse startDate']
      );
    }

    if (params.endDate && !endDate) {
      return createToolResponse(
        [],
        `Invalid endDate format: ${params.endDate}`,
        0.0,
        0,
        startTime,
        ['Failed to parse endDate']
      );
    }

    if (startDate && endDate && startDate > endDate) {
      return createToolResponse(
        [],
        'startDate cannot be later than endDate',
        0.0,
        0,
        startTime,
        ['Invalid date range bounds']
      );
    }

    // Filter the data
    const filteredData = data.filter(item => {
      const fieldValue = getNestedValue(item, params.field);

      if (fieldValue === null || fieldValue === undefined) {
        return false; // Skip items with null/undefined dates
      }

      const itemDate = parseDate(fieldValue, dateFormat, timezone);

      if (!itemDate) {
        return false; // Skip items with invalid dates
      }

      return isDateInRange(itemDate, startDate, endDate, inclusive);
    });

    const executionTime = Date.now() - startTime;
    const filterRatio = data.length > 0 ? filteredData.length / data.length : 0;

    // Generate AI reasoning
    const reasoning = generateDateRangeReasoning(
      params.field,
      startDate,
      endDate,
      dateFormat,
      timezone,
      data.length,
      filteredData.length,
      executionTime,
      inclusive
    );

    // Calculate confidence
    const confidence = calculateDateRangeConfidence(
      filteredData.length,
      data.length,
      dateFormat,
      executionTime,
      startDate,
      endDate
    );

    const warnings: string[] = [];

    // Add performance warnings
    if (executionTime > 150) {
      warnings.push(`Date range filter took ${executionTime}ms - consider optimizing date parsing`);
    }

    // Add result warnings
    if (filteredData.length === 0) {
      warnings.push('No items matched the date range criteria');
    } else if (filterRatio < 0.05) {
      warnings.push(`Very selective date range filter (${(filterRatio * 100).toFixed(2)}% of data)`);
    }

    // Add date format warnings
    if (dateFormat === 'auto') {
      warnings.push('Auto date format detection may be slower than explicit formats');
    }

    // Add timezone warnings
    if (timezone !== 'UTC') {
      warnings.push(`Using timezone ${timezone} - ensure dates are correctly interpreted`);
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
      `Date range filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0.0,
      0,
      startTime,
      ['Exception occurred during date range filtering']
    );
  }
};

/**
 * Parse a date value from various formats
 */
function parseDate(
  dateValue: string | Date,
  format: string,
  timezone: string
): Date | null {
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }

  if (typeof dateValue !== 'string') {
    return null;
  }

  try {
    let date: Date | null = null;

    switch (format) {
      case 'iso':
        date = new Date(dateValue);
        break;

      case 'unix':
        const timestamp = parseInt(dateValue, 10);
        date = new Date(timestamp * 1000); // Convert to milliseconds
        break;

      case 'unix_ms':
        date = new Date(parseInt(dateValue, 10));
        break;

      case 'us':
        // US format: MM/DD/YYYY
        const usMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (usMatch && usMatch.length === 4) {
          const month = usMatch[1]!.padStart(2, '0');
          const day = usMatch[2]!.padStart(2, '0');
          const year = usMatch[3];
          date = new Date(`${year}-${month}-${day}`);
        } else {
          date = new Date(dateValue);
        }
        break;

      case 'eu':
        // European format: DD/MM/YYYY
        const euMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (euMatch && euMatch.length === 4) {
          const day = euMatch[1]!.padStart(2, '0');
          const month = euMatch[2]!.padStart(2, '0');
          const year = euMatch[3];
          date = new Date(`${year}-${month}-${day}`);
        } else {
          date = new Date(dateValue);
        }
        break;

      case 'auto':
      default:
        // Try multiple formats in order of preference
        const formats: Array<() => Date | null> = [
          // ISO 8601
          () => new Date(dateValue),
          // Unix timestamp (seconds)
          () => {
            const ts = parseInt(dateValue, 10);
            if (ts.toString() === dateValue && ts > 0 && ts < 30000000000) {
              return new Date(ts * 1000);
            }
            return null;
          },
          // Unix timestamp (milliseconds)
          () => {
            const ts = parseInt(dateValue, 10);
            if (ts.toString() === dateValue && ts > 30000000000) {
              return new Date(ts);
            }
            return null;
          },
          // US format
          () => {
            const match = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (match && match.length === 4) {
              const month = match[1]!.padStart(2, '0');
              const day = match[2]!.padStart(2, '0');
              const year = match[3];
              return new Date(`${year}-${month}-${day}`);
            }
            return null;
          },
          // European format
          () => {
            const match = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (match && match.length === 4) {
              const day = match[1]!.padStart(2, '0');
              const month = match[2]!.padStart(2, '0');
              const year = match[3];
              return new Date(`${year}-${month}-${day}`);
            }
            return null;
          }
        ];

        for (const formatFn of formats) {
          try {
            date = formatFn();
            if (date && !isNaN(date.getTime())) {
              break;
            }
          } catch {
            continue;
          }
        }

        if (!date || isNaN(date.getTime())) {
          date = new Date(dateValue); // Fallback to native parsing
        }
    }

    if (!date || isNaN(date.getTime())) {
      return null;
    }

    return date;

  } catch {
    return null;
  }
}

/**
 * Check if a date falls within the specified range
 */
function isDateInRange(
  date: Date,
  startDate: Date | null,
  endDate: Date | null,
  inclusive: boolean
): boolean {
  if (startDate && endDate) {
    if (inclusive) {
      return date >= startDate && date <= endDate;
    } else {
      return date > startDate && date < endDate;
    }
  } else if (startDate) {
    if (inclusive) {
      return date >= startDate;
    } else {
      return date > startDate;
    }
  } else if (endDate) {
    if (inclusive) {
      return date <= endDate;
    } else {
      return date < endDate;
    }
  }

  return true; // No range specified
}

/**
 * Format a date for display
 */
function formatDate(date: Date, timezone: string): string {
  try {
    if (timezone === 'UTC') {
      return date.toISOString().split('T')[0] || date.toISOString();
    }

    return date.toLocaleDateString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) || date.toISOString();
  } catch {
    return date.toISOString();
  }
}

/**
 * Generate AI-enhanced reasoning for the date range operation
 */
function generateDateRangeReasoning(
  field: string,
  startDate: Date | null,
  endDate: Date | null,
  dateFormat: string,
  timezone: string,
  originalCount: number,
  filteredCount: number,
  executionTime: number,
  inclusive: boolean
): string {
  const filterRatio = originalCount > 0 ? (filteredCount / originalCount) * 100 : 0;

  let reasoning = `Applied date range filter on field '${field}' `;

  if (startDate && endDate) {
    reasoning += `for dates between ${formatDate(startDate, timezone)} and ${formatDate(endDate, timezone)}`;
  } else if (startDate) {
    reasoning += `for dates after ${formatDate(startDate, timezone)}`;
  } else if (endDate) {
    reasoning += `for dates before ${formatDate(endDate, timezone)}`;
  }

  reasoning += ` (${dateFormat} format, ${timezone} timezone)`;

  if (!inclusive) {
    reasoning += ' with exclusive bounds';
  }

  reasoning += `. Filtered ${originalCount} items down to ${filteredCount} items `;
  reasoning += `(${filterRatio.toFixed(1)}% retention). `;

  // Add performance insight
  if (executionTime < 30) {
    reasoning += 'Date range filtering executed very efficiently. ';
  } else if (executionTime < 150) {
    reasoning += 'Date range filtering executed efficiently. ';
  } else {
    reasoning += `Date range filtering took ${executionTime}ms - consider date indexing. `;
  }

  // Add temporal insights
  if (startDate && endDate) {
    const rangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (rangeDays < 1) {
      reasoning += 'Same-day filtering provides precise temporal selection.';
    } else if (rangeDays < 30) {
      reasoning += 'Monthly range filtering for balanced temporal scope.';
    } else if (rangeDays < 365) {
      reasoning += 'Yearly range filtering for broader temporal analysis.';
    } else {
      reasoning += 'Multi-year range filtering for long-term trend analysis.';
    }
  }

  // Add selectivity insights
  if (filterRatio < 10) {
    reasoning += ' Highly selective temporal filter - good for precise time periods.';
  } else if (filterRatio > 80) {
    reasoning += ' Broad temporal filter - most items fall within this time range.';
  } else {
    reasoning += ' Balanced temporal filtering achieved.';
  }

  return reasoning;
}

/**
 * Calculate confidence score for the date range operation
 */
function calculateDateRangeConfidence(
  resultCount: number,
  totalCount: number,
  dateFormat: string,
  executionTime: number,
  startDate: Date | null,
  endDate: Date | null
): number {
  let confidence = 0.85; // Base confidence for date operations

  // Adjust based on result ratio
  const ratio = totalCount > 0 ? resultCount / totalCount : 0;
  if (ratio === 0) {
    confidence = 0.6; // Lower confidence for no results
  } else if (ratio < 0.01 || ratio > 0.99) {
    confidence = 0.7; // Lower confidence for extreme selectivity
  }

  // Adjust based on date format complexity
  if (dateFormat === 'auto') {
    confidence -= 0.1; // Auto detection is less certain
  } else if (['us', 'eu'].includes(dateFormat)) {
    confidence -= 0.05; // Ambiguous formats are less certain
  }

  // Adjust based on performance
  if (executionTime > 150) {
    confidence -= 0.1; // Slow date parsing is less reliable
  }

  // Adjust based on range specificity
  if (startDate && endDate) {
    const rangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (rangeDays < 1) {
      confidence += 0.05; // Same-day filtering is more precise
    } else if (rangeDays > 3650) { // 10+ years
      confidence -= 0.05; // Very broad ranges are less meaningful
    }
  }

  // Ensure confidence is within bounds
  return Math.max(0.0, Math.min(1.0, confidence));
}

export default filterByDateRange;