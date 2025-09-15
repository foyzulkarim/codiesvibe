import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { AITool } from "@/data/tools";
import { Button } from "./ui/button";

interface SearchBarProps {
  onSearch: (query: string) => void;
  tools: AITool[];
  value: string;
  onChange: (value: string) => void;
  showSearchButton?: boolean;
}

interface Suggestion {
  type: "tool" | "category" | "query";
  text: string;
  subtitle?: string;
}

export const SearchBar = ({ onSearch, tools, value, onChange, showSearchButton = false }: SearchBarProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (value && value.length >= 2) {
      generateSuggestions(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [value, tools]);

  const generateSuggestions = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    const newSuggestions: Suggestion[] = [];

    // Tool name suggestions
    if (tools && tools.length > 0) {
      tools
        .filter(tool => 
          tool.name && tool.name.toLowerCase().includes(lowercaseQuery) ||
          (tool.searchKeywords && tool.searchKeywords.some(keyword => keyword.toLowerCase().includes(lowercaseQuery)))
        )
        .slice(0, 3)
        .forEach(tool => {
          newSuggestions.push({
            type: "tool",
            text: tool.name,
            subtitle: tool.description
          });
        });
    }

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
          text: query
        });
      });

    setSuggestions(newSuggestions);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(value);
      setShowSuggestions(false);
    }
  };

  const handleSearchClick = () => {
    onSearch(value);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onChange(suggestion.text);
    onSearch(suggestion.text);
    setShowSuggestions(false);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "tool": return "🔧";
      case "category": return "📁";
      case "query": return "🔍";
      default: return "💡";
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <input
          type="text"
          placeholder="Search AI coding tools..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => value && value.length >= 2 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="w-full pl-10 pr-20 py-3 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground"
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              setShowSuggestions(false);
            }}
            className="absolute right-12 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {showSearchButton && (
          <Button
            onClick={handleSearchClick}
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
          >
            Search
          </Button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions && suggestions.length > 0 && (
        <div className="search-suggestions animate-fade-in">
          <div className="px-4 py-2 bg-muted/50 border-b border-border">
            <p className="text-xs text-muted-foreground">
              Searching across: tool names, descriptions, categories, and features
            </p>
          </div>
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
      
      {showSuggestions && value && value.length >= 2 && suggestions && suggestions.length === 0 && (
        <div className="search-suggestions animate-fade-in">
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No suggestions found for "{value}"
            </p>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Try searching for:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["free tools", "code completion", "open source", "VS Code"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      onChange(suggestion);
                      onSearch(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};