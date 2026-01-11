import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, FileText, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchArticles, docModules, type DocArticle } from "@/data/docsData";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  variant?: "hero" | "compact";
  className?: string;
}

export function SearchBar({ variant = "compact", className }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocArticle[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.trim().length >= 2) {
      const found = searchArticles(query);
      setResults(found.slice(0, 5));
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  const findArticlePath = (article: DocArticle) => {
    for (const mod of docModules) {
      for (const sub of mod.subModules) {
        if (sub.articles.find((a) => a.id === article.id)) {
          return `/docs/${mod.slug}/${sub.slug}/${article.slug}`;
        }
      }
    }
    return "/";
  };

  const handleResultClick = (article: DocArticle) => {
    navigate(findArticlePath(article));
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground",
              variant === "hero" ? "h-5 w-5" : "h-4 w-4"
            )}
          />
          <Input
            ref={inputRef}
            type="search"
            placeholder="ابحث عن مقال، موضوع، أو إجراء..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
            className={cn(
              "transition-all",
              variant === "hero"
                ? "h-14 pr-12 pl-12 text-lg rounded-2xl shadow-lg border-2 focus:border-secondary"
                : "pr-10 pl-10"
            )}
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2",
                variant === "hero" ? "h-10 w-10" : "h-8 w-8"
              )}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
          <ul>
            {results.map((article) => (
              <li key={article.id}>
                <button
                  onClick={() => handleResultClick(article)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-muted transition-colors"
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {article.title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {article.description}
                    </p>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 bg-muted/50 border-t">
            <button
              onClick={handleSubmit}
              className="text-sm text-secondary hover:text-secondary/80 font-medium"
            >
              عرض جميع نتائج البحث عن "{query}"
            </button>
          </div>
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border rounded-xl shadow-xl p-6 text-center z-50 animate-fade-in">
          <p className="text-muted-foreground">
            لم نجد نتائج لـ "{query}"
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            جرب كلمات بحث مختلفة
          </p>
        </div>
      )}
    </div>
  );
}
