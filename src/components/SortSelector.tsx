import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SORT_OPTIONS_UI, SortOptionUI } from "@/api/types";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface SortSelectorProps {
  currentSort: string;
  currentDirection: 'asc' | 'desc';
  onSortChange: (sortBy: string, direction: 'asc' | 'desc') => void;
  className?: string;
}

export const SortSelector = ({ currentSort, currentDirection, onSortChange, className }: SortSelectorProps) => {
  const handleDirectionToggle = () => {
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(currentSort, newDirection);
  };

  const handleSortChange = (sortBy: string) => {
    onSortChange(sortBy, currentDirection);
  };

  const getCurrentSortOption = () => {
    return SORT_OPTIONS_UI.find(option => option.value === currentSort);
  };

  const currentSortOption = getCurrentSortOption();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleDirectionToggle}
        className="p-1 hover:bg-muted rounded-md transition-colors"
        title={`Sort ${currentDirection === 'asc' ? 'descending' : 'ascending'}`}
      >
        {currentDirection === 'asc' ? (
          <ArrowUp className="w-4 h-4 text-foreground" />
        ) : (
          <ArrowDown className="w-4 h-4 text-foreground" />
        )}
      </button>
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS_UI.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <span>{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  ({option.direction === 'asc' ? 'A-Z' : '9-1'})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
