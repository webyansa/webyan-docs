

# نظام إدارة الحملات التسويقية البريدية - خطة التنفيذ

## ملخص المشروع

بناء نظام حملات تسويقية بريدية متكامل داخل لوحة تحكم ويبيان، يعتمد بالكامل على بيانات المنظمات الموجودة (client_organizations) دون تكرار أي بيانات.

---

## المرحلة الأولى: قاعدة البيانات

### الجداول المطلوبة (7 جداول)

**1. marketing_email_templates** - قوالب البريد
- id, name, subject, html_body, category, variables_used (jsonb), is_active, created_by, created_at, updated_at

**2. marketing_campaigns** - الحملات
- id, name, goal (enum: renewal/incentive/education/upgrade/alert), template_id (FK), audience_type (enum: segment/manual), audience_filters (jsonb), status (enum: draft/scheduled/sending/completed/paused/cancelled), scheduled_at, started_at, completed_at, total_recipients, sent_count, success_count, failed_count, created_by, updated_by, created_at, updated_at, batch_size (default 50), batch_delay_ms (default 2000)

**3. campaign_recipients** - مستلمو الحملة (OrganizationId فقط)
- id, campaign_id (FK), organization_id (FK to client_organizations), email_status (enum: pending/sent/delivered/failed/bounced), sent_at, error_message, open_count, last_opened_at, click_count, last_clicked_at, created_at

**4. email_engagement_events** - أحداث التفاعل
- id, campaign_id (FK), organization_id (FK), event_type (enum: open/click/bounce/unsubscribe), link_url, ip_address, user_agent, created_at

**5. marketing_unsubscribes** - إلغاء الاشتراك
- id, organization_id (FK, unique), reason, unsubscribed_at

**6. campaign_audit_log** - سجل التدقيق
- id, campaign_id (FK), action (text), performed_by (uuid), details (jsonb), created_at

**7. campaign_links** - تتبع الروابط
- id, campaign_id (FK), original_url, tracking_code (unique), click_count, created_at

### سياسات الأمان (RLS)
- جميع الجداول تتطلب صلاحية admin او editor للقراءة والكتابة
- تعتمد على دالة `is_admin_or_editor()` الموجودة

### Realtime
- تفعيل realtime على جدول `campaign_recipients` لتحديث الإحصائيات مباشرة أثناء الإرسال

---

## المرحلة الثانية: Backend Functions (Edge Functions)

### 1. send-campaign (دالة الإرسال الرئيسية)
- تستقبل campaign_id
- تجلب بيانات المنظمات المستهدفة من client_organizations مباشرة
- تستبدل المتغيرات الديناميكية ({{OrganizationName}}, {{PlanName}}, etc.)
- ترسل على دفعات (batch) مع تأخير (throttling)
- تحدث حالة كل مستلم في campaign_recipients
- تستخدم نظام SMTP الموجود (smtp-sender.ts)
- تدعم إعادة المحاولة للرسائل الفاشلة
- تتحقق من قائمة إلغاء الاشتراك قبل الإرسال
- تلف الروابط بروابط تتبع
- تضيف Tracking Pixel للفتح
- تضيف رابط إلغاء الاشتراك تلقائيا

### 2. track-email-event (تتبع الفتح والنقر)
- verify_jwt = false (عام)
- تستقبل tracking pixel requests (للفتح)
- تستقبل link clicks (للنقر) وتعيد التوجيه للرابط الأصلي
- تسجل الأحداث في email_engagement_events
- تحدث إحصائيات campaign_recipients

### 3. unsubscribe-marketing (إلغاء الاشتراك)
- verify_jwt = false
- تضيف المنظمة لقائمة إلغاء الاشتراك
- تعرض صفحة تأكيد

---

## المرحلة الثالثة: واجهات المستخدم

### هيكل الصفحات (4 صفحات رئيسية)

```text
/admin/marketing               --> لوحة التسويق الرئيسية (قائمة الحملات + إحصائيات)
/admin/marketing/campaigns/new --> إنشاء/تعديل حملة
/admin/marketing/campaigns/:id --> تفاصيل وتحليلات حملة
/admin/marketing/templates     --> إدارة القوالب البريدية
```

### 1. صفحة الحملات الرئيسية (MarketingDashboardPage)
- بطاقات إحصائية: إجمالي الحملات، معدل التسليم، معدل الفتح، معدل النقر
- قائمة الحملات مع الحالة والإحصائيات
- فلتر حسب الحالة والهدف
- زر إنشاء حملة جديدة

