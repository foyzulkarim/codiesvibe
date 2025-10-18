"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentStateSchema = void 0;
const zod_1 = require("zod");
/**
 * Structured representation of a user's search or discovery intent for AI tools and technologies
 */
exports.IntentStateSchema = zod_1.z.object({
    primaryGoal: zod_1.z.enum([
        "find",
        "compare",
        "recommend",
        "explore",
        "analyze",
        "explain"
    ], {
        description: "High-level intent category representing the user's purpose"
    }),
    referenceTool: zod_1.z.string().nullable().optional().describe("Canonical tool name or ID used as a comparison or reference (e.g., 'Cursor IDE')"),
    comparisonMode: zod_1.z.enum([
        "similar_to",
        "vs",
        "alternative_to"
    ]).nullable().optional().describe("Specifies comparative relationship between tools"),
    desiredFeatures: zod_1.z.array(zod_1.z.enum([
        "AI code assist",
        "local inference",
        "RAG support",
        "multi-agent orchestration",
        "LLM integration",
        "context awareness",
        "CLI mode",
        "open-source"
    ])).default([]).describe("List of specific feature tags the user cares about"),
    filters: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        operator: zod_1.z.enum(["=", "<", ">", "<=", ">=", "contains"]),
        value: zod_1.z.any()
    })).default([]).describe("Structured filters derived from constraints or attributes"),
    pricing: zod_1.z.enum([
        "free",
        "freemium",
        "paid",
        "enterprise"
    ]).nullable().optional().describe("Primary pricing filter if explicitly mentioned"),
    category: zod_1.z.enum([
        "IDE",
        "API",
        "CLI",
        "Framework",
        "Agent",
        "Plugin"
    ]).nullable().optional().describe("Tool type category mentioned or implied"),
    platform: zod_1.z.enum([
        "web",
        "desktop",
        "cli",
        "api"
    ]).nullable().optional().describe("Platform or interface preference"),
    semanticVariants: zod_1.z.array(zod_1.z.string()).default([]).describe("List of paraphrased queries or search variants"),
    constraints: zod_1.z.array(zod_1.z.string()).default([]).describe("List of qualitative constraints ('cheaper', 'newer', 'simpler')"),
    confidence: zod_1.z.number().min(0).max(1).describe("Model-estimated confidence in this structured intent")
}).describe("Structured intent representation for AI tools search");
