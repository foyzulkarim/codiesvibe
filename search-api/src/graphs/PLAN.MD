# AI-Agentic-Search-Architecture.md

---

## 1 — Executive Summary

**Purpose:** Design an agentic search architecture for discovering and recommending AI tools & technologies (IDEs, SDKs, CLIs, agents, etc.).
**Primary goals:** maximize search quality, traceability, and extensibility while keeping top-level graph surface minimal and auditable.
**Key components:**

* `Policy Graph` — orchestration & quality budgeting
* `Intent Understanding Graph` — schema-anchored intent parsing (domain-aware)
* `Adaptive Retrieval Graph` — hybrid retrieval (Qdrant + MongoDB + APIs) + reranking
* `Quality Feedback Graph` — synthesis, factuality checks, and iterative refinement

This document contains: diagrams of graphs & dataflow, node inventory & purposes, the UnifiedState schema, a LangGraph-style workflow skeleton, and TypeScript node stubs (no implementation).

Canonical specs referenced:
- `UNIFIED-STATE-SPEC.md` — canonical runtime envelope and observability contract
- `states-docs/intent.md` — IntentState JSON Schema and extraction contract
- `states-docs/query-planner.md` — QueryPlan JSON Schema and planner contract
- `states-docs/query-executor.md` — QueryExecutor Output Schema and execution semantics

Validation: all node inputs/outputs MUST validate against these schemas via Ajv. Routers and deterministic boundaries MUST reference these contracts explicitly.

---

## 2 — System Overview Diagram

```mermaid
flowchart TD
  U[User Query] --> P[Policy Graph]
  subgraph Policy[Policy Graph 🧭]
    PR[Policy Router]
    PB[Budget & Quality Controller]
    PF[Feedback Loop]
    PR --> PB --> PF
  end
  P --> I[Intent Understanding Graph]
  subgraph Intent[Intent Understanding Graph 🧠]
    IE[Intent Extractor]
    SE[Semantic Expander]
    ER[Entity Resolver]
    FE[Feature Extractor]
    PN[Pricing Normalizer]
    CI[Comparative Intent]
    AE[Attribute Extractor]
    CA[Confidence Aggregator]
    IS[Intent Synthesizer]
    IE --> SE --> ER --> FE --> PN --> CI --> AE --> CA --> IS
  end
  I --> R[Adaptive Retrieval Graph]
  subgraph Retrieval[Adaptive Retrieval Graph ⚙️]
    QP[Query Planner]
    QE[Query Executor]
    RM[Result Merger]
    RR[Reranker (Cross-Encoder / LTR)]
    CE[Context Enrichment]
    SP[Synthesis Preparation]
    QP --> QE --> RM --> RR --> CE --> SP
  end
  R --> Q[Quality Feedback Graph]
  subgraph Quality[Quality Feedback Graph 🔍]
    AS[Answer Synthesizer]
    FC[Factual Consistency Evaluator]
    QS[Quality Scorer]
    IS2[Improvement Strategist]
    FP[Feedback Propagator]
    AS --> FC --> QS --> IS2 --> FP
  end
  Q --> P
  Q --> O[Final Answer]
```

---

## 3 — Graph & Node Inventory

Top-level graphs and their nodes with concise purpose descriptions.

### Policy Graph (`policy-master.graph`)

* **Policy Router** — Selects which subgraphs and node-modes to run (rules or learned policy).
* **Budget & Quality Controller** — Enforces max cycles, time budget, and final quality thresholds.
* **Feedback Loop Node** — Receives `QualityReport` and decides whether to trigger replan/refinement.

### Intent Understanding Graph (`intent-understanding.graph`)

* **Intent Extractor** — Classifies `primaryGoal` (find / compare / recommend / explore) and reasoning style.
* **Semantic Expander** — Produces paraphrases / keywords / auxiliary embeddings for recall.
* **Entity Resolver** — Maps textual mentions to canonical tool IDs (uses MongoDB / ontology).
* **Feature Extractor** — Extracts capability tags (e.g., “AI code assist”, “local inference”, “CLI”).
* **Pricing Normalizer** — Normalizes natural pricing language (“cheaper”, “free”, “freemium”) into structured filters.
* **Comparative Intent Node** — Detects comparison semantics and constructs reference relationships.
* **Attribute Extractor** — Extracts structured filters (category, platform, date, license).
* **Confidence Aggregator** — Aggregates per-node confidences into a unified score.
* **Intent Synthesizer** — Produces final `IntentState` JSON.

### Adaptive Retrieval Graph (`adaptive-retrieval.graph`)

