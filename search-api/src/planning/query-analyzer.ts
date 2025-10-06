/**
 * Enhanced Query Analyzer for better entity extraction and intent recognition
 * This module provides advanced query analysis capabilities to better utilize the enhanced prompt
 */

export interface QueryPattern {
  type: 'brand' | 'category' | 'pricing' | 'capability' | 'general';
  confidence: number;
  entities: Record<string, any>;
  constraints: Record<string, any>;
  keywords: string[];
  semanticContext?: Record<string, number>; // Weight of semantic context for disambiguation
}

export interface EnhancedQueryContext {
  originalQuery: string;
  interpretedIntent: string;
  extractedEntities: Record<string, any>;
  constraints: Record<string, any>;
  ambiguities: string[];
  queryPattern: QueryPattern;
  suggestedTools: string[];
  confidence: number;
  preprocessedQuery?: string; // Added for preprocessing
}

/**
 * Enhanced Query Analyzer class
 */
export class QueryAnalyzer {
  // Known brand names and AI tools
  private static readonly BRAND_PATTERNS = [
    'chatgpt', 'gpt-4', 'gpt4', 'openai', 'claude', 'anthropic', 'gemini', 'bard',
    'midjourney', 'dall-e', 'dalle', 'stable diffusion', 'notion', 'jasper', 'copy.ai',
    'grammarly', 'canva', 'figma', 'slack', 'discord', 'zoom', 'microsoft', 'google',
    'amazon', 'aws', 'azure', 'adobe', 'salesforce', 'hubspot', 'airtable', 'trello'
  ];

  // Category indicators
  private static readonly CATEGORY_PATTERNS = [
    'writing', 'coding', 'programming', 'development', 'design', 'image', 'video',
    'audio', 'music', 'productivity', 'automation', 'analytics', 'data', 'marketing',
    'sales', 'customer service', 'chatbot', 'project management', 'collaboration',
    'security', 'testing', 'monitoring', 'deployment'
  ];

  // Pricing indicators
  private static readonly PRICING_PATTERNS = [
    'freemium', 'open source', 'cheap', 'affordable', 'expensive',
    'enterprise', 'premium', 'subscription', 'monthly', 'annual', 'pricing',
    'cost', 'price', '$', 'under', 'below', 'between', 'budget'
  ];

  // Capability indicators
  private static readonly CAPABILITY_PATTERNS = [
    'webhook', 'sdk', 'offline', 'real-time', 'multi-user', 'cloud', 'on-premise',
    'mobile', 'desktop', 'browser', 'code generation', 'image generation',
    'data analysis', 'machine learning', 'automation', 'workflow', 'template'
  ];

  // Brand name variations for normalization
  private static readonly BRAND_VARIATIONS: Record<string, string[]> = {
    'chatgpt': ['chat gpt', 'chat-gpt', 'gpt', 'gpt3', 'gpt-3'],
    'gpt-4': ['gpt4', 'gpt 4'],
    'claude': ['claude ai', 'anthropic claude'],
    'midjourney': ['mid journey'],
    'dall-e': ['dalle', 'dall e'],
    'gemini': ['google gemini', 'bard gemini'],
    'notion': ['notion.so', 'notion app'],
    'figma': ['figma design', 'figma tool'],
    'canva': ['canva design', 'canva tool'],
    'grammarly': ['grammar ly', 'grammar check'],
    'slack': ['slack app', 'slack tool'],
    'discord': ['discord app', 'discord tool'],
    'zoom': ['zoom app', 'zoom meeting'],
    'trello': ['trello board', 'trello project'],
    'airtable': ['air table', 'airtable db'],
    'salesforce': ['sales force', 'salesforce crm'],
    'hubspot': ['hub spot', 'hubspot crm'],
    'adobe': ['adobe creative', 'adobe tools'],
    'microsoft': ['ms', 'microsoft office'],
    'google': ['google workspace', 'google apps'],
    'amazon': ['amazon aws', 'amazon web services'],
    'aws': ['amazon web services', 'amazon cloud'],
    'azure': ['microsoft azure', 'azure cloud']
  };

