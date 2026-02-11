
# خطة شاملة: إضافة تتبع الدفع وإصدار الفاتورة + حقل المنطقة + نموذج تأكيد الفاتورة للمحاسب

## الملخص

تطوير 4 محاور متكاملة:
1. إضافة أعمدة حالة الدفع وحالة إصدار الفاتورة لعروض الأسعار
2. إضافة حقل "المنطقة" (قائمة منسدلة بمناطق السعودية الـ13) لبيانات العميل
3. إضافة زر في البريد الإلكتروني للمحاسب يفتح صفحة API خارجية
4. إنشاء صفحة نموذج عام (بدون تسجيل دخول) لتأكيد إصدار الفاتورة ورفعها

---

## المرحلة 1: تعديل قاعدة البيانات

### Migration SQL

```sql
-- 1. إضافة أعمدة حالة الدفع والفاتورة لعروض الأسعار
ALTER TABLE crm_quotes 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS invoice_status text DEFAULT 'not_requested';

-- 2. إضافة حقل المنطقة لبيانات العميل
ALTER TABLE client_organizations 
ADD COLUMN IF NOT EXISTS region text;

-- 3. إضافة حقل رفع ملف الفاتورة في invoice_requests
ALTER TABLE invoice_requests 
ADD COLUMN IF NOT EXISTS invoice_file_url text,
ADD COLUMN IF NOT EXISTS confirmed_by_name text,
ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;
```

### القيم المتاحة:
- `payment_status`: `unpaid` | `paid` | `partially_paid`
- `invoice_status`: `not_requested` | `requested` | `issued`

---

## المرحلة 2: حقل المنطقة في بيانات العميل

### الملف: `src/components/crm/tabs/BasicInfoTab.tsx`

- إضافة `region` للـ form state والـ interface
- إضافة قائمة منسدلة (Select) بمناطق السعودية الـ13 في قسم العنوان الوطني:
  - الرياض، مكة المكرمة، المدينة المنورة، القصيم، المنطقة الشرقية، عسير، تبوك، حائل، الحدود الشمالية، جازان، نجران، الباحة، الجوف

- عرض المنطقة في وضع القراءة ضمن العنوان الوطني
- تمرير القيمة في `handleSave` إلى `client_organizations`

### الملف: `src/components/crm/modals/InvoiceRequestModal.tsx`

- إضافة عرض المنطقة في قسم العنوان الوطني بالنموذج
- تحديث الـ query ليشمل حقل `region`

---

## المرحلة 3: حالة الدفع وحالة الفاتورة في عروض الأسعار

### الملف: `src/pages/admin/crm/QuoteDetailsPage.tsx`

**عرض الحالات:**
- إضافة بطاقة "حالة الدفع والفاتورة" أسفل عرض السعر تعرض:
  - حالة الدفع (لم يتم | تم الدفع | دفع جزئي) مع أيقونات ملونة
  - حالة الفاتورة (لم يُطلب | تم الطلب | تم الإصدار) مع أيقونات ملونة

**تغيير الحالة:**
- زر "تأكيد الدفع" يغير `payment_status` إلى `paid`
- عند تأكيد الدفع، يظهر زر "طلب إصدار الفاتورة" (الموجود حاليا)
- عند تأكيد إصدار الفاتورة من المحاسب، تتحدث `invoice_status` إلى `issued`

**التدفق المنطقي:**

```text
العرض معتمد → تأكيد الدفع → طلب إصدار الفاتورة → المحاسب يؤكد → مكتمل
```

### الملف: `src/pages/admin/crm/QuotesPage.tsx`

- إضافة أعمدة "حالة الدفع" و"حالة الفاتورة" في جدول عروض الأسعار
- عرضها كـ Badge ملون

---

## المرحلة 4: صفحة تأكيد الفاتورة (نموذج عام API)

### ملف جديد: `src/pages/embed/InvoiceConfirmPage.tsx`

صفحة عامة (بدون تسجيل دخول) تحتوي على:
- حقل رقم طلب الفاتورة (request_number) - يُملأ تلقائيا من الرابط
- حقل رقم الفاتورة الخارجية (external_invoice_no)
- حقل اسم المحاسب المؤكد
- حقل رفع ملف الفاتورة (PDF)
- زر "تأكيد إصدار الفاتورة"

