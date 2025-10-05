// Core Filtering Tools
export { default as filterByField } from './filterByField';
export { default as filterByArrayContains } from './filterByArrayContains';
export { default as filterByNestedField } from './filterByNestedField';
export { default as filterByArrayIntersection } from './filterByArrayIntersection';
export { default as filterByPriceRange } from './filterByPriceRange';
export { default as filterByDateRange } from './filterByDateRange';
export { default as filterByExists } from './filterByExists';

// Sorting Tools
export { default as sortByField } from './sortByField';
export { default as sortByNestedField } from './sortByNestedField';
export { default as sortByMultipleFields } from './sortByMultipleFields';

// Search and Match Tools
export { searchByText } from './simpleSearch';
export { default as searchByKeywords } from './searchByKeywords';
export { default as findById } from './findById';
export { default as findBySlug } from './findBySlug';

// Aggregation Tools
export { groupBy, countBy, getUnique, getMinMax, calculateAverage } from './simpleAggregation';

// Array Operations
export { skipResults, intersectResults, unionResults, getDifference } from './simpleArrayOps';
export { default as limitResults } from './limitResults';

// Projection and Utility Tools
export { selectFields, excludeFields, utilityTools } from './simpleProjection';

// Base interfaces and utilities
export * from './base';
export * from './validators';

// Tool registry for dynamic loading
export const toolRegistry = {
  // Core Filtering Tools
  filterByField: { func: require('./filterByField').default, category: 'filter' },
  filterByArrayContains: { func: require('./filterByArrayContains').default, category: 'filter' },
  filterByNestedField: { func: require('./filterByNestedField').default, category: 'filter' },
  filterByArrayIntersection: { func: require('./filterByArrayIntersection').default, category: 'filter' },
  filterByPriceRange: { func: require('./filterByPriceRange').default, category: 'filter' },
  filterByDateRange: { func: require('./filterByDateRange').default, category: 'filter' },
  filterByExists: { func: require('./filterByExists').default, category: 'filter' },

  // Sorting Tools
  sortByField: { func: require('./sortByField').default, category: 'sort' },
  sortByNestedField: { func: require('./sortByNestedField').default, category: 'sort' },
  sortByMultipleFields: { func: require('./sortByMultipleFields').default, category: 'sort' },

  // Search and Match Tools
  searchByText: { func: require('./simpleSearch').searchByText, category: 'search' },
  searchByKeywords: { func: require('./searchByKeywords').default, category: 'search' },
  findById: { func: require('./findById').default, category: 'search' },
  findBySlug: { func: require('./findBySlug').default, category: 'search' },

  // Aggregation Tools
  groupBy: { func: require('./simpleAggregation').groupBy, category: 'aggregate' },
  countBy: { func: require('./simpleAggregation').countBy, category: 'aggregate' },
  getUnique: { func: require('./simpleAggregation').getUnique, category: 'aggregate' },
  getMinMax: { func: require('./simpleAggregation').getMinMax, category: 'aggregate' },
  calculateAverage: { func: require('./simpleAggregation').calculateAverage, category: 'aggregate' },

  // Array Operations
  limitResults: { func: require('./limitResults').default, category: 'array' },
  skipResults: { func: require('./simpleArrayOps').skipResults, category: 'array' },
  intersectResults: { func: require('./simpleArrayOps').intersectResults, category: 'array' },
  unionResults: { func: require('./simpleArrayOps').unionResults, category: 'array' },
  getDifference: { func: require('./simpleArrayOps').getDifference, category: 'array' },

  // Projection and Utility Tools
  selectFields: { func: require('./simpleProjection').selectFields, category: 'utility' },
  excludeFields: { func: require('./simpleProjection').excludeFields, category: 'utility' },
  utilityTools: { func: require('./simpleProjection').utilityTools, category: 'utility' }
};

export type ToolCategory = 'filter' | 'sort' | 'search' | 'aggregate' | 'array' | 'utility';

export interface ToolMetadata {
  name: string;
  category: ToolCategory;
  description: string;
  parameters: Record<string, any>;
  examples: string[];
}