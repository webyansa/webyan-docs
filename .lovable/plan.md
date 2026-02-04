
# خطة إصلاح تدفق العمليات في نظام CRM

## ملخص المشاكل المكتشفة

### المشكلة الأولى: تحويل طلب الموقع لا يظهر في الفرص
**السبب الجذري:** الكود الحالي في `WebsiteRequestsPage.tsx` يحول الطلب إلى "عميل محتمل" (Lead) في جدول `crm_leads`، بينما صفحة الفرص تعرض بيانات من جدول `crm_opportunities`.

```text
التدفق الحالي (خاطئ):
طلب موقع → عميل محتمل (crm_leads) → لا يظهر في الفرص

التدفق المطلوب:
طلب موقع → فرصة (crm_opportunities) → يظهر في لوحة الفرص
```

### المشكلة الثانية: المشروع لا يظهر بعد توقيع العقد
**الأسباب المحتملة:**
1. عدم تحديث جميع استعلامات React Query المطلوبة
2. عدم التحقق من قابلية قراءة البيانات بعد الإنشاء (RLS timing)
3. الانتقال للصفحة قبل اكتمال مزامنة البيانات

---

## خطة الإصلاح

### الخطوة 1: إضافة خيار "تحويل مباشر إلى فرصة" في طلبات الموقع

**الملف:** `src/pages/admin/WebsiteRequestsPage.tsx`

**التغييرات:**
1. إضافة mutation جديد `convertToOpportunityMutation`
2. إنشاء ملف جهة (client_organizations) بحالة prospect
3. إنشاء فرصة (crm_opportunities) مرتبطة بالجهة
4. ربط طلب الموقع بالفرصة الجديدة
5. إضافة زر "تحويل إلى فرصة" بجانب زر "تحويل إلى عميل محتمل"

```typescript
// Mutation جديد للتحويل المباشر للفرصة
const convertToOpportunityMutation = useMutation({
  mutationFn: async (submission: FormSubmission) => {
    // 1. إنشاء ملف جهة جديد
    const { data: org } = await supabase
      .from('client_organizations')
      .insert({
        name: submission.organization_name,
        contact_email: submission.email,
        contact_phone: submission.phone,
        city: submission.city,
        lifecycle_stage: 'lead',
        subscription_status: 'prospect',
      })
      .select()
      .single();

    // 2. إنشاء فرصة مرتبطة
    const { data: opportunity } = await supabase
      .from('crm_opportunities')
      .insert({
        name: `فرصة - ${submission.organization_name}`,
        account_id: org.id,
        stage: 'new_opportunity',
        status: 'open',
        opportunity_type: submission.interest_type,
        expected_value: 0,
        probability: 10,
      })
      .select()
      .single();

    // 3. تحديث طلب الموقع
    await supabase
      .from('website_form_submissions')
      .update({
        opportunity_id: opportunity.id,
        status: 'converted',
        converted_at: new Date().toISOString(),
      })
      .eq('id', submission.id);

    return { org, opportunity };
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['website-submissions'] });
    queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
    queryClient.invalidateQueries({ queryKey: ['deals'] });
    toast.success('تم تحويل الطلب إلى فرصة بنجاح');
  },
});
```

### الخطوة 2: إصلاح ظهور المشروع بعد توقيع العقد

**الملف:** `src/components/operations/ContractDocumentationModal.tsx`

**التغييرات:**
1. إضافة التحقق من قابلية قراءة المشروع قبل إظهار رسالة النجاح
2. توسيع قائمة invalidateQueries لتشمل جميع المفاتيح المستخدمة
3. إضافة تأخير بسيط للتأكد من مزامنة البيانات

```typescript
// في onSuccess
onSuccess: async (data) => {
  // Invalidate جميع الاستعلامات المتعلقة
  const queriesToInvalidate = [
    ['quote-contract-status', quoteId],
    ['crm-quote-details', quoteId],
    ['quote'],
    ['projects'],
    ['projects-list'],
    ['implementations'],
    ['crm-quotes'],
    ['operations-projects'],
    ['client-projects'],
    ['dashboard-stats'],
  ];

  await Promise.all(
    queriesToInvalidate.map(key => 
      queryClient.invalidateQueries({ queryKey: key })
    )
  );

  if (data.project) {
    // التحقق من قابلية قراءة المشروع
    let retries = 3;
    let projectVerified = false;
    
    while (retries > 0 && !projectVerified) {
      const { data: verified } = await supabase
        .from('crm_implementations')
        .select('id')
        .eq('id', data.project.id)
        .maybeSingle();
      
      if (verified) {
        projectVerified = true;
      } else {
        await new Promise(r => setTimeout(r, 300));
        retries--;
      }
    }

    if (!projectVerified) {
      toast.warning('تم إنشاء المشروع لكن قد يحتاج لتحديث الصفحة');
    }

    // إظهار رسالة النجاح
    setCreatedProjectId(data.project.id);
    setShowSuccess(true);
  }
}
```

