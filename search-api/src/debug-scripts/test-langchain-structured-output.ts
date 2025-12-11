#!/usr/bin/env tsx

/**
 * Test LangChain's withStructuredOutput() method with VLLM
 * 
 * This script tests if we can replace the raw fetch approach with LangChain's
 * structured output capabilities for better type safety and error handling.
 *
 * HOW TO RUN:
 * cd search-api
 * npx tsx src/debug-scripts/test-langchain-structured-output.ts
 */

import dotenv from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';
import { IntentStateSchema } from '../types/intent-state.js';
import { CONFIG } from '../config/env.config.js';

// Load environment variables
dotenv.config();

const VLLM_BASE_URL = CONFIG.ai.VLLM_BASE_URL || "http://192.168.4.28:8000";
const VLLM_MODEL = CONFIG.ai.VLLM_MODEL;

console.log('🧪 Testing LangChain Structured Output with VLLM');
console.log('='.repeat(60));
console.log(`Base URL: ${VLLM_BASE_URL}`);
console.log(`Model: ${VLLM_MODEL}`);
console.log('='.repeat(60));

const INTENT_EXTRACTION_SYSTEM_PROMPT = `
You are an AI Intent Extractor for a search engine that helps users discover and compare AI tools and technologies.

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

const testCases = [
    "Cursor alternative but cheaper",    
];

async function testWithStructuredOutput() {
    console.log('\n🔬 Testing withStructuredOutput() method');

    try {
        // Initialize ChatOpenAI with VLLM
        const chatVllmClient = new ChatOpenAI({
            apiKey: "not-needed",
            configuration: {
                baseURL: `${VLLM_BASE_URL}/v1`,
            },
            modelName: VLLM_MODEL,
            temperature: 0.1,
            maxTokens: 500,
        });

        // Create structured output model
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const structuredModel = chatVllmClient.withStructuredOutput(IntentStateSchema as any);

        console.log('✅ Structured model created successfully');

        // Test each case
        for (let i = 0; i < testCases.length; i++) {
            const testQuery = testCases[i];
            console.log(`\n📝 Test ${i + 1}: "${testQuery}"`);
            console.log('-'.repeat(40));

            try {
                const startTime = Date.now();

                const result = await structuredModel.invoke([
                    { role: 'system', content: INTENT_EXTRACTION_SYSTEM_PROMPT },
                    { role: 'user', content: `Extract the intent from this query: "${testQuery}"` }
                ]);

                const executionTime = Date.now() - startTime;

                console.log('✅ Success!');
                console.log(`⏱️  Execution time: ${executionTime}ms`);
                console.log('📋 Result type:', typeof result);
                console.log('📋 Result keys:', Object.keys(result));
                console.log('📋 Sample values:');
                console.log(`   primaryGoal: ${result.primaryGoal}`);
                console.log(`   pricing: ${result.pricing}`);
                console.log(`   platform: ${result.platform}`);
                console.log(`   confidence: ${result.confidence}`);

                // Validate the result matches our schema
                const validated = IntentStateSchema.parse(result);
                console.log('✅ Schema validation passed', validated);
            } catch (error) {
                console.log('❌ Error:', error instanceof Error ? error.message : String(error));

                if (error instanceof Error && error.stack) {
                    console.log('Stack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
                }
            }
        }

    } catch (error) {
        console.log('❌ Setup error:', error instanceof Error ? error.message : String(error));
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _testJSONMode() {
    console.log('\n🔬 Testing JSON mode (fallback)');

    try {
        // Test with JSON mode as fallback
        const chatVllmClient = new ChatOpenAI({
            apiKey: "not-needed",
            configuration: {
                baseURL: `${VLLM_BASE_URL}/v1`,
            },
            modelName: VLLM_MODEL,
            temperature: 0.1,
            maxTokens: 500,
        });

        // Try JSON mode if available
        const jsonModeModel = chatVllmClient.bind({
            response_format: { type: "json_object" }
        });

        const testQuery = "free cli";
        console.log(`📝 Testing JSON mode with: "${testQuery}"`);

        const result = await jsonModeModel.invoke([
            { role: 'system', content: INTENT_EXTRACTION_SYSTEM_PROMPT },
            { role: 'user', content: `Extract the intent from this query: "${testQuery}"` }
        ]);

        console.log('✅ JSON mode response received');
        console.log('📋 Content type:', typeof result.content);
        console.log('📋 Content:', result.content);

        // Try to parse the JSON
        if (typeof result.content === 'string') {
            try {
                const parsed = JSON.parse(result.content);
                console.log('✅ JSON parsing successful');
                console.log('📋 Parsed keys:', Object.keys(parsed));
            } catch (e) {
                console.log('❌ JSON parsing failed:', e instanceof Error ? e.message : String(e));
            }
        }

    } catch (error) {
        console.log('❌ JSON mode error:', error instanceof Error ? error.message : String(error));
    }
}

async function main() {
    await testWithStructuredOutput();
    
    console.log('\n🎯 Summary');
    console.log('='.repeat(60));
    console.log('This test verifies if LangChain\'s structured output can replace');
    console.log('the current raw fetch implementation in intent-extractor.node.ts');
    console.log('='.repeat(60));
}

if (require.main === module) {
    main().catch(console.error);
}

export { main as testLangChainStructuredOutput };