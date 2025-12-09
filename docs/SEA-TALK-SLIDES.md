# SEA Talk: Agentic Search - From Research to Production
**30-Minute Talk with Live Demo**

**Speaker**: Foyzul Karim
**Theme**: Bridging IR/NLP Research with Real-world Implementation

---

## Talk Structure (30 minutes)

```
Introduction (2 min)
  ↓
The Problem (3 min) + Quick Demo
  ↓
Architecture Overview (5 min)
  ↓
Live Demo: The 3-Node Pipeline (8 min) ← CORE OF TALK
  ↓
Research → Implementation Lessons (8 min)
  ↓
Challenges & Open Questions (3 min)
  ↓
Q&A (remaining time)
```

---

# SLIDE DECK

## Slide 1: Title
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   AGENTIC SEARCH FOR AI TOOLS DISCOVERY                │
│   From Research Concepts to Production Reality         │
│                                                         │
│   Foyzul Karim                                          │
│   CodiesVibe.com                                        │
│                                                         │
│   Search Engines Amsterdam 2025                         │
│   Agentic Search and Reasoning Session                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Speaker Notes**:
- Introduce yourself briefly
- "Today I'll show you how we built an agentic search system for real users"
- "Focus on what worked, what didn't, and what we learned"

---

## Slide 2: The Challenge

```
┌─────────────────────────────────────────────────────────┐
│  THE PROBLEM: Traditional Search Fails                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Users Ask Natural Questions:                           │
│  ❌ "AI tools for code completion"                     │
│  ❌ "Local code assistants that are free"             │
│  ❌ "Tools like Cursor but cheaper"                    │
│                                                         │
│  Traditional Keyword Search:                            │
│  → Misses semantic meaning                              │
│  → Can't handle comparisons                             │
│  → Ignores constraints (free, local, etc.)             │
│                                                         │
│  Scale:                                                 │
│  • 500+ AI tools                                        │
│  • 50+ attributes per tool                              │
│  • 1000s of queries/day                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Speaker Notes**:
- "This is a real problem we faced at CodiesVibe"
- "Users don't speak database - they speak human"
- **[QUICK DEMO]**: Show traditional keyword search failing

**Demo Script (1 min)**:
1. Search "free AI code tools" on a traditional search
2. Show poor results (misses "free" constraint)
3. Transition: "We needed something better"

---

## Slide 3: Research Concepts We Used

```
┌─────────────────────────────────────────────────────────┐
│  FROM RESEARCH TO PRACTICE                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📚 Research Concept        →    🔨 Our Implementation   │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Query Understanding        →    LLM Intent Extractor   │
│  (NLP, NLU)                                             │
│                                                         │
│  Dense Retrieval            →    Multi-Vector Search    │
│  (BERT, embeddings)              (Qdrant + 4 collections)│
│                                                         │
│  Result Fusion              →    Reciprocal Rank Fusion │
│  (CombMNZ, RRF)                  (RRF with k=60)        │
│                                                         │
│  Hybrid Search              →    Vector + Structured    │
│  (BM25 + Dense)                  (Qdrant + MongoDB)     │
│                                                         │
│  Agentic AI                 →    LangGraph 3-Node       │
│  (ReAct, Chain-of-Thought)       Pipeline               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Speaker Notes**:
- "These are familiar concepts to you as researchers"
- "The challenge: How do you make them work together in production?"
- "Let me show you our architecture"

---

## Slide 4: System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  CODIESVIBE ARCHITECTURE                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    User Query                           │
│                        ↓                                │
│              ┌──────────────────┐                       │
│              │  LangGraph       │                       │
│              │  3-Node Pipeline │                       │
│              └──────────────────┘                       │
│                        ↓                                │
│        ┌───────────────┼───────────────┐               │
│        ↓               ↓               ↓               │
│   ┌────────┐    ┌──────────┐    ┌──────────┐          │
│   │ Intent │ →  │  Query   │ →  │  Query   │          │
│   │Extract │    │ Planner  │    │ Executor │          │
│   └────────┘    └──────────┘    └──────────┘          │
│       ↓              ↓                ↓                │
│      LLM           LLM          ┌─────┴─────┐          │
│                                 ↓           ↓          │
│                            ┌────────┐  ┌────────┐      │
│                            │ Qdrant │  │MongoDB │      │
│                            │Vector  │  │Struct. │      │
│                            └────────┘  └────────┘      │
│                                 ↓           ↓          │
│                            ┌─────────────────┐         │
│                            │  RRF Fusion     │         │
│                            └─────────────────┘         │
│                                    ↓                   │
│                                Results                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Speaker Notes**:
- "Three-stage pipeline: Understand → Plan → Execute"
- "LLM nodes for reasoning, deterministic execution for reliability"
- "Let's see this in action with a live demo"

