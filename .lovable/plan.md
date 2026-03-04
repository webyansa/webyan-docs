

# نظام قياس مؤشرات الأداء التسويقي (Marketing KPI System)

## التحليل الحالي

الهيكلية الحالية:
- `marketing_plans` → لا يحتوي مؤشرات مهيكلة
- `marketing_plan_campaigns` → حقل `target_kpi` نصي واحد (غير مهيكل)  
- `content_calendar` → لا يحتوي نتائج أداء

## المؤشرات المعتمدة (وفق أفضل الممارسات العالمية)

| المؤشر | الوصف | الاستخدام |
|---|---|---|
| `reach` | الوصول — عدد الأشخاص الفريدين | قياس الانتشار |
| `impressions` | الظهور — إجمالي مرات العرض | قياس التكرار |
| `engagement` | التفاعل (إعجاب + تعليق + حفظ) | قياس الاهتمام |
| `shares` | المشاركات / إعادة التغريد | قياس الانتشار العضوي |
| `link_clicks` | نقرات الروابط | قياس التحويل |
| `new_followers` | المتابعون الجدد | قياس نمو الجمهور |
| `video_views` | مشاهدات الفيديو | قياس أداء الريلز/الفيديو |
| `saves` | الحفظ (Instagram/LinkedIn) | قياس جودة المحتوى |
| `profile_visits` | زيارات الملف الشخصي | قياس الفضول والاهتمام |
| `conversions` | التحويلات (تسجيل/شراء/طلب) | قياس العائد النهائي |

## آلية العمل الهرمية

```text
┌─────────────────────────────────────────────┐
│  Marketing Plan (الخطة)                      │
│  ├─ kpi_targets: {reach: 50000, ...}        │
│  └─ Actual = SUM(Campaign Actuals)          │
├─────────────────────────────────────────────┤
│  Campaign (الحملة)                           │
│  ├─ kpi_targets: {reach: 20000, ...}        │
│  └─ Actual = SUM(Post Metrics)              │
├─────────────────────────────────────────────┤
│  Post (المنشور)                              │
│  └─ metrics: {reach: 3500, engagement: 120} │
│     ← إدخال يدوي فقط                        │
└─────────────────────────────────────────────┘
```

## التغييرات المطلوبة

### 1. قاعدة البيانات (3 migrations)

**Migration 1**: إضافة عمود `metrics` من نوع JSONB إلى `content_calendar`
```sql
ALTER TABLE content_calendar ADD COLUMN metrics jsonb DEFAULT '{}';
```

**Migration 2**: إضافة عمود `kpi_targets` من نوع JSONB إلى `marketing_plan_campaigns`
```sql
ALTER TABLE marketing_plan_campaigns ADD COLUMN kpi_targets jsonb DEFAULT '{}';
```

**Migration 3**: إضافة عمود `kpi_targets` من نوع JSONB إلى `marketing_plans`
```sql
ALTER TABLE marketing_plans ADD COLUMN kpi_targets jsonb DEFAULT '{}';
```

استخدام JSONB يجعل النظام قابلاً للتوسع بإضافة مؤشرات جديدة بدون تعديل الجداول.

### 2. ملف تكوين المؤشرات (جديد)
**`src/lib/marketing/kpiConfig.ts`**

ملف مركزي يعرّف المؤشرات المتاحة مع التسميات والأيقونات والألوان. يسهل إضافة مؤشرات مستقبلية بتعديل هذا الملف فقط.

### 3. مكوّنات جديدة

**`src/components/marketing/KpiTargetsEditor.tsx`**
- محرر المؤشرات المستهدفة (يُستخدم في نماذج الحملة والخطة)
- يعرض قائمة المؤشرات مع حقل إدخال رقمي لكل واحد
- يمكن تفعيل/تعطيل كل مؤشر

**`src/components/marketing/PostMetricsEditor.tsx`**
- نموذج إدخال نتائج المنشور (reach, impressions, engagement...)
- يُعرض داخل نافذة تعديل المحتوى في تقويم المحتوى

**`src/components/marketing/KpiPerformanceDashboard.tsx`**
- لوحة مقارنة المستهدف vs المحقق
- أشرطة تقدم ملونة مع نسبة الإنجاز لكل مؤشر
- يُستخدم في صفحة تفاصيل الحملة وصفحة تفاصيل الخطة

### 4. تعديل الصفحات الحالية

| الملف | التعديل |
|---|---|
| `PlanDetailsPage.tsx` | إضافة KpiTargetsEditor في نموذج إنشاء/تعديل الخطة + عرض KpiPerformanceDashboard |
| `PlanDetailsPage.tsx` | حساب الفعلي بتجميع metrics من content_calendar عبر الحملات |
| `PlanDetailsPage.tsx` (Campaign form) | استبدال حقل `target_kpi` النصي بـ KpiTargetsEditor المهيكل |
| `ContentCalendarPage.tsx` | إضافة PostMetricsEditor في نافذة تعديل المحتوى |
| `ContentCalendarPage.tsx` | عرض ملخص المؤشرات كـ badges صغيرة على بطاقات الكانبان |
| `MarketingPlansPage.tsx` | إضافة KpiTargetsEditor في نموذج الخطة + عرض شريط تقدم مصغر |

### 5. منطق التجميع (Client-side)
- **الحملة**: جلب كل منشورات `content_calendar` التابعة للحملة → `SUM(metrics[key])` لكل مؤشر
- **الخطة**: جلب كل الحملات + منشوراتها → تجميع مزدوج
- حساب `Performance % = (Actual / Target) × 100` لكل مؤشر
- تلوين: أخضر > 80%، أصفر 50-80%، أحمر < 50%

## الملفات المتأثرة

| ملف | إجراء |
|---|---|
| `src/lib/marketing/kpiConfig.ts` | جديد |
| `src/components/marketing/KpiTargetsEditor.tsx` | جديد |
| `src/components/marketing/PostMetricsEditor.tsx` | جديد |
| `src/components/marketing/KpiPerformanceDashboard.tsx` | جديد |
| `src/pages/admin/marketing/PlanDetailsPage.tsx` | تعديل |
| `src/pages/admin/marketing/MarketingPlansPage.tsx` | تعديل |
| `src/pages/admin/marketing/ContentCalendarPage.tsx` | تعديل |

