Perfect — this is the exact next piece your agentic system needs before you start implementing nodes or LLM-based extraction.
What we’ll create now is a **production-grade IntentState JSON Schema** plus **prompt + function-calling templates** so your `IntentExtractorNode` (LLM-based) can return *structured, schema-conforming* outputs every time.

---

# 🧠 IntentState JSON Schema Specification (v1.0)

This schema defines the structured intent representation extracted from a user query in your **AI Tools & Technologies Discovery** domain.

Save this file as:

```
schemas/intent-state.schema.json
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "intent-state.schema.json",
  "title": "IntentState",
  "description": "Structured representation of a user's search or discovery intent for AI tools and technologies.",
  "type": "object",
  "properties": {
    "primaryGoal": {
      "type": "string",
      "enum": ["find", "compare", "recommend", "explore", "analyze", "explain"],
      "description": "High-level intent category representing the user's purpose."
    },
    "referenceTool": {
      "type": ["string", "null"],
      "description": "Canonical tool name or ID used as a comparison or reference (e.g., 'Cursor IDE')."
    },
    "comparisonMode": {
      "type": ["string", "null"],
      "enum": ["similar_to", "vs", "alternative_to"],
      "description": "Specifies comparative relationship between tools."
    },
    "desiredFeatures": {
      "type": "array",
      "description": "List of specific feature tags the user cares about.",
      "items": {
        "type": "string",
        "enum": [
          "AI code assist",
          "local inference",
          "RAG support",
          "multi-agent orchestration",
          "LLM integration",
          "context awareness",
          "CLI mode",
          "open-source"
        ]
      }
    },
    "filters": {
      "type": "array",
      "description": "Structured filters derived from constraints or attributes.",
      "items": {
        "type": "object",
        "properties": {
          "field": { "type": "string" },
          "operator": { "type": "string", "enum": ["=", "<", ">", "<=", ">=", "contains"] },
          "value": {}
        },
        "required": ["field", "operator", "value"]
      }
    },
    "pricing": {
      "type": ["string", "null"],
      "enum": ["free", "freemium", "paid", "enterprise"],
      "description": "Primary pricing filter if explicitly mentioned."
    },
    "category": {
      "type": ["string", "null"],
      "enum": ["IDE", "API", "CLI", "Framework", "Agent", "Plugin"],
      "description": "Tool type category mentioned or implied."
    },
    "platform": {
      "type": ["string", "null"],
      "enum": ["web", "desktop", "cli", "api"],
      "description": "Platform or interface preference."
    },
    "semanticVariants": {
      "type": "array",
      "description": "List of paraphrased queries or search variants.",
      "items": { "type": "string" }
    },
    "constraints": {
      "type": "array",
      "description": "List of qualitative constraints ('cheaper', 'newer', 'simpler').",
      "items": { "type": "string" }
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Model-estimated confidence in this structured intent."
    }
  },
  "required": ["primaryGoal", "confidence"],
  "additionalProperties": false
}
```

---

# ⚙️ IntentExtractor Prompting Strategy

Your `IntentExtractorNode` will call an LLM (GPT, Gemini, Claude, etc.) in **function-calling** or **structured output** mode.

### 🧩 Core Prompt Template (system + user)

**System prompt:**

> You are an AI Intent Extractor for an agentic search engine that helps users discover and compare AI tools and technologies (e.g., IDEs, APIs, frameworks, CLIs, agents).
> Your task is to analyze the user query and produce a structured JSON object that conforms exactly to the provided `IntentState` schema.
> The schema defines canonical fields such as `primaryGoal`, `referenceTool`, `comparisonMode`, `desiredFeatures`, `filters`, and `pricing`.
> Use only the allowed enums and structures. If a value is unknown, return `null` or an empty array.
> Do not invent fields not listed in the schema.

**User message example:**

> User query: *"Similar of Cursor IDE but cheaper"*

---

### 🧠 Example Function-Calling Definition

(For OpenAI-style APIs)

