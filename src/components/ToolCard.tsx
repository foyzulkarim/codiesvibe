import { useState, useMemo } from "react";
import { Star, TrendingUp, Plus, GitCompare, Heart, ExternalLink, Calendar } from "lucide-react";
import { AITool } from "@shared/types";

interface ToolCardProps {
  tool: AITool;
  onCompare?: (tool: AITool) => void;
  onSave?: (tool: AITool) => void;
  isExpanded?: boolean;
  onToggleExpanded?: (toolId: string) => void;
  searchTerm?: string;
}

export const ToolCard = ({ tool, onCompare, onSave, isExpanded, onToggleExpanded, searchTerm }: ToolCardProps) => {
  const [imageError, setImageError] = useState(false);

  // Memoized highlight function for performance
  const highlightText = useMemo(() => {
    return (text: string, term?: string): string => {
      if (!term || term.length < 2) return text;
      
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
    };
  }, []);

  const getPricingColor = (pricing: string[]) => {
    if (pricing.includes("Free") || pricing.includes("Open Source")) return "text-success";
    if (pricing.includes("Freemium")) return "text-primary";
    return "text-warning";
  };

  // Helper to get pricing display from v2.0 structure
  const getPricingDisplay = () => {
    if (tool.pricingSummary) {
      const { hasFreeTier, pricingModel } = tool.pricingSummary;
      if (hasFreeTier) return ["Free"];
      if (pricingModel.includes("freemium")) return ["Freemium"];
      if (pricingModel.includes("subscription")) return ["Subscription"];
      if (pricingModel.includes("enterprise")) return ["Enterprise"];
    }
    return tool.pricing || [];
  };

  // Helper to get interface display from v2.0 structure
  const getInterfaceDisplay = () => {
    if (tool.capabilities?.integrations?.platforms) {
      return tool.capabilities.integrations.platforms;
    }
    return tool.interface || [];
  };

  // Helper to get functionality display from v2.0 structure
  const getFunctionalityDisplay = () => {
    if (tool.capabilities?.core) {
      return tool.capabilities.core;
    }
    return tool.functionality || [];
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const handleCardClick = () => {
    if (onToggleExpanded) {
      onToggleExpanded(tool.id);
    }
  };

  return (
    <div 
      className={`tool-card ${isExpanded ? 'tool-card-expanded' : ''} group`}
      onClick={handleCardClick}
    >
      {/* Quick Actions - Hidden until hover */}
      <div className="quick-actions">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompare(tool);
          }}
          className="p-2 bg-white/90 backdrop-blur-sm border border-border rounded-lg shadow-sm hover:shadow-md transition-all hover:scale-105"
          title="Compare"
        >
          <GitCompare className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave(tool);
          }}
          className="p-2 bg-white/90 backdrop-blur-sm border border-border rounded-lg shadow-sm hover:shadow-md transition-all hover:scale-105"
          title="Save for later"
        >
          <Heart className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Header Row */}
        <div className="flex items-start gap-4">
          <div className="tool-logo">
            {!imageError ? (
              <img
                src={tool.logoUrl}
                alt={`${tool.name} logo`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold text-lg">
                {tool.name.charAt(0)}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 
                className="text-lg font-semibold text-foreground truncate"
                dangerouslySetInnerHTML={{ 
                  __html: highlightText(tool.name, searchTerm) 
                }}
              />
              <div className="popularity-score">
                <TrendingUp className="w-3 h-3" />
                {tool.popularity}
              </div>
            </div>
            
            <p 
              className="text-sm text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: highlightText(
                  tool.description.length > 120 ? `${tool.description.substring(0, 120)}...` : tool.description,
                  searchTerm
                )
              }}
            />
          </div>
        </div>

        {/* Tags Row - Updated for v2.0 */}
        <div className="flex flex-wrap gap-2">
          {getPricingDisplay().slice(0, 2).map((price) => (
            <span
              key={price}
              className={`px-2 py-1 text-xs font-medium rounded-md bg-success/10 ${getPricingColor([price])}`}
            >
              {price}
            </span>
          ))}
          {getInterfaceDisplay().slice(0, 2).map((interface_) => (
            <span
              key={interface_}
              className="px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary"
            >
              {interface_}
            </span>
          ))}
          {getFunctionalityDisplay().slice(0, 2).map((func) => (
            <span
              key={func}
              className="px-2 py-1 text-xs font-medium rounded-md bg-secondary/10 text-secondary"
            >
              {func}
            </span>
          ))}

          {/* v2.0 Categories */}
          {tool.categories?.primary?.slice(0, 2).map((category) => (
            <span
              key={category}
              className="px-2 py-1 text-xs font-medium rounded-md bg-accent/10 text-accent"
            >
              {category}
            </span>
          ))}
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {tool.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-warning text-warning" />
                <span className="font-medium">{tool.rating}</span>
                <span className="text-muted-foreground">({tool.reviewCount?.toLocaleString() || '0'})</span>
              </div>
            )}
            {!tool.rating && (
              <span className="text-muted-foreground text-xs">No ratings yet</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span className="text-xs">{formatLastUpdated(tool.lastUpdated)}</span>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-border pt-4 space-y-4 animate-fade-in">
            {/* Long Description */}
            {tool.longDescription && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tool.longDescription}
              </p>
            )}

            {/* AI Features Matrix (v2.0) */}
            {tool.capabilities?.aiFeatures && (
              <div>
                <h4 className="text-sm font-medium mb-2">AI Capabilities</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(tool.capabilities.aiFeatures).map(([feature, available]) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${available ? 'bg-success' : 'bg-border'}`}></div>
                      <span className={available ? 'text-foreground' : 'text-muted-foreground'}>
                        {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legacy Feature Matrix (backward compatibility) */}
            {tool.features && (
              <div>
                <h4 className="text-sm font-medium mb-2">Key Features</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(tool.features).map(([feature, available]) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${available ? 'bg-success' : 'bg-border'}`}></div>
                      <span className={available ? 'text-foreground' : 'text-muted-foreground'}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Details (v2.0) */}
            {tool.pricingDetails && tool.pricingDetails.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Pricing Plans</h4>
                <div className="space-y-2">
                  {tool.pricingDetails.slice(0, 3).map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <span className="font-medium text-sm">{plan.name}</span>
                        {plan.isPopular && (
                          <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                            Popular
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {plan.price === null ? 'Custom' : plan.price === 0 ? 'Free' : `$${plan.price}/${plan.billing}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Use Cases (v2.0) */}
            {tool.useCases && tool.useCases.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Use Cases</h4>
                <div className="space-y-2">
                  {tool.useCases.slice(0, 3).map((useCase) => (
                    <div key={useCase.name} className="p-2 rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{useCase.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{useCase.complexity}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{useCase.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Categories - Updated for v2.0 */}
            <div>
              <h4 className="text-sm font-medium mb-2">All Categories</h4>
              <div className="space-y-2">
                {/* v2.0 Categories */}
                {tool.categories && (
                  <div className="space-y-1">
                    {tool.categories.primary && tool.categories.primary.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Primary:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tool.categories.primary.map((cat) => (
                            <span key={cat} className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {tool.categories.industries && tool.categories.industries.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Industries:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tool.categories.industries.map((industry) => (
                            <span key={industry} className="px-2 py-1 text-xs bg-secondary/10 text-secondary rounded">
                              {industry}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy Categories (backward compatibility) */}
                {(tool.pricing || tool.interface || tool.functionality || tool.deployment) && (
                  <div className="flex flex-wrap gap-1">
                    {[
                      ...(getPricingDisplay() || []),
                      ...(getInterfaceDisplay() || []),
                      ...(getFunctionalityDisplay() || []),
                      ...(tool.deployment || [])
                    ].map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.open(tool.website || `https://example.com/${tool.id}`, '_blank')}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary-dark px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Try Now
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCompare(tool);
                }}
                className="px-4 py-2 border border-border hover:bg-muted rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <GitCompare className="w-4 h-4" />
                Compare
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};