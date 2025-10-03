import { X } from "lucide-react";
import { aiTools } from "@/data/tools";

interface ActiveFilterChipsProps {
  filters: Record<string, string[]>;
  searchQuery: string;
  onRemoveFilter: (type: string, value: string) => void;
  onClearAll: () => void;
}

export const ActiveFilterChips = ({
  filters,
  searchQuery,
  onRemoveFilter,
  onClearAll,
}: ActiveFilterChipsProps) => {
  const hasActiveFilters =
    Object.values(filters).some((filterArray) => filterArray.length > 0) ||
    searchQuery.length > 0;

  const allActiveFilters = Object.entries(filters).flatMap(
    ([category, values]) => values.map((value) => ({ category, value })),
  );

  // Add search query as a filter chip if it exists
  const searchFilter = searchQuery
    ? [{ category: "search", value: searchQuery }]
    : [];
  const allFilters = [...allActiveFilters, ...searchFilter];

  if (!hasActiveFilters) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            All tools shown
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Active Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Active Filters:
          </span>
          {allFilters.map(({ category, value }) => (
            <button
              key={`${category}-${value}`}
              onClick={() => onRemoveFilter(category, value)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-full hover:bg-primary/90 transition-colors"
            >
              <span>✓</span>
              {category === "search" ? `"${value}"` : value}
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
      </div>
    </div>
  );
};
