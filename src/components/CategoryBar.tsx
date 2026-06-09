import type { Category } from "../lib/xtream";

interface CategoryBarProps {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}

export function CategoryBar({ categories, value, onChange }: CategoryBarProps) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar lg:mx-0 lg:px-0">
      <Chip active={value === "all"} onClick={() => onChange("all")}>
        Todas
      </Chip>
      {categories.map((c) => (
        <Chip key={c.category_id} active={value === c.category_id} onClick={() => onChange(c.category_id)}>
          {c.category_name}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`focusable shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
