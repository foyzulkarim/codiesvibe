// Core tool interface based on the actual schema
export interface Tool {
  // Identity fields
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  tagline?: string;
  createdBy: string;

  // Categorization
  categories: {
    primary: string[];
    secondary: string[];
    industries: string[];
    userTypes: string[];
  };

  // Pricing information
  pricingSummary: {
    lowestMonthlyPrice: number;
    highestMonthlyPrice: number;
    currency: string;
    hasFreeTier: boolean;
    hasCustomPricing: boolean;
    billingPeriods: string[];
    pricingModel: ('free' | 'freemium' | 'paid')[];
  };

  // Capabilities
  capabilities?: {
    core: string[];
    aiFeatures: {
      codeGeneration: boolean;
      imageGeneration: boolean;
      dataAnalysis: boolean;
      voiceInteraction: boolean;
      multimodal: boolean;
      thinkingMode: boolean;
    };
    technical: {
      apiAccess: boolean;
      webHooks: boolean;
      sdkAvailable: boolean;
      offlineMode: boolean;
    };
    integrations: {
      platforms: string[];
      thirdParty: string[];
      protocols: string[];
    };
  };

  // Search and metadata
  searchKeywords: string[];
  semanticTags: string[];
  aliases: string[];

  // Legacy fields (backward compatibility)
  interface: string[];
  functionality: string[];
  deployment: string[];

  // Metrics
  popularity: number;
  rating: number;
  reviewCount: number;

  // URLs and links
  logoUrl?: string;
  website?: string;
  documentation?: string;

  // Status and metadata
  status: string;
  contributor: string;
  dateAdded: string;
  lastUpdated: string;

  // Additional fields for AI reasoning compatibility
  tags?: string[];
  pricing?: any;
  function?: any;
  parameters?: any;
  contextRequirements?: string[];
}

// AI Reasoning Components
export interface ReasoningStep {
  step: number;
  action: string;
  reasoning: string;
  confidence: number;
  timestamp: string;
}

export interface ConfidenceScore {
  score: number;
  reasoning: string;
  factors?: any[];
  timestamp: Date;
}

// Tool execution history
export interface ToolHistoryStep {
  toolName: string;
  parameters: Record<string, any>;
  resultCount: number;
  confidence: ConfidenceScore;
  reasoning: string;
  timestamp: Date;
}

// Query context for maintaining conversation state
export interface QueryContext {
  originalQuery: string;
  interpretedIntent: string;
  extractedEntities: Record<string, any>;
  constraints: Record<string, any>;
  ambiguities: any[];
  clarificationHistory: ClarificationRound[];
  sessionId?: string;
}

// Clarification round for tracking conversation history
export interface ClarificationRound {
  round: number;
  question: string;
  response: string;
  confidence: number;
  timestamp: Date;
  resolvedAmbiguities: string[];
  request?: any;
  options?: any[];
  metadata?: any;
}

// Ambiguity types
export enum AmbiguityType {
  SUBJECTIVE_CRITERIA = 'subjective_criteria',
  QUANTITATIVE_AMBIGUITY = 'quantitative_ambiguity',
  TECHNICAL_AMBIGUITY = 'technical_ambiguity',
  SCOPE_AMBIGUITY = 'scope_ambiguity',
  CONTEXT_AMBIGUITY = 'context_ambiguity',
  TEMPORAL_AMBIGUITY = 'temporal_ambiguity'
}

export interface Ambiguity {
  type: AmbiguityType;
  description: string;
  confidence: number;
  options: any[];
  metadata?: any;
}

// Disambiguation options for ambiguous queries
export interface DisambiguationOption {
  interpretation: string;
  confidence: number;
  suggestedQuery: string;
  reasoning: string;
}

// Agent state for multi-step reasoning
export interface AgentState {
  originalQuery: string;
  currentResults: Tool[];
  iterationCount: number;
  isComplete: boolean;
  confidenceScores: ConfidenceScore[];
  lastUpdateTime: Date;
  toolHistory?: ToolHistoryStep[];
  currentConfidence?: ConfidenceScore;
  metadata: {
    startTime: Date;
    currentPhase?: string;
    totalSteps?: number;
    completedSteps?: number;
    hasError?: boolean;
    lastError?: string;
  };
}

