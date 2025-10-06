/**
 * Query Decomposer Tool
 *
 * Breaks complex user queries into semantic components for more targeted search.
 * This tool analyzes queries and identifies distinct semantic units that can be
 * processed independently for better search results.
 */

import { ToolFunction, ToolParams, ToolResponse, createToolResponse } from './base';
import { getIntentForKeyword, getAllIntents, FIELD_MAPPING_SCHEMA } from '../mapping/fieldMappingSchema';

export interface QueryComponent {
  term: string;
  intent: string;
  confidence: number;
  position: number;
  context: string; // Surrounding words for context
}

export interface QueryDecomposition {
  originalQuery: string;
  components: QueryComponent[];
  primaryIntent: string;
  complexity: 'simple' | 'compound' | 'complex';
  confidence: number;
  relationships: string[]; // Relationships between components
}

export interface QueryDecomposerParams {
  query: string;
  minConfidence?: number; // Minimum confidence threshold for intent detection
  maxComponents?: number; // Maximum components to extract
  includeContext?: boolean; // Include surrounding context for components
}

/**
 * Decompose a query into semantic components
 */
export const queryDecomposer: ToolFunction<QueryDecomposerParams> = async (
  data: any[],
  params: QueryDecomposerParams
): Promise<ToolResponse<QueryDecomposition>> => {
  const startTime = Date.now();

  try {
    const {
      query,
      minConfidence = 0.3,
      maxComponents = 5,
      includeContext = true
    } = params;

    if (!query || typeof query !== 'string') {
      return createToolResponse(
        {} as QueryDecomposition,
        'Query parameter is required and must be a string',
        0.0,
        0,
        startTime,
        ['Invalid query parameter']
      );
    }

    // Preprocess query
    const normalizedQuery = query.toLowerCase().trim();

    // Tokenize query
    const tokens = tokenizeQuery(normalizedQuery);

    // Identify semantic components
    const components = await identifySemanticComponents(
      tokens,
      normalizedQuery,
      minConfidence,
      includeContext
    );

    // Limit components if specified
    const limitedComponents = components.slice(0, maxComponents);

    // Determine primary intent and complexity
    const primaryIntent = determinePrimaryIntent(limitedComponents);
    const complexity = determineQueryComplexity(limitedComponents);
    const overallConfidence = calculateOverallConfidence(limitedComponents);

    // Identify relationships between components
    const relationships = identifyComponentRelationships(limitedComponents);

    const decomposition: QueryDecomposition = {
      originalQuery: query,
      components: limitedComponents,
      primaryIntent,
      complexity,
      confidence: overallConfidence,
      relationships
    };

    const executionTime = Date.now() - startTime;
    const reasoning = `Decomposed query into ${limitedComponents.length} semantic components with ${complexity} complexity`;

    return createToolResponse(
      decomposition,
      reasoning,
      overallConfidence,
      limitedComponents.length,
      startTime
    );

  } catch (error) {
    return createToolResponse(
      {} as QueryDecomposition,
      `Error during query decomposition: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0.0,
      0,
      startTime,
      ['Query decomposition failed']
    );
  }
};

/**
 * Tokenize query into meaningful units
 */
function tokenizeQuery(query: string): string[] {
  // Remove special characters but keep important separators
  const cleanQuery = query.replace(/[^\w\s\-]/g, ' ');

  // Split into tokens, filtering out very short words
  const tokens = cleanQuery
    .split(/\s+/)
    .filter(token => token.length >= 2)
    .filter(token => !isStopWord(token));

  return tokens;
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
 * Identify semantic components in tokenized query
 */
async function identifySemanticComponents(
  tokens: string[],
  originalQuery: string,
  minConfidence: number,
  includeContext: boolean
): Promise<QueryComponent[]> {
  const components: QueryComponent[] = [];

  // Single word analysis
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const intentMatches = getIntentForKeyword(token);

    for (const match of intentMatches) {
      if (match.confidence >= minConfidence) {
        const context = includeContext ? getContextWords(originalQuery, token, 2) : '';

        components.push({
          term: token,
          intent: match.intent,
          confidence: match.confidence,
          position: i,
          context
        });
      }
    }
  }

  // Multi-word phrase analysis
  const phrases = extractPhrases(tokens, originalQuery);
  for (const phrase of phrases) {
    const intentMatches = getIntentForKeyword(phrase);

    for (const match of intentMatches) {
      if (match.confidence >= minConfidence + 0.1) { // Boost confidence for phrases
        const context = includeContext ? getContextWords(originalQuery, phrase, 1) : '';

        components.push({
          term: phrase,
          intent: match.intent,
          confidence: Math.min(match.confidence + 0.1, 1.0),
          position: originalQuery.indexOf(phrase),
          context
        });
      }
    }
  }

  // Remove duplicates and sort by confidence
  const uniqueComponents = components.filter((component, index, self) =>
    index === self.findIndex(c => c.term === component.term && c.intent === component.intent)
  );

  return uniqueComponents.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Extract meaningful phrases from tokens
 */
function extractPhrases(tokens: string[], originalQuery: string): string[] {
  const phrases: string[] = [];

  // Common two-word phrases
  const twoWordPhrases = [
    'command line', 'real time', 'machine learning', 'artificial intelligence',
    'user interface', 'free tier', 'open source', 'no code', 'low code',
    'web application', 'mobile app', 'api access', 'sdk available'
  ];

  for (const phrase of twoWordPhrases) {
    if (originalQuery.toLowerCase().includes(phrase)) {
      phrases.push(phrase);
    }
  }

  // Dynamic phrase extraction (adjacent tokens that form coherent units)
  for (let i = 0; i < tokens.length - 1; i++) {
    const phrase = `${tokens[i]} ${tokens[i + 1]}`;
    if (originalQuery.toLowerCase().includes(phrase) && !phrases.includes(phrase)) {
      phrases.push(phrase);
    }
  }

  return phrases;
}

/**
 * Get context words around a term
 */
function getContextWords(query: string, term: string, radius: number): string {
  const words = query.split(/\s+/);
  const termIndex = words.findIndex(word => word.toLowerCase().includes(term.toLowerCase()));

  if (termIndex === -1) return '';

  const start = Math.max(0, termIndex - radius);
  const end = Math.min(words.length, termIndex + radius + 1);

  return words.slice(start, end).join(' ');
}

/**
 * Determine the primary intent from components
 */
function determinePrimaryIntent(components: QueryComponent[]): string {
  if (components.length === 0) return 'general';

  // Count intent occurrences
  const intentCounts: Record<string, number> = {};
  const intentConfidences: Record<string, number> = {};

  for (const component of components) {
    intentCounts[component.intent] = (intentCounts[component.intent] || 0) + 1;
    intentConfidences[component.intent] = (intentConfidences[component.intent] || 0) + component.confidence;
  }

  // Calculate weighted scores
  const intentScores: Record<string, number> = {};
  for (const [intent, count] of Object.entries(intentCounts)) {
    const avgConfidence = intentConfidences[intent] / count;
    intentScores[intent] = count * avgConfidence;
  }

  // Return intent with highest score
  return Object.entries(intentScores).reduce((a, b) =>
    intentScores[a[0]] > intentScores[b[0]] ? a : b
  )[0];
}

/**
 * Determine query complexity
 */
function determineQueryComplexity(components: QueryComponent[]): 'simple' | 'compound' | 'complex' {
  if (components.length === 0) return 'simple';
  if (components.length === 1) return 'simple';
  if (components.length <= 3) return 'compound';
  return 'complex';
}

/**
 * Calculate overall confidence for the decomposition
 */
function calculateOverallConfidence(components: QueryComponent[]): number {
  if (components.length === 0) return 0.0;

  const totalConfidence = components.reduce((sum, component) => sum + component.confidence, 0);
  const avgConfidence = totalConfidence / components.length;

  // Boost confidence if we have multiple components with different intents
  const uniqueIntents = new Set(components.map(c => c.intent)).size;
  const intentBoost = uniqueIntents > 1 ? 0.1 : 0.0;

  return Math.min(avgConfidence + intentBoost, 1.0);
}

/**
 * Identify relationships between components
 */
function identifyComponentRelationships(components: QueryComponent[]): string[] {
  const relationships: string[] = [];

  if (components.length < 2) return relationships;

  // Check for complementary intents
  const intents = components.map(c => c.intent);

  if (intents.includes('pricing') && intents.includes('interface')) {
    relationships.push('pricing-interface-combination');
  }

  if (intents.includes('category') && intents.includes('capability')) {
    relationships.push('category-capability-refinement');
  }

  if (intents.includes('functionality') && intents.includes('performance')) {
    relationships.push('functionality-performance-concern');
  }

  return relationships;
}

/**
 * Get distribution of intents in components
 */
function getIntentDistribution(components: QueryComponent[]): Record<string, number> {
  const distribution: Record<string, number> = {};

  for (const component of components) {
    distribution[component.intent] = (distribution[component.intent] || 0) + 1;
  }

  return distribution;
}

// Export tool for registration
export const queryDecomposerTool = {
  func: queryDecomposer,
  metadata: {
    name: 'queryDecomposer',
    category: 'analysis' as const,
    description: 'Decompose queries into semantic components for targeted search',
    schema: {
      query: { type: 'string', required: true, description: 'Query to decompose' },
      minConfidence: { type: 'number', required: false, default: 0.3, description: 'Minimum confidence threshold' },
      maxComponents: { type: 'number', required: false, default: 5, description: 'Maximum components to extract' },
      includeContext: { type: 'boolean', required: false, default: true, description: 'Include surrounding context' }
    },
    examples: [
      'Decompose "free cli" into pricing and interface components',
      'Analyze "AI writing tool with API access" for multiple intents',
      'Break down "affordable project management software" into semantic units'
    ],
    performance: {
      complexity: 'O(n)',
      memoryUsage: 'low'
    }
  }
};