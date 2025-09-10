import { useState } from "react";
import { X, CheckCircle, XCircle, ExternalLink, Star } from "lucide-react";
import { AITool } from "@/data/tools";

interface ComparisonPanelProps {
  tools: AITool[];
  onRemove: (toolId: string) => void;
  onClose: () => void;
}

export const ComparisonPanel = ({ tools, onRemove, onClose }: ComparisonPanelProps) => {
  if (tools.length === 0) return null;

  const allFeatures = Array.from(
    new Set(tools.flatMap(tool => Object.keys(tool.features)))
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Tool Comparison</h2>
            <p className="text-muted-foreground">Compare features side by side</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Tool Headers */}
              <thead>
                <tr>
                  <th className="text-left p-4 w-48">Features</th>
                  {tools.map((tool) => (
                    <th key={tool.id} className="p-4 text-center min-w-64">
                      <div className="space-y-3">
                        <div className="relative">
                          <button
                            onClick={() => onRemove(tool.id)}
                            className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full opacity-70 hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                            {tool.name.charAt(0)}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-foreground">{tool.name}</h3>
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <Star className="w-4 h-4 fill-warning text-warning" />
                            <span className="text-sm font-medium">{tool.rating}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Popularity: {tool.popularity}/100
                          </div>
                          <div className="flex flex-wrap gap-1 justify-center">
                            {tool.pricing.slice(0, 2).map((price) => (
                              <span
                                key={price}
                                className="px-2 py-1 text-xs bg-success/10 text-success rounded"
                              >
                                {price}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button className="w-full bg-primary text-primary-foreground hover:bg-primary-dark px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          Try Now
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Feature Rows */}
              <tbody>
                {/* Basic Info */}
                <tr className="border-t border-border">
                  <td className="p-4 font-medium bg-muted/50">Description</td>
                  {tools.map((tool) => (
                    <td key={tool.id} className="p-4 text-sm text-center">
                      {tool.description}
                    </td>
                  ))}
                </tr>

                <tr className="border-t border-border">
                  <td className="p-4 font-medium bg-muted/50">Interface</td>
                  {tools.map((tool) => (
                    <td key={tool.id} className="p-4 text-sm text-center">
                      {tool.interface.join(", ")}
                    </td>
                  ))}
                </tr>

                <tr className="border-t border-border">
                  <td className="p-4 font-medium bg-muted/50">Deployment</td>
                  {tools.map((tool) => (
                    <td key={tool.id} className="p-4 text-sm text-center">
                      {tool.deployment.join(", ")}
                    </td>
                  ))}
                </tr>

                <tr className="border-t border-border">
                  <td className="p-4 font-medium bg-muted/50">Last Updated</td>
                  {tools.map((tool) => (
                    <td key={tool.id} className="p-4 text-sm text-center">
                      {new Date(tool.lastUpdated).toLocaleDateString()}
                    </td>
                  ))}
                </tr>

                {/* Features Comparison */}
                <tr>
                  <td colSpan={tools.length + 1} className="p-4">
                    <div className="text-lg font-semibold text-foreground border-b border-border pb-2">
                      Feature Comparison
                    </div>
                  </td>
                </tr>

                {allFeatures.map((feature) => (
                  <tr key={feature} className="border-t border-border">
                    <td className="p-4 font-medium bg-muted/50">{feature}</td>
                    {tools.map((tool) => (
                      <td key={tool.id} className="p-4 text-center">
                        {tool.features[feature] ? (
                          <CheckCircle className="w-5 h-5 text-success mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-muted-foreground mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/30 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Comparing {tools.length} tools across {allFeatures.length} features
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border hover:bg-muted rounded-lg transition-colors"
            >
              Close
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-dark rounded-lg transition-colors">
              Export Comparison
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};