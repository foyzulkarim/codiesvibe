# Intelligent Search Test Script

This directory contains a test script (`test-intelligent-search.ts`) that allows you to directly test the `intelligentSearch` function without making HTTP requests.

## Quick Start

### Run the test script:
```bash
npm run test-search
```

Or directly with ts-node:
```bash
npx ts-node -r tsconfig-paths/register test-intelligent-search.ts
```

## Features

The test script includes:

1. **Multiple Test Cases**: Pre-configured test scenarios with different options
2. **Debug Output**: Detailed logging of execution steps and results
3. **Error Handling**: Graceful error handling and reporting
4. **Customizable**: Easy to modify queries and options for your specific needs

## Test Cases Included

1. **Basic Search Test**: Simple search with debug enabled
2. **Search with Thread ID**: Testing thread management functionality
3. **Search with Recovery Disabled**: Testing without checkpoint recovery
4. **Search with Custom Validation**: Testing with strict validation options

## Customizing Tests

### Modify Existing Test Cases

Edit the `testCases` array in `test-intelligent-search.ts`:

```typescript
const testCases = [
  {
    name: 'Your Custom Test',
    query: 'your search query here',
    options: {
      debug: true,
      threadId: 'custom-thread-id',
      enableRecovery: true,
      enableStateValidation: true,
      validationConfig: {
        enableStrictValidation: true,
        enableConsistencyChecks: true,
        enableAutoRollback: true
      }
    }
  }
];
```

### Add Custom Test Function

Use the `customTest()` function for one-off testing:

```typescript
async function customTest() {
  const result = await intelligentSearch('your query', {
    debug: true,
    // your options here
  });
  console.log('Result:', result);
}
```

## Available Options

The `intelligentSearch` function accepts these options:

- `debug?: boolean` - Enable detailed logging
- `threadId?: string` - Use specific thread ID for session management
- `checkpointConfig?: Partial<CheckpointConfig>` - Custom checkpoint configuration
- `enableRecovery?: boolean` - Enable/disable checkpoint recovery (default: true)
- `enableStateValidation?: boolean` - Enable/disable state validation (default: true)
- `validationConfig?: object` - Custom validation settings
  - `enableStrictValidation?: boolean`
  - `enableConsistencyChecks?: boolean`
  - `enableAutoRollback?: boolean`

## Output Format

The test script provides detailed output including:

- ✅ Test completion status
- ⏱️ Execution time
- 🎯 Search strategy used
- 📊 Number of results found
- 🧵 Thread ID used
- 💡 Explanation of results
- 📋 Sample results (first 3 items)
- 📈 Execution metadata

## Example Output

```
📋 Test 1: Basic Search Test
Query: "find tools for web development"
Options: {
  "debug": true
}
──────────────────────────────────────────────────
✅ Test completed successfully!
⏱️  Execution time: 1250ms
🎯 Strategy: Semantic Search
📊 Results count: 15
🧵 Thread ID: thread-abc123
💡 Explanation: Found relevant web development tools using semantic search
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure all dependencies are installed (`npm install`)
2. **Path Resolution**: The script uses `tsconfig-paths` for path resolution
3. **Environment Variables**: Ensure your `.env` file is properly configured

### Debug Mode

Always run with `debug: true` in your options to get detailed execution logs:

```typescript
const options = {
  debug: true,
  // other options...
};
```

## Integration with Development Workflow

This test script is perfect for:

- 🔍 **Quick Testing**: Test search functionality without API calls
- 🐛 **Debugging**: Detailed logs help identify issues
- 🧪 **Development**: Iterate quickly on search improvements
- 📊 **Performance Testing**: Measure execution times
- 🔄 **Thread Testing**: Test session management and recovery features

## Next Steps

1. Run the default tests to ensure everything works
2. Modify the test cases for your specific use cases
3. Use the custom test function for ad-hoc testing
4. Check the console output for detailed execution information