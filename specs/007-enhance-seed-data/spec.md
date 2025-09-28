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
    "pricingModel": "subscription"
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
      "multimodal": false
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
      "protocols": ["REST API", "WebSocket"]
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
  "technical": {
    "deployment": ["Cloud"],
    "languages": ["English", "Spanish", "French", "German", "Chinese"],
    "compliance": ["GDPR", "SOC2"],
    "uptime": 99.9,
    "latency": "low"
  },
  "metrics": {
    "popularity": 95,
    "rating": 4.5,
    "reviewCount": 2500,
    "userCount": "100M+",
    "adoptionRate": "high"
  },
  "comparison": {
    "pros": ["Easy to use", "Versatile", "Good responses", "Wide language support"],
    "cons": ["Can be inaccurate", "Limited context", "Subscription cost for premium"],
    "bestFor": ["General AI assistance", "Content creation", "Learning"],
    "alternatives": ["claude", "gemini", "copilot"]
  },
  "logoUrl": "https://example.com/chatgpt-logo.png",
  "website": "https://chat.openai.com",
  "documentation": "https://platform.openai.com/docs",
  "status": "active",
  "contributor": "system",
  "dateAdded": "2025-09-14T08:40:00Z",
  "lastUpdated": "2025-09-14T08:40:00Z",
  "rag": {
    "contextWeight": 0.9,
    "searchRelevance": ["high", "medium", "low"],
    "contentTypes": ["conversational", "generative", "assistive"],
    "domainExpertise": ["general", "technical", "creative"]
  }
}
```

## Field Definitions

### Core Identity Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the tool |
| `name` | string | Yes | Display name of the tool |
| `slug` | string | Yes | SEO-friendly URL identifier |
| `description` | string | Yes | Short description (max 200 chars) |
| `longDescription` | string | Yes | Detailed description |
| `tagline` | string | No | Marketing tagline or slogan |

### Categories

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `primary` | array[string] | Yes | Primary category tags |
| `secondary` | array[string] | No | Secondary category tags |
| `industries` | array[string] | Yes | Target industries |
| `userTypes` | array[string] | Yes | Target user types |

### Pricing Summary

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lowestMonthlyPrice` | number | Yes | Lowest monthly price |
| `highestMonthlyPrice` | number | Yes | Highest monthly price |
| `currency` | string | Yes | Currency code (ISO 4217) |
| `hasFreeTier` | boolean | Yes | Whether free tier exists |
| `hasCustomPricing` | boolean | Yes | Whether custom pricing available |
| `billingPeriods` | array[string] | Yes | Available billing periods |
| `pricingModel` | string | Yes | Pricing model type |

#### Pricing Model Values
- `subscription` - Recurring subscription
- `one-time` - One-time purchase
- `freemium` - Free with paid upgrades
- `usage-based` - Pay per use
- `custom` - Custom pricing

### Pricing Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique plan identifier |
| `name` | string | Yes | Plan display name |
| `price` | number | Yes | Plan price |
| `billing` | string | Yes | Billing period |
| `annualDiscount` | number | No | Annual discount percentage |
| `features` | array[string] | Yes | Features included |
| `limitations` | array[string] | Yes | Plan limitations |
| `maxUsers` | number | Yes | Maximum users allowed |
| `isPopular` | boolean | Yes | Whether this is popular plan |
| `sortOrder` | number | Yes | Display order |

### Capabilities

#### Core Capabilities
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `core` | array[string] | Yes | Core functionality list |

#### AI Features
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `codeGeneration` | boolean | Yes | Can generate code |
| `imageGeneration` | boolean | Yes | Can generate images |
| `dataAnalysis` | boolean | Yes | Can analyze data |
| `voiceInteraction` | boolean | Yes | Supports voice interaction |
| `multimodal` | boolean | Yes | Supports multiple input types |

#### Technical Features
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiAccess` | boolean | Yes | Has API access |
| `webHooks` | boolean | Yes | Supports webhooks |
| `sdkAvailable` | boolean | Yes | SDK available |
| `offlineMode` | boolean | Yes | Works offline |

#### Integrations
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platforms` | array[string] | Yes | Supported platforms |
| `thirdParty` | array[string] | Yes | Third-party integrations |
| `protocols` | array[string] | Yes | Supported protocols |

### Use Cases

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Use case name |
| `description` | string | Yes | Detailed description |
| `industries` | array[string] | Yes | Applicable industries |
| `userTypes` | array[string] | Yes | Target user types |
| `scenarios` | array[string] | Yes | Specific scenarios |
| `complexity` | string | Yes | Complexity level |

#### Complexity Values
- `beginner` - Easy to use, minimal setup
- `intermediate` - Some experience required
- `advanced` - Expert knowledge needed

