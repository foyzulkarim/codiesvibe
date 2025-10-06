/**
 * Multi-Field Keyword Search Tool
 *
 * Executes targeted searches across different database fields with semantic awareness.
 * This tool can search different keywords in their most appropriate fields and combine results.
 */

import { ToolFunction, ToolParams, ToolResult } from './base';
import { getOriginalDataset } from '../data/loader';
import { FieldSelection } from './intentBasedFieldSelector';

export interface FieldSearchTerm {
  term: string;
  fieldPaths: string[];
  weight: number;
  matchStrategy: 'exact' | 'contains' | 'fuzzy';
  boostTerms?: string[];
}

export interface MultiFieldSearchResult {
  item: any;
  overallScore: number;
  fieldMatches: FieldMatch[];
  matchedTerms: string[];
}

export interface FieldMatch {
  fieldPath: string;
  value: any;
  score: number;
  matchType: 'exact' | 'partial' | 'contains' | 'fuzzy';
  highlightedValue?: string;
}

export interface MultiFieldKeywordSearchParams {
  query: string;
  fieldMappings?: FieldSelection[]; // Pre-calculated field mappings
  terms?: string[]; // Specific terms to search (if not provided, extracted from query)
  maxResults?: number;
  minScore?: number;
  includeHighlights?: boolean;
  boostFieldMatches?: boolean;
}

export interface MultiFieldSearchResultData {
  query: string;
  results: MultiFieldSearchResult[];
  totalMatched: number;
  fieldStats: Record<string, number>;
  termStats: Record<string, number>;
  executionTime: number;
  strategy: 'field_specific' | 'general' | 'hybrid';
}

/**
 * Execute multi-field keyword search with semantic field targeting
 */
export const multiFieldKeywordSearch: ToolFunction<MultiFieldKeywordSearchParams, MultiFieldSearchResultData> = async (
  params: MultiFieldKeywordSearchParams,
  context
): Promise<ToolResult<MultiFieldSearchResultData>> => {
  const startTime = Date.now();

  try {
    const {
      query,
      fieldMappings = [],
      terms,
      maxResults = 50,
      minScore = 0.1,
      includeHighlights = true,
      boostFieldMatches = true
    } = params;

    if (!query || typeof query !== 'string') {
      return {
        success: false,
        error: new Error('Query parameter is required and must be a string'),
        confidence: { score: 0.0, reason: 'Invalid query parameter' }
      };
    }

    // Get dataset
    const dataset = getOriginalDataset();
    if (!dataset || dataset.length === 0) {
      return {
        success: false,
        error: new Error('No dataset available for search'),
        confidence: { score: 0.0, reason: 'Dataset not available' }
      };
    }

    // Extract search terms if not provided
    const searchTerms = terms || extractSearchTerms(query);

    // Create field search terms
    const fieldSearchTerms = createFieldSearchTerms(searchTerms, fieldMappings, query);

    // Determine search strategy
    const strategy = fieldMappings.length > 0
      ? (searchTerms.length > 1 ? 'hybrid' : 'field_specific')
      : 'general';

    // Execute search
    const searchResults = await executeMultiFieldSearch(
      dataset,
      fieldSearchTerms,
      strategy,
      minScore,
      includeHighlights,
      boostFieldMatches
    );

    // Sort and limit results
    const sortedResults = searchResults
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, maxResults);

    // Calculate statistics
    const fieldStats = calculateFieldStats(sortedResults);
    const termStats = calculateTermStats(sortedResults);

    const resultData: MultiFieldSearchResultData = {
      query,
      results: sortedResults,
      totalMatched: searchResults.length,
      fieldStats,
      termStats,
      executionTime: Date.now() - startTime,
      strategy
    };

    const executionTime = Date.now() - startTime;
    const confidence = calculateSearchConfidence(sortedResults, searchTerms, fieldMappings);

    return {
      success: true,
      data: resultData,
      executionTime,
      confidence: {
        score: confidence,
        reason: `Found ${sortedResults.length} results using ${strategy} strategy with ${searchTerms.length} terms`
      },
      metadata: {
        totalDatasetItems: dataset.length,
        matchRate: sortedResults.length / dataset.length,
        averageScore: sortedResults.length > 0
          ? sortedResults.reduce((sum, r) => sum + r.overallScore, 0) / sortedResults.length
          : 0,
        topScore: sortedResults[0]?.overallScore || 0
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error in multi-field search'),
      executionTime: Date.now() - startTime,
      confidence: { score: 0.0, reason: 'Error during search execution' }
    };
  }
};

