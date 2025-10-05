/**
 * Script to run the LangGraph test
 */

import { testLangGraphWorkflow } from './langgraph-test';

// Run the test
testLangGraphWorkflow()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
