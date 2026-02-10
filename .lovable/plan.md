

# خطة: إعادة تنظيم نظام عروض أسعار المنصات المخصصة

## الملخص
تحويل نظام عروض الأسعار للمنصات المخصصة إلى نموذج احترافي يدعم تصنيف البنود (تنفيذ / تشغيلي سنوي / خدمة مصاحبة)، مع حقل اسم المشروع، وسياسة السنة الأولى للبنود المتكررة، وحفظ الرسوم السنوية المستقبلية في ملف العميل.

---

## التغييرات المطلوبة

### 1. تعديل قاعدة البيانات

**جدول `crm_quotes`** - إضافة أعمدة:
- `project_name` (text, nullable) - اسم المشروع للمنصات المخصصة
- `recurring_items` (jsonb, default '[]') - قائمة البنود التشغيلية السنوية المستقبلية

**جدول جديد: `client_recurring_charges`** - لتتبع الرسوم السنوية:
- `id`, `account_id`, `quote_id`, `item_name`, `annual_amount`
- `first_due_date` (تاريخ أول استحقاق)
- `first_year_free` (boolean)
- `status` (active / cancelled)
- `reminder_sent_at`, `created_at`

### 2. تعديل `AdvancedQuoteModal.tsx` - الخطوة 2 (التفاصيل)

**عند اختيار "منصة مخصصة":**
- إضافة حقل **"اسم المشروع"** (إلزامي)
- تقسيم البنود إلى 3 أقسام واضحة:

  **أ. بند التنفيذ (One-Time):**
  - وصف المشروع + القيمة الإجمالية (الحقول الحالية)

  **ب. بنود تشغيلية سنوية (Recurring):**
  - إضافة بنود يدوية (اسم البند، المبلغ السنوي)
  - لكل بند: خيار "السنة الأولى مجانية"
  - إذا كانت مجانية: لا تُضاف للإجمالي الحالي + تُسجل كبند مستقبلي

  **ج. خدمات مصاحبة:**
  - المحدد الحالي (ServicesSelector) يبقى كما هو

### 3. تعديل حساب الإجماليات (`useMemo`)

- البنود ذات السنة الأولى المجانية تُستثنى من `subtotal`
- إضافة ملخص في خطوة المراجعة يعرض:
  - إجمالي التنفيذ (المستحق الآن)
  - الرسوم السنوية المستقبلية (للمعلومية)

### 4. تعديل `QuoteItem` interface و `QuoteItemsTable`

- إضافة خصائص جديدة لـ `QuoteItem`:
  - `item_category`: `'execution' | 'recurring_annual' | 'service'`
  - `first_year_free`: boolean
  - `recurring_amount`: number (للبنود السنوية)
- عرض البنود المجانية بشكل مميز (نص مشطوب أو شارة "السنة الأولى مجانية")

### 5. تعديل `handleSave` في `AdvancedQuoteModal`

- حفظ `project_name` في سجل `crm_quotes`
- حفظ `recurring_items` (البنود السنوية) في سجل `crm_quotes`

### 6. تعديل `ContractDocumentationModal.tsx`

- استخدام `project_name` من العرض لتسمية المشروع: `{accountName} - {projectName}`
- عند اعتماد العرض وإنشاء المشروع:
  - إنشاء سجلات في `client_recurring_charges` لكل بند تشغيلي سنوي
  - تاريخ أول استحقاق = بعد 12 شهر من تاريخ التسليم المتوقع
  - حفظ الميزانية (`budget`) من قيمة بند التنفيذ

### 7. عرض الرسوم السنوية في ملف العميل

- إضافة قسم في تبويب الاشتراكات أو تبويب جديد يعرض:
  - قائمة الرسوم السنوية القادمة مع تاريخ الاستحقاق
  - حالة كل رسم (نشط / ملغي)

---

## التفاصيل التقنية

### Migration SQL
```sql
-- Add project_name and recurring_items to crm_quotes
ALTER TABLE crm_quotes ADD COLUMN IF NOT EXISTS project_name text;
ALTER TABLE crm_quotes ADD COLUMN IF NOT EXISTS recurring_items jsonb DEFAULT '[]';

-- Create client_recurring_charges table
CREATE TABLE client_recurring_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES client_organizations(id),
  quote_id uuid REFERENCES crm_quotes(id),
  project_id uuid REFERENCES crm_implementations(id),
  item_name text NOT NULL,
  annual_amount numeric NOT NULL DEFAULT 0,
  first_year_free boolean DEFAULT false,
  first_due_date date,
  status text DEFAULT 'active',
  reminder_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_recurring_charges ENABLE ROW LEVEL SECURITY;
-- RLS policy for authenticated staff
CREATE POLICY "Staff can manage recurring charges"
  ON client_recurring_charges FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
```

### AdvancedQuoteModal - State additions
- `projectName` (string) - اسم المشروع
- `recurringItems` (array) - بنود تشغيلية: `{ name, amount, firstYearFree }`
- تعديل validation في `canProceedToStep3` ليتحقق من وجود `projectName` للمنصات المخصصة

### QuoteItemsTable enhancements
- عرض البنود المجانية بشارة خضراء "السنة الأولى مجانية" مع عدم احتسابها في الإجمالي
- إضافة قسم منفصل أسفل الجدول لـ "الرسوم السنوية المستقبلية" (للمعلومية)

### ContractDocumentationModal changes
- قراءة `project_name` من العرض واستخدامه كاسم المشروع
- إنشاء `client_recurring_charges` عند توقيع العقد

### الملفات المتأثرة
1. `supabase/migrations/` - migration جديد
2. `src/components/crm/modals/AdvancedQuoteModal.tsx` - إضافة حقول وتعديل منطق الحساب
3. `src/components/crm/quotes/QuoteItemsTable.tsx` - دعم أنواع البنود الجديدة
4. `src/components/operations/ContractDocumentationModal.tsx` - استخدام اسم المشروع وإنشاء الرسوم
5. `src/components/crm/tabs/SubscriptionTab.tsx` - عرض الرسوم السنوية القادمة

