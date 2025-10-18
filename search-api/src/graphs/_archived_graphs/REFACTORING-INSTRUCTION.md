# Complete Agentic Search System Refactoring Instructions

## 🎯 Project Overview

**Objective**: Refactor the existing 13-node intent extraction pipeline into a modern, LLM-first agentic search architecture for AI tools and technology discovery.

**Domain**: AI tools and technology information search engine  
**Deployment**: Self-hosted LLM (no token cost constraints)  
**Status**: Brand new product, no production constraints

### Query Examples
- "free cli"
- "Cursor alternative but cheaper"
- "Amazon Q vs GitHub Copilot"

---

## 🏗️ New Architecture Overview

The system is being rebuilt with three main components:

### 1. **IntentExtractorNode** (LLM-based)
- **Input**: Raw user query
- **Output**: Structured `IntentState` JSON
- **Purpose**: Understand user's goal, extract features, pricing, comparison mode

### 2. **QueryPlannerNode** (LLM-based)
- **Input**: `IntentState` JSON
- **Output**: `QueryPlan` JSON
- **Purpose**: Convert intent into actionable retrieval strategy (Qdrant + MongoDB)

### 3. **QueryExecutorNode** (Deterministic)
- **Input**: `QueryPlan` JSON
- **Output**: `Candidates` array
- **Purpose**: Execute vector searches (Qdrant) and metadata queries (MongoDB)

```mermaid
flowchart LR
    A[User Query] --> B[IntentExtractorNode]
    B --> C[IntentState JSON]
    C --> D[QueryPlannerNode]
    D --> E[QueryPlan JSON]
    E --> F[QueryExecutorNode]
    F --> G[Candidates Array]
```

---

## 📁 Current State Analysis

### What Exists Now
```
src/nodes/
├── ... (check the files)
```

### What Needs to Be Built
```
src/
├── schemas/
│   ├── intent-state.schema.json     # ✅ New
│   ├── query-plan.schema.json       # ✅ New
│   └── candidate.schema.json        # ✅ New
├── types/
│   ├── intent-state.ts              # ✅ New
│   ├── query-plan.ts                # ✅ New
│   └── candidate.ts                 # ✅ New
├── nodes/
│   ├── intent-extractor.node.ts     # ✅ New (LLM-based)
│   ├── query-planner.node.ts        # ✅ New (LLM-based)
│   ├── query-executor.node.ts       # ✅ New (Deterministic)
│   └── intent-extraction.node.ts    # ♻️ Simplified orchestrator
└── utils/
    └── fusion.ts                     # ✅ New (RRF, weighted sum)
```

---

## 📋 Implementation Plan

### Phase 1: Foundation (Schemas & Types)

#### Step 1.1: Create Intent State Schema
**File**: `src/schemas/intent-state.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "intent-state.schema.json",
  "title": "IntentState",
  "description": "Structured representation of a user's search or discovery intent for AI tools and technologies.",
  "type": "object",
  "properties": {
    "primaryGoal": {
      "type": "string",
      "enum": ["find", "compare", "recommend", "explore", "analyze", "explain"],
      "description": "High-level intent category representing the user's purpose."
    },
    "referenceTool": {
      "type": ["string", "null"],
      "description": "Canonical tool name or ID used as a comparison or reference (e.g., 'Cursor IDE')."
    },
    "comparisonMode": {
      "type": ["string", "null"],
      "enum": ["similar_to", "vs", "alternative_to", null],
      "description": "Specifies comparative relationship between tools."
    },
    "desiredFeatures": {
      "type": "array",
      "description": "List of specific feature tags the user cares about.",
      "items": {
        "type": "string",
        "enum": [
          "AI code assist",
          "local inference",
          "RAG support",
          "multi-agent orchestration",
          "LLM integration",
          "context awareness",
          "CLI mode",
          "open-source"
        ]
      },
      "default": []
    },
    "filters": {
      "type": "array",
      "description": "Structured filters derived from constraints or attributes.",
      "items": {
        "type": "object",
        "properties": {
          "field": { "type": "string" },
          "operator": { "type": "string", "enum": ["=", "<", ">", "<=", ">=", "contains"] },
          "value": {}
        },
        "required": ["field", "operator", "value"]
      },
      "default": []
    },
    "pricing": {
      "type": ["string", "null"],
      "enum": ["free", "freemium", "paid", "enterprise", null],
      "description": "Primary pricing filter if explicitly mentioned."
    },
    "category": {
      "type": ["string", "null"],
      "enum": ["IDE", "API", "CLI", "Framework", "Agent", "Plugin", null],
      "description": "Tool type category mentioned or implied."
    },
    "platform": {
      "type": ["string", "null"],
      "enum": ["web", "desktop", "cli", "api", null],
      "description": "Platform or interface preference."
    },
    "semanticVariants": {
      "type": "array",
      "description": "List of paraphrased queries or search variants.",
      "items": { "type": "string" },
      "default": []
    },
    "constraints": {
      "type": "array",
      "description": "List of qualitative constraints ('cheaper', 'newer', 'simpler').",
      "items": { "type": "string" },
      "default": []
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Model-estimated confidence in this structured intent."
    }
  },
  "required": ["primaryGoal", "confidence"],
  "additionalProperties": false
}
```

