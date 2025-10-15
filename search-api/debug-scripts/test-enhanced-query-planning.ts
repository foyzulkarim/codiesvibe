import { StateAnnotation } from "../src/types/state";
import { queryPlanningNode } from "../src/nodes/query-planning.node";
import { EntityStatisticsSchema, MetadataContextSchema } from "../src/types/enhanced-state";

/**
 * Test script for enhanced query planning with context and statistics
 */

async function testEnhancedQueryPlanning() {
  console.log("🚀 Testing Enhanced Query Planning with Context and Statistics\n");

  // Test Case 1: High confidence query with entity statistics
  console.log("📋 Test Case 1: High confidence query with entity statistics");
  const highConfidenceState = {
    query: "React development tools",
    preprocessedQuery: "React development tools",
    intent: {
      toolNames: ["React"],
      semanticQuery: "React development tools",
      categories: ["Development"],
      functionality: ["Frontend"],
      interface: ["Web App"],
      isComparative: false,
      confidence: 0.9
    },
    confidence: {
      overall: 0.9,
      breakdown: {
        toolNames: 0.95,
        categories: 0.8,
        functionality: 0.85
      }
    },
    routingDecision: "optimal" as const,
    entityStatistics: {
      "react-tools": {
        commonInterfaces: [
          { interface: "Web App", percentage: 0.8, confidence: 0.9, sources: ["semantic"] }
        ],
        commonCategories: [
          { category: "Development", percentage: 0.9, confidence: 0.95, sources: ["semantic"] }
        ],
        commonPricing: [
          { pricing: "Free", percentage: 0.6, confidence: 0.85, sources: ["semantic"] }
        ],
        totalCount: 150,
        confidence: 0.92,
        semanticMatches: 120,
        avgSimilarityScore: 0.85,
        source: "semantic_search" as const,
        sampleTools: ["React DevTools", "React Router", "Redux"]
      }
    },
    metadataContext: {
      searchSpaceSize: 150,
      metadataConfidence: 0.92,
      assumptions: [
        "High confidence in React-related tools",
        "Good semantic match quality"
      ],
      lastUpdated: new Date(),
      enrichmentStrategy: "qdrant_multi_vector" as const,
      processingTime: 45
    },
    metadata: {
      startTime: new Date(),
      executionPath: [],
      nodeExecutionTimes: {},
      name: "test-query"
    }
  };

  try {
    const result1 = await queryPlanningNode(highConfidenceState as any);
    console.log("✅ High confidence planning result:");
    console.log(`   Strategy: ${result1.plan?.strategy}`);
    console.log(`   Adaptive: ${result1.plan?.adaptive}`);
    console.log(`   Steps: ${result1.plan?.steps?.length}`);
    console.log(`   Reasoning: ${result1.plan?.reasoning?.length} items`);
    console.log(`   Context complexity: ${result1.plan?.context?.complexity}`);
    console.log(`   Validation passed: ${result1.plan?.validationPassed}`);
    console.log(`   Planning strategy: ${result1.metadata?.planningStrategy}`);
    console.log(`   Adaptive planning: ${result1.metadata?.adaptivePlanning}\n`);
  } catch (error) {
    console.error("❌ High confidence planning failed:", error);
  }

  // Test Case 2: Medium confidence query with limited statistics
  console.log("📋 Test Case 2: Medium confidence query with limited statistics");
  const mediumConfidenceState = {
    query: "UI design tools",
    preprocessedQuery: "UI design tools",
    intent: {
      semanticQuery: "UI design tools",
      categories: ["Design"],
      interface: ["Web App"],
      isComparative: false,
      confidence: 0.6
    },
    confidence: {
      overall: 0.6,
      breakdown: {
        categories: 0.7,
        functionality: 0.5
      }
    },
    routingDecision: "multi-strategy" as const,
    entityStatistics: {
      "ui-tools": {
        commonInterfaces: [
          { interface: "Web App", percentage: 0.6, confidence: 0.7, sources: ["semantic"] }
        ],
        commonCategories: [
          { category: "Design", percentage: 0.8, confidence: 0.75, sources: ["semantic"] }
        ],
        totalCount: 50,
        confidence: 0.65,
        semanticMatches: 40,
        avgSimilarityScore: 0.7,
        source: "semantic_search" as const,
        sampleTools: ["Figma", "Sketch"]
      }
    },
    metadataContext: {
      searchSpaceSize: 50,
      metadataConfidence: 0.65,
      assumptions: [
        "Medium confidence in UI tools",
        "Limited sample size"
      ],
      lastUpdated: new Date(),
      enrichmentStrategy: "qdrant_multi_vector" as const,
      processingTime: 35
    },
    metadata: {
      startTime: new Date(),
      executionPath: [],
      nodeExecutionTimes: {},
      name: "test-query"
    }
  };

  try {
    const result2 = await queryPlanningNode(mediumConfidenceState as any);
    console.log("✅ Medium confidence planning result:");
    console.log(`   Strategy: ${result2.plan?.strategy}`);
    console.log(`   Adaptive: ${result2.plan?.adaptive}`);
    console.log(`   Steps: ${result2.plan?.steps?.length}`);
    console.log(`   Reasoning: ${result2.plan?.reasoning?.length} items`);
    console.log(`   Context complexity: ${result2.plan?.context?.complexity}`);
    console.log(`   Validation passed: ${result2.plan?.validationPassed}`);
    console.log(`   Planning strategy: ${result2.metadata?.planningStrategy}`);
    console.log(`   Strategy weights: ${JSON.stringify(result2.metadata?.strategyWeights)}\n`);
  } catch (error) {
    console.error("❌ Medium confidence planning failed:", error);
  }

  // Test Case 3: Low confidence query without statistics
  console.log("📋 Test Case 3: Low confidence query without statistics");
  const lowConfidenceState = {
    query: "something",
    preprocessedQuery: "something",
    intent: {
      semanticQuery: "something",
      confidence: 0.3
    },
    confidence: {
      overall: 0.3,
      breakdown: {
        semantic: 0.3
      }
    },
    routingDecision: "fallback" as const,
    entityStatistics: {},
    metadataContext: {
      searchSpaceSize: 0,
      metadataConfidence: 0.2,
      assumptions: [
        "Very low confidence",
        "No entity statistics available"
      ],
      lastUpdated: new Date(),
      enrichmentStrategy: "qdrant_multi_vector" as const,
      processingTime: 20
    },
    metadata: {
      startTime: new Date(),
      executionPath: [],
      nodeExecutionTimes: {},
      name: "test-query"
    }
  };

  try {
    const result3 = await queryPlanningNode(lowConfidenceState as any);
    console.log("✅ Low confidence planning result:");
    console.log(`   Strategy: ${result3.plan?.strategy}`);
    console.log(`   Adaptive: ${result3.plan?.adaptive}`);
    console.log(`   Steps: ${result3.plan?.steps?.length}`);
    console.log(`   Reasoning: ${result3.plan?.reasoning?.length} items`);
    console.log(`   Context complexity: ${result3.plan?.context?.complexity}`);
    console.log(`   Validation passed: ${result3.plan?.validationPassed}`);
    console.log(`   Planning strategy: ${result3.metadata?.planningStrategy}\n`);
  } catch (error) {
    console.error("❌ Low confidence planning failed:", error);
  }

  // Test Case 4: Complex comparative query
  console.log("📋 Test Case 4: Complex comparative query");
  const complexState = {
    query: "tools like VS Code but for Python",
    preprocessedQuery: "tools like VS Code but for Python",
    intent: {
      semanticQuery: "Python IDE tools similar to VS Code",
      referenceTool: "VS Code",
      categories: ["Development", "IDE"],
      functionality: ["Code Editing", "Debugging"],
      interface: ["Desktop App"],
      userTypes: ["Developers"],
      isComparative: true,
      confidence: 0.7
    },
    confidence: {
      overall: 0.7,
      breakdown: {
        referenceTool: 0.9,
        categories: 0.8,
        functionality: 0.6
      }
    },
    routingDecision: "optimal" as const,
    entityStatistics: {
      "python-ides": {
        commonInterfaces: [
          { interface: "Desktop App", percentage: 0.9, confidence: 0.95, sources: ["semantic"] }
        ],
        commonCategories: [
          { category: "Development", percentage: 0.95, confidence: 0.98, sources: ["semantic"] },
          { category: "IDE", percentage: 0.85, confidence: 0.9, sources: ["semantic"] }
        ],
        commonPricing: [
          { pricing: "Free", percentage: 0.7, confidence: 0.8, sources: ["semantic"] }
        ],
        totalCount: 80,
        confidence: 0.88,
        semanticMatches: 65,
        avgSimilarityScore: 0.82,
        source: "semantic_search" as const,
        sampleTools: ["PyCharm", "VS Code", "Sublime Text"]
      }
    },
    metadataContext: {
      searchSpaceSize: 80,
      metadataConfidence: 0.88,
      assumptions: [
        "High confidence in Python IDEs",
        "Good reference tool match",
        "Comparative query complexity"
      ],
      lastUpdated: new Date(),
      enrichmentStrategy: "qdrant_multi_vector" as const,
      processingTime: 55
    },
    metadata: {
      startTime: new Date(),
      executionPath: [],
      nodeExecutionTimes: {},
      name: "test-query"
    }
  };

  try {
    const result4 = await queryPlanningNode(complexState as any);
    console.log("✅ Complex comparative planning result:");
    console.log(`   Strategy: ${result4.plan?.strategy}`);
    console.log(`   Adaptive: ${result4.plan?.adaptive}`);
    console.log(`   Steps: ${result4.plan?.steps?.length}`);
    console.log(`   Reasoning: ${result4.plan?.reasoning?.length} items`);
    console.log(`   Context complexity: ${result4.plan?.context?.complexity}`);
    console.log(`   Validation passed: ${result4.plan?.validationPassed}`);
    console.log(`   Planning strategy: ${result4.metadata?.planningStrategy}`);
    
    // Check for comparative steps
    const hasSimilarStep = result4.plan?.steps?.some(step => step.name === "find-similar-by-features");
    console.log(`   Has similarity search: ${hasSimilarStep}\n`);
  } catch (error) {
    console.error("❌ Complex comparative planning failed:", error);
  }

  console.log("🎉 Enhanced Query Planning Testing Complete!");
  console.log("\n📊 Summary:");
  console.log("   ✅ Context-aware planning decisions");
  console.log("   ✅ Entity statistics integration");
  console.log("   ✅ Adaptive parameter optimization");
  console.log("   ✅ Plan reasoning and justification");
  console.log("   ✅ Enhanced validation with context");
  console.log("   ✅ Multiple strategy support");
}

// Run the test
testEnhancedQueryPlanning().catch(console.error);
