/**
 * E2E Test Setup
 * Runs before all tests
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for all tests
jest.setTimeout(120000); // 2 minutes

// Global setup
beforeAll(() => {
  console.log('🧪 Starting E2E tests...');
  console.log(`API URL: ${process.env.API_BASE_URL || 'http://localhost:4003'}`);
});

// Global teardown
afterAll(() => {
  console.log('✅ E2E tests completed');
});
