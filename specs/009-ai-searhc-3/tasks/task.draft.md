# Task List and File Structure

## Project Structure

```
src/
├── config/
│   ├── database.ts
│   ├── models.ts
│   └── constants.ts
├── types/
│   ├── state.ts
│   ├── intent.ts
│   └── plan.ts
├── services/
│   ├── embedding.service.ts
│   ├── mongodb.service.ts
│   └── qdrant.service.ts
├── nodes/
│   ├── preprocessing/
│   │   └── query-preprocessor.node.ts
│   ├── extraction/
│   │   ├── semantic-prefilter.node.ts
│   │   ├── zero-shot-classifier.node.ts
│   │   ├── score-combiner.node.ts
│   │   ├── ner-extractor.node.ts
│   │   ├── fuzzy-matcher.node.ts
│   │   ├── name-resolver.node.ts
│   │   ├── comparative-detector.node.ts
│   │   ├── reference-extractor.node.ts
│   │   ├── price-extractor.node.ts
│   │   ├── interface-detector.node.ts
│   │   ├── deployment-detector.node.ts
│   │   └── intent-synthesizer.node.ts
│   ├── routing/
│   │   ├── confidence-evaluator.node.ts
│   │   └── quality-evaluator.node.ts
│   ├── planning/
│   │   ├── optimal-planner.node.ts
│   │   ├── multi-strategy-planner.node.ts
│   │   ├── fallback-planner.node.ts
│   │   ├── plan-validator.node.ts
│   │   ├── refinement-planner.node.ts
│   │   └── expansion-planner.node.ts
│   ├── execution/
│   │   ├── single-plan-executor.node.ts
│   │   ├── multi-strategy-executor.node.ts
│   │   ├── result-merger.node.ts
│   │   └── completion.node.ts
│   └── functions/
│       ├── lookup-by-name.ts
│       ├── semantic-search.ts
│       ├── filter-by-price.ts
│       ├── filter-by-category.ts
│       ├── filter-by-interface.ts
│       ├── filter-by-functionality.ts
│       ├── filter-by-user-type.ts
│       ├── filter-by-deployment.ts
│       ├── find-similar-by-features.ts
│       ├── exclude-tools.ts
│       ├── merge-and-dedupe.ts
│       └── rank-by-relevance.ts
├── routers/
│   ├── confidence.router.ts
│   ├── execution.router.ts
│   └── quality.router.ts
├── graphs/
│   ├── intent-extraction.graph.ts
│   ├── query-planning.graph.ts
│   ├── execution.graph.ts
│   └── main.graph.ts
├── utils/
│   ├── cosine-similarity.ts
│   ├── embedding-cache.ts
│   └── pattern-matchers.ts
└── index.ts
```

---

## Task Breakdown

### Phase 1: Foundation (5 tasks)

**Task 1.1: Project Setup**
- Initialize TypeScript Node.js project
- Install dependencies: `@langchain/langgraph`, MongoDB driver, Qdrant client, Ollama client
- Configure tsconfig.json
- Files: `package.json`, `tsconfig.json`

**Task 1.2: Type Definitions**
- Define State schema with all fields
- Define Intent structure
- Define Plan structure
- Define Confidence structure
- Files: `types/state.ts`, `types/intent.ts`, `types/plan.ts`

**Task 1.3: Configuration**
- Database connection configs
- Model names and endpoints
- Confidence thresholds
- Enum value definitions (categories, functionality, etc.)
- Files: `config/database.ts`, `config/models.ts`, `config/constants.ts`

**Task 1.4: Service Layer**
- Embedding service (Ollama integration)
- MongoDB service (connection and basic queries)
- Qdrant service (vector search operations)
- Files: `services/embedding.service.ts`, `services/mongodb.service.ts`, `services/qdrant.service.ts`

**Task 1.5: Utility Functions**
- Cosine similarity calculation
- Embedding cache management
- Pattern matching helpers (regex for price, interface, etc.)
- Files: `utils/cosine-similarity.ts`, `utils/embedding-cache.ts`, `utils/pattern-matchers.ts`

