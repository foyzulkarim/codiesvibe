import * as fs from 'fs';
import * as path from 'path';

/**
 * Few-shot examples for different query patterns and scenarios
 * These examples help the LLM understand how to analyze queries and select appropriate tools
 */

export interface ExampleQuery {
  id: string;
  category: 'discovery' | 'filtering' | 'comparison' | 'analysis' | 'clarification';
  query: string;
  analysis: {
    intent: string;
    entities: Record<string, any>;
    constraints: Record<string, any>;
    ambiguities: string[];
    confidence: number;
    reasoning: string;
  };
  expectedAction: {
    tool: string;
    parameters: Record<string, any>;
    reasoning: string;
  };
  metadata: {
    complexity: 'simple' | 'medium' | 'complex';
    iterationCount?: number;
    successIndicators: string[];
  };
}

export class ExampleRepository {
  private static readonly EXAMPLES_DIR = path.join(__dirname, 'queries');
  private static examples: Map<string, ExampleQuery[]> = new Map();

  /**
   * Load all examples from files
   */
  static loadExamples(): void {
    try {
      // Initialize example categories
      this.initializeBuiltInExamples();

      // Load additional examples from files if they exist
      if (fs.existsSync(this.EXAMPLES_DIR)) {
        const exampleFiles = fs.readdirSync(this.EXAMPLES_DIR);
        for (const file of exampleFiles) {
          if (file.endsWith('.json')) {
            try {
              const content = fs.readFileSync(path.join(this.EXAMPLES_DIR, file), 'utf8');
              const examples = JSON.parse(content) as ExampleQuery[];
              const category = path.basename(file, '.json');
              this.examples.set(category, examples);
            } catch (error) {
              console.warn(`Failed to load examples from ${file}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading examples:', error);
    }
  }

  /**
   * Get examples by category
   */
  static getExamples(category?: string): ExampleQuery[] {
    if (category) {
      return this.examples.get(category) || [];
    }

    // Return all examples if no category specified
    const allExamples: ExampleQuery[] = [];
    for (const examples of this.examples.values()) {
      allExamples.push(...examples);
    }
    return allExamples;
  }

  /**
   * Get examples matching a query pattern
   */
  static getMatchingExamples(query: string, maxResults: number = 3): ExampleQuery[] {
    const queryLower = query.toLowerCase();
    const allExamples = this.getExamples();

    // Simple matching based on keywords and patterns
    const scored = allExamples.map(example => {
      let score = 0;

      // Exact query match
      if (example.query.toLowerCase() === queryLower) {
        score += 100;
      }

      // Keyword matching
      const queryWords = queryLower.split(' ');
      const exampleWords = example.query.toLowerCase().split(' ');

      for (const qWord of queryWords) {
        for (const eWord of exampleWords) {
          if (qWord === eWord) {
            score += 10;
          } else if (eWord.includes(qWord) || qWord.includes(eWord)) {
            score += 5;
          }
        }
      }

      // Category preference
      if (this.getQueryCategory(query) === example.category) {
        score += 20;
      }

      return { example, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.example);
  }

  /**
   * Add new example
   */
  static addExample(example: ExampleQuery): void {
    const category = example.category;
    if (!this.examples.has(category)) {
      this.examples.set(category, []);
    }
    this.examples.get(category)!.push(example);
  }

  /**
   * Get examples for prompt injection
   */
  static getPromptExamples(query: string, context: any): string {
    const matchingExamples = this.getMatchingExamples(query, 2);

    if (matchingExamples.length === 0) {
      return '';
    }

    const examplesText = matchingExamples.map((example, index) => {
      return [
        `**Example ${index + 1}**`,
        `Query: "${example.query}"`,
        `Intent: ${example.analysis.intent}`,
        `Entities: ${JSON.stringify(example.analysis.entities, null, 2)}`,
        `Confidence: ${example.analysis.confidence}`,
        `Action: ${example.expectedAction.tool}`,
        `Reasoning: ${example.expectedAction.reasoning}`,
        ''
      ].join('\n');
    }).join('\n');

    return [
      '# Relevant Examples',
      'Study these examples to understand the expected analysis pattern:',
      '',
      examplesText
    ].join('\n');
  }

  /**
   * Initialize built-in examples
   */
  private static initializeBuiltInExamples(): void {
    this.examples.set('discovery', [
      {
        id: 'disc-001',
        category: 'discovery',
        query: 'Show me free AI tools',
        analysis: {
          intent: 'find_free_tools',
          entities: {
            pricing: { type: 'free', value: 0 },
            category: 'AI tools'
          },
          constraints: {
            maxPrice: 0
          },
          ambiguities: [],
          confidence: 0.9,
          reasoning: 'User explicitly mentioned "free" which indicates a clear pricing constraint'
        },
        expectedAction: {
          tool: 'filterByPriceRange',
          parameters: { minPrice: 0, maxPrice: 0 },
          reasoning: 'Apply price filter to find only free tools'
        },
        metadata: {
          complexity: 'simple',
          iterationCount: 1,
          successIndicators: ['price_filter_applied', 'results_found']
        }
      },
      {
        id: 'disc-002',
        category: 'discovery',
        query: 'AI tools for developers',
        analysis: {
          intent: 'find_category_tools',
          entities: {
            category: 'AI tools',
            targetUser: 'developers'
          },
          constraints: {},
          ambiguities: [],
          confidence: 0.85,
          reasoning: 'Clear category mention with user type specification'
        },
        expectedAction: {
          tool: 'searchByText',
          parameters: {
            query: 'developers',
            fields: ['description', 'name', 'tags'],
            fuzzy: true
          },
          reasoning: 'Search for tools mentioning developers in text fields'
        },
        metadata: {
          complexity: 'simple',
          iterationCount: 1,
          successIndicators: ['text_search_performed', 'relevant_results']
        }
      }
    ]);

    this.examples.set('filtering', [
      {
        id: 'filt-001',
        category: 'filtering',
        query: 'AI tools under $50 per month',
        analysis: {
          intent: 'find_tools_by_price',
          entities: {
            pricing: { type: 'subscription', maxPrice: 50, period: 'month' }
          },
          constraints: {
            maxPrice: 50,
            pricingModel: 'subscription'
          },
          ambiguities: [],
          confidence: 0.95,
          reasoning: 'Specific price range with clear period specification'
        },
        expectedAction: {
          tool: 'filterByPriceRange',
          parameters: { maxPrice: 50 },
          reasoning: 'Apply price constraint filter'
        },
        metadata: {
          complexity: 'simple',
          iterationCount: 1,
          successIndicators: ['price_filter_applied', 'within_budget']
        }
      },
      {
        id: 'filt-002',
        category: 'filtering',
        query: 'Show me tools with API access that are recent',
        analysis: {
          intent: 'find_recent_tools_with_feature',
          entities: {
            features: ['API access'],
            timeframe: 'recent'
          },
          constraints: {
            hasAPI: true,
            minDate: 'recent'
          },
          ambiguities: ['timeframe definition - what constitutes "recent"'],
          confidence: 0.7,
          reasoning: 'Clear feature requirement but ambiguous timeframe'
        },
        expectedAction: {
          tool: 'filterByNestedField',
          parameters: {
            fieldPath: 'capabilities.api',
            operator: 'equals',
            value: true
          },
          reasoning: 'Filter for tools with API capability'
        },
        metadata: {
          complexity: 'medium',
          iterationCount: 2,
          successIndicators: ['feature_filter_applied', 'date_filter_applied']
        }
      }
    ]);

    this.examples.set('comparison', [
      {
        id: 'comp-001',
        category: 'comparison',
        query: 'Compare ChatGPT and Claude',
        analysis: {
          intent: 'compare_specific_tools',
          entities: {
            tools: ['ChatGPT', 'Claude']
          },
          constraints: {},
          ambiguities: [],
          confidence: 0.95,
          reasoning: 'Specific tool names provided for direct comparison'
        },
        expectedAction: {
          tool: 'findBySlug',
          parameters: { slug: 'chatgpt' },
          reasoning: 'Find first tool for comparison'
        },
        metadata: {
          complexity: 'medium',
          iterationCount: 2,
          successIndicators: ['both_tools_found', 'comparison_data_ready']
        }
      }
    ]);

    this.examples.set('clarification', [
      {
        id: 'clar-001',
        category: 'clarification',
        query: 'Good tools for my startup',
        analysis: {
          intent: 'needs_clarification',
          entities: {
            context: 'startup',
            quality: 'good'
          },
          constraints: {},
          ambiguities: [
            'budget range',
            'specific needs',
            'what constitutes "good"'
          ],
          confidence: 0.3,
          reasoning: 'Subjective criteria and missing specific requirements'
        },
        expectedAction: {
          tool: 'clarify',
          parameters: {
            question: 'What specific features or capabilities are you looking for in tools for your startup?',
            options: [
              'Productivity and automation tools',
              'Development and coding tools',
              'Marketing and sales tools',
              'Customer support tools'
            ]
          },
          reasoning: 'Need clarification on specific startup needs'
        },
        metadata: {
          complexity: 'complex',
          iterationCount: 3,
          successIndicators: ['clarification_provided', 'user_response_received']
        }
      }
    ]);

    this.examples.set('analysis', [
      {
        id: 'anal-001',
        category: 'analysis',
        query: 'What are the most popular AI tool categories?',
        analysis: {
          intent: 'analyze_categories',
          entities: {
            metric: 'popularity',
            target: 'AI tool categories'
          },
          constraints: {},
          ambiguities: [],
          confidence: 0.9,
          reasoning: 'Clear analytical request about category distribution'
        },
        expectedAction: {
          tool: 'groupBy',
          parameters: { field: 'categories.primary' },
          reasoning: 'Group tools by primary categories for analysis'
        },
        metadata: {
          complexity: 'medium',
          iterationCount: 1,
          successIndicators: ['data_grouped', 'analysis_complete']
        }
      }
    ]);
  }

  /**
   * Determine query category based on patterns
   */
  private static getQueryCategory(query: string): string {
    const queryLower = query.toLowerCase();

    if (queryLower.includes('show me') || queryLower.includes('find') || queryLower.includes('looking for')) {
      return 'discovery';
    }

    if (queryLower.includes('under') || queryLower.includes('less than') || queryLower.includes('with')) {
      return 'filtering';
    }

    if (queryLower.includes('compare') || queryLower.includes('versus') || queryLower.includes('vs')) {
      return 'comparison';
    }

    if (queryLower.includes('what') || queryLower.includes('how many') || queryLower.includes('analyze')) {
      return 'analysis';
    }

    if (queryLower.includes('good') || queryLower.includes('best') || queryLower.includes('interesting')) {
      return 'clarification';
    }

    return 'discovery'; // default
  }
}

// Initialize examples on module load
ExampleRepository.loadExamples();

export default ExampleRepository;