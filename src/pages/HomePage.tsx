import { Link } from "react-router-dom";
import { Search, BookOpen, Rocket, TrendingUp, Clock, ArrowLeft } from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { SearchBar } from "@/components/docs/SearchBar";
import { ModuleCard } from "@/components/docs/ModuleCard";
import { ArticleCard } from "@/components/docs/ArticleCard";
import { docModules, getPopularArticles } from "@/data/docsData";
import webyanLogo from "@/assets/webyan-logo.svg";

export default function HomePage() {
  const popularArticles = getPopularArticles(4);

  // Find article paths for popular articles
  const getArticlePath = (articleId: string) => {
    for (const mod of docModules) {
      for (const sub of mod.subModules) {
        const article = sub.articles.find((a) => a.id === articleId);
        if (article) {
          return { module: mod, subModule: sub, article };
        }
      }
    }
    return null;
  };

  return (
    <DocsLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl docs-hero-section mb-12 px-6 py-16 lg:py-20">
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <img
              src={webyanLogo}
              alt="ويبيان"
              className="h-12 brightness-0 invert"
            />
          </div>

          <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4">
            دليل استخدام لوحة التحكم
          </h1>

          <p className="text-lg text-white/80 mb-8">
            كل ما تحتاجه لإدارة موقعك باحترافية. دليل شامل ومنظم لجميع ميزات منصة ويبيان.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <SearchBar variant="hero" />
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/2" />
      </section>

      {/* Quick Start */}
      <section className="mb-12">
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            to="/getting-started"
            className="docs-card flex items-center gap-4 p-6 group"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/20 text-secondary group-hover:scale-110 transition-transform">
              <Rocket className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                ابدأ هنا
              </h3>
              <p className="text-sm text-muted-foreground">
                دليل البداية السريعة للمستخدمين الجدد
              </p>
            </div>
            <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
          </Link>

          <Link
            to="/changelog"
            className="docs-card flex items-center gap-4 p-6 group"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <Clock className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                مركز التحديثات
              </h3>
              <p className="text-sm text-muted-foreground">
                تعرف على آخر التغييرات والميزات الجديدة
              </p>
            </div>
            <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
          </Link>
        </div>
      </section>

      {/* Popular Articles */}
      {popularArticles.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-secondary" />
            <h2 className="text-xl font-semibold">الأكثر زيارة</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {popularArticles.map((article) => {
              const found = getArticlePath(article.id);
              if (!found) return null;
              return (
                <ArticleCard
                  key={article.id}
                  article={article}
                  moduleSlug={found.module.slug}
                  subModuleSlug={found.subModule.slug}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Modules Grid */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">استكشف الأقسام</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docModules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      </section>
    </DocsLayout>
  );
}
