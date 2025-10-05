/**
 * Response Validation Schemas
 * Comprehensive validation rules for all LLM response types
 */

import { Tool } from '../types';

export interface ValidationRule {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  validator?: (value: any) => boolean;
  defaultValue?: any;
  description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-1 confidence in validation
  sanitizedData?: any;
}

export interface SchemaDefinition {
  name: string;
  version: string;
  description: string;
  rules: Record<string, ValidationRule>;
}

export class ResponseValidator {
  private static schemas: Map<string, SchemaDefinition> = new Map();

  /**
   * Initialize all validation schemas
   */
  static initializeSchemas(): void {
    this.registerSchema(this.createQueryAnalysisSchema());
    this.registerSchema(this.createToolSelectionSchema());
    this.registerSchema(this.createClarificationSchema());
    this.registerSchema(this.createIterationPlanningSchema());
    this.registerSchema(this.createConfidenceScoreSchema());
    this.registerSchema(this.createAgentStateSchema());
  }

  /**
   * Register a validation schema
   */
  static registerSchema(schema: SchemaDefinition): void {
    this.schemas.set(schema.name, schema);
  }

  /**
   * Get schema by name
   */
  static getSchema(name: string): SchemaDefinition | undefined {
    return this.schemas.get(name);
  }

  /**
   * Validate data against a schema
   */
  static validate(data: any, schemaName: string): ValidationResult {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return {
        isValid: false,
        errors: [`Schema not found: ${schemaName}`],
        warnings: [],
        score: 0
      };
    }

