// Mock data for AI coding tools
// Import shared types
import { AITool as SharedAITool, FILTER_OPTIONS } from '@shared/types';

// Use shared interface
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AITool extends SharedAITool {
  // Frontend-specific fields can be added here if needed
}

export const aiTools: AITool[] = [
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    description: "AI pair programmer that suggests code and entire functions in real-time",
    longDescription: "GitHub Copilot is an AI coding assistant that uses OpenAI Codex to suggest code and entire functions in real-time, right from your editor.",
    pricing: ["Subscription"],
    interface: ["IDE", "Browser Extension"],
    functionality: ["Code Completion", "Code Generation"],
    deployment: ["Cloud"],
    popularity: 95,
    rating: 4.5,
    reviewCount: 12500,
    lastUpdated: "2024-01-15",
    logoUrl: "/logos/github-copilot.png",
    features: {
      "Code Completion": true,
      "Multi-language Support": true,
      "Offline Mode": false,
      "Team Features": true,
      "Code Reviews": false
    },
    searchKeywords: ["github", "copilot", "ai", "autocomplete", "coding", "assistant"],
    tags: {
      primary: ["Popular", "Microsoft", "AI Assistant"],
      secondary: ["Enterprise", "VS Code", "JetBrains"]
    }
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "AI-first code editor built for pair-programming with AI",
    longDescription: "Cursor is a fork of VS Code that's built from the ground up to be the best way to code with AI.",
    pricing: ["Freemium"],
    interface: ["Desktop"],
    functionality: ["Code Completion", "Code Generation", "Code Q&A"],
    deployment: ["Cloud", "Self-hosted"],
    popularity: 88,
    rating: 4.7,
    reviewCount: 3200,
    lastUpdated: "2024-01-12",
    logoUrl: "/logos/cursor.png",
    features: {
      "Code Completion": true,
      "Multi-language Support": true,
      "Offline Mode": true,
      "Team Features": false,
      "Code Reviews": true
    },
    searchKeywords: ["cursor", "editor", "ai", "vscode", "pair programming"],
    tags: {
      primary: ["Editor", "AI-First", "Popular"],
      secondary: ["VS Code Fork", "Fast"]
    }
  },
  {
    id: "codeium",
    name: "Codeium",
    description: "Free AI-powered code acceleration toolkit with autocomplete, search, and chat",
    longDescription: "Codeium offers best-in-class AI code completion, search, and chat — all for free. It supports over 70+ languages and integrates with your favorite IDEs.",
    pricing: ["Free", "Enterprise"],
    interface: ["IDE", "Web", "Browser Extension"],
    functionality: ["Code Completion", "Code Search", "Code Q&A"],
    deployment: ["Cloud", "On-premise"],
    popularity: 82,
    rating: 4.4,
    reviewCount: 8900,
    lastUpdated: "2024-01-10",
    logoUrl: "/logos/codeium.png",
    features: {
      "Code Completion": true,
      "Multi-language Support": true,
      "Offline Mode": false,
      "Team Features": true,
      "Code Reviews": false
    },
    searchKeywords: ["codeium", "free", "autocomplete", "ai", "coding", "assistant"],
    tags: {
      primary: ["Free", "Popular", "Multi-IDE"],
      secondary: ["70+ Languages", "Enterprise"]
    }
  },
  {
    id: "tabby",
    name: "Tabby",
    description: "Self-hosted AI coding assistant that runs on your infrastructure",
    longDescription: "Tabby is a self-hosted AI coding assistant. You can host your own Tabby instance and have full control over your code and data.",
    pricing: ["Open Source", "Enterprise"],
    interface: ["IDE", "CLI"],
    functionality: ["Code Completion", "Code Generation"],
    deployment: ["Self-hosted", "On-premise"],
    popularity: 75,
    rating: 4.2,
    reviewCount: 1500,
    lastUpdated: "2024-01-08",
    logoUrl: "/logos/tabby.png",
    features: {
      "Code Completion": true,
      "Multi-language Support": true,
      "Offline Mode": true,
      "Team Features": true,
      "Code Reviews": false
    },
    searchKeywords: ["tabby", "self-hosted", "open source", "private", "ai"],
    tags: {
      primary: ["Open Source", "Self-hosted", "Privacy"],
      secondary: ["Docker", "Kubernetes"]
    }
  },
  {
    id: "amazon-codewhisperer",
    name: "Amazon CodeWhisperer",
    description: "ML-powered coding companion that generates code suggestions based on comments and existing code",
    longDescription: "Amazon CodeWhisperer is a machine learning (ML)–powered service that helps improve developer productivity by generating code recommendations based on their comments in natural language and code in the integrated development environment (IDE).",
    pricing: ["Free", "Enterprise"],
    interface: ["IDE", "CLI"],
    functionality: ["Code Completion", "Security Scanning"],
    deployment: ["Cloud"],
    popularity: 78,
    rating: 4.1,
    reviewCount: 2800,
    lastUpdated: "2024-01-05",
    logoUrl: "/logos/codewhisperer.png",
    features: {
      "Code Completion": true,
      "Multi-language Support": true,
      "Offline Mode": false,
      "Team Features": true,
      "Code Reviews": true
    },
    searchKeywords: ["amazon", "codewhisperer", "aws", "ml", "coding", "security"],
    tags: {
      primary: ["AWS", "Free Tier", "Security"],
      secondary: ["Enterprise", "ML-powered"]
    }
  },
  {
    id: "codium-ai",
    name: "Codium AI",
    description: "AI-powered tool for generating meaningful test cases right inside your IDE",
    longDescription: "CodiumAI analyzes your code and generates meaningful test cases to help you code smarter. It supports multiple languages and integrates with popular IDEs.",
    pricing: ["Freemium", "Subscription"],
    interface: ["IDE", "CLI"],
    functionality: ["Test Generation", "Code Analysis"],
    deployment: ["Cloud"],
    popularity: 70,
    rating: 4.3,
    reviewCount: 1200,
    lastUpdated: "2024-01-03",
    logoUrl: "/logos/codiumai.png",
    features: {
      "Code Completion": false,
      "Multi-language Support": true,
      "Offline Mode": false,
      "Team Features": false,
      "Code Reviews": true
    },
    searchKeywords: ["codium", "testing", "ai", "test generation", "quality"],
    tags: {
      primary: ["Testing", "Code Quality", "AI-powered"],
      secondary: ["Multiple Languages", "IDE Integration"]
    }
  },
  {
    id: "tabnine",
    name: "Tabnine",
    description: "AI assistant for software developers that accelerates code completion",
    longDescription: "Tabnine is an AI assistant that speeds up delivery and keeps your code safe. It suggests code completions based on context and syntax.",
    pricing: ["Free", "Subscription", "Enterprise"],
    interface: ["IDE"],
    functionality: ["Code Completion", "Code Generation"],
    deployment: ["Cloud", "On-premise"],
    popularity: 85,
    rating: 4.2,
    reviewCount: 5600,
    lastUpdated: "2024-01-14",
    logoUrl: "/logos/tabnine.png",
    features: {
      "Code Completion": true,
      "Multi-language Support": true,
      "Offline Mode": true,
      "Team Features": true,
      "Code Reviews": false
    },
    searchKeywords: ["tabnine", "autocomplete", "ai", "coding", "productivity"],
    tags: {
      primary: ["Established", "Multi-tier", "Popular"],
      secondary: ["Privacy Focused", "Team Features"]
    }
  },
  {
    id: "aider",
    name: "Aider",
    description: "Command-line AI pair programming tool that works with GPT-3.5/4 and Claude",
    longDescription: "Aider is AI pair programming in your terminal. It lets you pair program with LLMs to edit code stored in your local git repository.",
    pricing: ["Open Source"],
    interface: ["CLI"],
    functionality: ["Code Generation", "Code Refactoring", "Code Q&A"],
    deployment: ["Self-hosted"],
    popularity: 68,
    rating: 4.6,
    reviewCount: 890,
    lastUpdated: "2024-01-11",
    logoUrl: "/logos/aider.png",
    features: {
      "Code Completion": false,
      "Multi-language Support": true,
      "Offline Mode": false,
      "Team Features": false,
      "Code Reviews": true
    },
    searchKeywords: ["aider", "cli", "terminal", "gpt", "claude", "pair programming"],
    tags: {
      primary: ["Open Source", "CLI", "GPT Integration"],
      secondary: ["Git Integration", "Terminal"]
    }
  }
];

// Use shared filter options
export const filterOptions = FILTER_OPTIONS;
