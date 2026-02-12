

# اعادة هيكلة نظام التضمين: API Key موحد لكل عميل

## المشكلة الحالية

النظام الحالي ينشئ رمز تضمين (token) لكل عميل ولكل نوع (تذاكر/مراسلات)، وكل رمز ينتج كود تضمين مختلف. هذا يعني ادارة عشرات الاكواد المختلفة.

## الحل المقترح

### المفهوم الاساسي

```text
+------------------+     +-------------------+     +------------------+
|  كود تضمين واحد  | --> | API Key العميل    | --> | تحديد المنظمة   |
|  (تذاكر / دردشة) |     | (متغير في الكود)  |     | واظهار النموذج  |
+------------------+     +-------------------+     +------------------+
```

- **كود تضمين تذاكر واحد** يعمل لجميع العملاء
- **كود تضمين مراسلات واحد** يعمل لجميع العملاء
- كل عميل يحصل على **API Key فريد** يُضاف كمتغير في الكود
- النظام يقرأ الـ API Key ويتعرف على العميل تلقائياً

### مثال على كود التضمين الموحد (تذاكر)

```text
<script src="https://yoursite.com/embed/webyan-ticket-widget.js"
  data-api-key="YOUR_CLIENT_API_KEY"
  data-position="bottom-right">
</script>
```

### مثال على كود التضمين الموحد (مراسلات)

```text
<script src="https://yoursite.com/embed/webyan-chat-widget.js"
  data-api-key="YOUR_CLIENT_API_KEY"
  data-position="bottom-right">
</script>
```

---

## خطة التنفيذ

### 1. جدول جديد: `client_api_keys`

جدول مستقل لـ API Keys العملاء، منفصل عن embed_tokens:

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID | المعرف |
| organization_id | UUID | ربط بالعميل |
| api_key | TEXT | المفتاح الفريد (مثل: `wbyn_xxxxxxxxxxxx`) |
| name | TEXT | اسم وصفي |
| is_active | BOOLEAN | مفعل/معطل |
| usage_count | INT | عدد الاستخدامات |
| last_used_at | TIMESTAMP | آخر استخدام |
| allowed_domains | TEXT[] | النطاقات المسموحة |
| expires_at | TIMESTAMP | تاريخ الانتهاء (اختياري) |
| created_at | TIMESTAMP | تاريخ الانشاء |

### 2. ملفات JavaScript للتضمين (عامة لكل العملاء)

**`public/embed/webyan-ticket-widget.js`** -- سكريبت يقرأ الـ `data-api-key` وينشئ iframe يشير الى `/embed/ticket?key=API_KEY`

**`public/embed/webyan-chat-widget.js`** -- سكريبت يقرأ الـ `data-api-key` وينشئ iframe يشير الى `/embed/chat?key=API_KEY`

كل سكريبت ينشئ زر عائم + نافذة popup بشكل احترافي مع دعم التخصيص عبر `data-*` attributes.

### 3. تحديث صفحات التضمين

**`EmbedTicketPage.tsx`** -- يقبل `key` (API Key) بالاضافة الى `token` (للتوافق مع الرموز القديمة)

**`EmbedChatPage.tsx`** -- نفس التحديث

**`verify-embed-token` (Edge Function)** -- يدعم التحقق من API Key الجديد بالاضافة الى الرموز القديمة

### 4. صفحة ادارة API Keys (منفصلة تماماً)

**`EmbedSettingsPage.tsx` (تذاكر الدعم):**
- قسم علوي: **كود التضمين الموحد** مع تعليمات النسخ
- قسم سفلي: **قائمة API Keys** لكل عميل مع ازرار انشاء/تعطيل/حذف
- كل key يعرض: اسم العميل، المفتاح، الحالة، الاستخدام

**`ChatEmbedSettingsPage.tsx` (المراسلات):**
- نفس الهيكل لكن لنموذج المراسلات
- اعدادات اضافية (رسالة الترحيب، الالوان) مرتبطة بالـ API Key

### 5. تحديث ملف العميل (CustomerProfilePage)

تبويب "التضمين" يعرض API Key العميل مع امكانية:
- انشاء API Key جديد
- نسخ الكود الجاهز (مع المفتاح مضمن)
- عرض احصائيات الاستخدام

---

## التفاصيل التقنية

### الملفات المتاثرة

| الملف | التغيير |
|-------|---------|
| **قاعدة البيانات** | انشاء جدول `client_api_keys` مع RLS |
| `public/embed/webyan-ticket-widget.js` | **جديد** -- سكريبت تضمين تذاكر موحد |
| `public/embed/webyan-chat-widget.js` | **تعديل** -- سكريبت تضمين مراسلات موحد |
| `src/pages/admin/EmbedSettingsPage.tsx` | اعادة هيكلة كاملة -- كود موحد + ادارة API Keys |
| `src/pages/admin/ChatEmbedSettingsPage.tsx` | اعادة هيكلة كاملة -- كود موحد + ادارة API Keys |
| `src/pages/embed/EmbedTicketPage.tsx` | دعم `key` parameter |
| `src/pages/embed/EmbedChatPage.tsx` | دعم `key` parameter |
| `supabase/functions/verify-embed-token/index.ts` | دعم التحقق من API Key |
| `supabase/functions/create-embed-ticket/index.ts` | دعم API Key |
| `src/components/crm/tabs/EmbedTokensTab.tsx` | تحديث لعرض API Keys |

### سكريبت التضمين الموحد (webyan-ticket-widget.js)

السكريبت يعمل كالتالي:
1. يقرأ `data-api-key` من عنصر الـ script
2. يقرأ الاعدادات الاختيارية (`data-position`, `data-color`, `data-text`)
3. ينشئ زر عائم احترافي
4. عند الضغط يفتح popup يحتوي iframe مع الـ API Key
5. يدعم الاغلاق بالضغط خارج النافذة او بزر الاغلاق

### امان API Key

- المفتاح يبدأ بـ `wbyn_` متبوعاً بـ 32 حرف عشوائي
- التحقق من النطاق المسموح (اختياري)
- تسجيل كل استخدام مع النطاق المصدر
- امكانية تعطيل المفتاح فوراً
- RLS policies لحماية الجدول

