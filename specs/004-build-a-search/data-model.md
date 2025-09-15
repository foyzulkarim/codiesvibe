# Component Modification Data Model

## Overview
This document outlines the direct component changes needed for the AI tools search system. No database schema changes are required - all changes are frontend component updates.

## Component Modifications

### 1. SearchBar Component Changes

**Current Interface** (keeping same props):
```tsx
interface SearchBarProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  tools: Tool[];
  // ... other existing props
}
```

**Implementation Changes**:
```tsx
const SearchBar = ({ searchQuery, onSearch, ...props }: SearchBarProps) => {
  const [inputValue, setInputValue] = useState(searchQuery);

  // Remove debounced search behavior
  // Add button search behavior
  const handleButtonSearch = () => {
    onSearch(inputValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleButtonSearch();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Search AI tools..."
      />
      <button onClick={handleButtonSearch}>
        Search
      </button>
    </div>
  );
};
```

**Changes Made**:
- Remove debounced search effect
- Add search button and click handler
- Add Enter key support
- Trigger search only on explicit user action

### 2. ToolCard Component Changes

**Interface Addition**:
```tsx
interface ToolCardProps {
  tool: Tool;
  isSelected?: boolean;
  onToggleSelect?: (tool: Tool) => void;
  searchTerm?: string; // NEW: For text highlighting
  // ... other existing props
}
```

**Highlighting Implementation**:
```tsx
const ToolCard = ({ tool, searchTerm, ...props }: ToolCardProps) => {
  const highlightText = useCallback((text: string): React.ReactNode => {
    if (!searchTerm?.trim()) return text;

    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  }, [searchTerm]);

  return (
    <div className="tool-card">
      <h3>{highlightText(tool.name)}</h3>
      <p>{highlightText(tool.description)}</p>
      {/* ... rest of existing component */}
    </div>
  );
};
```

### 3. SortSelector Component Enhancement

**Current Options** (based on existing implementation):
```tsx
enum SortOption {
  POPULARITY = 'popularity',
  RATING = 'rating',
  REVIEW_COUNT = 'reviewCount',
  CREATED_AT = 'createdAt',
  RELEVANCE = 'relevance'
}
```

**Enhanced Options**:
```tsx
enum SortOption {
  POPULARITY = 'popularity',
  RATING = 'rating',
  REVIEW_COUNT = 'reviewCount',
  CREATED_AT = 'createdAt',
  RELEVANCE = 'relevance',
  NAME_ASC = 'name'  // NEW: Alphabetical sorting
}
```

**Display Labels Update**:
```tsx
const sortOptions = [
  { value: SortOption.POPULARITY, label: 'Popularity' },
  { value: SortOption.RATING, label: 'Rating' },
  { value: SortOption.REVIEW_COUNT, label: 'Review Count' },
  { value: SortOption.NAME_ASC, label: 'Name A-Z' }, // NEW
  { value: SortOption.CREATED_AT, label: 'Recently Added' },
  { value: SortOption.RELEVANCE, label: 'Relevance' }
];
```

**Backend Verification Required**:
- Confirm existing API supports `sortBy=name` parameter
- If not supported, backend enhancement needed in tools.service.ts

### 4. Results Counter Component (New)

**New Component Interface**:
```tsx
interface ResultsCounterProps {
  totalCount: number;
  searchTerm?: string;
  isLoading?: boolean;
  className?: string;
}

const ResultsCounter = ({ totalCount, searchTerm, isLoading, className }: ResultsCounterProps) => {
  if (isLoading) {
    return <div className={className}>Searching...</div>;
  }

  const hasSearch = searchTerm && searchTerm.trim().length > 0;
  const countText = totalCount === 1 ? 'AI coding tool' : 'AI coding tools';

  return (
    <div className={className}>
      {hasSearch ? (
        <>Found <strong>{totalCount}</strong> {countText}</>
      ) : (
        <>Showing <strong>{totalCount}</strong> {countText}</>
      )}
    </div>
  );
};
```

**Integration Points**:
- Place in existing results header area
- Update when search/filter state changes
- Use existing `pagination.total` from API response

### 5. Parent Component State Management

**Updated Index Page**:
```tsx
const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: toolsData, isLoading } = useTools({
    search: searchQuery,
    // ... other existing filters
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div>
      <SearchBar
        searchQuery={searchQuery}
        onSearch={handleSearch}
        tools={toolsData?.data || []}
      />

      <ResultsCounter
        totalCount={toolsData?.pagination?.total || 0}
        searchTerm={searchQuery}
        isLoading={isLoading}
      />

      <ToolGrid
        tools={toolsData?.data || []}
        searchTerm={searchQuery}
      />
    </div>
  );
};
```

## Data Flow Changes

### Updated Flow
```
User Input → SearchBar (button trigger) → useTools Hook → API Call → Results Display (with highlighting + counter)
```

### State Dependencies

**Search State**:
- `searchQuery`: Main search term (existing, no changes)

**Display State**:
- `searchTerm`: Passed to components for highlighting (new)
- `totalCount`: Used for results counter (from existing API data)

## API Data Requirements

### Existing API Response (No Changes Needed)
```typescript
interface ToolsResponse {
  data: Tool[];
  pagination: {
    page: number;
    limit: number;
    total: number; // Used for results counter
    pages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  // ... other existing fields
}
```

### Backend Verification Tasks
1. **Test name sorting**: Verify `GET /api/tools?sortBy=name` works
2. **Check sort direction**: Confirm `sortOrder=asc` for A-Z sorting
3. **Validate response format**: Ensure `pagination.total` reflects search results

## Component Testing Requirements

### SearchBar Tests
```typescript
describe('SearchBar Button Mode', () => {
  it('should not trigger search on input change when in button mode');
  it('should trigger search when button is clicked');
  it('should show search button when showSearchButton is true');
  it('should handle Enter key press to trigger search');
});
```

### ToolCard Tests
```typescript
describe('ToolCard Highlighting', () => {
  it('should highlight search term in tool name');
  it('should highlight search term in description');
  it('should not highlight when no search term provided');
  it('should escape special regex characters in search term');
});
```

### ResultsCounter Tests
```typescript
describe('ResultsCounter', () => {
  it('should display correct count format for search results');
  it('should show loading state when isLoading is true');
  it('should handle singular vs plural tool text correctly');
});
```

## Performance Considerations

### Memoization Strategy
```tsx
// Memoize highlighting function for performance
const HighlightedText = React.memo(({ text, searchTerm }: { text: string; searchTerm?: string }) => {
  return useMemo(() => highlightText(text, searchTerm), [text, searchTerm]);
});
```

### Re-render Optimization
- Use `React.memo` for ToolCard components
- Memoize highlighting calculations
- Avoid passing new objects/functions as props unnecessarily

## Implementation Strategy

### Direct Implementation
1. **SearchBar**: Replace debounced search with button trigger
2. **ToolCard**: Add highlighting with searchTerm prop
3. **ResultsCounter**: Create new component for counter display
4. **SortSelector**: Add "Name A-Z" option to existing dropdown
5. **Index**: Update to pass searchTerm to components

All changes are straightforward modifications to existing components.