  // Common query variations for preprocessing
  private static readonly QUERY_VARIATIONS: Record<string, string> = {
    'ai': 'artificial intelligence',
    'ml': 'machine learning',
    'ui': 'user interface',
    'ux': 'user experience',
    'crm': 'customer relationship management',
    'hr': 'human resources',
    'saas': 'software as a service',
    'paas': 'platform as a service',
    'iaas': 'infrastructure as a service',
    'devops': 'development operations',
    'no code': 'no-code',
    'low code': 'low-code',
    'self hosted': 'self-hosted',
    'on premise': 'on-premise',
    'onprem': 'on-premise',
    'real time': 'real-time',
    'realtime': 'real-time',
    'web app': 'web application',
    'mobile app': 'mobile application'
  };

  /**
   * Analyze query and extract enhanced context
   */
  static analyzeQuery(query: string): EnhancedQueryContext {
    // Preprocess the query for better pattern matching
    const preprocessedQuery = this.preprocessQuery(query);
    const normalizedQuery = preprocessedQuery.toLowerCase().trim();
    
    // Identify query pattern with enhanced semantic context
    const pattern = this.identifyQueryPattern(normalizedQuery);
    
    // Extract entities based on pattern
    const entities = this.extractEntities(normalizedQuery, pattern);
    
    // Extract constraints with enhanced patterns
    const constraints = this.extractConstraints(normalizedQuery);
    
    // Determine intent
    const intent = this.determineIntent(normalizedQuery, pattern, entities);
    
    // Identify ambiguities with improved logic
    const ambiguities = this.identifyAmbiguities(normalizedQuery, pattern);
    
    // Suggest tools based on analysis
    const suggestedTools = this.suggestTools(pattern, entities, constraints);
    
    // Calculate overall confidence with baseline and context-aware thresholds
    const confidence = this.calculateConfidence(pattern, entities, constraints, ambiguities, normalizedQuery);

    return {
      originalQuery: query,
      interpretedIntent: intent,
      extractedEntities: entities,
      constraints,
      ambiguities,
      queryPattern: pattern,
      suggestedTools,
      confidence,
      preprocessedQuery
    };
  }

  /**
   * Preprocess query to handle common variations and normalize brand names
   */
  private static preprocessQuery(query: string): string {
    let processedQuery = query.toLowerCase().trim();
    
    // Replace common abbreviations and variations
    for (const [variation, replacement] of Object.entries(this.QUERY_VARIATIONS)) {
      const regex = new RegExp(`\\b${variation}\\b`, 'gi');
      processedQuery = processedQuery.replace(regex, replacement);
    }
    
    // Normalize brand name variations
    for (const [canonicalBrand, variations] of Object.entries(this.BRAND_VARIATIONS)) {
      for (const variation of variations) {
        const regex = new RegExp(`\\b${variation}\\b`, 'gi');
        processedQuery = processedQuery.replace(regex, canonicalBrand);
      }
    }
    
    // Handle common spacing issues
    processedQuery = processedQuery.replace(/\s+/g, ' ').trim();
    
    return processedQuery;
  }

  /**
   * Identify the primary pattern of the query with enhanced semantic context
   */
  private static identifyQueryPattern(query: string): QueryPattern {
    const patterns = {
      brand: this.matchBrandPatterns(query),
      category: this.matchCategoryPatterns(query),
      pricing: this.matchPricingPatterns(query),
      capability: this.matchCapabilityPatterns(query)
    };

    // Calculate semantic context weights for disambiguation
    const semanticContext = this.calculateSemanticContext(query, patterns);
    
    // Apply weighting for pattern combinations to handle overlapping patterns
    const weightedPatterns = this.applyPatternWeighting(patterns, semanticContext);
    
    // Find the pattern with highest confidence after weighting
    let bestPattern: 'brand' | 'category' | 'pricing' | 'capability' | 'general' = 'general';
    let highestConfidence = 0;

    for (const [type, matches] of Object.entries(weightedPatterns)) {
      if (matches.confidence > highestConfidence) {
        highestConfidence = matches.confidence;
        bestPattern = type as 'brand' | 'category' | 'pricing' | 'capability';
      }
    }

    // Apply baseline confidence for clear pattern matches
    if (bestPattern !== 'general' && highestConfidence < 0.5) {
      // Check if this is a clear match that deserves baseline confidence
      if (this.isClearPatternMatch(bestPattern, patterns[bestPattern as keyof typeof patterns], query)) {
        highestConfidence = Math.max(highestConfidence, 0.6);
      }
    }

    return {
      type: bestPattern,
      confidence: highestConfidence,
      entities: patterns[bestPattern as keyof typeof patterns].entities || {},
      constraints: {},
      keywords: this.extractKeywords(query),
      semanticContext
    };
  }

