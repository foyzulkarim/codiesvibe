/**
 * Prompt Templates for Schema-Driven Generation
 *
 * These templates use {{PLACEHOLDER}} syntax for dynamic content generation.
 * The prompt generator (prompt.generator.ts) fills these placeholders with
 * schema-specific data.
 *
 * @module core/prompts/templates
 */

/**
 * Intent Extraction Prompt Template
 *
 * Placeholders:
 * - {{INTENT_FIELDS_SCHEMA}}: JSON structure of intent fields from schema
 * - {{VOCABULARY_DEFINITIONS}}: Controlled vocabulary constraints
 * - {{PRICE_EXTRACTION_RULES}}: Rules for extracting price information
 * - {{EXAMPLES}}: Example queries with expected outputs
 */
export const INTENT_EXTRACTION_TEMPLATE = `
You are an AI intent extractor. Your ONLY job is to return a valid JSON object. Do not provide explanations, do not engage in conversation, do not say "let me think about this" or any other conversational text.

Return ONLY a JSON object with this structure:
{{INTENT_FIELDS_SCHEMA}}

IMPORTANT GUIDELINES:
{{VOCABULARY_DEFINITIONS}}
- Use exact values from the controlled vocabularies - do not make up new values

PRICE EXTRACTION RULES:
{{PRICE_EXTRACTION_RULES}}

Examples:
{{EXAMPLES}}

DO NOT include any text before or after the JSON. Return ONLY the JSON object.
`;

/**
 * Query Planning Prompt Template
 *
 * Placeholders:
 * - {{COLLECTION_DEFINITIONS}}: Available vector collections and their purposes
 * - {{COLLECTION_STRATEGIES}}: Collection selection strategies
 * - {{MONGODB_FILTERS}}: Available MongoDB filter fields
 * - {{QUERY_PLAN_SCHEMA}}: JSON structure for query plan
 * - {{FUSION_METHODS}}: Available result fusion methods
 */
export const QUERY_PLANNING_TEMPLATE = `
You are an AI Retrieval Planner for an advanced multi-collection search engine.

You receive a structured IntentState object that describes the user's goal, features, pricing, and comparison intent.

You must design an optimal QueryPlan JSON according to the schema that intelligently combines:
- Multi-collection vector-based similarity search
- Dynamic collection selection based on query analysis
- Metadata filtering
- Optional reranking strategies

MULTI-COLLECTION ARCHITECTURE:
{{COLLECTION_DEFINITIONS}}

DYNAMIC COLLECTION SELECTION STRATEGY:
{{COLLECTION_STRATEGIES}}

QUERY PLANNING GUIDELINES:

1. Collection Selection:
   - Analyze query intent to determine primary collection focus
   - Use secondary collections for context and comprehensive results
   - Consider user's technical expertise level

2. Vector Source Strategy:
   - For comparison queries with referenceTool: use "reference_tool_embedding"
   - For discovery queries: use "query_text"
   - For semantic understanding: include "semantic_variant" when available

3. TopK Allocation:
   - Primary collections: topK 50-80
   - Secondary collections: topK 30-50
   - Total results before fusion: max 200

4. Filtering Strategy:
   - Apply filters for constraints (pricing, platform, category)
   - Use structured fields for precise filtering
   - Combine with vector search for hybrid approach

5. Fusion Methods:
{{FUSION_METHODS}}

MongoDB Structured Fields (for filtering):
CRITICAL: You MUST use ONLY the exact values listed below. DO NOT create variations, synonyms, or modified versions of these values.

{{MONGODB_FILTERS}}

IMPORTANT FILTERING RULES:
1. Use ONLY the exact string values listed above - no variations, no synonyms, no modifications
2. If the intent mentions a value, use it for the correct field (e.g., "CLI" goes to interface field, not functionality)
3. Do not create compound terms - use only exact controlled vocabulary values
4. If a concept doesn't match an exact controlled vocabulary value, do not create a filter for that field
5. Map intent concepts to the correct field: interface concepts go to interface, functionality concepts go to functionality

Return a valid QueryPlan JSON conforming to this schema:
{{QUERY_PLAN_SCHEMA}}
`;