/**
 * Extract meaningful search terms from query
 */
function extractSearchTerms(query: string): string[] {
  // Normalize query
  const normalizedQuery = query.toLowerCase().trim();

  // Split into tokens and filter
  const tokens = normalizedQuery
    .split(/\s+/)
    .filter(token => token.length >= 2)
    .filter(token => !isStopWord(token));

  // Extract phrases (multi-word terms)
  const phrases = extractPhrases(normalizedQuery);

  // Combine single words and phrases, remove duplicates
  const allTerms = [...new Set([...tokens, ...phrases])];

  return allTerms.slice(0, 10); // Limit to prevent too many terms
}

/**
 * Check if a word is a stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
    'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ];

  return stopWords.includes(word.toLowerCase());
}

/**
 * Extract meaningful phrases from query
 */
function extractPhrases(query: string): string[] {
  const phrases: string[] = [];

  // Common two-word phrases relevant to the domain
  const commonPhrases = [
    'command line', 'real time', 'machine learning', 'artificial intelligence',
    'user interface', 'free tier', 'open source', 'no code', 'low code',
    'web application', 'mobile app', 'api access', 'sdk available'
  ];

  for (const phrase of commonPhrases) {
    if (query.includes(phrase)) {
      phrases.push(phrase);
    }
  }

  // Dynamic phrase extraction
  const words = query.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (query.includes(phrase) && !phrases.includes(phrase)) {
      phrases.push(phrase);
    }
  }

  return phrases;
}

/**
 * Create field search terms from terms and field mappings
 */
function createFieldSearchTerms(
  terms: string[],
  fieldMappings: FieldSelection[],
  query: string
): FieldSearchTerm[] {
  const fieldSearchTerms: FieldSearchTerm[] = [];

  if (fieldMappings.length > 0) {
    // Use field mappings to assign terms to specific fields
    for (const term of terms) {
      const relevantFields = fieldMappings.filter(field =>
        field.boostTerms.some(boostTerm =>
          boostTerm.toLowerCase() === term.toLowerCase() ||
          term.toLowerCase().includes(boostTerm.toLowerCase())
        )
      );

      if (relevantFields.length > 0) {
        fieldSearchTerms.push({
          term,
          fieldPaths: relevantFields.map(f => f.fieldPath),
          weight: Math.max(...relevantFields.map(f => f.weight)),
          matchStrategy: relevantFields.some(f => f.requiresExactMatch) ? 'exact' : 'contains',
          boostTerms: relevantFields.flatMap(f => f.boostTerms)
        });
      } else {
        // Fallback to general fields
        fieldSearchTerms.push({
          term,
          fieldPaths: ['name', 'description'],
          weight: 0.5,
          matchStrategy: 'contains'
        });
      }
    }
  } else {
    // No field mappings, use general approach
    for (const term of terms) {
      fieldSearchTerms.push({
        term,
        fieldPaths: ['name', 'description', 'features'],
        weight: 0.5,
        matchStrategy: 'contains'
      });
    }
  }

  return fieldSearchTerms;
}

/**
 * Execute multi-field search on dataset
 */
