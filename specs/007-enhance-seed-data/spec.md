# Tools Data Structure v2.0 Specification

## Overview

This specification defines the enhanced data structure for tools data, optimized for search capabilities, filtering, comparison, and Retrieval-Augmented Generation (RAG). The new structure provides rich, structured metadata that enables better AI understanding and user discovery of tools.

## Version Information

- **Schema Version**: 2.0
- **Schema Name**: tools-v2.0
- **Last Updated**: 2025-09-14T08:40:00Z
- **Status**: Proposed

## Root Structure

```json
{
  "version": 2.0,
  "lastUpdated": "2025-09-14T08:40:00Z",
  "schema": "tools-v2.0",
  "tools": []
}
```

### Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | number | Yes | Schema version number |
| `lastUpdated` | string | Yes | ISO 8601 timestamp of last update |
| `schema` | string | Yes | Schema identifier for validation |
| `tools` | array | Yes | Array of tool objects |

## Tool Object Structure

```json
{
  "id": "chatgpt",
  "name": "ChatGPT",
  "slug": "chatgpt",
  "description": "Advanced AI chatbot for natural conversations and assistance",
  "longDescription": "ChatGPT is an advanced language model developed by OpenAI...",
  "tagline": "Your AI conversation partner",
  "categories": {
    "primary": ["AI", "Chatbot"],
    "secondary": ["Productivity", "Communication"],
    "industries": ["Technology", "Education", "Healthcare", "Finance"],
    "userTypes": ["Developers", "Content Creators", "Students", "Professionals"]
  },
  "pricingSummary": {
    "lowestMonthlyPrice": 0,
    "highestMonthlyPrice": 20,
    "currency": "USD",
    "hasFreeTier": true,
    "hasCustomPricing": false,
    "billingPeriods": ["month", "year"],
    "pricingModel": ["subscription", "token based"]
  },
  "pricingDetails": [
    {
      "id": "free",
      "name": "Free Tier",
      "price": 0,
      "billing": "month",
      "features": ["Basic chat access", "Limited responses"],
      "limitations": ["Rate limits", "No GPT-4 access"],
      "maxUsers": 1,
      "isPopular": false,
      "sortOrder": 1
    }
  ],
  "capabilities": {
    "core": ["Text Generation", "Conversation", "Question Answering"],
    "aiFeatures": {
      "codeGeneration": true,
      "imageGeneration": false,
      "dataAnalysis": true,
      "voiceInteraction": false,
      "multimodal": false,
      "thinkingMode": true,
    },
    "technical": {
      "apiAccess": true,
      "webHooks": false,
      "sdkAvailable": true,
      "offlineMode": false
    },
    "integrations": {
      "platforms": ["Web", "Mobile", "API"],
      "thirdParty": ["Slack", "Discord", "Zapier"],
      "protocols": ["REST API", "WebSocket"],
    }
  },
  "useCases": [
    {
      "name": "Writing assistance",
      "description": "Help with content creation, editing, and optimization",
      "industries": ["Content", "Marketing", "Education", "Publishing"],
      "userTypes": ["Writers", "Students", "Professionals", "Marketers"],
      "scenarios": ["Blog writing", "Email drafting", "Academic papers"],
      "complexity": "beginner"
    }
  ],
  "searchKeywords": ["chatbot", "AI", "conversation", "GPT", "OpenAI", "LLM"],
  "semanticTags": ["natural language processing", "machine learning", "conversational ai"],
  "aliases": ["OpenAI ChatGPT", "GPT-4", "Chat GPT"],
  "logoUrl": "https://example.com/chatgpt-logo.png",
  "website": "https://chat.openai.com",
  "pricingUrl": "https://chatgpt.com/pricing",
  "documentation": "https://platform.openai.com/docs",
  "status": "active",
  "contributor": "system",
  "dateAdded": "2025-09-14T08:40:00Z",
  "lastUpdated": "2025-09-14T08:40:00Z"
}
```
