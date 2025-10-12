# Checkpointing Implementation for Search API

This document describes the comprehensive checkpointing support implemented for the search-api project's main graph using LangGraph's MemorySaver.

## Overview

The checkpointing implementation provides:
- **State persistence** across graph executions
- **Error recovery** mechanisms
- **Thread management** with lifecycle controls
- **Checkpoint configuration** and cleanup policies
- **State validation** and consistency checks

## Architecture

### Core Components

1. **ThreadManager** (`src/utils/thread-manager.ts`)
   - Manages thread lifecycle and validation
   - Handles thread expiration and cleanup
   - Provides thread statistics and monitoring

2. **CheckpointManager** (`src/utils/checkpoint-manager.ts`)
   - Integrates with LangGraph's MemorySaver
   - Manages checkpoint configuration
   - Handles state recovery and validation

3. **Main Graph** (`src/graphs/main.graph.ts`)
   - Integrated with MemorySaver checkpointer
   - Enhanced search functions with thread support
   - Error recovery and state consistency

## Features Implemented

### 1. MemorySaver Integration

```typescript
import { MemorySaver } from "@langchain/langgraph";

// Compiled graph with checkpointing
const compiledGraph = workflow.compile({
  checkpointer: memorySaver,
  interruptBefore: [],
  interruptAfter: []
});
```

### 2. Async API Integration

The checkpointing system seamlessly integrates with asynchronous search operations through dedicated REST endpoints:

#### Async Search Workflow
1. **Start Search**: `POST /search/async` creates a thread and starts background execution
2. **Monitor Progress**: `GET /search/status/:threadId` tracks execution progress and status
3. **Resume/Retry**: `POST /search/resume/:threadId` continues from last checkpoint
4. **Cancel**: `POST /search/cancel/:threadId` stops execution and cleans up resources

#### Thread Status Lifecycle
- `started` → `running` → `completed` (success path)
- `started` → `running` → `error` (failure path)  
- `error` → `resumed` → `running` → `completed` (recovery path)

#### Background Execution
Async searches run in the background using the same checkpointing infrastructure:
```typescript
// Thread created with async metadata
const threadId = threadManager.createThread({
  query,
  startTime: new Date(),
  enableCheckpoints: true,
  isAsync: true
});

// Search executes with automatic checkpointing
searchWithThread(query, threadId, {
  continueFromCheckpoint: true
});
```

### 3. Thread Management

#### Thread Creation
```typescript
// Automatic thread creation
const result = await intelligentSearch('react tools');

// Manual thread creation
const threadId = createSearchThread({
  userId: 'user123',
  sessionType: 'interactive'
});
```

#### Thread Validation
```typescript
const validation = threadManager.validateThreadId(threadId);
if (!validation.isValid) {
  console.error(validation.error);
}
```

#### Thread Metadata
```typescript
threadManager.updateThreadMetadata(threadId, {
  lastQuery: 'react hooks',
  executionSuccessful: true,
  resultsCount: 5
});
```

### 4. Progress Tracking

The system provides real-time progress tracking for async operations through execution path monitoring:

#### Progress Calculation
Progress is calculated based on the execution path through the graph nodes:
```typescript
// Standard execution path: 4 main nodes
const totalNodes = 4; // intent-extraction, query-planning, execution, final-completion
const completedNodes = metadata.executionPath.length;
const progress = Math.min(Math.round((completedNodes / totalNodes) * 100), 95);
```

#### Execution Path Tracking
Each node updates the execution path in thread metadata:
```typescript
// Node execution updates metadata
metadata: {
  executionPath: [...(currentState.metadata?.executionPath || []), "execution"],
  nodeExecutionTimes: {
    "execution": Date.now() - startTime
  }
}
```

#### Status Monitoring
The `/search/status/:threadId` endpoint provides comprehensive progress information:
- **Progress percentage** (0-100%)
- **Current node** being executed
- **Execution path** history
- **Node execution times** for performance analysis

### 5. Checkpoint Configuration

```typescript
const checkpointConfig: CheckpointConfig = {
  enableCheckpoints: true,
  checkpointInterval: 1,        // Save after each node
  maxCheckpointsPerThread: 10,  // Limit checkpoints per thread
  enableCompression: false      // Future feature
};

checkpointManager.configureThread(threadId, checkpointConfig);
```

### 6. Error Recovery