async function executeMultiFieldSearch(
  dataset: any[],
  fieldSearchTerms: FieldSearchTerm[],
  strategy: 'field_specific' | 'general' | 'hybrid',
  minScore: number,
  includeHighlights: boolean,
  boostFieldMatches: boolean
): Promise<MultiFieldSearchResult[]> {
  const results: MultiFieldSearchResult[] = [];

  for (const item of dataset) {
    const fieldMatches: FieldMatch[] = [];
    const matchedTerms: string[] = [];

    // Search each term in its designated fields
    for (const searchTerm of fieldSearchTerms) {
      for (const fieldPath of searchTerm.fieldPaths) {
        const fieldValue = getNestedValue(item, fieldPath);
        if (fieldValue !== null && fieldValue !== undefined) {
          const match = searchInField(fieldValue, searchTerm.term, searchTerm.matchStrategy, includeHighlights);
          if (match) {
            // Apply weight and boost
            let score = match.score * searchTerm.weight;

            if (boostFieldMatches && searchTerm.boostTerms) {
              const boostMatch = searchTerm.boostTerms.some(boostTerm =>
                boostTerm.toLowerCase() === searchTerm.term.toLowerCase()
              );
              if (boostMatch) {
                score *= 1.2; // 20% boost for exact boost term matches
              }
            }

            fieldMatches.push({
              fieldPath,
              value: fieldValue,
              score,
              matchType: match.matchType,
              highlightedValue: match.highlightedValue
            });

            if (!matchedTerms.includes(searchTerm.term)) {
              matchedTerms.push(searchTerm.term);
            }
          }
        }
      }
    }

    // Calculate overall score for this item
    if (fieldMatches.length > 0) {
      const overallScore = calculateOverallScore(fieldMatches, strategy);

      if (overallScore >= minScore) {
        results.push({
          item,
          overallScore,
          fieldMatches,
          matchedTerms
        });
      }
    }
  }

  return results;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

/**
 * Search for term within a field value
 */
function searchInField(
  fieldValue: any,
  searchTerm: string,
  matchStrategy: 'exact' | 'contains' | 'fuzzy',
  includeHighlights: boolean
): { score: number; matchType: 'exact' | 'partial' | 'contains' | 'fuzzy'; highlightedValue?: string } | null {
  if (fieldValue === null || fieldValue === undefined) {
    return null;
  }

  const searchLower = searchTerm.toLowerCase();
  let fieldString = '';

  if (Array.isArray(fieldValue)) {
    fieldString = fieldValue.join(' ').toLowerCase();
  } else if (typeof fieldValue === 'string') {
    fieldString = fieldValue.toLowerCase();
  } else if (typeof fieldValue === 'boolean') {
    // For boolean fields, check if term suggests true/false
    const termIndicatesTrue = ['free', 'enabled', 'available', 'yes'].includes(searchLower);
    const termIndicatesFalse = ['paid', 'disabled', 'unavailable', 'no'].includes(searchLower);

    if ((fieldValue && termIndicatesTrue) || (!fieldValue && termIndicatesFalse)) {
      return {
        score: 1.0,
        matchType: 'exact',
        highlightedValue: fieldValue.toString()
      };
    }
    return null;
  } else {
    fieldString = String(fieldValue).toLowerCase();
  }

  // Exact match
  if (matchStrategy === 'exact' && fieldString === searchLower) {
    return {
      score: 1.0,
      matchType: 'exact',
      highlightedValue: includeHighlights ? highlightMatch(fieldString, searchTerm) : fieldString
    };
  }

  // Contains match
  if (fieldString.includes(searchLower)) {
    const score = searchLower.length / fieldString.length;
    return {
      score: Math.min(score + 0.3, 1.0), // Boost contains matches
      matchType: 'contains',
      highlightedValue: includeHighlights ? highlightMatch(fieldString, searchTerm) : fieldString
    };
  }

  // Fuzzy match (simple implementation)
  if (matchStrategy === 'fuzzy' || matchStrategy === 'contains') {
    const fuzzyScore = calculateFuzzyScore(fieldString, searchLower);
    if (fuzzyScore > 0.6) {
      return {
        score: fuzzyScore * 0.7, // Reduce weight for fuzzy matches
        matchType: 'fuzzy',
        highlightedValue: includeHighlights ? highlightMatch(fieldString, searchTerm) : fieldString
      };
    }
  }

  return null;
}

/**
 * Calculate fuzzy match score (simple Levenshtein-inspired approach)
 */
function calculateFuzzyScore(str1: string, str2: string): number {
  if (str1.length === 0) return 0;
  if (str2.length === 0) return 0;

  // Simple character matching score
  let matches = 0;
  const shorter = str1.length < str2.length ? str1 : str2;
  const longer = str1.length >= str2.length ? str1 : str2;

  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++;
    }
  }

  return matches / longer.length;
}