---

## Slide 5: LIVE DEMO Setup

```
┌─────────────────────────────────────────────────────────┐
│  DEMO: Let's Search Together                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Query: "Free AI code completion tools that work        │
│          locally"                                       │
│                                                         │
│  We'll watch the 3-node pipeline in action:             │
│                                                         │
│  1️⃣  Intent Extraction                                 │
│     What did the LLM understand?                        │
│                                                         │
│  2️⃣  Query Planning                                    │
│     How will we search?                                 │
│                                                         │
│  3️⃣  Execution                                         │
│     What results do we get?                             │
│                                                         │
│  [Enable Debug Mode for visibility]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Speaker Notes**:
- "I've enabled debug mode so we can see inside the pipeline"
- "This is a real query from a real user"
- **[Switch to live demo]**

---

## 🎬 LIVE DEMO SCRIPT (8 minutes)

### Part 1: Intent Extraction (2 min)

**Action**: Enter query and pause after Intent Extractor

**Show on screen**:
```json
{
  "node": "intent-extractor",
  "output": {
    "primaryGoal": "find",
    "category": ["Code Completion", "AI"],
    "deployment": "Local",
    "pricing": "free",
    "desiredFeatures": ["Code Completion", "Local Inference"],
    "confidence": 0.92
  },
  "executionTime": "340ms"
}
```

**Talking points**:
- "The LLM extracted structured intent from natural language"
- "Notice: category, deployment, pricing - all mapped to our schema"
- "Confidence score helps us decide if we need fallback"

**Research → Practice**:
- ✅ Research: Query understanding with LLMs
- 🔨 Practice: Schema-driven extraction with controlled vocabularies
- 💡 Lesson: "Constrain the LLM's output space to reduce hallucinations"

---

### Part 2: Query Planning (3 min)

**Show on screen**:
```json
{
  "node": "query-planner",
  "output": {
    "strategy": "identity-focused",
    "vectorSources": [
      {
        "collection": "tools",
        "embeddingType": "semantic",
        "topK": 20
      },
      {
        "collection": "functionality",
        "embeddingType": "functional",
        "topK": 12
      }
    ],
    "structuredSources": [
      {
        "source": "mongodb",
        "filters": [
          { "field": "pricingSummary.hasFreeTier", "value": true },
          { "field": "deployment", "value": "Local" }
        ],
        "limit": 100
      }
    ],
    "fusion": "rrf",
    "confidence": 0.88,
    "explanation": "Using identity-focused strategy with semantic
                    search on tools collection + functional search
                    on functionality collection. MongoDB filters
                    enforce pricing and deployment constraints."
  },
  "executionTime": "420ms"
}
```

**Talking points**:
- "The planner chose an 'identity-focused' strategy"
- "It selected 2 vector collections + MongoDB structured search"
- "Notice: Different topK values - tools get higher priority"
- "Fusion method: RRF - I'll explain why we chose this"

**Research → Practice**:
- ✅ Research: Federated search, collection selection
- 🔨 Practice: LLM decides which collections to query
- 💡 Lesson: "LLMs are good at strategy, not execution"

**Why RRF? (30 seconds)**:
```
Research Options:
• Weighted Fusion → Requires score normalization (fragile)
• CombMNZ → Sensitive to outliers
• RRF → Scale-invariant, simple, works well

