import { useState } from "react";
import { Star, TrendingUp, Plus, GitCompare, Heart, ExternalLink, Calendar } from "lucide-react";
import { AITool } from "@/data/tools";

interface ToolCardProps {
  tool: AITool;
  onCompare: (tool: AITool) => void;
  onSave: (tool: AITool) => void;
  isExpanded?: boolean;
  onToggleExpanded?: (toolId: string) => void;
}

export const ToolCard = ({ tool, onCompare, onSave, isExpanded, onToggleExpanded }: ToolCardProps) => {
  const [imageError, setImageError] = useState(false);

  const getPricingColor = (pricing: string[]) => {
    if (pricing.includes("Free") || pricing.includes("Open Source")) return "text-success";
    if (pricing.includes("Freemium")) return "text-primary";
    return "text-warning";
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
              <h3 className="text-lg font-semibold text-foreground truncate">
                {tool.name}
              </h3>
              <div className="popularity-score">
                <TrendingUp className="w-3 h-3" />
                {tool.popularity}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tool.description.length > 120 ? `${tool.description.substring(0, 120)}...` : tool.description}
            </p>
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap gap-2">
          {tool.pricing.slice(0, 2).map((price) => (
            <span
              key={price}
              className={`px-2 py-1 text-xs font-medium rounded-md bg-success/10 ${getPricingColor([price])}`}
            >
              {price}
            </span>
          ))}
          {tool.interface.slice(0, 2).map((interface_) => (
            <span
              key={interface_}
              className="px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary"
            >
              {interface_}
            </span>
          ))}
          {tool.functionality.slice(0, 2).map((func) => (
            <span
              key={func}
              className="px-2 py-1 text-xs font-medium rounded-md bg-secondary/10 text-secondary"
            >
              {func}
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

            {/* Feature Matrix */}
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

            {/* All Tags */}
            <div>
              <h4 className="text-sm font-medium mb-2">All Categories</h4>
              <div className="flex flex-wrap gap-1">
                {[...tool.pricing, ...tool.interface, ...tool.functionality, ...tool.deployment].map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button className="flex-1 bg-primary text-primary-foreground hover:bg-primary-dark px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
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