### Search Optimization

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `searchKeywords` | array[string] | Yes | Keywords for search |
| `semanticTags` | array[string] | Yes | Semantic search tags |
| `aliases` | array[string] | Yes | Alternative names |

### Technical Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deployment` | array[string] | Yes | Deployment options |
| `languages` | array[string] | Yes | Supported languages |
| `compliance` | array[string] | Yes | Compliance standards |
| `uptime` | number | No | Uptime percentage |
| `latency` | string | No | Latency level |

#### Latency Values
- `low` - < 100ms
- `medium` - 100-500ms
- `high` - > 500ms

### Metrics

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `popularity` | number | Yes | Popularity score (0-100) |
| `rating` | number | Yes | Average rating (0-5) |
| `reviewCount` | number | Yes | Number of reviews |
| `userCount` | string | No | User count estimate |
| `adoptionRate` | string | No | Adoption rate level |

#### Adoption Rate Values
- `low` - Niche adoption
- `medium` - Growing adoption
- `high` - Widespread adoption

### Comparison Data

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pros` | array[string] | Yes | Advantages |
| `cons` | array[string] | Yes | Disadvantages |
| `bestFor` | array[string] | Yes | Best use cases |
| `alternatives` | array[string] | Yes | Alternative tools |

### Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `logoUrl` | string | No | Logo image URL |
| `website` | string | No | Official website URL |
| `documentation` | string | No | Documentation URL |
| `status` | string | Yes | Tool status |
| `contributor` | string | Yes | Data contributor |
| `dateAdded` | string | Yes | Date added to database |
| `lastUpdated` | string | Yes | Last update timestamp |

#### Status Values
- `active` - Currently available
- `beta` - In beta testing
- `deprecated` - No longer maintained
- `discontinued` - No longer available

### RAG Optimization

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contextWeight` | number | Yes | Importance for RAG (0-1) |
| `searchRelevance` | array[string] | Yes | Relevance categories |
| `contentTypes` | array[string] | Yes | Content type classifications |
| `domainExpertise` | array[string] | Yes | Domain expertise areas |

#### Content Types
- `conversational` - Dialogue and conversation
- `generative` - Content generation
- `assistive` - Assistance and support
- `analytical` - Data analysis
- `creative` - Creative content

