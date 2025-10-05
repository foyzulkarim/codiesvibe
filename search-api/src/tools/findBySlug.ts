import { ToolFunction, ToolParams, ToolResponse, createToolResponse } from './base';
import { getNestedValue } from './validators';

export interface FindBySlugParams extends ToolParams {
  slug: string;
  field?: string;
  fuzzy?: boolean;
}

export const findBySlug: ToolFunction<FindBySlugParams> = (data, params) => {
  const startTime = Date.now();

  try {
    const slug = params.slug?.trim();
    if (!slug) {
      return createToolResponse([], 'Slug parameter is required', 0, 0, startTime, ['Missing slug']);
    }

    const field = params.field || 'slug';
    const fuzzy = params.fuzzy === true;

    let results = [];

    if (fuzzy) {
      // Fuzzy slug matching
      const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
      results = data.filter(item => {
        const fieldValue = getNestedValue(item, field);
        if (fieldValue == null) return false;
        const normalizedField = String(fieldValue).toLowerCase().replace(/[^a-z0-9-]/g, '');
        return normalizedField.includes(normalizedSlug) || normalizedSlug.includes(normalizedField);
      });
    } else {
      // Exact slug matching
      const result = data.find(item => {
        const fieldValue = getNestedValue(item, field);
        return String(fieldValue) === slug;
      });
      results = result ? [result] : [];
    }

    const reasoning = `Searched ${data.length} items for slug "${slug}" in field "${field}" using ${fuzzy ? 'fuzzy' : 'exact'} matching. Found ${results.length} matches.`;
    const confidence = results.length > 0 ? (fuzzy ? 0.8 : 0.95) : 0.4;

    return createToolResponse(results, reasoning, confidence, data.length, startTime);

  } catch (error) {
    return createToolResponse([], `Find by slug failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

export default findBySlug;