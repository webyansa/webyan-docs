import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface TableOfContentsProps {
  items: TocItem[];
  activeId?: string;
  className?: string;
}

export function TableOfContents({ items, activeId, className }: TableOfContentsProps) {
  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (items.length === 0) return null;

  return (
    <nav className={cn("space-y-1", className)}>
      <h4 className="text-sm font-semibold text-foreground mb-3">
        في هذه الصفحة
      </h4>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => handleClick(item.id)}
              className={cn(
                "block w-full text-right py-1.5 pr-3 border-r-2 transition-colors",
                item.level > 1 && "pr-6",
                activeId === item.id
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )}
            >
              {item.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