* **Query Planner** — Maps `IntentState` → retrieval plan (which vector/indexes, filters, topK, rerank strategy).
* **Query Executor** — Executes parallel retrievals (Qdrant vectors, MongoDB filters, API lookups).
* **Result Merger** — Normalizes scores, performs Reciprocal Rank Fusion, and prepares candidate pool.
* **Cross-Encoder Reranker** — High-quality neural re-ranking on top N candidates.
* **Context Enrichment** — Adds metadata, KG context, or summaries for the top results.
* **Synthesis Preparation** — Prepares provenance-rich snippets for the synthesizer.

### Quality Feedback Graph (`quality-feedback.graph`)

* **Answer Synthesizer** — Produces the final natural-language answer, including provenance citations.
* **Factual Consistency Evaluator** — Checks factual claims against retrieved evidence.
* **Quality Scorer** — Computes composite metrics (relevance, factuality, coverage).
* **Improvement Strategist** — Generates replan suggestions or decides to accept.
* **Feedback Propagator** — Sends structured signals back to policy & training datasets.

---

## 4 — Unified State Schema (data flow object)

All nodes accept and return a `UnifiedState` object. Below is the recommended high-level shape (descriptive, not code-heavy).

`UnifiedState` fields and purpose:

* `request`

  * `id`: unique request id
  * `query`: original user query string
  * `userContext?`: optional user/profile info

* `intentState`

  * `primaryGoal`: enum `find|compare|recommend|explore|analyze`
  * `referenceTool?`: canonical ID if comparison or reference-based
  * `desiredFeatures?`: list of canonical feature tags
  * `filters?`: array of `{field, operator, value}` (pricing, category, platform)
  * `comparisonMode?`: enum `similar_to|vs|alternative_to`
  * `semanticVariants?`: list of paraphrases/embedding seeds
  * `confidence`: float 0..1

* `executionPlan`

  * `strategy`: enum `multi-vector|hybrid|lexical|kg-api`
  * `candidateSources`: array of `{source, params, expectedTopK}`
  * `maxRefinementCycles`: integer

* `candidates?:` array of candidate objects

  * each candidate: `{id, source, score, metadata, embedding?, provenance:[{node, step, span}]}`

* `mergedResults?:` array after merger + rerank

  * includes final ordering and fused scores

* `synthesis?:`

  * `answerText`, `provenance`, `confidence`

* `qualityMetrics?:`

  * `intentConfidence`, `recall_at_k`, `ndcg`, `factualityScore`, `finalQualityScore`

* `trace?:`

  * per-node timing, logs, and decision rationales

---

## 5 — LangGraph Workflow Snapshot (pseudo TypeScript outline)

A minimal sketch of how the LangGraph workflow creation might look. This shows the graph, node wiring, and data flow — *no implementation details inside nodes*.

```ts
// PSEUDO / SKETCH (LangGraph-style)
// Purpose: show top-level nodes, edges, and order

const graph = new Graph({ name: "AI-Search-Agent" });

// Intent graph
graph.addNode("intentExtractor", new IntentExtractorNode());
graph.addNode("semanticExpander", new SemanticExpanderNode());
graph.addNode("entityResolver", new EntityResolverNode());
graph.addNode("featureExtractor", new FeatureExtractorNode());
graph.addNode("pricingNormalizer", new PricingNormalizerNode());
graph.addNode("comparativeIntent", new ComparativeIntentNode());
graph.addNode("attributeExtractor", new AttributeExtractorNode());
graph.addNode("confidenceAggregator", new ConfidenceAggregatorNode());
graph.addNode("intentSynthesizer", new IntentSynthesizerNode());

// Retrieval graph
graph.addNode("queryPlanner", new QueryPlannerNode());
graph.addNode("queryExecutor", new QueryExecutorNode());
graph.addNode("resultMerger", new ResultMergerNode());
graph.addNode("reranker", new CrossEncoderRerankerNode());
graph.addNode("contextEnricher", new ContextEnrichmentNode());
graph.addNode("synthesisPrep", new SynthesisPreparationNode());

// Quality graph
graph.addNode("answerSynthesizer", new AnswerSynthesizerNode());
graph.addNode("factualEvaluator", new FactualConsistencyEvaluatorNode());
graph.addNode("qualityScorer", new QualityScorerNode());
graph.addNode("improvementStrategist", new ImprovementStrategistNode());
graph.addNode("feedbackPropagator", new FeedbackPropagatorNode());

// Policy & orchestration
graph.addNode("policyRouter", new PolicyRouterNode());
graph.addNode("budgetController", new BudgetControllerNode());

// Example edges (conceptual)
graph.addEdge("policyRouter", "intentExtractor");
graph.addEdge("intentSynthesizer", "queryPlanner");
graph.addEdge("queryPlanner", "queryExecutor");
graph.addEdge("queryExecutor", "resultMerger");
graph.addEdge("resultMerger", "reranker");
graph.addEdge("reranker", "contextEnricher");
graph.addEdge("contextEnricher", "synthesisPrep");
graph.addEdge("synthesisPrep", "answerSynthesizer");
graph.addEdge("answerSynthesizer", "factualEvaluator");
graph.addEdge("factualEvaluator", "qualityScorer");
graph.addEdge("qualityScorer", "improvementStrategist");
graph.addEdge("improvementStrategist", "policyRouter");
```