/**
 * Fixed content sections (non-schema-driven)
 * These are domain-agnostic rules and examples
 */
export const PRICE_EXTRACTION_RULES = `
- Extract specific price values, ranges, and comparisons from user queries
- For "priceRange": Extract when user mentions price ranges like "between $10-50", "$20 to $100"
- For "priceComparison": Extract when user mentions price constraints like "under $50", "less than $20/month", "around $30"
- Always normalize currency to USD if not specified
- Detect billing periods from context: "per month", "/mo", "monthly", "yearly", "annual", "one-time"
- Price operators:
  * "less_than": "under", "below", "less than", "cheaper than"
  * "greater_than": "over", "above", "more than", "expensive than"
  * "equal_to": "exactly", "costs", "priced at"
  * "around": "about", "approximately", "roughly", "around"
  * "between": "between X and Y", "from X to Y"
`;

/**
 * Example queries for intent extraction
 * TODO: Make these domain-specific or schema-driven in future
 *
 * Note: pricingModel is now an array of values: ["Free"], ["Paid"], or ["Free", "Paid"] for tools with both options
 */
export const INTENT_EXTRACTION_EXAMPLES = `
Query: "free cli" → {"primaryGoal": "find", "pricingModel": ["Free"], "interface": "CLI", "priceRange": null, "priceComparison": null, "referenceTool": null, "comparisonMode": null, "functionality": [], "filters": [], "semanticVariants": [], "constraints": [], "confidence": 0.9}

Query: "AI tools under $50 per month" → {"primaryGoal": "find", "pricingModel": null, "priceComparison": {"operator": "less_than", "value": 50, "currency": "USD", "billingPeriod": "Monthly"}, "priceRange": null, "functionality": ["AI Integration"], "filters": [], "semanticVariants": [], "constraints": [], "confidence": 0.9}

Query: "code editor between $20-100 monthly" → {"primaryGoal": "find", "category": "Code Editor", "priceRange": {"min": 20, "max": 100, "currency": "USD", "billingPeriod": "Monthly"}, "priceComparison": null, "functionality": [], "filters": [], "semanticVariants": [], "constraints": [], "confidence": 0.8}

Query: "Cursor alternative but cheaper" → {"primaryGoal": "find", "referenceTool": "Cursor IDE", "comparisonMode": "alternative_to", "constraints": ["cheaper"], "priceComparison": {"operator": "less_than", "value": 20, "currency": "USD", "billingPeriod": "Monthly"}, "pricingModel": null, "category": "Code Editor", "functionality": ["Code Generation"], "filters": [], "semanticVariants": [], "confidence": 0.8}

Query: "free offline AI code generator" → {"primaryGoal": "find", "pricingModel": ["Free"], "priceRange": null, "priceComparison": null, "interface": null, "referenceTool": null, "comparisonMode": null, "functionality": ["Code Generation", "Local Inference"], "filters": [], "semanticVariants": [], "constraints": ["offline"], "confidence": 0.9}

Query: "API tools around $30 per month" → {"primaryGoal": "find", "category": "API", "priceComparison": {"operator": "around", "value": 30, "currency": "USD", "billingPeriod": "Monthly"}, "priceRange": null, "functionality": [], "filters": [], "semanticVariants": [], "constraints": [], "confidence": 0.85}
`;

/**
 * Fusion method descriptions
 */
export const FUSION_METHODS_DESCRIPTION = `
   - "rrf" (Reciprocal Rank Fusion): Best for multi-source results (recommended)
   - "weighted_sum": Good for simpler 2-3 collection queries
   - "concat": Use when sources are non-overlapping
`;
