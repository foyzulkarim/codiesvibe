# LangGraph Integration

This document describes the integration of LangGraph into the search API.

## Overview

LangGraph is a library for building stateful, multi-actor applications with LLMs. It provides a way to create complex workflows with conditional routing and state management.

## Architecture

The LangGraph integration consists of the following components:

### 1. Graph State (`src/graph/state.ts`)

Defines the state that flows through the graph, including:
- Query and results
- Plan and evaluation
- Metadata for tracking execution

### 2. Graph Nodes (`src/graph/nodes.ts`)

Defines the individual nodes in the graph:
- **Planner**: Analyzes the query and creates an execution plan
- **Executor**: Executes the plan by calling appropriate tools
- **Evaluator**: Evaluates the results and determines if they are satisfactory
- **Response**: Generates the final response to the user
- **Clarification**: Generates clarification questions when needed

### 3. Graph Workflow (`src/graph/workflow.ts`)

Defines the workflow by connecting the nodes with conditional edges:
- Starts with the planner
- Routes to executor, evaluator, or response based on state
- Includes error handling and fallback mechanisms

### 4. Custom Tool Executor (`src/execution/custom-executor.ts`)

A custom tool executor that works with the tool registry format:
- Registers tools from the tool registry
- Executes tools with confidence tracking
- Handles errors and provides fallback results

### 5. LangGraph Routes (`src/routes/query-langgraph.ts`)

API routes that use the LangGraph workflow:
- `/query`: Main query endpoint
- `/clarification`: Handles clarification responses
- `/health`: Health check endpoint
- `/tools`: Lists available tools

## Usage

### Starting the Server

```bash
npm start
```

The server will start with LangGraph integration enabled.

### Making a Query

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AI tools for productivity",
    "options": {
      "useLLM": true,
      "maxIterations": 5,
      "includeReasoning": true
    }
  }'
```

### Response Format

```json
{
  "success": true,
  "results": [...],
  "total": 10,
  "reasoning": {...},
  "summary": "Found 10 AI tools for productivity",
  "confidence": 0.85,
  "sessionId": "session_1234567890_abcdef",
  "metadata": {
    "query": "AI tools for productivity",
    "intent": "search",
    "iterations": 2,
    "executionTime": 1500,
    "toolsUsed": ["filterByField", "sortByField"],
    "timestamp": "2023-01-01T00:00:00.000Z",
    "graphExecutionPath": ["planner", "executor", "evaluator", "response"]
  }
}
```

## Testing

To test the LangGraph integration:

```bash
npm run test:langgraph
```

Or run the test directly:

```bash
npx ts-node src/test/run-test.ts
```

## Configuration

The LangGraph integration can be configured through the environment variables in `src/config/agentic.ts`:

- `MAX_ITERATIONS`: Maximum number of iterations in the workflow
- `CONFIDENCE_THRESHOLD`: Minimum confidence threshold for results
- `ENABLE_REASONING_EXPLANATION`: Whether to include reasoning in responses
- `OLLAMA_URL`: URL for the Ollama LLM service
- `OLLAMA_MODEL`: Model to use for LLM planning

## Error Handling

The LangGraph workflow includes comprehensive error handling:

1. **Planning Errors**: Falls back to rules-based planning if LLM planning fails
2. **Execution Errors**: Provides fallback results if tool execution fails
3. **Evaluation Errors**: Uses default evaluation if evaluation fails
4. **Response Errors**: Returns a basic error response if response formatting fails

## Performance Considerations

- The workflow is designed to be efficient with minimal state copying
- Tools are executed in parallel when possible
- Caching is used for repeated queries
- The workflow can be configured to limit the number of iterations

## Future Enhancements

1. **Parallel Execution**: Implement parallel execution of tools where appropriate
2. **Caching**: Add caching for tool results and LLM responses
3. **Streaming**: Implement streaming responses for long-running queries
4. **Monitoring**: Add detailed monitoring and metrics collection
5. **Dynamic Workflows**: Support for dynamically changing workflows based on query context
