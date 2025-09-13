import { useState, useMemo, useCallback } from "react";
import { SearchBar } from "@/components/SearchBar";
import { TagFilter } from "@/components/TagFilter";
import { ToolGrid } from "@/components/ToolGrid";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import { SortSelector } from "@/components/SortSelector";
import { AITool, aiTools } from "@/data/tools";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, LogIn, UserPlus } from "lucide-react";
import { useTools } from "@/hooks/api/useTools";
import { SORT_OPTIONS } from "@/lib/config";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { FilterState } from "@/api/types";

const Index = () => {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    pricing: [],
    interface: [],
    functionality: [],
    deployment: []
  });
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>(SORT_OPTIONS.POPULARITY);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // API data fetching
  const { 
    data: tools, 
    isLoading, 
    isError, 
    error 
  } = useTools(searchQuery, activeFilters, sortBy, sortDirection);
  
  // Comparison state
  const [comparisonTools, setComparisonTools] = useState<AITool[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Filter and search logic is now handled by the API
  // We just use the tools data directly from the API
  const filteredTools = tools;

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

  const handleRetry = () => {
    // This will trigger a refetch due to React Query's retry mechanism
    window.location.reload();
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
          {/* Login/Signup Button */}
          <div className="flex justify-end mb-8">
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <LogIn className="w-4 h-4" />
                Login
              </Button>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Sign Up
              </Button>
            </div>
          </div>
          
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
                tools={tools.length > 0 ? tools : aiTools}
                searchQuery={searchQuery}
              />
            </div>

            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-8 pt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span>{tools.length || aiTools.length} Tools</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                <span>{tools.filter(t => t.pricing.some(p => p === "Free" || p === "Open Source")).length} Free</span>
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
                activeFilters={activeFilters as unknown as Record<string, string[]>}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearFilters}
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
            {/* Header with sorting and stats */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <ActiveFilterChips
                  activeFilters={activeFilters as unknown as Record<string, string[]>}
                  onRemoveFilter={(category, value) => handleFilterChange(category, value)}
                  onClearAll={handleClearFilters}
                  totalCount={tools.length || 0}
                  filteredCount={filteredTools.length}
                />
              </div>
              <SortSelector 
                currentSort={sortBy}
                currentDirection={sortDirection}
                onSortChange={(newSort, newDirection) => {
                  setSortBy(newSort);
                  setSortDirection(newDirection);
                }}
              />
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="bg-card border border-border rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                        <Skeleton className="w-12 h-12 rounded-xl" />
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16 rounded-full" />
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="space-y-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error?.message || 'Failed to load tools. Please try again.'}
                  </AlertDescription>
                </Alert>
                <div className="text-center">
                  <Button onClick={handleRetry} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Success State */}
            {!isLoading && !isError && (
              <ToolGrid
                tools={filteredTools}
                onCompare={handleCompare}
                onSave={handleSave}
              />
            )}
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
