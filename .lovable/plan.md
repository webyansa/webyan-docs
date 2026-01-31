

## خطة تطوير نظام تشغيل وتنفيذ المشاريع (Project Operations System)

---

### نظرة عامة على النظام

سيتم تحويل النظام الحالي من إدارة علاقات العملاء البسيطة إلى نظام تشغيلي متكامل يُحاكي أفضل أنظمة SaaS العالمية. النظام سيربط بين مراحل ما قبل البيع (CRM) ومراحل التنفيذ والتسليم بشكل سلس.

---

### المكونات الرئيسية

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    رحلة العميل في النظام                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  عميل محتمل → فرصة → عرض سعر → اعتماد                              │
│                           ↓                                         │
│                    توثيق العقد (خارجي)                              │
│                           ↓                                         │
│                    إنشاء مشروع تلقائي                               │
│                           ↓                                         │
│             تعيين الفريق (منفذ + مدير نجاح)                         │
│                           ↓                                         │
│        مراحل التنفيذ: بداية → تطوير → مراجعة → تسليم                │
│                           ↓                                         │
│                 إغلاق وتسجيل الإنجاز                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### الجزء الأول: توثيق العقد (Contract Documentation)

#### الوصف الوظيفي
بعد اعتماد عرض السعر، ينتقل النظام إلى مرحلة "توثيق العقد" حيث لا يتم إنشاء عقد داخلي، بل يتم فقط توثيق حالة العقد الخارجي.

#### الجدول المطلوب: `contract_documentation`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID | المعرف |
| quote_id | UUID FK | عرض السعر المرتبط |
| opportunity_id | UUID FK | الفرصة المرتبطة |
| account_id | UUID FK | العميل |
| status | ENUM | قيد الإعداد / تم التوقيع |
| signed_date | DATE | تاريخ التوقيع |
| notes | TEXT | ملاحظات اختيارية |
| contract_type | TEXT | نوع العقد |
| created_by | UUID FK | منشئ التوثيق |

#### حالات توثيق العقد
- `preparing` - قيد الإعداد
- `signed` - تم التوقيع

#### الواجهة
- زر "توثيق العقد" يظهر بعد اعتماد عرض السعر
- نموذج بسيط لتسجيل حالة العقد
- عند اختيار "تم التوقيع" ← إنشاء مشروع تلقائي

---

### الجزء الثاني: نظام المشاريع المتقدم

#### تحديث جدول `crm_implementations`

إضافة الأعمدة التالية:

| العمود | النوع | الوصف |
|--------|-------|-------|
| quote_id | UUID FK | عرض السعر المصدر |
| contract_doc_id | UUID FK | توثيق العقد |
| received_date | DATE | تاريخ استلام المشروع |
| expected_delivery_date | DATE | تاريخ التسليم المتوقع |
| current_phase_id | UUID FK | المرحلة الحالية |
| priority | TEXT | الأولوية |

#### جدول مراحل المشروع: `project_phases`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID | المعرف |
| project_id | UUID FK | المشروع |
| phase_type | ENUM | نوع المرحلة |
| status | ENUM | قيد التنفيذ / مكتمل |
| started_at | TIMESTAMP | وقت البدء |
| completed_at | TIMESTAMP | وقت الإنهاء |
| completed_by | UUID FK | منفذ الإنهاء |
| notes | TEXT | ملاحظات |
| order | INT | الترتيب |

#### مراحل المشروع الثابتة
1. **بدء التنفيذ** (kickoff)
2. **إعداد البيئة** (setup)
3. **تجهيز المحتوى** (content)
4. **المراجعة والاختبار** (review)
5. **التسليم** (delivery)
6. **الإغلاق** (closure)

---

### الجزء الثالث: فريق المشروع

#### جدول أعضاء فريق المشروع: `project_team_members`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID | المعرف |
| project_id | UUID FK | المشروع |
| staff_id | UUID FK | الموظف |
| role | ENUM | الدور |
| assigned_at | TIMESTAMP | وقت التعيين |
| assigned_by | UUID FK | من عيّنه |
| is_active | BOOLEAN | نشط |

