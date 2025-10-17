// Import all search functions for easy importing

// Core Search Functions
import { lookupByName, lookupByNameNode } from "./lookup-by-name";
import { semanticSearch, semanticSearchNode } from "./semantic-search";

// Filtering Functions
import { filterByPrice, filterByPriceNode } from "./filter-by-price";
import { filterByCategory, filterByCategoryNode } from "./filter-by-category";
import { filterByInterface, filterByInterfaceNode } from "./filter-by-interface";
import { filterByFunctionality, filterByFunctionalityNode } from "./filter-by-functionality";
import { filterByUserType, filterByUserTypeNode } from "./filter-by-user-type";
import { filterByDeployment, filterByDeploymentNode } from "./filter-by-deployment";

// Advanced Search Functions
import { findSimilarByFeatures, findSimilarByFeaturesNode } from "./find-similar-by-features";
import { excludeTools, excludeToolsNode } from "./exclude-tools";
import { mergeAndDedupe, mergeAndDedupeNode } from "./merge-and-dedupe";
import { rankByRelevance, rankByRelevanceNode } from "./rank-by-relevance";

// Enhanced Search Nodes
import { multiVectorSearchNode } from "../multi-vector-search.node";
import { resultMergerNode } from "../result-merger.node";

// Re-export all functions
export {
  lookupByName,
  lookupByNameNode,
  semanticSearch,
  semanticSearchNode,
  filterByPrice,
  filterByPriceNode,
  filterByCategory,
  filterByCategoryNode,
  filterByInterface,
  filterByInterfaceNode,
  filterByFunctionality,
  filterByFunctionalityNode,
  filterByUserType,
  filterByUserTypeNode,
  filterByDeployment,
  filterByDeploymentNode,
  findSimilarByFeatures,
  findSimilarByFeaturesNode,
  excludeTools,
  excludeToolsNode,
  mergeAndDedupe,
  mergeAndDedupeNode,
  rankByRelevance,
  rankByRelevanceNode,
  
  // Enhanced Search Nodes
  multiVectorSearchNode,
  resultMergerNode
};

// Function registry for dynamic execution
export const functionRegistry = {
  // Core Search Functions
  "lookup-by-name": lookupByNameNode,
  "semantic-search": semanticSearchNode,

  // Filtering Functions
  "filter-by-price": filterByPriceNode,
  "filter-by-category": filterByCategoryNode,
  "filter-by-interface": filterByInterfaceNode,
  "filter-by-functionality": filterByFunctionalityNode,
  "filter-by-user-type": filterByUserTypeNode,
  "filter-by-deployment": filterByDeploymentNode,

  // Advanced Search Functions
  "find-similar-by-features": findSimilarByFeaturesNode,
  "exclude-tools": excludeToolsNode,
  "merge-and-dedupe": mergeAndDedupeNode,
  "rank-by-relevance": rankByRelevanceNode,
  
  // Enhanced Search Nodes
  "multi-vector-search": multiVectorSearchNode,
  "result-merger": resultMergerNode,
};

// Function categories for organization
export const functionCategories = {
  "search": [
    "lookup-by-name",
    "semantic-search",
    "find-similar-by-features"
  ],
  "filter": [
    "filter-by-price",
    "filter-by-category",
    "filter-by-interface",
    "filter-by-functionality",
    "filter-by-user-type",
    "filter-by-deployment",
    "exclude-tools"
  ],
  "processing": [
    "merge-and-dedupe",
    "rank-by-relevance"
  ],
  "enhanced": [
    "multi-vector-search",
    "result-merger"
  ]
};

// Get all function names
export const getAllFunctionNames = (): string[] => {
  return Object.keys(functionRegistry);
};

// Get functions by category
export const getFunctionsByCategory = (category: keyof typeof functionCategories): string[] => {
  return functionCategories[category] || [];
};

// Check if function exists
export const hasFunction = (functionName: string): boolean => {
  return functionName in functionRegistry;
};

// Get function by name
export const getFunction = (functionName: string) => {
  return functionRegistry[functionName as keyof typeof functionRegistry];
};
