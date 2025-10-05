# Ambiguity Resolution Template

## Task
Generate clarifying questions and interpretation options for ambiguous queries to improve search precision.

## Context
- Original Query: {{originalQuery}}
- Current Interpretation: {{currentInterpretation}}
- Identified Ambiguities: {{ambiguities}}
- Conversation History: {{conversationHistory}}

## Ambiguity Types

1. **Subjective Criteria**:
   - Terms like "good", "best", "interesting", "popular"
   - Quality judgments that vary by user
   - Preference-based language

2. **Quantitative Ambiguity**:
   - Vague price ranges (cheap, affordable, expensive)
   - Unclear timeframes (recent, new, old)
   - Imprecise quantities (few, many, some)

3. **Technical Ambiguity**:
   - Unclear feature requirements
   - Ambiguous technical capabilities
   - Vague integration needs

4. **Scope Ambiguity**:
   - Broad category terms without specifics
   - Missing context for business needs
   - Unclear use case or application

## Clarification Strategy

1. **Identify Key Ambiguities**:
   - Focus on ambiguities that most impact results
   - Prioritize based on query importance
   - Consider which clarifications will provide most value

2. **Formulate Questions**:
   - Be specific and clear
   - Provide context for why the question matters
   - Offer examples or ranges when helpful
   - Avoid asking multiple questions at once

3. **Generate Options**:
   - Provide reasonable interpretations
   - Include confidence scores for each option
   - Suggest refined queries for each interpretation
   - Explain reasoning behind each option

4. **Maintain Flow**:
   - Build on previous conversation context
   - Remember user preferences when stated
   - Avoid repeating previous clarifications
   - Progress toward resolution

## Output Format

When clarification is needed, provide a JSON response following the clarification schema with:
- Clear, specific question addressing the ambiguity
- Multiple interpretation options with confidence scores
- Suggested refined queries for each option
- Reasoning explaining why clarification is needed

## Example Scenarios

**Price Ambiguity**:
Query: "Find affordable AI tools"
Ambiguity: Price range is subjective
Question: "What price range do you consider affordable for AI tools?"
Options:
- Free tools only (confidence: 0.8)
- Under $20/month (confidence: 0.7)
- Under $100/month (confidence: 0.6)

**Feature Ambiguity**:
Query: "Tools for productivity"
Ambiguity: Productivity needs vary widely
Question: "What specific productivity tasks are you looking to automate or improve?"

**Scope Ambiguity**:
Query: "Show me tools"
Ambiguity: No specific criteria provided
Question: "Are you looking for tools in a specific category, with particular features, or for a specific use case?"

## Quality Standards

- Ask one clear question at a time
- Provide meaningful interpretation options
- Include confidence scores that reflect real uncertainty
- Suggest actionable refined queries
- Explain why clarification will improve results
- Be respectful of user context and preferences