  /**
   * Calculate semantic context for pattern disambiguation
   */
  private static calculateSemanticContext(query: string, patterns: Record<string, any>): Record<string, number> {
    const context: Record<string, number> = {};
    
    // Brand context indicators
    if (/\b(alternative|vs|versus|compare|like|similar)\b/i.test(query)) {
      context.brandComparison = 0.3;
    }
    
    // Category context indicators
    if (/\b(tools|software|platform|apps|applications|solutions)\b/i.test(query)) {
      context.categoryIndicator = 0.1; // Reduced weight
    }
    
    // Pricing context indicators - enhanced with more terms
    if (/\b(cost|price|pricing|cheap|expensive|budget|affordable|subscription|monthly|annual|free|under|below|between)\b/i.test(query)) {
      context.pricingIndicator = 0.4; // Increased weight
    }
    
    // Capability context indicators - enhanced with more terms
    if (/\b(with|that|can|able to|supports|features|functionality|api|webhook|sdk|integration|real-time|offline|mobile|desktop|cloud)\b/i.test(query)) {
      context.capabilityIndicator = 0.3; // Increased weight
    }
    
    return context;
  }

  /**
   * Apply weighting for pattern combinations to handle overlapping patterns
   */
  private static applyPatternWeighting(
    patterns: Record<string, any>,
    semanticContext: Record<string, number>
  ): Record<string, any> {
    const weighted = { ...patterns };
    
    // Boost brand confidence when brand comparison indicators are present
    if (semanticContext.brandComparison) {
      weighted.brand.confidence += semanticContext.brandComparison;
    }
    
    // Boost category confidence when category indicators are present
    if (semanticContext.categoryIndicator) {
      weighted.category.confidence += semanticContext.categoryIndicator;
    }
    
    // Boost pricing confidence when pricing indicators are present
    if (semanticContext.pricingIndicator) {
      weighted.pricing.confidence += semanticContext.pricingIndicator;
    }
    
    // Boost capability confidence when capability indicators are present
    if (semanticContext.capabilityIndicator) {
      weighted.capability.confidence += semanticContext.capabilityIndicator;
    }
    
    // Handle overlapping patterns between category and capability
    if (weighted.category.confidence > 0.3 && weighted.capability.confidence > 0.3) {
      // Check if this is more likely a capability query with category context
      const capIndicator = semanticContext.capabilityIndicator || 0;
      const catIndicator = semanticContext.categoryIndicator || 0;
      
      if (capIndicator > catIndicator) {
        weighted.capability.confidence += 0.2;
        weighted.category.confidence -= 0.1;
      } else {
        weighted.category.confidence += 0.2;
        weighted.capability.confidence -= 0.1;
      }
    }
    
    // Ensure confidence values stay within bounds
    Object.keys(weighted).forEach(key => {
      weighted[key].confidence = Math.max(0, Math.min(1, weighted[key].confidence));
    });
    
    return weighted;
  }

