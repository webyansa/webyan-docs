
# المرحلة الثانية من نظام CRM: الفواتير والمدفوعات + تغيير مرحلة العميل

---

## ملخص التنفيذ

سيتم إضافة نظام الفواتير والمدفوعات مع تبويب جديد في ملف العميل، إضافة إمكانية تغيير مرحلة العميل (lifecycle_stage) مباشرة من Header الملف مع تسجيل التغيير تلقائياً في Timeline.

---

## 1. تغييرات قاعدة البيانات

### جدول الفواتير `client_invoices`:
```sql
CREATE TABLE client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES client_organizations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'SAR',
  status text DEFAULT 'pending', -- pending, paid, overdue, cancelled
  issue_date date NOT NULL,
  due_date date NOT NULL,
  paid_at timestamptz,
  description text,
  items jsonb DEFAULT '[]',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### جدول المدفوعات `client_payments`:
```sql
CREATE TABLE client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES client_organizations(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES client_invoices(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  payment_method text, -- bank_transfer, card, cash
  payment_date date NOT NULL,
  reference_number text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
```

### سياسات RLS:
- المديرون فقط يمكنهم إدارة الفواتير والمدفوعات
- العملاء يمكنهم رؤية فواتيرهم فقط (للمرحلة المستقبلية)

### Trigger تسجيل الفواتير في Timeline:
- عند إنشاء فاتورة جديدة -> تسجيل `invoice_sent`
- عند تسجيل دفعة جديدة -> تسجيل `payment_received`

---

## 2. المكونات الجديدة

### 2.1 تبويب الفواتير `InvoicesTab.tsx`:
```
┌─────────────────────────────────────────────────────────────────┐
│  💰 الفواتير والمدفوعات                    [+ إنشاء فاتورة]    │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ المستحق   │  │ المدفوع    │  │ المتأخر    │  │ الإجمالي  │ │
│  │ 5,000 ر.س │  │ 12,000 ر.س │  │ 2,000 ر.س  │  │ 19,000 ر.س│ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  رقم الفاتورة  │  المبلغ   │  الحالة   │  تاريخ    │  إجراءات │
│  INV-2024-001  │ 5,000 ر.س │  ⏳ معلقة │ 15/01/2024│  [سداد]  │
│  INV-2024-002  │ 7,000 ر.س │  ✅ مدفوعة│ 01/12/2023│  [عرض]   │
│  INV-2024-003  │ 2,000 ر.س │  ⚠️ متأخرة│ 01/11/2023│  [تذكير] │
└─────────────────────────────────────────────────────────────────┘
```

**المميزات:**
- عرض قائمة الفواتير مع الحالة (معلقة/مدفوعة/متأخرة/ملغية)
- إحصائيات سريعة (المستحق، المدفوع، المتأخر، الإجمالي)
- تسجيل دفعة جديدة
- تنبيهات للفواتير المتأخرة

### 2.2 نموذج إنشاء فاتورة `InvoiceForm.tsx`:
- رقم الفاتورة (تلقائي)
- المبلغ والعملة
- تاريخ الإصدار والاستحقاق
- الوصف والملاحظات
- بنود الفاتورة (اختياري - JSON)

### 2.3 نموذج تسجيل دفعة `PaymentForm.tsx`:
- اختيار الفاتورة (أو دفعة عامة)
- المبلغ
- طريقة الدفع (تحويل بنكي/بطاقة/نقدي)
- رقم المرجع
- تاريخ الدفع

### 2.4 تحديث `CustomerHeader.tsx`:
إضافة قائمة منسدلة لتغيير مرحلة العميل مباشرة:

```
┌─────────────────────────────────────────────────────────────────┐
│  ◀ العودة      شركة ABC للتقنية            [تعديل] [إجراءات▼]  │
├─────────────────────────────────────────────────────────────────┤
│  [LOGO]  نوع: اشتراكات ويبيان                                   │
│          الحالة: ● نشط                                          │
│          المرحلة: [🟢 عميل نشط ▼]  <-- قائمة منسدلة قابلة للتغيير │
│                   ├─ 🎯 عميل محتمل                              │
│                   ├─ 📝 قيد التعاقد                             │
│                   ├─ ⚙️ قيد التنفيذ                              │
│                   ├─ ✅ نشط                                     │
│                   ├─ ⏸️ موقوف                                   │
│                   └─ ❌ منتهي                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. تدفق تغيير مرحلة العميل

```
[المستخدم يختار مرحلة جديدة]
         │
         ▼
[تأكيد التغيير - نافذة حوار]
         │
         ▼
┌─────────────────────────────┐
│ 1. تحديث lifecycle_stage   │
│    في client_organizations │
├─────────────────────────────┤
│ 2. إدراج سجل في            │
│    client_timeline         │
│    event_type: stage_changed│
│    metadata: {              │
│      old_stage: 'active',   │
│      new_stage: 'suspended' │
│    }                        │
└─────────────────────────────┘
         │
         ▼
[Toast: تم تغيير المرحلة بنجاح]
```

---

## 4. الملفات المطلوب إنشاؤها/تعديلها

### ملفات جديدة:
| الملف | الوصف |
|-------|-------|
| `src/components/crm/tabs/InvoicesTab.tsx` | تبويب الفواتير والمدفوعات |
| `src/components/crm/InvoiceForm.tsx` | نموذج إنشاء/تعديل فاتورة |
| `src/components/crm/PaymentForm.tsx` | نموذج تسجيل دفعة |
| `src/components/crm/LifecycleStageSelector.tsx` | قائمة منسدلة لتغيير المرحلة |
| `supabase/migrations/xxx_add_invoices_payments.sql` | جداول الفواتير والمدفوعات |

### ملفات للتعديل:
| الملف | التعديل |
|-------|---------|
| `src/pages/admin/crm/CustomerProfilePage.tsx` | إضافة تبويب الفواتير + دالة تغيير المرحلة |
| `src/components/crm/CustomerHeader.tsx` | إضافة قائمة منسدلة لتغيير المرحلة |
| `src/components/crm/TimelineItem.tsx` | إضافة أيقونات invoice_sent و payment_received |

---

## 5. التفاصيل التقنية

### 5.1 Migration SQL:
```sql
-- Invoices table
CREATE TABLE client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'SAR',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  paid_at timestamptz,
  description text,
  items jsonb DEFAULT '[]',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES client_invoices(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  payment_method text CHECK (payment_method IN ('bank_transfer', 'card', 'cash', 'other')),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_number text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS trigger AS $$
DECLARE
  year_str text;
  seq_num integer;
BEGIN
  year_str := to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(invoice_number, '^INV-' || year_str || '-', ''), '')::integer
  ), 0) + 1
  INTO seq_num
  FROM client_invoices
  WHERE invoice_number LIKE 'INV-' || year_str || '-%';
  
  NEW.invoice_number := 'INV-' || year_str || '-' || LPAD(seq_num::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
BEFORE INSERT ON client_invoices
FOR EACH ROW
WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
EXECUTE FUNCTION generate_invoice_number();

-- Timeline triggers for invoices
CREATE OR REPLACE FUNCTION log_invoice_to_timeline()
RETURNS trigger AS $$
BEGIN
  INSERT INTO client_timeline (organization_id, event_type, title, description, reference_type, reference_id, performed_by)
  VALUES (
    NEW.organization_id,
    'invoice_sent',
    'إنشاء فاتورة جديدة',
    'فاتورة رقم ' || NEW.invoice_number || ' بمبلغ ' || NEW.amount || ' ' || NEW.currency,
    'invoice',
    NEW.id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_timeline_trigger
AFTER INSERT ON client_invoices
FOR EACH ROW EXECUTE FUNCTION log_invoice_to_timeline();

-- Timeline trigger for payments
CREATE OR REPLACE FUNCTION log_payment_to_timeline()
RETURNS trigger AS $$
DECLARE
  inv_number text;
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT invoice_number INTO inv_number FROM client_invoices WHERE id = NEW.invoice_id;
  END IF;
  
  INSERT INTO client_timeline (organization_id, event_type, title, description, reference_type, reference_id, performed_by)
  VALUES (
    NEW.organization_id,
    'payment_received',
    'استلام دفعة',
    'دفعة بمبلغ ' || NEW.amount || ' ' || COALESCE(' للفاتورة ' || inv_number, ''),
    'payment',
    NEW.id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_timeline_trigger
AFTER INSERT ON client_payments
FOR EACH ROW EXECUTE FUNCTION log_payment_to_timeline();

-- RLS Policies
ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all invoices"
ON client_invoices FOR ALL
USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Admins can manage all payments"
ON client_payments FOR ALL
USING (is_admin_or_editor(auth.uid()));

-- Index for performance
CREATE INDEX idx_client_invoices_org ON client_invoices(organization_id);
CREATE INDEX idx_client_invoices_status ON client_invoices(status);
CREATE INDEX idx_client_payments_org ON client_payments(organization_id);
CREATE INDEX idx_client_payments_invoice ON client_payments(invoice_id);
```

### 5.2 دالة تغيير المرحلة:
```typescript
const handleLifecycleChange = async (newStage: LifecycleStage) => {
  const oldStage = organization.lifecycle_stage;
  if (newStage === oldStage) return;

  try {
    // 1. Update organization
    const { error: updateError } = await supabase
      .from('client_organizations')
      .update({ lifecycle_stage: newStage })
      .eq('id', organization.id);

    if (updateError) throw updateError;

    // 2. Log to timeline
    const { error: timelineError } = await supabase
      .from('client_timeline')
      .insert({
        organization_id: organization.id,
        event_type: 'stage_changed',
        title: 'تغيير مرحلة العميل',
        description: `من "${lifecycleConfig[oldStage].label}" إلى "${lifecycleConfig[newStage].label}"`,
        metadata: { old_stage: oldStage, new_stage: newStage },
        performed_by: user?.id,
        performed_by_name: user?.email
      });

    if (timelineError) throw timelineError;

    toast.success('تم تغيير مرحلة العميل بنجاح');
    fetchData(); // Refresh data
  } catch (error) {
    console.error('Error changing lifecycle stage:', error);
    toast.error('حدث خطأ أثناء تغيير المرحلة');
  }
};
```

---

## 6. ترتيب التنفيذ

1. **إنشاء Migration** - جداول الفواتير والمدفوعات مع RLS و Triggers
2. **إنشاء LifecycleStageSelector** - مكون منسدل لتغيير المرحلة
3. **تحديث CustomerHeader** - إضافة قائمة تغيير المرحلة
4. **إنشاء InvoicesTab** - عرض الفواتير والمدفوعات
5. **إنشاء InvoiceForm** - نموذج إنشاء فاتورة
6. **إنشاء PaymentForm** - نموذج تسجيل دفعة
7. **تحديث CustomerProfilePage** - ربط كل المكونات
8. **تحديث TimelineItem** - أيقونات الفواتير والمدفوعات

---

## 7. واجهة المستخدم النهائية

### حالات الفواتير بالألوان:
| الحالة | اللون | الأيقونة |
|--------|-------|----------|
| معلقة (pending) | أصفر | ⏳ |
| مدفوعة (paid) | أخضر | ✅ |
| متأخرة (overdue) | أحمر | ⚠️ |
| ملغية (cancelled) | رمادي | ✕ |

### طرق الدفع:
| الطريقة | التسمية |
|---------|---------|
| bank_transfer | تحويل بنكي |
| card | بطاقة ائتمانية |
| cash | نقدي |
| other | أخرى |
