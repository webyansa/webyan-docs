

## خطة تحسين توثيق العقد وإنشاء المشروع

---

### نظرة عامة على المشكلات الحالية

| المشكلة | الوصف | الخطورة |
|---------|-------|---------|
| تكرار التوثيق | يمكن توثيق العقد أكثر من مرة لنفس عرض السعر | عالية |
| مشاريع مكررة | لا يوجد قيد فريد على quote_id في جدول المشاريع | عالية |
| مشاريع بدون فريق | يمكن إنشاء مشروع بدون تعيين أي موظف | متوسطة |
| تجربة مستخدم مبعثرة | عملية التوثيق والتعيين منفصلة | متوسطة |

---

### الحل: عملية موحدة من خطوتين

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    نافذة توثيق العقد وإنشاء المشروع                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  معلومات العميل وعرض السعر                                  │   │
│  │  العميل: شركة xyz                                           │   │
│  │  رقم العرض: QT-2024-001                                     │   │
│  │  قيمة العرض: 50,000 ر.س                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                     │
│  الخطوة 1: توثيق العقد                                             │
│  ├─ حالة العقد: [تم التوقيع]                                       │
│  ├─ تاريخ التوقيع: [15/01/2024]                                    │
│  ├─ نوع العقد: [عقد خدمات]                                         │
│  └─ ملاحظات: [اختياري]                                             │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                     │
│  الخطوة 2: تعيين فريق التنفيذ (إجباري)                             │
│  ├─ مسؤول التنفيذ: [محمد أحمد] *                                   │
│  └─ مسؤول نجاح العميل: [سارة علي] *                                │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ماذا سيحدث عند التأكيد:                                    │   │
│  │  ✓ سيتم توثيق حالة العقد                                    │   │
│  │  ✓ سيتم إنشاء مشروع جديد                                    │   │
│  │  ✓ سيتم إرسال إشعار لمسؤول التنفيذ ومسؤول نجاح العميل       │   │
│  │  ✓ سيتم تسجيل العملية في سجل النشاط                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [إلغاء]                    [توثيق العقد وإنشاء المشروع]           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### الجزء الأول: تعديلات قاعدة البيانات

#### 1. إضافة قيد فريد على quote_id

```sql
-- إضافة قيد فريد لمنع إنشاء مشاريع مكررة
ALTER TABLE crm_implementations 
ADD CONSTRAINT crm_implementations_quote_id_unique 
UNIQUE (quote_id);

-- إضافة قيد فريد على جدول توثيق العقود
ALTER TABLE contract_documentation 
ADD CONSTRAINT contract_documentation_quote_id_unique 
UNIQUE (quote_id);
```

#### 2. إضافة عمود project_id لجدول crm_quotes

```sql
-- ربط عرض السعر بالمشروع المنشأ
ALTER TABLE crm_quotes
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES crm_implementations(id);
```

---

### الجزء الثاني: تحديث ContractDocumentationModal

#### الحالات والتحقق المطلوب

| الحالة | الفحص | الرسالة | الإجراء |
|--------|-------|---------|---------|
| عقد موثق مسبقاً | `contract_documentation.quote_id = quoteId` | "تم توثيق العقد مسبقًا" | منع الحفظ + عرض رابط المشروع |
| مشروع موجود | `crm_implementations.quote_id = quoteId` | "يوجد مشروع قائم مرتبط بهذا العرض" | منع الحفظ + عرض رابط المشروع |
| فريق غير مكتمل | `!implementerId OR !csmId` | "يرجى تعيين مسؤول التنفيذ ومسؤول نجاح العميل" | تعطيل زر الحفظ |

#### التغييرات على الكود

1. **إضافة استعلام للتحقق من الحالة الحالية**:
```typescript
const { data: existingData } = useQuery({
  queryKey: ['quote-contract-status', quoteId],
  queryFn: async () => {
    // فحص توثيق عقد موجود
    const { data: contractDoc } = await supabase
      .from('contract_documentation')
      .select('id, status, signed_date')
      .eq('quote_id', quoteId)
      .maybeSingle();

    // فحص مشروع موجود
    const { data: project } = await supabase
      .from('crm_implementations')
      .select('id, project_name')
      .eq('quote_id', quoteId)
      .maybeSingle();

    return { contractDoc, project };
  },
});
```

