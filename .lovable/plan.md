

# اعادة هيكلة نظام التضمين: نظام API Key موحد

## المشكلة الحالية

1. كل عميل يحتاج رمز تضمين منفصل وكود تضمين مختلف -- ادارة عشرات الاكواد
2. نموذج التذاكر ونموذج المراسلات يستخدمان نفس البنية لكن غير منفصلين تماما في التضمين
3. لا يوجد نظام API Key مركزي -- كل token فريد لكل عميل

## الحل: كود تضمين واحد + API Key لكل عميل

```text
كود تضمين واحد (تذاكر)     +     API Key العميل     =     تعرف تلقائي
كود تضمين واحد (مراسلات)    +     API Key العميل     =     تعرف تلقائي
```

---

## خطة التنفيذ

### 1. جدول جديد: `client_api_keys`

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID | المعرف |
| organization_id | UUID (FK) | ربط بالعميل |
| api_key | TEXT (UNIQUE) | المفتاح الفريد `wbyn_xxxxxxxxxxxx` |
| name | TEXT | اسم وصفي |
| is_active | BOOLEAN | مفعل/معطل |
| usage_count | INT | عدد الاستخدامات |
| last_used_at | TIMESTAMP | اخر استخدام |
| allowed_domains | TEXT[] | النطاقات المسموحة (اختياري) |
| created_at | TIMESTAMP | تاريخ الانشاء |

مع سياسات RLS للادمن فقط.

### 2. سكريبتان منفصلان للتضمين

**`public/embed/webyan-ticket-widget.js`** -- سكريبت موحد لتذاكر الدعم

**`public/embed/webyan-chat-widget.js`** -- سكريبت موحد للمراسلات

كل سكريبت:
- يقرا `data-api-key` من عنصر الـ script
- ينشئ زر عائم احترافي (مثل Intercom)
- عند الضغط يفتح popup يحتوي iframe
- يمرر الـ API Key كـ parameter: `/embed/ticket?key=API_KEY` او `/embed/chat?key=API_KEY`

مثال الاستخدام النهائي لتذاكر الدعم:
```text
<script 
  src="https://yoursite.com/embed/webyan-ticket-widget.js"
  data-api-key="wbyn_xxxxxxxxxxxxxxxxx"
  data-position="bottom-right"
  data-color="#3b82f6">
</script>
```

مثال الاستخدام النهائي للمراسلات:
```text
<script 
  src="https://yoursite.com/embed/webyan-chat-widget.js"
  data-api-key="wbyn_xxxxxxxxxxxxxxxxx"
  data-position="bottom-left"
  data-color="#10b981">
</script>
```

### 3. تحديث صفحات التضمين

**`EmbedTicketPage.tsx`** -- يقبل `key` (API Key جديد) بالاضافة الى `token` (للتوافق القديم):
- اذا وجد `key` يبحث في `client_api_keys` ويحدد المنظمة
- اذا وجد `token` يعمل بالطريقة القديمة (توافق)

**`EmbedChatPage.tsx`** -- نفس المنطق

**`verify-embed-token` (Edge Function)** -- يدعم التحقق من النوعين:
- اذا بدا بـ `wbyn_` يبحث في `client_api_keys`
- غير ذلك يبحث في `embed_tokens` (توافق)

### 4. اعادة هيكلة صفحات الادارة

**`EmbedSettingsPage.tsx` (تضمين تذاكر الدعم):**
- قسم علوي: **كود التضمين الموحد** مع شرح وزر نسخ
- قسم سفلي: **قائمة API Keys العملاء** مع ازرار انشاء/تعطيل/حذف
- كل key يعرض: اسم العميل، المفتاح، الحالة، عدد الاستخدام

**`ChatEmbedSettingsPage.tsx` (تضمين المراسلات):**
- نفس الهيكل لكن بكود مراسلات مختلف
- اعدادات اضافية للمراسلات (رسالة ترحيب، الوان) تبقى مرتبطة بـ embed_tokens

### 5. تحديث ملف العميل

**`EmbedTokensTab.tsx`** يعرض:
- API Key العميل مع زر نسخ
- الرموز القديمة (embed_tokens) للتوافق
- امكانية انشاء API Key جديد
- نسخ كود التضمين الجاهز (مع المفتاح مضمن تلقائيا)

---

## التفاصيل التقنية

### الملفات المتاثرة

| الملف | التغيير |
|-------|---------|
| **قاعدة البيانات** | انشاء جدول `client_api_keys` مع RLS |
| `public/embed/webyan-ticket-widget.js` | **جديد** -- سكريبت تضمين تذاكر موحد |
| `public/embed/webyan-chat-widget.js` | **جديد** -- سكريبت تضمين مراسلات موحد |
| `src/pages/admin/EmbedSettingsPage.tsx` | اعادة هيكلة -- كود موحد + ادارة API Keys |
| `src/pages/admin/ChatEmbedSettingsPage.tsx` | اعادة هيكلة -- كود موحد + ادارة API Keys |
| `src/pages/embed/EmbedTicketPage.tsx` | دعم `key` parameter |
| `src/pages/embed/EmbedChatPage.tsx` | دعم `key` parameter |
| `supabase/functions/verify-embed-token/index.ts` | دعم التحقق من API Key |
| `src/components/crm/tabs/EmbedTokensTab.tsx` | تحديث لعرض API Keys |

### تصميم API Key

- الصيغة: `wbyn_` + 32 حرف عشوائي (حروف وارقام)
- مثال: `wbyn_a7Bk9mP2xR4qW8nY1sT6uV3jL5hF0`
- فريد على مستوى الجدول (UNIQUE constraint)

### امان

- RLS: فقط المستخدمون بدور admin يمكنهم ادارة API Keys
- التحقق من النطاق المسموح (اختياري)
- تسجيل كل استخدام (usage_count + last_used_at)
- امكانية تعطيل المفتاح فوريا
- Edge Function يتحقق من الصلاحية قبل عرض النموذج

