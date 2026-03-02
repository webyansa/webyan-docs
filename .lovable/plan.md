

# خطة إنشاء نظام إدارة الخصومات والعروض

## نظرة عامة
إضافة نظام متكامل لإدارة الخصومات يتكامل مع نظام عروض الأسعار الحالي، يشمل جدول قاعدة بيانات جديد، صفحة إدارة في لوحة التحكم، وتعديل نموذج إنشاء عرض السعر لدعم تطبيق الخصومات.

---

## 1. قاعدة البيانات - جدول `discounts`

إنشاء جدول جديد بالحقول التالية:
- `id`, `name` (اسم العرض/الخصم), `code` (كود اختياري), `requires_code` (boolean)
- `discount_type` (percentage / fixed), `discount_value` (numeric)
- `start_date`, `end_date` (nullable = بدون نهاية), `is_active` (boolean)
- `scope_type` (all_plans / specific_plans / all_services / specific_services / full_quote)
- `scope_ids` (jsonb - مصفوفة IDs للخطط أو الخدمات المحددة)
- `max_total_usage` (nullable), `max_per_client` (nullable), `current_usage` (default 0)
- `internal_notes`, `created_by`, `created_at`, `updated_at`

إضافة أعمدة على جدول `crm_quotes`:
- `discount_source` (text: manual / saved_discount / null)
- `discount_id` (uuid FK → discounts, nullable)
- `discount_name` (text, nullable)

جدول تتبع: `discount_usage_log` لتسجيل كل تطبيق خصم على عرض سعر (discount_id, quote_id, applied_by, applied_at, discount_value_applied).

RLS: قراءة وكتابة للـ admin و editor فقط.

---

## 2. صفحة إدارة الخصومات

صفحة جديدة `/admin/discounts` تُضاف في قسم "إدارة العملاء" بالسايدبار.

تحتوي على:
- **جدول** يعرض: اسم الخصم، النوع، القيمة، الحالة (نشط/منتهي/متوقف)، فترة التفعيل، الاستخدام
- **Badge** ذكي: "نشط" (أخضر)، "منتهي" (رمادي)، "متوقف" (أحمر)، "استنفد" (برتقالي)
- **Dialog** لإنشاء/تعديل خصم بكل الحقول المطلوبة مع multi-select للخطط والخدمات
- إمكانية تفعيل/إيقاف سريع عبر Switch
- سجل نشاط (Audit) لكل عملية إنشاء/تعديل/إيقاف

---

## 3. تعديل نموذج عرض السعر (`AdvancedQuoteModal`)

إضافة **قسم "تطبيق خصم"** في خطوة المراجعة (Step 3) بثلاثة خيارات:
1. **بدون خصم** (الافتراضي)
2. **خصم مباشر**: حقول يدوية (نوع + قيمة)
3. **خصم محفوظ**: قائمة منسدلة بالخصومات المتاحة فقط (نشطة + ضمن الفترة + لم تستنفد)

**منطق الحساب**: إجمالي البنود → الخصم → الصافي → الضريبة → الإجمالي النهائي

عند الحفظ: تسجيل `discount_source`, `discount_id`, `discount_name` + تحديث `current_usage` + إدخال في `discount_usage_log`.

---

## 4. تحديث عرض تفاصيل عرض السعر وPDF

تعديل `QuoteDetailsPage` و `QuotePDFDocument` لعرض سطر الخصم (اسمه ونوعه وقيمته) في الملخص المالي.

---

## 5. الملفات المتأثرة

| ملف | نوع التغيير |
|-----|-------------|
| Migration SQL | إنشاء جداول + أعمدة + RLS |
| `src/pages/admin/DiscountsPage.tsx` | **جديد** - صفحة الإدارة |
| `src/App.tsx` | إضافة Route |
| `src/pages/admin/AdminLayout.tsx` | إضافة رابط السايدبار |
| `src/components/crm/modals/AdvancedQuoteModal.tsx` | إضافة قسم الخصم |
| `src/pages/admin/crm/QuoteDetailsPage.tsx` | عرض بيانات الخصم |
| `src/components/crm/quotes/QuotePDFDocument.tsx` | سطر الخصم في PDF |
| `src/components/crm/modals/InvoiceRequestModal.tsx` | دعم الخصم في الحسابات |

