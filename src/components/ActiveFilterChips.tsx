import { X } from "lucide-react";
import { aiTools } from "@/data/tools";

interface ActiveFilterChipsProps {
  activeFilters: Record<string, string[]>;
  onRemoveFilter: (category: string, value: string) => void;
  onClearAll: () => void;
  totalCount: number;
  filteredCount: number;
}

export const ActiveFilterChips = ({ 
  activeFilters, 
  onRemoveFilter, 
  onClearAll, 
  totalCount,
  filteredCount 
}: ActiveFilterChipsProps) => {
  const hasActiveFilters = Object.values(activeFilters).some(filters => filters.length > 0);
  
  if (!hasActiveFilters) return null;

  const allActiveFilters = Object.entries(activeFilters).flatMap(([category, values]) =>
    values.map(value => ({ category, value }))
  );

  return (
    <div className="space-y-4 mb-6">
      {/* Active Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">Active Filters:</span>
        {allActiveFilters.map(({ category, value }) => (
          <button
            key={`${category}-${value}`}
            onClick={() => onRemoveFilter(category, value)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-full hover:bg-primary/90 transition-colors"
          >
            {value}
            <X className="w-3 h-3" />
          </button>
        ))}
        <button
          onClick={onClearAll}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 hover:bg-muted rounded-md"
        >
          Clear all filters
        </button>
      </div>

      {/* Results Summary */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {filteredCount} of {totalCount} tools match your criteria
        </h2>
      </div>
    </div>
  );
};