Our Choice: RRF
→ No training data needed
→ Robust across different score types
→ Default parameters work well (k=60)
```

---

### Part 3: Execution (2 min)

**Show on screen**:
```json
{
  "node": "query-executor",
  "parallelQueries": [
    {
      "collection": "tools",
      "results": 20,
      "avgScore": 0.78,
      "time": "45ms"
    },
    {
      "collection": "functionality",
      "results": 12,
      "avgScore": 0.71,
      "time": "38ms"
    },
    {
      "source": "mongodb",
      "results": 8,
      "matchedFilters": ["hasFreeTier=true", "deployment=Local"],
      "time": "12ms"
    }
  ],
  "fusion": {
    "method": "rrf",
    "k": 60,
    "beforeFusion": 40,
    "afterFusion": 10,
    "duplicatesRemoved": 5
  },
  "totalTime": "95ms"
}
```

**Talking points**:
- "Parallel execution - all queries run simultaneously"
- "40 results → RRF fusion → 10 final results"
- "Deduplication removed 5 duplicates"
- "Total execution time: 95ms - much faster than LLM calls"

**Show final results** (scroll through top 3-5)

**Research → Practice**:
- ✅ Research: Multi-source fusion
- 🔨 Practice: Parallel queries + RRF + deduplication
- 💡 Lesson: "Deterministic execution is fast and debuggable"

---

### Part 4: Full Pipeline Timing (1 min)

**Show on screen**:
```
Pipeline Execution Breakdown:
┌─────────────────────┬──────────┬─────────┐
│ Node                │ Time     │ % Total │
├─────────────────────┼──────────┼─────────┤
│ Intent Extractor    │  340ms   │  39%    │
│ Query Planner       │  420ms   │  48%    │
│ Query Executor      │   95ms   │  11%    │
│ Other (overhead)    │   20ms   │   2%    │
├─────────────────────┼──────────┼─────────┤
│ TOTAL               │  875ms   │ 100%    │
└─────────────────────┴──────────┴─────────┘

Bottleneck: LLM calls (87% of time)
```

**Talking points**:
- "LLM nodes take 87% of the time"
- "This is why we added caching - let me show you"

---

### Part 5: Cache Demo (1 min)

**Action**: Run the SAME query again

**Show on screen**:
```json
{
  "cacheHit": true,
  "cacheSimilarity": 1.0,
  "skippedNodes": ["intent-extractor", "query-planner"],
  "executionPath": ["cache-check", "query-executor", "cache-store"],
  "timing": {
    "cacheCheck": "15ms",
    "queryExecutor": "92ms",
    "total": "107ms"
  },
  "savings": {
    "timeReduction": "88%",
    "llmCallsAvoided": 2,
    "estimatedCostSaved": "$0.0004"
  }
}
```

**Talking points**:
- "Cache hit! Query executed in 107ms vs 875ms"
- "88% faster, avoided 2 LLM calls"
- "In production, 70% cache hit rate → massive cost savings"

**Research → Practice**:
- ✅ Research: Query similarity, semantic caching
- 🔨 Practice: Vector-based cache lookup in MongoDB
- 💡 Lesson: "Caching is essential for LLM-based systems in production"

**[End of Demo - Return to Slides]**

---

## Slide 6: Research → Implementation Lessons

```
┌─────────────────────────────────────────────────────────┐
│  WHAT WE LEARNED: 5 KEY LESSONS                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1️⃣  SCHEMA-DRIVEN DESIGN                              │
│     Research: Controlled vocabularies, ontologies       │
│     Practice: DomainSchema as configuration             │
│     Lesson: "Make domain knowledge explicit and         │
│              portable"                                  │
│                                                         │
│  2️⃣  HYBRID IS BETTER THAN PURE                        │
│     Research: Dense retrieval vs sparse retrieval       │
│     Practice: Vector search + structured filters        │
│     Lesson: "Don't choose - combine strengths"          │
│                                                         │
│  3️⃣  LLMS FOR REASONING, NOT RETRIEVAL                 │
│     Research: LLMs can do everything                    │
│     Practice: LLMs understand, databases retrieve       │
│     Lesson: "Use the right tool for the job"            │
│                                                         │
│  4️⃣  CACHING IS NOT OPTIONAL                           │
│     Research: Query optimization, materialization       │
│     Practice: Semantic cache with vector similarity     │
│     Lesson: "Production systems need speed AND quality" │
│                                                         │
│  5️⃣  DATA SYNC IS HARDER THAN IT LOOKS                 │
│     Research: "Just index your vectors"                 │
│     Practice: MongoDB→Qdrant smart sync + retry logic   │
│     Lesson: "Two databases = synchronization problem"   │
│                                                         │
│  6️⃣  INTERPRETABILITY > BLACK BOX                      │
│     Research: Explainable AI, model transparency        │
│     Practice: 3-node pipeline with visible outputs      │
│     Lesson: "Debugging requires observability"          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Speaker Notes** (spend 1-2 min on each lesson):