2. **إضافة حقول تعيين الفريق**:
```typescript
const [implementerId, setImplementerId] = useState<string>('');
const [csmId, setCsmId] = useState<string>('');
```

3. **تحديث منطق الحفظ**:
```typescript
const createContractAndProjectMutation = useMutation({
  mutationFn: async () => {
    // 1. التحقق من عدم وجود توثيق سابق
    if (existingData?.contractDoc) {
      throw new Error('CONTRACT_ALREADY_DOCUMENTED');
    }
    
    // 2. التحقق من عدم وجود مشروع
    if (existingData?.project) {
      throw new Error('PROJECT_ALREADY_EXISTS');
    }
    
    // 3. إنشاء توثيق العقد
    const { data: contractDoc } = await supabase
      .from('contract_documentation')
      .insert({ ... })
      .select()
      .single();
    
    // 4. إنشاء المشروع مع الفريق
    const { data: project } = await supabase
      .from('crm_implementations')
      .insert({
        quote_id: quoteId,
        contract_doc_id: contractDoc.id,
        implementer_id: implementerId,
        csm_id: csmId,
        ...
      })
      .select()
      .single();
    
    // 5. تحديث عرض السعر بمعرف المشروع
    await supabase
      .from('crm_quotes')
      .update({ project_id: project.id })
      .eq('id', quoteId);
    
    // 6. إنشاء سجلات فريق المشروع
    await supabase
      .from('project_team_members')
      .insert([
        { project_id: project.id, staff_id: implementerId, role: 'implementer' },
        { project_id: project.id, staff_id: csmId, role: 'csm' },
      ]);
    
    // 7. إرسال الإشعارات
    await sendNotifications(project.id, implementerId, csmId);
    
    return project;
  },
});
```

---

### الجزء الثالث: الإشعارات التلقائية

#### الإشعارات المطلوبة

| المستلم | العنوان | المحتوى |
|---------|---------|---------|
| مسؤول التنفيذ | مشروع جديد | "لديك مشروع جديد تم إسناده إليك: [اسم المشروع]" |
| مسؤول نجاح العميل | عميل جديد | "تم إسناد عميل جديد إليك لمتابعة نجاح العميل: [اسم العميل]" |
| الإدارة | عقد جديد | "تم توثيق عقد وإنشاء مشروع جديد: [اسم المشروع]" |

#### كود إرسال الإشعارات

```typescript
const sendNotifications = async (
  projectId: string, 
  implementerId: string, 
  csmId: string
) => {
  // إشعار موظف التنفيذ
  await supabase.from('staff_notifications').insert({
    staff_id: implementerId,
    title: 'مشروع جديد',
    message: `لديك مشروع جديد تم إسناده إليك: ${projectName}`,
    type: 'project_assignment',
    link: `/admin/projects/${projectId}`,
  });

  // إشعار مدير نجاح العميل
  await supabase.from('staff_notifications').insert({
    staff_id: csmId,
    title: 'عميل جديد',
    message: `تم إسناد عميل جديد إليك: ${accountName}`,
    type: 'project_assignment',
    link: `/admin/projects/${projectId}`,
  });
};
```

---

### الجزء الرابع: سجل النشاط

#### تسجيل الأحداث

```typescript
// تسجيل توثيق العقد
await supabase.from('crm_opportunity_activities').insert({
  opportunity_id: opportunityId,
  activity_type: 'contract_signed',
  notes: `تم توثيق العقد وإنشاء مشروع جديد`,
  performed_by: staffId,
  metadata: {
    quote_id: quoteId,
    project_id: project.id,
    contract_doc_id: contractDoc.id,
    implementer_id: implementerId,
    csm_id: csmId,
    signed_date: signedDate,
  },
});
```

---

### الجزء الخامس: نافذة التأكيد بعد النجاح

