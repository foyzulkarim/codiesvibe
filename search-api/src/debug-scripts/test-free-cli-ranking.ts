#!/usr/bin/env tsx

/**
 * Debug script to test "free cli" query and verify ollama/lmstudio ranking
 */

import { searchWithAgenticPipeline } from '../graphs/agentic-search.graph';

async function testFreeCLIRanking() {
  console.log('🚀 Testing "free cli" query ranking');
  console.log('='.repeat(60));
  
  const query = "free cli";
  console.log(`📝 Query: "${query}"`);
  console.log(`🎯 Expected top results: ollama, lmstudio`);
  console.log('─'.repeat(50));

  try {
    const startTime = Date.now();
    
    // Run the search
    const result = await searchWithAgenticPipeline(query, {
      enableCheckpoints: false,
    });
    
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Search completed in ${totalTime}ms`);
    console.log(`📊 Total candidates found: ${result.candidates?.length || 0}`);
    
    if (result.candidates && result.candidates.length > 0) {
      console.log('\n🏆 Top 10 Results:');
      console.log('─'.repeat(80));
      
      result.candidates.slice(0, 10).forEach((candidate, index) => {
        const name = candidate.metadata?.name || 'Unknown';
        const score = candidate.score?.toFixed(6) || '0.000000';
        const source = candidate.source || 'unknown';
        const pricing = candidate.metadata?.pricing || 'N/A';
        const platform = candidate.metadata?.platform || 'N/A';
        
        // Highlight ollama and lmstudio
        const isTarget = name.toLowerCase().includes('ollama') || name.toLowerCase().includes('lmstudio');
        const marker = isTarget ? '🎯' : '  ';
        
        console.log(`${marker} ${(index + 1).toString().padStart(2)}: ${name.padEnd(25)} | Score: ${score} | Source: ${source.padEnd(7)} | Pricing: ${pricing.padEnd(10)} | Platform: ${platform}`);
      });
      
      // Check if ollama and lmstudio are in top results
      const topNames = result.candidates.slice(0, 5).map(c => c.metadata?.name?.toLowerCase() || '');
      const ollamaInTop5 = topNames.some(name => name.includes('ollama'));
      const lmstudioInTop5 = topNames.some(name => name.includes('lmstudio'));
      
      console.log('\n📈 Ranking Analysis:');
      console.log('─'.repeat(50));
      console.log(`🎯 Ollama in top 5: ${ollamaInTop5 ? '✅ YES' : '❌ NO'}`);
      console.log(`🎯 LMStudio in top 5: ${lmstudioInTop5 ? '✅ YES' : '❌ NO'}`);
      
      if (ollamaInTop5 && lmstudioInTop5) {
        console.log('🎉 SUCCESS: Both ollama and lmstudio are in top 5 results!');
      } else {
        console.log('⚠️  WARNING: Expected tools not in top 5. Check ranking algorithm.');
        
        // Find where they are in the full results
        const ollamaIndex = result.candidates.findIndex(c => c.metadata?.name?.toLowerCase().includes('ollama'));
        const lmstudioIndex = result.candidates.findIndex(c => c.metadata?.name?.toLowerCase().includes('lmstudio'));
        
        if (ollamaIndex >= 0) {
          console.log(`   Ollama found at position: ${ollamaIndex + 1}`);
        } else {
          console.log(`   Ollama not found in results`);
        }
        
        if (lmstudioIndex >= 0) {
          console.log(`   LMStudio found at position: ${lmstudioIndex + 1}`);
        } else {
          console.log(`   LMStudio not found in results`);
        }
      }
    } else {
      console.log('❌ No candidates returned');
    }
    
    // Show intent and execution details
    console.log('\n🧠 Intent Analysis:');
    console.log('─'.repeat(50));
    console.log(`Primary Goal: ${result.intentState?.primaryGoal || 'N/A'}`);
    console.log(`Reference Tool: ${result.intentState?.referenceTool || 'N/A'}`);
    console.log(`Pricing Filter: ${result.intentState?.pricing || 'N/A'}`);
    console.log(`Platform Filter: ${result.intentState?.interface || 'N/A'}`);
    console.log(`Confidence: ${result.intentState?.confidence || 'N/A'}`);
    
    console.log('\n⚡ Execution Details:');
    console.log('─'.repeat(50));
    console.log(`Strategy: ${result.executionPlan?.strategy || 'N/A'}`);
    console.log(`Vector Queries: ${result.executionStats?.vectorQueriesExecuted || 0}`);
    console.log(`Structured Queries: ${result.executionStats?.structuredQueriesExecuted || 0}`);
    console.log(`Fusion Method: ${result.executionStats?.fusionMethod || 'N/A'}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => {
        console.log(`   - ${error.node}: ${error.error.message}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
  }
}

// Run the test
if (require.main === module) {
  testFreeCLIRanking().catch(console.error);
}

export { testFreeCLIRanking };