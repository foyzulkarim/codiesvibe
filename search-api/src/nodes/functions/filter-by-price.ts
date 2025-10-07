import { State } from "@/types/state";

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
          return tool.pricingModel?.includes("free") ||
                 tool.pricingModel?.includes("freemium") ||
                 tool.pricingSummary?.toLowerCase().includes("free");
        } else {
          return !tool.pricingModel?.includes("free") &&
                 !tool.pricingModel?.includes("freemium") &&
                 !tool.pricingSummary?.toLowerCase().includes("free");
        }
      });
    }

    // Filter by pricing model
    if (pricingModel) {
      filteredTools = filteredTools.filter(tool =>
        tool.pricingModel?.includes(pricingModel) ||
        (Array.isArray(tool.pricingModel) && tool.pricingModel.includes(pricingModel))
      );
    }

    // Filter by price range using pricingSummary text extraction
    if (maxPrice !== undefined) {
      filteredTools = filteredTools.filter(tool => {
        const pricingText = tool.pricingSummary || tool.description || "";

        // Extract price numbers from text
        const priceMatches = pricingText.match(/\$?(\d+(?:,\d+)*)/g);
        if (priceMatches) {
          // Extract numeric values and find the lowest price mentioned
          const prices = priceMatches
            .map(match => parseInt(match.replace(/\$/g, '').replace(/,/g, '')))
            .filter(price => !isNaN(price));

          if (prices.length > 0) {
            return Math.min(...prices) <= maxPrice;
          }
        }

        // If no price found, only include if we're looking for free tools
        return maxPrice === 0 && tool.pricingModel?.includes("free");
      });
    }

    if (minPrice !== undefined) {
      filteredTools = filteredTools.filter(tool => {
        const pricingText = tool.pricingSummary || tool.description || "";

        // Extract price numbers from text
        const priceMatches = pricingText.match(/\$?(\d+(?:,\d+)*)/g);
        if (priceMatches) {
          // Extract numeric values and find the highest price mentioned
          const prices = priceMatches
            .map(match => parseInt(match.replace(/\$/g, '').replace(/,/g, '')))
            .filter(price => !isNaN(price));

          if (prices.length > 0) {
            return Math.max(...prices) >= minPrice;
          }
        }

        // If no price found, exclude unless minPrice is 0
        return minPrice === 0 && tool.pricingModel?.includes("free");
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