### Lesson 1: Schema-Driven Design (1.5 min)

"Let me show you what I mean by schema-driven..."

**Show code snippet**:
```typescript
// Before: Hardcoded in prompts (bad)
const prompt = `
  Categories: AI, Code Editor, IDE, Chatbot, ...
  Features: Code Generation, Debugging, ...
`;

// After: Schema configuration (good)
const toolsSchema = {
  vocabularies: {
    categories: ['AI', 'Code Editor', 'IDE', ...],
    functionality: ['Code Generation', 'Debugging', ...]
  }
};

// Prompts generated dynamically
const prompt = generatePrompt(toolsSchema);
```

**Why this matters**:
- ✅ Single source of truth
- ✅ Easy to add new domains (recipes, products, etc.)
- ✅ Type-safe across the entire pipeline
- ❌ Initial refactoring effort

---

### Lesson 2: Hybrid Search (1.5 min)

**Show comparison**:
```
Query: "Free tools under $10/month"

Pure Vector Search:
❌ "Free" and "$10/month" are contradictory
❌ Embedding can't capture exact constraints
❌ Results include expensive tools

Hybrid (Vector + Structured):
✅ Vector: Semantic understanding of "tools"
✅ MongoDB: Exact filter on price
✅ Results: Only tools matching both
```

**Why this matters**:
- Research loves "pure" approaches
- Production needs "whatever works"
- Hybrid = best of both worlds

---

### Lesson 3: LLMs for Reasoning (1.5 min)

**Show the separation**:
```
Bad Approach:
Query → LLM → "Here are 10 tools..." → Parse response
❌ LLM generates tool names (hallucinations)
❌ No guarantee tools exist
❌ Expensive, slow

Our Approach:
Query → LLM → {intent JSON} → Database → Real results
✅ LLM only does understanding
✅ Database guarantees real data
✅ Cheaper, faster, reliable
```

**Why this matters**:
- LLMs are great at reasoning
- LLMs are bad at facts (without RAG)
- Separate concerns = better system

---

### Lesson 4: Caching (1.5 min)

**Show the math**:
```
Production Reality:
• 1000 queries/day
• Many similar queries: "free AI tools", "free ai tools",
  "free AI tools for developers"
• Without cache: 1000 × 2 LLM calls × $0.0001 = $0.20/day
• With cache (70% hit): 300 × 2 × $0.0001 = $0.06/day
• Savings: $0.14/day = $51/year

Latency:
• Without cache: 800-1200ms
• With cache: 100-200ms
• User experience: Night and day difference
```

**Why this matters**:
- Research papers rarely mention caching
- Production systems live or die on latency
- Semantic caching is powerful but underutilized

---

### Lesson 5: Data Synchronization (1.5 min)

"Research papers say 'build a vector index' - but production means keeping TWO databases in sync..."

**The Problem**:
```
User creates tool in Admin UI
  ↓
MongoDB updated ✅
  ↓
Qdrant vector index... 🤔
  ↓
Is it updated? Which collections? What if it fails?
```

**Our Solution: Smart Sync System**:
```typescript
// When tool is created/updated
1. Save to MongoDB (ALWAYS succeeds)
2. Calculate content hash per collection
3. Async sync to Qdrant (4 collections)
4. Track status per collection
5. Background worker retries failures

// Each collection tracks its own sync state
syncMetadata: {
  collections: {
    tools: { status: "synced", hash: "abc123" },
    functionality: { status: "pending", retryCount: 2 },
    usecases: { status: "failed", error: "timeout" },
    interface: { status: "synced", hash: "def456" }
  }
}
```

**Key Features**:
- **Change detection**: Only sync collections with changed fields
- **Failure isolation**: MongoDB succeeds even if Qdrant fails
- **Background worker**: Auto-retry with exponential backoff (1 min → 1 hour)
- **Observability**: Admin dashboard shows sync health per tool

**Why this matters**:
- Research: "Just index your vectors" ✨
- Production: Sync failures, retries, monitoring, debugging 😅
- Two databases = twice the complexity
- This is why we need sync metrics, status tracking, and admin tools

---

### Lesson 6: Interpretability (1.5 min)

