"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateAnnotation = void 0;
const langgraph_1 = require("@langchain/langgraph");
// New Simplified State Schema using LangGraph's Annotation
exports.StateAnnotation = langgraph_1.Annotation.Root({
    // Core query information
    query: (langgraph_1.Annotation),
    // New pipeline stages
    intentState: (langgraph_1.Annotation),
    executionPlan: (langgraph_1.Annotation),
    candidates: (langgraph_1.Annotation),
    // Execution statistics and tracking
    executionStats: (langgraph_1.Annotation),
    // Error handling and recovery
    errors: (langgraph_1.Annotation),
    // Simplified metadata for observability
    metadata: (langgraph_1.Annotation)
});
