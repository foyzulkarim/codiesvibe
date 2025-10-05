/**
 * Comprehensive Tools Registry
 * 
 * Central registry for all AI-enhanced filtering and data manipulation tools.
 * Each tool provides intelligent reasoning, confidence scoring, and robust error handling.
 */

import { ToolFunction, ToolParams, ToolRegistryEntry } from './base';
import { filterByField, FilterByFieldParams } from './filterByField';
import { filterByArrayContains, FilterByArrayContainsParams } from './filterByArrayContains';
import { filterByNestedField, FilterByNestedFieldParams } from './filterByNestedField';
import { filterByArrayIntersection, FilterByArrayIntersectionParams } from './filterByArrayIntersection';
import { filterByPriceRange, FilterByPriceRangeParams } from './filterByPriceRange';
import { filterByDateRange, FilterByDateRangeParams } from './filterByDateRange';
import { filterByExists, FilterByExistsParams } from './filterByExists';
import { sortByField, SortByFieldParams } from './sortByField';
import { sortByNestedField, SortByNestedFieldParams } from './sortByNestedField';
import { sortByMultipleFields, SortByMultipleFieldsParams } from './sortByMultipleFields';

// Import search tools
import { searchByText, SearchByTextParams } from './simpleSearch';
import { searchByKeywords, SearchByKeywordsParams } from './searchByKeywords';
import { findById, FindByIdParams } from './findById';
import { findBySlug, FindBySlugParams } from './findBySlug';
import { search_tools } from './search_tools';

// Import other tools
import { limitResults, LimitResultsParams } from './limitResults';
import { groupBy, GroupByParams } from './simpleAggregation';
import { selectFields, SelectFieldsParams } from './simpleProjection';

/**
 * Tool Categories for organization and discovery
 */
export type ToolCategory = 'filter' | 'sort' | 'search' | 'aggregate' | 'array' | 'utility';

/**
 * Performance complexity indicators
 */
export type PerformanceComplexity = 'O(1)' | 'O(log n)' | 'O(n)' | 'O(n log n)' | 'O(n²)';

/**
 * Memory usage indicators
 */
export type MemoryUsage = 'low' | 'medium' | 'high';

/**
 * Registry of all available tools with comprehensive metadata
 */
