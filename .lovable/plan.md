

# خطة بناء طبقة تكامل AI Integration Layer

## ملخص المشروع
إعادة بناء كاملة لنظام الذكاء الاصطناعي: التحول من نظام متعدد المزودين (OpenAI/Gemini/Lovable) إلى نظام موحّد يعتمد على OpenAI فقط مع مسارين (Responses API / Assistants API)، وإضافة Vector Store + file_search، وقالب إخراج ثابت، وHealth Check، وسجل تدقيق متقدم.

---

## الوضع الحالي

- **SettingsPage.tsx**: يدعم 3 مزودين (OpenAI, Gemini, Lovable) مع اختيار model لكل مزود. المفاتيح تُخزن في `system_settings` DB.
- **generate-marketing-content Edge Function**: يدعم 3 مزودين، يستخدم tool calling لاستخراج JSON، لا يدعم file_search أو Vector Store.
- **ContentCalendarPage.tsx**: يسمح للمستخدم باختيار المزود والمنصة والنبرة. يستدعي `generate-marketing-content`.
- **ai_generations table**: جدول بسيط (provider, prompt_inputs, result) - ينقصه حقول كثيرة.
- **raw-chat-test / assistant-chat**: Edge Functions للاختبار.

---

## المهام المطلوبة

### 1. Database Migration: جدول `ai_generation_logs` الجديد

إنشاء جدول جديد بالحقول المطلوبة:
- `id`, `created_at`, `user_id`, `module`, `platform`, `tone`, `content_type`
- `request_payload` (jsonb), `response_payload` (jsonb)
- `used_file_search` (bool), `model_used` (text), `mode_used` (text)
- `latency_ms` (int), `status` (text), `error_message` (text nullable)

مع RLS policies للAdmin فقط للقراءة، وInsert مفتوح للـ service_role عبر Edge Function.

### 2. Edge Function: `ai-generate-content` (بديل لـ generate-marketing-content)

Edge Function موحدة جديدة تستبدل القديمة:

**المنطق:**
1. يقرأ إعدادات AI من `system_settings` (mode, vector_store_id, temperature, top_p, assistant_id)
2. يقرأ OpenAI API Key من `system_settings`
3. **لا يقبل** `model` أو `provider` من الواجهة - يحددها من الإعدادات فقط

**إذا mode = responses:**
- يستدعي `POST https://api.openai.com/v1/responses`
- يرسل system prompt ثابت + user prompt مبني من المدخلات
- يضيف `tools: [{type: "file_search"}]` و `tool_resources` مع Vector Store ID
- يطلب `response_format: {type: "json_object"}`
- يتحقق من استخدام file_search في الاستجابة

**إذا mode = assistants:**
- يستخدم assistant_id من الإعدادات
- ينشئ thread → يضيف message → يشغل run
- يستخرج run steps للتحقق من tool_calls
- يعيد نفس Response Schema

**Response Schema ثابت:**
```json
{
  "title": "...",
  "design_copy": { "headline", "subheadline", "cta_text" },
  "post_copy": { "primary_text", "hashtags": [], "links": [] },
  "meta": { "platform", "tone", "compliance": { "within_char_limit", "used_file_search", "no_banned_words" } }
}
```

**يسجل في `ai_generation_logs`** مع latency وstatus وused_file_search.

### 3. Edge Function: `ai-health-check`

- يرسل سؤال: "عرّف ويبيان اعتمادًا على ملفات المعرفة فقط"
- يتحقق من:
  - API reachable (pass/fail)
  - Vector store reachable (pass/fail) - هل file_search تم استخدامه
  - Retrieval used (pass/fail) - هل الرد يحتوي كلمات مفتاحية
  - Sample response preview
- يرجع تقرير مفصل

### 4. إعادة بناء قسم AI في SettingsPage.tsx

**إزالة:** قسم Gemini + Lovable AI + اختيار النماذج المتعددة + أزرار اختبار الاتصال القديمة.

**إضافة:**
- **AI Mode** (Dropdown): Responses API (افتراضي) | Assistants API
- **Model** (عرض فقط): gpt-4.1 أو gpt-4-0125-preview حسب Mode
- **Vector Store ID** (Text input)
- **Assistant ID** (يظهر فقط في Assistants mode)
- **OpenAI API Key** (Secret input)
- **Temperature** (Slider 0-1, default 0.5)
- **Top P** (Slider 0-1, default 0.9)
- **زر "Run AI Health Check"** مع عرض نتائج 4 فحوصات + عينة رد

### 5. تحديث ContentCalendarPage.tsx

**إزالة:** اختيار المزود (provider dropdown)، لا يظهر أي خيار model.

**تحديث المدخلات:** المنصة، النبرة (رسمي/تنفيذي/سعودي_أبيض)، الجمهور، الفكرة، CTA، رابط الهبوط.

**تحديث عرض المخرجات:** حقول قابلة للتعديل:
- headline / subheadline / cta_text (design_copy)
- primary_text / hashtags / links (post_copy)

**زر Validate:** يفحص طول النص حسب المنصة، الكلمات الممنوعة، وجود الروابط.

**استدعاء** `ai-generate-content` بدلاً من `generate-marketing-content`.

### 6. صفحة AI Generation Logs

صفحة جديدة `/admin/ai-logs` تعرض جدول السجلات:
- التاريخ، المستخدم، المنصة، النبرة، النموذج، الوضع
- حالة file_search، زمن الاستجابة، النتيجة (success/fail)
- توسيع للصف لعرض request/response payload

### 7. تحديث Sidebar والـ Routes

- إضافة رابط "سجل توليد AI" في قسم النظام
- إضافة Route في App.tsx

---

## الملفات المتأثرة

| الملف | الإجراء |
|---|---|
| `supabase/functions/ai-generate-content/index.ts` | إنشاء جديد |
| `supabase/functions/ai-health-check/index.ts` | إنشاء جديد |
| `src/pages/admin/AIGenerationLogsPage.tsx` | إنشاء جديد |
| `src/pages/admin/SettingsPage.tsx` | إعادة بناء قسم AI |
| `src/pages/admin/marketing/ContentCalendarPage.tsx` | تحديث AI integration |
| `src/pages/admin/AdminLayout.tsx` | إضافة رابط Logs |
| `src/App.tsx` | إضافة Route |
| `supabase/config.toml` | تسجيل Functions جديدة |
| DB Migration | جدول `ai_generation_logs` |

---

## ملاحظات تقنية

- **OpenAI API Key**: سيبقى في `system_settings` (كما هو حالياً) لأن Edge Functions تقرأه من DB. نقله لـ ENV فقط يتطلب إدارة secrets يدوية عبر أداة secrets - يمكن تنفيذه لاحقاً إذا أردت.
- **الـ Edge Functions القديمة** (`generate-marketing-content`, `raw-chat-test`, `assistant-chat`) ستبقى موجودة لعدم كسر أي شيء، لكن لن تُستخدم من الواجهات الجديدة.
- **OpenAI Responses API** يستخدم endpoint مختلف عن Chat Completions: `POST /v1/responses` مع `input` بدل `messages`.

