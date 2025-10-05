import { ToolFunction, ToolParams, ToolResponse, createToolResponse } from './base';

// Skip Results
export interface SkipResultsParams extends ToolParams {
  count: number;
}

export const skipResults: ToolFunction<SkipResultsParams, any[]> = (data, params) => {
  const startTime = Date.now();
  try {
    const count = Math.max(0, params.count || 0);
    const results = data.slice(count);
    const reasoning = `Skipped first ${count} items, returning ${results.length} items from position ${count}.`;
    return createToolResponse(results, reasoning, 0.95, data.length, startTime);
  } catch (error) {
    return createToolResponse([], `Skip failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

// Intersect Results
export interface IntersectResultsParams extends ToolParams {
  compareSet: any[];
  keyField?: string;
}

export const intersectResults: ToolFunction<IntersectResultsParams, any[]> = (data, params) => {
  const startTime = Date.now();
  try {
    const compareSet = params.compareSet || [];
    const keyField = params.keyField;

    if (!Array.isArray(compareSet)) {
      return createToolResponse([], 'compareSet must be an array', 0, 0, startTime, ['Invalid compareSet']);
    }

    let results = [];
    if (keyField) {
      const compareKeys = new Set(compareSet.map((item: any) => item?.[keyField]).filter(Boolean));
      results = data.filter((item: any) => item?.[keyField] && compareKeys.has(item[keyField]));
    }

    const reasoning = `Found intersection of ${results.length} items between sets using ${keyField || 'full object comparison'}.`;
    return createToolResponse(results, reasoning, 0.9, data.length, startTime);
  } catch (error) {
    return createToolResponse([], `Intersect failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

// Union Results
export interface UnionResultsParams extends ToolParams {
  additionalSet: any[];
  keyField?: string;
  removeDuplicates?: boolean;
}

export const unionResults: ToolFunction<UnionResultsParams, any[]> = (data, params) => {
  const startTime = Date.now();
  try {
    const additionalSet = params.additionalSet || [];
    const keyField = params.keyField;
    const removeDuplicates = params.removeDuplicates !== false;

    if (!Array.isArray(additionalSet)) {
      return createToolResponse([], 'additionalSet must be an array', 0, 0, startTime, ['Invalid additionalSet']);
    }

    let results = [...data, ...additionalSet];

    if (removeDuplicates && keyField) {
      const seen = new Set();
      results = results.filter((item: any) => {
        const key = item?.[keyField];
        if (key && !seen.has(key)) {
          seen.add(key);
          return true;
        }
        return false;
      });
    }

    const reasoning = `Created union of ${results.length} items from both sets${removeDuplicates ? ' with duplicate removal' : ''}.`;
    return createToolResponse(results, reasoning, 0.9, data.length, startTime);
  } catch (error) {
    return createToolResponse([], `Union failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

// Get Difference
export interface GetDifferenceParams extends ToolParams {
  compareSet: any[];
  keyField?: string;
}

export const getDifference: ToolFunction<GetDifferenceParams, any[]> = (data, params) => {
  const startTime = Date.now();
  try {
    const compareSet = params.compareSet || [];
    const keyField = params.keyField;

    if (!Array.isArray(compareSet)) {
      return createToolResponse([], 'compareSet must be an array', 0, 0, startTime, ['Invalid compareSet']);
    }

    let results = [];
    if (keyField) {
      const compareKeys = new Set(compareSet.map((item: any) => item?.[keyField]).filter(Boolean));
      results = data.filter((item: any) => item?.[keyField] && !compareKeys.has(item[keyField]));
    }

    const reasoning = `Found difference of ${results.length} items present in primary set but not in comparison set.`;
    return createToolResponse(results, reasoning, 0.9, data.length, startTime);
  } catch (error) {
    return createToolResponse([], `Get difference failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};