**Show debugging example**:
```
User: "Results are wrong!"

Black Box System:
❓ Which component failed?
❓ Was it embedding? Ranking? Filtering?
❓ How do we fix it?

Our 3-Node System:
✅ Check intent extraction → Correct? Yes.
✅ Check query plan → Selected right collections? No!
✅ Found the bug → Planner logic issue
✅ Fix and redeploy
```

**Why this matters**:
- End-to-end models are elegant
- Production needs debuggability
- Visible intermediate steps = faster debugging

---

## Slide 7: Practical Challenges

```
┌─────────────────────────────────────────────────────────┐
│  CHALLENGES WE FACED                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⚠️  Challenge              →    ✅ Our Solution        │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  LLM Costs Adding Up        →    Semantic cache        │
│                                  (70% hit rate)         │
│                                                         │
│  LLM Hallucinations         →    Schema validation +   │
│                                  controlled vocabs      │
│                                                         │
│  Multi-Collection           →    RRF fusion            │
│  Different Score Scales          (scale-invariant)      │
│                                                         │
│  Empty Results              →    Progressive filter    │
│  (Over-constrained)              relaxation             │
│                                                         │
│  Slow Cold Starts           →    Warm cache on deploy  │
│                                  + async embedding      │
│                                                         │
│  MongoDB-Qdrant Sync        →    Smart sync service +  │
│  (Two databases drift)           background worker +    │
│                                  per-collection status  │
│                                                         │
│  How to Evaluate?           →    User clicks +         │
│  (No Ground Truth)               diversity metrics +    │
│                                  test query suite       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Speaker Notes** (2 min):
- "These are problems you won't find in research papers"
- "But they're critical for production systems"
- "Happy to discuss any of these in Q&A"

---

## Slide 8: Open Research Questions

```
┌─────────────────────────────────────────────────────────┐
│  WHAT WE STILL DON'T KNOW                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. How do we evaluate agentic search quality?          │
│     • No standard benchmarks                            │
│     • User intent is subjective                         │
│     • What metrics matter?                              │
│                                                         │
│  2. Can we learn query planning from user behavior?     │
│     • RLHF for query planner?                           │
│     • Implicit feedback signals?                        │
│     • Cold start problem?                               │
│                                                         │
│  3. How many agents is optimal?                         │
│     • We use 3 nodes - is that right?                   │
│     • More agents = more interpretable?                 │
│     • Latency vs modularity trade-off?                  │
│                                                         │
│  4. Cross-domain transfer?                              │
│     • Schema works for tools - what about products?     │
│     • Recipes? Documents? Medical data?                 │
│     • Universal schema possible?                        │
│                                                         │
│  5. How to handle evolving schemas?                     │
│     • New categories emerge                             │
│     • User language changes                             │
│     • Cache invalidation strategies?                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Speaker Notes** (2 min):
- "These are genuine open questions"
- "Would love to collaborate with researchers here"
- "If any of these interest you, let's talk after"

---

## Slide 9: Key Takeaways

```
┌─────────────────────────────────────────────────────────┐
│  WHAT TO REMEMBER                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  FOR RESEARCHERS:                                       │
│  • Agentic search is interpretable and modular          │
│  • Hybrid approaches often beat pure methods            │
│  • We need better evaluation frameworks                 │
│                                                         │
│  FOR PRACTITIONERS:                                     │
│  • Schema-driven design enables portability             │
│  • LLMs for reasoning, databases for retrieval          │
│  • Caching is essential for production                  │
│                                                         │
│  FOR EVERYONE:                                          │
│  • Real systems teach us what matters                   │
│  • Research ↔ Practice gap is real but bridgeable      │
│  • Production constraints drive innovation              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Research without implementation is incomplete  │   │
│  │  Implementation without research is fragile     │   │
│  │                                                 │   │
│  │  → We need both                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Speaker Notes** (1 min):
- "This is what I hope you take away"
- "Research and practice need each other"
- "CodiesVibe is open source - please try it, break it, improve it"

---

## Slide 10: Try It Yourself

```
┌─────────────────────────────────────────────────────────┐
│  RESOURCES                                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🌐 Live Demo                                           │
│     codiesvibe.com                                      │
│     (Try the queries we used today)                     │
│                                                         │
│  💻 Source Code                                         │
│     github.com/foyzulkarim/codiesvibe                   │
│     → search-api/ directory                             │
│     → Full LangGraph implementation                     │
│                                                         │
│  📚 Documentation                                       │
│     /docs/SEA-TALK-PREPARATION.md                       │
│     → Architecture deep-dive                            │
│     → Implementation details                            │
│     → Q&A preparation                                   │
│                                                         │
│  📧 Contact                                             │
│     [Your email]                                        │
│     [Your Twitter/LinkedIn]                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           [QR Code Here]                        │   │
│  │       → GitHub Repository                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Questions? Let's discuss!                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Speaker Notes**:
- "All code is open source"
- "Documentation includes everything I couldn't cover today"
- "I'm here for Q&A - please ask anything!"

