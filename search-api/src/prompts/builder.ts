import * as fs from 'fs';
import * as path from 'path';
import { QueryContext } from '../graph/context';
import { Tool } from '../types';
import { TOOL_REGISTRY } from '../tools';
import { getOriginalDataset } from '../data/loader';

/**
 * Prompt Builder for constructing dynamic prompts with context injection
 */
export class PromptBuilder {
  private static readonly PROMPTS_DIR = path.join(__dirname, 'system');
  private static readonly TEMPLATES_DIR = path.join(__dirname, 'templates');

  /**
   * Load system prompt content
   */
  static loadSystemPrompt(): string {
    try {
      const basePath = this.PROMPTS_DIR;
      const basePrompt = fs.readFileSync(path.join(basePath, 'base.md'), 'utf8');
      const reasoningPrompt = fs.readFileSync(path.join(basePath, 'reasoning.md'), 'utf8');
      const toolsPrompt = fs.readFileSync(path.join(basePath, 'tools.md'), 'utf8');
      const outputFormatPrompt = fs.readFileSync(path.join(basePath, 'output-format.md'), 'utf8');

      return [
        '# System Instructions\n',
        basePrompt,
        '\n# Reasoning Guidelines\n',
        reasoningPrompt,
        '\n# Available Tools\n',
        toolsPrompt,
        '\n# Output Format Requirements\n',
        outputFormatPrompt
      ].join('\n');
    } catch (error) {
      console.error('Error loading system prompts:', error);
      return 'You are an AI search assistant for discovering AI tools.';
    }
  }