### 2. صفحة إنشاء/تعديل حملة (CampaignEditorPage)
- **الخطوة 1**: معلومات أساسية (الاسم، الهدف)
- **الخطوة 2**: منشئ الجمهور الذكي
  - اختيار نوع الاستهداف (تلقائي بشروط / يدوي)
  - فلاتر: حالة الاشتراك، نوع الباقة، المدينة، الأيام المتبقية، آخر تفاعل
  - شروط مركبة AND/OR
  - معاينة فورية لعدد المنظمات المطابقة
  - أو اختيار يدوي من قائمة المنظمات
- **الخطوة 3**: اختيار/إنشاء القالب
- **الخطوة 4**: معاينة واختبار
  - معاينة مع بيانات منظمة حقيقية
  - إرسال تجريبي لبريد محدد
- **الخطوة 5**: جدولة أو إرسال فوري

### 3. صفحة تفاصيل الحملة (CampaignDetailsPage)
- إحصائيات مفصلة بالرسوم البيانية (recharts)
- قائمة المستلمين مع حالة كل منهم
- أحداث التفاعل (فتح، نقر، إلغاء)
- سجل التدقيق
- أزرار: إيقاف / إعادة الإرسال للفاشلة

### 4. صفحة القوالب (EmailTemplatesPage)
- قائمة القوالب
- محرر HTML مع معاينة مباشرة
- إدراج متغيرات ديناميكية بنقرة
- اختبار إرسال تجريبي

### تحديث القائمة الجانبية
- إضافة قسم "التسويق" في AdminLayout مع:
  - الحملات البريدية
  - القوالب البريدية

---

## المرحلة الرابعة: المتغيرات الديناميكية

المتغيرات المدعومة (تُجلب مباشرة من client_organizations):

| المتغير | المصدر |
|---|---|
| {{OrganizationName}} | name |
| {{PlanName}} | subscription_plan |
| {{SubscriptionStatus}} | subscription_status |
| {{SubscriptionEndDate}} | subscription_end_date |
| {{RemainingDays}} | حساب من subscription_end_date |
| {{City}} | city |
| {{ContactName}} | primary_contact_name |
| {{ContactEmail}} | contact_email |
| {{LoginUrl}} | ثابت (رابط بوابة العملاء) |
| {{UnsubscribeUrl}} | رابط إلغاء الاشتراك الديناميكي |

---

## المرحلة الخامسة: الامتثال

- إضافة رابط إلغاء اشتراك تلقائي في ذيل كل رسالة
- فحص قائمة marketing_unsubscribes قبل كل إرسال
- تسجيل كل عملية إلغاء في email_engagement_events

---

## التفاصيل التقنية

### الملفات الجديدة المتوقعة

```text
src/pages/admin/marketing/
  MarketingDashboardPage.tsx
  CampaignEditorPage.tsx
  CampaignDetailsPage.tsx
  EmailTemplatesPage.tsx

src/components/marketing/
  AudienceBuilder.tsx          -- منشئ الجمهور الذكي
  CampaignStatsCards.tsx       -- بطاقات الإحصائيات
  CampaignsList.tsx            -- قائمة الحملات
  TemplateEditor.tsx           -- محرر القوالب
  TemplatePreview.tsx          -- معاينة القالب
  RecipientsList.tsx           -- قائمة المستلمين
  CampaignAnalytics.tsx        -- رسوم بيانية للتحليلات
  VariableInserter.tsx         -- أداة إدراج المتغيرات

supabase/functions/
  send-campaign/index.ts       -- محرك الإرسال
  track-email-event/index.ts   -- تتبع الفتح والنقر
  unsubscribe-marketing/index.ts -- إلغاء الاشتراك
```

### تعديل ملفات موجودة
- `src/App.tsx` - إضافة المسارات الجديدة
- `src/pages/admin/AdminLayout.tsx` - إضافة قسم التسويق في القائمة الجانبية
- `supabase/config.toml` - إعداد verify_jwt = false للدوال العامة

### نهج التنفيذ
- استخدام نظام SMTP الموجود (smtp-sender.ts) كمحرك إرسال
- استخدام recharts الموجود للرسوم البيانية
- استخدام مكونات UI الموجودة (shadcn/ui)
- الاستعلام عن client_organizations مباشرة دون تكرار البيانات
- تخزين فقط organization_id في campaign_recipients

