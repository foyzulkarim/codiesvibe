/**
 * General Search Tool - Intelligent Search Interface
 * Delegates to appropriate search functions based on query and search type
 */

import { ToolResponse, ToolParams, ToolFunction } from './base';
import { createToolResponse } from './base';
import { searchByText } from './simpleSearch';
import { searchByKeywords } from './searchByKeywords';
import { findById } from './findById';
import { findBySlug } from './findBySlug';

export interface SearchToolsParams extends ToolParams {
  query: string;
  originalQuery?: string; // Add this for backward compatibility
  searchType?: 'auto' | 'text' | 'keywords' | 'id' | 'slug';
  fields?: string[];
  caseSensitive?: boolean;
  mode?: 'exact' | 'fuzzy';
  includeRelevanceScore?: boolean;
}

/**
 * General search tool that intelligently delegates to existing search functions
 */
export const search_tools: ToolFunction<SearchToolsParams> = (data, params) => {
  const startTime = Date.now();
  
  try {
    // Handle parameter mapping for different parameter naming conventions
    const {
      query: directQuery,
      originalQuery,
      searchType = 'auto',
      fields = ['name', 'description'],
      caseSensitive = false,
      mode = 'exact',
      includeRelevanceScore = false
    } = params;

    // Use directQuery if available, otherwise fall back to originalQuery
    const query = directQuery || originalQuery;

    if (!query || typeof query !== 'string') {
      return createToolResponse(
        [],
        'Invalid query parameter provided - query is required and must be a string',
        0,
        0,
        startTime,
        ['Query validation failed']
      );
    }

    let result: ToolResponse<any[]>;
    let reasoning: string;

    // Intelligent search type detection
    if (searchType === 'auto') {
      // Check if it looks like an ID (alphanumeric, possibly with hyphens/underscores)
      if (/^[a-zA-Z0-9_-]+$/.test(query) && query.length < 50) {
        // Try ID search first
        const idResult = findById(data, { id: query });
        if (idResult.result.length > 0) {
          reasoning = `Auto-detected ID search for "${query}" - found ${idResult.result.length} matches`;
          return createToolResponse(
            idResult.result,
            reasoning,
            idResult.confidence,
            idResult.processedCount,
            startTime
          );
        }

        // Try slug search if ID didn't work
        const slugResult = findBySlug(data, { slug: query });
        if (slugResult.result.length > 0) {
          reasoning = `Auto-detected slug search for "${query}" - found ${slugResult.result.length} matches`;
          return createToolResponse(
            slugResult.result,
            reasoning,
            slugResult.confidence,
            slugResult.processedCount,
            startTime
          );
        }
      }

      // Check if it contains multiple words (keywords search)
      if (query.includes(' ') && query.split(' ').length > 1) {
        result = searchByKeywords(data, {
          query,
          fields,
          fuzzyMatch: !caseSensitive
        });
        reasoning = `Auto-detected keywords search for multi-word query: "${query}" - found ${result.result.length} matches`;
      } else {
        // Single word or phrase - use text search
        result = searchByText(data, {
          query,
          fields,
          caseSensitive
        });
        reasoning = `Auto-detected text search for single term: "${query}" - found ${result.result.length} matches`;
      }
    } else {
      // Explicit search type specified
      switch (searchType) {
        case 'text':
          result = searchByText(data, { query, fields, caseSensitive });
          reasoning = `Explicit text search for: "${query}" - found ${result.result.length} matches`;
          break;
        
        case 'keywords':
          result = searchByKeywords(data, {
            query,
            fields,
            fuzzyMatch: !caseSensitive
          });
          reasoning = `Explicit keywords search for: "${query}" - found ${result.result.length} matches`;
          break;
        
        case 'id':
          result = findById(data, { id: query });
          reasoning = `Explicit ID search for: "${query}" - found ${result.result.length} matches`;
          break;
        
        case 'slug':
          result = findBySlug(data, { slug: query });
          reasoning = `Explicit slug search for: "${query}" - found ${result.result.length} matches`;
          break;
        
        default:
          return createToolResponse(
            [],
            `Invalid search type: ${searchType}`,
            0,
            0,
            startTime,
            [`Unknown search type: ${searchType}`]
          );
      }
    }

    // Return the result with enhanced reasoning
    return createToolResponse(
      result.result,
      `${reasoning} | Original reasoning: ${result.reasoning}`,
      result.confidence,
      result.processedCount,
      startTime,
      result.warnings
    );

  } catch (error) {
    return createToolResponse(
      [],
      `Search failed due to error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0,
      0,
      startTime,
      ['Search execution error']
    );
  }
};

export default search_tools;