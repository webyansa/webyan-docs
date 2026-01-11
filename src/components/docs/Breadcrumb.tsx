import { Link } from "react-router-dom";
import { ChevronLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("docs-breadcrumb flex-wrap", className)} aria-label="مسار التنقل">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-primary transition-colors"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">الرئيسية</span>
      </Link>

      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          <ChevronLeft className="h-4 w-4 text-muted-foreground/50" />
          {item.href ? (
            <Link
              to={item.href}
              className="hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
