import { useState, useMemo } from "react";
import { filterOptions, aiTools } from "@/data/tools";
import { X, ChevronDown, ChevronUp, Check } from "lucide-react";

interface TagFilterProps {
  activeFilters: Record<string, string[]>;
  onFilterChange: (category: string, values: string[]) => void;
  onClearAll: () => void;
}

export const TagFilter = ({ 
  activeFilters, 
  onFilterChange, 
  onClearAll
}: TagFilterProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pricing: true,
    functionality: false,
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

  // Calculate filter counts
  const getFilterCount = useMemo(() => {
    return (category: string, value: string) => {
      // Create a temporary filter state with just this filter active
      const tempFilters = { ...activeFilters };
      
      // If this filter is already active, we want to count tools without it
      if (activeFilters[category]?.includes(value)) {
        tempFilters[category] = activeFilters[category].filter(v => v !== value);
      } else {
        // If not active, add it to see how many tools would match
        tempFilters[category] = [...(activeFilters[category] || []), value];
      }
      
      // Count tools that match the temporary filter state
      const count = aiTools.filter(tool => {
        return Object.entries(tempFilters).every(([cat, values]) => {
          if (values.length === 0) return true;
          const toolValues = tool[cat as keyof typeof tool] as string[];
          return values.some(val => toolValues.includes(val));
        });
      }).length;
      
      return count;
    };
  }, [activeFilters]);

  const isTagActive = (category: string, value: string) => {
    return activeFilters[category]?.includes(value) || false;
  };

  const getChipClassName = (category: string, value: string) => {
    const isActive = isTagActive(category, value);
    const baseClasses = "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105";
    
    if (isActive) {
      return `${baseClasses} bg-primary text-primary-foreground shadow-sm`;
    }
    
    return `${baseClasses} bg-muted border border-border text-foreground hover:bg-muted/80 hover:border-border/80`;
  };

  const sectionIcons = {
    pricing: "💰",
    interface: "🖥️", 
    functionality: "⚡",
    deployment: "🚀"
  };

  return (
    <div className="space-y-6">

      {/* Filter Categories */}
      <div className="space-y-4">
        {Object.entries(filterOptions).map(([category, options]) => (
          <div key={category}>
            <button
              onClick={() => toggleSection(category)}
              className="flex items-center justify-between w-full text-left mb-3 hover:text-primary transition-colors group"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="text-base">{sectionIcons[category as keyof typeof sectionIcons]}</span>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </h3>
              {expandedSections[category] ? 
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" /> : 
                <span className="text-muted-foreground group-hover:text-primary transition-colors">▶</span>
              }
            </button>
            {expandedSections[category] && (
              <div className="flex flex-wrap gap-2 animate-fade-in">
                {options.map((option) => (
                  <button
                    key={option}
                    className={getChipClassName(category, option)}
                    onClick={() => {
                      const currentValues = activeFilters[category] || [];
                      const isActive = currentValues.includes(option);
                      const newValues = isActive 
                        ? currentValues.filter(v => v !== option)
                        : [...currentValues, option];
                      onFilterChange(category, newValues);
                    }}
                  >
                    {isTagActive(category, option) && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    {option}
                    <span className="text-xs opacity-75">
                      ({getFilterCount(category, option)})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {!hasActiveFilters && (
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Popular combinations:</h3>
          <div className="flex flex-wrap gap-2">
            <button
              className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-full transition-colors"
              onClick={() => {
                onFilterChange("pricing", [...(activeFilters.pricing || []), "Free"]);
                onFilterChange("interface", [...(activeFilters.interface || []), "IDE"]);
              }}
            >
              Free + IDE
            </button>
            <button
              className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-full transition-colors"
              onClick={() => {
                onFilterChange("deployment", [...(activeFilters.deployment || []), "Self-hosted"]);
                onFilterChange("pricing", [...(activeFilters.pricing || []), "Open Source"]);
              }}
            >
              Self-hosted + Open Source
            </button>
            <button
              className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-full transition-colors"
              onClick={() => {
                onFilterChange("functionality", [...(activeFilters.functionality || []), "Code Completion"]);
                onFilterChange("pricing", [...(activeFilters.pricing || []), "Freemium"]);
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