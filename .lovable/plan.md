

# خطة بناء Webyan AI Copilot

## ملخص المشروع
بناء مساعد ذكي داخلي احترافي (Copilot) للفريق، مبني على البنية التحتية الحالية لـ RAG + OpenRouter، يظهر كلوحة جانبية عائمة قابلة للفتح/الإغلاق من أي مكان في النظام (لوحة الإدارة + بوابة الموظف).

---

## الهيكل العام

```text
┌──────────────────────────────────────────────┐
│  App.tsx                                      │
│  ├─ AdminLayout  ──→  <AICopilotPanel />     │
│  ├─ StaffLayout  ──→  <AICopilotPanel />     │
│  └─ زر عائم ثابت أسفل يسار الشاشة            │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  AICopilotPanel (Sheet جانبي)                 │
│  ├─ Header: اسم + حالة + نموذج + Badge       │
│  ├─ Tabs: اسأل | ردود | تحليل | اقتراحات     │
│  ├─ منطقة المحادثة (Markdown + مصادر)         │
│  ├─ Quick Actions chips                       │
│  ├─ Input area + أزرار                        │
│  └─ Debug Panel (قابل للطي)                   │
└──────────────────────────────────────────────┘
```

---

## المراحل والمهام

### 1. قاعدة البيانات (3 جداول جديدة)

**`ai_copilot_sessions`**: id, user_id, title, mode (ask/support/analyze/suggest), model_used, created_at, updated_at

**`ai_copilot_messages`**: id, session_id (FK), role (user/assistant/system), content, sources_json (jsonb), retrieval_json (jsonb), model_used, latency_ms, created_at

**`ai_copilot_actions`**: id, session_id (FK), action_type, input_json, output_json, created_at

- RLS: المستخدم يرى جلساته فقط (user_id = auth.uid())
- الأدمن والموظف يمكنهم الوصول

### 2. Edge Function: `ai-copilot`

Edge Function جديدة تعيد استخدام `runRAGPipeline` الموجودة في `grounded-chat-test` مع التعديلات التالية:

- **Actions المدعومة**: `ask`, `support-reply`, `analyze-ticket`, `suggest-actions`
- **لكل action** يتم بناء system prompt مختلف:
  - `ask`: الـ prompt الحالي للـ grounded chat
  - `support-reply`: prompt متخصص بردود الدعم مع مدخلات (رسالة العميل، النبرة، نوع الطلب)
  - `analyze-ticket`: prompt لتحليل التذاكر (عنوان، وصف، رسائل)
  - `suggest-actions`: prompt لاقتراح الإجراءات التالية
- **Pipeline**: Retrieval → Prompt Builder → OpenRouter → Validation → Response
- يستخدم نفس قائمة النماذج المعتمدة (8 نماذج)
- يدعم retry + fallback الموجودين
- يحفظ الجلسة والرسائل تلقائياً في الجداول الجديدة
- Auth: التحقق من هوية المستخدم (staff أو admin)

**Shared Code**: سيتم استخراج `runRAGPipeline`, `callOpenRouter`, `fetchWithRetry`, والثوابت المشتركة لتكون قابلة للاستيراد من كلا الـ function.

### 3. واجهة المستخدم

#### A. `src/components/copilot/AICopilotPanel.tsx` (المكون الرئيسي)
- **Sheet** جانبي (من اليسار في RTL) بعرض ~450px
- **Header**: "مساعد ويبيان الذكي" + Badge حالة (متصل/غير متصل) + اسم النموذج
- **4 تبويبات** باستخدام Tabs component
- **Quick Actions**: chips قابلة للنقر تملأ textarea
- **اختيار النموذج**: dropdown مع badges (Provider + Tag)
- **أزرار**: إرسال، إيقاف، مسح، جلسة جديدة

#### B. `src/components/copilot/CopilotChatArea.tsx`
- عرض الرسائل مع `react-markdown`
- عرض المصادر كـ accordions مصغرة (title, category, similarity, preview)
- Badge "Grounded" على كل إجابة
- Typing indicator أثناء التوليد

#### C. `src/components/copilot/CopilotSupportTab.tsx`
- مدخلات: رسالة العميل، ملخص، نبرة (ودي/رسمي/مختصر)، نوع الطلب
- أزرار سريعة: رد احترافي، رد مختصر، إعادة صياغة

#### D. `src/components/copilot/CopilotTicketTab.tsx`
- مدخلات: عنوان التذكرة، وصف، رسائل سابقة
- المخرجات: ملخص + نوع + أولوية + إجراءات مقترحة

#### E. `src/components/copilot/CopilotSuggestTab.tsx`
- مدخلات: وصف الحالة الحالية
- المخرجات: قائمة اقتراحات منسقة

#### F. `src/components/copilot/CopilotDebugPanel.tsx`
- Collapsible: model, chunks count, prompt size, latency, validation status, raw snippet

#### G. `src/components/copilot/CopilotSessionHistory.tsx`
- قائمة الجلسات السابقة مع إمكانية فتح أي جلسة

#### H. `src/components/copilot/CopilotLauncher.tsx`
- زر عائم ثابت (fixed bottom-left) مع أيقونة Sparkles
- يفتح/يغلق الـ Sheet
- يظهر في AdminLayout و StaffLayout

### 4. التكامل مع Layouts

- **AdminLayout.tsx**: إضافة `<CopilotLauncher />` و `<AICopilotPanel />`
- **StaffLayout.tsx**: نفس الشيء
- **Context Mode**: تجهيز بنية `CopilotContext` (React Context) لاستقبال بيانات الصفحة الحالية (تذكرة، عميل، مشروع) - في النسخة الأولى البنية فقط بدون تعبئة تلقائية

### 5. Quick Actions الافتراضية

```
اشرح لي هذه الباقة | اكتب رد دعم احترافي | حلل هذه التذكرة
اقترح الخطوة التالية | لخص المشكلة | ما الذي لا يجب قوله للعميل؟
اكتب رد أكثر ودية | اكتب رد أكثر رسمية
```

### 6. Validation & Safety

- لا إجابة بدون retrieval (chunks ≥ 1)
- إذا الثقة < 0.3 → رسالة "المعلومات غير كافية"
- فحص مؤشرات الهلوسة
- Badge واضح: Grounded / Warning / Insufficient Data

---

## ترتيب التنفيذ

1. Migration: إنشاء 3 جداول + RLS
2. Edge Function: `ai-copilot` مع 4 أوضاع
3. config.toml: تسجيل الـ function
4. UI Components: Panel + Tabs + Chat + Debug
5. التكامل مع AdminLayout و StaffLayout
6. Session History

---

## التقنيات المستخدمة

- **Backend**: Deno Edge Function, OpenRouter API, pgvector RAG pipeline
- **Frontend**: React, Shadcn Sheet/Tabs/ScrollArea, react-markdown, Tailwind RTL
- **DB**: 3 جداول جديدة مع RLS