```typescript
const result = await intelligentSearch('react testing', {
  threadId,
  enableRecovery: true,
  checkpointConfig: {
    enableCheckpoints: true,
    checkpointInterval: 1
  }
});
```

## API Reference

### ThreadManager

#### Methods

- `generateThreadId(): string` - Generate a new UUID v4 thread ID
- `createThread(metadata?: Record<string, any>): string` - Create and register a thread
- `validateThreadId(threadId: string): ThreadValidationResult` - Validate thread ID
- `getThreadInfo(threadId: string): ThreadInfo | null` - Get thread information
- `updateThreadMetadata(threadId: string, metadata: Record<string, any>): boolean` - Update metadata
- `extendThreadExpiration(threadId: string, extensionMs?: number): boolean` - Extend expiration
- `deleteThread(threadId: string): boolean` - Delete a thread
- `getActiveThreads(): ThreadInfo[]` - List all active threads
- `getThreadStats(): ThreadStats` - Get thread statistics

#### ThreadInfo Interface
```typescript
interface ThreadInfo {
  id: string;
  createdAt: Date;
  lastAccessed: Date;
  expirationTime: Date;
  metadata?: {
    // Search context
    query?: string;
    status?: 'started' | 'running' | 'completed' | 'error' | 'resumed';
    
    // Execution tracking
    executionPath?: string[];
    currentNode?: string;
    startTime?: Date;
    endTime?: Date;
    
    // Results and performance
    results?: any[];
    resultsCount?: number;
    executionTime?: string;
    
    // Error handling
    error?: string;
    
    // Async operation metadata
    isAsync?: boolean;
    resumeTime?: Date;
    
    // Additional metadata
    [key: string]: any;
  };
}
```

### CheckpointManager

#### Methods

- `getMemorySaver(): MemorySaver` - Get MemorySaver instance
- `configureThread(threadId: string, config: Partial<CheckpointConfig>): void` - Configure checkpointing
- `getThreadConfig(threadId: string): CheckpointConfig` - Get thread configuration
- `restoreFromCheckpoint(threadId: string, checkpointId?: string): Promise<RecoveryResult>` - Restore state
- `validateRecoveredState(state: State): ValidationResult` - Validate recovered state
- `getCheckpointStats(threadId: string): Promise<CheckpointStats>` - Get statistics
- `clearThreadCheckpoints(threadId: string): Promise<number>` - Clear checkpoints

### Main Graph Functions

#### Enhanced Search Functions

```typescript
// Search with automatic thread management
intelligentSearch(query: string, options?: {
  debug?: boolean;
  threadId?: string;
  checkpointConfig?: Partial<CheckpointConfig>;
  enableRecovery?: boolean;
}): Promise<SearchResult>

// Search with explicit thread
searchWithThread(query: string, threadId: string, options?: {
  debug?: boolean;
  checkpointConfig?: Partial<CheckpointConfig>;
  continueFromCheckpoint?: boolean;
}): Promise<SearchResult>

// Thread management utilities
createSearchThread(metadata?: Record<string, any>): string
getSearchThreadInfo(threadId: string): ThreadInfo | null
deleteSearchThread(threadId: string): Promise<boolean>
```

## Configuration Options

### CheckpointConfig

```typescript
interface CheckpointConfig {
  enableCheckpoints: boolean;
  checkpointInterval?: number;        // Save after N nodes (default: 1)
  maxCheckpointsPerThread?: number;  // Max checkpoints per thread (default: 10)
  enableCompression?: boolean;       // Future feature
}
```

### Thread Lifecycle

- **Default TTL**: 24 hours
- **Max Active Threads**: 1000
- **Cleanup Interval**: Every hour
- **Expiration Policy**: Automatic deletion of expired threads

## Error Handling

### Recovery Strategies

1. **Checkpoint Recovery**: Attempt to restore from latest checkpoint
2. **State Validation**: Validate recovered state consistency
3. **Fallback Response**: Provide partial results when possible
4. **Error Logging**: Comprehensive error tracking and monitoring

### Error Types

- **Thread Validation Errors**: Invalid or expired thread IDs
- **Checkpoint Recovery Errors**: Failed state restoration
- **State Validation Errors**: Inconsistent or corrupted state
- **Graph Execution Errors**: Runtime errors during execution

## Testing

### Test Coverage

The implementation includes comprehensive tests covering:

- Thread management operations
- Checkpoint configuration
- State recovery and validation
- Error handling scenarios
- Integration workflows

