/**
 * Response Parsing Pipeline for LLM outputs
 * Handles robust parsing of various response formats with error recovery
 */

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  confidence: number;
  metadata: {
    parseTime: number;
    originalLength: number;
    attempts: number;
    fallbackUsed: boolean;
  };
}

export interface ParsedQueryAnalysis {
  intent: string;
  entities: Record<string, any>;
  constraints: Record<string, any>;
  ambiguities: string[];
  confidence: number;
  reasoning: string;
  suggestedActions?: string[];
}

export interface ParsedToolSelection {
  tool: string;
  parameters: Record<string, any>;
  reasoning: string;
  confidence: number;
  nextSteps?: string[];
}

export interface ParsedClarification {
  question: string;
  options: Array<{
    text: string;
    confidence: number;
    refinedQuery?: string;
  }>;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

export class ResponseParser {
  private static readonly PARSE_TIMEOUT = 5000; // 5 seconds
  private static readonly MAX_ATTEMPTS = 3;

  /**
   * Parse query analysis response
   */
  static async parseQueryAnalysis(response: string): Promise<ParseResult<ParsedQueryAnalysis>> {
    return this.parseWithRetry(response, this.parseQueryAnalysisInternal.bind(this));
  }

  /**
   * Parse tool selection response
   */
  static async parseToolSelection(response: string): Promise<ParseResult<ParsedToolSelection>> {
    return this.parseWithRetry(response, this.parseToolSelectionInternal.bind(this));
  }

  /**
   * Parse clarification response
   */
  static async parseClarification(response: string): Promise<ParseResult<ParsedClarification>> {
    return this.parseWithRetry(response, this.parseClarificationInternal.bind(this));
  }

  /**
   * Parse generic JSON response with fallback strategies
   */
  static async parseJSON<T>(response: string, schema?: any): Promise<ParseResult<T>> {
    return this.parseWithRetry(response, this.parseJSONInternal.bind(this), schema) as Promise<ParseResult<T>>;
  }

