import { ToolFunction, ToolParams, ToolResponse, createToolResponse } from './base';

// Select Fields
export interface SelectFieldsParams extends ToolParams {
  fields: string[];
}

export const selectFields: ToolFunction<SelectFieldsParams, any[]> = (data, params) => {
  const startTime = Date.now();
  try {
    const fields = params.fields || [];
    if (!Array.isArray(fields) || fields.length === 0) {
      return createToolResponse([], 'Fields parameter must be a non-empty array', 0, 0, startTime, ['Invalid fields']);
    }

    const results = data.map(item => {
      const result: any = {};
      for (const field of fields) {
        if (field && typeof field === 'string') {
          result[field] = item?.[field];
        }
      }
      return result;
    });

    const reasoning = `Selected ${fields.length} fields from ${data.length} items: ${fields.join(', ')}`;
    return createToolResponse(results, reasoning, 0.95, data.length, startTime);
  } catch (error) {
    return createToolResponse([], `Select fields failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

// Exclude Fields
export interface ExcludeFieldsParams extends ToolParams {
  fields: string[];
}

export const excludeFields: ToolFunction<ExcludeFieldsParams, any[]> = (data, params) => {
  const startTime = Date.now();
  try {
    const fields = params.fields || [];
    const results = data.map(item => {
      const result = { ...item };
      for (const field of fields) {
        if (field && typeof field === 'string') {
          delete result[field];
        }
      }
      return result;
    });

    const reasoning = `Excluded ${fields.length} fields from ${data.length} items: ${fields.join(', ')}`;
    return createToolResponse(results, reasoning, 0.95, data.length, startTime);
  } catch (error) {
    return createToolResponse([], `Exclude fields failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

// Utility Tools
export interface UtilityToolsParams extends ToolParams {
  operation: 'getSchema' | 'getCurrentResults';
}

export const utilityTools: ToolFunction<UtilityToolsParams, any> = (data, params) => {
  const startTime = Date.now();
  try {
    const operation = params.operation;

    if (operation === 'getCurrentResults') {
      const summary = {
        count: data.length,
        sample: data.slice(0, 3),
        memorySize: JSON.stringify(data).length
      };
      const reasoning = `Retrieved current results summary: ${data.length} items`;
      return createToolResponse(summary, reasoning, 0.95, data.length, startTime);
    }

    if (operation === 'getSchema') {
      const fields = new Set<string>();
      for (const item of data.slice(0, 5)) {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(key => fields.add(key));
        }
      }
      const schema = { fields: Array.from(fields) };
      const reasoning = `Extracted schema from ${data.length} items. Found ${fields.size} fields.`;
      return createToolResponse(schema, reasoning, 0.9, data.length, startTime);
    }

    return createToolResponse([], 'Invalid operation', 0, 0, startTime, ['Invalid operation']);
  } catch (error) {
    return createToolResponse([], `Utility operation failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};