    return this.validateAgainstSchema(data, schema);
  }

  /**
   * Quick validation with common rules
   */
  static validateQuick(data: any, type: 'query' | 'tool' | 'clarification'): ValidationResult {
    switch (type) {
      case 'query':
        return this.validateQueryAnalysisQuick(data);
      case 'tool':
        return this.validateToolSelectionQuick(data);
      case 'clarification':
        return this.validateClarificationQuick(data);
      default:
        return {
          isValid: false,
          errors: [`Unknown validation type: ${type}`],
          warnings: [],
          score: 0
        };
    }
  }

  /**
   * Sanitize and validate data
   */
  static sanitizeAndValidate(data: any, schemaName: string): ValidationResult {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return {
        isValid: false,
        errors: [`Schema not found: ${schemaName}`],
        warnings: [],
        score: 0
      };
    }

    const sanitized = this.sanitizeData(data, schema);
    const validation = this.validateAgainstSchema(sanitized, schema);

    return {
      ...validation,
      sanitizedData: sanitized
    };
  }

  /**
   * Create query analysis schema
   */
  private static createQueryAnalysisSchema(): SchemaDefinition {
    return {
      name: 'query-analysis',
      version: '1.0.0',
      description: 'Schema for validating query analysis responses',
      rules: {
        intent: {
          name: 'intent',
          required: true,
          type: 'string',
          validator: (value: string) =>
            typeof value === 'string' &&
            value.length > 0 &&
            value.length <= 100,
          description: 'Primary intent of the query (1-100 characters)'
        },
        entities: {
          name: 'entities',
          required: true,
          type: 'object',
          validator: (value: any) =>
            typeof value === 'object' &&
            value !== null,
          description: 'Extracted entities from the query'
        },
        constraints: {
          name: 'constraints',
          required: true,
          type: 'object',
          validator: (value: any) =>
            typeof value === 'object' &&
            value !== null,
          description: 'Identified constraints and requirements'
        },
        ambiguities: {
          name: 'ambiguities',
          required: false,
          type: 'array',
          defaultValue: [],
          validator: (value: any[]) =>
            Array.isArray(value) &&
            value.every(item => typeof item === 'string'),
          description: 'List of identified ambiguities'
        },
        confidence: {
          name: 'confidence',
          required: true,
          type: 'number',
          validator: (value: number) =>
            typeof value === 'number' &&
            value >= 0 &&
            value <= 1,
          description: 'Confidence score between 0 and 1'
        },
        reasoning: {
          name: 'reasoning',
          required: true,
          type: 'string',
          validator: (value: string) =>
            typeof value === 'string' &&
            value.length > 0,
          description: 'Explanation of the analysis reasoning'
        },
        suggestedActions: {
          name: 'suggestedActions',
          required: false,
          type: 'array',
          defaultValue: [],
          validator: (value: any[]) =>
            Array.isArray(value) &&
            value.every(item => typeof item === 'string'),
          description: 'Suggested next actions'
        }
      }
    };
  }

  /**
   * Create tool selection schema
   */
  private static createToolSelectionSchema(): SchemaDefinition {
    return {
      name: 'tool-selection',
      version: '1.0.0',
      description: 'Schema for validating tool selection responses',
      rules: {
        tool: {
          name: 'tool',
          required: true,
          type: 'string',
          validator: (value: string) =>
            typeof value === 'string' &&
            value.length > 0 &&
            /^[a-zA-Z][a-zA-Z0-9_]*$/.test(value),
          description: 'Tool name (alphanumeric with underscores)'
        },
        parameters: {
          name: 'parameters',
          required: true,
          type: 'object',
          validator: (value: any) =>
            typeof value === 'object' &&
            value !== null,
          description: 'Tool parameters'
        },
        reasoning: {
          name: 'reasoning',
          required: true,
          type: 'string',
          validator: (value: string) =>
            typeof value === 'string' &&
            value.length > 0,
          description: 'Explanation for tool selection'
        },
        confidence: {
          name: 'confidence',
          required: true,
          type: 'number',
          validator: (value: number) =>
            typeof value === 'number' &&
            value >= 0 &&
            value <= 1,
          description: 'Confidence in tool selection (0-1)'
        },
        nextSteps: {
          name: 'nextSteps',
          required: false,
          type: 'array',
          defaultValue: [],
          validator: (value: any[]) =>
            Array.isArray(value) &&
            value.every(item => typeof item === 'string'),
          description: 'Planned next steps'
        }
      }
    };
  }

  /**
   * Create clarification schema
   */
  private static createClarificationSchema(): SchemaDefinition {
    return {
      name: 'clarification',
      version: '1.0.0',
      description: 'Schema for validating clarification responses',
      rules: {
        question: {
          name: 'question',
          required: true,
          type: 'string',
          validator: (value: string) =>
            typeof value === 'string' &&
            value.length > 0 &&
            value.includes('?'),
          description: 'Clarification question (must contain ?)'
        },
        options: {
          name: 'options',
          required: true,
          type: 'array',
          validator: (value: any[]) =>
            Array.isArray(value) &&
            value.length >= 2 &&
            value.every(option =>
              typeof option === 'object' &&
              typeof option.text === 'string' &&
              typeof option.confidence === 'number'
            ),
          description: 'Array of clarification options (minimum 2)'
        },
        reasoning: {
          name: 'reasoning',
          required: true,
          type: 'string',
          validator: (value: string) =>
            typeof value === 'string' &&
            value.length > 0,
          description: 'Explanation for clarification needed'
        },
        priority: {
          name: 'priority',
          required: false,
          type: 'string',
          defaultValue: 'medium',
          validator: (value: string) =>
            ['high', 'medium', 'low'].includes(value),
          description: 'Priority level (high, medium, low)'
        }
      }
    };
  }

  /**
   * Create iteration planning schema
   */
  private static createIterationPlanningSchema(): SchemaDefinition {
    return {
      name: 'iteration-planning',
      version: '1.0.0',
      description: 'Schema for validating iteration planning responses',
      rules: {
        shouldContinue: {
          name: 'shouldContinue',
          required: true,
          type: 'boolean',
          validator: (value: boolean) => typeof value === 'boolean',
          description: 'Whether to continue with another iteration'
        },
        nextAction: {
          name: 'nextAction',
          required: true,
          type: 'string',
          validator: (value: string) =>
            typeof value === 'string' &&
            value.length > 0,
          description: 'Description of next action'
        },
        reasoning: {
          name: 'reasoning',
          required: true,
          type: 'string',
          validator: (value: string) =>
            typeof value === 'string' &&
            value.length > 0,
          description: 'Reasoning for the planning decision'
        },
        confidence: {
          name: 'confidence',
          required: true,
          type: 'number',
          validator: (value: number) =>
            typeof value === 'number' &&
            value >= 0 &&
            value <= 1,
          description: 'Confidence in planning decision'
        },
        expectedOutcome: {
          name: 'expectedOutcome',
          required: false,
          type: 'string',
          validator: (value: string) =>
            typeof value === 'string',
          description: 'Expected outcome of the next action'
        }
      }
    };
  }

  /**
   * Create confidence score schema
   */
  private static createConfidenceScoreSchema(): SchemaDefinition {
    return {
      name: 'confidence-score',
      version: '1.0.0',
      description: 'Schema for validating confidence score objects',
      rules: {
        score: {
          name: 'score',
          required: true,
          type: 'number',
          validator: (value: number) =>
            typeof value === 'number' &&
            value >= 0 &&
            value <= 1,
          description: 'Confidence score (0-1)'
        },
        reasoning: {
          name: 'reasoning',
          required: true,
          type: 'string',
          validator: (value: string) =>
            typeof value === 'string' &&
            value.length > 0,
          description: 'Reasoning for confidence score'
        },
        factors: {
          name: 'factors',
          required: false,
          type: 'array',
          defaultValue: [],
          validator: (value: any[]) =>
            Array.isArray(value) &&
            value.every(factor =>
              typeof factor === 'object' &&
              typeof factor.name === 'string' &&
              typeof factor.weight === 'number'
            ),
          description: 'Factors affecting confidence score'
        }
      }
    };
  }

  /**
   * Create agent state schema
   */
  private static createAgentStateSchema(): SchemaDefinition {
    return {
      name: 'agent-state',
      version: '1.0.0',
      description: 'Schema for validating agent state objects',
      rules: {
        currentResults: {
          name: 'currentResults',
          required: true,
          type: 'array',
          validator: (value: any[]) => Array.isArray(value),
          description: 'Current search results'
        },
        iterationCount: {
          name: 'iterationCount',
          required: true,
          type: 'number',
          validator: (value: number) =>
            typeof value === 'number' &&
            value >= 0,
          description: 'Number of iterations completed'
        },
        isComplete: {
          name: 'isComplete',
          required: true,
          type: 'boolean',
          validator: (value: boolean) => typeof value === 'boolean',
          description: 'Whether the search is complete'
        },
        confidenceScores: {
          name: 'confidenceScores',
          required: false,
          type: 'array',
          defaultValue: [],
          validator: (value: any[]) =>
            Array.isArray(value),
          description: 'Array of confidence scores'
        }
      }
    };
  }

  /**
   * Validate data against schema rules
   */
  private static validateAgainstSchema(data: any, schema: SchemaDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let validFields = 0;
    let totalFields = Object.keys(schema.rules).length;

    for (const [fieldName, rule] of Object.entries(schema.rules)) {
      const value = data[fieldName];

      // Check required fields
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`Missing required field: ${fieldName}`);
        continue;
      }

      // Use default value for missing optional fields
      if (value === undefined && rule.defaultValue !== undefined) {
        data[fieldName] = rule.defaultValue;
      }

      // Skip validation if field is missing and not required
      if (value === undefined && !rule.required) {
        totalFields--;
        continue;
      }

      // Type validation
      if (typeof value !== rule.type) {
        errors.push(`Invalid type for ${fieldName}: expected ${rule.type}, got ${typeof value}`);
        continue;
      }

      // Custom validator
      if (rule.validator && !rule.validator(value)) {
        errors.push(`Validation failed for ${fieldName}: ${rule.description || 'Invalid value'}`);
        continue;
      }

      validFields++;
    }

    const score = totalFields > 0 ? validFields / totalFields : 0;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score
    };
  }

  /**
   * Quick validation for query analysis
   */
  private static validateQueryAnalysisQuick(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.intent || typeof data.intent !== 'string') {
      errors.push('Missing or invalid intent');
    }

    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
      errors.push('Invalid confidence score');
    }

    if (!data.reasoning || typeof data.reasoning !== 'string') {
      warnings.push('Missing reasoning explanation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1 : 0.5
    };
  }

  /**
   * Quick validation for tool selection
   */
  private static validateToolSelectionQuick(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.tool || typeof data.tool !== 'string') {
      errors.push('Missing or invalid tool name');
    }

    if (!data.parameters || typeof data.parameters !== 'object') {
      errors.push('Missing or invalid parameters');
    }

    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
      errors.push('Invalid confidence score');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1 : 0.3
    };
  }

  /**
   * Quick validation for clarification
   */
  private static validateClarificationQuick(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.question || typeof data.question !== 'string' || !data.question.includes('?')) {
      errors.push('Missing or invalid question (must contain ?)');
    }

    if (!Array.isArray(data.options) || data.options.length < 2) {
      errors.push('Missing or invalid options (minimum 2 required)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1 : 0.4
    };
  }

  /**
   * Sanitize data according to schema
   */
  private static sanitizeData(data: any, schema: SchemaDefinition): any {
    const sanitized: any = {};

    for (const [fieldName, rule] of Object.entries(schema.rules)) {
      let value = data[fieldName];

      // Handle missing fields
      if (value === undefined || value === null) {
        if (rule.defaultValue !== undefined) {
          value = rule.defaultValue;
        } else if (rule.required) {
          // Create minimal valid value for required fields
          switch (rule.type) {
            case 'string':
              value = '';
              break;
            case 'number':
              value = 0;
              break;
            case 'boolean':
              value = false;
              break;
            case 'object':
              value = {};
              break;
            case 'array':
              value = [];
              break;
          }
        } else {
          continue; // Skip optional missing fields
        }
      }

      // Type conversion if needed
      if (typeof value !== rule.type) {
        try {
          switch (rule.type) {
            case 'string':
              value = String(value);
              break;
            case 'number':
              value = Number(value);
              break;
            case 'boolean':
              value = Boolean(value);
              break;
            case 'object':
              if (typeof value === 'string') {
                value = JSON.parse(value);
              }
              break;
            case 'array':
              if (!Array.isArray(value)) {
                value = [value];
              }
              break;
          }
        } catch {
          // Keep original value if conversion fails
        }
      }

      sanitized[fieldName] = value;
    }

    return sanitized;
  }
}

// Initialize schemas on module load
ResponseValidator.initializeSchemas();

export default ResponseValidator;