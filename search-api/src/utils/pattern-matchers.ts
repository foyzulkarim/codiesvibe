/**
 * Price constraint extraction patterns
 */
export const pricePatterns = {
  free: /\b(free|no cost|no charge|gratis|free tier|free trial)\b/i,
  paid: /\b(paid|premium|pro|commercial|subscription|monthly|annual|yearly|one-time|one off|lifetime|perpetual)\b/i,

  // Price range patterns
  maxPrice: /\b(under|below|less than|cheaper than|under \$|below \$|less than \$)\s*(\$?\d+)/i,
  minPrice: /\b(over|above|more than|expensive than|over \$|above \$|more than \$)\s*(\$?\d+)/i,
  priceRange: /\b(between|from \$|between \$)\s*(\$?\d+)\s*(and|to|-)\s*(\$?\d+)/i,
};

/**
 * Interface preference patterns
 */
export const interfacePatterns = {
  web: /\b(web|browser|online|website|web app|web application)\b/i,
  desktop: /\b(desktop|native|standalone|client|application)\b/i,
  mobile: /\b(mobile|phone|tablet|ios|android|app)\b/i,
  cli: /\b(cli|command line|terminal|console)\b/i,
  api: /\b(api|rest|graphql|sdk|library)\b/i,
};

/**
 * Deployment preference patterns
 */
export const deploymentPatterns = {
  cloud: /\b(cloud|saas|hosted|online|web-based)\b/i,
  selfHosted: /\b(self-hosted|on-premise|on-prem|local|self-host)\b/i,
  hybrid: /\b(hybrid|mixed|both)\b/i,
};

/**
 * Comparative intent patterns
 */
export const comparativePatterns = {
  direct: /\b(compare|vs|versus|alternative to|instead of|replacement for)\b/i,
  similarity: /\b(similar to|like|such as|as good as)\b/i,
  difference: /\b(difference between|better than|worse than)\b/i,
};

/**
 * Extract price constraints from text
 */
export function extractPriceConstraints(text: string): {
  hasFreeTier?: boolean;
  maxPrice?: number;
  minPrice?: number;
  pricingModel?: string[];
} {
  const result: any = {};
  const pricingModels: string[] = [];

  // Check for free tier
  if (pricePatterns.free.test(text)) {
    result.hasFreeTier = true;
    pricingModels.push("Free");
  }

  // Check for paid options
  if (pricePatterns.paid.test(text)) {
    pricingModels.push("Paid");
  }

  // Set pricing model array if any were found
  if (pricingModels.length > 0) {
    result.pricingModel = pricingModels;
  }

  // Extract price range
  const maxPriceMatch = text.match(pricePatterns.maxPrice);
  if (maxPriceMatch) {
    result.maxPrice = parseInt(maxPriceMatch[2].replace(/\$/g, ""));
  }

  const minPriceMatch = text.match(pricePatterns.minPrice);
  if (minPriceMatch) {
    result.minPrice = parseInt(minPriceMatch[2].replace(/\$/g, ""));
  }

  const priceRangeMatch = text.match(pricePatterns.priceRange);
  if (priceRangeMatch) {
    result.minPrice = parseInt(priceRangeMatch[2].replace(/\$/g, ""));
    result.maxPrice = parseInt(priceRangeMatch[4].replace(/\$/g, ""));
  }

  return result;
}

/**
 * Extract interface preferences from text
 */
export function extractInterfacePreferences(text: string): string[] {
  const preferences: string[] = [];

  if (interfacePatterns.web.test(text)) {
    preferences.push("web");
  }

  if (interfacePatterns.desktop.test(text)) {
    preferences.push("desktop");
  }

  if (interfacePatterns.mobile.test(text)) {
    preferences.push("mobile");
  }

  if (interfacePatterns.cli.test(text)) {
    preferences.push("cli");
  }

  if (interfacePatterns.api.test(text)) {
    preferences.push("api");
  }

  return preferences;
}

/**
 * Extract deployment preferences from text
 */
export function extractDeploymentPreferences(text: string): string[] {
  const preferences: string[] = [];

  if (deploymentPatterns.cloud.test(text)) {
    preferences.push("cloud");
  }

  if (deploymentPatterns.selfHosted.test(text)) {
    preferences.push("self-hosted");
  }

  if (deploymentPatterns.hybrid.test(text)) {
    preferences.push("hybrid");
  }

  return preferences;
}

/**
 * Detect comparative intent in text
 */
export function detectComparativeIntent(text: string): {
  isComparative: boolean;
  confidence: number;
  pattern?: string;
} {
  // Check each pattern type
  if (comparativePatterns.direct.test(text)) {
    return { isComparative: true, confidence: 0.9, pattern: "direct" };
  }

  if (comparativePatterns.similarity.test(text)) {
    return { isComparative: true, confidence: 0.7, pattern: "similarity" };
  }

  if (comparativePatterns.difference.test(text)) {
    return { isComparative: true, confidence: 0.8, pattern: "difference" };
  }

  return { isComparative: false, confidence: 0.0 };
}

/**
 * Extract reference tool name from comparative query
 */
export function extractReferenceTool(text: string): string | null {
  // This is a simplified implementation
  // In a real system, you might use NER or more sophisticated parsing

  // Look for patterns like "alternative to [tool]" or "vs [tool]"
  const alternativeMatch = text.match(/alternative to\s+([a-zA-Z0-9\s-]+)/i);
  if (alternativeMatch) {
    return alternativeMatch[1].trim();
  }

  const vsMatch = text.match(/(?:vs|versus)\s+([a-zA-Z0-9\s-]+)/i);
  if (vsMatch) {
    return vsMatch[1].trim();
  }

  const insteadOfMatch = text.match(/instead of\s+([a-zA-Z0-9\s-]+)/i);
  if (insteadOfMatch) {
    return insteadOfMatch[1].trim();
  }

  return null;
}