### Running Tests

```bash
# Run checkpointing tests
cd search-api
npx ts-node -r tsconfig-paths/register test-checkpointing.ts

# Manual testing
npx ts-node -r tsconfig-pathsregister -e "
import { runManualCheckpointTest } from './test-checkpointing';
runManualCheckpointTest();
"
```

## Usage Examples

### Basic Usage with Automatic Thread Management

```typescript
import { intelligentSearch } from '@/graphs/main.graph';

const result = await intelligentSearch('react hooks tutorial', {
  debug: true,
  enableRecovery: true
});

console.log(`Results: ${result.metadata?.resultsCount}`);
console.log(`Thread ID: ${result.threadId}`);
```

### Advanced Usage with Explicit Thread Management

```typescript
import { 
  createSearchThread, 
  searchWithThread, 
  deleteSearchThread 
} from '@/graphs/main.graph';

// Create thread with custom metadata
const threadId = createSearchThread({
  userId: 'user123',
  sessionType: 'interactive',
  preferences: { maxResults: 10 }
});

try {
  // Configure checkpointing
  const checkpointConfig = {
    enableCheckpoints: true,
    checkpointInterval: 1,
    maxCheckpointsPerThread: 5
  };

  // Perform search
  const result = await searchWithThread('react testing library', threadId, {
    debug: true,
    checkpointConfig,
    continueFromCheckpoint: true
  });

  console.log('Search completed:', result);

  // Continue with more searches in the same thread
  const result2 = await searchWithThread('jest mocking', threadId, {
    debug: true,
    continueFromCheckpoint: true
  });

} finally {
  // Clean up thread
  await deleteSearchThread(threadId);
}
```

### Error Recovery Example

```typescript
import { intelligentSearch } from '@/graphs/main.graph';

const result = await intelligentSearch('complex query', {
  threadId: 'existing-thread-id',
  enableRecovery: true,
  checkpointConfig: {
    enableCheckpoints: true,
    checkpointInterval: 1
  }
});

if (result.metadata?.recoveredFrom) {
  console.log(`Recovered from checkpoint: ${result.metadata.recoveredFrom}`);
}
```

## Performance Considerations

### Memory Usage

- **Thread Storage**: In-memory with automatic cleanup
- **Checkpoint Storage**: Managed by LangGraph's MemorySaver
- **Metadata**: Lightweight JSON objects

### Scalability

- **Thread Limits**: Configurable maximum active threads (default: 1000)
- **Checkpoint Limits**: Configurable per-thread checkpoint limits
- **Cleanup Policies**: Automatic expiration and cleanup

### Optimization Recommendations

1. **Checkpoint Interval**: Adjust based on graph complexity
2. **Thread TTL**: Set appropriate expiration times
3. **Cleanup Frequency**: Balance between memory usage and performance

## Monitoring and Debugging

### Logging

The implementation provides comprehensive logging:

```
[ThreadManager] Created thread 123e4567-e89b-12d3-a456-426614174000
[CheckpointManager] Configured checkpointing for thread 123e4567-e89b-12d3-a456-426614174000
[CheckpointManager] Cleaned up 5 expired threads
[intelligentSearch] Successfully recovered state from checkpoint abc123
```

### Statistics

```typescript
// Thread statistics
const threadStats = threadManager.getThreadStats();
console.log(`Active threads: ${threadStats.totalActive}`);
console.log(`Expired threads: ${threadStats.expiredCount}`);

// Checkpoint statistics
const checkpointStats = await checkpointManager.getCheckpointStats(threadId);
console.log(`Checkpoint count: ${checkpointStats.checkpointCount}`);
console.log(`Total size: ${checkpointStats.totalSize} bytes`);
```

## Future Enhancements

### Planned Features

1. **Persistent Storage**: Database-backed checkpoint storage
2. **Compression**: State compression for large checkpoints
3. **Distributed Checkpointing**: Multi-instance checkpoint sharing
4. **Advanced Recovery**: Granular checkpoint selection
5. **Metrics Collection**: Detailed performance metrics

### Extension Points

The implementation is designed to be extensible:

- Custom checkpointer implementations
- Alternative thread storage backends
- Additional validation rules
- Custom cleanup policies

## See Also

- **[API Reference](./API-REFERENCE.md)** - Complete REST API documentation including async endpoints
- **[README](./README.md)** - Project overview and setup instructions
