# EP-04: Interactive AI Features

## Overview
Leverage agentic search capabilities to provide conversational, intelligent interactions that differentiate from static directories.

## Dependencies
- EP-01 (SEO Foundation) - context for AI features
- EP-02 (Content Enrichment) - rich data for AI to reference

---

## EP-04-01: Ask About This Tool

**As a** user on a tool detail page
**I want** to ask questions about the tool
**So that** I get specific answers without searching docs

### Tasks

**Frontend:**
- [ ] Create `ToolChat.tsx` component
- [ ] Floating chat button on tool detail page
- [ ] Expandable chat panel (slide-in or modal)
- [ ] Message input with send button
- [ ] Message history display (user + AI)
- [ ] Typing indicator during response
- [ ] Clear conversation button
- [ ] Mobile-friendly layout

**Chat State:**
- [ ] Store conversation in component state
- [ ] Persist to sessionStorage (survives refresh)
- [ ] Include tool context automatically
- [ ] Maximum conversation length (last 10 messages)

**API:**
- [ ] Create `POST /api/tools/:id/chat` endpoint
- [ ] Request: `{ message: string, history: Message[] }`
- [ ] Response: `{ response: string, sources?: string[] }`
- [ ] Streaming response support (SSE)

**LangGraph Integration:**
- [ ] Create `toolChatGraph` in search-api
- [ ] Nodes:
  - ContextLoader: fetch tool data + enriched content
  - IntentClassifier: question type (feature, pricing, comparison, how-to)
  - AnswerGenerator: LLM with tool context
  - SourceCiter: include data sources in response
- [ ] Use tool's scraped content as RAG context
- [ ] Fallback to web search for unknown questions

**Prompt Engineering:**
- [ ] System prompt: "You are an expert on {tool}..."
- [ ] Include: tool description, features, pricing, pros/cons
- [ ] Handle comparison questions: "How does this compare to X?"
- [ ] Handle compatibility questions: "Does this work with Y?"
- [ ] Graceful "I don't know" responses

---

## EP-04-02: Conversational Comparison

**As a** user unsure which tool to pick
**I want** to describe my needs conversationally
**So that** AI recommends the best fit

### Tasks

**Frontend:**
- [ ] Create `CompareAssistant.tsx` component
- [ ] Entry point: button on homepage or comparison page
- [ ] Full-page chat interface
- [ ] Structured output: tool recommendations with reasoning
- [ ] "Compare these" button to jump to comparison page
- [ ] Save conversation option

**Conversation Flow:**
```
AI: What type of tool are you looking for?
User: I need something for code completion
AI: What's your budget?
User: Around $20/month
AI: Do you need it to work offline?
User: Yes, that would be nice
AI: Based on your needs, I recommend:
    1. Cursor - Best overall for your budget
    2. Continue - Great offline support, open source
    3. Codeium - Free tier available
    [Compare These] [Tell me more about Cursor]
```

**LangGraph Pipeline:**
- [ ] Create `compareAssistantGraph`
- [ ] Nodes:
  - NeedsExtractor: parse user requirements
  - ToolMatcher: query tools matching criteria
  - RankingNode: score tools against requirements
  - RecommendationGenerator: format recommendations
  - ClarificationNode: ask follow-up questions if needed

**Requirement Schema:**
```typescript
interface UserRequirements {
  category?: string;
  maxPrice?: number;
  requiredFeatures?: string[];
  preferredFeatures?: string[];
  deployment?: string[];
  userType?: string;
}
```

**API:**
- [ ] Create `POST /api/assistant/compare` endpoint
- [ ] Request: `{ message: string, history: Message[], requirements: UserRequirements }`
- [ ] Response: `{ response: string, recommendations?: Tool[], clarifyingQuestion?: string }`

---

## EP-04-03: Stack Builder Assistant

**As a** user building a workflow
**I want** AI to suggest a complete tool stack
**So that** I get a cohesive setup

### Tasks

