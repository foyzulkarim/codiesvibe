#!/usr/bin/env tsx

/**
 * Debug script to test "Self hosted cli" query and analyze rankings
 */

import { searchWithAgenticPipeline } from '../graphs/agentic-search.graph';

async function testSelfHostedCLIRanking() {
  console.log('🚀 Testing "Self hosted cli" query ranking');
  console.log('='.repeat(60));
  
  const query = "Self hosted cli";
  console.log(`📝 Query: "${query}"`);
  console.log(`🎯 Expected: Self-hosted CLI tools should rank highly`);
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
      console.log('\n🏆 Top 15 Results:');
      console.log('─'.repeat(100));
      
      result.candidates.slice(0, 15).forEach((candidate, index) => {
        const name = candidate.metadata?.name || 'Unknown';
        const score = candidate.score?.toFixed(6) || '0.000000';
        const source = candidate.source || 'unknown';
        const pricing = candidate.metadata?.pricing || 'N/A';
        const platform = candidate.metadata?.platform || 'N/A';
        const description = candidate.metadata?.description || '';
        
        // Highlight potential self-hosted CLI tools
        const isSelfHosted = description.toLowerCase().includes('self-hosted') || 
                           description.toLowerCase().includes('self hosted') ||
                           name.toLowerCase().includes('ollama') ||
                           name.toLowerCase().includes('local') ||
                           name.toLowerCase().includes('open source');
        const isCLI = platform.toLowerCase().includes('cli') || 
                     description.toLowerCase().includes('command line') ||
                     description.toLowerCase().includes('terminal');
        
        const marker = (isSelfHosted && isCLI) ? '🎯' : 
                      isSelfHosted ? '🏠' : 
                      isCLI ? '💻' : '  ';
        
        console.log(`${marker} ${(index + 1).toString().padStart(2)}: ${name.padEnd(25)} | Score: ${score} | Source: ${source.padEnd(7)} | Platform: ${platform.padEnd(10)} | Pricing: ${pricing}`);
        
        // Show description for top 5 results
        if (index < 5 && description) {
          console.log(`     Description: ${description.substring(0, 80)}${description.length > 80 ? '...' : ''}`);
        }
      });
      
      // Analyze results for self-hosted CLI tools
      const selfHostedCLITools = result.candidates.filter(c => {
        const name = c.metadata?.name?.toLowerCase() || '';
        const desc = c.metadata?.description?.toLowerCase() || '';
        const platform = c.metadata?.platform?.toLowerCase() || '';
        
        const isSelfHosted = desc.includes('self-hosted') || 
                           desc.includes('self hosted') ||
                           desc.includes('local') ||
                           desc.includes('open source') ||
                           name.includes('ollama');
        const isCLI = platform.includes('cli') || 
                     desc.includes('command line') ||
                     desc.includes('terminal');
        
        return isSelfHosted && isCLI;
      });
      
      console.log('\n📈 Self-Hosted CLI Analysis:');
      console.log('─'.repeat(60));
      console.log(`🎯 Self-hosted CLI tools found: ${selfHostedCLITools.length}`);
      
      if (selfHostedCLITools.length > 0) {
        console.log('🏆 Self-hosted CLI tools in results:');
        selfHostedCLITools.slice(0, 5).forEach((tool, index) => {
          const position = result.candidates.findIndex(c => c.id === tool.id) + 1;
          console.log(`   ${index + 1}. ${tool.metadata?.name} (Position: #${position}, Score: ${tool.score?.toFixed(6)})`);
        });
      } else {
        console.log('⚠️  No clear self-hosted CLI tools identified in top results');
      }
      
      // Check for specific tools that should rank well
      const specificTools = ['ollama', 'docker', 'kubernetes', 'git', 'npm', 'yarn', 'pip'];
      console.log('\n🔍 Specific Tool Analysis:');
      console.log('─'.repeat(60));
      
      specificTools.forEach(toolName => {
        const toolIndex = result.candidates.findIndex(c => 
          c.metadata?.name?.toLowerCase().includes(toolName)
        );
        if (toolIndex >= 0) {
          const tool = result.candidates[toolIndex];
          console.log(`✅ ${toolName}: Found at position #${toolIndex + 1} (Score: ${tool.score?.toFixed(6)})`);
        } else {
          console.log(`❌ ${toolName}: Not found in results`);
        }
      });
      
    } else {
      console.log('❌ No candidates returned');
    }
    
    // Show intent and execution details
    console.log('\n🧠 Intent Analysis:');
    console.log('─'.repeat(50));
    console.log(`Primary Goal: ${result.intentState?.primaryGoal || 'N/A'}`);
    console.log(`Reference Tool: ${result.intentState?.referenceTool || 'N/A'}`);
    console.log(`Pricing Filter: ${result.intentState?.pricing || 'N/A'}`);
    console.log(`Platform Filter: ${result.intentState?.platform || 'N/A'}`);
    console.log(`Category Filter: ${result.intentState?.category || 'N/A'}`);
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
  testSelfHostedCLIRanking().catch(console.error);
}

export { testSelfHostedCLIRanking };