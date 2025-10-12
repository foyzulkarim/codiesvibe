# Phase 2: Search Functions - Detailed Implementation Tasks

Here's a detailed breakdown of Phase 2 tasks with specific implementation details, code structures, and configurations:

## Task 2.1: lookupByName

### Implementation Details:

**nodes/functions/lookup-by-name.ts**
```typescript
import { State } from "@/types/state";
import { mongoDBService } from "@/services/mongodb.service";
import Fuse from "fuse.js";

interface LookupByNameParams {
  toolNames: string[];
  fuzzy?: boolean;
  limit?: number;
}

interface LookupByNameResult {
  tools: any[];
  exactMatches: any[];
  fuzzyMatches: any[];
}

/**
 * Find tools by name using exact and fuzzy matching
 */
export async function lookupByName(
  params: LookupByNameParams
): Promise<LookupByNameResult> {
  const { toolNames, fuzzy = true, limit = 10 } = params;
  
  if (!toolNames || toolNames.length === 0) {
    return { tools: [], exactMatches: [], fuzzyMatches: [] };
  }

  try {
    // First, try exact matches
    const exactMatches = await mongoDBService.getToolsByName(toolNames);
    
    // If we have enough exact matches or fuzzy matching is disabled, return early
    if (exactMatches.length >= limit || !fuzzy) {
      return {
        tools: exactMatches.slice(0, limit),
        exactMatches,
        fuzzyMatches: []
      };
    }
    
    // For fuzzy matching, get all tools and use Fuse.js
    const allTools = await mongoDBService.getAllTools();
    
    // Configure Fuse.js for fuzzy searching
    const fuseOptions = {
      keys: ["name", "aliases"],
      threshold: 0.4, // Lower threshold = more strict matching
      includeScore: true,
      minMatchCharLength: 2,
    };
    
    const fuse = new Fuse(allTools, fuseOptions);
    
    // Search for each tool name
    const fuzzyResults: any[] = [];
    const remainingLimit = limit - exactMatches.length;
    
    for (const toolName of toolNames) {
      if (fuzzyResults.length >= remainingLimit) break;
      
      const results = fuse.search(toolName);
      
      // Add results that aren't already in exact matches
      for (const result of results) {
        if (fuzzyResults.length >= remainingLimit) break;
        
        const isAlreadyFound = exactMatches.some(
          exact => exact._id.toString() === result.item._id.toString()
        );
        
        const isAlreadyInFuzzy = fuzzyResults.some(
          fuzzy => fuzzy._id.toString() === result.item._id.toString()
        );
        
        if (!isAlreadyFound && !isAlreadyInFuzzy) {
          fuzzyResults.push({
            ...result.item,
            fuzzyScore: result.score,
          });
        }
      }
    }
    
    // Combine results
    const allResults = [...exactMatches, ...fuzzyResults].slice(0, limit);
    
    return {
      tools: allResults,
      exactMatches,
      fuzzyMatches: fuzzyResults
    };
  } catch (error) {
    console.error("Error in lookupByName:", error);
    throw error;
  }
}

/**
 * LangGraph node function for lookupByName
 */
export async function lookupByNameNode(state: State): Promise<Partial<State>> {
  const { intent } = state;
  
  if (!intent.toolNames || intent.toolNames.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: [] }]
    };
  }
  
  const result = await lookupByName({
    toolNames: intent.toolNames,
    fuzzy: true,
    limit: 10
  });
  
  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
```

## Task 2.2: semanticSearch

### Implementation Details:

**nodes/functions/semantic-search.ts**
```typescript
import { State } from "@/types/state";
import { qdrantService } from "@/services/qdrant.service";
import { mongoDBService } from "@/services/mongodb.service";

interface SemanticSearchParams {
  query: string;
  limit?: number;
  filters?: Record<string, any>;
  includePayload?: boolean;
}

interface SemanticSearchResult {
  tools: any[];
  similarities: Array<{ id: string; score: number }>;
}

/**
 * Perform semantic search using embeddings
 */
export async function semanticSearch(
  params: SemanticSearchParams
): Promise<SemanticSearchResult> {
  const { query, limit = 10, filters = {}, includePayload = true } = params;
  
  if (!query) {
    return { tools: [], similarities: [] };
  }

  try {
    // Search for similar tools using Qdrant
    const searchResults = await qdrantService.searchByText(
      query,
      limit,
      filters
    );
    
    // Extract tool IDs and similarities
    const toolIds = searchResults.map(result => result.id);
    const similarities = searchResults.map(result => ({
      id: result.id,
      score: result.score,
    }));
    
    // If we don't need full payload, return early
    if (!includePayload) {
      return { tools: [], similarities };
    }
    
    // Get full tool details from MongoDB
    const tools = await mongoDBService.getToolsByIds(toolIds);
    
    // Merge similarity scores into tool objects
    const toolsWithScores = tools.map(tool => {
      const similarity = similarities.find(s => s.id === tool._id.toString());
      return {
        ...tool,
        similarityScore: similarity?.score || 0,
      };
    });
    
    // Sort by similarity score (descending)
    toolsWithScores.sort((a, b) => b.similarityScore - a.similarityScore);
    
    return {
      tools: toolsWithScores,
      similarities
    };
  } catch (error) {
    console.error("Error in semanticSearch:", error);
    throw error;
  }
}

/**
 * LangGraph node function for semanticSearch
 */
export async function semanticSearchNode(state: State): Promise<Partial<State>> {
  const { intent, preprocessedQuery } = state;
  
  // Use semantic query from intent or fall back to preprocessed query
  const query = intent.semanticQuery || preprocessedQuery || state.query;
  
  // Build filters from intent
  const filters: Record<string, any> = {};
  
  if (intent.categories && intent.categories.length > 0) {
    filters.category = { match: { any: intent.categories } };
  }
  
  if (intent.interface && intent.interface.length > 0) {
    filters.interface = { match: { any: intent.interface } };
  }
  
  if (intent.deployment && intent.deployment.length > 0) {
    filters.deployment = { match: { any: intent.deployment } };
  }
  
  const result = await semanticSearch({
    query,
    limit: 10,
    filters,
    includePayload: true
  });
  
  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
```

## Task 2.3: filterByPrice

### Implementation Details:

**nodes/functions/filter-by-price.ts**
```typescript
import { State } from "@/types/state";
import { mongoDBService } from "@/services/mongodb.service";

interface FilterByPriceParams {
  tools: any[];
  hasFreeTier?: boolean;
  maxPrice?: number;
  minPrice?: number;
  pricingModel?: string;
}

interface FilterByPriceResult {
  tools: any[];
  filteredCount: number;
  originalCount: number;
}

/**
 * Filter tools by price constraints
 */
export async function filterByPrice(
  params: FilterByPriceParams
): Promise<FilterByPriceResult> {
  const { tools, hasFreeTier, maxPrice, minPrice, pricingModel } = params;
  
  if (!tools || tools.length === 0) {
    return { tools: [], filteredCount: 0, originalCount: 0 };
  }

  const originalCount = tools.length;
  
  try {
    let filteredTools = [...tools];
    
    // Filter by free tier
    if (hasFreeTier !== undefined) {
      filteredTools = filteredTools.filter(tool => {
        // Handle different ways free tier might be represented
        if (hasFreeTier) {
          return tool.hasFreeTier === true || 
                 tool.pricingModel === "freemium" || 
                 tool.pricingModel === "free";
        } else {
          return tool.hasFreeTier !== true && 
                 tool.pricingModel !== "freemium" && 
                 tool.pricingModel !== "free";
        }
      });
    }
    
    // Filter by pricing model
    if (pricingModel) {
      filteredTools = filteredTools.filter(tool => 
        tool.pricingModel === pricingModel
      );
    }
    
    // Filter by price range
    if (maxPrice !== undefined) {
      filteredTools = filteredTools.filter(tool => {
        // Handle different price representations
        const toolPrice = tool.price || tool.maxPrice || 0;
        return toolPrice <= maxPrice;
      });
    }
    
    if (minPrice !== undefined) {
      filteredTools = filteredTools.filter(tool => {
        // Handle different price representations
        const toolPrice = tool.price || tool.minPrice || 0;
        return toolPrice >= minPrice;
      });
    }
    
    return {
      tools: filteredTools,
      filteredCount: filteredTools.length,
      originalCount
    };
  } catch (error) {
    console.error("Error in filterByPrice:", error);
    throw error;
  }
}

/**
 * LangGraph node function for filterByPrice
 */
export async function filterByPriceNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;
  
  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0 
    ? executionResults[executionResults.length - 1].tools || []
    : [];
    
  if (latestResults.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: [] }]
    };
  }
  
  const result = await filterByPrice({
    tools: latestResults,
    hasFreeTier: intent.priceConstraints?.hasFreeTier,
    maxPrice: intent.priceConstraints?.maxPrice,
    minPrice: intent.priceConstraints?.minPrice,
    pricingModel: intent.priceConstraints?.pricingModel,
  });
  
  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
```