---

## 6 — TypeScript Node Skeletons (stubs)

Minimal, compile-friendly skeletons to clarify input/output shape and where to extend. These are intentionally empty — only signatures and state passing.

> Note: treat these as *interface contracts* — implementors should accept `UnifiedState` and return `UnifiedState`.

```ts
// types.ts
export type UnifiedState = {
  request: { id: string; query: string; userContext?: any };
  intentState?: any;
  executionPlan?: any;
  candidates?: any[];
  mergedResults?: any[];
  synthesis?: any;
  qualityMetrics?: any;
  trace?: any;
};

// node.ts
export interface Node {
  name: string;
  execute(state: UnifiedState): Promise<UnifiedState>;
}
```

```ts
// intent-nodes.ts (skeletons)
export class IntentExtractorNode implements Node {
  name = "IntentExtractor";
  async execute(state: UnifiedState): Promise<UnifiedState> {
    // TODO: populate intentState.primaryGoal and basic fields
    return state;
  }
}

export class SemanticExpanderNode implements Node {
  name = "SemanticExpander";
  async execute(state: UnifiedState): Promise<UnifiedState> {
    // TODO: add semanticVariants
    return state;
  }
}

export class EntityResolverNode implements Node {
  name = "EntityResolver";
  async execute(state: UnifiedState): Promise<UnifiedState> {
    // TODO: resolve referenceTool -> canonical ID + metadata
    return state;
  }
}

export class FeatureExtractorNode implements Node {
  name = "FeatureExtractor";
  async execute(state: UnifiedState): Promise<UnifiedState> {
    // TODO: populate desiredFeatures
    return state;
  }
}

export class PricingNormalizerNode implements Node {
  name = "PricingNormalizer";
  async execute(state: UnifiedState): Promise<UnifiedState> {
    // TODO: convert "cheaper" => numeric filter
    return state;
  }
}

export class ComparativeIntentNode implements Node {
  name = "ComparativeIntent";
  async execute(state: UnifiedState): Promise<UnifiedState> {
    // TODO: produce comparisonMode and reference relationships
    return state;
  }
}

export class AttributeExtractorNode implements Node {
  name = "AttributeExtractor";
  async execute(state: UnifiedState): Promise<UnifiedState> {
    // TODO: extract structured filters
    return state;
  }
}

export class ConfidenceAggregatorNode implements Node {
  name = "ConfidenceAggregator";
  async execute(state: UnifiedState): Promise<UnifiedState> {
    // TODO: aggregate and set intentState.confidence
    return state;
  }
}

export class IntentSynthesizerNode implements Node {
  name = "IntentSynthesizer";
  async execute(state: UnifiedState): Promise<UnifiedState> {
    // TODO: finalize IntentState
    return state;
  }
}
```

```ts
// retrieval-nodes.ts (skeletons)
export class QueryPlannerNode implements Node { name = "QueryPlanner"; async execute(s: UnifiedState) { return s; } }
export class QueryExecutorNode implements Node { name = "QueryExecutor"; async execute(s: UnifiedState) { return s; } }
export class ResultMergerNode implements Node { name = "ResultMerger"; async execute(s: UnifiedState) { return s; } }
export class CrossEncoderRerankerNode implements Node { name = "CrossEncoderReranker"; async execute(s: UnifiedState) { return s; } }
export class ContextEnrichmentNode implements Node { name = "ContextEnrichment"; async execute(s: UnifiedState) { return s; } }
export class SynthesisPreparationNode implements Node { name = "SynthesisPreparation"; async execute(s: UnifiedState) { return s; } }
```

```ts
// quality-nodes.ts (skeletons)
export class AnswerSynthesizerNode implements Node { name = "AnswerSynthesizer"; async execute(s: UnifiedState) { return s; } }
export class FactualConsistencyEvaluatorNode implements Node { name = "FactualConsistencyEvaluator"; async execute(s: UnifiedState) { return s; } }
export class QualityScorerNode implements Node { name = "QualityScorer"; async execute(s: UnifiedState) { return s; } }
export class ImprovementStrategistNode implements Node { name = "ImprovementStrategist"; async execute(s: UnifiedState) { return s; } }
export class FeedbackPropagatorNode implements Node { name = "FeedbackPropagator"; async execute(s: UnifiedState) { return s; } }
```

