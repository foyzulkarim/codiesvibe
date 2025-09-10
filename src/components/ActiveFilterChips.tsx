import { X, ArrowUpDown } from "lucide-react";
import { aiTools } from "@/data/tools";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  
  const allActiveFilters = Object.entries(activeFilters).flatMap(([category, values]) =>
    values.map(value => ({ category, value }))
  );

  if (!hasActiveFilters) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            All tools shown
          </h2>
          
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Select defaultValue="popularity">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Popularity</SelectItem>
                <SelectItem value="pricing-low">Pricing (Low to High)</SelectItem>
                <SelectItem value="pricing-high">Pricing (High to Low)</SelectItem>
                <SelectItem value="name-asc">Name (A to Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z to A)</SelectItem>
                <SelectItem value="interface-asc">Interface (A to Z)</SelectItem>
                <SelectItem value="functionality-asc">Functionality (A to Z)</SelectItem>
                <SelectItem value="deployment-asc">Deployment (A to Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Active Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">Active Filters:</span>
          {allActiveFilters.map(({ category, value }) => (
            <button
              key={`${category}-${value}`}
              onClick={() => onRemoveFilter(category, value)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-full hover:bg-primary/90 transition-colors"
            >
              <span>✓</span>
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

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <Select defaultValue="popularity">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="pricing-low">Pricing (Low to High)</SelectItem>
              <SelectItem value="pricing-high">Pricing (High to Low)</SelectItem>
              <SelectItem value="name-asc">Name (A to Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z to A)</SelectItem>
              <SelectItem value="interface-asc">Interface (A to Z)</SelectItem>
              <SelectItem value="functionality-asc">Functionality (A to Z)</SelectItem>
              <SelectItem value="deployment-asc">Deployment (A to Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};