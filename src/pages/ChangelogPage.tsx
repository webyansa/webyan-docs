import { Clock, Tag, ArrowLeft } from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Breadcrumb } from "@/components/docs/Breadcrumb";
import { cn } from "@/lib/utils";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: "feature" | "improvement" | "fix" | "breaking";
    title: string;
    description: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "2.5.0",
    date: "2026-01-10",
    changes: [
      {
        type: "feature",
        title: "نظام السلايدات المتحركة الجديد",
        description: "إمكانية إضافة سلايدات متعددة مع دعم السحب والإفلات للترتيب وجدولة الظهور.",
      },
      {
        type: "improvement",
        title: "تحسين أداء المحرر النصي",
        description: "سرعة تحميل أفضل للمحرر مع دعم الصور المضمنة بشكل محسّن.",
      },
      {
        type: "fix",
        title: "إصلاح مشكلة رفع الملفات الكبيرة",
        description: "تم حل مشكلة فشل رفع الملفات التي تتجاوز 10 ميجابايت.",
      },
    ],
  },
  {
    version: "2.4.0",
    date: "2025-12-20",
    changes: [
      {
        type: "feature",
        title: "نظام الصلاحيات المتقدم",
        description: "إمكانية إنشاء أدوار مخصصة وتحديد صلاحيات دقيقة لكل قسم.",
      },
      {
        type: "breaking",
        title: "تغيير في واجهة API المستخدمين",
        description: "تم تحديث endpoints المستخدمين. يرجى مراجعة التوثيق التقني.",
      },
    ],
  },
  {
    version: "2.3.0",
    date: "2025-12-01",
    changes: [
      {
        type: "feature",
        title: "إدارة المشاريع بمراحل",
        description: "إمكانية تتبع مراحل المشروع مع نسب الإنجاز والتواريخ.",
      },
      {
        type: "improvement",
        title: "تحسين تجربة البحث",
        description: "بحث أسرع مع فلاتر متقدمة ونتائج فورية.",
      },
    ],
  },
];

const typeStyles = {
  feature: { label: "ميزة جديدة", class: "bg-success/10 text-success border-success/20" },
  improvement: { label: "تحسين", class: "bg-secondary/10 text-secondary border-secondary/20" },
  fix: { label: "إصلاح", class: "bg-primary/10 text-primary border-primary/20" },
  breaking: { label: "تغيير جوهري", class: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function ChangelogPage() {
  return (
    <DocsLayout>
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: "مركز التحديثات" }]} className="mb-6" />

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">مركز التحديثات</h1>
              <p className="text-muted-foreground">
                تابع أحدث التغييرات والميزات في لوحة التحكم
              </p>
            </div>
          </div>
        </header>

        {/* Timeline */}
        <div className="space-y-8">
          {changelog.map((entry, index) => (
            <article key={entry.version} className="relative">
              {/* Version Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold">
                  <Tag className="h-4 w-4" />
                  v{entry.version}
                </div>
                <span className="text-sm text-muted-foreground">{entry.date}</span>
              </div>

              {/* Changes */}
              <div className="space-y-4 pr-4 border-r-2 border-muted mr-4">
                {entry.changes.map((change, i) => {
                  const style = typeStyles[change.type];
                  return (
                    <div key={i} className="docs-card p-5">
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border shrink-0",
                            style.class
                          )}
                        >
                          {style.label}
                        </span>
                        <div>
                          <h3 className="font-semibold mb-1">{change.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {change.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>
    </DocsLayout>
  );
}