export const TOOL_REGISTRY: Record<string, ToolRegistryEntry<any, any>> = {
  filterByField: {
    func: filterByField,
    metadata: {
      name: 'filterByField',
      category: 'filter',
      description: 'Filter items based on field values with AI-enhanced operator selection',
      schema: {
        field: { type: 'string', required: true, description: 'Field name to filter on' },
        value: { type: 'any', required: true, description: 'Value to compare against' },
        operator: { type: 'string', required: false, description: 'Comparison operator (auto-selected if not provided)' },
        caseSensitive: { type: 'boolean', required: false, default: false, description: 'Case-sensitive string comparison' }
      },
      examples: [
        'Filter tools by category "AI"',
        'Find tools with rating greater than 4.0',
        'Filter by exact name match'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'low'
      }
    }
  },

  filterByArrayContains: {
    func: filterByArrayContains,
    metadata: {
      name: 'filterByArrayContains',
      category: 'array',
      description: 'Filter items where array fields contain specific values with flexible matching modes',
      schema: {
        field: { type: 'string', required: true, description: 'Array field name to check' },
        values: { type: 'array', required: true, description: 'Values to search for in the array' },
        matchType: { type: 'string', required: false, default: 'any', enum: ['any', 'all', 'exact'], description: 'Matching strategy' },
        caseSensitive: { type: 'boolean', required: false, default: false, description: 'Case-sensitive matching' }
      },
      examples: [
        'Find tools with categories containing "productivity" or "automation"',
        'Filter tools that support all specified platforms',
        'Find exact category matches'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'low'
      }
    }
  },

  filterByNestedField: {
    func: filterByNestedField,
    metadata: {
      name: 'filterByNestedField',
      category: 'filter',
      description: 'Filter items based on nested object properties with dot-notation support',
      schema: {
        field: { type: 'string', required: true, description: 'Nested field path (e.g., "user.profile.name")' },
        value: { type: 'any', required: true, description: 'Value to compare against' },
        operator: { type: 'string', required: false, description: 'Comparison operator' },
        caseSensitive: { type: 'boolean', required: false, default: false, description: 'Case-sensitive comparison' }
      },
      examples: [
        'Filter by nested pricing information: "pricing.monthly.min"',
        'Find tools with specific capability flags: "capabilities.ai.codeGeneration"',
        'Filter by deep object properties'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'low'
      }
    }
  },

  filterByArrayIntersection: {
    func: filterByArrayIntersection,
    metadata: {
      name: 'filterByArrayIntersection',
      category: 'array',
      description: 'Filter items based on array field intersections with configurable thresholds',
      schema: {
        field: { type: 'string', required: true, description: 'Array field name to check' },
        values: { type: 'array', required: true, description: 'Values to intersect with' },
        minIntersection: { type: 'number', required: false, default: 1, description: 'Minimum intersection size' },
        caseSensitive: { type: 'boolean', required: false, default: false, description: 'Case-sensitive matching' }
      },
      examples: [
        'Find tools with at least 2 matching categories',
        'Filter by platform compatibility overlap',
        'Find tools with significant feature intersection'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'low'
      }
    }
  },

  filterByPriceRange: {
    func: filterByPriceRange,
    metadata: {
      name: 'filterByPriceRange',
      category: 'filter',
      description: 'Filter items based on price ranges with multi-currency support',
      schema: {
        field: { type: 'string', required: true, description: 'Price field name' },
        minPrice: { type: 'number', required: false, description: 'Minimum price (inclusive)' },
        maxPrice: { type: 'number', required: false, description: 'Maximum price (inclusive)' },
        currency: { type: 'string', required: false, default: '$', description: 'Currency symbol for display' }
      },
      examples: [
        'Find tools under $50/month',
        'Filter by price range $10-$100',
        'Find tools above $200/month'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'low'
      }
    }
  },

  filterByDateRange: {
    func: filterByDateRange,
    metadata: {
      name: 'filterByDateRange',
      category: 'filter',
      description: 'Filter items based on date ranges with flexible parsing and timezone support',
      schema: {
        field: { type: 'string', required: true, description: 'Date field name' },
        startDate: { type: 'string|Date', required: false, description: 'Start date (inclusive)' },
        endDate: { type: 'string|Date', required: false, description: 'End date (inclusive)' },
        dateFormat: { type: 'string', required: false, description: 'Expected date format' },
        timezone: { type: 'string', required: false, default: 'UTC', description: 'Timezone for date parsing' },
        inclusive: { type: 'boolean', required: false, default: true, description: 'Include boundary dates' }
      },
      examples: [
        'Find tools added in the last month',
        'Filter by creation date range',
        'Find recently updated tools'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'low'
      }
    }
  },

  filterByExists: {
    func: filterByExists,
    metadata: {
      name: 'filterByExists',
      category: 'filter',
      description: 'Filter items based on field existence with comprehensive null/empty checking',
      schema: {
        field: { type: 'string', required: true, description: 'Field name to check' },
        exists: { type: 'boolean', required: true, description: 'Whether field should exist or not' },
        checkNull: { type: 'boolean', required: false, default: true, description: 'Consider null as non-existent' },
        checkUndefined: { type: 'boolean', required: false, default: true, description: 'Consider undefined as non-existent' },
        checkEmpty: { type: 'boolean', required: false, default: false, description: 'Consider empty strings/arrays as non-existent' },
        strict: { type: 'boolean', required: false, default: false, description: 'Strict existence checking' }
      },
      examples: [
        'Find tools with missing descriptions',
        'Filter tools that have logo URLs',
        'Find incomplete tool entries'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'low'
      }
    }
  },

  // Sorting Tools
  sortByField: {
    func: sortByField,
    metadata: {
      name: 'sortByField',
      category: 'sort',
      description: 'Sort items by field values with stable sorting and intelligent null handling',
      schema: {
        field: { type: 'string', required: true, description: 'Field name to sort by' },
        order: { type: 'string', required: false, default: 'asc', enum: ['asc', 'desc'], description: 'Sort order (ascending or descending)' },
        nullsFirst: { type: 'boolean', required: false, default: true, description: 'Place null values first or last' },
        caseSensitive: { type: 'boolean', required: false, default: true, description: 'Case-sensitive string comparison' },
        numeric: { type: 'boolean', required: false, description: 'Force numeric comparison' }
      },
      examples: [
        'Sort tools by popularity score',
        'Sort by rating in descending order',
        'Sort by name in ascending order'
      ],
      performance: {
        complexity: 'O(n log n)',
        memoryUsage: 'low'
      }
    }
  },

  sortByNestedField: {
    func: sortByNestedField,
    metadata: {
      name: 'sortByNestedField',
      category: 'sort',
      description: 'Sort items by nested object properties with deep path traversal and type-aware comparison',
      schema: {
        path: { type: 'string', required: true, description: 'Nested field path (e.g., "user.profile.name")' },
        order: { type: 'string', required: false, default: 'asc', enum: ['asc', 'desc'], description: 'Sort order (ascending or descending)' },
        nullsFirst: { type: 'boolean', required: false, default: true, description: 'Place null/undefined values first or last' },
        caseSensitive: { type: 'boolean', required: false, default: true, description: 'Case-sensitive string comparison' },
        numeric: { type: 'boolean', required: false, description: 'Force numeric comparison' },
        undefinedAsNull: { type: 'boolean', required: false, default: true, description: 'Treat undefined values as null' }
      },
      examples: [
        'Sort tools by nested rating: "pricingSummary.lowestMonthlyPrice"',
        'Sort by nested capability flags: "capabilities.ai.codeGeneration"',
        'Sort by deep object properties'
      ],
      performance: {
        complexity: 'O(n log n)',
        memoryUsage: 'low'
      }
    }
  },

  sortByMultipleFields: {
    func: sortByMultipleFields,
    metadata: {
      name: 'sortByMultipleFields',
      category: 'sort',
      description: 'Sort items by multiple fields with priority-based sorting strategy',
      schema: {
        fields: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            required: true,
            properties: {
              field: { type: 'string', required: true },
              order: { type: 'string', required: true, enum: ['asc', 'desc'], default: 'asc' },
              priority: { type: 'number', required: false, default: 0 }
            },
            description: 'Priority for resolving equal values'
          }
        }
      },
      examples: [
        'Sort by rating first, then by name',
        'Sort by popularity in descending order, then by name in ascending order',
        'Multi-criteria sorting with custom priorities'
      ],
      performance: {
        complexity: 'O(n log n)',
        memoryUsage: 'medium'
      }
    }
  },

  // Search Tools
  searchByText: {
    func: searchByText,
    metadata: {
      name: 'searchByText',
      category: 'search',
      description: 'Search items by text query across multiple fields with relevance scoring',
      schema: {
        query: { type: 'string', required: true, description: 'Search query text' },
        fields: { type: 'array', required: false, description: 'Fields to search in (default: ["name", "description"])' },
        mode: { type: 'string', required: false, default: 'any', enum: ['any', 'all'], description: 'Match mode: any term or all terms' },
        caseSensitive: { type: 'boolean', required: false, default: false, description: 'Case-sensitive search' },
        includeRelevanceScore: { type: 'boolean', required: false, default: false, description: 'Include relevance scores in results' }
      },
      examples: [
        'Search for "AI tools" in name and description',
        'Find tools containing "code completion"',
        'Search with case-sensitive matching'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'medium'
      }
    }
  },

  searchByKeywords: {
    func: searchByKeywords,
    metadata: {
      name: 'searchByKeywords',
      category: 'search',
      description: 'Search items by keywords with flexible matching and ranking',
      schema: {
        keywords: { type: 'array', required: true, description: 'Array of keywords to search for' },
        fields: { type: 'array', required: false, description: 'Fields to search in' },
        matchAll: { type: 'boolean', required: false, default: false, description: 'Require all keywords to match' },
        caseSensitive: { type: 'boolean', required: false, default: false, description: 'Case-sensitive matching' }
      },
      examples: [
        'Search by keywords ["AI", "automation", "productivity"]',
        'Find tools matching specific keywords',
        'Keyword-based filtering with multiple terms'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'medium'
      }
    }
  },

  findById: {
    func: findById,
    metadata: {
      name: 'findById',
      category: 'search',
      description: 'Find items by their unique ID field',
      schema: {
        id: { type: 'string', required: true, description: 'Unique identifier to search for' },
        field: { type: 'string', required: false, default: '_id', description: 'ID field name' }
      },
      examples: [
        'Find tool by ID "12345"',
        'Lookup by specific identifier field',
        'Exact ID matching'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'low'
      }
    }
  },

  findBySlug: {
    func: findBySlug,
    metadata: {
      name: 'findBySlug',
      category: 'search',
      description: 'Find items by their slug field for URL-friendly identification',
      schema: {
        slug: { type: 'string', required: true, description: 'Slug to search for' },
        field: { type: 'string', required: false, default: 'slug', description: 'Slug field name' }
      },
      examples: [
        'Find tool by slug "ai-code-assistant"',
        'URL-friendly tool lookup',
        'Slug-based identification'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'low'
      }
    }
  },

  search_tools: {
    func: search_tools,
    metadata: {
      name: 'search_tools',
      category: 'search',
      description: 'General search tool that intelligently routes to appropriate search functions based on query type',
      schema: {
        query: { type: 'string', required: true, description: 'Search query text' },
        searchType: { type: 'string', required: false, default: 'auto', enum: ['auto', 'text', 'keywords', 'id', 'slug'], description: 'Search type (auto-detected if not specified)' },
        fields: { type: 'array', required: false, description: 'Fields to search in (default: ["name", "description"])' },
        caseSensitive: { type: 'boolean', required: false, default: false, description: 'Case-sensitive search' },
        mode: { type: 'string', required: false, default: 'any', enum: ['any', 'all'], description: 'Match mode for text search' },
        includeRelevanceScore: { type: 'boolean', required: false, default: false, description: 'Include relevance scores in results' }
      },
      examples: [
        'General search for "chatgpt" (auto-detects search type)',
        'Search with explicit type: searchType="keywords"',
        'ID lookup: query="12345" searchType="id"',
        'Multi-word keyword search: "AI code assistant"'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'medium'
      }
    }
  },

  // Utility Tools
  limitResults: {
    func: limitResults,
    metadata: {
      name: 'limitResults',
      category: 'utility',
      description: 'Limit the number of results returned',
      schema: {
        limit: { type: 'number', required: true, description: 'Maximum number of results to return' },
        offset: { type: 'number', required: false, default: 0, description: 'Number of results to skip' }
      },
      examples: [
        'Limit results to 10 items',
        'Get first 20 results',
        'Pagination with offset and limit'
      ],
      performance: {
        complexity: 'O(1)',
        memoryUsage: 'low'
      }
    }
  },

  groupBy: {
    func: groupBy,
    metadata: {
      name: 'groupBy',
      category: 'aggregate',
      description: 'Group items by field value for analysis and aggregation',
      schema: {
        field: { type: 'string', required: true, description: 'Field to group by' },
        aggregation: { type: 'string', required: false, enum: ['count', 'sum', 'avg', 'min', 'max'], description: 'Aggregation method' }
      },
      examples: [
        'Group tools by category',
        'Count items per group',
        'Aggregate by field values'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'medium'
      }
    }
  },

  selectFields: {
    func: selectFields,
    metadata: {
      name: 'selectFields',
      category: 'utility',
      description: 'Select specific fields to include in results',
      schema: {
        fields: { type: 'array', required: true, description: 'Fields to include in results' }
      },
      examples: [
        'Select only name and description fields',
        'Project specific fields',
        'Field selection for response formatting'
      ],
      performance: {
        complexity: 'O(n)',
        memoryUsage: 'low'
      }
    }
  }
};