#### Step 1.2: Create Query Plan Schema
**File**: `src/schemas/query-plan.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "query-plan.schema.json",
  "title": "QueryPlan",
  "description": "Structured retrieval plan generated from IntentState, guiding how to query hybrid data sources (Qdrant, MongoDB, APIs).",
  "type": "object",
  "properties": {
    "strategy": {
      "type": "string",
      "enum": ["hybrid", "multi-vector", "vector-only", "metadata-only", "semantic-kg"],
      "description": "High-level retrieval mode to use based on intent complexity and filters."
    },
    "vectorSources": {
      "type": "array",
      "description": "List of vector collections and embedding types to query.",
      "items": {
        "type": "object",
        "properties": {
          "collection": { "type": "string" },
          "embeddingType": { "type": "string" },
          "queryVectorSource": { 
            "type": "string", 
            "enum": ["query_text", "reference_tool_embedding", "semantic_variant"] 
          },
          "topK": { "type": "integer", "minimum": 1, "maximum": 200 }
        },
        "required": ["collection", "embeddingType", "queryVectorSource", "topK"]
      }
    },
    "structuredSources": {
      "type": "array",
      "description": "Structured databases or APIs with filters to apply.",
      "items": {
        "type": "object",
        "properties": {
          "source": { "type": "string" },
          "filters": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "field": { "type": "string" },
                "operator": { "type": "string" },
                "value": {}
              },
              "required": ["field", "operator", "value"]
            }
          },
          "limit": { "type": "integer", "minimum": 1, "maximum": 200 }
        },
        "required": ["source"]
      }
    },
    "reranker": {
      "type": "object",
      "description": "Optional reranking strategy configuration.",
      "properties": {
        "type": { "type": "string", "enum": ["cross-encoder", "LTR", "none"] },
        "model": { "type": "string" },
        "maxCandidates": { "type": "integer" }
      }
    },
    "fusion": {
      "type": "string",
      "enum": ["rrf", "weighted_sum", "concat", "none"],
      "description": "Fusion method for combining scores across sources."
    },
    "maxRefinementCycles": {
      "type": "integer",
      "minimum": 0,
      "maximum": 5,
      "description": "How many refinement iterations to allow if low confidence."
    },
    "explanation": {
      "type": "string",
      "description": "Natural-language rationale for why this plan is suitable."
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  },
  "required": ["strategy", "confidence"],
  "additionalProperties": false
}
```

#### Step 1.3: Create Candidate Schema
**File**: `src/schemas/candidate.schema.json`

```json
{
  "$id": "candidate.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Candidate",
  "description": "Represents a single retrieval result (AI tool or entity) with normalized scoring.",
  "type": "object",
  "properties": {
    "id": { "type": "string", "description": "Canonical tool ID" },
    "source": { "type": "string", "enum": ["qdrant", "mongodb", "api", "fusion"] },
    "score": { "type": "number", "minimum": 0, "maximum": 1 },
    "metadata": {
      "type": "object",
      "description": "Key metadata about the tool",
      "properties": {
        "name": { "type": "string" },
        "category": { "type": "string" },
        "pricing": { "type": "string" },
        "platform": { "type": "string" },
        "features": { "type": "array", "items": { "type": "string" } },
        "description": { "type": "string" }
      }
    },
    "embeddingVector": {
      "type": ["array", "null"],
      "items": { "type": "number" },
      "description": "Optional embedding vector returned by Qdrant."
    },
    "provenance": {
      "type": "object",
      "properties": {
        "collection": { "type": "string" },
        "queryVectorSource": { "type": "string" },
        "filtersApplied": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "required": ["id", "source", "score", "metadata"]
}
```

#### Step 1.4: Create TypeScript Types
**File**: `src/types/intent-state.ts`