#### الأدوار المتاحة
- `implementer` - موظف التنفيذ
- `csm` - مدير نجاح العميل
- `project_manager` - مدير المشروع

#### إشعارات التعيين
عند تعيين موظف:
- إشعار داخلي فوري (toast notification)
- إشعار متصفح (browser notification)
- تسجيل في سجل النشاط

---

### الجزء الرابع: نظام السبرنتات

#### جدول السبرنتات: `project_sprints`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID | المعرف |
| project_id | UUID FK | المشروع |
| name | TEXT | اسم السبرنت |
| start_date | DATE | تاريخ البدء |
| end_date | DATE | تاريخ النهاية |
| status | ENUM | الحالة |
| goals | TEXT | الأهداف |
| created_by | UUID FK | منشئ السبرنت |

#### جدول مهام السبرنت: `sprint_tasks`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID | المعرف |
| sprint_id | UUID FK | السبرنت |
| title | TEXT | عنوان المهمة |
| description | TEXT | الوصف |
| status | ENUM | todo / in_progress / done |
| assigned_to | UUID FK | المكلف |
| priority | TEXT | الأولوية |
| due_date | DATE | الموعد النهائي |

---

### الجزء الخامس: تتبع إنجازات الموظفين

#### جدول إنجازات الموظفين: `staff_project_history`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID | المعرف |
| staff_id | UUID FK | الموظف |
| project_id | UUID FK | المشروع |
| role | TEXT | الدور في المشروع |
| joined_at | TIMESTAMP | تاريخ الانضمام |
| completed_at | TIMESTAMP | تاريخ الإكمال |
| performance_notes | TEXT | ملاحظات الأداء |

#### عرض في ملف الموظف
- عدد المشاريع المكتملة
- المشاريع الجارية
- توزيع الأدوار (منفذ / مدير نجاح)

---

### الجزء السادس: لوحة التحكم التشغيلية

#### المكونات

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    لوحة متابعة المشاريع                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │ جارية   │ │ متأخرة  │ │ مكتملة  │ │ معلقة   │                   │
│  │   12    │ │    3    │ │   45    │ │    2    │                   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                   │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                  توزيع المشاريع على الموظفين                   │ │
│  │  محمد: ████████░░ 8 مشاريع                                    │ │
│  │  أحمد: ██████░░░░ 6 مشاريع                                    │ │
│  │  سارة: ████░░░░░░ 4 مشاريع                                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                     المشاريع حسب المرحلة                       │ │
│  │  بدء التنفيذ ████                                              │ │
│  │  إعداد البيئة ██████                                           │ │
│  │  المراجعة    ████████                                          │ │
│  │  التسليم     ██                                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### الجزء السابع: الصفحات والمسارات الجديدة

| المسار | الصفحة | الوصف |
|--------|--------|-------|
| `/admin/operations` | OperationsDashboardPage | لوحة التحكم التشغيلية |
| `/admin/projects` | ProjectsPage | قائمة المشاريع |
| `/admin/projects/:id` | ProjectDetailsPage | تفاصيل المشروع |
| `/admin/projects/:id/sprints` | ProjectSprintsPage | سبرنتات المشروع |

---

### التفاصيل التقنية

#### 1. Migration SQL للجداول الجديدة

