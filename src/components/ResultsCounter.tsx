interface ResultsCounterProps {
  isLoading: boolean;
  searchTerm: string;
  totalCount: number;
}

export default function ResultsCounter({
  isLoading,
  searchTerm,
  totalCount,
}: ResultsCounterProps) {
  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading results...</div>
    );
  }

  const hasSearchTerm = searchTerm && searchTerm.length >= 2;

  if (hasSearchTerm) {
    return (
      <div className="text-sm text-muted-foreground">
        {totalCount} result{totalCount !== 1 ? "s" : ""} for "{searchTerm}"
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground">
      {totalCount} tool{totalCount !== 1 ? "s" : ""} available
    </div>
  );
}
