import { useState, useMemo } from "react";
import { SearchBar } from "@/components/SearchBar";
import { TagFilter } from "@/components/TagFilter";
import { ToolGrid } from "@/components/ToolGrid";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { aiTools, AITool } from "@/data/tools";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Zap } from "lucide-react";

const Index = () => {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({
    pricing: [],
    interface: [],
    functionality: [],
    deployment: []
  });
  
  // Comparison state
  const [comparisonTools, setComparisonTools] = useState<AITool[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Filter and search logic
  const filteredTools = useMemo(() => {
    let filtered = aiTools;

    // Apply text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.searchKeywords.some(keyword => keyword.toLowerCase().includes(query)) ||
        tool.functionality.some(func => func.toLowerCase().includes(query)) ||
        tool.tags.primary.some(tag => tag.toLowerCase().includes(query)) ||
        tool.tags.secondary.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([category, values]) => {
      if (values.length > 0) {
        filtered = filtered.filter(tool => {
          const toolValues = tool[category as keyof AITool] as string[];
          return values.some(value => toolValues.includes(value));
        });
      }
    });

    // Sort by popularity by default
    return filtered.sort((a, b) => b.popularity - a.popularity);
  }, [searchQuery, activeFilters]);

  // Handlers
  const handleFilterChange = (category: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const handleClearFilters = () => {
    setActiveFilters({
      pricing: [],
      interface: [],
      functionality: [],
      deployment: []
    });
  };

  const handleCompare = (tool: AITool) => {
    if (comparisonTools.find(t => t.id === tool.id)) {
      toast({
        title: "Tool already in comparison",
        description: `${tool.name} is already selected for comparison.`,
      });
      return;
    }

    if (comparisonTools.length >= 4) {
      toast({
        title: "Comparison limit reached",
        description: "You can compare up to 4 tools at once. Remove one to add another.",
      });
      return;
    }

    setComparisonTools(prev => [...prev, tool]);
    toast({
      title: "Added to comparison",
      description: `${tool.name} has been added to your comparison.`,
    });
  };

  const handleRemoveFromComparison = (toolId: string) => {
    setComparisonTools(prev => prev.filter(t => t.id !== toolId));
  };

  const handleSave = (tool: AITool) => {
    toast({
      title: "Saved for later",
      description: `${tool.name} has been saved to your favorites.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="gradient-subtle border-b border-border">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold text-gradient">
                AI Tool Discovery
              </h1>
              <Zap className="w-8 h-8 text-secondary" />
            </div>
            
            <p className="text-xl text-muted-foreground leading-relaxed">
              Find the perfect AI coding assistant for your workflow. Compare features, 
              pricing, and capabilities across the most popular AI development tools.
            </p>

            <div className="mt-8">
              <SearchBar
                onSearch={setSearchQuery}
                tools={aiTools}
                searchQuery={searchQuery}
              />
            </div>

            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-8 pt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span>{aiTools.length} Tools</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                <span>{aiTools.filter(t => t.pricing.some(p => p === "Free" || p === "Open Source")).length} Free</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span>Updated Weekly</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <TagFilter
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearFilters}
                filteredCount={filteredTools.length}
                totalCount={aiTools.length}
              />

              {/* Comparison Widget */}
              {comparisonTools.length > 0 && (
                <div className="p-4 bg-card border border-border rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Comparison ({comparisonTools.length})</h3>
                    <button
                      onClick={() => setShowComparison(true)}
                      className="text-sm text-primary hover:text-primary-dark font-medium"
                    >
                      Compare
                    </button>
                  </div>
                  <div className="space-y-2">
                    {comparisonTools.map((tool) => (
                      <div key={tool.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{tool.name}</span>
                        <button
                          onClick={() => handleRemoveFromComparison(tool.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Tool Grid */}
          <div className="lg:col-span-3">
            <ToolGrid
              tools={filteredTools}
              onCompare={handleCompare}
              onSave={handleSave}
            />
          </div>
        </div>
      </div>

      {/* Comparison Panel */}
      {showComparison && (
        <ComparisonPanel
          tools={comparisonTools}
          onRemove={handleRemoveFromComparison}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
};

export default Index;
