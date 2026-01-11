import { Link } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocArticle } from "@/data/docsData";
import { docTags } from "@/data/docsData";

interface ArticleCardProps {
  article: DocArticle;
  moduleSlug: string;
  subModuleSlug: string;
  className?: string;
}

export function ArticleCard({
  article,
  moduleSlug,
  subModuleSlug,
  className,
}: ArticleCardProps) {
  const articleTags = docTags.filter((tag) => article.tags.includes(tag.id));

  return (
    <Link
      to={`/docs/${moduleSlug}/${subModuleSlug}/${article.slug}`}
      className={cn("docs-card block p-5 group", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
            {article.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {article.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {articleTags.map((tag) => (
              <span
                key={tag.id}
                className={cn(
                  "docs-tag",
                  tag.type === "level" && tag.id === "basic" && "docs-tag-basic",
                  tag.type === "level" && tag.id === "advanced" && "docs-tag-advanced",
                  tag.type === "role" && "bg-primary/10 text-primary",
                  tag.type === "category" && "bg-muted text-muted-foreground"
                )}
              >
                {tag.label}
              </span>
            ))}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {article.viewCount.toLocaleString("ar-SA")} مشاهدة
            </span>
            <span>آخر تحديث: {article.lastUpdated}</span>
          </div>
        </div>

        <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
      </div>
    </Link>
  );
}
