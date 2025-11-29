import { Search, X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

interface SearchBarProps {
  onSearch: (query: string) => void;
  value: string;
  onChange: (value: string) => void;
  showSearchButton?: boolean;
  isLoading?: boolean;
}

export const SearchBar = ({ onSearch, value, onChange, showSearchButton = false, isLoading = false }: SearchBarProps) => {

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      onSearch(value);
    }
  };

  const handleSearchClick = () => {
    if (!isLoading) {
      onSearch(value);
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
          className="w-full pl-10 pr-20 py-3 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground"
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
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
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Loading...
              </>
            ) : (
              "Search"
            )}
          </Button>
        )}
      </div>
    </div>
  );
};