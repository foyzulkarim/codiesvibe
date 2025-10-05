import { ToolFunction, ToolParams, ToolResponse, createToolResponse } from './base';

export interface LimitResultsParams extends ToolParams {
  limit: number;
  offset?: number;
}

export const limitResults: ToolFunction<LimitResultsParams> = (data, params) => {
  const startTime = Date.now();

  try {
    const limit = Math.max(1, Math.min(params.limit || 20, 1000));
    const offset = Math.max(0, params.offset || 0);

    const startIndex = Math.min(offset, data.length);
    const endIndex = Math.min(startIndex + limit, data.length);
    const results = data.slice(startIndex, endIndex);

    const reasoning = `Applied pagination: showing ${results.length} items from position ${offset} to ${endIndex - 1} (limit: ${limit}). Total available: ${data.length} items.`;
    const confidence = 0.95;

    return createToolResponse(results, reasoning, confidence, data.length, startTime);

  } catch (error) {
    return createToolResponse([], `Limit results failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

export default limitResults;