**Frontend:**
- [ ] Create route `/build-stack`
- [ ] Create `StackBuilder.tsx` component
- [ ] Guided wizard interface + chat hybrid
- [ ] Steps:
  1. Role/persona selection
  2. Primary use cases
  3. Budget constraints
  4. Preferences (cloud vs local, etc.)
- [ ] AI generates stack based on inputs
- [ ] Editable result: swap out tools
- [ ] Total cost display
- [ ] "Save this stack" for logged-in users
- [ ] Share stack URL

**Stack Output:**
- [ ] Create `GeneratedStack.tsx` component
- [ ] Categories: e.g., Coding, Design, Writing, Productivity
- [ ] Tool per category with reasoning
- [ ] Alternatives shown for each slot
- [ ] Integration notes (tools that work well together)

**LangGraph Pipeline:**
- [ ] Create `stackBuilderGraph`
- [ ] Nodes:
  - PersonaAnalyzer: understand user role and needs
  - CategorySelector: determine relevant tool categories
  - ToolSelector: pick best tool per category
  - IntegrationChecker: verify tools work together
  - StackFormatter: output final recommendation

**API:**
- [ ] Create `POST /api/assistant/build-stack` endpoint
- [ ] Request: wizard answers + optional chat history
- [ ] Response: `{ stack: StackRecommendation, reasoning: string }`

---

## EP-04-04: Search Intent Explanation

**As a** user after searching
**I want** to see why these results matched
**So that** I understand the AI's reasoning

### Tasks

**Frontend:**
- [ ] Create `IntentExplanation.tsx` component
- [ ] Placement: below search bar, above results
- [ ] Expandable panel (collapsed by default)
- [ ] Display:
  - Detected intent: "You're looking for code generation tools"
  - Key terms extracted: ["code", "completion", "AI"]
  - Categories matched: ["Code Generation", "Development"]
  - Filters applied: pricing, user type
- [ ] "Refine search" suggestions

**API Enhancement:**
- [ ] Modify `POST /api/search` response
- [ ] Add `intentExplanation` field:
  ```typescript
  {
    intent: string;
    extractedTerms: string[];
    matchedCategories: string[];
    confidence: number;
    refinementSuggestions: string[];
  }
  ```

**LangGraph Update:**
- [ ] Expose IntentExtractorNode output in response
- [ ] Add confidence scoring
- [ ] Generate refinement suggestions based on partial matches

---

## EP-04-05: Follow-up Questions

**As a** user viewing search results
**I want** suggested follow-up questions
**So that** I can refine my search

### Tasks

**Frontend:**
- [ ] Create `FollowUpQuestions.tsx` component
- [ ] Placement: below results or floating
- [ ] Display 3-4 clickable question chips
- [ ] One-click search with that question
- [ ] Animate transition to new results

**Question Generation:**
- [ ] Generate based on:
  - Original query + results
  - Common refinements for category
  - Unexplored filters (e.g., "Show only free options")
  - Comparison prompts ("Compare top 3")

**API:**
- [ ] Add to search response:
  ```typescript
  followUpQuestions: string[];
  ```
- [ ] LLM generates contextual questions
- [ ] Cache common follow-ups

**Examples:**
```
Query: "AI writing tools"
Follow-ups:
- "Show me only free AI writing tools"
- "Which ones are best for blog posts?"
- "Compare Jasper vs Copy.ai vs Writesonic"
- "AI writing tools with SEO features"
```

---

## EP-04-06: Tool Q&A Knowledge Base

**As a** user with a common question
**I want** to see pre-answered FAQs
**So that** I get instant answers

### Tasks

**Schema Update:**
- [ ] Add to tool model:
  ```typescript
  faqs: {
    question: string;
    answer: string;
    generatedAt: Date;
  }[];
  ```

