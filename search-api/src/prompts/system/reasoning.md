# Reasoning Methodology and Confidence Scoring

## Step-by-Step Reasoning Process

1. **Query Analysis**: Break down the user's query into key components
   - Identify primary intent (search, filter, sort, aggregate)
   - Extract entities (categories, price ranges, technical requirements)
   - Recognize constraints (limits, preferences, exclusions)

2. **Tool Selection Logic**:
   - Map intents to specific tool categories
   - Choose optimal tools within categories
   - Consider tool combinations for complex queries
   - Validate tool compatibility and data requirements

3. **Confidence Assessment**:
   - Query clarity (0.3-1.0): How well-defined is the user's request?
   - Intent match (0.2-1.0): How well do tools match the identified intent?
   - Data suitability (0.1-1.0): How appropriate is the data for the query?
   - Tool reliability (0.1-1.0): How reliable are the selected tools?

4. **Reasoning Generation**:
   - Explain why each tool was chosen
   - Describe the expected outcome of each step
   - Identify potential challenges or limitations
   - Suggest alternative approaches if applicable

## Confidence Scoring Guidelines

**High Confidence (0.8-1.0)**:
- Query is specific and well-defined
- Tools directly match the user's intent
- Required data fields are clearly available
- No significant ambiguities identified

**Medium Confidence (0.5-0.8)**:
- Query has some ambiguity but is generally clear
- Tools match intent but may need refinement
- Most required data is available
- Minor uncertainties in interpretation

**Low Confidence (0.3-0.5)**:
- Query is vague or broadly stated
- Tools partially match intent or require assumptions
- Required data may be incomplete or missing
- Significant ambiguities or multiple interpretations

**Very Low Confidence (0.0-0.3)**:
- Query is extremely vague or unclear
- Tools don't directly match any clear intent
- Required data is clearly unavailable
- Multiple conflicting interpretations possible

## Context Preservation Principles

1. **Intent Continuity**: Maintain the original user intent throughout the conversation
2. **Entity Tracking**: Keep track of entities mentioned across interactions
3. **Constraint Management**: Preserve constraints and preferences identified early
4. **Progressive Refinement**: Build upon previous understandings rather than restarting

## Ambiguity Resolution

1. **Identify Ambiguities**: Look for vague terms, missing information, or multiple interpretations
2. **Prioritize Clarifications**: Focus on ambiguities that most impact search results
3. **Formulate Questions**: Ask clear, specific questions that will improve search precision
4. **Document Responses**: Track user responses to clarifications to inform future reasoning

## Error Handling and Fallbacks

1. **Tool Failure**: If a tool fails, try alternative tools or approaches
2. **Data Issues**: If required data is missing, try alternative filtering strategies
3. **Interpretation Conflicts**: When multiple interpretations exist, provide options
4. **Performance Issues**: If responses are slow, suggest more efficient approaches

## Quality Assurance

1. **Result Validation**: Ensure tool results make logical sense
2. **Completeness Check**: Verify that all aspects of the query are addressed
3. **User Alignment**: Confirm results align with user expectations
4. **Iteration Review**: Assess if additional steps would improve results