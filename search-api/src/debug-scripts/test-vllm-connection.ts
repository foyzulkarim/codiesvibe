#!/usr/bin/env tsx

/**
 * Debug script to test VLLM connection and API calls
 *
 * HOW TO RUN:
 * cd search-api
 * npx tsx src/debug-scripts/test-vllm-connection.ts
 */

import dotenv from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';
import { CONFIG } from '../config/env.config.js';

// Load environment variables
dotenv.config();

// Configuration
const VLLM_BASE_URL = CONFIG.ai.VLLM_BASE_URL || "http://192.168.4.28:8000";
const VLLM_MODEL = CONFIG.ai.VLLM_MODEL;

console.log('🔍 VLLM Connection Debug Script');
console.log('='.repeat(50));
console.log(`Base URL: ${VLLM_BASE_URL}`);
console.log(`Model: ${VLLM_MODEL}`);
console.log('='.repeat(50));

/**
 * Test 1: Basic HTTP connectivity
 */
async function testHttpConnection() {
  console.log('\n📡 Test 1: HTTP Connectivity');

  try {
    const response = await fetch(`${VLLM_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`  Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      // VLLM health endpoint might return plain text, not JSON
      const contentType = response.headers.get('content-type');
      console.log(`  Content-Type: ${contentType}`);

      if (contentType?.includes('application/json')) {
        const health = await response.json();
        console.log('  ✅ Health check passed (JSON):', health);
      } else {
        const healthText = await response.text();
        console.log('  ✅ Health check passed (text):', healthText.substring(0, 100));
      }
      return true;
    } else {
      console.log('  ❌ Health check failed');
      const errorText = await response.text();
      console.log('  Error:', errorText);
      return false;
    }
  } catch (error) {
    console.log('  ❌ Connection failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Test 2: VLLM OpenAI-compatible API endpoint
 */
async function testVLLMApiEndpoint() {
  console.log('\n🤖 Test 2: VLLM OpenAI-compatible API');

  try {
    const response = await fetch(`${VLLM_BASE_URL}/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`  Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const models = await response.json();
      console.log('  ✅ Models endpoint working');
      console.log('  Available models:', models);
      return true;
    } else {
      console.log('  ❌ Models endpoint failed');
      const errorText = await response.text();
      console.log('  Error:', errorText);
      return false;
    }
  } catch (error) {
    console.log('  ❌ API endpoint failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Test 3: Simple chat completion using fetch
 */
async function testChatCompletionWithFetch() {
  console.log('\n💬 Test 3: Chat Completion (raw fetch)');

  try {
    const payload = {
      model: VLLM_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello VLLM!"' }
      ],
      temperature: 0.1,
      max_tokens: 50,
    };

    console.log('  Sending request to:', `${VLLM_BASE_URL}/v1/chat/completions`);
    console.log('  Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${VLLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`  Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log('  ✅ Chat completion successful');
      console.log('  Response:', result);
      return true;
    } else {
      console.log('  ❌ Chat completion failed');
      const errorText = await response.text();
      console.log('  Error:', errorText);
      return false;
    }
  } catch (error) {
    console.log('  ❌ Chat completion error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Test 4: LangChain ChatOpenAI client (same as intent extractor)
 */
async function testLangChainClient() {
  console.log('\n🔗 Test 4: LangChain ChatOpenAI Client');

  try {
    console.log('  Creating ChatOpenAI client...');
    const chatVllmClient = new ChatOpenAI({
      apiKey: "not-needed", // vLLM doesn't require an API key
      configuration: {
        baseURL: `${VLLM_BASE_URL}/v1`,
      },
      modelName: VLLM_MODEL,
      temperature: 0.1,
      maxTokens: 100,
    });

    console.log('  Invoking LangChain client...');
    const response = await chatVllmClient.invoke([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say "Hello LangChain VLLM!"' }
    ]);

    console.log('  ✅ LangChain client successful');
    console.log('  Response:', response.content);
    console.log('  Response type:', typeof response.content);
    return true;
  } catch (error) {
    console.log('  ❌ LangChain client failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.log('  Stack trace:', error.stack);
    }
    return false;
  }
}

/**
 * Test 5: Test the exact same prompt as intent extractor
 */
async function testIntentExtractionPrompt() {
  console.log('\n🎯 Test 5: Intent Extraction Prompt (exact same as node)');

  try {
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

    const chatVllmClient = new ChatOpenAI({
      apiKey: "not-needed",
      configuration: {
        baseURL: `${VLLM_BASE_URL}/v1`,
      },
      modelName: VLLM_MODEL,
      temperature: 0.1,
      maxTokens: 500,
    });

    const testQuery = "free cli";
    console.log(`  Testing query: "${testQuery}"`);

    const response = await chatVllmClient.invoke([
      { role: 'system', content: INTENT_EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: `Extract the intent from this query: "${testQuery}"` }
    ]);

    console.log('  ✅ Intent extraction prompt successful');
    console.log('  Response:', response.content);
    console.log('  Response type:', typeof response.content);
    return true;
  } catch (error) {
    console.log('  ❌ Intent extraction prompt failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.log('  Stack trace:', error.stack);
    }
    return false;
  }
}

/**
 * Main test runner
 */
async function main() {
  const results = {
    httpConnection: await testHttpConnection(),
    apiEndpoint: await testVLLMApiEndpoint(),
    chatCompletion: await testChatCompletionWithFetch(),
    langChainClient: await testLangChainClient(),
    intentExtraction: await testIntentExtractionPrompt(),
  };

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').replace(/^ /, '');
    console.log(`${status} ${testName}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n📊 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All VLLM connection tests passed!');
    console.log('✅ Your VLLM server is working correctly');
    console.log('✅ The intent extractor should work fine');
  } else {
    console.log('❌ Some VLLM connection tests failed');
    console.log('🔧 Check the failed tests above to identify the issue');

    if (!results.httpConnection) {
      console.log('💡 Suggestion: Check if VLLM server is running and accessible');
    }
    if (!results.apiEndpoint) {
      console.log('💡 Suggestion: Check if VLLM is configured with OpenAI-compatible API');
    }
    if (!results.chatCompletion) {
      console.log('💡 Suggestion: Check model name and VLLM configuration');
    }
    if (!results.langChainClient) {
      console.log('💡 Suggestion: Check LangChain and OpenAI client configuration');
    }
  }
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

export { main as testVLLMConnection };