---

### Phase 2: Search Functions (12 tasks)

**Task 2.1: lookupByName**
- Implement exact and fuzzy name matching
- File: `nodes/functions/lookup-by-name.ts`

**Task 2.2: semanticSearch**
- Embed query, search Qdrant, fetch from MongoDB
- File: `nodes/functions/semantic-search.ts`

**Task 2.3: filterByPrice**
- Filter by hasFreeTier, price range, pricing model
- File: `nodes/functions/filter-by-price.ts`

**Task 2.4: filterByCategory**
- Filter by categories array
- File: `nodes/functions/filter-by-category.ts`

**Task 2.5: filterByInterface**
- Filter by interface array
- File: `nodes/functions/filter-by-interface.ts`

**Task 2.6: filterByFunctionality**
- Filter by functionality array
- File: `nodes/functions/filter-by-functionality.ts`

**Task 2.7: filterByUserType**
- Filter by userTypes array
- File: `nodes/functions/filter-by-user-type.ts`

**Task 2.8: filterByDeployment**
- Filter by deployment array
- File: `nodes/functions/filter-by-deployment.ts`

**Task 2.9: findSimilarByFeatures**
- Get reference tool embedding, search similar in Qdrant
- File: `nodes/functions/find-similar-by-features.ts`

**Task 2.10: excludeTools**
- Remove specified tool IDs from results
- File: `nodes/functions/exclude-tools.ts`

**Task 2.11: mergeAndDedupe**
- Merge multiple result sets, remove duplicates
- File: `nodes/functions/merge-and-dedupe.ts`

**Task 2.12: rankByRelevance**
- Re-rank results by semantic similarity to original query
- File: `nodes/functions/rank-by-relevance.ts`

---

### Phase 3: Intent Extraction Nodes (13 tasks)

**Task 3.1: Query Preprocessor**
- Normalize text, expand abbreviations
- File: `nodes/preprocessing/query-preprocessor.node.ts`

**Task 3.2: Semantic Pre-filter**
- Embed query, compare to enum embeddings, select top-K candidates
- File: `nodes/extraction/semantic-prefilter.node.ts`

**Task 3.3: Zero-Shot Classifier**
- Classify query against filtered candidates
- File: `nodes/extraction/zero-shot-classifier.node.ts`

**Task 3.4: Score Combiner**
- Combine semantic and classification scores
- File: `nodes/extraction/score-combiner.node.ts`

**Task 3.5: NER Extractor**
- Extract tool names using NER or simple pattern matching
- File: `nodes/extraction/ner-extractor.node.ts`

**Task 3.6: Fuzzy Matcher**
- Match query terms to known tool names
- File: `nodes/extraction/fuzzy-matcher.node.ts`

**Task 3.7: Name Resolver**
- Resolve conflicts between NER and fuzzy matching
- File: `nodes/extraction/name-resolver.node.ts`

**Task 3.8: Comparative Detector**
- Detect comparative patterns using sentence similarity
- File: `nodes/extraction/comparative-detector.node.ts`

**Task 3.9: Reference Extractor**
- Extract reference tool name from comparative query
- File: `nodes/extraction/reference-extractor.node.ts`

**Task 3.10: Price Extractor**
- Extract price constraints using pattern matching
- File: `nodes/extraction/price-extractor.node.ts`

**Task 3.11: Interface Detector**
- Detect interface preferences
- File: `nodes/extraction/interface-detector.node.ts`

**Task 3.12: Deployment Detector**
- Detect deployment preferences
- File: `nodes/extraction/deployment-detector.node.ts`

**Task 3.13: Intent Synthesizer**
- Use LLM to synthesize all signals into unified intent with confidence
- File: `nodes/extraction/intent-synthesizer.node.ts`

---

### Phase 4: Routing Nodes (2 tasks)

**Task 4.1: Confidence Evaluator**
- Calculate overall confidence and add routing decision
- File: `nodes/routing/confidence-evaluator.node.ts`

**Task 4.2: Quality Evaluator**
- Evaluate result count and relevance, decide refine/expand/accept
- File: `nodes/routing/quality-evaluator.node.ts`

---

### Phase 5: Planning Nodes (6 tasks)

**Task 5.1: Optimal Planner**
- Generate single execution plan for high-confidence queries
- File: `nodes/planning/optimal-planner.node.ts`

**Task 5.2: Multi-Strategy Planner**
- Generate multiple alternative plans for medium-confidence queries
- File: `nodes/planning/multi-strategy-planner.node.ts`

**Task 5.3: Fallback Planner**
- Generate broad semantic search plan for low-confidence queries
- File: `nodes/planning/fallback-planner.node.ts`

**Task 5.4: Plan Validator**
- Validate plan structure and referenced functions
- File: `nodes/planning/plan-validator.node.ts`

**Task 5.5: Refinement Planner**
- Generate plan to narrow results when too many found
- File: `nodes/planning/refinement-planner.node.ts`

**Task 5.6: Expansion Planner**
- Generate plan to broaden search when too few results
- File: `nodes/planning/expansion-planner.node.ts`

---

### Phase 6: Execution Nodes (4 tasks)

**Task 6.1: Single Plan Executor**
- Execute plan step-by-step, manage dependencies
- File: `nodes/execution/single-plan-executor.node.ts`

**Task 6.2: Multi-Strategy Executor**
- Execute multiple strategy plans in parallel
- File: `nodes/execution/multi-strategy-executor.node.ts`

**Task 6.3: Result Merger**
- Merge results from multiple strategies with weights
- File: `nodes/execution/result-merger.node.ts`

**Task 6.4: Completion**
- Format final results and add explanations
- File: `nodes/execution/completion.node.ts`

---

### Phase 7: Routers (3 tasks)

**Task 7.1: Confidence Router**
- Route based on confidence score to optimal/multi-strategy/fallback
- File: `routers/confidence.router.ts`

**Task 7.2: Execution Router**
- Route to single-plan or multi-strategy executor
- File: `routers/execution.router.ts`

**Task 7.3: Quality Router**
- Route based on result quality to refine/expand/complete
- File: `routers/quality.router.ts`

---

### Phase 8: Graph Assembly (4 tasks)

**Task 8.1: Intent Extraction Graph**
- Assemble all extraction nodes into subgraph
- Define parallel branches and convergence points
- File: `graphs/intent-extraction.graph.ts`

**Task 8.2: Query Planning Graph**
- Assemble planner nodes with conditional routing
- File: `graphs/query-planning.graph.ts`

**Task 8.3: Execution Graph**
- Assemble executor nodes with refinement/expansion cycles
- File: `graphs/execution.graph.ts`

**Task 8.4: Main Graph**
- Compose all subgraphs into complete pipeline
- Configure checkpointing
- File: `graphs/main.graph.ts`

---

### Phase 9: Entry Point & Testing (2 tasks)

**Task 9.1: Main Entry Point**
- Create function to invoke graph with query
- Handle state initialization
- Return final results
- File: `index.ts`

**Task 9.2: Setup Script**
- Pre-compute and cache enum embeddings
- Initialize database connections
- Validate configuration
- File: `setup.ts`

---

## Total: 56 tasks, 53 files

**Estimated complexity:**
- Phase 1 (Foundation): 2-3 days
- Phase 2 (Search Functions): 3-4 days
- Phase 3 (Intent Extraction): 4-5 days
- Phase 4 (Routing): 1 day
- Phase 5 (Planning): 2-3 days
- Phase 6 (Execution): 2-3 days
- Phase 7 (Routers): 1 day
- Phase 8 (Graph Assembly): 2-3 days
- Phase 9 (Entry Point): 1 day

**Total estimated time:** 18-25 days for complete implementation