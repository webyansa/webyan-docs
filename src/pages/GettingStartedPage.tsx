import { Link } from "react-router-dom";
import { Rocket, CheckCircle, ArrowLeft, BookOpen, Monitor, Users } from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Breadcrumb } from "@/components/docs/Breadcrumb";
import { Button } from "@/components/ui/button";
import { docModules } from "@/data/docsData";

export default function GettingStartedPage() {
  const firstModule = docModules[0];

  return (
    <DocsLayout>
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: "ابدأ هنا" }]} className="mb-6" />

        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-secondary/20 flex items-center justify-center">
              <Rocket className="h-10 w-10 text-secondary" />
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">
            مرحباً بك في دليل ويبيان!
          </h1>
          <p className="text-lg text-muted-foreground">
            سنساعدك على البدء بإدارة موقعك بخطوات بسيطة
          </p>
        </header>

        {/* Steps */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6">خطوات البداية</h2>
          <div className="space-y-4">
            <div className="docs-card p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10 text-success font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-secondary" />
                    تعرف على لوحة التحكم
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    استكشف الأقسام الرئيسية وتعرف على كيفية التنقل بين صفحات الإدارة.
                  </p>
                  <Link
                    to="/docs/introduction/dashboard-overview"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    شاهد هيكل لوحة التحكم
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="docs-card p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10 text-success font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-secondary" />
                    تعلم المفاهيم الأساسية
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    افهم مفاهيم النشر والمسودات والتصنيفات والصلاحيات.
                  </p>
                  <Link
                    to="/docs/introduction/basic-concepts"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    المفاهيم الأساسية
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="docs-card p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10 text-success font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-5 w-5 text-secondary" />
                    حدد صلاحياتك
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    تعرف على دورك في النظام والميزات المتاحة لك بناءً على صلاحياتك.
                  </p>
                  <Link
                    to="/docs/users/roles-permissions"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    الأدوار والصلاحيات
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tips */}
        <section className="mb-12 p-6 rounded-2xl bg-secondary/10 border border-secondary/20">
          <h2 className="text-xl font-semibold mb-4">💡 نصائح للبداية</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                استخدم شريط البحث للعثور على أي موضوع بسرعة
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                تابع مركز التحديثات لمعرفة الميزات الجديدة
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                استخدم أزرار "التالي/السابق" للتنقل بين المواضيع
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                أبلغنا عن أي مشكلة أو نقص في الشرح لتحسين الدليل
              </span>
            </li>
          </ul>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Button size="lg" asChild className="gap-2">
            <Link to={`/docs/${firstModule.slug}`}>
              ابدأ التعلم الآن
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </DocsLayout>
  );
}
