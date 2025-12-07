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
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from 'zod';
import { IntentStateSchema, IntentState } from '../types/intent-state.js';

// Load environment variables
dotenv.config();

import { BaseOutputParser } from "@langchain/core/output_parsers";

// Custom parser to handle MLX's <think> tags and extract JSON
class MLXJsonOutputParser<T = any> extends BaseOutputParser<T> {
    lc_namespace = ["langchain", "output_parsers"];

    async parse(text: string): Promise<T> {
        // Remove <think> tags and their content
        const withoutThink = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

        // Extract JSON object (handles both with and without markdown code blocks)
        const jsonMatch = withoutThink.match(/```json\s*([\s\S]*?)\s*```/) ||
            withoutThink.match(/(\{[\s\S]*\})/);

        if (!jsonMatch) {
            throw new Error("No JSON found in response");
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0];

        try {
            return JSON.parse(jsonStr.trim());
        } catch (e) {
            throw new Error(`Failed to parse JSON: ${e.message}\n\nReceived: ${jsonStr}`);
        }
    }

    getFormatInstructions(): string {
        return `You must respond with valid JSON only. Do not include any explanatory text outside the JSON object.`;
    }
}

const VLLM_BASE_URL = "http://127.0.0.1:8080";
const VLLM_MODEL = "Qwen/Qwen3-0.6B";

console.log('🧪 Testing LangChain Structured Output with MLX');
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
            model: VLLM_MODEL,
        });

        const parser = new MLXJsonOutputParser();

        // Create structured output model        

        console.log('✅ Structured model created successfully');

        // Test each case
        for (let i = 0; i < testCases.length; i++) {
            const testQuery = testCases[i];
            console.log(`\n📝 Test ${i + 1}: "${testQuery}"`);
            console.log('-'.repeat(40));

            try {
                const startTime = Date.now();

                const messages = [
                    new SystemMessage(INTENT_EXTRACTION_SYSTEM_PROMPT),
                    new HumanMessage(`Extract the intent from this query: "${testQuery}"`),
                ];

                const result = await chatVllmClient.invoke(messages);
                const parsedResult = await parser.parse(result.content as string);
                console.log('📋 Parsed result:', parsedResult);

                const executionTime = Date.now() - startTime;

                console.log('✅ Success!');
                console.log(`⏱️  Execution time: ${executionTime}ms`);
                // console.log('📋 Result type:', typeof result);
                // console.log('📋 Result keys:', Object.keys(result));
                // console.log('📋 Sample values:');
                // // result
                // console.log(`result  content:`, result);

                // // Validate the result matches our schema
                // const validated = IntentStateSchema.parse(parsedResult);
                // console.log('✅ Schema validation passed', validated);
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