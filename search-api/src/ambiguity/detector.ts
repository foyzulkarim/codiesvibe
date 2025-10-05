/**
 * Ambiguity Detection and Resolution System
 * Identifies ambiguous queries and manages clarification process
 */

import { QueryContext } from '../types';
import { PromptBuilder } from '../prompts/builder';

export interface Ambiguity {
  id: string;
  type: AmbiguityType;
  description: string;
  severity: 'low' | 'medium' | 'high';
  position?: number;
  text?: string;
  suggestedQuestions?: string[];
  resolutionOptions?: ResolutionOption[];
}

export interface ResolutionOption {
  id: string;
  text: string;
  confidence: number;
  refinedQuery?: string;
  assumptions?: string[];
}

export interface ClarificationRequest {
  id: string;
  question: string;
  options: ResolutionOption[];
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  metadata: {
    timestamp: Date;
    ambiguities: string[];
  };
}

export interface ClarificationResponse {
  requestId: string;
  selectedOption: string;
  userInput?: string;
  confidence: number;
  timestamp: Date;
}

export enum AmbiguityType {
  SUBJECTIVE_CRITERIA = 'subjective_criteria',
  QUANTITATIVE_AMBIGUITY = 'quantitative_ambiguity',
  TECHNICAL_AMBIGUITY = 'technical_ambiguity',
  SCOPE_AMBIGUITY = 'scope_ambiguity',
  CONTEXT_AMBIGUITY = 'context_ambiguity',
  TEMPORAL_AMBIGUITY = 'temporal_ambiguity',
  COMPARATIVE_AMBIGUITY = 'comparative_ambiguity'
}

export class AmbiguityDetector {
  private static readonly AMBIGUITY_PATTERNS = {
    [AmbiguityType.SUBJECTIVE_CRITERIA]: [
      /\b(good|best|excellent|interesting|nice|cool|awesome|amazing|terrible|bad|poor)\b/i,
      /\b(high quality|low quality|top notch|professional|enterprise-grade)\b/i,
      /\b(popular|trending|recommended|preferred)\b/i
    ],
    [AmbiguityType.QUANTITATIVE_AMBIGUITY]: [
      /\b(cheap|expensive|affordable|reasonable|budget|premium|luxury)\b/i,
      /\b(few|many|several|some|lots of|a lot of)\b/i,
      /\b(recent|new|old|outdated|modern|legacy)\b/i,
      /\b(fast|slow|quick|responsive|performant)\b/i
    ],
    [AmbiguityType.TECHNICAL_AMBIGUITY]: [
      /\b(API|webhook|SDK|integration)\b/i,
      /\b(scalable|secure|reliable|stable|robust)\b/i,
      /\b(easy to use|user friendly|intuitive|complex)\b/i
    ],
    [AmbiguityType.SCOPE_AMBIGUITY]: [
      /\b(tools|software|solutions|platforms|services)\b$/i,
      /\b(for my|for our|for business|for personal)\b/i,
      /\b(show me|find|get|list)\s+\w+$/i
    ],
    [AmbiguityType.CONTEXT_AMBIGUITY]: [
      /\b(my project|my startup|my company|my team)\b/i,
      /\b(we need|I need|looking for)\b/i,
      /\b(specific|particular|certain)\b/i
    ],
    [AmbiguityType.TEMPORAL_AMBIGUITY]: [
      /\b(recently|currently|now|soon|later|eventually)\b/i,
      /\b(this year|last year|next year)\b/i,
      /\b(quarter|month|week)\b/i
    ],
    [AmbiguityType.COMPARATIVE_AMBIGUITY]: [
      /\b(better|worse|superior|inferior|compared to|versus|vs)\b/i,
      /\b(like|similar to|different from)\b/i,
      /\b(alternative to|replacement for)\b/i
    ]
  };

  /**
   * Detect ambiguities in a query
   */
  static detectAmbiguities(query: string, context?: QueryContext): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];
    const words = query.split(' ');

    // Check each ambiguity type
    for (const [type, patterns] of Object.entries(this.AMBIGUITY_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = query.matchAll(pattern);

        for (const match of matches) {
          const ambiguity: Ambiguity = {
            id: this.generateAmbiguityId(),
            type: type as AmbiguityType,
            description: this.generateDescription(type as AmbiguityType, match[0]),
            severity: this.calculateSeverity(type as AmbiguityType, match[0], context),
            position: match.index,
            text: match[0],
            suggestedQuestions: this.generateQuestions(type as AmbiguityType, match[0]),
            resolutionOptions: this.generateResolutionOptions(type as AmbiguityType, match[0])
          };

          ambiguities.push(ambiguity);
        }
      }
    }

    // Check for contextual ambiguities
    const contextualAmbiguities = this.detectContextualAmbiguities(query, context);
    ambiguities.push(...contextualAmbiguities);

    // Remove duplicates and prioritize
    return this.prioritizeAmbiguities(ambiguities);
  }

  /**
   * Generate clarification request from ambiguities
   */
  static generateClarificationRequest(
    ambiguities: Ambiguity[],
    originalQuery: string,
    context?: QueryContext
  ): ClarificationRequest | null {
    if (ambiguities.length === 0) {
      return null;
    }

    // Prioritize high and medium severity ambiguities
    const priorityAmbiguities = ambiguities.filter(a =>
      a.severity === 'high' || a.severity === 'medium'
    );

    if (priorityAmbiguities.length === 0) {
      return null;
    }

    // Select the highest priority ambiguity
    const primaryAmbiguity = priorityAmbiguities[0];

    if (!primaryAmbiguity) {
      throw new Error('No primary ambiguity found');
    }

    const request: ClarificationRequest = {
      id: this.generateRequestId(),
      question: this.generateClarificationQuestion(primaryAmbiguity, originalQuery),
      options: primaryAmbiguity.resolutionOptions || [],
      priority: primaryAmbiguity.severity as 'high' | 'medium' | 'low',
      reasoning: this.generateClarificationReasoning(primaryAmbiguity, ambiguities),
      metadata: {
        timestamp: new Date(),
        ambiguities: ambiguities.map(a => a.id)
      }
    };

    return request;
  }

  /**
   * Process clarification response
   */
  static processClarificationResponse(
    response: ClarificationResponse,
    originalQuery: string,
    context: QueryContext
  ): {
    refinedQuery: string;
    updatedContext: QueryContext;
    confidence: number;
    resolvedAmbiguities: string[];
  } {
    const request = context.clarificationHistory?.find(
      c => c.request?.id === response.requestId
    );

    if (!request) {
      throw new Error('Clarification request not found');
    }

    const selectedOption = request.options?.find(opt => opt.id === response.selectedOption);
    if (!selectedOption) {
      throw new Error('Selected option not found');
    }

    // Update query
    const refinedQuery = selectedOption.refinedQuery ||
      this.refineQuery(originalQuery, response.userInput || selectedOption.text);

    // Update context
    const updatedContext = {
      ...context,
      originalQuery: refinedQuery,
      ambiguities: context.ambiguities.filter(a =>
        !request.metadata.ambiguities.includes(a.id)
      ),
      clarificationHistory: [
        ...(context.clarificationHistory || []),
        {
          round: (context.clarificationHistory?.length || 0) + 1,
          question: request.question,
          response: response.userInput || selectedOption.text,
          confidence: response.confidence,
          timestamp: response.timestamp,
          resolvedAmbiguities: request.metadata.ambiguities,
          request: request
        }
      ]
    };

    return {
      refinedQuery,
      updatedContext,
      confidence: response.confidence,
      resolvedAmbiguities: request.metadata.ambiguities
    };
  }

  /**
   * Check if clarification is still needed
   */
  static needsClarification(context: QueryContext): boolean {
    // Check for remaining high-severity ambiguities
    const highSeverityAmbiguities = context.ambiguities.filter(a => a.severity === 'high');
    if (highSeverityAmbiguities.length > 0) {
      return true;
    }

    // Check for too many clarification rounds
    const maxRounds = 3;
    if (context.clarificationHistory &&
        context.clarificationHistory.length >= maxRounds) {
      return false;
    }

    // Check for medium ambiguities if we haven't clarified much
    const mediumAmbiguities = context.ambiguities.filter(a => a.severity === 'medium');
    const clarificationRounds = context.clarificationHistory?.length || 0;

    return mediumAmbiguities.length > 0 && clarificationRounds < 2;
  }

  /**
   * Generate description for ambiguity type
   */
  private static generateDescription(type: AmbiguityType, text: string): string {
    const descriptions = {
      [AmbiguityType.SUBJECTIVE_CRITERIA]: `"${text}" is subjective and may mean different things to different people`,
      [AmbiguityType.QUANTITATIVE_AMBIGUITY]: `"${text}" lacks specific quantitative information`,
      [AmbiguityType.TECHNICAL_AMBIGUITY]: `"${text}" requires more technical specification`,
      [AmbiguityType.SCOPE_AMBIGUITY]: `"${text}" is too broad and needs more specific context`,
      [AmbiguityType.CONTEXT_AMBIGUITY]: `"${text}" lacks sufficient context for precise interpretation`,
      [AmbiguityType.TEMPORAL_AMBIGUITY]: `"${text}" has unclear temporal scope`,
      [AmbiguityType.COMPARATIVE_AMBIGUITY]: `"${text}" requires comparison targets for clarity`
    };

    return descriptions[type] || `Ambiguous term: "${text}"`;
  }

  /**
   * Calculate severity level
   */
  private static calculateSeverity(
    type: AmbiguityType,
    text: string,
    context?: QueryContext
  ): 'low' | 'medium' | 'high' {
    // High severity ambiguities
    if (type === AmbiguityType.SCOPE_AMBIGUITY) {
      return 'high';
    }

    if (type === AmbiguityType.SUBJECTIVE_CRITERIA &&
        ['good', 'best', 'interesting'].includes(text.toLowerCase())) {
      return 'high';
    }

    // Medium severity ambiguities
    if (type === AmbiguityType.QUANTITATIVE_AMBIGUITY) {
      return 'medium';
    }

    if (type === AmbiguityType.CONTEXT_AMBIGUITY) {
      return 'medium';
    }

    // Low severity ambiguities
    return 'low';
  }

  /**
   * Generate suggested questions for ambiguity type
   */
  private static generateQuestions(type: AmbiguityType, text: string): string[] {
    const questionTemplates: Record<AmbiguityType, string[]> = {
      [AmbiguityType.SUBJECTIVE_CRITERIA]: [
        `What specific qualities make something "${text}" for you?`,
        `Can you provide examples of what you consider "${text}"?`,
        `What criteria are you using to evaluate "${text}"?`
      ],
      [AmbiguityType.QUANTITATIVE_AMBIGUITY]: [
        `What specific price range do you consider "${text}"?`,
        `Can you provide a specific number for "${text}"?`,
        `What are the exact parameters for "${text}"?`
      ],
      [AmbiguityType.TECHNICAL_AMBIGUITY]: [
        `What specific technical requirements do you have for "${text}"?`,
        `Can you describe the technical specifications you need?`,
        `What technical context should I consider for "${text}"?`
      ],
      [AmbiguityType.SCOPE_AMBIGUITY]: [
        `What specific type of tools are you looking for?`,
        `Can you specify the category or use case?`,
        `What particular features are you interested in?`
      ],
      [AmbiguityType.CONTEXT_AMBIGUITY]: [
        `Can you provide more context about your specific needs?`,
        `What industry or use case are you targeting?`,
        `Can you describe your specific situation?`
      ],
      [AmbiguityType.TEMPORAL_AMBIGUITY]: [
        `What time frame are you considering for "${text}"?`,
        `Can you specify the recency or date range you need?`,
        `What period are you interested in?`
      ],
      [AmbiguityType.COMPARATIVE_AMBIGUITY]: [
        `What are you comparing "${text}" against?`,
        `Can you provide a baseline or reference point?`,
        `What specific features should be compared?`
      ]
    };

    return questionTemplates[type] || [`Can you clarify what you mean by "${text}"?`];
  }

  /**
   * Generate resolution options for ambiguity type
   */
  private static generateResolutionOptions(type: AmbiguityType, text: string): ResolutionOption[] {
    const optionTemplates: Record<AmbiguityType, Array<Partial<ResolutionOption>>> = {
      [AmbiguityType.SUBJECTIVE_CRITERIA]: [
        { text: 'High user ratings and reviews', confidence: 0.8 },
        { text: 'Popular among developers', confidence: 0.7 },
        { text: 'Industry recognized tools', confidence: 0.6 },
        { text: 'Cutting-edge technology', confidence: 0.7 }
      ],
      [AmbiguityType.QUANTITATIVE_AMBIGUITY]: [
        { text: 'Free tools only', confidence: 0.9, refinedQuery: 'free tools' },
        { text: 'Under $50/month', confidence: 0.8, refinedQuery: 'tools under $50' },
        { text: 'Under $100/month', confidence: 0.7, refinedQuery: 'tools under $100' },
        { text: 'Budget-friendly options', confidence: 0.6, refinedQuery: 'affordable tools' }
      ],
      [AmbiguityType.TECHNICAL_AMBIGUITY]: [
        { text: 'API-based tools', confidence: 0.8, refinedQuery: 'tools with API' },
        { text: 'Enterprise-grade solutions', confidence: 0.7, refinedQuery: 'enterprise tools' },
        { text: 'Open source tools', confidence: 0.8, refinedQuery: 'open source tools' }
      ],
      [AmbiguityType.SCOPE_AMBIGUITY]: [
        { text: 'AI and machine learning tools', confidence: 0.8, refinedQuery: 'AI tools' },
        { text: 'Productivity and automation tools', confidence: 0.7, refinedQuery: 'productivity tools' },
        { text: 'Development and coding tools', confidence: 0.8, refinedQuery: 'development tools' },
        { text: 'Data analysis tools', confidence: 0.7, refinedQuery: 'data analysis tools' }
      ],
      [AmbiguityType.CONTEXT_AMBIGUITY]: [
        { text: 'Personal use', confidence: 0.7, refinedQuery: 'personal tools' },
        { text: 'Business use', confidence: 0.8, refinedQuery: 'business tools' },
        { text: 'Educational use', confidence: 0.6, refinedQuery: 'educational tools' }
      ],
      [AmbiguityType.TEMPORAL_AMBIGUITY]: [
        { text: 'Latest releases', confidence: 0.8, refinedQuery: 'new tools' },
        { text: 'Established tools', confidence: 0.7, refinedQuery: 'established tools' },
        { text: 'Classic tools', confidence: 0.6, refinedQuery: 'classic tools' }
      ],
      [AmbiguityType.COMPARATIVE_AMBIGUITY]: [
        { text: 'Better alternatives', confidence: 0.8, refinedQuery: 'better tools' },
        { text: 'Similar options', confidence: 0.7, refinedQuery: 'similar tools' },
        { text: 'Complementary tools', confidence: 0.6, refinedQuery: 'complementary tools' }
      ]
    };

    return (optionTemplates[type] || []).map((opt: any, index: number) => ({
      id: `option_${index + 1}`,
      ...opt
    }));
  }

  /**
   * Detect contextual ambiguities
   */
  private static detectContextualAmbiguities(query: string, context?: QueryContext): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];

    // Check for very short queries
    if (query.split(' ').length < 3) {
      ambiguities.push({
        id: this.generateAmbiguityId(),
        type: AmbiguityType.SCOPE_AMBIGUITY,
        description: 'Query is very short and lacks specific criteria',
        severity: 'medium',
        text: query,
        suggestedQuestions: [
          'Can you provide more details about what you are looking for?',
          'What specific features or capabilities do you need?',
          'Are there any particular requirements or constraints?'
        ]
      });
    }

    // Check for pronouns without antecedents
    if (/\b(it|they|them|this|that)\b/i.test(query) && !context) {
      ambiguities.push({
        id: this.generateAmbiguityId(),
        type: AmbiguityType.CONTEXT_AMBIGUITY,
        description: 'Pronouns used without clear reference',
        severity: 'high',
        text: query,
        suggestedQuestions: [
          'What specific tools or items are you referring to?',
          'Can you provide more specific names or categories?'
        ]
      });
    }

    return ambiguities;
  }

  /**
   * Prioritize ambiguities by severity and impact
   */
  private static prioritizeAmbiguities(ambiguities: Ambiguity[]): Ambiguity[] {
    return ambiguities.sort((a, b) => {
      // First by severity
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];

      if (severityDiff !== 0) {
        return severityDiff;
      }

      // Then by position in query (earlier ambiguities are more important)
      if (a.position !== undefined && b.position !== undefined) {
        return a.position - b.position;
      }

      return 0;
    });
  }

  /**
   * Generate clarification question
   */
  private static generateClarificationQuestion(
    ambiguity: Ambiguity,
    originalQuery: string
  ): string {
    if (ambiguity.suggestedQuestions && ambiguity.suggestedQuestions.length > 0) {
      return ambiguity.suggestedQuestions[0] || '';
    }

    return `To help me find better results, could you clarify what you mean by "${ambiguity.text}"?`;
  }

  /**
   * Generate clarification reasoning
   */
  private static generateClarificationReasoning(
    primaryAmbiguity: Ambiguity,
    allAmbiguities: Ambiguity[]
  ): string {
    const reasoning = [
      `Primary ambiguity: ${primaryAmbiguity.description}`,
      `This ${primaryAmbiguity.severity} priority ambiguity needs clarification to provide more accurate results.`
    ];

    if (allAmbiguities.length > 1) {
      reasoning.push(`Additional ambiguities detected: ${allAmbiguities.length - 1}`);
    }

    return reasoning.join(' ');
  }

  /**
   * Refine query based on user input
   */
  private static refineQuery(originalQuery: string, clarification: string): string {
    // Simple refinement strategy
    if (originalQuery.toLowerCase().includes('good')) {
      return originalQuery.replace(/\bgood\b/i, clarification);
    }

    if (originalQuery.toLowerCase().includes('show me')) {
      return originalQuery.replace('show me', `show me ${clarification}`);
    }

    return `${originalQuery} ${clarification}`;
  }

  /**
   * Generate unique IDs
   */
  private static generateAmbiguityId(): string {
    return `ambiguity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateRequestId(): string {
    return `clarification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default AmbiguityDetector;