  /**
   * Check if this is a clear pattern match that deserves baseline confidence
   */
  private static isClearPatternMatch(
    patternType: string,
    pattern: any,
    query: string
  ): boolean {
    switch (patternType) {
      case 'brand':
        // Clear brand matches have specific brand names
        return pattern.entities.brandNames && pattern.entities.brandNames.length > 0;
      
      case 'pricing':
        // Clear pricing matches have specific price terms or currency
        return (pattern.entities.pricingTerms && pattern.entities.pricingTerms.length > 0) ||
               pattern.entities.hasCurrency ||
               pattern.entities.priceRanges;
      
      case 'category':
        // Clear category matches have multiple category indicators
        return (pattern.entities.categories && pattern.entities.categories.length > 1) ||
               pattern.entities.categoryIndicators;
      
      case 'capability':
        // Clear capability matches have technical terms or specific capabilities
        return (pattern.entities.capabilities && pattern.entities.capabilities.length > 0) ||
               (pattern.entities.technicalTerms && pattern.entities.technicalTerms.length > 0);
      
      default:
        return false;
    }
  }

  /**
   * Match brand name patterns
   */
  private static matchBrandPatterns(query: string): { confidence: number; entities: Record<string, any> } {
    const entities: Record<string, any> = {};
    let confidence = 0;

    for (const brand of this.BRAND_PATTERNS) {
      if (query.includes(brand)) {
        entities.brandNames = entities.brandNames || [];
        entities.brandNames.push(brand);
        confidence += 0.3;
      }
    }

    // Check for brand-like patterns (capitalized words, version numbers)
    const brandLikePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b|\b[A-Z]+-\d+\b/g;
    const matches = query.match(brandLikePattern);
    if (matches) {
      entities.brandNames = entities.brandNames || [];
      entities.brandNames.push(...matches);
      confidence += 0.2;
    }

    return { confidence: Math.min(confidence, 1), entities };
  }

  /**
   * Match category patterns
   */
  private static matchCategoryPatterns(query: string): { confidence: number; entities: Record<string, any> } {
    const entities: Record<string, any> = {};
    let confidence = 0;

    for (const category of this.CATEGORY_PATTERNS) {
      if (query.includes(category)) {
        entities.categories = entities.categories || [];
        entities.categories.push(category);
        confidence += 0.25;
      }
    }

    // Check for category indicators like "tools", "software", "platform"
    if (query.includes('tools') || query.includes('software') || query.includes('platform')) {
      entities.categoryIndicators = true;
      confidence += 0.2;
    }

    return { confidence: Math.min(confidence, 1), entities };
  }

  /**
   * Match pricing patterns
   */
  private static matchPricingPatterns(query: string): { confidence: number; entities: Record<string, any> } {
    const entities: Record<string, any> = {};
    let confidence = 0;

    for (const pricing of this.PRICING_PATTERNS) {
      if (query.includes(pricing)) {
        entities.pricingTerms = entities.pricingTerms || [];
        entities.pricingTerms.push(pricing);
        confidence += 0.2;
      }
    }

    // Extract price ranges
    const priceRangePattern = /\$(\d+)\s*-\s*\$(\d+)|under\s*\$(\d+)|below\s*\$(\d+)|between\s*\$(\d+)\s*and\s*\$(\d+)/gi;
    const priceMatches = query.match(priceRangePattern);
    if (priceMatches) {
      entities.priceRanges = priceMatches;
      confidence += 0.3;
    }

    // Extract currency symbols
    if (query.includes('$') || query.includes('€') || query.includes('£')) {
      entities.hasCurrency = true;
      confidence += 0.1;
    }

    return { confidence: Math.min(confidence, 1), entities };
  }

