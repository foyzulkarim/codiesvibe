import { ToolFunction, ToolParams, ToolResponse, createToolResponse } from './base';
import { getNestedValue, assertField } from './validators';

export interface SearchByKeywordsParams extends ToolParams {
  query: string;
  fuzzyMatch?: boolean;
  threshold?: number;
  fields?: string[];
}

export const searchByKeywords: ToolFunction<SearchByKeywordsParams> = (data, params) => {
  const startTime = Date.now();

  try {
    const query = params.query?.trim();
    if (!query) {
      return createToolResponse([], 'Query required', 0, 0, startTime, ['Empty query']);
    }

    const fields = params.fields || ['searchKeywords', 'name', 'description'];
    const fuzzy = params.fuzzyMatch !== false;
    const threshold = params.threshold || 0.7;

    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);
    const results = [];

    for (const item of data) {
      let matchScore = 0;
      const matchedTerms = [];

      for (const field of fields) {
        const fieldValue = getNestedValue(item, field);
        if (fieldValue == null) continue;

        const fieldStr = String(fieldValue).toLowerCase();

        for (const keyword of keywords) {
          if (fieldStr.includes(keyword)) {
            matchScore += 1;
            matchedTerms.push(keyword);
          } else if (fuzzy) {
            const similarity = calculateSimilarity(fieldStr, keyword);
            if (similarity >= threshold) {
              matchScore += similarity;
              matchedTerms.push(keyword);
            }
          }
        }
      }

      if (matchScore > 0) {
        results.push({ ...item, __matchScore: matchScore, __matchedTerms: matchedTerms });
      }
    }

    results.sort((a, b) => b.__matchScore - a.__matchScore);

    const reasoning = `Searched ${data.length} items for keywords: "${keywords.join(', ')}" using ${fuzzy ? 'fuzzy' : 'exact'} matching. Found ${results.length} matches.`;
    const confidence = results.length > 0 ? 0.9 : 0.6;

    return createToolResponse(results, reasoning, confidence, data.length, startTime);

  } catch (error) {
    return createToolResponse([], `Search failed: ${error}`, 0, 0, startTime, ['Error']);
  }
};

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;

  const editDistance = longer.length - [...longer].filter((char, i) => char === shorter[i]).length;
  return (longer.length - editDistance) / longer.length;
}

export default searchByKeywords;