**LLM Pipeline:**
- [ ] Create `scripts/enrichment/faq-generator.ts`
- [ ] Generate 5-10 common questions per tool:
  - "What is {tool}?"
  - "How much does {tool} cost?"
  - "Does {tool} have a free tier?"
  - "What are the main features of {tool}?"
  - "Who is {tool} best for?"
  - "Does {tool} integrate with X?"
- [ ] Answers based on tool data + scraped content
- [ ] Regenerate quarterly for freshness

**Frontend:**
- [ ] Create `FAQSection.tsx` component
- [ ] Accordion layout on tool detail page
- [ ] Schema.org FAQ markup for Google rich snippets
- [ ] "Ask a question" CTA linking to chat (EP-04-01)

**SEO:**
- [ ] FAQPage JSON-LD structured data
- [ ] Target FAQ-based searches ("does cursor work offline")

---

## EP-04-07: Natural Language Filters

**As a** user browsing
**I want** to type filter criteria naturally
**So that** I don't use complex filter UIs

### Tasks

**Frontend:**
- [ ] Create `NaturalFilterInput.tsx` component
- [ ] Text input with placeholder: "Try: free tools for video editing"
- [ ] Placement: above filter panel or replace search on category pages
- [ ] Show interpreted filters as chips
- [ ] "Edit filters" to switch to manual UI

**NLP Parsing:**
- [ ] Create filter parser in search-api
- [ ] Patterns to detect:
  - Pricing: "free", "under $20", "cheap", "premium"
  - Categories: map natural language to category taxonomy
  - Features: "with API", "offline support", "open source"
  - User types: "for developers", "for students"
- [ ] Use LLM for complex queries
- [ ] Fallback to keyword search if parsing fails

**API:**
- [ ] Create `POST /api/filters/parse` endpoint
- [ ] Request: `{ query: string }`
- [ ] Response: `{ filters: FilterObject, confidence: number }`

**Examples:**
```
Input: "free AI image generators"
Parsed: { pricing: "free", category: "Image Generation" }

Input: "coding tools under $30/month with vim support"
Parsed: { category: "Development", maxPrice: 30, features: ["Vim Support"] }
```

---

## EP-04-08: Explain Like I'm New

**As a** non-technical user
**I want** simplified explanations
**So that** I understand what tools do

### Tasks

**Frontend:**
- [ ] Create `SimplifyToggle.tsx` component
- [ ] Toggle button: "Explain Simply" / "Technical View"
- [ ] Placement: tool detail page, near description
- [ ] Smooth transition between views
- [ ] Remember preference in localStorage

**Content Generation:**
- [ ] Create simplified version of:
  - Description (no jargon)
  - Features (with analogies)
  - Use cases (concrete examples)
- [ ] Store in tool model: `simplifiedContent: { description, features, useCases }`
- [ ] Generate via LLM with prompt: "Explain to someone non-technical..."

**API:**
- [ ] Include simplified content in tool response
- [ ] Or generate on-demand (slower but fresher)

**Examples:**
```
Technical: "AI-powered code completion with multi-file context and LSP integration"

Simplified: "Like autocomplete for programmers, but much smarter.
It can look at your whole project to give better suggestions,
not just the file you're working on."
```

---

## Technical Architecture

**LangGraph Pipelines:**
```
Existing Search Pipeline (reuse):
├── IntentExtractor
├── QueryPlanner
└── QueryExecutor

New Pipelines:
├── ToolChatGraph (EP-04-01)
├── CompareAssistantGraph (EP-04-02)
├── StackBuilderGraph (EP-04-03)
└── FollowUpGenerator (EP-04-05)
```

**Streaming Responses:**
- Use Server-Sent Events (SSE) for chat features
- Frontend: EventSource API or fetch with ReadableStream
- Improves perceived performance

**Rate Limiting:**
- AI features more expensive than regular API
- Implement per-user rate limits
- Consider anonymous vs authenticated limits
- Queue system for high load

**Cost Management:**
- Track token usage per feature
- Set daily/monthly limits
- Consider caching common queries
- Use smaller models for simple tasks (intent parsing)