  /**
   * Match capability patterns with better detection logic
   */
  private static matchCapabilityPatterns(query: string): { confidence: number; entities: Record<string, any> } {
    const entities: Record<string, any> = {};
    let confidence = 0;

    // Enhanced capability detection with context awareness
    for (const capability of this.CAPABILITY_PATTERNS) {
      if (query.includes(capability)) {
        entities.capabilities = entities.capabilities || [];
        entities.capabilities.push(capability);
        confidence += 0.2;
      }
    }

    // Enhanced technical terms detection with more comprehensive patterns
    const technicalPatterns = [
      /\b(api|sdk|webhook|integration|offline|real-time|cloud|mobile|desktop)\b/gi,
      /\b(rest|graphql|oauth|saml|sso|2fa|mfa)\b/gi, // Authentication/API terms
      /\b(javascript|python|java|node|react|vue|angular)\b/gi, // Technology stack
      /\b(database|sql|nosql|mongodb|postgres|mysql)\b/gi, // Data storage
      /\b(docker|kubernetes|ci\/cd|devops)\b/gi, // DevOps terms
      /\b(ai|ml|machine learning|artificial intelligence|nlp)\b/gi // AI/ML terms
    ];

    const allTechnicalTerms: string[] = [];
    for (const pattern of technicalPatterns) {
      const matches = query.match(pattern);
      if (matches) {
        allTechnicalTerms.push(...matches);
      }
    }

    if (allTechnicalTerms.length > 0) {
      entities.technicalTerms = [...new Set(allTechnicalTerms)]; // Remove duplicates
      confidence += Math.min(allTechnicalTerms.length * 0.1, 0.3); // Cap at 0.3
    }

    // Detect capability-specific patterns with higher confidence
    const capabilitySpecificPatterns = [
      { pattern: /\bwith\s+(api|webhook|sdk)\b/i, weight: 0.3 },
      { pattern: /\b(supports|has|includes)\s+(api|webhook|integration)\b/i, weight: 0.25 },
      { pattern: /\b(capable of|able to)\s+\w+/i, weight: 0.2 },
      { pattern: /\bfeatures?\s+include\s+/i, weight: 0.15 }
    ];

    for (const { pattern, weight } of capabilitySpecificPatterns) {
      if (pattern.test(query)) {
        confidence += weight;
        entities.capabilityIndicators = true;
      }
    }

    return { confidence: Math.min(confidence, 1), entities };
  }

  /**
   * Extract entities based on identified pattern
   */
  private static extractEntities(query: string, pattern: QueryPattern): Record<string, any> {
    const entities = { ...pattern.entities };

    // Extract common entities regardless of pattern
    const limitMatch = query.match(/(\d+)\s*(item|result|tool)/i);
    if (limitMatch && limitMatch[1]) {
      entities.resultLimit = parseInt(limitMatch[1]);
    }

    // Extract sorting preferences
    if (query.includes('popular') || query.includes('trending')) {
      entities.sortPreference = 'popularity';
    }
    if (query.includes('new') || query.includes('latest')) {
      entities.sortPreference = 'recent';
    }
    if (query.includes('best') || query.includes('top')) {
      entities.sortPreference = 'rating';
    }

    return entities;
  }

