"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intentExtractorNode = intentExtractorNode;
const intent_state_1 = require("../types/intent-state");
const models_1 = require("../config/models");
// Configuration for logging
const LOG_CONFIG = {
    enabled: process.env.NODE_ENV !== 'production',
    prefix: '🎯 Intent Extractor:',
};
// Helper function for conditional logging
const log = (message, data) => {
    if (LOG_CONFIG.enabled) {
        console.log(`${LOG_CONFIG.prefix} ${message}`, data ? data : '');
    }
};
const logError = (message, error) => {
    console.error(`${LOG_CONFIG.prefix} ERROR: ${message}`, error ? error : '');
};
/**
 * System prompt for intent extraction
 */
const INTENT_EXTRACTION_SYSTEM_PROMPT = `
You are an AI Intent Extractor for a search engine that helps users discover and compare AI tools and technologies (e.g., IDEs, APIs, frameworks, CLIs, agents).

Your task is to analyze the user query and produce a structured JSON object that conforms exactly to the provided IntentState schema.

Rules:
1. Use only the allowed enum values for fields like primaryGoal, comparisonMode, pricing, category, platform
2. If a value is unknown or not mentioned, return null or an empty array
3. Extract tool names exactly as mentioned (preserve casing)
4. For comparison queries, identify the reference tool and comparison mode
5. Extract pricing constraints (free, paid, cheaper, etc.)
6. Identify platform preferences (web, desktop, cli, api)
7. List any explicit features mentioned from the allowed features list
8. Generate 2-3 semantic variants of the query for search expansion
9. Provide a confidence score (0-1) based on query clarity

Examples:
- "free cli" → primaryGoal: "find", pricing: "free", platform: "cli"
- "Cursor alternative but cheaper" → primaryGoal: "find", referenceTool: "Cursor IDE", comparisonMode: "alternative_to", constraints: ["cheaper"]
- "Amazon Q vs GitHub Copilot" → primaryGoal: "compare", referenceTool: "Amazon Q", comparisonMode: "vs"

Enum Values:
- primaryGoal: "find", "compare", "recommend", "explore", "analyze", "explain"
- comparisonMode: "similar_to", "vs", "alternative_to"
- pricing: "free", "freemium", "paid", "enterprise"
- category: "IDE", "API", "CLI", "Framework", "Agent", "Plugin"
- platform: "web", "desktop", "cli", "api"
- features: "AI code assist", "local inference", "RAG support", "multi-agent orchestration", "LLM integration", "context awareness", "CLI mode", "open-source"

Respond with a JSON object only, no additional text.
`;
/**
 * IntentExtractorNode - LLM-based intent extraction using function calling
 *
 * Input: Raw user query from state
 * Output: Structured IntentState JSON with schema validation
 */
async function intentExtractorNode(state) {
    const { query } = state;
    if (!query || query.trim().length === 0) {
        logError('No query provided for intent extraction');
        return {
            intentState: null,
            errors: [
                ...(state.errors || []),
                {
                    node: "intent-extractor",
                    error: new Error("No query provided for intent extraction"),
                    timestamp: new Date(),
                    recovered: false
                }
            ]
        };
    }
    const startTime = Date.now();
    log('Starting intent extraction', { query: query.substring(0, 100) });
    try {
        // Create the user prompt
        const userPrompt = `Extract the intent from this query: "${query}"`;
        log('Sending request to LLM', {
            promptLength: userPrompt.length,
            model: process.env.VLLM_MODEL || 'unknown'
        });
        // Call the LLM
        const response = await models_1.chatVllmClient.invoke([
            { role: 'system', content: INTENT_EXTRACTION_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ]);
        log('LLM response received', {
            contentType: typeof response.content,
            responseLength: response.content?.length || 0
        });
        // Extract JSON from response
        let jsonText;
        if (typeof response.content === 'string') {
            jsonText = response.content.trim();
        }
        else {
            jsonText = JSON.stringify(response.content);
        }
        // Remove any markdown code blocks
        jsonText = jsonText.replace(/^```json\s*|\s*```$/g, '').trim();
        if (!jsonText || jsonText.length === 0) {
            throw new Error('Empty response from LLM');
        }
        log('Extracted JSON text', { length: jsonText.length });
        // Parse the JSON response
        let parsedIntent;
        try {
            parsedIntent = JSON.parse(jsonText);
            log('JSON parsed successfully', { keys: Object.keys(parsedIntent) });
        }
        catch (parseError) {
            // Try to fix common JSON issues
            const fixedJsonText = jsonText.replace(/,\s*([}\]])/g, '$1');
            try {
                parsedIntent = JSON.parse(fixedJsonText);
                log('JSON parsing issues fixed', {
                    originalLength: jsonText.length,
                    fixedLength: fixedJsonText.length
                });
            }
            catch (secondError) {
                throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
            }
        }
        // Validate against the schema
        const validationResult = intent_state_1.IntentStateSchema.safeParse(parsedIntent);
        if (!validationResult.success) {
            logError('Intent validation failed', {
                errors: validationResult.error.issues,
                intent: parsedIntent
            });
            throw new Error(`Intent validation failed: ${validationResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
        }
        const intentState = validationResult.data;
        const executionTime = Date.now() - startTime;
        log('Intent extraction completed successfully', {
            primaryGoal: intentState.primaryGoal,
            hasReferenceTool: !!intentState.referenceTool,
            confidence: intentState.confidence,
            executionTime
        });
        return {
            intentState,
            executionStats: {
                ...state.executionStats,
                nodeTimings: {
                    ...state.executionStats?.nodeTimings,
                    "intent-extractor": executionTime
                }
            },
            metadata: {
                ...state.metadata,
                executionPath: [...(state.metadata?.executionPath || []), "intent-extractor"],
                nodeExecutionTimes: {
                    ...state.metadata?.nodeExecutionTimes,
                    "intent-extractor": executionTime
                }
            }
        };
    }
    catch (error) {
        const executionTime = Date.now() - startTime;
        logError('Intent extraction failed', {
            error: error instanceof Error ? error.message : String(error),
            executionTime
        });
        return {
            intentState: null,
            errors: [
                ...(state.errors || []),
                {
                    node: "intent-extractor",
                    error: error instanceof Error ? error : new Error("Unknown error in intent extraction"),
                    timestamp: new Date(),
                    recovered: false,
                    recoveryStrategy: "Failed to extract intent - pipeline cannot continue"
                }
            ],
            executionStats: {
                ...state.executionStats,
                nodeTimings: {
                    ...state.executionStats?.nodeTimings,
                    "intent-extractor": executionTime
                }
            },
            metadata: {
                ...state.metadata,
                executionPath: [...(state.metadata?.executionPath || []), "intent-extractor"],
                nodeExecutionTimes: {
                    ...state.metadata?.nodeExecutionTimes,
                    "intent-extractor": executionTime
                }
            }
        };
    }
}
