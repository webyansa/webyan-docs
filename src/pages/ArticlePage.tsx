import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, User, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Breadcrumb } from "@/components/docs/Breadcrumb";
import { TableOfContents } from "@/components/docs/TableOfContents";
import { FeedbackWidget } from "@/components/docs/FeedbackWidget";
import { docModules, docTags, findArticleBySlug, type DocArticle } from "@/data/docsData";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ArticlePage() {
  const { moduleSlug, subModuleSlug, articleSlug } = useParams();

  const article = articleSlug ? findArticleBySlug(articleSlug) : undefined;

  const module = docModules.find((m) => m.slug === moduleSlug);
  const subModule = module?.subModules.find((sm) => sm.slug === subModuleSlug);

  if (!article || !module || !subModule) {
    return (
      <DocsLayout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">المقال غير موجود</h1>
          <p className="text-muted-foreground mb-6">
            لم نتمكن من العثور على المقال المطلوب
          </p>
          <Link to="/" className="text-primary hover:underline">
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </DocsLayout>
    );
  }

  const articleTags = docTags.filter((tag) => article.tags.includes(tag.id));

  const tocItems = [
    { id: "objective", title: "الهدف", level: 1 },
    { id: "prerequisites", title: "المتطلبات المسبقة", level: 1 },
    { id: "steps", title: "خطوات التنفيذ", level: 1 },
    ...(article.notes.length > 0 ? [{ id: "notes", title: "ملاحظات", level: 1 }] : []),
    ...(article.warnings.length > 0 ? [{ id: "warnings", title: "تنبيهات", level: 1 }] : []),
    ...(article.commonErrors.length > 0 ? [{ id: "errors", title: "أخطاء شائعة", level: 1 }] : []),
    ...(article.faqs.length > 0 ? [{ id: "faq", title: "أسئلة شائعة", level: 1 }] : []),
    ...(article.relatedArticles.length > 0 ? [{ id: "related", title: "مواضيع ذات صلة", level: 1 }] : []),
  ];

  // Find prev/next articles
  const allArticles: { article: DocArticle; module: typeof module; subModule: typeof subModule }[] = [];
  docModules.forEach((m) => {
    m.subModules.forEach((sm) => {
      sm.articles.forEach((a) => {
        allArticles.push({ article: a, module: m, subModule: sm });
      });
    });
  });

  const currentIndex = allArticles.findIndex((a) => a.article.slug === article.slug);
  const prevArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null;

  return (
    <DocsLayout>
      <div className="max-w-6xl mx-auto">
        <div className="lg:grid lg:grid-cols-[1fr_250px] lg:gap-8">
          {/* Main Content */}
          <article className="min-w-0">
            {/* Breadcrumb */}
            <Breadcrumb
              items={[
                { label: module.title, href: `/docs/${module.slug}` },
                { label: subModule.title, href: `/docs/${module.slug}/${subModule.slug}` },
                { label: article.title },
              ]}
              className="mb-6"
            />

            {/* Header */}
            <header className="mb-8">
              <div className="flex flex-wrap gap-2 mb-4">
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

              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                {article.title}
              </h1>

              <p className="text-lg text-muted-foreground mb-4">
                {article.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {article.author}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  آخر تحديث: {article.lastUpdated}
                </span>
              </div>
            </header>

            {/* Objective */}
            <section id="objective" className="mb-8">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <div className="w-1 h-6 bg-primary rounded-full" />
                الهدف
              </h2>
              <p className="text-muted-foreground">{article.objective}</p>
            </section>

            {/* Target Roles */}
            <section className="mb-8 p-4 rounded-xl bg-secondary/10 border border-secondary/20">
              <p className="font-medium mb-2">لمن هذا الشرح؟</p>
              <div className="flex flex-wrap gap-2">
                {article.targetRoles.map((role, i) => (
                  <span key={i} className="docs-tag bg-secondary/20 text-secondary-foreground">
                    {role}
                  </span>
                ))}
              </div>
            </section>

            {/* Prerequisites */}
            <section id="prerequisites" className="mb-8">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <div className="w-1 h-6 bg-primary rounded-full" />
                المتطلبات المسبقة
              </h2>
              <ul className="space-y-2">
                {article.prerequisites.map((prereq, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    {prereq}
                  </li>
                ))}
              </ul>
            </section>

            {/* Steps */}
            <section id="steps" className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-primary rounded-full" />
                خطوات التنفيذ
              </h2>
              <div className="space-y-6">
                {article.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="relative pr-12 pb-6 border-r-2 border-muted last:border-transparent last:pb-0"
                  >
                    <div className="absolute right-0 top-0 transform translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {step.stepNumber}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground mb-3">{step.description}</p>

                    {step.note && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/10 border border-secondary/20 text-sm">
                        <Info className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                        <span>{step.note}</span>
                      </div>
                    )}

                    {step.imageUrl && (
                      <div className="mt-4 rounded-lg overflow-hidden border">
                        <img
                          src={step.imageUrl}
                          alt={`خطوة ${step.stepNumber}: ${step.title}`}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Notes */}
            {article.notes.length > 0 && (
              <section id="notes" className="mb-8">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-secondary rounded-full" />
                  ملاحظات
                </h2>
                <ul className="space-y-2">
                  {article.notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                      <Info className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{note}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Warnings */}
            {article.warnings.length > 0 && (
              <section id="warnings" className="mb-8">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-warning rounded-full" />
                  تنبيهات
                </h2>
                <ul className="space-y-2">
                  {article.warnings.map((warning, i) => (
                    <li key={i} className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Common Errors */}
            {article.commonErrors.length > 0 && (
              <section id="errors" className="mb-8">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-destructive rounded-full" />
                  أخطاء شائعة وحلولها
                </h2>
                <div className="space-y-4">
                  {article.commonErrors.map((item, i) => (
                    <div key={i} className="rounded-xl border overflow-hidden">
                      <div className="flex items-start gap-2 p-4 bg-destructive/5 border-b">
                        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <span className="font-medium">{item.error}</span>
                      </div>
                      <div className="flex items-start gap-2 p-4 bg-success/5">
                        <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{item.solution}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FAQs */}
            {article.faqs.length > 0 && (
              <section id="faq" className="mb-8">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-accent rounded-full" />
                  أسئلة شائعة
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {article.faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-right">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}

            {/* Related Articles */}
            {article.relatedArticles.length > 0 && (
              <section id="related" className="mb-8">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  مواضيع ذات صلة
                </h2>
                <div className="flex flex-wrap gap-2">
                  {article.relatedArticles.map((slug) => {
                    const related = findArticleBySlug(slug);
                    if (!related) return null;
                    
                    // Find path for related article
                    let path = "/";
                    for (const m of docModules) {
                      for (const sm of m.subModules) {
                        if (sm.articles.find(a => a.slug === slug)) {
                          path = `/docs/${m.slug}/${sm.slug}/${slug}`;
                          break;
                        }
                      }
                    }

                    return (
                      <Link
                        key={slug}
                        to={path}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        {related.title}
                        <ArrowLeft className="h-4 w-4" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Feedback */}
            <FeedbackWidget articleId={article.id} className="mb-8" />

            {/* Navigation */}
            <nav className="flex items-stretch gap-4 pt-8 border-t">
              {prevArticle && (
                <Link
                  to={`/docs/${prevArticle.module.slug}/${prevArticle.subModule.slug}/${prevArticle.article.slug}`}
                  className="flex-1 flex items-center gap-3 p-4 rounded-xl border hover:bg-muted/50 transition-colors group"
                >
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">السابق</span>
                    <p className="font-medium group-hover:text-primary transition-colors">
                      {prevArticle.article.title}
                    </p>
                  </div>
                </Link>
              )}
              {nextArticle && (
                <Link
                  to={`/docs/${nextArticle.module.slug}/${nextArticle.subModule.slug}/${nextArticle.article.slug}`}
                  className="flex-1 flex items-center justify-end gap-3 p-4 rounded-xl border hover:bg-muted/50 transition-colors group"
                >
                  <div className="text-left">
                    <span className="text-xs text-muted-foreground">التالي</span>
                    <p className="font-medium group-hover:text-primary transition-colors">
                      {nextArticle.article.title}
                    </p>
                  </div>
                  <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              )}
            </nav>
          </article>

          {/* Sidebar - Table of Contents */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents items={tocItems} />
            </div>
          </aside>
        </div>
      </div>
    </DocsLayout>
  );
}
