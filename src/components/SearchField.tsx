import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function SearchField({
  value,
  onChange,
  label,
  description,
  placeholder,
  className,
  onFocus,
  onBlur,
}: SearchFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {label}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
        <Input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={onFocus}
          onBlur={onBlur}
          className="pl-10 text-sm text-black"
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground/70">{description}</p>
      )}
    </div>
  );
}