// Tool action for planner output
export interface ToolAction {
  toolName: string;
  parameters: Record<string, any>;
  reasoning: string;
  confidence: number;
}

// Planning result interfaces
export interface PlanningResult {
  action: ToolAction;
  reasoning: string;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
  estimatedResults?: number;
}

export interface LLMPlanningResult {
  action: ToolAction;
  reasoning: string;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
  estimatedResults?: number;
}

// LLM Response interfaces
export interface LLMPlannerResponse {
  action: ToolAction;
  reasoning: string;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

export interface LLMAnalysisResponse {
  intent: string;
  entities: Record<string, any>;
  constraints: Record<string, any>;
  confidence: number;
  ambiguities: string[];
  suggestedActions: string[];
}

export interface LLMClarificationResponse {
  question: string;
  options: DisambiguationOption[];
  reasoning: string;
}

// Request/Response DTOs
export interface QueryRequest {
  query: string;
  limit?: number;
  offset?: number;
  context?: Partial<QueryContext>;
  enableReasoning?: boolean;
}

export interface QueryResponse {
  results: Tool[];
  total: number;
  limit: number;
  offset: number;
  query: string;
  executionTime: number;
  
  // AI reasoning components
  reasoningChain: ReasoningStep[];
  toolHistory: ToolHistoryStep[];
  confidenceScores: ConfidenceScore;
  summary: string;
  
  // Disambiguation support
  disambiguationOptions?: DisambiguationOption[];
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  
  // Metadata
  iterationCount: number;
  timestamp: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  uptime: number;
  datasetLoaded: boolean;
  count: number;
  timestamp: string;
  version: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}

// Tool function interface
export interface ToolFunction {
  (params: any[]): Promise<any> | any;
}

// Tool interface for tool registry
export interface ToolDefinition {
  name: string;
  category: string;
  description: string;
  parameters: Record<string, any>;
  function: ToolFunction;
  contextRequirements?: string[];
  resourceRequirements?: Record<string, any>;
  expectedResult?: {
    type: string;
    minLength?: number;
  };
}

// Tool registry types for dynamic tool loading
export interface ToolRegistryDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  category: string;
  examples: string[];
  reasoningExamples: string[];
}

export interface ToolRegistry {
  [toolName: string]: {
    func: (data: Tool[], params: any) => {
      results: Tool[];
      reasoning: string;
      confidence: number;
    };
    definition: ToolRegistryDefinition;
  };
}

// Validation schemas (for runtime validation)
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Configuration types
export interface AgenticConfig {
  PORT: number;
  DEFAULT_LIMIT: number;
  MAX_ITERATIONS: number;
  MONGO_URI: string;
  DB_NAME: string;
  COLLECTION_NAME: string;
  OLLAMA_URL: string;
  OLLAMA_MODEL: string;
  TEMPERATURE: number;
  CONFIDENCE_THRESHOLD: number;
  ENABLE_REASONING_EXPLANATION: boolean;
}

// Formatting and verbosity types
export interface FormattingOptions {
  includeReasoning: boolean;
  includeMetrics: boolean;
  includeConfidence: boolean;
  includeSuggestions: boolean;
  verbosity: 'concise' | 'standard' | 'detailed';
  format: 'json' | 'markdown' | 'html';
}

// State transition and snapshot types
export interface StateTransition {
  from: string;
  to: string;
  reason: string;
  timestamp: Date;
}

export interface StateSnapshot {
  state: AgentState;
  transition: StateTransition;
  timestamp: Date;
}

// Confidence calculation interface
export interface ConfidenceCalculation {
  baseScore: number;
  finalScore: number;
  factors: string[];
  reasoning: string;
  timestamp: Date;
}

// Retry options interface
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

// Utility types for type safety
export type SortOrder = 'asc' | 'desc';
export type SearchMode = 'any' | 'all';
export type ArrayMatchMode = 'any' | 'all';
export type PricingModel = 'free' | 'freemium' | 'paid';
export type ToolStatus = 'active' | 'inactive' | 'deprecated' | 'beta';

// Export all types for easy importing
export * from './index';