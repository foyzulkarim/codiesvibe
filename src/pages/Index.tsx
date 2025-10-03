import { useState, useEffect } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ToolGrid } from "@/components/ToolGrid";
import { SortSelector } from "@/components/SortSelector";
import { TagFilter } from "@/components/TagFilter";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import ResultsCounter from "@/components/ResultsCounter";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, Sparkles, Zap, Github } from "lucide-react";
import { useTools } from "@/hooks/api/useTools";
import { FilterState } from "@/api/types";
import { AITool, aiTools } from "@/data/tools";
import { SORT_OPTIONS } from "@/lib/config";

export default function Index() {
  const [inputValue, setInputValue] = useState(""); // For the input field
  const [searchQuery, setSearchQuery] = useState(""); // For the actual API search
  const [filters, setFilters] = useState<FilterState>({
    pricing: [],
    interface: [],
    functionality: [],
    deployment: [],
  });
  const [sortBy, setSortBy] = useState<string>("name");
  const [comparisonTools, setComparisonTools] = useState<AITool[]>([]);
  const [savedTools, setSavedTools] = useState<Set<string>>(new Set());

  // Use the API hook for data fetching
  const {
    data: tools,
    isLoading,
    isError,
    error,
  } = useTools(searchQuery, filters, sortBy, "desc");

  // Handle search (only triggers on Enter/button press)
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Handle filter changes
  const handleFilterChange = (
    filterType: keyof FilterState,
    values: string[],
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: values,
    }));
  };

  // Handle sort changes
  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
  };

  // Handle comparison
  const handleCompare = (tool: AITool) => {
    if (comparisonTools.find((t) => t.name === tool.name)) {
      console.log(`${tool.name} is already in comparison`);
      return;
    }

    if (comparisonTools.length >= 3) {
      console.log("Maximum 3 tools can be compared");
      return;
    }

    setComparisonTools((prev) => [...prev, tool]);
  };

  const handleRemoveFromComparison = (tool: AITool) => {
    setComparisonTools((prev) => prev.filter((t) => t.name !== tool.name));
  };

  // Handle save/unsave
  const handleSave = (tool: AITool) => {
    const newSavedTools = new Set(savedTools);
    if (savedTools.has(tool.name)) {
      newSavedTools.delete(tool.name);
      console.log(`${tool.name} removed from saved tools`);
    } else {
      newSavedTools.add(tool.name);
      console.log(`${tool.name} added to saved tools`);
    }
    setSavedTools(newSavedTools);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      pricing: [],
      interface: [],
      functionality: [],
      deployment: [],
    });
    setInputValue("");
    setSearchQuery("");
  };

  // Check if any filters are active
  const hasActiveFilters =
    Object.values(filters).some((arr) => arr.length > 0) ||
    searchQuery.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">CodiesVibe</h1>
            </div>
            <a
              href="https://github.com/foyzulkarim/codiesvibe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              title="View on GitHub - This project is open source"
            >
              <Github className="h-6 w-6" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-4">
            <Zap className="h-12 w-12 text-primary mr-3" />
            <h2 className="text-4xl font-bold">Discover AI Coding Tools</h2>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Find the perfect AI-powered tools to supercharge your development
            workflow
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <SearchBar
              value={inputValue}
              onChange={setInputValue}
              onSearch={handleSearch}
              showSearchButton={true}
              tools={aiTools}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 space-y-6">
            <TagFilter
              onFilterChange={handleFilterChange}
              activeFilters={filters}
            />
          </aside>

          {/* Content */}
          <div className="flex-1">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex flex-col gap-2">
                <ResultsCounter
                  isLoading={isLoading}
                  searchTerm={searchQuery}
                  totalCount={tools?.length || 0}
                />
                {hasActiveFilters && (
                  <ActiveFilterChips
                    filters={filters}
                    searchQuery={searchQuery}
                    onRemoveFilter={(type, value) => {
                      if (type === "search") {
                        setInputValue("");
                        setSearchQuery("");
                      } else {
                        handleFilterChange(
                          type as keyof FilterState,
                          filters[type as keyof FilterState].filter(
                            (v) => v !== value,
                          ),
                        );
                      }
                    }}
                    onClearAll={clearAllFilters}
                  />
                )}
              </div>

              <SortSelector value={sortBy} onChange={handleSortChange} />
            </div>

            {/* Tools Grid */}
            {isError ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Error loading tools: {error?.message || "Unknown error"}
                </p>
              </div>
            ) : (
              <ToolGrid
                tools={tools || []}
                isLoading={isLoading}
                searchTerm={searchQuery}
                onCompare={handleCompare}
                onSave={handleSave}
                savedTools={savedTools}
                comparisonTools={comparisonTools}
              />
            )}
          </div>
        </div>
      </main>

      {/* Comparison Panel */}
      {comparisonTools.length > 0 && (
        <ComparisonPanel
          tools={comparisonTools}
          onRemove={handleRemoveFromComparison}
          onClear={() => setComparisonTools([])}
        />
      )}
    </div>
  );
}
