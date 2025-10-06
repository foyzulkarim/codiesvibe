/**
 * Script to run the planner test suite
 */

import { runPlannerTests } from './planner-test';

// Run the planner tests
runPlannerTests()
  .then(() => {
    console.log('Planner tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Planner tests failed:', error);
    process.exit(1);
  });
