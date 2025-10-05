# Query Analysis Template

## Task
Analyze the user's query to understand intent, extract entities, identify constraints, and suggest actions.

## Context
- Dataset: AI tools directory with pricing, capabilities, and metadata
- Previous Context: {{contextSummary}}
- Current State: {{currentStateSummary}}

## Query
{{query}}

## Analysis Instructions

1. **Intent Recognition**:
   - Identify primary intent (search, filter, sort, aggregate, browse)
   - Look for specific keywords (free, API, popular, cheap, etc.)
   - Recognize implicit requirements (e.g., "show me" implies browse/search)

2. **Entity Extraction**:
   - Extract pricing information (free, cheap, expensive, ranges)
   - Identify technical requirements (API, webhooks, SDK)
   - Find categories or industries mentioned
   - Recognize user types or experience levels

3. **Constraint Identification**:
   - Identify explicit constraints (limits, preferences, exclusions)
   - Infer implicit constraints from context
   - Note any contradictions in requirements

4. **Ambiguity Detection**:
   - Identify vague terms that need clarification
   - Recognize multiple possible interpretations
   - Flag subjective criteria (good, best, interesting)

5. **Confidence Assessment**:
   - Evaluate query clarity and specificity
   - Assess how well entities match available data
   - Consider complexity and ambiguity level

## Output Format
Provide a JSON response following the query analysis schema with:
- Clear intent classification
- Structured entity extraction
- Identified constraints
- Ambiguity flags when needed
- Confidence scoring with justification
- Suggested action sequence

## Examples

**Example 1 - Clear Intent**:
Query: "Show me free AI tools with API access under $50"
Intent: find_free_api_tools
Confidence: 0.9

**Example 2 - Ambiguous Intent**:
Query: "Show me good tools for my startup"
Intent: needs_clarification
Ambiguities: budget_range, specific_features
Confidence: 0.4

## Quality Standards
- Be specific about intent classification
- Extract all relevant entities and constraints
- Identify when clarification is needed
- Provide confidence scores that reflect actual uncertainty
- Suggest practical next steps