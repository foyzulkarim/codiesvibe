/**
 * Test script to understand the data structure and test queries
 */

import { getOriginalDataset } from './src/data/loader';

function analyzeDataStructure() {
  const dataset = getOriginalDataset();
  console.log(`🔍 Dataset Analysis (${dataset.length} tools)`);
  console.log('=' .repeat(50));

  // Sample tool
  const sampleTool = dataset[0];
  if (sampleTool) {
    console.log('\n📋 Sample Tool Structure:');
    console.log(`- Name: ${sampleTool.name}`);
    console.log(`- Description: ${sampleTool.description}`);
    console.log(`- Pricing Summary:`, sampleTool.pricingSummary);
    console.log(`- Interface:`, sampleTool.interface);
    console.log(`- Functionality:`, sampleTool.functionality);
    console.log(`- Capabilities:`, sampleTool.capabilities);
  }

  // Test queries and their expected field mappings
  const testQueries = [
    { query: 'free cli', analysis: 'pricing + interface' },
    { query: 'free ai tools', analysis: 'pricing + functionality' },
    { query: 'api access', analysis: 'capability' },
    { query: 'open source software', analysis: 'pricing + category' },
    { query: 'mobile apps for developers', analysis: 'interface + userTypes' },
    { query: 'code generation tools', analysis: 'functionality + capability' }
  ];

  console.log('\n🧪 Test Query Analysis:');
  testQueries.forEach(({ query, analysis }) => {
    console.log(`\nQuery: "${query}"`);
    console.log(`Expected Analysis: ${analysis}`);

    // Check if tools match this query
    const matchingTools = dataset.filter(tool => {
      const matchesFree = query.includes('free') && tool.pricingSummary?.hasFreeTier;
      const matchesCLI = query.includes('cli') && tool.interface?.includes('CLI');
      const matchesAPI = query.includes('api') && tool.capabilities?.technical?.apiAccess;
      const matchesAI = query.includes('ai') && tool.categories?.primary?.includes('AI');

      return matchesFree || matchesCLI || matchesAPI || matchesAI;
    });

    console.log(`Matching Tools: ${matchingTools.length}/${dataset.length}`);
    matchingTools.slice(0, 2).forEach(tool => {
      console.log(`  - ${tool.name} (${tool.pricingSummary?.hasFreeTier ? 'free tier' : 'paid'})`);
    });
  });

  // Test current vs. improved approach for "free cli"
  console.log('\n🎯 "free cli" Query Analysis:');
  console.log('Current Approach Issues:');
  console.log('- LLM needs to understand: "free" → pricing, "cli" → interface');
  console.log('- LLM needs to map to: pricingSummary.hasFreeTier, interface.type');
  console.log('- High cognitive load leads to failures');
  console.log('- Falls back to generic search with 0.4 confidence');

  console.log('\n✅ Improved Semantic Approach:');
  console.log('- QueryDecomposer: "free" → pricing(0.8), "cli" → interface(0.8)');
  console.log('- FieldSelector: maps to exact database fields');
  console.log('- Search: targeted across optimal fields');
  console.log('- Expected confidence: 0.85+');

  // Show which tools would be found with semantic approach
  const freeCLI = dataset.filter(tool =>
    tool.pricingSummary?.hasFreeTier &&
    (tool.interface?.includes('CLI') || tool.interface?.includes('API'))
  );

  console.log(`\n📊 Results with Semantic Approach:`);
  console.log(`Free CLI tools found: ${freeCLI.length}`);
  freeCLI.forEach(tool => {
    console.log(`  ✅ ${tool.name} - ${tool.description}`);
  });

  // Show pricing and interface diversity
  console.log('\n📈 Data Diversity Analysis:');
  const freeTools = dataset.filter(tool => tool.pricingSummary?.hasFreeTier);
  const cliTools = dataset.filter(tool => tool.interface?.includes('CLI'));

  console.log(`- Free tier tools: ${freeTools.length}/${dataset.length}`);
  console.log(`- CLI tools: ${cliTools.length}/${dataset.length}`);
  console.log(`- Free CLI overlap: ${freeCLI.length} tools`);
}

// Run the analysis
analyzeDataStructure();