```sql
-- جدول توثيق العقود
CREATE TABLE contract_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES crm_quotes(id),
  opportunity_id UUID REFERENCES crm_opportunities(id),
  account_id UUID NOT NULL REFERENCES client_organizations(id),
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing', 'signed')),
  signed_date DATE,
  notes TEXT,
  contract_type TEXT,
  created_by UUID REFERENCES staff_members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول مراحل المشروع
CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crm_implementations(id) ON DELETE CASCADE,
  phase_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES staff_members(id),
  notes TEXT,
  phase_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول فريق المشروع
CREATE TABLE project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crm_implementations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_members(id),
  role TEXT NOT NULL CHECK (role IN ('implementer', 'csm', 'project_manager')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES staff_members(id),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(project_id, staff_id, role)
);

-- جدول السبرنتات
CREATE TABLE project_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crm_implementations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  goals TEXT,
  created_by UUID REFERENCES staff_members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول مهام السبرنت
CREATE TABLE sprint_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES project_sprints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  assigned_to UUID REFERENCES staff_members(id),
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول تاريخ مشاريع الموظفين
CREATE TABLE staff_project_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id),
  project_id UUID NOT NULL REFERENCES crm_implementations(id),
  role TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  performance_notes TEXT,
  UNIQUE(staff_id, project_id, role)
);
```

#### 2. تحديث جدول crm_implementations

```sql
ALTER TABLE crm_implementations
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES crm_quotes(id),
ADD COLUMN IF NOT EXISTS contract_doc_id UUID REFERENCES contract_documentation(id),
ADD COLUMN IF NOT EXISTS received_date DATE,
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS current_phase_id UUID,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
```

#### 3. Triggers للأتمتة

- **Trigger إنشاء مشروع عند توقيع العقد**
- **Trigger إنشاء مراحل المشروع الافتراضية**
- **Trigger تسجيل تاريخ الموظف عند إغلاق المشروع**
- **Trigger إشعار عند بدء سبرنت جديد**

#### 4. RLS Policies

- السماح للموظفين بعرض المشاريع المسندة إليهم
- السماح للإدارة بإدارة جميع المشاريع
- السماح بتحديث مراحل المشاريع المسندة

---

### الملفات المطلوب إنشاؤها/تعديلها

#### ملفات جديدة:
1. `src/pages/admin/operations/OperationsDashboardPage.tsx`
2. `src/pages/admin/operations/ProjectsPage.tsx`
3. `src/pages/admin/operations/ProjectDetailsPage.tsx`
4. `src/pages/admin/operations/ProjectSprintsPage.tsx`
5. `src/components/operations/ContractDocumentationModal.tsx`
6. `src/components/operations/TeamAssignmentModal.tsx`
7. `src/components/operations/PhaseProgressCard.tsx`
8. `src/components/operations/SprintBoard.tsx`
9. `src/components/operations/StaffProjectStats.tsx`
10. `src/lib/operations/projectConfig.ts`
11. `src/hooks/useProjectNotifications.ts`

#### ملفات للتعديل:
1. `src/pages/admin/crm/QuoteDetailsPage.tsx` - إضافة زر توثيق العقد
2. `src/pages/admin/AdminLayout.tsx` - إضافة قسم العمليات
3. `src/lib/crm/pipelineConfig.ts` - تحديث مراحل المشاريع
4. `src/App.tsx` - إضافة المسارات الجديدة
5. `src/hooks/useStaffNotifications.tsx` - إضافة إشعارات المشاريع

---

### تسلسل التنفيذ

| المرحلة | المهام | الأولوية |
|---------|--------|----------|
| 1 | إنشاء جداول قاعدة البيانات | عالية |
| 2 | بناء واجهة توثيق العقد | عالية |
| 3 | تطوير صفحة تفاصيل المشروع | عالية |
| 4 | نظام تعيين الفريق والإشعارات | عالية |
| 5 | نظام مراحل المشروع | عالية |
| 6 | نظام السبرنتات | متوسطة |
| 7 | لوحة التحكم التشغيلية | متوسطة |
| 8 | تتبع إنجازات الموظفين | متوسطة |
| 9 | الاختبار والتحسين | عالية |

---

### النتيجة المتوقعة

نظام تشغيلي متكامل يعكس:
- تدفق عمل واضح من البيع إلى التسليم
- رؤية شاملة لحالة جميع المشاريع
- إشعارات فورية لفريق العمل
- تتبع أداء الموظفين
- تجربة مستخدم احترافية تُحاكي أفضل أنظمة SaaS العالمية