### Route الجديد في `src/App.tsx`

```text
/invoice-confirm/:requestId → InvoiceConfirmPage
```

### Edge Function جديدة: `supabase/functions/confirm-invoice/index.ts`

- استقبال: `request_id`, `external_invoice_no`, `confirmed_by_name`, وملف الفاتورة
- التحقق من صحة `request_id`
- تحديث `invoice_requests`: حالة = `issued`, رقم الفاتورة, اسم المؤكد, رابط الملف
- تحديث `crm_quotes`: `invoice_status` = `issued`
- إرسال بريد إلكتروني لويبيان الرسمي يتضمن تأكيد الإصدار ومرفق الفاتورة
- تسجيل في `client_timeline`

### تحديث `supabase/config.toml`

```toml
[functions.confirm-invoice]
verify_jwt = false
```

---

## المرحلة 5: تحديث البريد الإلكتروني للمحاسب

### الملف: `supabase/functions/send-invoice-request/index.ts`

- إضافة زر "تأكيد إصدار الفاتورة" في قالب البريد HTML
- الزر يفتح الرابط:

```text
{baseUrl}/invoice-confirm/{request_id}
```

- تصميم الزر بلون أخضر مميز مع نص واضح
- تحديث الـ insert ليحفظ `quote_id` لربط حالة الفاتورة لاحقا

---

## التفاصيل التقنية

### الملفات المتأثرة (تعديل)

| الملف | التعديل |
|---|---|
| `src/components/crm/tabs/BasicInfoTab.tsx` | إضافة حقل المنطقة (Select) |
| `src/pages/admin/crm/QuoteDetailsPage.tsx` | إضافة بطاقة حالة الدفع/الفاتورة + أزرار التحكم |
| `src/pages/admin/crm/QuotesPage.tsx` | إضافة أعمدة حالة الدفع والفاتورة |
| `src/components/crm/modals/InvoiceRequestModal.tsx` | إضافة عرض المنطقة |
| `supabase/functions/send-invoice-request/index.ts` | إضافة زر تأكيد الفاتورة في البريد |
| `src/App.tsx` | إضافة Route جديد |
| `supabase/config.toml` | إضافة إعداد confirm-invoice |

### الملفات الجديدة

| الملف | الوصف |
|---|---|
| `src/pages/embed/InvoiceConfirmPage.tsx` | صفحة تأكيد الفاتورة العامة |
| `supabase/functions/confirm-invoice/index.ts` | Edge Function لمعالجة التأكيد |

### مناطق السعودية (ثابتة في الكود)

```typescript
const saudiRegions = [
  { value: 'riyadh', label: 'منطقة الرياض' },
  { value: 'makkah', label: 'منطقة مكة المكرمة' },
  { value: 'madinah', label: 'منطقة المدينة المنورة' },
  { value: 'qassim', label: 'منطقة القصيم' },
  { value: 'eastern', label: 'المنطقة الشرقية' },
  { value: 'asir', label: 'منطقة عسير' },
  { value: 'tabuk', label: 'منطقة تبوك' },
  { value: 'hail', label: 'منطقة حائل' },
  { value: 'northern_borders', label: 'منطقة الحدود الشمالية' },
  { value: 'jazan', label: 'منطقة جازان' },
  { value: 'najran', label: 'منطقة نجران' },
  { value: 'bahah', label: 'منطقة الباحة' },
  { value: 'jawf', label: 'منطقة الجوف' },
];
```

### تدفق العمل الكامل

```text
1. الموظف يعتمد عرض السعر
2. الموظف يؤكد استلام الدفع → payment_status = paid
3. الموظف يضغط "طلب إصدار فاتورة" → invoice_status = requested
4. يصل بريد للمحاسب فيه زر "تأكيد إصدار الفاتورة"
5. المحاسب يضغط الزر → يفتح صفحة عامة
6. المحاسب يدخل رقم الفاتورة + يرفع الملف + يؤكد
7. النظام يحدث: invoice_status = issued + يرسل بريد لويبيان
8. تظهر الحالة النهائية في صفحة عرض السعر
```
