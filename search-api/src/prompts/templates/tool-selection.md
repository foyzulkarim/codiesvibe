# Tool Selection Template

## CRITICAL REMINDER
**USE ONLY EXACT TOOL NAMES FROM THE AVAILABLE TOOLS LIST. NEVER INVENT TOOLS LIKE "search_intent".**

## Task
Select the most appropriate tool for the current step based on the query context and desired outcome.

## Context
- Query Intent: {{intent}}
- Extracted Entities: {{entities}}
- Constraints: {{constraints}}
- Previous Steps: {{previousSteps}}
- Current Dataset Size: {{datasetSize}}

## Available Information
- Current Results: {{currentResultsSummary}}
- Query Context: {{contextSummary}}
- Execution History: {{executionHistory}}

## SPECIFIC TOOL SELECTION RULES

### 1. Brand/Tool Name Queries (Highest Priority)
If query mentions specific AI tools:
**Examples**: "ChatGPT", "Midjourney", "Claude", "Gemini", "DALL-E"

**ACTION**: Use `filterByField` with these parameters:
```json
{
  "tool": "filterByField",
  "parameters": {
    "field": "name",
    "value": "ExactToolName",
    "operator": "contains",
    "caseSensitive": false
  }
}
```

### 2. Category/Type Queries
If query asks about types of tools:
**Examples**: "AI writing tools", "image generators", "code assistants"

**ACTION**: Use `filterByArrayContains` with these parameters:
```json
{
  "tool": "filterByArrayContains",
  "parameters": {
    "field": "categories.primary",
    "values": ["category_keyword"],
    "matchType": "any"
  }
}
```

### 3. Feature/Capability Queries
If query asks about specific features:
**Examples**: "tools with API access", "free AI tools", "tools for teams"

**ACTION**: Use `filterByNestedField` with appropriate path:
```json
{
  "tool": "filterByNestedField",
  "parameters": {
    "field": "capabilities.technical.apiAccess",
    "value": true
  }
}
```

### 4. Pricing Queries
If query mentions pricing, cost, or free:
**Examples**: "free tools", "under $50", "pricing plans"

**ACTION**: Use pricing-related nested fields:
```json
{
  "tool": "filterByNestedField",
  "parameters": {
    "field": "pricingSummary.hasFreeTier",
    "value": true
  }
}
```

### 5. General/Conceptual Queries
If query doesn't match above patterns:
**Examples**: "AI assistant tools", "productivity software"

**ACTION**: Use `searchByText` for broad search:
```json
{
  "tool": "searchByText",
  "parameters": {
    "query": "user's exact query",
    "fields": ["name", "description"]
  }
}
```

## Selection Criteria

1. **Pattern Matching**: Match query patterns to rules above
2. **Tool Name Accuracy**: Use exact tool names from the available list
3. **Parameter Specificity**: Provide concrete values from user query
4. **No Tool Invention**: Never create tools that don't exist

## Tool Selection Process

1. **Pattern Recognition**: Identify which rule category matches the query
2. **Tool Selection**: Choose the exact tool name specified in that rule
3. **Parameter Extraction**: Extract specific values from the user's query
4. **Validation**: Ensure tool name exists in the available tools list

## Available Tool Names (Use ONLY These)
**Filtering**: filterByField, filterByArrayContains, filterByNestedField, filterByArrayIntersection, filterByPriceRange, filterByDateRange, filterByExists

**Search**: searchByText, searchByKeywords, search_tools, findById, findBySlug

**Sorting**: sortByField, sortByNestedField, sortByMultipleFields

**Utility**: limitResults, selectFields, groupBy

## Output Format
Provide a JSON response following this exact schema:
```json
{
  "tool": "exact_tool_name_from_list_above",
  "parameters": {
    "parameter_name": "specific_value_from_query"
  },
  "reasoning": "explain which rule was applied and why",
  "confidence": 0.8,
  "expectedOutcome": "describe what results this should produce"
}
```

## Quality Standards
- **NO TOOL INVENTION**: Only use exact tool names from the list
- **PATTERN MATCHING**: Apply the specific rules for query types
- **PARAMETER ACCURACY**: Extract exact values from user query
- **REASONING CLARITY**: Explain which rule was applied

## REMINDER
**NEVER USE TOOLS LIKE "search_intent" - THEY DON'T EXIST!**
**ALWAYS USE ONE OF THE EXACT TOOL NAMES LISTED ABOVE!**