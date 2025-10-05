import { ToolFunction, ToolParams, ToolResponse, createToolResponse } from './base';

// Group By
export interface GroupByParams extends ToolParams {
  field: string;
  includeCount?: boolean;
}

export const groupBy: ToolFunction<GroupByParams, any[]> = (data, params) => {
  const startTime = Date.now();
  try {
    const field = params.field;
    const includeCount = params.includeCount !== false;

    const groups = new Map<string, any[]>();
    for (const item of data) {
      const key = item?.[field] == null ? 'null' : String(item[field]);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    const result = Array.from(groups.entries()).map(([key, items]) => {
      const groupResult: any = { key, items };
      if (includeCount) groupResult.count = items.length;
      return groupResult;
    });

    const reasoning = `Grouped ${data.length} items by field "${field}" into ${result.length} groups.`;
    return createToolResponse(result, reasoning, 0.9, data.length, startTime);
  } catch (error) {
    return createToolResponse([], `Group by failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

// Count By
export interface CountByParams extends ToolParams {
  field: string;
}

export const countBy: ToolFunction<CountByParams, any[]> = (data, params) => {
  const startTime = Date.now();
  try {
    const field = params.field;
    const counts = new Map<string, number>();

    for (const item of data) {
      const key = item?.[field] == null ? 'null' : String(item[field]);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const result = Array.from(counts.entries()).map(([key, count]) => ({ key, count }));
    const reasoning = `Counted occurrences of field "${field}" across ${data.length} items.`;
    return createToolResponse(result, reasoning, 0.95, data.length, startTime);
  } catch (error) {
    return createToolResponse([], `Count by failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

// Get Unique
export interface GetUniqueParams extends ToolParams {
  field: string;
}

export const getUnique: ToolFunction<GetUniqueParams, any[]> = (data, params) => {
  const startTime = Date.now();
  try {
    const field = params.field;
    const uniqueValues = new Map<string, number>();

    for (const item of data) {
      const value = item?.[field];
      if (value != null) {
        const strValue = String(value);
        uniqueValues.set(strValue, (uniqueValues.get(strValue) || 0) + 1);
      }
    }

    const result = Array.from(uniqueValues.entries()).map(([value, count]) => ({ value, count }));
    const reasoning = `Extracted ${result.length} unique values from field "${field}".`;
    return createToolResponse(result, reasoning, 0.95, data.length, startTime);
  } catch (error) {
    return createToolResponse([], `Get unique failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

// Get Min Max
export interface GetMinMaxParams extends ToolParams {
  field: string;
}

export const getMinMax: ToolFunction<GetMinMaxParams, any> = (data, params) => {
  const startTime = Date.now();
  try {
    const field = params.field;
    let min: number | null = null;
    let max: number | null = null;
    let count = 0;

    for (const item of data) {
      const value = Number(item?.[field]);
      if (!isNaN(value)) {
        if (min === null || value < min) min = value;
        if (max === null || value > max) max = value;
        count++;
      }
    }

    const result = { field, min, max, count, hasData: count > 0 };
    const reasoning = `Analyzed field "${field}" with ${count} valid numeric values. Range: [${min}, ${max}].`;
    const confidence = count > 0 ? 0.95 : 0.4;
    return createToolResponse(result, reasoning, confidence, data.length, startTime);
  } catch (error) {
    return createToolResponse([], `Get min/max failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

// Calculate Average
export interface CalculateAverageParams extends ToolParams {
  field: string;
}

export const calculateAverage: ToolFunction<CalculateAverageParams, any> = (data, params) => {
  const startTime = Date.now();
  try {
    const field = params.field;
    let sum = 0;
    let count = 0;
    const values: number[] = [];

    for (const item of data) {
      const value = Number(item?.[field]);
      if (!isNaN(value)) {
        sum += value;
        count++;
        values.push(value);
      }
    }

    if (count === 0) {
      return createToolResponse([], 'No valid numeric values found', 0.2, 0, startTime, ['No numeric data']);
    }

    const average = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const median = count > 0 ? values.sort((a, b) => a - b)[Math.floor(count / 2)] : 0;

    const result = { field, average, median, min, max, sum, count };
    const reasoning = `Calculated average for field "${field}": ${average.toFixed(2)} from ${count} values.`;
    return createToolResponse(result, reasoning, 0.9, data.length, startTime);
  } catch (error) {
    return createToolResponse([], `Calculate average failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};