```typescript
export interface IntentState {
  primaryGoal: "find" | "compare" | "recommend" | "explore" | "analyze" | "explain";
  referenceTool: string | null;
  comparisonMode: "similar_to" | "vs" | "alternative_to" | null;
  desiredFeatures: string[];
  filters: Array<{
    field: string;
    operator: "=" | "<" | ">" | "<=" | ">=" | "contains";
    value: any;
  }>;
  pricing: "free" | "freemium" | "paid" | "enterprise" | null;
  category: "IDE" | "API" | "CLI" | "Framework" | "Agent" | "Plugin" | null;
  platform: "web" | "desktop" | "cli" | "api" | null;
  semanticVariants: string[];
  constraints: string[];
  confidence: number;
}
```

**File**: `src/types/query-plan.ts`

```typescript
export interface QueryPlan {
  strategy: "hybrid" | "multi-vector" | "vector-only" | "metadata-only" | "semantic-kg";
  vectorSources?: Array<{
    collection: string;
    embeddingType: string;
    queryVectorSource: "query_text" | "reference_tool_embedding" | "semantic_variant";
    topK: number;
  }>;
  structuredSources?: Array<{
    source: string;
    filters?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    limit?: number;
  }>;
  reranker?: {
    type: "cross-encoder" | "LTR" | "none";
    model?: string;
    maxCandidates?: number;
  };
  fusion?: "rrf" | "weighted_sum" | "concat" | "none";
  maxRefinementCycles?: number;
  explanation?: string;
  confidence: number;
}
```

**File**: `src/types/candidate.ts`

```typescript
export interface Candidate {
  id: string;
  source: "qdrant" | "mongodb" | "api" | "fusion";
  score: number;
  metadata: {
    name: string;
    category?: string;
    pricing?: string;
    platform?: string;
    features?: string[];
    description?: string;
  };
  embeddingVector?: number[] | null;
  provenance?: {
    collection?: string;
    queryVectorSource?: string;
    filtersApplied?: string[];
  };
}

export interface QueryExecutorOutput {
  candidates: Candidate[];
  executionStats: {
    vectorQueriesExecuted: number;
    structuredQueriesExecuted: number;
    fusionMethod?: string;
    latencyMs: number;
  };
  confidence?: number;
}
```

---

### Phase 2: Core Nodes

#### Step 2.1: Create IntentExtractor Node
**File**: `src/nodes/intent-extractor.node.ts`

**Requirements**:
1. Accept user query from state
2. Call self-hosted LLM with function calling
3. Use the following system prompt:

```
You are an AI Intent Extractor for a search engine that helps users discover and compare AI tools and technologies (e.g., IDEs, APIs, frameworks, CLIs, agents).

Your task is to analyze the user query and produce a structured JSON object that conforms exactly to the provided IntentState schema.

Rules:
1. Use only the allowed enum values for fields like primaryGoal, comparisonMode, pricing, etc.
2. If a value is unknown or not mentioned, return null or an empty array
3. Extract tool names exactly as mentioned (preserve casing)
4. For comparison queries, identify the reference tool and comparison mode
5. Extract pricing constraints (free, paid, cheaper, etc.)
6. Identify platform preferences (web, desktop, cli, api)
7. List any explicit features mentioned
8. Generate 2-3 semantic variants of the query for search expansion
9. Provide a confidence score (0-1) based on query clarity

Examples:
- "free cli" → primaryGoal: "find", pricing: "free", platform: "cli"
- "Cursor alternative but cheaper" → primaryGoal: "find", referenceTool: "Cursor IDE", comparisonMode: "alternative_to", constraints: ["cheaper"]
- "Amazon Q vs GitHub Copilot" → primaryGoal: "compare", referenceTool: "Amazon Q", comparisonMode: "vs"
```

4. Validate output against `intent-state.schema.json` using Ajv
5. Return updated state with `intentState` populated
6. Include proper error handling and logging

**Note**: Determine the LLM client being used in the codebase and implement accordingly.

#### Step 2.2: Create QueryPlanner Node
**File**: `src/nodes/query-planner.node.ts`

**Requirements**:
1. Accept `IntentState` from state
2. Call self-hosted LLM with function calling
3. Use the following system prompt:

```
You are an AI Retrieval Planner for an agentic search engine specialized in AI tools and technologies.

You receive a structured IntentState object that describes the user's goal, features, pricing, and comparison intent.

You must design an optimal QueryPlan JSON according to the schema that combines:
- Vector-based similarity search (Qdrant collections)
- Metadata filtering (MongoDB)
- Optional reranking strategies

Guidelines:
1. For comparison queries with referenceTool, use "reference_tool_embedding" as queryVectorSource
2. For simple discovery, use "query_text" as queryVectorSource
3. Include semantic_variant sources when available
4. Apply structured filters for pricing, platform, category constraints
5. Use "hybrid" strategy for most queries
6. Set appropriate topK values (30-100 for vector, 50-100 for structured)
7. Choose fusion method: "rrf" for multi-source, "weighted_sum" for simpler cases
8. Provide clear explanation of the strategy
9. Set confidence based on intent clarity and strategy appropriateness

Do not exceed topK=200 for any source.
```