  /**
   * Generic retry parser with timeout and fallback strategies
   */
  private static async parseWithRetry<T>(
    response: string,
    parseFunction: (response: string, schema?: any) => ParseResult<T>,
    schema?: any
  ): Promise<ParseResult<T>> {
    const startTime = Date.now();
    let lastError: string = '';
    let attempts = 0;
    let fallbackUsed = false;

    for (let attempt = 1; attempt <= this.MAX_ATTEMPTS; attempt++) {
      attempts = attempt;

      try {
        const result = await Promise.race([
          new Promise<ParseResult<T>>((resolve) => {
            const parseResult = parseFunction(response, schema);
            resolve(parseResult);
          }),
          new Promise<ParseResult<T>>((_, reject) => {
            setTimeout(() => reject(new Error('Parse timeout')), this.PARSE_TIMEOUT);
          })
        ]) as ParseResult<T>;

        if (result.success) {
          return {
            ...result,
            metadata: {
              parseTime: Date.now() - startTime,
              originalLength: response.length,
              attempts,
              fallbackUsed
            }
          };
        }

        lastError = result.error || 'Unknown parse error';

        // Try fallback strategies on subsequent attempts
        if (attempt > 1) {
          fallbackUsed = true;
          const fallbackResult = this.tryFallbackStrategies(response, lastError);
          if (fallbackResult.success) {
            return {
              ...fallbackResult,
              metadata: {
                parseTime: Date.now() - startTime,
                originalLength: response.length,
                attempts,
                fallbackUsed: true
              }
            } as ParseResult<T>;
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';

        if (attempt === this.MAX_ATTEMPTS) {
          // Final fallback attempt
          fallbackUsed = true;
          const fallbackResult = this.tryFallbackStrategies(response, lastError);
          if (fallbackResult.success) {
            return {
              ...fallbackResult,
              metadata: {
                parseTime: Date.now() - startTime,
                originalLength: response.length,
                attempts,
                fallbackUsed: true
              }
            } as ParseResult<T>;
          }
        }
      }
    }

    return {
      success: false,
      error: `Failed to parse after ${attempts} attempts. Last error: ${lastError}`,
      confidence: 0,
      metadata: {
        parseTime: Date.now() - startTime,
        originalLength: response.length,
        attempts,
        fallbackUsed
      }
    };
  }

  /**
   * Internal query analysis parser
   */
  private static parseQueryAnalysisInternal(response: string): ParseResult<ParsedQueryAnalysis> {
    try {
      const cleaned = this.preprocessResponse(response);
      const jsonMatch = this.extractJSON(cleaned);

      if (!jsonMatch) {
        return {
          success: false,
          error: 'No JSON found in response',
          confidence: 0,
          metadata: {
            parseTime: 0,
            originalLength: response.length,
            attempts: 1,
            fallbackUsed: false
          }
        };
      }

      const data = JSON.parse(jsonMatch);

      // Validate required fields
      const required = ['intent', 'entities', 'constraints', 'confidence', 'reasoning'];
      const missing = required.filter(field => !(field in data));

      if (missing.length > 0) {
        return {
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`,
          confidence: 0,
          metadata: {
            parseTime: 0,
            originalLength: response.length,
            attempts: 1,
            fallbackUsed: false
          }
        };
      }

      // Validate data types
      if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
        return {
          success: false,
          error: 'Invalid confidence value (must be number between 0-1)',
          confidence: 0,
          metadata: {
            parseTime: 0,
            originalLength: response.length,
            attempts: 1,
            fallbackUsed: false
          }
        };
      }

      return {
        success: true,
        data: {
          intent: data.intent,
          entities: data.entities || {},
          constraints: data.constraints || {},
          ambiguities: Array.isArray(data.ambiguities) ? data.ambiguities : [],
          confidence: data.confidence,
          reasoning: data.reasoning || '',
          suggestedActions: Array.isArray(data.suggestedActions) ? data.suggestedActions : []
        },
        confidence: 0.9,
        metadata: {
          parseTime: 0,
          originalLength: response.length,
          attempts: 1,
          fallbackUsed: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parse error',
        confidence: 0,
        metadata: {
          parseTime: 0,
          originalLength: response.length,
          attempts: 1,
          fallbackUsed: false
        }
      };
    }
  }

  /**
   * Internal tool selection parser
   */
  private static parseToolSelectionInternal(response: string): ParseResult<ParsedToolSelection> {
    try {
      const cleaned = this.preprocessResponse(response);
      const jsonMatch = this.extractJSON(cleaned);

      if (!jsonMatch) {
        return {
          success: false,
          error: 'No JSON found in response',
          confidence: 0,
          metadata: {
            parseTime: 0,
            originalLength: response.length,
            attempts: 1,
            fallbackUsed: false
          }
        };
      }

      const data = JSON.parse(jsonMatch);

      // Validate required fields
      const required = ['tool', 'parameters', 'reasoning', 'confidence'];
      const missing = required.filter(field => !(field in data));

      if (missing.length > 0) {
        return {
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`,
          confidence: 0,
          metadata: {
            parseTime: 0,
            originalLength: response.length,
            attempts: 1,
            fallbackUsed: false
          }
        };
      }

      return {
        success: true,
        data: {
          tool: data.tool,
          parameters: data.parameters || {},
          reasoning: data.reasoning || '',
          confidence: data.confidence,
          nextSteps: Array.isArray(data.nextSteps) ? data.nextSteps : []
        },
        confidence: 0.9,
        metadata: {
          parseTime: 0,
          originalLength: response.length,
          attempts: 1,
          fallbackUsed: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parse error',
        confidence: 0,
        metadata: {
          parseTime: 0,
          originalLength: response.length,
          attempts: 1,
          fallbackUsed: false
        }
      };
    }
  }

  /**
   * Internal clarification parser
   */
  private static parseClarificationInternal(response: string): ParseResult<ParsedClarification> {
    try {
      const cleaned = this.preprocessResponse(response);
      const jsonMatch = this.extractJSON(cleaned);

      if (!jsonMatch) {
        return {
          success: false,
          error: 'No JSON found in response',
          confidence: 0,
          metadata: {
            parseTime: 0,
            originalLength: response.length,
            attempts: 1,
            fallbackUsed: false
          }
        };
      }

      const data = JSON.parse(jsonMatch);

      // Validate required fields
      const required = ['question', 'options', 'reasoning'];
      const missing = required.filter(field => !(field in data));

      if (missing.length > 0) {
        return {
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`,
          confidence: 0,
          metadata: {
            parseTime: 0,
            originalLength: response.length,
            attempts: 1,
            fallbackUsed: false
          }
        };
      }

      return {
        success: true,
        data: {
          question: data.question,
          options: Array.isArray(data.options) ? data.options : [],
          reasoning: data.reasoning || '',
          priority: data.priority || 'medium'
        },
        confidence: 0.9,
        metadata: {
          parseTime: 0,
          originalLength: response.length,
          attempts: 1,
          fallbackUsed: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parse error',
        confidence: 0,
        metadata: {
          parseTime: 0,
          originalLength: response.length,
          attempts: 1,
          fallbackUsed: false
        }
      };
    }
  }

  /**
   * Generic JSON parser with schema validation
   */
  private static parseJSONInternal<T>(response: string, schema?: any): ParseResult<T> {
    try {
      const cleaned = this.preprocessResponse(response);
      const jsonMatch = this.extractJSON(cleaned);

      if (!jsonMatch) {
        return {
          success: false,
          error: 'No JSON found in response',
          confidence: 0,
          metadata: {
            parseTime: 0,
            originalLength: response.length,
            attempts: 1,
            fallbackUsed: false
          }
        };
      }

      const data = JSON.parse(jsonMatch);

      // Basic schema validation if provided
      if (schema && typeof schema === 'object') {
        const validation = this.validateSchema(data, schema);
        if (!validation.valid) {
          return {
            success: false,
            error: `Schema validation failed: ${validation.errors.join(', ')}`,
            confidence: 0,
            metadata: {
              parseTime: 0,
              originalLength: response.length,
              attempts: 1,
              fallbackUsed: false
            }
          };
        }
      }

      return {
        success: true,
        data: data as T,
        confidence: 0.95,
        metadata: {
          parseTime: 0,
          originalLength: response.length,
          attempts: 1,
          fallbackUsed: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parse error',
        confidence: 0,
        metadata: {
          parseTime: 0,
          originalLength: response.length,
          attempts: 1,
          fallbackUsed: false
        }
      };
    }
  }

  /**
   * Preprocess response to extract clean JSON
   */
  private static preprocessResponse(response: string): string {
    return response
      .trim()
      // Remove markdown code blocks
      .replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1')
      // Remove common LLM artifacts
      .replace(/^(Here is|Here's|The) (?:JSON |response |result )?/i, '')
      .replace(/(?:Let me know|Hope this helps|Is there anything else)[\s\S]*$/i, '')
      .trim();
  }

  /**
   * Extract JSON from response text
   */
  private static extractJSON(text: string): string | null {
    // Try to find JSON object boundaries
    const startBrace = text.indexOf('{');
    if (startBrace === -1) return null;

    let braceCount = 0;
    let endBrace = -1;

    for (let i = startBrace; i < text.length; i++) {
      if (text[i] === '{') {
        braceCount++;
      } else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endBrace = i;
          break;
        }
      }
    }

    if (endBrace === -1) return null;

    return text.substring(startBrace, endBrace + 1);
  }

  /**
   * Fallback strategies for failed parsing
   */
  private static tryFallbackStrategies<T>(response: string, lastError: string): ParseResult<T> {
    // Strategy 1: Try to extract partial information
    if (response.includes('intent:') || response.includes('tool:')) {
      const partial = this.extractPartialInformation(response);
      if (partial) {
        return partial as ParseResult<T>;
      }
    }

    // Strategy 2: Try to fix common JSON syntax issues
    const fixedJson = this.fixCommonJSONIssues(response);
    if (fixedJson) {
      try {
        const data = JSON.parse(fixedJson);
        return {
          success: true,
          data: data as T,
          confidence: 0.5, // Lower confidence for fixed JSON
          metadata: {
            parseTime: 0,
            originalLength: response.length,
            attempts: 1,
            fallbackUsed: true
          }
        };
      } catch {
        // Continue to next strategy
      }
    }

    // Strategy 3: Return minimal safe structure
    return this.createMinimalResponse(lastError) as ParseResult<T>;
  }

  /**
   * Extract partial information from malformed response
   */
  private static extractPartialInformation(response: string): ParseResult<any> | null {
    const lines = response.split('\n');
    const info: Record<string, any> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // Extract key-value pairs
      if (trimmed.includes(':') && !trimmed.startsWith('//')) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();

        if (key && value) {
          const cleanKey = key.toLowerCase().replace(/\s+/g, '');
          info[cleanKey] = value.replace(/^["']|["']$/g, ''); // Remove quotes
        }
      }
    }

    if (Object.keys(info).length > 0) {
      return {
        success: true,
        data: info,
        confidence: 0.3,
        error: 'Partial extraction from malformed response',
        metadata: {
          parseTime: 0,
          originalLength: response.length,
          attempts: 1,
          fallbackUsed: true
        }
      };
    }

    return null;
  }

  /**
   * Fix common JSON syntax issues
   */
  private static fixCommonJSONIssues(text: string): string | null {
    try {
      let fixed = text;

      // Fix trailing commas
      fixed = fixed.replace(/,\s*([}\]])/g, '$1');

      // Fix missing quotes around keys
      fixed = fixed.replace(/(\w+):/g, '"$1":');

      // Fix single quotes to double quotes
      fixed = fixed.replace(/'/g, '"');

      // Remove comments
      fixed = fixed.replace(/\/\/.*$/gm, '');
      fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');

      // Validate the fixed JSON
      JSON.parse(fixed);
      return fixed;
    } catch {
      return null;
    }
  }

  /**
   * Create minimal safe response
   */
  private static createMinimalResponse(error: string): ParseResult<any> {
    return {
      success: false,
      error: `Parsing failed: ${error}`,
      confidence: 0,
      data: {
        intent: 'error',
        reasoning: 'Failed to parse LLM response',
        confidence: 0,
        entities: {},
        constraints: {}
      },
      metadata: {
        parseTime: 0,
        originalLength: 0,
        attempts: 1,
        fallbackUsed: true
      }
    };
  }

  /**
   * Basic schema validation
   */
  private static validateSchema(data: any, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, type] of Object.entries(schema)) {
      if (!(key in data)) {
        errors.push(`Missing required field: ${key}`);
      } else if (typeof data[key] !== type) {
        errors.push(`Invalid type for ${key}: expected ${type}, got ${typeof data[key]}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default ResponseParser;
