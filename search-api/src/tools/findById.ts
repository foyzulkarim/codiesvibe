import { ToolFunction, ToolParams, ToolResponse, createToolResponse } from './base';
import { getNestedValue } from './validators';

export interface FindByIdParams extends ToolParams {
  id: string;
  field?: string;
}

export const findById: ToolFunction<FindByIdParams> = (data, params) => {
  const startTime = Date.now();

  try {
    const id = params.id?.trim();
    if (!id) {
      return createToolResponse([], 'ID parameter is required', 0, 0, startTime, ['Missing ID']);
    }

    const field = params.field || 'id';
    const result = data.find(item => {
      const fieldValue = getNestedValue(item, field);
      return String(fieldValue) === id;
    });

    const results = result ? [result] : [];
    const reasoning = `Searched ${data.length} items for ID "${id}" in field "${field}". ${result ? 'Found 1 match.' : 'No matches found.'}`;
    const confidence = result ? 0.95 : 0.4;

    return createToolResponse(results, reasoning, confidence, data.length, startTime);

  } catch (error) {
    return createToolResponse([], `Find by ID failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

export default findById;