```ts
// policy-nodes.ts (skeletons)
export class PolicyRouterNode implements Node { name = "PolicyRouter"; async execute(s: UnifiedState) { return s; } }
export class BudgetControllerNode implements Node { name = "BudgetController"; async execute(s: UnifiedState) { return s; } }
```

---

## 7 — Example Workflow Run (conceptual — "Cursor IDE but cheaper")

1. **User Query**: `"similar of Cursor IDE but cheaper"`

2. **Policy Router**: minimal policy — invoke `Intent Understanding Graph` and `Adaptive Retrieval Graph`.

3. **Intent Graph**

   * `IntentExtractor` → primaryGoal=`find_similar`.
   * `EntityResolver` → referenceTool=`cursor_ide`, fetch cursor metadata (price, category=IDE, features).
   * `FeatureExtractor` → desiredFeatures includes `AI code assist`.
   * `PricingNormalizer` → constraint: `price < cursor.price`.
   * `IntentSynthesizer` → final `IntentState` with confidence ~0.95.

4. **Retrieval Planner**

   * Plan: use Cursor IDE embedding (Qdrant) as vector seed; also execute MongoDB price filter; rerank with cross-encoder.

5. **Query Executor**

   * Qdrant: topK=50 similar to Cursor embedding.
   * MongoDB: filter category=IDE and price < cursor.price.
   * Merge candidate lists.

6. **Result Merger & Rerank**

   * RRF + cross-encoder reranker produces top candidates: `Trae IDE`, `GitHub Copilot`, `LM Studio`.

7. **Context Enrichment**

   * Attach pricing summaries and key feature diffs.

8. **Answer Synthesizer**

   * Output concise answer with reasons & provenance.

9. **Quality Scorer**

   * finalQuality=0.93 → no refinement.

10. **Output** → presents ranked alternatives and short rationale.

---

## 8 — Data & Tooling Integration (how nodes map to infra)

* **Qdrant** — holds item and snippet embeddings (descriptions, feature docs). Queried by `QueryExecutor`.
* **MongoDB** — canonical metadata & ontology (tool IDs, price, license, tags). Used by `EntityResolver`, `PricingNormalizer`, and `QueryExecutor` filters.
* **LLM provider (OpenAI / Gemini / local)** — used in `IntentExtractor`, `SemanticExpander`, `Cross-Encoder` (if using LLM for cross-encoding), `AnswerSynthesizer`. Use function-calling / structured outputs to enforce schema.
* **Feature embedding store** — precomputed embeddings for canonical features (used for `FeatureExtractor` grounding). Could be a small Qdrant collection.
* **LT/Training infra** — store labelled (query, intentState, candidates, humanJudgement) triplets for LTR and policy training.

---

## 9 — Extensibility & Governance Notes

* **Schema evolution**: Keep `IntentState` JSON schema in source control. Add new enums (e.g., `privacy`, `onPrem`) via schema patch + migration.
* **New graphs**: Plug special-purpose graphs (Personalization, Temporal Reasoning, Adversarial Defense) behind `Policy Router`.
* **Auditing**: Persist `UnifiedState.trace` for every request for offline analysis.
* **Human-in-the-loop**: For low-confidence answers, route to human review channel; collect labels for retraining.
* **Policy training**: Log decisions + outcomes to train `Policy Router` (supervised first, RL later).

---

## 10 — Appendix

### Glossary

* **IntentState**: structured representation of the user’s goals and constraints.
* **UnifiedState**: per-request object passed between nodes, containing intent, candidates, merged results, synthesis and traces.
* **Policy Router**: graph-level decision node that selects subgraphs and modes.
* **RRF**: Reciprocal Rank Fusion — simple robust method for merging ranked lists.

### Minimal Ontology Example (JSON excerpt)

```json
{
  "entity_types":["IDE","CLI","API","Framework","Agent"],
  "pricing_tiers":["free","freemium","paid","enterprise"],
  "feature_tags":["AI code assist","local inference","RAG support","multi-agent orchestrator","LLM integration"],
  "platforms":["web","desktop","cli","api"]
}
```

---

## Closing / Next Steps

If you want I can now:

* produce a **compact visual diagram** (SVG/PNG) based on the Mermaid flows for embedding in a README; **or**
* expand the TypeScript skeletons into a small skeleton LangGraph project repo layout with `package.json`, `tsconfig`, and empty node files (no implementations), ready for engineering to pick up; **or**
* draft the **IntentState JSON Schema** and sample prompts / function-calling examples that the `IntentExtractor` should use (structured LLM outputs).

Which of these would you like next?
