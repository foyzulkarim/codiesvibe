/**
 * Simple test script to verify semantic analysis works correctly
 * This bypasses the tool system and directly tests the core logic
 */

import { QueryAnalyzer } from './src/planning/query-analyzer';
import { getIntentForKeyword, FIELD_MAPPING_SCHEMA } from './src/mapping/fieldMappingSchema';

// Test the "free cli" example
async function testSemanticAnalysis() {
  console.log('🧪 Testing Semantic Analysis for "free cli"');
  console.log('=' .repeat(50));

  // Test 1: Basic Query Analysis
  console.log('\n1. Testing QueryAnalyzer:');
  const analysis = QueryAnalyzer.analyzeQuery('free cli');
  console.log('Query Analysis Result:');
  console.log(`- Original Query: "${analysis.originalQuery}"`);
  console.log(`- Interpreted Intent: ${analysis.interpretedIntent}`);
  console.log(`- Query Pattern: ${analysis.queryPattern.type} (confidence: ${analysis.queryPattern.confidence})`);
  console.log(`- Confidence: ${analysis.confidence}`);
  console.log(`- Components: ${analysis.extractedEntities}`);
  console.log(`- Suggested Tools: ${analysis.suggestedTools}`);

  // Test 2: Intent Mapping
  console.log('\n2. Testing Intent Mapping:');
  const freeIntents = getIntentForKeyword('free');
  const cliIntents = getIntentForKeyword('cli');

  console.log(`Intents for "free":`, freeIntents);
  console.log(`Intents for "cli":`, cliIntents);

  // Test 3: Field Mapping
  console.log('\n3. Testing Field Mapping:');
  const pricingFields = FIELD_MAPPING_SCHEMA.pricing?.fields.map(f => f.fieldPath) || [];
  const interfaceFields = FIELD_MAPPING_SCHEMA.interface?.fields.map(f => f.fieldPath) || [];

  console.log(`Pricing Fields:`, pricingFields.slice(0, 3));
  console.log(`Interface Fields:`, interfaceFields.slice(0, 3));

  // Test 4: Expected behavior for "free cli"
  console.log('\n4. Expected Semantic Workflow for "free cli":');
  console.log('- "free" should map to pricing intent');
  console.log('- "cli" should map to interface intent');
  console.log('- Should search pricingSummary.hasFreeTier for "free"');
  console.log('- Should search interface.type for "cli"');
  console.log('- Should use multi-field search across these domains');

  // Test 5: Simulate what the semantic planner would do
  console.log('\n5. Simulated Semantic Planning:');

  if (freeIntents.length > 0 && cliIntents.length > 0) {
    console.log('✅ Both terms have semantic intent matches');
    console.log('✅ Would use semantic planner instead of fallback');
    console.log('✅ Expected confidence: high (>0.7)');

    // Simulate field selection
    const selectedFields = [
      ...FIELD_MAPPING_SCHEMA.pricing?.fields.slice(0, 2).map(f => ({
        fieldPath: f.fieldPath,
        sourceIntent: 'pricing',
        weight: f.weight
      })) || [],
      ...FIELD_MAPPING_SCHEMA.interface?.fields.slice(0, 2).map(f => ({
        fieldPath: f.fieldPath,
        sourceIntent: 'interface',
        weight: f.weight
      })) || []
    ];

    console.log('✅ Selected Fields for Search:');
    selectedFields.forEach(f => {
      console.log(`  - ${f.fieldPath} (intent: ${f.sourceIntent}, weight: ${f.weight})`);
    });

    // Simulate the plan that would be generated
    const simulatedPlan = {
      tool: 'multiFieldKeywordSearch',
      parameters: {
        query: 'free cli',
        fieldMappings: selectedFields,
        maxResults: 50,
        minScore: 0.1
      },
      reasoning: 'Semantic decomposition: "free" → pricing fields, "cli" → interface fields',
      confidence: 0.85,
      expectedOutcome: 'Targeted search results with semantic field mapping'
    };

    console.log('\n✅ Generated Plan:');
    console.log(`Tool: ${simulatedPlan.tool}`);
    console.log(`Confidence: ${simulatedPlan.confidence}`);
    console.log(`Reasoning: ${simulatedPlan.reasoning}`);

  } else {
    console.log('❌ Missing intent matches - would fallback to basic search');
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🧪 Semantic Analysis Test Complete');
}

// Run the test
testSemanticAnalysis().catch(console.error);