```json
{
  "name": "extract_intent",
  "description": "Extracts structured intent for AI tools discovery based on a given query.",
  "parameters": {
    "type": "object",
    "properties": {
      "primaryGoal": {
        "type": "string",
        "enum": ["find", "compare", "recommend", "explore", "analyze", "explain"]
      },
      "referenceTool": {
        "type": ["string", "null"],
        "description": "Tool name or ID if mentioned."
      },
      "comparisonMode": {
        "type": ["string", "null"],
        "enum": ["similar_to", "vs", "alternative_to"]
      },
      "desiredFeatures": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "filters": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "field": { "type": "string" },
            "operator": { "type": "string" },
            "value": {}
          }
        }
      },
      "pricing": {
        "type": ["string", "null"],
        "enum": ["free", "freemium", "paid", "enterprise"]
      },
      "category": {
        "type": ["string", "null"],
        "enum": ["IDE", "API", "CLI", "Framework", "Agent", "Plugin"]
      },
      "platform": {
        "type": ["string", "null"],
        "enum": ["web", "desktop", "cli", "api"]
      },
      "semanticVariants": {
        "type": "array",
        "items": { "type": "string" }
      },
      "constraints": {
        "type": "array",
        "items": { "type": "string" }
      },
      "confidence": {
        "type": "number"
      }
    },
    "required": ["primaryGoal", "confidence"]
  }
}
```

When calling the LLM, you’ll send both the **system instruction**, the **user query**, and this function definition.
The model will respond with a `function_call` containing JSON that directly matches the schema.

---

# 🧪 Example: Function Output for Domain Queries

### Example 1: “Similar of Cursor IDE but cheaper”

```json
{
  "primaryGoal": "find",
  "referenceTool": "Cursor IDE",
  "comparisonMode": "similar_to",
  "desiredFeatures": ["AI code assist"],
  "filters": [
    { "field": "category", "operator": "=", "value": "IDE" },
    { "field": "price", "operator": "<", "value": "Cursor IDE" }
  ],
  "pricing": "paid",
  "category": "IDE",
  "platform": "desktop",
  "semanticVariants": [
    "alternatives to Cursor IDE that cost less",
    "cheap AI IDEs like Cursor"
  ],
  "constraints": ["cheaper"],
  "confidence": 0.95
}
```

### Example 2: “Free CLI”

```json
{
  "primaryGoal": "find",
  "referenceTool": null,
  "comparisonMode": null,
  "desiredFeatures": ["CLI mode"],
  "filters": [
    { "field": "pricing", "operator": "=", "value": "free" },
    { "field": "platform", "operator": "=", "value": "cli" }
  ],
  "pricing": "free",
  "category": "CLI",
  "platform": "cli",
  "semanticVariants": [
    "free AI command line tools",
    "open-source AI CLI utilities"
  ],
  "constraints": [],
  "confidence": 0.91
}
```

---

# ⚙️ Node Implementation Hint (LLM Output Handling)

Your `IntentExtractorNode` will:

1. Send the query and schema to the LLM using function-calling mode.
2. Parse and validate the JSON output against `intent-state.schema.json` (using AJV or Zod).
3. Write the result into `state.intentState`.

**Example (pseudo-code):**

```ts
import { OpenAI } from "openai";
import Ajv from "ajv";
import schema from "../schemas/intent-state.schema.json";

export class IntentExtractorNode {
  async execute(state: UnifiedState): Promise<UnifiedState> {
    const query = state.request.query;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query }
      ],
      functions: [extract_intent_definition],
      function_call: { name: "extract_intent" }
    });

    const data = JSON.parse(completion.choices[0].message.function_call.arguments);

    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    if (!validate(data)) throw new Error("Intent extraction failed schema validation");

    state.intentState = data;
    return state;
  }
}
```

---

# 🧩 Why This Design Works

| Layer                    | Role                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| **Schema**               | Defines the universal contract for intent understanding across all graphs                           |
| **Prompt template**      | Guides LLM reasoning toward correct slots and enums                                                 |
| **Function-call schema** | Enforces structural determinism and API-friendly validation                                         |
| **Validator**            | Guarantees consistency and auditability                                                             |
| **Downstream usage**     | The `QueryPlanner` can directly read fields like `comparisonMode`, `filters`, and `desiredFeatures` |

This makes your Intent Graph **LLM-augmented but schema-governed**, giving you maximum reliability and easy downstream integration.

