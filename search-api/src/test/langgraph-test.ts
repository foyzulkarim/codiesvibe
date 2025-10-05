/**
 * Simple test for the LangGraph workflow
 */

import { searchWorkflow, createInitialState } from '../graph';
import { CustomToolExecutor } from '../execution/custom-executor';
import TOOL_REGISTRY from '../tools';

/**
 * Register all tools with the CustomToolExecutor
 */
function registerToolsWithExecutor(): void {
  const toolNames = Object.keys(TOOL_REGISTRY);
  
  for (const toolName of toolNames) {
    const toolEntry = TOOL_REGISTRY[toolName];
    
    if (!toolEntry) continue;
    
    // Register the tool with CustomToolExecutor
    CustomToolExecutor.registerTool(
      toolName,
      toolEntry.func,
      toolEntry.metadata
    );
  }
}

/**
 * Test the LangGraph workflow
 */
async function testLangGraphWorkflow(): Promise<void> {
  console.log('Testing LangGraph workflow...');
  
  try {
    // Register tools
    registerToolsWithExecutor();
    console.log('Tools registered successfully');
    
    // Create initial state
    const initialState = createInitialState('AI tools for productivity');
    console.log('Initial state created');
    
    // Run the workflow
    const result = await searchWorkflow.invoke(initialState);
    console.log('Workflow executed successfully');
    
    // Log the result
    console.log('Result:', JSON.stringify(result, null, 2));
    
    // Check if we have a response
    if (result.response) {
      console.log('Response generated successfully');
      const responseData = JSON.parse(result.response);
      console.log('Response data:', responseData);
    } else if (result.error) {
      console.error('Workflow error:', result.error);
    } else {
      console.warn('No response or error from workflow');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testLangGraphWorkflow();
}

export { testLangGraphWorkflow };