4. Validate output against `query-plan.schema.json` using Ajv
5. Return updated state with `executionPlan` populated
6. Include proper error handling and logging

#### Step 2.3: Create QueryExecutor Node
**File**: `src/nodes/query-executor.node.ts`

**Requirements**:
1. Accept `QueryPlan` from state
2. Execute vector queries against Qdrant:
   - Resolve query vectors based on `queryVectorSource`
   - Execute searches for each `vectorSource`
   - Collect results with scores
3. Execute structured queries against MongoDB:
   - Build filters from `structuredSources`
   - Execute queries with limits
   - Assign default scores
4. Implement score normalization
5. Implement fusion strategies (RRF, weighted_sum)
6. Validate candidates against `candidate.schema.json`
7. Return updated state with `candidates` and `executionStats`

**Note**: Use existing Qdrant and MongoDB clients from the codebase.

#### Step 2.4: Create Fusion Utilities
**File**: `src/utils/fusion.ts`

Implement:
- `normalizeScores(candidates: Candidate[]): Candidate[]`
- `fuseResults(candidates: Candidate[], method: string): Candidate[]`
  - Support "rrf" (Reciprocal Rank Fusion)
  - Support "weighted_sum"
  - Support "concat" (no fusion)

---

### Phase 3: Integration

#### Step 3.1: Update State Definition
**File**: `src/types/state.ts`

Add to `StateAnnotation`:
```typescript
intentState: Annotation<IntentState | null>,
executionPlan: Annotation<QueryPlan | null>,
candidates: Annotation<Candidate[]>,
executionStats: Annotation<any>,
```

#### Step 3.2: Simplify Intent Extraction Orchestrator
**File**: `src/nodes/intent-extraction.node.ts`

Replace the entire 13-node pipeline with:

```typescript
import { StateAnnotation } from "../types/state";
import { intentExtractorNode } from "./intent-extractor.node";
import { queryPlannerNode } from "./query-planner.node";
import { queryExecutorNode } from "./query-executor.node";

export async function intentExtractionNode(
  state: typeof StateAnnotation.State
): Promise<Partial<typeof StateAnnotation.State>> {
  const startTime = Date.now();
  
  try {
    // Step 1: Extract intent (LLM)
    let currentState = { ...state, ...await intentExtractorNode(state) };
    
    // Step 2: Plan retrieval (LLM)
    currentState = { ...currentState, ...await queryPlannerNode(currentState) };
    
    // Step 3: Execute queries (Deterministic)
    currentState = { ...currentState, ...await queryExecutorNode(currentState) };
    
    return {
      ...currentState,
      metadata: {
        ...state.metadata,
        executionPath: [
          ...(state.metadata?.executionPath || []),
          "intent-extraction"
        ],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "intent-extraction": Date.now() - startTime
        }
      }
    };
  } catch (error) {
    console.error("Error in intent extraction pipeline:", error);
    
    return {
      errors: [
        ...(state.errors || []),
        {
          node: "intent-extraction",
          error: error instanceof Error ? error : new Error("Unknown error"),
          timestamp: new Date()
        }
      ],
      metadata: {
        ...state.metadata,
        executionPath: [
          ...(state.metadata?.executionPath || []),
          "intent-extraction"
        ],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "intent-extraction": Date.now() - startTime
        }
      }
    };
  }
}
```

#### Step 3.3: Archive Old Nodes
Move all old extraction nodes to `src/nodes/_archived_extraction/`:
- `preprocessing/query-preprocessor.node.ts`
- `extraction/semantic-prefilter.node.ts`
- `extraction/zero-shot-classifier.node.ts`
- `extraction/ner-extractor.node.ts`
- `extraction/fuzzy-matcher.node.ts`
- `extraction/name-resolver.node.ts`
- `extraction/comparative-detector.node.ts`
- `extraction/reference-extractor.node.ts`
- `extraction/price-extractor.node.ts`
- `extraction/interface-detector.node.ts`
- `extraction/deployment-detector.node.ts`
- `extraction/intent-synthesizer.node.ts`
- `extraction/score-combiner.node.ts`

**Do not delete** - keep for reference during testing.

---

### Phase 4: Testing

