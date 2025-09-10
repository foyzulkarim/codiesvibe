import { useState } from "react";
import { filterOptions } from "@/data/tools";
import { X, ChevronDown, ChevronUp } from "lucide-react";

interface TagFilterProps {
  activeFilters: Record<string, string[]>;
  onFilterChange: (category: string, value: string) => void;
  onClearAll: () => void;
  filteredCount: number;
  totalCount: number;
}

export const TagFilter = ({ 
  activeFilters, 
  onFilterChange, 
  onClearAll, 
  filteredCount, 
  totalCount 
}: TagFilterProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pricing: true,
    functionality: true,
    interface: false,
    deployment: false
  });

  const hasActiveFilters = Object.values(activeFilters).some(filters => filters.length > 0);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getTagClassName = (category: string, value: string) => {
    const isActive = activeFilters[category]?.includes(value);
    return `tag-${category} ${isActive ? "data-[active=true]" : ""}`;
  };

  const isTagActive = (category: string, value: string) => {
    return activeFilters[category]?.includes(value) || false;
  };

  return (
    <div className="space-y-6">
      {/* Filter Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{filteredCount}</span> of {totalCount} tools match your criteria
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-muted"
          >
            <X className="w-4 h-4" />
            Clear all filters
          </button>
        )}
      </div>

      {/* Filter Categories */}
      <div className="space-y-4">
        {/* Pricing Filters */}
        <div>
          <button
            onClick={() => toggleSection("pricing")}
            className="flex items-center justify-between w-full text-left mb-2 hover:text-primary transition-colors"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-success"></span>
              Pricing
            </h3>
            {expandedSections.pricing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.pricing && (
            <div className="tag-group animate-fade-in">
              {filterOptions.pricing.map((option) => (
                <button
                  key={option}
                  className={getTagClassName("pricing", option)}
                  data-active={isTagActive("pricing", option)}
                  onClick={() => onFilterChange("pricing", option)}
                >
                  {option}
                  {isTagActive("pricing", option) && (
                    <div className="w-1 h-1 rounded-full bg-current"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Interface Filters */}
        <div>
          <button
            onClick={() => toggleSection("interface")}
            className="flex items-center justify-between w-full text-left mb-2 hover:text-primary transition-colors"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              Interface
            </h3>
            {expandedSections.interface ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.interface && (
            <div className="tag-group animate-fade-in">
              {filterOptions.interface.map((option) => (
                <button
                  key={option}
                  className={getTagClassName("interface", option)}
                  data-active={isTagActive("interface", option)}
                  onClick={() => onFilterChange("interface", option)}
                >
                  {option}
                  {isTagActive("interface", option) && (
                    <div className="w-1 h-1 rounded-full bg-current"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Functionality Filters */}
        <div>
          <button
            onClick={() => toggleSection("functionality")}
            className="flex items-center justify-between w-full text-left mb-2 hover:text-primary transition-colors"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-secondary"></span>
              Functionality
            </h3>
            {expandedSections.functionality ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.functionality && (
            <div className="tag-group animate-fade-in">
              {filterOptions.functionality.map((option) => (
                <button
                  key={option}
                  className={getTagClassName("functionality", option)}
                  data-active={isTagActive("functionality", option)}
                  onClick={() => onFilterChange("functionality", option)}
                >
                  {option}
                  {isTagActive("functionality", option) && (
                    <div className="w-1 h-1 rounded-full bg-current"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Deployment Filters */}
        <div>
          <button
            onClick={() => toggleSection("deployment")}
            className="flex items-center justify-between w-full text-left mb-2 hover:text-primary transition-colors"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-warning"></span>
              Deployment
            </h3>
            {expandedSections.deployment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.deployment && (
            <div className="tag-group animate-fade-in">
              {filterOptions.deployment.map((option) => (
                <button
                  key={option}
                  className={getTagClassName("deployment", option)}
                  data-active={isTagActive("deployment", option)}
                  onClick={() => onFilterChange("deployment", option)}
                >
                  {option}
                  {isTagActive("deployment", option) && (
                    <div className="w-1 h-1 rounded-full bg-current"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Popular Filter Combinations */}
      {!hasActiveFilters && (
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Popular combinations:</h3>
          <div className="flex flex-wrap gap-2">
            <button
              className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-full transition-colors"
              onClick={() => {
                onFilterChange("pricing", "Free");
                onFilterChange("interface", "IDE");
              }}
            >
              Free + IDE
            </button>
            <button
              className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-full transition-colors"
              onClick={() => {
                onFilterChange("deployment", "Self-hosted");
                onFilterChange("pricing", "Open Source");
              }}
            >
              Self-hosted + Open Source
            </button>
            <button
              className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-full transition-colors"
              onClick={() => {
                onFilterChange("functionality", "Code Completion");
                onFilterChange("pricing", "Freemium");
              }}
            >
              Code Completion + Freemium
            </button>
          </div>
        </div>
      )}
    </div>
  );
};