## Task 2.4: filterByCategory

### Implementation Details:

**nodes/functions/filter-by-category.ts**
```typescript
import { State } from "@/types/state";

interface FilterByCategoryParams {
  tools: any[];
  categories: string[];
}

interface FilterByCategoryResult {
  tools: any[];
  filteredCount: number;
  originalCount: number;
}

/**
 * Filter tools by categories
 */
export async function filterByCategory(
  params: FilterByCategoryParams
): Promise<FilterByCategoryResult> {
  const { tools, categories } = params;
  
  if (!tools || tools.length === 0 || !categories || categories.length === 0) {
    return { 
      tools: tools || [], 
      filteredCount: tools?.length || 0, 
      originalCount: tools?.length || 0 
    };
  }

  const originalCount = tools.length;
  
  try {
    // Filter tools that match any of the specified categories
    const filteredTools = tools.filter(tool => {
      // Handle different ways categories might be represented
      const toolCategories = tool.categories || tool.category || [];
      
      // Check if any of the tool's categories match any of the requested categories
      return categories.some(requestedCategory => 
        toolCategories.some((toolCategory: string) => 
          toolCategory.toLowerCase() === requestedCategory.toLowerCase()
        )
      );
    });
    
    return {
      tools: filteredTools,
      filteredCount: filteredTools.length,
      originalCount
    };
  } catch (error) {
    console.error("Error in filterByCategory:", error);
    throw error;
  }
}

/**
 * LangGraph node function for filterByCategory
 */
export async function filterByCategoryNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;
  
  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0 
    ? executionResults[executionResults.length - 1].tools || []
    : [];
    
  if (latestResults.length === 0 || !intent.categories || intent.categories.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }
  
  const result = await filterByCategory({
    tools: latestResults,
    categories: intent.categories,
  });
  
  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
```

## Task 2.5: filterByInterface

### Implementation Details:

**nodes/functions/filter-by-interface.ts**
```typescript
import { State } from "@/types/state";

interface FilterByInterfaceParams {
  tools: any[];
  interfaces: string[];
}

interface FilterByInterfaceResult {
  tools: any[];
  filteredCount: number;
  originalCount: number;
}

/**
 * Filter tools by interface types
 */
export async function filterByInterface(
  params: FilterByInterfaceParams
): Promise<FilterByInterfaceResult> {
  const { tools, interfaces } = params;
  
  if (!tools || tools.length === 0 || !interfaces || interfaces.length === 0) {
    return { 
      tools: tools || [], 
      filteredCount: tools?.length || 0, 
      originalCount: tools?.length || 0 
    };
  }

  const originalCount = tools.length;
  
  try {
    // Filter tools that match any of the specified interfaces
    const filteredTools = tools.filter(tool => {
      // Handle different ways interfaces might be represented
      const toolInterfaces = tool.interfaces || tool.interface || [];
      
      // Check if any of the tool's interfaces match any of the requested interfaces
      return interfaces.some(requestedInterface => 
        toolInterfaces.some((toolInterface: string) => 
          toolInterface.toLowerCase() === requestedInterface.toLowerCase()
        )
      );
    });
    
    return {
      tools: filteredTools,
      filteredCount: filteredTools.length,
      originalCount
    };
  } catch (error) {
    console.error("Error in filterByInterface:", error);
    throw error;
  }
}

/**
 * LangGraph node function for filterByInterface
 */
export async function filterByInterfaceNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;
  
  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0 
    ? executionResults[executionResults.length - 1].tools || []
    : [];
    
  if (latestResults.length === 0 || !intent.interface || intent.interface.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }
  
  const result = await filterByInterface({
    tools: latestResults,
    interfaces: intent.interface,
  });
  
  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
```

## Task 2.6: filterByFunctionality

### Implementation Details:

**nodes/functions/filter-by-functionality.ts**
```typescript
import { State } from "@/types/state";

interface FilterByFunctionalityParams {
  tools: any[];
  functionality: string[];
}

interface FilterByFunctionalityResult {
  tools: any[];
  filteredCount: number;
  originalCount: number;
}

/**
 * Filter tools by functionality types
 */
export async function filterByFunctionality(
  params: FilterByFunctionalityParams
): Promise<FilterByFunctionalityResult> {
  const { tools, functionality } = params;
  
  if (!tools || tools.length === 0 || !functionality || functionality.length === 0) {
    return { 
      tools: tools || [], 
      filteredCount: tools?.length || 0, 
      originalCount: tools?.length || 0 
    };
  }

  const originalCount = tools.length;
  
  try {
    // Filter tools that match any of the specified functionality
    const filteredTools = tools.filter(tool => {
      // Handle different ways functionality might be represented
      const toolFunctionality = tool.functionality || tool.features || [];
      
      // Check if any of the tool's functionality match any of the requested functionality
      return functionality.some(requestedFunctionality => 
        toolFunctionality.some((toolFunctionality: string) => 
          toolFunctionality.toLowerCase() === requestedFunctionality.toLowerCase()
        )
      );
    });
    
    return {
      tools: filteredTools,
      filteredCount: filteredTools.length,
      originalCount
    };
  } catch (error) {
    console.error("Error in filterByFunctionality:", error);
    throw error;
  }
}

/**
 * LangGraph node function for filterByFunctionality
 */
export async function filterByFunctionalityNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;
  
  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0 
    ? executionResults[executionResults.length - 1].tools || []
    : [];
    
  if (latestResults.length === 0 || !intent.functionality || intent.functionality.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }
  
  const result = await filterByFunctionality({
    tools: latestResults,
    functionality: intent.functionality,
  });
  
  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
```

## Task 2.7: filterByUserType

### Implementation Details:

**nodes/functions/filter-by-user-type.ts**
```typescript
import { State } from "@/types/state";

interface FilterByUserTypeParams {
  tools: any[];
  userTypes: string[];
}

interface FilterByUserTypeResult {
  tools: any[];
  filteredCount: number;
  originalCount: number;
}

/**
 * Filter tools by user types
 */
export async function filterByUserType(
  params: FilterByUserTypeParams
): Promise<FilterByUserTypeResult> {
  const { tools, userTypes } = params;
  
  if (!tools || tools.length === 0 || !userTypes || userTypes.length === 0) {
    return { 
      tools: tools || [], 
      filteredCount: tools?.length || 0, 
      originalCount: tools?.length || 0 
    };
  }

  const originalCount = tools.length;
  
  try {
    // Filter tools that match any of the specified user types
    const filteredTools = tools.filter(tool => {
      // Handle different ways user types might be represented
      const toolUserTypes = tool.userTypes || tool.targetAudience || tool.audience || [];
      
      // Check if any of the tool's user types match any of the requested user types
      return userTypes.some(requestedUserType => 
        toolUserTypes.some((toolUserType: string) => 
          toolUserType.toLowerCase() === requestedUserType.toLowerCase()
        )
      );
    });
    
    return {
      tools: filteredTools,
      filteredCount: filteredTools.length,
      originalCount
    };
  } catch (error) {
    console.error("Error in filterByUserType:", error);
    throw error;
  }
}

/**
 * LangGraph node function for filterByUserType
 */
export async function filterByUserTypeNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;
  
  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0 
    ? executionResults[executionResults.length - 1].tools || []
    : [];
    
  if (latestResults.length === 0 || !intent.userTypes || intent.userTypes.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }
  
  const result = await filterByUserType({
    tools: latestResults,
    userTypes: intent.userTypes,
  });
  
  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
```

## Task 2.8: filterByDeployment

### Implementation Details:

**nodes/functions/filter-by-deployment.ts**
```typescript
import { State } from "@/types/state";

interface FilterByDeploymentParams {
  tools: any[];
  deployment: string[];
}

interface FilterByDeploymentResult {
  tools: any[];
  filteredCount: number;
  originalCount: number;
}

/**
 * Filter tools by deployment types
 */
export async function filterByDeployment(
  params: FilterByDeploymentParams
): Promise<FilterByDeploymentResult> {
  const { tools, deployment } = params;
  
  if (!tools || tools.length === 0 || !deployment || deployment.length === 0) {
    return { 
      tools: tools || [], 
      filteredCount: tools?.length || 0, 
      originalCount: tools?.length || 0 
    };
  }

  const originalCount = tools.length;
  
  try {
    // Filter tools that match any of the specified deployment types
    const filteredTools = tools.filter(tool => {
      // Handle different ways deployment might be represented
      const toolDeployment = tool.deployment || tool.hosting || [];
      
      // Check if any of the tool's deployment types match any of the requested deployment types
      return deployment.some(requestedDeployment => 
        toolDeployment.some((toolDeployment: string) => 
          toolDeployment.toLowerCase() === requestedDeployment.toLowerCase()
        )
      );
    });
    
    return {
      tools: filteredTools,
      filteredCount: filteredTools.length,
      originalCount
    };
  } catch (error) {
    console.error("Error in filterByDeployment:", error);
    throw error;
  }
}

/**
 * LangGraph node function for filterByDeployment
 */
export async function filterByDeploymentNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;
  
  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0 
    ? executionResults[executionResults.length - 1].tools || []
    : [];
    
  if (latestResults.length === 0 || !intent.deployment || intent.deployment.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }
  
  const result = await filterByDeployment({
    tools: latestResults,
    deployment: intent.deployment,
  });
  
  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
```

## Task 2.9: findSimilarByFeatures

### Implementation Details:

**nodes/functions/find-similar-by-features.ts**
```typescript
import { State } from "@/types/state";
import { qdrantService } from "@/services/qdrant.service";
import { mongoDBService } from "@/services/mongodb.service";

interface FindSimilarByFeaturesParams {
  referenceToolId: string;
  limit?: number;
  filters?: Record<string, any>;
}

interface FindSimilarByFeaturesResult {
  tools: any[];
  similarities: Array<{ id: string; score: number }>;
  referenceTool: any;
}

/**
 * Find tools similar to a reference tool based on features
 */
export async function findSimilarByFeatures(
  params: FindSimilarByFeaturesParams
): Promise<FindSimilarByFeaturesResult> {
  const { referenceToolId, limit = 10, filters = {} } = params;
  
  if (!referenceToolId) {
    return { tools: [], similarities: [], referenceTool: null };
  }

  try {
    // Get the reference tool details
    const referenceTools = await mongoDBService.getToolsByIds([referenceToolId]);
    
    if (referenceTools.length === 0) {
      throw new Error(`Reference tool with ID ${referenceToolId} not found`);
    }
    
    const referenceTool = referenceTools[0];
    
    // Find similar tools using Qdrant
    const similarTools = await qdrantService.findSimilarTools(
      referenceToolId,
      limit,
      filters
    );
    
    // Extract tool IDs and similarities
    const toolIds = similarTools.map(result => result.id);
    const similarities = similarTools.map(result => ({
      id: result.id,
      score: result.score,
    }));
    
    // Get full tool details from MongoDB
    const tools = await mongoDBService.getToolsByIds(toolIds);
    
    // Merge similarity scores into tool objects
    const toolsWithScores = tools.map(tool => {
      const similarity = similarities.find(s => s.id === tool._id.toString());
      return {
        ...tool,
        similarityScore: similarity?.score || 0,
      };
    });
    
    // Sort by similarity score (descending)
    toolsWithScores.sort((a, b) => b.similarityScore - a.similarityScore);
    
    return {
      tools: toolsWithScores,
      similarities,
      referenceTool
    };
  } catch (error) {
    console.error("Error in findSimilarByFeatures:", error);
    throw error;
  }
}

/**
 * LangGraph node function for findSimilarByFeatures
 */
export async function findSimilarByFeaturesNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;
  
  // For comparative queries, use the reference tool
  if (intent.isComparative && intent.referenceTool) {
    // First, try to find the reference tool by name
    const referenceTools = await mongoDBService.searchToolsByName(intent.referenceTool, 1);
    
    if (referenceTools.length > 0) {
      const referenceToolId = referenceTools[0]._id.toString();
      
      // Build filters from intent (excluding the reference tool)
      const filters: Record<string, any> = {};
      
      if (intent.categories && intent.categories.length > 0) {
        filters.category = { match: { any: intent.categories } };
      }
      
      if (intent.interface && intent.interface.length > 0) {
        filters.interface = { match: { any: intent.interface } };
      }
      
      if (intent.deployment && intent.deployment.length > 0) {
        filters.deployment = { match: { any: intent.deployment } };
      }
      
      const result = await findSimilarByFeatures({
        referenceToolId,
        limit: 10,
        filters
      });
      
      return {
        executionResults: [...(state.executionResults || []), result]
      };
    }
  }
  
  // If no reference tool found or not a comparative query, return empty results
  return {
    executionResults: [...(state.executionResults || []), { 
      tools: [], 
      similarities: [], 
      referenceTool: null 
    }]
  };
}
```