  /**
   * Load template content by name
   */
  static loadTemplate(templateName: string): string {
    try {
      const templatePath = path.join(this.TEMPLATES_DIR, `${templateName}.md`);
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error);
      return `Template ${templateName} not found.`;
    }
  }

  /**
   * Build query analysis prompt
   */
  static buildQueryAnalysisPrompt(
    query: string,
    context: QueryContext,
    currentState: any
  ): string {
    const template = this.loadTemplate('query-analysis');
    const systemPrompt = this.loadSystemPrompt();
    const contextSummary = this.getContextSummary(context);
    const currentStateSummary = this.getCurrentStateSummary(currentState);

    return [
      systemPrompt,
      '\n\n# Query Analysis Task',
      template
        .replace('{{query}}', JSON.stringify(query))
        .replace('{{contextSummary}}', contextSummary)
        .replace('{{currentStateSummary}}', currentStateSummary)
    ].join('\n');
  }

  /**
   * Build tool selection prompt
   */
  static buildToolSelectionPrompt(
    context: QueryContext,
    currentState: any,
    availableTools: string[]
  ): string {
    const template = this.loadTemplate('tool-selection');
    const systemPrompt = this.loadSystemPrompt();
    const contextSummary = this.getContextSummary(context);
    const currentStateSummary = this.getCurrentStateSummary(currentState);
    const executionHistory = this.getExecutionHistory(currentState);

    return [
      systemPrompt,
      '\n\n# Tool Selection Task',
      template
        .replace('{{intent}}', context.interpretedIntent)
        .replace('{{entities}}', JSON.stringify(context.extractedEntities))
        .replace('{{constraints}}', JSON.stringify(context.constraints))
        .replace('{{previousSteps}}', executionHistory)
        .replace('{{datasetSize}}', currentState.originalDataset?.length || 0)
        .replace('{{contextSummary}}', contextSummary)
        .replace('{{currentStateSummary}}', currentStateSummary)
        .replace('{{currentResultsSummary}}', this.getCurrentResultsSummary(currentState))
    ].join('\n');
  }

  /**
   * Build ambiguity resolution prompt
   */
  static buildAmbiguityResolutionPrompt(
    originalQuery: string,
    currentInterpretation: string,
    ambiguities: string[],
    conversationHistory: any[]
  ): string {
    const template = this.loadTemplate('ambiguity-resolution');
    const systemPrompt = this.loadSystemPrompt();

    return [
      systemPrompt,
      '\n\n# Ambiguity Resolution Task',
      template
        .replace('{{originalQuery}}', JSON.stringify(originalQuery))
        .replace('{{currentInterpretation}}', currentInterpretation)
        .replace('{{ambiguities}}', JSON.stringify(ambiguities))
        .replace('{{conversationHistory}}', JSON.stringify(conversationHistory))
    ].join('\n');
  }

  /**
   * Build iteration planning prompt
   */
  static buildIterationPlanningPrompt(
    originalQuery: string,
    currentIntent: string,
    stepHistory: any[],
    currentState: any,
    context: QueryContext,
    currentIteration: number,
    maxIterations: number
  ): string {
    const template = this.loadTemplate('iteration-planning');
    const systemPrompt = this.loadSystemPrompt();
    const contextSummary = this.getContextSummary(context);
    const currentStateSummary = this.getCurrentStateSummary(currentState);
    const executionHistory = this.getExecutionHistory(currentState);

    return [
      systemPrompt,
      '\n\n# Iteration Planning Task',
      template
        .replace('{{originalQuery}}', JSON.stringify(originalQuery))
        .replace('{{currentIntent}}', currentIntent)
        .replace('{{stepHistory}}', JSON.stringify(stepHistory))
        .replace('{{currentResultsSummary}}', this.getCurrentResultsSummary(currentState))
        .replace('{{contextSummary}}', contextSummary)
        .replace('{{executionHistory}}', executionHistory)
        .replace('{{currentIteration}}', currentIteration.toString())
        .replace('{{maxIterations}}', maxIterations.toString())
    ].join('\n');
  }

  /**
   * Get context summary for prompt injection
   */
  private static getContextSummary(context: QueryContext): string {
    const parts = [
      `Query: "${context.originalQuery}"`,
      `Intent: ${context.interpretedIntent}`,
      `Entities: ${JSON.stringify(context.extractedEntities)}`,
      `Constraints: ${JSON.stringify(context.constraints)}`
    ];

    if (context.ambiguities.length > 0) {
      parts.push(`Ambiguities: ${context.ambiguities.join(', ')}`);
    }

    if (context.clarificationHistory.length > 0) {
      parts.push(`Clarifications: ${context.clarificationHistory.length} rounds`);
    }

    return parts.join(' | ');
  }

  /**
   * Get current state summary for prompt injection
   */
  private static getCurrentStateSummary(state: any): string {
    const summary = {
      iteration: state.iterationCount,
      resultsCount: state.currentResults?.length || 0,
      datasetSize: state.originalDataset?.length || 0,
      isComplete: state.isComplete,
      confidenceScores: state.confidenceScores,
      lastUpdate: state.lastUpdateTime
    };
    return JSON.stringify(summary);
  }

  /**
   * Get current results summary for prompt injection
   */
  private static getCurrentResultsSummary(state: any): string {
    const count = state.currentResults?.length || 0;
    if (count === 0) {
      return 'No results yet';
    }

    const sample = state.currentResults.slice(0, 3);
    const sampleSummary = sample.map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.categories?.primary?.[0] || 'unknown'
    }));

    return `${count} results found. Sample: ${JSON.stringify(sampleSummary)}`;
  }

  /**
   * Get execution history for prompt injection
   */
  private static getExecutionHistory(state: any): string {
    const history = state.toolHistory?.slice(-3) || [];
    if (history.length === 0) {
      return 'No previous steps';
    }

    return history.map((step: any) => ({
      tool: step.toolName,
      reasoning: step.reasoning,
      confidence: step.confidence,
      resultCount: step.resultCount
    }));
  }

  /**
   * Validate prompt template
   */
  static validateTemplate(templateContent: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required placeholders
    const requiredPlaceholders = ['{{query}}'];
    for (const placeholder of requiredPlaceholders) {
      if (!templateContent.includes(placeholder)) {
        errors.push(`Missing required placeholder: ${placeholder}`);
      }
    }

    // Check for template structure
    if (!templateContent.includes('#') || !templateContent.includes('##')) {
      warnings.push('Template lacks proper markdown structure');
    }

    // Check for response format instructions
    if (!templateContent.includes('JSON')) {
      warnings.push('Template does not specify JSON response format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Inject context into prompt template
   */
  static injectContext(
    template: string,
    context: Record<string, any>
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return result;
  }

  /**
   * Get tool schemas for available tools
   */
  static getToolSchemas(availableTools: string[]): string {
    const toolSchemas = availableTools.map(toolName => {
      const tool = TOOL_REGISTRY[toolName];
      if (!tool) return null;

      return {
        name: tool.metadata.name,
        description: tool.metadata.description,
        category: tool.metadata.category,
        schema: tool.metadata.schema,
        examples: tool.metadata.examples,
        performance: tool.metadata.performance
      };
    }).filter(Boolean);

    return JSON.stringify(toolSchemas, null, 2);
  }

  /**
   * Get dataset schema information
   */
  static getDatasetSchema(): string {
    try {
      const dataset = getOriginalDataset();
      if (dataset.length === 0) {
        return JSON.stringify({
          note: "No data available",
          fields: []
        }, null, 2);
      }

      const sampleItem = dataset[0];
      if (!sampleItem) {
        return JSON.stringify({
          note: "No sample item available",
          fields: []
        }, null, 2);
      }

      // Extract field information from sample data
      const fields = this.extractFieldsFromItem(sampleItem);

      return JSON.stringify({
        totalItems: dataset.length,
        fields: fields,
        sampleStructure: this.getSampleStructure(sampleItem),
        note: "This represents the structure of AI tools in the database"
      }, null, 2);

    } catch (error) {
      console.error('Error generating dataset schema:', error);
      return JSON.stringify({
        error: "Failed to load dataset schema",
        fields: []
      }, null, 2);
    }
  }

  /**
   * Extract field information from an item
   */
  private static extractFieldsFromItem(item: any): any[] {
    const fields: any[] = [];

    const extractFields = (obj: any, prefix: string = '') => {
      for (const [key, value] of Object.entries(obj || {})) {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        const fieldType = Array.isArray(value) ? 'array' :
                        typeof value === 'object' && value !== null ? 'object' :
                        typeof value;

        fields.push({
          name: fieldName,
          type: fieldType,
          hasValue: value !== null && value !== undefined,
          sampleValue: fieldType === 'object' ? null :
                      Array.isArray(value) ? value.slice(0, 2) :
                      value
        });

        if (fieldType === 'object' && value !== null && !Array.isArray(value)) {
          extractFields(value, fieldName);
        }
      }
    };

    extractFields(item);
    return fields;
  }

  /**
   * Get sample structure from item
   */
  private static getSampleStructure(item: any): any {
    const sample: any = {};

    const createSample = (obj: any, target: any, maxDepth: number = 2, currentDepth: number = 0) => {
      if (currentDepth >= maxDepth) return;

      for (const [key, value] of Object.entries(obj || {})) {
        if (Array.isArray(value)) {
          target[key] = value.length > 0 ? [`array[${value.length}] items, e.g., "${value[0]}"`] : 'empty array';
        } else if (typeof value === 'object' && value !== null) {
          target[key] = {};
          createSample(value, target[key], maxDepth, currentDepth + 1);
        } else {
          target[key] = value;
        }
      }
    };

    createSample(item, sample);
    return sample;
  }

  /**
   * Build enhanced tool selection prompt with schemas
   */
  static buildEnhancedToolSelectionPrompt(
    context: QueryContext,
    currentState: any,
    availableTools: string[]
  ): string {
    const template = this.loadTemplate('tool-selection');
    const toolSchemas = this.getToolSchemas(availableTools);
    const datasetSchema = this.getDatasetSchema();
    const contextSummary = this.getContextSummary(context);
    const currentStateSummary = this.getCurrentStateSummary(currentState);
    const executionHistory = this.getExecutionHistory(currentState);

    const query = context.originalQuery.toLowerCase();
    let specificGuidance = "";

    // Provide specific guidance based on query patterns
    if (query.includes('chatgpt') || query.includes('midjourney') || query.includes('claude') ||
        query.includes('gemini') || query.includes('dall-e') || query.includes('stable diffusion')) {
      specificGuidance = `
## SPECIFIC QUERY ANALYSIS
This appears to be a query for a specific AI tool by name/brand.

**RECOMMENDED APPROACH**:
1. First try: filterByField with field: "name" and exact value match
2. Fallback: searchByText with the full query string

**EXAMPLE FOR "ChatGPT"**:
{
  "tool": "filterByField",
  "parameters": {
    "field": "name",
    "value": "ChatGPT",
    "operator": "contains",
    "caseSensitive": false
  },
  "reasoning": "Looking for exact tool name match in the database",
  "confidence": 0.95,
  "expectedOutcome": "Find tools with 'ChatGPT' in the name field"
}
`;
    } else if (query.includes('free') || query.includes('pricing') || query.includes('cost') ||
               query.includes('price') || query.includes('subscription')) {
      specificGuidance = `
## SPECIFIC QUERY ANALYSIS
This appears to be a query about pricing or cost.

**RECOMMENDED APPROACH**:
1. Use filterByNestedField for pricing-related fields
2. Use filterByPriceRange for specific price ranges

**AVAILABLE PRICING FIELDS**:
- pricingSummary.hasFreeTier (boolean)
- pricingSummary.lowestMonthlyPrice (number)
- pricingSummary.pricingModel (string)
- pricingSummary.currency (string)
`;
    } else if (query.includes('category') || query.includes('type') || query.includes('kind') ||
               query.includes('writing') || query.includes('image') || query.includes('code')) {
      specificGuidance = `
## SPECIFIC QUERY ANALYSIS
This appears to be a query about tool categories or capabilities.

**RECOMMENDED APPROACH**:
1. Use filterByArrayContains for categories
2. Use filterByNestedField for specific capabilities

**AVAILABLE CATEGORY FIELDS**:
- categories.primary (array)
- categories.secondary (array)
- categories.industries (array)
- categories.userTypes (array)
`;
    }

    const enhancedPrompt = `You are analyzing a query to search for AI tools in a database.

## Dataset Schema
${datasetSchema}

## Available Tools
${toolSchemas}

## Query Context
- Original Query: "${context.originalQuery}"
- Intent: ${context.interpretedIntent}
- Entities: ${JSON.stringify(context.extractedEntities, null, 2)}
- Constraints: ${JSON.stringify(context.constraints, null, 2)}

## Current State
- Results Count: ${currentState.currentResults?.length || 0}
- Current Iteration: ${currentState.iterationCount || 0}
- Previous Actions: ${executionHistory}

${specificGuidance}

## Tool Selection Decision Rules

### 1. Brand/Tool Name Queries
If the query mentions specific AI tools (ChatGPT, Midjourney, Claude, etc.):
- **PRIMARY**: Use filterByField with field: "name"
- **EXAMPLE**: {"tool": "filterByField", "parameters": {"field": "name", "value": "ChatGPT", "operator": "contains", "caseSensitive": false}}

### 2. Category/Type Queries
If the query asks about types of tools (writing, image generation, coding):
- **PRIMARY**: Use filterByArrayContains with field: "categories.primary"
- **EXAMPLE**: {"tool": "filterByArrayContains", "parameters": {"field": "categories.primary", "values": ["writing"], "matchType": "any"}}

### 3. Feature/Capability Queries
If the query asks about specific capabilities:
- **PRIMARY**: Use filterByNestedField with appropriate path
- **EXAMPLE**: {"tool": "filterByNestedField", "parameters": {"field": "capabilities.technical.apiAccess", "value": true}}

### 4. Pricing Queries
If the query mentions pricing, cost, or free:
- **PRIMARY**: Use filterByNestedField for pricing fields
- **EXAMPLE**: {"tool": "filterByNestedField", "parameters": {"field": "pricingSummary.hasFreeTier", "value": true}}

### 5. General/Conceptual Queries
If the query is general or doesn't match above patterns:
- **PRIMARY**: Use searchByText for broad search
- **EXAMPLE**: {"tool": "searchByText", "parameters": {"query": "AI assistant tools", "fields": ["name", "description"]}}

## CRITICAL REQUIREMENTS
1. **USE ONLY EXACT TOOL NAMES** from the Available Tools list above
2. **NEVER INVENT TOOLS** like "search_intent" - they don't exist
3. **PROVIDE SPECIFIC PARAMETERS** based on the user's query
4. **EXPLAIN YOUR REASONING** for tool selection

## Response Format
Respond with a JSON object containing:
{
  "tool": "exact_tool_name_from_available_tools",
  "parameters": {
    "parameter_name": "specific_value_based_on_query"
  },
  "reasoning": "explain why this tool and parameters were chosen",
  "confidence": 0.8,
  "expectedOutcome": "describe what results this should produce"
}

Analyze the query carefully and select the best tool with specific parameters.`;

    return enhancedPrompt;
  }
}

export default PromptBuilder;