#### Step 4.1: Create Debug Tests
**File**: `src/debug-scripts/intent-pipeline.test.ts`

Test the complete pipeline with these cases:

```typescript
const testCases = [
  {
    name: "Simple discovery query",
    query: "free cli",
    expectedIntent: {
      primaryGoal: "find",
      pricing: "free",
      platform: "cli"
    },
    expectedPlan: {
      strategy: "hybrid",
      structuredSources: [
        { filters: [{ field: "pricing", operator: "=", value: "free" }] }
      ]
    }
  },
  {
    name: "Comparison query",
    query: "Cursor alternative but cheaper",
    expectedIntent: {
      primaryGoal: "find",
      referenceTool: "Cursor IDE",
      comparisonMode: "alternative_to",
      constraints: ["cheaper"]
    },
    expectedPlan: {
      strategy: "hybrid",
      vectorSources: [
        { queryVectorSource: "reference_tool_embedding" }
      ]
    }
  },
  {
    name: "Head-to-head comparison",
    query: "Amazon Q vs GitHub Copilot",
    expectedIntent: {
      primaryGoal: "compare",
      referenceTool: "Amazon Q",
      comparisonMode: "vs"
    }
  }
];
```

---

## 🔍 Discovery Tasks (Before Implementation)

**Critical**: Identify these before starting:

1. **LLM Client**: 
   - What library is used? (OpenAI SDK, Anthropic SDK, custom?)
   - Where is it configured?
   - What model name/endpoint should be used?

2. **Database Clients**:
   - How is Qdrant client initialized?
   - How is MongoDB client initialized?
   - Where are connection configs?

3. **State Structure**:
   - What does current `StateAnnotation` look like?
   - What fields already exist?
   - Are there type conflicts to resolve?

4. **Testing Framework**:
   - Jest, Vitest, or other?
   - Where are existing tests?

5. **Embedding Generation**:
   - How are embeddings currently generated?
   - What model is used?
   - Where is the embedding function?

---

## ✅ Success Criteria

The refactoring is complete when:

1. ✅ All schemas created and validated
2. ✅ All TypeScript types defined
3. ✅ IntentExtractorNode working with LLM
4. ✅ QueryPlannerNode working with LLM
5. ✅ QueryExecutorNode executing against Qdrant + MongoDB
6. ✅ Fusion utilities implemented
7. ✅ State definition updated
8. ✅ Old pipeline archived
9. ✅ Tests passing for all query types
10. ✅ End-to-end pipeline working: Query → Intent → Plan → Candidates

---

## 🚨 Important Notes

### Architecture Benefits
- **3 nodes vs 13 nodes**: Dramatically simpler
- **LLM-first**: Natural language understanding for intent and planning
- **Schema-driven**: Validated, typed, auditable
- **Hybrid retrieval**: Best of vector + structured search
- **Maintainable**: Easy to extend with new intents or data sources

### Self-Hosted LLM Configuration
- Configure the LLM endpoint for your self-hosted model
- Adjust function calling syntax based on your model's API
- Consider using smaller models (7B-13B) if response quality is acceptable

### Backward Compatibility
- Keep archived nodes until production validation
- Downstream nodes may need updates to consume new state structure
- Document any breaking changes in state schema

### Incremental Testing
- Test each node independently before integration
- Validate schema conformance at each step
- Log intermediate outputs for debugging

---

## 📞 Questions for Human Review

During implementation, you may need clarification on:

1. Which LLM model/endpoint to use for self-hosted deployment?
2. Should we add any domain-specific features to the enum lists?
3. Are there existing utility functions we should reuse?
4. What's the expected behavior for ambiguous queries?
5. Should we add caching for repeated queries?

---

## 🎓 Expected Outcomes

After this refactoring:
- **Codebase complexity**: Reduced by ~80%
- **Maintainability**: Dramatically improved
- **Extensibility**: Add new intents by updating schemas + prompts
- **Debuggability**: Clear data flow with schema validation at each step
- **Performance**: Similar or better (fewer processing steps)
- **Code quality**: Modern, production-ready agentic architecture

---

## 🚀 Implementation Order

Follow this sequence for smooth refactoring:

1. Create all schemas (15 min)
2. Create all types (10 min)
3. Implement IntentExtractorNode (2-3 hours)
4. Implement QueryPlannerNode (2-3 hours)
5. Implement QueryExecutorNode (3-4 hours)
6. Create fusion utilities (1-2 hours)
7. Update state definition (30 min)
8. Simplify orchestrator (30 min)
9. Archive old nodes (10 min)
10. Create and run tests (2-3 hours)

**Total estimated time: 1-2 days**

Good luck with the refactoring! �
