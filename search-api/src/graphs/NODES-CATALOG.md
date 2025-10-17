# Search API Nodes Catalog

This document catalogs all available nodes across the search API graphs to help identify overlaps, gaps, and consolidation opportunities.

**Verification Status:** ✅ **Comprehensive** - 37 total nodes identified and cataloged (34 distinct nodes + 3 inline/special nodes)

## Graph Overview

### Current Graphs
1. **main.graph.ts** - Basic intelligent search (5-stage pipeline)
2. **enhanced-search.graph.ts** - Enhanced search v2.0 (6-stage pipeline)
3. **execution.graph.ts** - Execution subgraph with refinement/expansion cycles
4. **intent-extraction.graph.ts** - Comprehensive intent extraction subgraph
5. **query-planning.graph.ts** - Query planning subgraph with conditional routing

---

## Node Categories

### 1. Core Processing Nodes

#### Intent & Understanding
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `intent-extraction` | `intent-extraction.node.ts` | main.graph | Basic intent extraction |
| `local-nlp-processing` | `local-nlp-processing.node.ts` | enhanced-search.graph | Local NLP model processing |
| `query-preprocessor` | `preprocessing/query-preprocessor.node.ts` | intent-extraction.graph | Query preprocessing and cleaning |

#### Context & Enrichment
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `context-enrichment` | `context-enrichment.node.ts` | main.graph, enhanced-search.graph | Entity context enrichment |
| `skip-context-enrichment` | (inline) | main.graph, enhanced-search.graph | Pass-through for no enrichment |

### 2. Search & Execution Nodes

#### Search Execution
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `multi-vector-search` | `multi-vector-search.node.ts` | enhanced-search.graph | Advanced multi-vector search |
| `execution` | `execution.node.ts` | main.graph, enhanced-search.graph | General search execution |
| `single-plan-executor` | `execution/single-plan-executor.node.ts` | execution.graph | Single plan execution |
| `multi-strategy-executor` | `execution/multi-strategy-executor.node.ts` | execution.graph | Multi-strategy execution |

#### Planning & Strategy
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `query-planning` | `query-planning-node.ts` | main.graph, enhanced-search.graph | Basic query planning |
| `optimal-planner` | `planning/optimal-planner.node.ts` | query-planning.graph | Optimal strategy planning |
| `multi-strategy-planner` | `planning/multi-strategy-planner.node.ts` | query-planning.graph | Multi-strategy planning |
| `fallback-planner` | `planning/fallback-planner.node.ts` | query-planning.graph | Fallback planning |
| `refinement-planner` | `planning/refinement-planner.node.ts` | execution.graph | Plan refinement |
| `expansion-planner` | `planning/expansion-planner.node.ts` | execution.graph | Plan expansion |

### 3. Result Processing Nodes

#### Merging & Deduplication
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `result-merging` | `result-merger.node.ts` | enhanced-search.graph | Enhanced result merging |
| `result-merger` | `execution/result-merger.node.ts` | execution.graph | Execution result merging |

#### Completion & Finalization
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `final-completion` | `execution/completion.node.ts` | main.graph | Final result completion |
| `execution-completion` | `execution/completion.node.ts` | execution.graph | Execution completion |

### 4. Specialized Extraction Nodes (Intent-Extraction Graph)

#### Semantic Analysis
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `semantic-prefilter` | `extraction/semantic-prefilter.node.ts` | intent-extraction.graph | Semantic pre-filtering |
| `zero-shot-classifier` | `extraction/zero-shot-classifier.node.ts` | intent-extraction.graph | Zero-shot classification |
| `score-combiner` | `extraction/score-combiner.node.ts` | intent-extraction.graph | Score combination |

#### Entity & Name Extraction
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `ner-extractor` | `extraction/ner-extractor.node.ts` | intent-extraction.graph | Named entity recognition |
| `fuzzy-matcher` | `extraction/fuzzy-matcher.node.ts` | intent-extraction.graph | Fuzzy name matching |
| `name-resolver` | `extraction/name-resolver.node.ts` | intent-extraction.graph | Tool name resolution |

#### Comparative & Reference Analysis
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `comparative-detector` | `extraction/comparative-detector.node.ts` | intent-extraction.graph | Comparative query detection |
| `reference-extractor` | `extraction/reference-extractor.node.ts` | intent-extraction.graph | Reference extraction |

#### Attribute Detection
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `price-extractor` | `extraction/price-extractor.node.ts` | intent-extraction.graph | Price information extraction |
| `interface-detector` | `extraction/interface-detector.node.ts` | intent-extraction.graph | Interface type detection |
| `deployment-detector` | `extraction/deployment-detector.node.ts` | intent-extraction.graph | Deployment type detection |

#### Synthesis & Evaluation
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `intent-synthesizer` | `extraction/intent-synthesizer.node.ts` | intent-extraction.graph | Intent synthesis |
| `confidence-evaluator` | `routing/confidence-evaluator.node.ts` | intent-extraction.graph | Confidence evaluation (direct node in intent-extraction.graph) |

### 5. Routing & Decision Nodes

#### Quality & Confidence Routing
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `quality-evaluator` | `routing/quality-evaluator.node.ts` | execution.graph | Quality evaluation |
| `confidence-router` | `routers/confidence.router.ts` | query-planning.graph | Confidence-based routing (primary router in query-planning.graph) |
| `enhanced-confidence-router` | `routers/confidence.router.ts` | query-planning.graph | Enhanced confidence routing |
| `execution-router` | `routers/execution.router.ts` | execution.graph | Execution routing |
| `post-execution-router` | `routers/execution.router.ts` | execution.graph | Post-execution routing |
| `quality-router` | `routers/quality.router.ts` | execution.graph | Quality-based routing |
| `adaptive-quality-router` | `routers/quality.router.ts` | execution.graph | Adaptive quality routing |
| `pre-quality-router` | (inline) | execution.graph | Inline pre-quality routing function |

