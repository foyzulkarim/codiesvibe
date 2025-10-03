import { useState } from "react";
import { AITool } from "@/data/tools";
import { ToolCard } from "./ToolCard";
import { Grid, List } from "lucide-react";

interface ToolGridProps {
  tools: AITool[];
  isLoading?: boolean;
  searchTerm?: string;
  onCompare: (tool: AITool) => void;
  onSave: (tool: AITool) => void;
  savedTools?: Set<string>;
  comparisonTools?: AITool[];
}

export const ToolGrid = ({
  tools,
  isLoading,
  searchTerm,
  onCompare,
  onSave,
  savedTools,
  comparisonTools,
}: ToolGridProps) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleToggleExpanded = (toolId: string) => {
    setExpandedCard(expandedCard === toolId ? null : toolId);
  };

  if (tools.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
          <div className="text-4xl">🔍</div>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No tools found
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          We couldn't find any AI tools matching your search criteria. Try
          adjusting your filters or search terms.
        </p>
        <div className="mt-6">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Popular searches:
          </h4>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "GitHub Copilot alternatives",
              "Free AI coding tools",
              "Self-hosted solutions",
              "VS Code extensions",
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Found{" "}
          <span className="font-medium text-foreground">{tools.length}</span> AI
          coding tools
        </div>

        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded transition-colors ${
              viewMode === "grid"
                ? "bg-white shadow-sm text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Grid view"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded transition-colors ${
              viewMode === "list"
                ? "bg-white shadow-sm text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tool Cards */}
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            : "space-y-4"
        }
      >
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            searchTerm={searchTerm}
            isExpanded={expandedCard === tool.id}
            onToggleExpanded={() => handleToggleExpanded(tool.id)}
            onCompare={onCompare}
            onSave={onSave}
          />
        ))}
      </div>
    </div>
  );
};
