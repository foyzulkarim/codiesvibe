# Output Format Specifications

## LLM Planner Response Format

```json
{
  "action": {
    "toolName": "toolName",
    "parameters": {
      "field": "fieldName",
      "value": "filterValue",
      "operator": "eq"
    },
    "reasoning": "Clear explanation of why this tool was chosen",
    "confidence": 0.85
  },
  "reasoning": "Overall reasoning about the action taken",
  "confidence": 0.8,
  "needsClarification": false,
  "clarificationQuestion": "Optional question if clarification is needed"
}
```

## Query Analysis Response Format

```json
{
  "intent": "search_intent",
  "entities": {
    "category": "ai",
    "priceRange": {
      "min": 0,
      "max": 100
    },
    "features": ["api"]
  },
  "constraints": {
    "limit": 20,
    "sortOrder": "popularity"
  },
  "confidence": 0.9,
  "ambiguities": ["price_range_specificity"],
  "suggestedActions": ["apply_price_filter", "sort_by_popularity"]
}
```

## Clarification Response Format

```json
{
  "question": "When you say 'affordable tools', do you have a specific price range in mind?",
  "options": [
    {
      "interpretation": "Free tools only",
      "confidence": 0.8,
      "suggestedQuery": "free AI tools with API access",
      "reasoning": "Many users mean free when they say affordable"
    },
    {
      "interpretation": "Under $50/month",
      "confidence": 0.7,
      "suggestedQuery": "AI tools with API access under $50/month",
      "reasoning": "Common startup budget range"
    },
    {
      "interpretation": "Under $20/month",
      "confidence": 0.6,
      "suggestedQuery": "affordable AI tools under $20/month",
      "reasoning": "Individual user budget range"
    }
  ],
  "reasoning": "The term 'affordable' is subjective and needs clarification to provide relevant results"
}
```

## Response Validation Rules

1. **Required Fields**: All response types must include their required fields
2. **Confidence Range**: Confidence must be between 0.0 and 1.0
3. **Tool Names**: Tool names must match exactly the available tools
4. **Parameter Validation**: Parameters must match tool specifications
5. **JSON Validity**: Responses must be valid JSON objects

## Error Response Format

```json
{
  "error": "validation_error",
  "message": "Invalid tool parameter",
  "suggestion": "Check available tools and parameter formats",
  "retryPossible": true
}
```

## Response Quality Requirements

1. **Clarity**: Reasoning should be clear and easy to understand
2. **Specificity**: Use specific tool names and parameter values
3. **Accuracy**: Confidence scores should reflect actual certainty
4. **Completeness**: Include all required fields for the response type
5. **Consistency**: Reasoning should align with tool selection

## Context Integration

Responses should incorporate:
- Previous conversation context when available
- User preferences and constraints identified earlier
- Results from previous tool applications
- Clarification responses provided by user

## Confidence Scoring Guidelines

- **0.9-1.0**: Very confident, clear intent and good tool match
- **0.7-0.8**: Confident, mostly clear intent with minor uncertainties
- **0.5-0.6**: Moderate confidence, some ambiguity or complexity
- **0.3-0.4**: Low confidence, significant ambiguity or uncertainty
- **0.0-0.2**: Very low confidence, highly ambiguous or unclear

## Tool Selection Best Practices

1. **Start Broad**: Begin with general search tools for vague queries
2. **Progressive Refinement**: Add specific filters as understanding improves
3. **Efficiency**: Use tools that will reduce dataset size early
4. **Relevance**: Prioritize tools that directly address user intent
5. **Combination**: Use multiple tools when single tools are insufficient