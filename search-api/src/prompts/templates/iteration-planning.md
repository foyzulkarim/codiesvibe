# Multi-Step Iteration Planning Template

## Task
Plan the next step in a multi-step reasoning process, considering previous results and maintaining context.

## Context
- Original Query: {{originalQuery}}
- Current Intent: {{currentIntent}}
- Previous Steps: {{stepHistory}}
- Current Results: {{currentResultsSummary}}
- Query Context: {{contextSummary}}
- Iteration: {{currentIteration}} of {{maxIterations}}

## Planning Considerations

1. **Progress Assessment**:
   - Review what has been accomplished so far
   - Evaluate if current results meet user needs
   - Identify what still needs to be achieved
   - Consider if current results are satisfactory

2. **Result Analysis**:
   - Analyze the quantity and quality of current results
   - Identify patterns or insights in the data
   - Consider if results need further refinement
   - Evaluate result relevance to the original query

3. **Next Step Planning**:
   - Determine if the search should continue or conclude
   - Identify the most impactful next action
   - Consider alternative approaches if current path isn't working
   - Balance comprehensiveness with efficiency

4. **Context Preservation**:
   - Maintain the original user intent throughout
   - Build upon previous reasoning and insights
   - Consider user feedback and preferences
   - Preserve important constraints and requirements

## Decision Criteria

1. **Completion Signals**:
   - Sufficient results found (quantity and quality)
   - User intent fully addressed
   - All constraints and requirements satisfied
   - Results are relevant and actionable

2. **Continuation Indicators**:
   - Results are too limited or non-existent
   - Results don't match query intent
   - Additional filtering or refinement needed
   - User has specific requirements not yet addressed

3. **Optimization Opportunities**:
   - Better sorting would improve relevance
   - Additional filtering would reduce noise
   - Alternative approaches might yield better results
   - Current results can be improved with refinement

## Next Step Options

1. **Continue Searching**:
   - Apply additional filters to narrow results
   - Try different search strategies or terms
   - Explore related categories or features
   - Expand or adjust search criteria

2. **Change Approach**:
   - Try different tools or methods
   - Modify search parameters
   - Consider alternative interpretations
   - Use different search fields

3. **Sort or Rank**:
   - Apply sorting to improve relevance
   - Rank results by quality or popularity
   - Consider multiple sorting criteria
   - Implement user preference-based ranking

4. **Analyze and Summarize**:
   - Provide insights about current results
   - Generate statistics or summaries
   - Identify patterns or trends
   - Offer recommendations based on findings

5. **Conclude and Format**:
   - Format results for presentation
   - Provide final recommendations
   - Summarize key findings
   - Suggest next steps if needed

## Output Format

Provide a JSON response following the LLM planner schema with:
- Tool selection for the next action (or conclusion)
- Detailed reasoning for the decision
- Assessment of current progress
- Confidence in the chosen approach
- Clear explanation of expected outcomes

## Quality Standards

- Build logically on previous steps rather than starting over
- Consider the efficiency and impact of each potential action
- Maintain focus on addressing the original user intent
- Provide clear reasoning for tool selection
- Know when to conclude the search process
- Balance comprehensiveness with practicality