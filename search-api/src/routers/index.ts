// Import all routers
import { confidenceRouter, enhancedConfidenceRouter } from "./confidence.router";
import { executionRouter, postExecutionRouter } from "./execution.router";
import { qualityRouter, preQualityRouter, adaptiveQualityRouter } from "./quality.router";

// Re-export all routers for easy importing
export { 
  confidenceRouter, 
  enhancedConfidenceRouter,
  executionRouter, 
  postExecutionRouter,
  qualityRouter, 
  preQualityRouter, 
  adaptiveQualityRouter 
};

// Router registry for dynamic execution
export const routerRegistry = {
  "confidence": confidenceRouter,
  "enhanced-confidence": enhancedConfidenceRouter,
  "execution": executionRouter,
  "post-execution": postExecutionRouter,
  "quality": qualityRouter,
  "pre-quality": preQualityRouter,
  "adaptive-quality": adaptiveQualityRouter
};

// Helper function to get router by name
export function getRouter(name: keyof typeof routerRegistry) {
  return routerRegistry[name];
}