  /**
   * Extract constraints from query with enhanced patterns
   */
  private static extractConstraints(query: string): Record<string, any> {
    const constraints: Record<string, any> = {};

    // Enhanced price constraints with more complex patterns
    const priceConstraint = query.match(/(under|below|less than)\s*\$(\d+)/i);
    if (priceConstraint && priceConstraint[2]) {
      constraints.maxPrice = parseInt(priceConstraint[2]);
    }

    // Enhanced price range constraints for "between X and Y" patterns
    const priceRangeConstraint = query.match(/\$(\d+)\s*-\s*\$(\d+)/);
    if (priceRangeConstraint && priceRangeConstraint[1] && priceRangeConstraint[2]) {
      constraints.minPrice = parseInt(priceRangeConstraint[1]);
      constraints.maxPrice = parseInt(priceRangeConstraint[2]);
    }

    // Complex price range pattern: "between $X and $Y"
    const complexPriceRange = query.match(/between\s*\$(\d+)\s*(and|to)\s*\$(\d+)/i);
    if (complexPriceRange && complexPriceRange[1] && complexPriceRange[3]) {
      constraints.minPrice = parseInt(complexPriceRange[1]);
      constraints.maxPrice = parseInt(complexPriceRange[3]);
    }

    // Monthly/annual pricing indicator
    if (query.includes('monthly') || query.includes('per month')) {
      constraints.pricingPeriod = 'monthly';
    } else if (query.includes('annual') || query.includes('yearly') || query.includes('per year')) {
      constraints.pricingPeriod = 'annual';
    }

    // Consistent "free" term recognition in all contexts
    const freePatterns = [
      /\bfree\b/i,
      /\bno cost\b/i,
      /\bfree tier\b/i,
      /\bfree plan\b/i,
      /\bfreemium\b/i,
      /\bopen source\b/i,
      /\bno charge\b/i
    ];
    
    for (const pattern of freePatterns) {
      if (pattern.test(query)) {
        constraints.hasFreeTier = true;
        break;
      }
    }

    // Enhanced capability detection
    if (query.includes('api') || query.includes('integration')) {
      constraints.apiAccess = true;
    }

    // More specific capability constraints
    const capabilityConstraints = [
      { pattern: /\bwebhook\b/i, constraint: 'hasWebhooks' },
      { pattern: /\bsdk\b/i, constraint: 'hasSDK' },
      { pattern: /\boffline\b/i, constraint: 'offlineMode' },
      { pattern: /\bmobile\b/i, constraint: 'mobileSupport' },
      { pattern: /\bcloud\b/i, constraint: 'cloudBased' },
      { pattern: /\bon-premise\b/i, constraint: 'onPremise' },
      { pattern: /\bcollaboration\b/i, constraint: 'collaborationFeatures' },
      { pattern: /\breal-time\b/i, constraint: 'realTimeFeatures' },
      { pattern: /\bmulti-user\b/i, constraint: 'multiUserSupport' }
    ];

    for (const { pattern, constraint } of capabilityConstraints) {
      if (pattern.test(query)) {
        constraints[constraint] = true;
      }
    }

    // Negative constraints
    if (query.includes('without') || query.includes('no') || query.includes('exclude')) {
      constraints.negativeConstraints = true;
    }

    return constraints;
  }

  /**
   * Determine user intent based on query analysis
   */
  private static determineIntent(query: string, pattern: QueryPattern, entities: Record<string, any>): string {
    switch (pattern.type) {
      case 'brand':
        return entities.brandNames?.length > 1 ? 'compare_brands' : 'find_brand';
      
      case 'category':
        return 'find_category_tools';
      
      case 'pricing':
        return entities.priceRanges ? 'find_tools_in_price_range' : 'find_pricing_type_tools';
      
      case 'capability':
        return 'find_capability_tools';
      
      default:
        // General intent based on keywords
        if (query.includes('compare') || query.includes('vs')) {
          return 'compare_tools';
        }
        if (query.includes('list') || query.includes('show')) {
          return 'list_tools';
        }
        if (query.includes('recommend') || query.includes('suggest')) {
          return 'recommend_tools';
        }
        return 'general_search';
    }
  }

  /**
   * Identify ambiguities in the query
   */
  private static identifyAmbiguities(query: string, pattern: QueryPattern): string[] {
    const ambiguities: string[] = [];

    // General query ambiguities
    if (query.length < 5 || pattern.type === 'general') {
      ambiguities.push('query_too_general');
    }

    // Subjective terms
    if (query.includes('good') || query.includes('best') || query.includes('better')) {
      ambiguities.push('subjective_criteria');
    }

    // Time ambiguities
    if (query.includes('recent') || query.includes('new') || query.includes('latest')) {
      ambiguities.push('timeframe_ambiguous');
    }

    // Brand ambiguities
    if (pattern.type === 'brand' && pattern.confidence < 0.5) {
      ambiguities.push('brand_name_unclear');
    }

    // Category ambiguities
    if (pattern.type === 'category' && pattern.confidence < 0.4) {
      ambiguities.push('category_unclear');
    }

    return ambiguities;
  }