---

# DEMO PREPARATION CHECKLIST

## Before the Talk

### System Preparation
- [ ] Deploy to stable server (not localhost)
- [ ] Warm the cache with these queries:
  ```
  - "free AI code completion tools"
  - "AI tools for code generation that work locally"
  - "tools like Cursor but cheaper"
  - "collaborative development tools"
  ```
- [ ] Test debug mode endpoint
- [ ] Verify vLLM is responsive
- [ ] Check MongoDB and Qdrant connections

### Backup Preparation
- [ ] Record demo video as backup
- [ ] Take screenshots of each demo stage
- [ ] Prepare fallback slides with static results
- [ ] Test on conference WiFi (if possible)

### Demo Environment
- [ ] Browser: Chrome/Firefox with dev tools ready
- [ ] Terminal: For showing logs if needed
- [ ] Screen resolution: Readable from back of room
- [ ] Font size: Increase for visibility
- [ ] Zoom: Prepare to zoom in on JSON

### Data Preparation
- [ ] Verify test queries return good results
- [ ] Check that cache hit/miss works correctly
- [ ] Ensure timing data is reasonable
- [ ] Test with edge cases (empty results, errors)

## Demo Flow

```
1. Show CodiesVibe homepage (10 sec)
   ↓
2. Enter query in search box (5 sec)
   ↓
3. Switch to debug view / DevTools (5 sec)
   ↓
4. Explain Intent Extraction output (2 min)
   ↓
5. Explain Query Planning output (3 min)
   ↓
6. Explain Execution output (2 min)
   ↓
7. Show final results (30 sec)
   ↓
8. Re-run same query for cache demo (1 min)
   ↓
9. Compare timing (30 sec)
```

**Total**: ~8 minutes

## If Demo Fails

**Plan B**: Use screenshots
- Have full demo flow captured
- Walk through as if live
- Acknowledge: "This is from our test run earlier"

**Plan C**: Skip to results
- Show just final output
- Focus on architecture explanation

## Demo Tips

### Before Each Demo Step
1. **Narrate what you're doing**: "Now I'm going to enter this query..."
2. **Pause for effect**: Give audience time to read output
3. **Highlight key parts**: Point or circle important fields
4. **Connect to research**: "This is where RRF happens..."

### During Demo
- **Speak slowly**: Audience is reading and listening
- **Read important values aloud**: "Notice the confidence is 0.92"
- **Explain abbreviations**: "RRF means Reciprocal Rank Fusion"
- **Show, don't just tell**: Click through, don't just describe

### After Demo
- **Summarize what we saw**: "So in 8 minutes we saw the full pipeline"
- **Bridge to next section**: "Now let's talk about what we learned..."

---

# TIMING BREAKDOWN (30 minutes)

```
00:00 - 02:00  Introduction + Problem Statement
02:00 - 03:00  Quick Demo: Keyword Search Failure
03:00 - 05:00  Architecture Overview
05:00 - 13:00  LIVE DEMO (Core of Talk)
               ├ 05:00-07:00  Intent Extraction
               ├ 07:00-10:00  Query Planning
               ├ 10:00-12:00  Execution
               └ 12:00-13:00  Cache Demo
13:00 - 21:30  Research → Implementation Lessons (6 lessons)
21:30 - 24:00  Challenges & Open Questions
24:00 - 26:00  Key Takeaways
26:00 - 27:00  Resources
27:00 - 30:00  Buffer / Early Q&A
```

**Adjust timing during talk**:
- If running fast: Expand demo explanations
- If running slow: Compress lessons section
- Always leave 3-5 min for questions

---

# AUDIENCE ENGAGEMENT