#### Domain Expertise
- `general` - General purpose
- `technical` - Technical/programming
- `creative` - Creative/arts
- `business` - Business/enterprise
- `academic` - Academic/research

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "version": {
      "type": "number",
      "minimum": 2.0,
      "maximum": 2.0
    },
    "lastUpdated": {
      "type": "string",
      "format": "date-time"
    },
    "schema": {
      "type": "string",
      "enum": ["tools-v2.0"]
    },
    "tools": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "name": {"type": "string"},
          "slug": {"type": "string"},
          "description": {"type": "string"},
          "longDescription": {"type": "string"},
          "tagline": {"type": "string"},
          "categories": {
            "type": "object",
            "properties": {
              "primary": {"type": "array", "items": {"type": "string"}},
              "secondary": {"type": "array", "items": {"type": "string"}},
              "industries": {"type": "array", "items": {"type": "string"}},
              "userTypes": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["primary", "industries", "userTypes"]
          },
          "pricingSummary": {
            "type": "object",
            "properties": {
              "lowestMonthlyPrice": {"type": "number", "minimum": 0},
              "highestMonthlyPrice": {"type": "number", "minimum": 0},
              "currency": {"type": "string", "pattern": "^[A-Z]{3}$"},
              "hasFreeTier": {"type": "boolean"},
              "hasCustomPricing": {"type": "boolean"},
              "billingPeriods": {"type": "array", "items": {"type": "string"}},
              "pricingModel": {"type": "string", "enum": ["subscription", "one-time", "freemium", "usage-based", "custom"]}
            },
            "required": ["lowestMonthlyPrice", "highestMonthlyPrice", "currency", "hasFreeTier", "hasCustomPricing", "billingPeriods", "pricingModel"]
          },
          "pricingDetails": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {"type": "string"},
                "name": {"type": "string"},
                "price": {"type": "number", "minimum": 0},
                "billing": {"type": "string"},
                "annualDiscount": {"type": "number", "minimum": 0, "maximum": 100},
                "features": {"type": "array", "items": {"type": "string"}},
                "limitations": {"type": "array", "items": {"type": "string"}},
                "maxUsers": {"type": "number", "minimum": 1},
                "isPopular": {"type": "boolean"},
                "sortOrder": {"type": "number", "minimum": 1}
              },
              "required": ["id", "name", "price", "billing", "features", "limitations", "maxUsers", "isPopular", "sortOrder"]
            }
          },
          "capabilities": {
            "type": "object",
            "properties": {
              "core": {"type": "array", "items": {"type": "string"}},
              "aiFeatures": {
                "type": "object",
                "properties": {
                  "codeGeneration": {"type": "boolean"},
                  "imageGeneration": {"type": "boolean"},
                  "dataAnalysis": {"type": "boolean"},
                  "voiceInteraction": {"type": "boolean"},
                  "multimodal": {"type": "boolean"}
                },
                "required": ["codeGeneration", "imageGeneration", "dataAnalysis", "voiceInteraction", "multimodal"]
              },
              "technical": {
                "type": "object",
                "properties": {
                  "apiAccess": {"type": "boolean"},
                  "webHooks": {"type": "boolean"},
                  "sdkAvailable": {"type": "boolean"},
                  "offlineMode": {"type": "boolean"}
                },
                "required": ["apiAccess", "webHooks", "sdkAvailable", "offlineMode"]
              },
              "integrations": {
                "type": "object",
                "properties": {
                  "platforms": {"type": "array", "items": {"type": "string"}},
                  "thirdParty": {"type": "array", "items": {"type": "string"}},
                  "protocols": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["platforms", "thirdParty", "protocols"]
              }
            },
            "required": ["core", "aiFeatures", "technical", "integrations"]
          },
          "useCases": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
                "industries": {"type": "array", "items": {"type": "string"}},
                "userTypes": {"type": "array", "items": {"type": "string"}},
                "scenarios": {"type": "array", "items": {"type": "string"}},
                "complexity": {"type": "string", "enum": ["beginner", "intermediate", "advanced"]}
              },
              "required": ["name", "description", "industries", "userTypes", "scenarios", "complexity"]
            }
          },
          "searchKeywords": {"type": "array", "items": {"type": "string"}},
          "semanticTags": {"type": "array", "items": {"type": "string"}},
          "aliases": {"type": "array", "items": {"type": "string"}},
          "technical": {
            "type": "object",
            "properties": {
              "deployment": {"type": "array", "items": {"type": "string"}},
              "languages": {"type": "array", "items": {"type": "string"}},
              "compliance": {"type": "array", "items": {"type": "string"}},
              "uptime": {"type": "number", "minimum": 0, "maximum": 100},
              "latency": {"type": "string", "enum": ["low", "medium", "high"]}
            },
            "required": ["deployment", "languages", "compliance"]
          },
          "metrics": {
            "type": "object",
            "properties": {
              "popularity": {"type": "number", "minimum": 0, "maximum": 100},
              "rating": {"type": "number", "minimum": 0, "maximum": 5},
              "reviewCount": {"type": "number", "minimum": 0},
              "userCount": {"type": "string"},
              "adoptionRate": {"type": "string", "enum": ["low", "medium", "high"]}
            },
            "required": ["popularity", "rating", "reviewCount"]
          },
          "comparison": {
            "type": "object",
            "properties": {
              "pros": {"type": "array", "items": {"type": "string"}},
              "cons": {"type": "array", "items": {"type": "string"}},
              "bestFor": {"type": "array", "items": {"type": "string"}},
              "alternatives": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["pros", "cons", "bestFor", "alternatives"]
          },
          "logoUrl": {"type": "string", "format": "uri"},
          "website": {"type": "string", "format": "uri"},
          "documentation": {"type": "string", "format": "uri"},
          "status": {"type": "string", "enum": ["active", "beta", "deprecated", "discontinued"]},
          "contributor": {"type": "string"},
          "dateAdded": {"type": "string", "format": "date-time"},
          "lastUpdated": {"type": "string", "format": "date-time"},
          "rag": {
            "type": "object",
            "properties": {
              "contextWeight": {"type": "number", "minimum": 0, "maximum": 1},
              "searchRelevance": {"type": "array", "items": {"type": "string"}},
              "contentTypes": {"type": "array", "items": {"type": "string"}},
              "domainExpertise": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["contextWeight", "searchRelevance", "contentTypes", "domainExpertise"]
          }
        },
        "required": ["id", "name", "slug", "description", "longDescription", "categories", "pricingSummary", "pricingDetails", "capabilities", "useCases", "searchKeywords", "semanticTags", "aliases", "technical", "metrics", "comparison", "status", "contributor", "dateAdded", "lastUpdated", "rag"]
      }
    }
  },
  "required": ["version", "lastUpdated", "schema", "tools"]
}
```

## RAG Optimization Guidelines

### Context Weight Calculation

The `contextWeight` field should be calculated based on:
- **Data completeness** (40%): How complete and detailed the tool information is
- **Relevance to search queries** (30%): How well the tool matches common search patterns
- **Quality of metadata** (20%): Richness of categorization and use case information
- **User engagement** (10%): Popularity and usage metrics

### Semantic Tagging Strategy

Semantic tags should follow these patterns:
- **Function-based**: "code generation", "data analysis", "content creation"
- **Technology-based**: "machine learning", "natural language processing", "computer vision"
- **Domain-specific**: "software development", "content marketing", "academic research"
- **Use-case specific**: "automated testing", "documentation generation", "code review"

### Content Type Classification

Tools should be classified by their primary content interaction type:
- **Conversational**: Tools that engage in dialogue
- **Generative**: Tools that create new content
- **Assistive**: Tools that help with tasks
- **Analytical**: Tools that process and analyze data
- **Creative**: Tools focused on creative output

## Search and Filtering Strategy

### Indexable Fields

The following fields should be indexed for search:
- **Full-text search**: `name`, `description`, `longDescription`, `tagline`
- **Keyword search**: `searchKeywords`, `semanticTags`, `aliases`
- **Filterable fields**: All array fields in `categories`, `capabilities`, `technical`
- **Range filters**: `pricingSummary.*`, `metrics.*`, `rag.contextWeight`

### Filter Optimization

Filters should be optimized for:
- **Multi-select filters**: Categories, industries, user types, capabilities
- **Range filters**: Price, rating, popularity, uptime
- **Boolean filters**: Free tier, API access, specific features
- **Hierarchical filters**: Primary → secondary categories

## Migration Strategy

### v1.0 to v2.0 Field Mapping

| v1.0 Field | v2.0 Field | Transformation |
|------------|------------|----------------|
| `id` | `id` | Direct mapping |
| `name` | `name` | Direct mapping |
| `description` | `description` | Direct mapping |
| `longDescription` | `longDescription` | Direct mapping |
| `pricing` | `pricingSummary` | Convert array to structured object |
| `interface` | `capabilities.integrations.platforms` | Map to platforms |
| `functionality` | `capabilities.core` | Direct mapping |
| `deployment` | `technical.deployment` | Direct mapping |
| `popularity` | `metrics.popularity` | Direct mapping |
| `rating` | `metrics.rating` | Direct mapping |
| `reviewCount` | `metrics.reviewCount` | Direct mapping |
| `logoUrl` | `logoUrl` | Direct mapping |
| `features` | `capabilities` | Restructure into capabilities object |
| `searchKeywords` | `searchKeywords` | Direct mapping |
| `tags` | `categories` | Convert to categories structure |
| `integrations` | `capabilities.integrations.thirdParty` | Map to thirdParty |
| `languages` | `technical.languages` | Direct mapping |
| `pros` | `comparison.pros` | Direct mapping |
| `cons` | `comparison.cons` | Direct mapping |
| `useCases` | `useCases` | Enhance with additional fields |
| `contributor` | `contributor` | Direct mapping |
| `dateAdded` | `dateAdded` | Direct mapping |

### Data Enrichment Procedures

1. **Generate slugs**: Create URL-friendly slugs from names
2. **Enhance use cases**: Add descriptions, scenarios, and complexity levels
3. **Add semantic tags**: Generate based on tool descriptions and capabilities
4. **Calculate context weights**: Implement weight calculation algorithm
5. **Add technical details**: Enrich with deployment, compliance, and performance data
6. **Create aliases**: Generate alternative names and common variations

## Validation and Quality Assurance

### Automated Validation

- **Schema validation**: Use JSON Schema to validate structure
- **Data type validation**: Ensure all fields match expected types
- **Required field validation**: Check all required fields are present
- **Enum validation**: Verify enum values are valid
- **Format validation**: Check URLs, dates, and other formatted fields

### Manual Quality Checks

- **Data accuracy**: Verify tool information is current and accurate
- **Completeness**: Ensure comprehensive coverage of tool features
- **Consistency**: Check for consistent naming and categorization
- **Relevance**: Ensure tags and keywords are relevant to the tool
- **Clarity**: Verify descriptions are clear and informative

## Success Criteria

### Technical Success
- [ ] All existing tools successfully migrated to v2.0 schema
- [ ] JSON Schema validation passes for all tools
- [ ] No data loss during migration
- [ ] Performance benchmarks met for search operations

### Functional Success
- [ ] Enhanced search capabilities implemented
- [ ] Advanced filtering options available
- [ ] RAG performance improved by 30%+
- [ ] User satisfaction with new features

### Business Success
- [ ] Increased tool discovery rate
- [ ] Improved user engagement metrics
- [ ] Better AI assistant performance
- [ ] Enhanced competitive positioning

## Future Considerations

### Scalability
- Design for horizontal scaling of tool database
- Consider sharding strategies for large tool datasets
- Plan for distributed search architecture

### Extensibility
- Design schema to accommodate future tool types
- Consider plugin architecture for specialized tool categories
- Plan for internationalization and localization

### Performance
- Implement caching strategies for frequently accessed tools
- Consider materialized views for common filter combinations
- Plan for search query optimization
