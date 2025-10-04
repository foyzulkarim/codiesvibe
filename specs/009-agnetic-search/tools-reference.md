# AI Reasoning Search Tools Reference

This document defines the complete set of tools available for the AI reasoning search layer implementation.

## Tool Categories Overview

### Filtering Tools (7 tools)
- `filterByField` - Filter by single field with operator (eq, ne, gt, lt, gte, lte, in, nin)
- `filterByNestedField` - Filter by nested object properties (e.g., pricing.free)
- `filterByArrayContains` - Filter where array field contains specific value(s)
- `filterByArrayIntersection` - Filter where array fields have overlapping values
- `filterByPriceRange` - Specialized price filtering with range support
- `filterByDateRange` - Date-based filtering with ISO date support
- `filterByExists` - Check if field exists and is not null/undefined

### Sorting Tools (3 tools)
- `sortByField` - Sort by single field (asc/desc) with null handling
- `sortByNestedField` - Sort by nested object properties
- `sortByMultipleFields` - Multi-field sorting with priority order

### Aggregation Tools (5 tools)
- `groupBy` - Group results by field value(s)
- `countBy` - Count occurrences by field value
- `getUnique` - Get distinct values for a field
- `getMinMax` - Get minimum and maximum values for numeric fields
- `calculateAverage` - Calculate average for numeric fields

### Array Operations (5 tools)
- `limitResults` - Limit number of results with pagination support
- `skipResults` - Skip N results (for pagination)
- `intersectResults` - Get intersection of current results with another set
- `unionResults` - Combine current results with another set
- `getDifference` - Get results that exist in current but not in comparison set

### Search/Match Tools (4 tools)
- `searchByKeywords` - Fuzzy match across searchKeywords and aliases fields
- `searchByText` - Full-text search across description and longDescription
- `findById` - Find specific tool by ID
- `findBySlug` - Find specific tool by slug

### Projection Tools (2 tools)
- `selectFields` - Return only specified fields from results
- `excludeFields` - Exclude specified fields from results

### Utility Tools (1 tool)
- `getSchema` - Return field structure for LLM self-discovery
- `getCurrentResults` - Get current state of filtered data

## Tool Implementation Standards

### Common Parameters
All tools should include:
- `reasoning: string` - Explanation of why this tool was selected
- `confidence: number` - Confidence score (0.0-1.0) for the operation

### Error Handling
- Field validation against allowed schema
- Type checking for parameters
- Graceful handling of missing/null values
- Clear error messages with suggestions

### Performance Considerations
- Pure functions with no side effects
- Efficient algorithms for large datasets
- Memory-conscious operations
- Proper indexing hints where applicable

## Integration with AI Reasoning

### Context Awareness
Tools should consider:
- Previous operations in the reasoning chain
- Current dataset state and size
- User intent and query context
- Confidence scores from previous steps

### Reasoning Explanations
Each tool execution should provide:
- Why this tool was chosen over alternatives
- How parameters were determined
- What the operation accomplished
- Confidence in the result quality

### Chaining Support
Tools must support:
- Sequential application with state preservation
- Rollback capability for poor choices
- Alternative path exploration
- Context drift detection