## During Demo
- **Ask rhetorical questions**: "What do you think the LLM will extract here?"
- **Pause for reading**: "Take a moment to read this JSON output"
- **Invite comments**: "Anyone notice anything interesting?"

## During Lessons
- **Poll the room**: "How many of you have used RRF?"
- **Share anecdotes**: "We actually tried X first and it failed because..."
- **Connect to their work**: "If you're working on Y, this might help with..."

## Open Questions Slide
- **Genuinely ask**: "I'd love your thoughts on this"
- **Invite collaboration**: "If this interests you, let's talk"
- **Be humble**: "We don't have all the answers"

---

# ANTICIPATED QUESTIONS & ANSWERS

## Q: Why not use GPT-4 or Claude for everything?

**A**: "Great question. We actually tried that initially. The problems:
1. Cost - would be 10-20x more expensive
2. Context limits - can't fit all 500 tools
3. Hallucinations - LLM might invent tools
4. Latency - much slower than database queries

Our hybrid approach uses LLMs for what they're good at - understanding and planning - and databases for what they're good at - retrieval and filtering. Best of both worlds."

## Q: How do you handle query variations like typos?

**A**: "Two strategies:
1. Embedding models are naturally robust to small variations
2. Cache similarity matching catches near-duplicates

For example, 'AI tools' and 'AI tols' have similar embeddings. The cache will likely hit. For more severe typos, we could add fuzzy matching, but haven't needed it yet in practice."

## Q: What about multilingual queries?

**A**: "Currently English-only because our tool descriptions are in English. But the architecture supports multilingual with:
1. Multilingual embedding models
2. Language detection in intent extraction
3. Translation at the boundary

The schema-driven design actually makes this easier - we could define language-specific vocabularies."

## Q: How do you keep MongoDB and Qdrant in sync?

**A**: "Great question - this is one of those production problems research papers don't talk about! We built a Smart Sync system with several key features:

1. **Async fire-and-forget**: When a tool is created/updated, MongoDB saves immediately, then we trigger async sync to Qdrant - so users don't wait
2. **Per-collection tracking**: Each of our 4 Qdrant collections tracks its own sync status (synced, pending, failed)
3. **Change detection**: We calculate content hashes per collection and only sync what changed. For example, updating pricing doesn't re-embed the functionality collection
4. **Background worker**: Runs every 60 seconds, retries failed syncs with exponential backoff (1 min → 1 hour), max 5 retries
5. **Failure isolation**: MongoDB writes always succeed even if Qdrant fails - we don't want to lose data

The admin dashboard shows sync health per tool, and we have API endpoints to manually trigger retries. This adds complexity, but it's essential for production reliability."

## Q: How do you validate that the LLM extracted intent correctly?

**A**: "Three validation layers:
1. Schema validation - reject invalid JSON structure
2. Vocabulary validation - check against controlled lists
3. Confidence thresholding - low confidence triggers fallback

We also log all extractions and manually review a sample weekly to catch systematic issues."

## Q: Why 3 nodes? Why not 2 or 5?

**A**: "Honest answer: Engineering intuition, not rigorous science. We separated intent and planning because:
1. Different concerns (understanding vs strategy)
2. Different cache granularities
3. Different optimization opportunities

Could you do it with 2? Probably. With 5? Maybe too complex. This felt like the right balance, but I'd love to see research on optimal agent decomposition."

## Q: What's your biggest regret or what would you change?

**A**: "I wish we'd built the schema-driven architecture from day one. We spent months with hardcoded prompts before refactoring. The schema approach is so much better but took significant effort to migrate.

Lesson: Think about extensibility early, not late."

---

# POST-TALK TODO

## Immediate (At Conference)
- [ ] Collect business cards / contacts
- [ ] Note interesting questions for follow-up
- [ ] Connect with potential collaborators
- [ ] Get feedback on presentation

## Within 1 Week
- [ ] Send follow-up emails to interested researchers
- [ ] Post slides + video on GitHub
- [ ] Write blog post summarizing talk
- [ ] Address any bugs found during demo

## Within 1 Month
- [ ] Implement suggested improvements
- [ ] Explore research collaborations
- [ ] Consider paper submission to workshop/conference
- [ ] Create benchmark dataset if there's interest

---

**You've got this! The key is showing genuine enthusiasm for bridging research and practice. Good luck! 🚀**
