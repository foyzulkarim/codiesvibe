# LangGraph Implementation Guide for Search API

## Overview

This guide provides step-by-step instructions for integrating LangGraph into the existing search-api service, replacing the custom orchestration system with a LangGraph-based workflow.

## Prerequisites

1. Node.js 18+ and npm installed
2. Docker and Docker Compose installed
3. MongoDB instance (can be run with Docker)
4. Ollama instance with models (can be run with Docker)

## Step 1: Update Dependencies

1. Navigate to the search-api directory:
   ```bash
   cd search-api
   ```

2. Install the LangGraph dependencies:
   ```bash
   npm install @langchain/core @langchain/langgraph @langchain/community langchain
   ```

3. Update the package.json to include these dependencies.

## Step 2: Create the Graph State Schema

1. Create a new directory `src/graph`:
   ```bash
   mkdir -p src/graph
   ```

2. Create the state schema file `src/graph/state.ts` with the content from `LANGGRAPH_INTEGRATION.md` under "Step 2: Create LangGraph State Schema".

## Step 3: Implement the Graph Nodes

1. Create the nodes file `src/graph/nodes.ts` with the content from `LANGGRAPH_INTEGRATION.md` under "Step 3: Implement LangGraph Nodes".

2. This file implements all the nodes needed for the workflow:
   - `plannerNode`: Decides what action to take next
   - `executorNode`: Executes the planned action
   - `evaluatorNode`: Evaluates results and decides next steps
   - `responseNode`: Formats and returns the final response
   - `clarificationNode`: Handles ambiguity resolution

## Step 4: Build the Workflow Graph

1. Create the workflow file `src/graph/workflow.ts` with the content from `LANGGRAPH_INTEGRATION.md` under "Step 4: Build the LangGraph Workflow".

2. This file defines the graph structure with nodes and conditional edges.

## Step 5: Implement Error Handling

1. Create the error handling file `src/graph/error-handling.ts` with the content from `LANGGRAPH_INTEGRATION.md` under "Step 7: Error Handling and Fallbacks".

2. This provides robust error recovery strategies for the workflow.

## Step 6: Update the Query Route

1. Modify `src/routes/query.ts` to use the LangGraph workflow.

2. Replace the existing queryHandler function with the implementation from `LANGGRAPH_INTEGRATION.md` under "Step 5: Update the Query Route".

3. Import the workflow at the top of the file:
   ```typescript
   import { createWorkflow } from "../graph/workflow";
   ```

4. Create the workflow instance:
   ```typescript
   const searchWorkflow = createWorkflow();
   ```

## Step 7: Update the Server

1. Modify `src/server.ts` to ensure the workflow is initialized:
   ```typescript
   import "./graph/workflow"; // This will initialize the workflow
   ```

## Step 8: Create Docker Configuration

1. Create the Docker Compose configuration file `docker-compose.search-api.yml` with the content from `DOCKER_COMPOSE_CONFIG.md`.

2. Create the Dockerfile `Dockerfile.search` in the root directory with the content from `DOCKER_COMPOSE_CONFIG.md`.

3. Create the `.env` file in the search-api directory with the content from `DOCKER_COMPOSE_CONFIG.md`.

## Step 9: Test the Implementation

1. Start the services:
   ```bash
   docker-compose -f docker-compose.search-api.yml up --build
   ```

2. Pull Ollama models (if not automatically pulled):
   ```bash
   docker exec -it ollama-search ollama pull llama3.1
   ```

3. Test the health endpoint:
   ```bash
   curl http://localhost:4002/health
   ```

4. Test a query:
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "show me free AI tools for coding",
       "limit": 10
     }'
   ```

## Step 10: Update Tests

1. Modify the test files to work with the LangGraph implementation.

2. Add tests for error handling and fallbacks.

3. Add tests for the workflow execution path.

## Architecture Overview

### Before LangGraph

```
Query → Custom Orchestration → Tools → Response
```

### After LangGraph

```
Query → LangGraph Workflow → Nodes → Tools → Response
```

The LangGraph workflow consists of the following nodes:

1. **Planner**: Analyzes the query and decides what action to take next
2. **Executor**: Executes the planned action using the appropriate tool
3. **Evaluator**: Evaluates the results and decides whether to continue or complete
4. **Response**: Formats and returns the final response
5. **Clarification**: Handles ambiguity resolution when needed

### State Management

LangGraph provides robust state management across the workflow:

- The state is passed between nodes and updated at each step
- The state includes query context, results, confidence scores, and execution metadata
- The state is preserved across iterations, allowing for multi-step reasoning

### Error Handling

The implementation includes comprehensive error handling:

- Errors are caught and handled at each node
- Fallback strategies are implemented for critical components
- The workflow can recover from errors and continue processing

## Benefits of LangGraph Integration

1. **Better Visualization**: The workflow can be visualized and debugged more easily
2. **Robust State Management**: LangGraph provides reliable state management across the workflow
3. **Easier Extension**: New nodes and edges can be added to the workflow with minimal changes
4. **Better Integration**: LangGraph integrates well with the LangChain ecosystem
5. **Improved Reliability**: The workflow is more resilient to errors and edge cases

## Troubleshooting

### Common Issues

1. **Dependency Conflicts**:
   - Ensure all dependencies are compatible
   - Use `npm ls` to check for conflicts

2. **TypeScript Errors**:
   - Check that all types are properly imported
   - Ensure the GraphState type is correctly defined

3. **Workflow Failures**:
   - Check the logs for detailed error messages
   - Verify that all nodes are properly implemented

4. **Ollama Connection Issues**:
   - Ensure Ollama is running and accessible
   - Check the OLLAMA_URL environment variable

### Debugging Tips

1. **Enable Debug Logging**:
   ```bash
   export DEBUG=langgraph*
   ```

2. **Inspect the State**:
   - Add logging to see the state at each node
   - Use the LangGraph visualization tools

3. **Test Individual Nodes**:
   - Create unit tests for each node
   - Test the workflow with simple inputs

## Performance Considerations

1. **Memory Usage**:
   - Monitor memory usage during workflow execution
   - Limit the size of the state to prevent memory issues

2. **Execution Time**:
   - Set appropriate timeouts for LLM calls
   - Monitor the overall execution time

3. **Concurrency**:
   - Consider running multiple workflows in parallel
   - Implement rate limiting if necessary

## Future Enhancements

1. **Advanced Visualization**:
   - Implement a web-based visualization of the workflow
   - Add real-time monitoring of workflow execution

2. **Dynamic Workflow Modification**:
   - Allow the workflow to be modified at runtime
   - Implement A/B testing for different workflow configurations

3. **Integration with External Services**:
   - Add nodes for external API calls
   - Implement caching for frequently accessed data

## Conclusion

By integrating LangGraph into the search-api service, we've created a more robust, maintainable, and extensible system. The LangGraph workflow provides better visualization, state management, and error handling compared to the custom orchestration system.

The implementation maintains backward compatibility with the existing API while improving the internal architecture. This makes it easier to add new features, fix bugs, and optimize performance in the future.
