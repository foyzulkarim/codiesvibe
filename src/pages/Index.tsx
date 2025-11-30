import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SearchBar } from "@/components/SearchBar";
import { ToolGrid } from "@/components/ToolGrid";
import { SortSelector } from "@/components/SortSelector";
import { TagFilter } from "@/components/TagFilter";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import ResultsCounter from "@/components/ResultsCounter";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { SearchReasoning } from "@/components/SearchReasoning";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, Sparkles, Zap, Github, LogOut, Settings } from "lucide-react";
import { useTools } from "@/hooks/api/useTools";
import { FilterState } from "@/api/types";
import { SORT_OPTIONS } from "@/lib/config";
import { useAuth, useUser, useClerk } from "@clerk/clerk-react";

export default function Index() {
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // For the actual API search

  // Clerk authentication hooks
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  // Use the API hook for data fetching
  const { data: tools, reasoning, isLoading, isError, error } = useTools(
    searchQuery
  );

  // Handle search (only triggers on Enter/button press)
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };


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
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/foyzulkarim/codiesvibe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
                title="View on GitHub - This project is open source"
              >
                <Github className="h-6 w-6" />
              </a>

              {/* Auth Controls */}
              {isLoaded && (
                <>
                  {isSignedIn ? (
                    <div className="flex items-center space-x-3">
                      <Link to="/admin/tools">
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Admin
                        </Button>
                      </Link>
                      <span className="text-sm text-muted-foreground hidden sm:inline">
                        {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => signOut()}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Link to="/sign-in">
                        <Button variant="ghost" size="sm">
                          <LogIn className="h-4 w-4 mr-2" />
                          Login
                        </Button>
                      </Link>
                      <Link to="/sign-up">
                        <Button size="sm">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
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
            {/* 
            <SortSelector
              value={sortBy}
              onChange={handleSortChange}
            /> */}
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
    </div>
  );
}
