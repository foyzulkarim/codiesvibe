import { ToolFunction, ToolParams, ToolResponse, createToolResponse } from './base';
import { getNestedValue, assertField } from './validators';

export interface SearchByTextParams extends ToolParams {
  query: string;
  fields?: string[];
  mode?: 'any' | 'all';
  caseSensitive?: boolean;
  includeRelevanceScore?: boolean;
}

export const searchByText: ToolFunction<SearchByTextParams, any[]> = (data, params) => {
  const startTime = Date.now();

  try {
    const query = params.query?.trim();
    if (!query) {
      return createToolResponse([], 'Query required', 0, 0, startTime, ['Empty query']);
    }

    const fields = params.fields || ['name', 'description'];
    const mode = params.mode || 'any';
    const caseSensitive = false;
    const includeRelevanceScore = params.includeRelevanceScore === true;

    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    // Pre-process field values for better performance
    const processedItems = data.map(item => ({
      item,
      fieldValues: fields.map(field => {
        const value = getNestedValue(item, field);
        return value != null 
          ? String(value).toLowerCase()
          : null;
      }).filter((value): value is string => value !== null)
    }));

    // Use filter + map for functional approach with early returns
    const results = processedItems
      .map(({ item, fieldValues }) => {
        // Use Set for O(1) lookup and avoid duplicates
        const matchedTermsSet = new Set<string>();
        
        // Short-circuit evaluation for 'all' mode
        if (mode === 'all') {
          const allTermsFound = searchTerms.every(term =>
            fieldValues.some(fieldStr => {
              if (fieldStr.includes(term)) {
                matchedTermsSet.add(term);
                return true;
              }
              return false;
            })
          );
          
          if (!allTermsFound) return null;
        } else {
          // 'any' mode - use forEach for efficient term matching
          fieldValues.forEach(fieldStr => {
            searchTerms.forEach(term => {
              if (fieldStr.includes(term)) {
                matchedTermsSet.add(term);
              }
            });
          });
        }

        const matchScore = matchedTermsSet.size;
        if (matchScore === 0) return null;

        // Use object spread with conditional properties
        return {
          ...item,
          ...(includeRelevanceScore && {
            __relevanceScore: matchScore,
            __matchedTerms: [...matchedTermsSet]
          })
        };
      })
      .filter((result): result is any => result !== null); // Remove null results efficiently

    results.sort((a, b) => (b.__relevanceScore || 0) - (a.__relevanceScore || 0));

    const reasoning = `Searched ${data.length} items for "${query}" across ${fields.length} fields using ${mode} matching. Found ${results.length} matches.`;
    const confidence = results.length > 0 ? 0.9 : 0.6;

    return createToolResponse(results, reasoning, confidence, data.length, startTime);
  } catch (error) {
    return createToolResponse([], `Search failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};