## Task 2.10: excludeTools

### Implementation Details:

**nodes/functions/exclude-tools.ts**
```typescript
import { State } from "@/types/state";

interface ExcludeToolsParams {
  tools: any[];
  excludeToolIds: string[];
  excludeToolNames?: string[];
}

interface ExcludeToolsResult {
  tools: any[];
  excludedCount: number;
  originalCount: number;
}

/**
 * Exclude specified tools from results
 */
export async function excludeTools(
  params: ExcludeToolsParams
): Promise<ExcludeToolsResult> {
  const { tools, excludeToolIds, excludeToolNames = [] } = params;
  
  if (!tools || tools.length === 0) {
    return { tools: [], excludedCount: 0, originalCount: 0 };
  }

  const originalCount = tools.length;
  
  if (excludeToolIds.length === 0 && excludeToolNames.length === 0) {
    return { tools, excludedCount: 0, originalCount };
  }
  
  try {
    // Filter out tools by ID
    let filteredTools = tools.filter(tool => {
      const toolId = tool._id.toString();
      return !excludeToolIds.includes(toolId);
    });
    
    // Filter out tools by name
    if (excludeToolNames.length > 0) {
      filteredTools = filteredTools.filter(tool => {
        const toolName = tool.name.toLowerCase();
        return !excludeToolNames.some(excludeName => 
          toolName.includes(excludeName.toLowerCase())
        );
      });
    }
    
    const excludedCount = originalCount - filteredTools.length;
    
    return {
      tools: filteredTools,
      excludedCount,
      originalCount
    };
  } catch (error) {
    console.error("Error in excludeTools:", error);
    throw error;
  }
}

/**
 * LangGraph node function for excludeTools
 */
export async function excludeToolsNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;
  
  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0 
    ? executionResults[executionResults.length - 1].tools || []
    : [];
    
  if (latestResults.length === 0 || (!intent.excludeTools || intent.excludeTools.length === 0)) {
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }
  
  // Try to find tool IDs for the names to exclude
  const { mongoDBService } = await import("@/services/mongodb.service");
  const excludeToolIds: string[] = [];
  
  for (const toolName of intent.excludeTools) {
    try {
      const tools = await mongoDBService.searchToolsByName(toolName, 1);
      if (tools.length > 0) {
        excludeToolIds.push(tools[0]._id.toString());
      }
    } catch (error) {
      console.error(`Error finding tool ID for "${toolName}":`, error);
    }
  }
  
  const result = await excludeTools({
    tools: latestResults,
    excludeToolIds,
    excludeToolNames: intent.excludeTools
  });
  
  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
```

## Task 2.11: mergeAndDedupe

### Implementation Details:

**nodes/functions/merge-and-dedupe.ts**
```typescript
import { State } from "@/types/state";

interface MergeAndDedupeParams {
  resultSets: Array<{
    tools: any[];
    weight?: number;
  }>;
  strategy?: "weighted" | "best" | "diverse";
  limit?: number;
}

interface MergeAndDedupeResult {
  tools: any[];
  mergeStrategy: string;
  originalTotalCount: number;
  finalCount: number;
}

/**
 * Merge and deduplicate multiple result sets
 */
export async function mergeAndDedupe(
  params: MergeAndDedupeParams
): Promise<MergeAndDedupeResult> {
  const { resultSets, strategy = "weighted", limit = 20 } = params;
  
  if (!resultSets || resultSets.length === 0) {
    return { 
      tools: [], 
      mergeStrategy: strategy, 
      originalTotalCount: 0, 
      finalCount: 0 
    };
  }

  // Calculate original total count
  const originalTotalCount = resultSets.reduce(
    (total, resultSet) => total + (resultSet.tools?.length || 0), 
    0
  );
  
  try {
    // Create a map to deduplicate by tool ID
    const toolMap = new Map();
    
    // Process each result set
    resultSets.forEach((resultSet, resultSetIndex) => {
      const weight = resultSet.weight || 1;
      
      resultSet.tools.forEach(tool => {
        const toolId = tool._id.toString();
        
        if (toolMap.has(toolId)) {
          // Tool already exists, merge properties
          const existingTool = toolMap.get(toolId);
          
          // Merge similarity scores if available
          if (tool.similarityScore !== undefined) {
            if (existingTool.similarityScore === undefined) {
              existingTool.similarityScore = tool.similarityScore;
            } else {
              // Weighted average of similarity scores
              existingTool.similarityScore = (
                existingTool.similarityScore + tool.similarityScore * weight
              ) / (1 + weight);
            }
          }
          
          // Update result set information
          if (!existingTool.foundInResultSets) {
            existingTool.foundInResultSets = [];
          }
          existingTool.foundInResultSets.push(resultSetIndex);
        } else {
          // New tool, add to map
          const newTool = { ...tool };
          
          // Apply weight to similarity score if available
          if (newTool.similarityScore !== undefined) {
            newTool.similarityScore *= weight;
          }
          
          // Track which result set it came from
          newTool.foundInResultSets = [resultSetIndex];
          
          toolMap.set(toolId, newTool);
        }
      });
    });
    
    // Convert map back to array
    let mergedTools = Array.from(toolMap.values());
    
    // Apply merge strategy
    if (strategy === "best") {
      // Sort by similarity score (descending)
      mergedTools.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
    } else if (strategy === "diverse") {
      // Sort by similarity score but try to ensure diversity
      mergedTools.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
      
      // Simple diversity: if multiple tools from same category, space them out
      const diverseTools: any[] = [];
      const categoryMap = new Map();
      
      // First pass: add one tool from each category
      mergedTools.forEach(tool => {
        const category = tool.category || tool.categories?.[0] || "other";
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, true);
          diverseTools.push(tool);
        }
      });
      
      // Second pass: add remaining tools
      mergedTools.forEach(tool => {
        const category = tool.category || tool.categories?.[0] || "other";
        
        if (!categoryMap.has(category) || diverseTools.length < limit) {
          if (!diverseTools.includes(tool)) {
            diverseTools.push(tool);
          }
        }
      });
      
      mergedTools = diverseTools;
    }
    
    // Apply limit
    const finalTools = mergedTools.slice(0, limit);
    
    return {
      tools: finalTools,
      mergeStrategy: strategy,
      originalTotalCount,
      finalCount: finalTools.length
    };
  } catch (error) {
    console.error("Error in mergeAndDedupe:", error);
    throw error;
  }
}

/**
 * LangGraph node function for mergeAndDedupe
 */
export async function mergeAndDedupeNode(state: State): Promise<Partial<State>> {
  const { executionResults, plan } = state;
  
  if (!executionResults || executionResults.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: [] }]
    };
  }
  
  // Determine merge strategy from plan if available
  let strategy: "weighted" | "best" | "diverse" = "weighted";
  
  if (plan && plan.mergeStrategy) {
    strategy = plan.mergeStrategy;
  }
  
  // Extract result sets from execution results
  const resultSets = executionResults.map(result => ({
    tools: result.tools || [],
    weight: result.weight || 1
  }));
  
  const result = await mergeAndDedupe({
    resultSets,
    strategy,
    limit: 20
  });
  
  return {
    executionResults: [...(state.executionResults || []), result],
    queryResults: result.tools
  };
}
```

## Task 2.12: rankByRelevance

### Implementation Details:

**nodes/functions/rank-by-relevance.ts**
```typescript
import { State } from "@/types/state";
import { embeddingService } from "@/services/embedding.service";
import { cosineSimilarity } from "@/utils/cosine-similarity";

interface RankByRelevanceParams {
  tools: any[];
  query: string;
  strategy?: "semantic" | "hybrid" | "popularity";
  semanticWeight?: number; // For hybrid strategy
  popularityWeight?: number; // For hybrid strategy
}

interface RankByRelevanceResult {
  tools: any[];
  rankingStrategy: string;
  originalCount: number;
}

/**
 * Rank tools by relevance to the query
 */
export async function rankByRelevance(
  params: RankByRelevanceParams
): Promise<RankByRelevanceResult> {
  const { 
    tools, 
    query, 
    strategy = "semantic", 
    semanticWeight = 0.7, 
    popularityWeight = 0.3 
  } = params;
  
  if (!tools || tools.length === 0 || !query) {
    return { 
      tools: tools || [], 
      rankingStrategy: strategy, 
      originalCount: tools?.length || 0 
    };
  }

  const originalCount = tools.length;
  
  try {
    // Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    
    // Calculate relevance scores for each tool
    const toolsWithScores = await Promise.all(
      tools.map(async (tool) => {
        let relevanceScore = 0;
        
        if (strategy === "semantic" || strategy === "hybrid") {
          // Calculate semantic similarity
          let semanticScore = 0;
          
          // If tool already has a similarity score, use it
          if (tool.similarityScore !== undefined) {
            semanticScore = tool.similarityScore;
          } else if (tool.embedding) {
            // Calculate similarity using tool's embedding
            semanticScore = cosineSimilarity(queryEmbedding, tool.embedding);
          } else {
            // Generate embedding for tool description and calculate similarity
            const toolText = `${tool.name} ${tool.description || ""}`;
            const toolEmbedding = await embeddingService.generateEmbedding(toolText);
            semanticScore = cosineSimilarity(queryEmbedding, toolEmbedding);
          }
          
          if (strategy === "semantic") {
            relevanceScore = semanticScore;
          } else {
            // Hybrid strategy combines semantic and popularity
            const popularityScore = tool.popularity || tool.rating || tool.downloads || 0;
            // Normalize popularity score (assuming max value of 100)
            const normalizedPopularity = Math.min(popularityScore / 100, 1);
            
            relevanceScore = semanticScore * semanticWeight + normalizedPopularity * popularityWeight;
          }
        } else if (strategy === "popularity") {
          // Use only popularity metrics
          const popularityScore = tool.popularity || tool.rating || tool.downloads || 0;
          // Normalize popularity score (assuming max value of 100)
          relevanceScore = Math.min(popularityScore / 100, 1);
        }
        
        return {
          ...tool,
          relevanceScore
        };
      })
    );
    
    // Sort by relevance score (descending)
    toolsWithScores.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return {
      tools: toolsWithScores,
      rankingStrategy: strategy,
      originalCount
    };
  } catch (error) {
    console.error("Error in rankByRelevance:", error);
    throw error;
  }
}

/**
 * LangGraph node function for rankByRelevance
 */
export async function rankByRelevanceNode(state: State): Promise<Partial<State>> {
  const { query, preprocessedQuery, queryResults, intent } = state;
  
  // Use semantic query from intent or fall back to preprocessed query
  const rankingQuery = intent.semanticQuery || preprocessedQuery || query;
  
  // Get tools to rank
  const toolsToRank = queryResults || [];
  
  if (toolsToRank.length === 0) {
    return {
      queryResults: []
    };
  }
  
  // Determine ranking strategy based on intent
  let strategy: "semantic" | "hybrid" | "popularity" = "semantic";
  
  // If user is looking for popular tools, use hybrid or popularity strategy
  if (intent.keywords?.some(keyword => 
    ["popular", "trending", "best", "top"].includes(keyword.toLowerCase())
  )) {
    strategy = "hybrid";
  }
  
  const result = await rankByRelevance({
    tools: toolsToRank,
    query: rankingQuery,
    strategy
  });
  
  return {
    queryResults: result.tools
  };
}
```

## Additional Implementation Files

**nodes/functions/index.ts**
```typescript
// Export all search functions for easy importing
export { lookupByName, lookupByNameNode } from "./lookup-by-name";
export { semanticSearch, semanticSearchNode } from "./semantic-search";
export { filterByPrice, filterByPriceNode } from "./filter-by-price";
export { filterByCategory, filterByCategoryNode } from "./filter-by-category";
export { filterByInterface, filterByInterfaceNode } from "./filter-by-interface";
export { filterByFunctionality, filterByFunctionalityNode } from "./filter-by-functionality";
export { filterByUserType, filterByUserTypeNode } from "./filter-by-user-type";
export { filterByDeployment, filterByDeploymentNode } from "./filter-by-deployment";
export { findSimilarByFeatures, findSimilarByFeaturesNode } from "./find-similar-by-features";
export { excludeTools, excludeToolsNode } from "./exclude-tools";
export { mergeAndDedupe, mergeAndDedupeNode } from "./merge-and-dedupe";
export { rankByRelevance, rankByRelevanceNode } from "./rank-by-relevance";
```

With these detailed implementations for Phase 2, you'll have a comprehensive set of search functions that can be used as building blocks in your LangGraph execution plans. Each function is designed to work both independently and as part of a larger pipeline, with clear input/output interfaces and consistent error handling.