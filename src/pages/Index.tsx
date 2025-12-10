import { useState } from "react";
import { SearchBar, SearchReasoning } from "@/components/search";
import { ToolGrid } from "@/components/tools";
import { ResultsCounter } from "@/components/common";
import { Layout } from "@/components/layout";
import { Zap } from "lucide-react";
import { useTools } from "@/hooks/api/useTools";

export function Index() {
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tools, reasoning, isLoading, isError, error } = useTools(
    searchQuery
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <Layout header="main">
      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-4">
            <Zap className="h-12 w-12 text-primary mr-3" />
            <h2 className="text-4xl font-bold">Discover AI Coding Tools</h2>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Find the perfect AI-powered tools to supercharge your development workflow
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <SearchBar
              value={inputValue}
              onChange={setInputValue}
              onSearch={handleSearch}
              showSearchButton={true}
              isLoading={isLoading}
            />
          </div>

          {/* AI Search Reasoning */}
          {reasoning && searchQuery && (
            <div className="max-w-4xl mx-auto mb-8">
              <SearchReasoning reasoning={reasoning} searchQuery={searchQuery} />
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-col gap-2">
              <ResultsCounter
                isLoading={isLoading}
                searchTerm={searchQuery}
                totalCount={tools?.length || 0}
              />
            </div>
          </div>

          {/* Tools Grid */}
          {isError ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Error loading tools: {error?.message || 'Unknown error'}
              </p>
            </div>
          ) : (
            <ToolGrid
              tools={tools || []}
              isLoading={isLoading}
              searchTerm={searchQuery}
            />
          )}
        </div>
      </main>
    </Layout>
  );
}
