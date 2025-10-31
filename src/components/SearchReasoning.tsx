import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AiSearchReasoning } from '@/api/types';

interface SearchReasoningProps {
  reasoning?: AiSearchReasoning;
  searchQuery: string;
}

export const SearchReasoning: React.FC<SearchReasoningProps> = ({ reasoning, searchQuery }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no reasoning data or no search query
  if (!reasoning || !searchQuery) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/50">
      <CardHeader 
        className="cursor-pointer hover:bg-blue-100/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-lg font-semibold text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">🧠</span>
            AI Search Reasoning
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-blue-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-blue-600" />
          )}
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-800 font-mono overflow-x-auto whitespace-pre-wrap text-left">
            {JSON.stringify(reasoning, null, 2)}
          </pre>
        </CardContent>
      )}
    </Card>
  );
};