/**
 * Get all available tool names
 */
export function getAvailableTools(): string[] {
  return Object.keys(TOOL_REGISTRY);
}

/**
 * Get tool by name
 */
export function getTool(name: string): ToolRegistryEntry<any, any> | undefined {
    return TOOL_REGISTRY[name];
}

/**
 * Get tool by name (alias for compatibility)
 */
export function getToolByName(name: string): ToolRegistryEntry<any, any> | undefined {
  return TOOL_REGISTRY[name];
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: ToolCategory): Record<string, ToolRegistryEntry<any, any>> {
  return Object.fromEntries(
    Object.entries(TOOL_REGISTRY).filter(([_, tool]) => tool.metadata.category === category)
  );
}

/**
 * Get tool metadata
 */
export function getToolMetadata(name: string) {
  const tool = TOOL_REGISTRY[name];
  return tool?.metadata;
}

/**
 * Validate tool exists
 */
export function isValidTool(name: string): boolean {
  return name in TOOL_REGISTRY;
}

/**
 * Get tool performance info
 */
export function getToolPerformance(name: string) {
  const tool = TOOL_REGISTRY[name];
  return tool?.metadata.performance;
}

/**
 * Search tools by description or name
 */
export function searchTools(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  return Object.entries(TOOL_REGISTRY)
    .filter(([name, tool]) =>
      name.toLowerCase().includes(lowerQuery) ||
      tool.metadata.description.toLowerCase().includes(lowerQuery) ||
      tool.metadata.examples.some(example => example.toLowerCase().includes(lowerQuery))
    )
    .map(([name]) => name);
}

/**
 * Get tool usage statistics
 */
export function getRegistryStats() {
  const tools = Object.values(TOOL_REGISTRY);
  const categories = new Set(tools.map(t => t.metadata.category));

  return {
    totalTools: tools.length,
    categories: Array.from(categories),
    categoryCount: categories.size,
    complexityDistribution: tools.reduce((acc, tool) => {
      const complexity = tool.metadata.performance.complexity;
      acc[complexity] = (acc[complexity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

// Export all tools for direct access
export {
  filterByField,
  filterByArrayContains,
  filterByNestedField,
  filterByArrayIntersection,
  filterByPriceRange,
  filterByDateRange,
  filterByExists,
  sortByField,
  sortByNestedField,
  sortByMultipleFields,
  searchByText,
  searchByKeywords,
  findById,
  findBySlug,
  search_tools,
  limitResults,
  groupBy,
  selectFields
};

// Export base types and utilities
export * from './base';
export * from './validators';

export default TOOL_REGISTRY;