  /**
   * Suggest appropriate tools based on analysis
   */
  private static suggestTools(pattern: QueryPattern, entities: Record<string, any>, constraints: Record<string, any>): string[] {
    const suggestedTools: string[] = [];

    switch (pattern.type) {
      case 'brand':
        suggestedTools.push('filterByField', 'searchByText');
        break;
      
      case 'category':
        suggestedTools.push('filterByArrayContains', 'searchByText');
        break;
      
      case 'pricing':
        if (constraints.maxPrice || constraints.minPrice) {
          suggestedTools.push('filterByPriceRange', 'filterByNestedField');
        } else {
          suggestedTools.push('filterByNestedField');
        }
        break;
      
      case 'capability':
        suggestedTools.push('filterByNestedField', 'searchByKeywords');
        break;
      
      default:
        suggestedTools.push('searchByText', 'searchByKeywords');
    }

    // Add sorting tools if sort preference is detected
    if (entities.sortPreference) {
      suggestedTools.push('sortByField');
    }

    // Add limit tools if result limit is specified
    if (entities.resultLimit) {
      suggestedTools.push('limitResults');
    }

    return suggestedTools;
  }

  /**
   * Calculate overall confidence in the analysis with baseline and context-aware thresholds
   */
  private static calculateConfidence(
    pattern: QueryPattern,
    entities: Record<string, any>,
    constraints: Record<string, any>,
    ambiguities: string[],
    query: string
  ): number {
    let confidence = pattern.confidence;

    // Apply baseline confidence for clear pattern matches
    if (this.isClearPatternMatch(pattern.type, { entities }, query)) {
      confidence = Math.max(confidence, 0.6);
    }

    // Boost confidence based on extracted entities
    const entityCount = Object.keys(entities).length;
    confidence += Math.min(entityCount * 0.1, 0.3);

    // Boost confidence based on constraints
    const constraintCount = Object.keys(constraints).length;
    confidence += Math.min(constraintCount * 0.1, 0.2);

    // Reduce confidence based on ambiguities with reduced penalty for legitimate short queries
    const ambiguityPenalty = this.calculateAmbiguityPenalty(ambiguities, query);
    confidence -= ambiguityPenalty;

    // Apply context-aware minimum thresholds
    const minThreshold = this.getContextAwareMinimumThreshold(pattern.type, query);
    confidence = Math.max(minThreshold, Math.min(1, confidence));

    return confidence;
  }

  /**
   * Calculate ambiguity penalty with reduced penalty for legitimate short queries
   */
  private static calculateAmbiguityPenalty(ambiguities: string[], query: string): number {
    let penalty = 0;
    
    // Reduced penalty for legitimate short queries (brand names, specific tools)
    if (query.length < 5 && this.isLikelyLegitimateShortQuery(query)) {
      penalty = ambiguities.length * 0.05; // Reduced penalty
    } else {
      penalty = ambiguities.length * 0.15; // Standard penalty
    }
    
    return penalty;
  }

  /**
   * Check if a short query is likely legitimate (brand name, specific tool)
   */
  private static isLikelyLegitimateShortQuery(query: string): boolean {
    // Check if it's a known brand name
    for (const brand of this.BRAND_PATTERNS) {
      if (query.toLowerCase().includes(brand)) {
        return true;
      }
    }
    
    // Check if it's a known technical term
    const technicalTerms = ['api', 'sdk', 'ai', 'ml', 'saas', 'crm'];
    for (const term of technicalTerms) {
      if (query.toLowerCase().includes(term)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get context-aware minimum threshold based on pattern type and query characteristics
   */
  private static getContextAwareMinimumThreshold(patternType: string, query: string): number {
    // Lower threshold for legitimate short queries
    if (query.length < 5 && this.isLikelyLegitimateShortQuery(query)) {
      return 0.3;
    }
    
    // Standard thresholds by pattern type
    switch (patternType) {
      case 'brand':
        return 0.4; // Brand queries should have reasonable confidence
      case 'pricing':
        return 0.3; // Pricing queries can be more flexible
      case 'category':
        return 0.3; // Category queries can be more flexible
      case 'capability':
        return 0.3; // Capability queries can be more flexible
      default:
        return 0.1; // General queries have the lowest threshold
    }
  }

  /**
   * Extract keywords from query
   */
  private static extractKeywords(query: string): string[] {
    // Remove common words and extract meaningful keywords
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
    
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    return [...new Set(words)]; // Remove duplicates
  }
}

export default QueryAnalyzer;