### الخطوة 3: تحسين صفحة المشاريع لتحديث تلقائي

**الملف:** `src/pages/admin/operations/ProjectsPage.tsx`

**التغييرات:**
- إضافة `refetchOnMount: true`
- إضافة `refetchOnWindowFocus: true`

```typescript
const { data: projects = [], isLoading, refetch } = useQuery({
  queryKey: ['projects-list'],
  queryFn: async () => { /* ... */ },
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
});
```

### الخطوة 4: تحسين تدفق العمل في صفحة الفرص (DealsPage)

**الملف:** `src/pages/admin/crm/DealsPage.tsx`

**التغييرات:**
- إضافة invalidation للفرص عند اعتماد الفرصة
- تحديث queryClient بشكل صحيح

---

## تسلسل تدفق العمليات المصحح

```text
┌─────────────────────────────────────────────────────────────────┐
│                    تدفق العمليات المصحح                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. استقبال الطلب (Website Request)                             │
│     ↓                                                           │
│     [طلبات الموقع] → زر "تحويل إلى فرصة"                        │
│                                                                 │
│  2. إنشاء الفرصة (Opportunity)                                  │
│     ↓                                                           │
│     - إنشاء ملف جهة (prospect)                                  │
│     - إنشاء فرصة مرتبطة (new_opportunity)                       │
│     - تحديث طلب الموقع بـ opportunity_id                        │
│                                                                 │
│  3. متابعة الفرصة (Deals Pipeline)                              │
│     ↓                                                           │
│     new_opportunity → meeting_scheduled → meeting_done          │
│                  → proposal_sent → pending_approval             │
│                                                                 │
│  4. إنشاء عرض السعر (Quote)                                     │
│     ↓                                                           │
│     - إنشاء عرض سعر من الفرصة                                   │
│     - إرسال للعميل → اعتماد العرض (accepted)                    │
│                                                                 │
│  5. توثيق العقد (Contract Documentation)                        │
│     ↓                                                           │
│     - تحديد تاريخ التوقيع                                       │
│     - تعيين فريق التنفيذ (Implementer + CSM)                    │
│     - تحديد تواريخ الاستلام والتسليم                            │
│                                                                 │
│  6. إنشاء المشروع (Project Creation)                            │
│     ↓                                                           │
│     - إنشاء سجل في crm_implementations                          │
│     - إنشاء مراحل المشروع                                       │
│     - إرسال إشعارات للفريق                                      │
│     - تحديث كافة القوائم تلقائياً                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## الملفات المتأثرة

| الملف | نوع التغيير | الوصف |
|-------|-------------|-------|
| `src/pages/admin/WebsiteRequestsPage.tsx` | تحديث | إضافة mutation للتحويل المباشر للفرصة + زر جديد |
| `src/components/operations/ContractDocumentationModal.tsx` | تحديث | إصلاح Cache Invalidation + التحقق من البيانات |
| `src/pages/admin/operations/ProjectsPage.tsx` | تحديث | تحسين إعدادات React Query |
| `src/pages/admin/crm/DealsPage.tsx` | تحديث | إصلاح invalidation عند اعتماد الفرصة |

---

## خطوات التنفيذ

1. **تحديث WebsiteRequestsPage.tsx**
   - إضافة convertToOpportunityMutation
   - إضافة زر "تحويل إلى فرصة" في واجهة المستخدم

2. **تحديث ContractDocumentationModal.tsx**
   - توسيع قائمة invalidateQueries
   - إضافة التحقق من قابلية القراءة
   - إضافة retry logic

3. **تحديث ProjectsPage.tsx**
   - إضافة refetchOnMount و refetchOnWindowFocus

4. **تحديث DealsPage.tsx**
   - إصلاح invalidation في handleApproval

---

## اختبار التدفق

بعد التنفيذ، يجب اختبار:
1. تحويل طلب موقع جديد إلى فرصة → يجب أن تظهر في لوحة الفرص
2. إنشاء عرض سعر واعتماده → يجب أن يظهر زر توثيق العقد
3. توثيق العقد → يجب أن يظهر المشروع فوراً في قائمة المشاريع
4. الضغط على "الذهاب للمشروع" → يجب أن يفتح صفحة المشروع بالبيانات الصحيحة
