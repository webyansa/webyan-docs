import { useSearchParams, Link } from "react-router-dom";
import { Search, FileText, ArrowLeft } from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Breadcrumb } from "@/components/docs/Breadcrumb";
import { SearchBar } from "@/components/docs/SearchBar";
import { ArticleCard } from "@/components/docs/ArticleCard";
import { searchArticles, docModules, type DocArticle } from "@/data/docsData";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const results = query.trim() ? searchArticles(query) : [];

  const getArticlePath = (article: DocArticle) => {
    for (const mod of docModules) {
      for (const sub of mod.subModules) {
        if (sub.articles.find((a) => a.id === article.id)) {
          return { module: mod, subModule: sub };
        }
      }
    }
    return null;
  };

  return (
    <DocsLayout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: "نتائج البحث" }]} className="mb-6" />

        {/* Search */}
        <div className="mb-8">
          <SearchBar variant="hero" />
        </div>

        {/* Results */}
        {query.trim() ? (
          <>
            <div className="mb-6">
              <p className="text-muted-foreground">
                {results.length > 0 ? (
                  <>
                    تم العثور على <span className="font-semibold text-foreground">{results.length}</span> نتيجة لـ "{query}"
                  </>
                ) : (
                  <>لم نجد نتائج لـ "{query}"</>
                )}
              </p>
            </div>

            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map((article) => {
                  const path = getArticlePath(article);
                  if (!path) return null;
                  return (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      moduleSlug={path.module.slug}
                      subModuleSlug={path.subModule.slug}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 px-6 rounded-2xl bg-muted/50">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">لم نجد نتائج</h2>
                <p className="text-muted-foreground mb-6">
                  جرب كلمات بحث مختلفة أو تصفح الأقسام
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  تصفح جميع الأقسام
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 px-6 rounded-2xl bg-muted/50">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">ابحث في الدليل</h2>
            <p className="text-muted-foreground">
              أدخل كلمات البحث للعثور على المقالات والشروحات
            </p>
          </div>
        )}
      </div>
    </DocsLayout>
  );
}