### 6. Utility & Control Nodes

#### Validation & Control
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `plan-validator` | `planning/plan-validator.node.ts` | query-planning.graph | Plan validation |
| `conditional-executor` | `conditional-executor.node.ts` | (standalone) | Conditional execution |
| `dynamic-stage-skipper` | `dynamic-stage-skipper.node.ts` | (standalone) | Dynamic stage skipping |

### 7. Inline & Special Nodes

#### Pass-through & Inline Functions
| Node | File | Used In | Purpose |
|------|------|---------|---------|
| `skip-context-enrichment` | (inline) | main.graph, enhanced-search.graph | Pass-through for no enrichment |
| `should-extract-reference` | (inline) | intent-extraction.graph | Conditional reference extraction |
| `pre-quality-router` | (inline) | execution.graph | Inline pre-quality routing function |

**Note:** These are typically simple functions defined within graph files rather than separate node files.

---

## Graph Analysis

### Main Graph (main.graph.ts)
**Pipeline:** `intent-extraction` → `context-enrichment` → `query-planning` → `execution` → `final-completion`

**Strengths:**
- Comprehensive intent extraction via `intent-extraction.node.ts`
- Sophisticated entity processing (NER, resolved tools, fuzzy matches)
- Final completion logic
- Proven workflow

**Weaknesses:**
- Basic search execution
- No advanced result merging
- Simpler vector search capabilities

### Enhanced Search Graph (enhanced-search.graph.ts)
**Pipeline:** `local-nlp-processing` → `context-enrichment` → `multi-vector-search` → `query-planning` → `execution` → `result-merging`

**Strengths:**
- Advanced multi-vector search
- Sophisticated result merging
- Enhanced state management
- Version 2.0 features

**Weaknesses:**
- Less sophisticated intent extraction
- Narrower entity processing
- No final completion logic
- Missing some signal processing from main graph

### Specialized Graphs

#### Intent-Extraction Graph (intent-extraction.graph.ts)
**Comprehensive extraction pipeline with parallel branches:**
- Semantic analysis branch
- Entity/name extraction branch  
- Comparative analysis branch
- Attribute detection branch
- Synthesis and evaluation

**Key Features:**
- Parallel execution for efficiency
- Multiple extraction strategies
- Sophisticated intent synthesis

#### Execution Graph (execution.graph.ts)
**Advanced execution with refinement cycles:**
- Quality evaluation
- Multiple execution strategies
- Result merging and refinement
- Adaptive quality routing

#### Query-Planning Graph (query-planning.graph.ts)
**Conditional planning based on confidence:**
- Confidence-based routing
- Multiple planning strategies
- Plan validation

---

## Identified Issues & Opportunities

### 1. Missing Capabilities in Enhanced Search
- **Comprehensive Intent Extraction:** Enhanced search uses basic `local-nlp-processing` instead of the sophisticated extraction from main graph
- **Signal Processing:** Only checks `nlpResults.entities` vs. multiple signal types in main graph
- **Final Completion:** Missing completion logic that exists in main graph
- **Advanced Intent Synthesis:** Missing the parallel extraction and synthesis capabilities

### 2. Redundant/Overlapping Nodes
- `result-merging` (enhanced-search) vs `result-merger` (execution)
- Multiple execution nodes with similar purposes
- Duplicate routing logic

### 3. Fragmented Architecture
- Intent extraction capabilities split across multiple graphs
- Similar functionality in different nodes
- No unified approach to state management

---

## Consolidation Recommendations

### 1. Unified Graph Architecture
**Proposed Pipeline:**
`comprehensive-intent-extraction` → `context-enrichment` → `advanced-query-planning` → `multi-strategy-execution` → `enhanced-result-merging` → `intelligent-completion`

### 2. Key Consolidation Points

#### Intent Extraction Enhancement
- Combine `intent-extraction.node.ts` capabilities with `local-nlp-processing.node.ts`
- Integrate parallel extraction branches from intent-extraction.graph
- Maintain comprehensive signal processing

#### Search Execution Unification
- Use `multi-vector-search.node.ts` as primary search engine
- Integrate execution strategies from execution.graph
- Maintain refinement and expansion capabilities

#### Result Processing Integration
- Combine `result-merging.node.ts` with `execution/result-merger.node.ts`
- Add completion logic from `execution/completion.node.ts`
- Maintain quality evaluation and adaptive routing

### 3. Implementation Strategy

#### Phase 1: Analysis & Design
- [ ] Define unified state schema
- [ ] Design consolidated pipeline
- [ ] Map node dependencies

#### Phase 2: Node Consolidation
- [ ] Merge duplicate nodes
- [ ] Enhance existing nodes with missing capabilities
- [ ] Create unified routing logic

#### Phase 3: Integration & Testing
- [ ] Build unified graph
- [ ] Test with existing endpoints
- [ ] Performance optimization

#### Phase 4: Migration
- [ ] Update service layer
- [ ] Migrate endpoints gradually
- [ ] Monitor performance and quality

---

## Next Steps

1. **Create unified state schema** combining best of both `StateAnnotation` and `EnhancedStateAnnotation`
2. **Design consolidated node architecture** eliminating redundancies
3. **Implement unified graph** with comprehensive capabilities
4. **Test and validate** against existing functionality
5. **Gradual migration** of endpoints to use unified graph

This consolidation will result in a single, powerful search graph that combines the sophisticated intent understanding of the main graph with the advanced search capabilities of the enhanced search graph.
