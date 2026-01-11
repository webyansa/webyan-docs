import { Link, useParams } from "react-router-dom";
import * as Icons from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Breadcrumb } from "@/components/docs/Breadcrumb";
import { ArticleCard } from "@/components/docs/ArticleCard";
import { docModules } from "@/data/docsData";
import { cn } from "@/lib/utils";

function getIcon(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.FileText;
}

export default function ModulePage() {
  const { moduleSlug } = useParams();

  const module = docModules.find((m) => m.slug === moduleSlug);

  if (!module) {
    return (
      <DocsLayout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">القسم غير موجود</h1>
          <Link to="/" className="text-primary hover:underline">
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </DocsLayout>
    );
  }

  const IconComponent = getIcon(module.icon);

  return (
    <DocsLayout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: module.title }]} className="mb-6" />

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={cn(
                "flex items-center justify-center w-16 h-16 rounded-2xl",
                module.color === "primary" && "bg-primary/10 text-primary",
                module.color === "secondary" && "bg-secondary/20 text-secondary",
                module.color === "accent" && "bg-accent/20 text-accent"
              )}
            >
              <IconComponent className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {module.title}
              </h1>
              <p className="text-muted-foreground">{module.description}</p>
            </div>
          </div>
        </header>

        {/* SubModules */}
        <div className="space-y-10">
          {module.subModules.map((subModule) => {
            const SubIcon = getIcon(subModule.icon);

            return (
              <section key={subModule.id}>
                <div className="flex items-center gap-3 mb-4">
                  <SubIcon className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold">{subModule.title}</h2>
                </div>

                {subModule.articles.length > 0 ? (
                  <div className="grid gap-4">
                    {subModule.articles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        moduleSlug={module.slug}
                        subModuleSlug={subModule.slug}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border-2 border-dashed text-center">
                    <p className="text-muted-foreground">
                      لا توجد مقالات حالياً في هذا القسم
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      سيتم إضافة المحتوى قريباً
                    </p>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </DocsLayout>
  );
}
