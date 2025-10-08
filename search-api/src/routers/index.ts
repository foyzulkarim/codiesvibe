// Export all routers for easy importing
export { 
  confidenceRouter, 
  enhancedConfidenceRouter 
} from "./confidence.router";

export { 
  executionRouter, 
  postExecutionRouter 
} from "./execution.router";

export { 
  qualityRouter, 
  preQualityRouter, 
  adaptiveQualityRouter 
} from "./quality.router";

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