/**
 * Highlight matching terms in text
 */
function highlightMatch(text: string, searchTerm: string): string {
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '**$1**');
}

/**
 * Calculate overall score for an item
 */
function calculateOverallScore(fieldMatches: FieldMatch[], strategy: 'field_specific' | 'general' | 'hybrid'): number {
  if (fieldMatches.length === 0) return 0;

  switch (strategy) {
    case 'field_specific':
      // For field-specific, use the best match score
      return Math.max(...fieldMatches.map(m => m.score));

    case 'general':
      // For general, average all match scores
      return fieldMatches.reduce((sum, m) => sum + m.score, 0) / fieldMatches.length;

    case 'hybrid':
      // For hybrid, combine best match with coverage
      const bestScore = Math.max(...fieldMatches.map(m => m.score));
      const coverageScore = fieldMatches.length / 10; // Normalize by expected max fields
      return (bestScore * 0.7) + (coverageScore * 0.3);

    default:
      return fieldMatches.reduce((sum, m) => sum + m.score, 0) / fieldMatches.length;
  }
}

/**
 * Calculate field statistics
 */
function calculateFieldStats(results: MultiFieldSearchResult[]): Record<string, number> {
  const stats: Record<string, number> = {};

  for (const result of results) {
    for (const match of result.fieldMatches) {
      stats[match.fieldPath] = (stats[match.fieldPath] || 0) + 1;
    }
  }

  return stats;
}

/**
 * Calculate term statistics
 */
function calculateTermStats(results: MultiFieldSearchResult[]): Record<string, number> {
  const stats: Record<string, number> = {};

  for (const result of results) {
    for (const term of result.matchedTerms) {
      stats[term] = (stats[term] || 0) + 1;
    }
  }

  return stats;
}

/**
 * Calculate overall search confidence
 */
function calculateSearchConfidence(
  results: MultiFieldSearchResult[],
  terms: string[],
  fieldMappings: FieldSelection[]
): number {
  if (results.length === 0) return 0.0;

  // Base confidence from result quality
  const avgScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;

  // Boost from term coverage
  const termCoverage = terms.length > 0
    ? Math.max(...results.map(r => r.matchedTerms.length)) / terms.length
    : 0;

  // Boost from field utilization
  const fieldUtilization = fieldMappings.length > 0
    ? new Set(results.flatMap(r => r.fieldMatches.map(m => m.fieldPath))).size / fieldMappings.length
    : 0.5;

  return Math.min(avgScore + (termCoverage * 0.1) + (fieldUtilization * 0.1), 1.0);
}

// Export tool for registration
export const multiFieldKeywordSearchTool = {
  func: multiFieldKeywordSearch,
  metadata: {
    name: 'multiFieldKeywordSearch',
    category: 'search' as const,
    description: 'Execute targeted searches across multiple database fields with semantic awareness',
    schema: {
      query: { type: 'string', required: true, description: 'Search query' },
      fieldMappings: { type: 'array', required: false, description: 'Pre-calculated field mappings' },
      terms: { type: 'array', required: false, description: 'Specific terms to search' },
      maxResults: { type: 'number', required: false, default: 50, description: 'Maximum results' },
      minScore: { type: 'number', required: false, default: 0.1, description: 'Minimum score threshold' },
      includeHighlights: { type: 'boolean', required: false, default: true, description: 'Include highlighted matches' },
      boostFieldMatches: { type: 'boolean', required: false, default: true, description: 'Boost field-specific matches' }
    },
    examples: [
      'Search "free cli" across pricing and interface fields',
      'Multi-field search for "AI writing assistant" with semantic targeting',
      'Targeted search across capabilities and categories fields'
    ],
    performance: {
      complexity: 'O(n*m)',
      memoryUsage: 'medium'
    }
  }
};