

# نظام الاشتراك بالباقات - خطة التنفيذ

## ملخص المشروع

بناء نظام اشتراك متكامل يربط الموقع الرسمي بنظام دليل الاستخدام (Backoffice)، حيث تكون الباقات والأسعار مصدرها الوحيد هو جداول `pricing_plans` و `pricing_services` الموجودة مسبقا، والموقع يعرضها فقط عبر API دون تخزين محلي.

---

## المرحلة الأولى: قاعدة البيانات

### جدول جديد واحد: `subscription_requests` (طلبات الاشتراك)

| العمود | النوع | ملاحظة |
|--------|-------|--------|
| id | uuid PK | |
| request_number | text UNIQUE | رقم تسلسلي تلقائي (SUB-XXXX) |
| plan_id | uuid FK -> pricing_plans | الباقة المختارة |
| plan_name | text | للتوثيق |
| plan_price | numeric | السعر السنوي وقت الطلب |
| selected_addons | jsonb | قائمة الإضافات المختارة [{id, name, price}] |
| total_amount | numeric | الإجمالي النهائي |
| organization_name | text NOT NULL | |
| contact_name | text NOT NULL | |
| phone | text | |
| email | text NOT NULL | |
| entity_type | text | نوع الكيان |
| entity_category | text | تصنيف الكيان |
| region | text | المنطقة |
| address | text | العنوان |
| status | text DEFAULT 'new' | new/reviewing/contacted/pending_payment/activated/cancelled |
| source | text DEFAULT 'website' | |
| page_source | text | PricingPage / HomeSection |
| utm_source | text | |
| utm_campaign | text | |
| utm_medium | text | |
| assigned_to | uuid FK -> staff_members | المسؤول |
| assigned_at | timestamptz | |
| converted_organization_id | uuid FK -> client_organizations | عند التحويل لمنظمة |
| notes | text | ملاحظات داخلية |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

### جدول: `subscription_request_timeline` (سجل النشاط)

| العمود | النوع |
|--------|-------|
| id | uuid PK |
| request_id | uuid FK -> subscription_requests |
| action | text (created/status_changed/assigned/note_added/converted/email_sent) |
| performed_by | uuid |
| old_value | text |
| new_value | text |
| details | jsonb |
| created_at | timestamptz |

### إضافة أعمدة لجدول `pricing_plans` الموجود

- `comparison_features` (jsonb) - بيانات جدول المقارنة [{name, included: true/false}]
- `optional_addons` (jsonb) - الخدمات الإضافية [{id, name, price, description}]
- `display_badge` (text) - شارة مثل "الأكثر طلبا"
- `is_public` (boolean DEFAULT true) - إظهار في الموقع العام

### سياسات الأمان (RLS)

- `subscription_requests`: قراءة/كتابة لـ admin/editor فقط
- `subscription_request_timeline`: قراءة/كتابة لـ admin/editor فقط
- `pricing_plans`: إضافة سياسة SELECT عامة للباقات المفعلة والعامة (للـ API العام)

---

## المرحلة الثانية: Backend (Edge Functions)

### 1. `get-public-plans` (جلب الباقات للموقع)

- verify_jwt = false (عام)
- يُرجع الباقات المفعلة مع: الاسم، السعر، المزايا، جدول المقارنة، الإضافات الاختيارية، ترتيب العرض
- يُرجع بيانات ضريبة VAT من system_settings
- لا يتطلب مصادقة

### 2. `submit-subscription-request` (إرسال طلب اشتراك)

- verify_jwt = false (عام)
- التحقق من المدخلات (validation)
- التحقق من وجود الباقة وصحة الأسعار (server-side price validation)
- إعادة حساب الإجمالي في السيرفر
- إنشاء سجل في `subscription_requests`
- إنشاء سجل في `subscription_request_timeline`
- إرسال إشعار داخلي للمسؤولين (user_notifications)
- إرسال بريد تأكيد للعميل (اختياري عبر SMTP/Resend)
- إرسال بريد إشعار للمسؤول
- Rate limiting بسيط (فحص IP + وقت)

---

## المرحلة الثالثة: صفحات الموقع الرسمي (Public)

### 1. صفحة الباقات `/pricing` (PricingPage.tsx)

- تجلب البيانات من `get-public-plans`
- قسم البطاقات: 4 بطاقات (بيسك/بلس/برو/الترا) مع السعر السنوي وزر "اشترك الآن"
- جدول مقارنة المزايا أسفل البطاقات (صفوف للمزايا، أعمدة للباقات، علامات صح/خطأ)
- تصميم RTL متجاوب، ألوان هوية ويبيان
- تستخدم DocsLayout الموجود

### 2. قسم الباقات في الصفحة الرئيسية `/` (تحديث HomePage.tsx)

- إضافة قسم جديد يعرض 4 بطاقات مختصرة للباقات
- زر "اشترك الآن" ينقل إلى `/subscribe?planId=XXX`
- زر "عرض جميع الباقات" ينقل إلى `/pricing`