```text
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    ✓ تم بنجاح                                       │
│                                                                     │
│         تم توثيق العقد بنجاح وتم إنشاء مشروع جديد                   │
│              مرتبط بهذا العرض                                        │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                     │
│  المشروع: منصة إدارة المحتوى - شركة xyz                            │
│  مسؤول التنفيذ: محمد أحمد                                          │
│  مسؤول نجاح العميل: سارة علي                                        │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                     │
│    [الذهاب إلى المشروع]        [تعيين/تعديل فريق العمل]            │
│                                                                     │
│                          [إغلاق]                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### الجزء السادس: تحديث QuoteDetailsPage

#### التغييرات المطلوبة

1. **فحص حالة التوثيق عند فتح الصفحة**:
   - إذا كان العقد موثقاً → عرض حالة "تم التوثيق" + رابط المشروع
   - إذا لم يكن موثقاً → عرض زر "توثيق العقد"

2. **تحديث واجهة الأزرار**:

| الحالة | الزر المعروض |
|--------|--------------|
| عرض سعر غير معتمد | - (لا يظهر زر التوثيق) |
| عرض سعر معتمد + لم يُوثق | "توثيق العقد وإنشاء المشروع" |
| عرض سعر موثق + مشروع موجود | "تم التوثيق ✓" + "فتح المشروع" |

---

### الملفات المطلوب تعديلها

| الملف | التعديلات |
|-------|----------|
| `src/components/operations/ContractDocumentationModal.tsx` | إعادة بناء كاملة مع خطوتين |
| `src/pages/admin/crm/QuoteDetailsPage.tsx` | فحص حالة التوثيق + تحديث الأزرار |
| SQL Migration | قيود فريدة + عمود project_id |

---

### التفاصيل التقنية للتنفيذ

#### 1. هيكل ContractDocumentationModal المحدث

```typescript
interface ContractDocumentationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNumber: string;
  quoteTotal: number;
  opportunityId?: string;
  accountId: string;
  accountName: string;
  staffId?: string;
}

// الحالات
const [step, setStep] = useState<'contract' | 'team' | 'success'>('contract');
const [status, setStatus] = useState<'preparing' | 'signed'>('signed');
const [signedDate, setSignedDate] = useState<Date>(new Date());
const [contractType, setContractType] = useState<string>('');
const [notes, setNotes] = useState('');
const [implementerId, setImplementerId] = useState<string>('');
const [csmId, setCsmId] = useState<string>('');
const [createdProject, setCreatedProject] = useState<{id: string; name: string} | null>(null);
```

#### 2. شروط تعطيل الزر

```typescript
const isSubmitDisabled = () => {
  if (existingData?.contractDoc || existingData?.project) return true;
  if (status !== 'signed') return false;
  if (!signedDate) return true;
  if (!implementerId || !csmId) return true;
  return false;
};
```

#### 3. رسائل الخطأ

```typescript
const getValidationMessage = () => {
  if (existingData?.contractDoc) {
    return 'لا يمكن توثيق العقد مرة أخرى. العقد موثق مسبقًا.';
  }
  if (existingData?.project) {
    return 'يوجد مشروع قائم مرتبط بهذا العرض. انتقل إلى المشاريع لإدارته.';
  }
  if (status === 'signed' && (!implementerId || !csmId)) {
    return 'يرجى تعيين مسؤول التنفيذ ومسؤول نجاح العميل قبل إنشاء المشروع.';
  }
  return null;
};
```

---

### تسلسل التنفيذ

| الخطوة | المهمة | الأولوية |
|--------|--------|----------|
| 1 | تنفيذ SQL Migration للقيود الفريدة | عالية |
| 2 | إعادة بناء ContractDocumentationModal | عالية |
| 3 | تحديث QuoteDetailsPage | عالية |
| 4 | إضافة منطق الإشعارات | عالية |
| 5 | إضافة سجل النشاط | متوسطة |
| 6 | اختبار السيناريوهات | عالية |

---

### النتيجة المتوقعة

- منع توثيق العقد أكثر من مرة
- منع إنشاء مشاريع مكررة (على مستوى قاعدة البيانات)
- إجبار تعيين فريق التنفيذ قبل إنشاء المشروع
- إشعارات تلقائية للفريق المعين
- تسجيل كامل في سجل النشاط
- تجربة مستخدم واضحة ومتسلسلة

