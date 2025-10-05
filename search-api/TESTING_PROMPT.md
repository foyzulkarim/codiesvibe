# Search API with LangGraph Integration - Testing Prompt

## Overview

The Search API is a Fastify-based service for AI-powered tool discovery that has been enhanced with LangGraph integration for improved workflow orchestration. The API processes natural language queries to find relevant tools from a dataset, using AI reasoning to determine the best search strategy.

### Key Features
- Natural language query processing with AI reasoning
- LangGraph-based workflow orchestration for improved state management
- In-memory dataset loading from MongoDB
- Comprehensive tool filtering, sorting, and search capabilities
- Confidence scoring and ambiguity resolution
- RESTful API with OpenAPI documentation
- Support for both LLM-based and rules-based planning

### Architecture
The system uses a LangGraph workflow with the following nodes:
1. **Planner**: Decides what action to take next (LLM or rules-based)
2. **Executor**: Executes the planned action using appropriate tools
3. **Evaluator**: Evaluates results and decides whether to continue
4. **Response**: Formats and returns the final response
5. **Clarification**: Handles ambiguity resolution when needed

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or remote connection)
- Optional: Ollama for LLM functionality (if using LLM-based planning)

### Installation Steps

The repository is already cloned. Start testing from the search-api directory within the repository.

1. **Navigate to the search-api directory** (if not already there)
   ```bash
   cd search-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment configuration**
   ```bash
   cp .env.example .env
   ```

4. **Configure the environment variables in .env**
   - Ensure MongoDB connection details are correct
   - If using Ollama, configure OLLAMA_URL and OLLAMA_MODEL
   - Adjust other settings as needed (PORT, MAX_ITERATIONS, etc.)

5. **Build and run the API**
   ```bash
   # Development mode
   npm run dev
   
   # Or build and run in production
   npm run build
   npm start
   ```

6. **Verify the API is running**
   ```bash
   curl http://localhost:4002/health
   ```

## Testing Instructions

### Basic API Functionality Tests

1. **Health Check**
   ```bash
   curl -X GET http://localhost:4002/health
   ```
   Expected: Status "ok" with service information

2. **Get Available Tools**
   ```bash
   curl -X GET http://localhost:4002/tools
   ```
   Expected: List of available tools with metadata

3. **Basic Query Test**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "AI tools for code completion"
     }'
   ```
   Expected: Results related to code completion tools with confidence score

### LangGraph Workflow Tests

1. **Simple Query with Default Settings**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "productivity tools for developers",
       "options": {
         "useLLM": true,
         "includeReasoning": true,
         "verbosity": "detailed"
       }
     }'
   ```
   Expected: Detailed response with reasoning steps and execution path

2. **Query with Rules-Based Planning**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "free debugging tools",
       "options": {
         "useLLM": false,
         "includeReasoning": true
       }
     }'
   ```
   Expected: Results using rules-based planning without LLM

3. **Query with Custom Iteration Limit**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "AI tools for data analysis",
       "options": {
         "maxIterations": 5,
         "includeReasoning": true
       }
     }'
   ```
   Expected: Results with limited iterations (check metadata.iterations)

4. **Query with High Confidence Threshold**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "machine learning tools",
       "options": {
         "confidenceThreshold": 0.8,
         "includeReasoning": true
       }
     }'
   ```
   Expected: Only high-confidence results or clarification request

### Error Handling Tests

1. **Empty Query**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": ""
     }'
   ```
   Expected: 400 Bad Request with validation error

2. **Very Long Query**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "This is an extremely long query that exceeds the maximum length limit and should trigger a validation error according to the API schema which specifies a maximum length of 500 characters for the query parameter"
     }'
   ```
   Expected: 400 Bad Request with validation error

3. **Invalid Request Body**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "invalidField": "test"
     }'
   ```
   Expected: 400 Bad Request with validation error

### Edge Cases and Special Scenarios

1. **Ambiguous Query**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "tools",
       "options": {
         "includeReasoning": true
       }
     }'
   ```
   Expected: Either broad results or clarification request due to ambiguity

