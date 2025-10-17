#!/usr/bin/env node

/**
 * Test Runner for AI Search Enhancement v2.0
 * 
 * This script runs all test suites and generates a coverage report.
 * It supports running specific test categories or all tests.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const testCategory = args.find(arg => arg.startsWith('--category='))?.split('=')[1];
const coverage = args.includes('--coverage');
const watch = args.includes('--watch');
const verbose = args.includes('--verbose');

// Define test categories
const testCategories = {
  unit: {
    description: 'Unit tests for individual nodes and services',
    pattern: 'src/test/nodes/*.test.ts',
    jestConfig: 'jest.config.js'
  },
  integration: {
    description: 'Integration tests for complete LangGraph flow',
    pattern: 'src/test/integration/*.test.ts',
    jestConfig: 'jest.config.js'
  },
  performance: {
    description: 'Performance tests for response times and concurrent requests',
    pattern: 'src/test/performance/*.test.ts',
    jestConfig: 'jest.config.js'
  },
  e2e: {
    description: 'End-to-end tests via API endpoint',
    pattern: 'src/test/e2e/*.test.ts',
    jestConfig: 'jest.config.js'
  },
  services: {
    description: 'Tests for enhanced search services',
    pattern: 'test-enhanced-*.ts',
    jestConfig: 'jest.config.js'
  },
  controllers: {
    description: 'Tests for enhanced search controllers',
    pattern: 'test-enhanced-*.ts',
    jestConfig: 'jest.config.js'
  }
};

/**
 * Runs Jest tests with the specified options
 */
function runJestTests(pattern: string, options: string[] = []): void {
  try {
    console.log(`\n🧪 Running tests with pattern: ${pattern}`);
    
    const jestArgs = [
      'npx',
      'jest',
      pattern,
      ...options
    ];
    
    if (verbose) {
      console.log(`Executing: ${jestArgs.join(' ')}`);
    }
    
    execSync(jestArgs.join(' '), {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('✅ Tests completed successfully');
  } catch (error) {
    console.error('❌ Tests failed');
    process.exit(1);
  }
}

/**
 * Generates a coverage report
 */
function generateCoverageReport(): void {
  try {
    console.log('\n📊 Generating coverage report...');
    
    const coverageArgs = [
      'npx',
      'jest',
      '--coverage',
      '--coverageReporters=text',
      '--coverageReporters=html',
      '--coverageReporters=json',
      'src/test/**/*.test.ts'
    ];
    
    if (verbose) {
      console.log(`Executing: ${coverageArgs.join(' ')}`);
    }
    
    execSync(coverageArgs.join(' '), {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('✅ Coverage report generated successfully');
    console.log('📁 HTML coverage report available at: coverage/lcov-report/index.html');
  } catch (error) {
    console.error('❌ Coverage report generation failed');
    process.exit(1);
  }
}

/**
 * Validates test coverage thresholds
 */
function validateCoverageThresholds(): void {
  try {
    console.log('\n🔍 Validating coverage thresholds...');
    
    // Check if coverage JSON file exists
    const coverageFile = join(process.cwd(), 'coverage', 'coverage-final.json');
    if (!existsSync(coverageFile)) {
      console.error('❌ Coverage file not found. Run tests with --coverage first.');
      process.exit(1);
    }
    
    // Read and parse coverage data
    const coverageData = JSON.parse(require('fs').readFileSync(coverageFile, 'utf8'));
    const totalCoverage = coverageData.total;
    
    // Define coverage thresholds
    const thresholds = {
      statements: 70,
      branches: 65,
      functions: 75,
      lines: 70
    };
    
    let allThresholdsMet = true;
    
    // Check each coverage metric
    for (const [metric, threshold] of Object.entries(thresholds)) {
      const coverage = totalCoverage[metric]?.pct || 0;
      
      if (coverage < threshold) {
        console.error(`❌ ${metric} coverage (${coverage.toFixed(2)}%) below threshold (${threshold}%)`);
        allThresholdsMet = false;
      } else {
        console.log(`✅ ${metric} coverage (${coverage.toFixed(2)}%) meets threshold (${threshold}%)`);
      }
    }
    
    if (allThresholdsMet) {
      console.log('✅ All coverage thresholds met');
    } else {
      console.error('❌ Some coverage thresholds not met');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Coverage validation failed:', error);
    process.exit(1);
  }
}

/**
 * Main function
 */
function main(): void {
  console.log('🚀 AI Search Enhancement v2.0 Test Runner\n');
  
  const jestOptions: string[] = [];
  
  if (watch) {
    jestOptions.push('--watch');
  }
  
  if (verbose) {
    jestOptions.push('--verbose');
  }
  
  // Run specific test category or all tests
  if (testCategory && testCategories[testCategory as keyof typeof testCategories]) {
    const category = testCategories[testCategory as keyof typeof testCategories];
    console.log(`📂 Running ${category.description}`);
    runJestTests(category.pattern, jestOptions);
  } else if (testCategory) {
    console.error(`❌ Unknown test category: ${testCategory}`);
    console.log('Available categories:', Object.keys(testCategories).join(', '));
    process.exit(1);
  } else {
    // Run all test categories
    console.log('📂 Running all test categories');
    
    for (const [name, category] of Object.entries(testCategories)) {
      console.log(`\n📁 Running ${category.description}`);
      runJestTests(category.pattern, jestOptions);
    }
  }
  
  // Generate coverage report if requested
  if (coverage) {
    generateCoverageReport();
    validateCoverageThresholds();
  }
  
  console.log('\n🎉 All tests completed successfully!');
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run main function
main();
