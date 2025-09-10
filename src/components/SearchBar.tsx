import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { AITool } from "@/data/tools";

interface SearchBarProps {
  onSearch: (query: string) => void;
  tools: AITool[];
  searchQuery: string;
}

interface Suggestion {
  type: "tool" | "category" | "query";
  text: string;
  subtitle?: string;
}

export const SearchBar = ({ onSearch, tools, searchQuery }: SearchBarProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      generateSuggestions(searchQuery);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, tools]);

  const generateSuggestions = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    const newSuggestions: Suggestion[] = [];

    // Tool name suggestions
    tools
      .filter(tool => 
        tool.name.toLowerCase().includes(lowercaseQuery) ||
        tool.searchKeywords.some(keyword => keyword.toLowerCase().includes(lowercaseQuery))
      )
      .slice(0, 3)
      .forEach(tool => {
        newSuggestions.push({
          type: "tool",
          text: tool.name,
          subtitle: tool.description
        });
      });

    // Category suggestions
    const categories = [
      { name: "Code Completion tools", description: "AI-powered autocomplete and suggestions" },
      { name: "Open Source alternatives", description: "Free and open source AI coding tools" },
      { name: "Self-hosted solutions", description: "AI tools you can run on your own servers" },
      { name: "Free AI coding tools", description: "No-cost AI development assistants" }
    ];

    categories
      .filter(cat => cat.name.toLowerCase().includes(lowercaseQuery))
      .slice(0, 2)
      .forEach(category => {
        newSuggestions.push({
          type: "category",
          text: category.name,
          subtitle: category.description
        });
      });

    // Popular query suggestions
    const popularQueries = [
      "free alternatives to GitHub Copilot",
      "self-hosted AI coding assistant",
      "VS Code AI extensions",
      "open source code completion"
    ];

    popularQueries
      .filter(query => query.toLowerCase().includes(lowercaseQuery))
      .slice(0, 2)
      .forEach(query => {
        newSuggestions.push({
          type: "query",
          text: query,
          subtitle: "Popular search"
        });
      });

    setSuggestions(newSuggestions.slice(0, 6));
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onSearch(suggestion.text);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    onSearch("");
    setShowSuggestions(false);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "tool":
        return "🔧";
      case "category":
        return "📂";
      case "query":
        return "🔍";
      default:
        return "💡";
    }
  };

  return (
    <div className="search-container">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-6 h-6" />
        <input
          type="text"
          placeholder="Search for AI tools... (e.g., 'free code completion for VS Code')"
          className="search-input pl-14 pr-12"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions animate-fade-in">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="flex items-start gap-3 px-4 py-3 hover:bg-muted cursor-pointer transition-colors border-b border-border last:border-b-0"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <span className="text-lg mt-0.5">{getSuggestionIcon(suggestion.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {suggestion.text}
                </div>
                {suggestion.subtitle && (
                  <div className="text-sm text-muted-foreground truncate mt-0.5">
                    {suggestion.subtitle}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground capitalize px-2 py-1 bg-muted rounded-full">
                {suggestion.type}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};