2. **Query with Pagination**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "AI tools",
       "limit": 5,
       "offset": 10
     }'
   ```
   Expected: Paginated results (5 items starting from index 10)

3. **Query with Session Context**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "more like the last one",
       "context": {
         "sessionId": "test_session_123",
         "previousQueries": ["AI tools for code completion"]
       }
     }'
   ```
   Expected: Results considering previous query context

4. **Query with User Preferences**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "development tools",
       "context": {
         "userPreferences": {
           "price": "free",
           "category": "productivity"
         }
       }
     }'
   ```
   Expected: Results filtered by user preferences

### Performance Tests

1. **Concurrent Requests**
   ```bash
   # Run multiple requests in parallel (using a tool like Apache Bench or similar)
   ab -n 20 -c 5 -p test_payload.json -T application/json http://localhost:4002/query
   ```
   Where test_payload.json contains:
   ```json
   {"query": "AI tools for testing"}
   ```

2. **Large Dataset Query**
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "all tools",
       "limit": 100
     }'
   ```
   Expected: Large result set with reasonable response time

## Expected Response Format

All successful query responses should follow this structure:
```json
{
  "success": true,
  "results": [...],
  "total": number,
  "reasoning": { ... }, // Only if includeReasoning is true
  "summary": "string",
  "confidence": number,
  "disambiguationOptions": [...], // Only if clarification is needed
  "sessionId": "string",
  "metadata": {
    "query": "string",
    "intent": "string",
    "iterations": number,
    "executionTime": number,
    "toolsUsed": [...],
    "timestamp": "string",
    "warnings": [...],
    "errors": [...],
    "graphExecutionPath": [...]
  }
}
```

## Areas Requiring Special Attention

1. **LangGraph Workflow Execution**
   - Verify the workflow follows the correct path: planner → executor → evaluator → response
   - Check that iteration counts are properly tracked
   - Ensure state is properly maintained between nodes

2. **Tool Execution**
   - Verify all tools in the registry are properly registered
   - Test tool execution with various parameters
   - Check error handling when tools fail

3. **LLM Integration**
   - If Ollama is configured, test LLM-based planning
   - Verify fallback to rules-based planning when LLM fails
   - Check that LLM responses are properly parsed

4. **Error Recovery**
   - Test error handling at each workflow node
   - Verify fallback strategies work correctly
   - Check that errors are properly reported in responses

5. **Performance**
   - Monitor response times for different query types
   - Check memory usage during workflow execution
   - Verify concurrent request handling

6. **State Management**
   - Verify state is properly passed between workflow nodes
   - Check that state updates don't overwrite important data
   - Test state persistence during long-running workflows

## Issue Reporting

When reporting issues, please include:

1. **Request Details**
   - Full request payload
   - Headers used
   - Timestamp of the request

2. **Response Details**
   - Full response body
   - HTTP status code
   - Response headers

3. **Environment Information**
   - Node.js version
   - MongoDB version
   - Whether Ollama is being used
   - Any relevant configuration values

4. **Logs**
   - Server logs from the time of the request
   - Any error messages or stack traces

5. **Expected vs Actual Behavior**
   - Clear description of what was expected
   - Clear description of what actually happened
   - Steps to reproduce the issue

## Additional Testing Tools

1. **Built-in Test Script**
   ```bash
   # Run from the search-api directory
   npm run test:langgraph
   ```
   This runs the basic LangGraph workflow test included in the project.

2. **Manual Testing Interface**
   You can use tools like Postman, Insomnia, or the VS Code REST Client extension to create and save test requests for easier repeated testing.

3. **Monitoring**
   Check the server logs for detailed information about workflow execution, tool usage, and any errors that occur.

## Conclusion

This testing prompt covers the main functionality of the Search API with LangGraph integration. All testing should be performed from the search-api directory within the already cloned repository. Focus on verifying that the LangGraph workflow executes correctly, tools function as expected, and error handling is robust. Pay special attention to the state management between workflow nodes and the integration between LLM-based and rules-based planning.