### 3. صفحة طلب الاشتراك `/subscribe` (SubscribePage.tsx)

- تستقبل `planId` من QueryString
- تتحقق من صحة المعرف وتجلب بيانات الباقة
- تصميم عمودين:
  - **العمود الأيمن**: نموذج بيانات المنظمة (اسم الكيان، المسؤول، الجوال، البريد، نوع الكيان، التصنيف، المنطقة، العنوان، إقرار الموافقة)
  - **العمود الأيسر**: ملخص الباقة (اسم، سعر، إضافات اختيارية كـ checkboxes، الإجمالي الديناميكي، زر "إكمال الطلب")
- Validation فوري لكل حقل باستخدام zod
- زر الإرسال يُقفل أثناء المعالجة مع Loading
- عند النجاح: صفحة تأكيد احترافية برقم الطلب
- عند فشل: رسالة خطأ واضحة

### قوائم منسدلة ثابتة (بناء على بيانات النظام الحالي)

**نوع الكيان**: جمعية خيرية، منظمة غير ربحية، مؤسسة، جمعية تعاونية، أخرى
**المنطقة**: الرياض، مكة المكرمة، المدينة المنورة، القصيم، المنطقة الشرقية، عسير، تبوك، حائل، الحدود الشمالية، جازان، نجران، الباحة، الجوف

---

## المرحلة الرابعة: وحدة "طلبات الاشتراك" في لوحة التحكم

### 1. صفحة قائمة الطلبات (SubscriptionRequestsPage.tsx)

- بطاقات إحصائية: إجمالي، جديد، قيد المراجعة، تم التفعيل
- جدول الطلبات مع: رقم الطلب، اسم المنظمة، الباقة، الإجمالي، الحالة، التاريخ
- فلاتر: الحالة، الباقة، المنطقة، التاريخ
- بحث بالاسم/البريد/رقم الطلب

### 2. صفحة تفاصيل الطلب (SubscriptionRequestDetailsPage.tsx)

- عرض كامل بيانات المنظمة والباقة والإضافات
- سجل النشاط (Timeline)
- تعيين مسؤول متابعة
- ملاحظات داخلية
- تغيير الحالة مع تسجيل في Timeline
- أزرار إجراءات:
  - **تحويل إلى منظمة**: ينشئ سجل في `client_organizations` ويربطه
  - **إنشاء تذكرة دعم**: ينشئ تذكرة مرتبطة
  - **إرسال بريد للعميل**: عبر SMTP الموجود

### تحديث القائمة الجانبية (AdminLayout.tsx)

- إضافة "طلبات الاشتراك" ضمن قسم "إدارة العملاء" مع أيقونة مناسبة

---

## المرحلة الخامسة: تحديث إعدادات التسعير

### تحديث صفحة PricingSettingsPage.tsx

- إضافة حقول جديدة في نموذج تعديل الخطة:
  - `comparison_features`: محرر مزايا المقارنة (اسم الميزة + متاح/غير متاح)
  - `optional_addons`: محرر الإضافات الاختيارية (اسم + سعر + وصف)
  - `display_badge`: شارة العرض (مثل "الأكثر طلبا")
  - `is_public`: إظهار في الموقع العام

---

## التفاصيل التقنية

### الملفات الجديدة

```text
src/pages/PricingPage.tsx                              -- صفحة الباقات العامة
src/pages/SubscribePage.tsx                             -- صفحة طلب الاشتراك
src/pages/admin/SubscriptionRequestsPage.tsx            -- قائمة طلبات الاشتراك
src/pages/admin/SubscriptionRequestDetailsPage.tsx      -- تفاصيل طلب اشتراك
supabase/functions/get-public-plans/index.ts            -- API جلب الباقات
supabase/functions/submit-subscription-request/index.ts -- API إرسال طلب
```

### الملفات المعدلة

```text
src/App.tsx                          -- إضافة المسارات الجديدة (/pricing, /subscribe, /admin/subscription-requests/*)
src/pages/HomePage.tsx               -- إضافة قسم الباقات
src/pages/admin/AdminLayout.tsx      -- إضافة "طلبات الاشتراك" في القائمة الجانبية
src/pages/admin/PricingSettingsPage.tsx -- إضافة حقول المقارنة والإضافات
supabase/config.toml                 -- إعداد verify_jwt = false للدوال العامة
```

### ملاحظات الأمان

- الأسعار لا تُرسل من الواجهة؛ يتم جلبها والتحقق منها في السيرفر
- Rate limiting على دالة submit-subscription-request
- Sanitization لجميع المدخلات
- RLS على جميع الجداول الجديدة
- لا يتم استخدام reCAPTCHA فعليا (غير مدعوم في البيئة الحالية) لكن يمكن إضافته لاحقا عبر مفتاح خارجي

