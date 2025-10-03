import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { SORT_OPTIONS } from "@/lib/config";

interface SortSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const SORT_LABELS = {
  [SORT_OPTIONS.NAME]: "Name A-Z",
  [SORT_OPTIONS.CREATED_AT]: "Recently Added",
};

export function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SORT_LABELS).map(([sortValue, label]) => (
          <SelectItem key={sortValue} value={sortValue}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
