import { StateAnnotation } from "@/types/state";

interface PriceConstraints {
  hasFreeTier?: boolean;
  maxPrice?: number;
  minPrice?: number;
  pricingModel?: string;
}

function extractPriceConstraints(query: string): PriceConstraints {
  const constraints: PriceConstraints = {};

  // Check for free tier preferences
  if (/\b(free|freemium|no cost|0$|zero cost)\b/gi.test(query)) {
    constraints.hasFreeTier = true;
  }

  // Extract price ranges
  const priceRangePatterns = [
    /under \$?(\d+)/gi,
    /less than \$?(\d+)/gi,
    /below \$?(\d+)/gi,
    /max \$?(\d+)/gi,
    /up to \$?(\d+)/gi,
    /cheaper than \$?(\d+)/gi
  ];

  for (const pattern of priceRangePatterns) {
    const match = pattern.exec(query);
    if (match) {
      constraints.maxPrice = parseInt(match[1]);
      break;
    }
  }

  const minPricePatterns = [
    /over \$?(\d+)/gi,
    /more than \$?(\d+)/gi,
    /above \$?(\d+)/gi,
    /min \$?(\d+)/gi,
    /at least \$?(\d+)/gi
  ];

  for (const pattern of minPricePatterns) {
    const match = pattern.exec(query);
    if (match) {
      constraints.minPrice = parseInt(match[1]);
      break;
    }
  }

  // Extract pricing model preferences
  if (/\b(subscription|monthly|annual|yearly)\b/gi.test(query)) {
    constraints.pricingModel = "subscription";
  } else if (/\b(one.?time|lifetime|perpetual|single.?payment)\b/gi.test(query)) {
    constraints.pricingModel = "one-time";
  } else if (/\b(usage.?based|pay.?as.?you.?go|per.?use)\b/gi.test(query)) {
    constraints.pricingModel = "usage-based";
  }

  return constraints;
}

/**
 * Extract price constraints from the query
 */
export async function priceExtractorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;

  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        priceConstraints: {}
      }
    };
  }

  try {
    // Use pattern matching to extract price constraints
    const priceConstraints = extractPriceConstraints(preprocessedQuery);

    return {
      extractionSignals: {
        ...state.extractionSignals,
        priceConstraints
      }
    };
  } catch (error) {
    console.error("Error in priceExtractorNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        priceConstraints: {}
      }
    };
  }
}