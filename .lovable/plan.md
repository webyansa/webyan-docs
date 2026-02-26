

# خطة تطوير نظام المهام الداخلية للتذاكر

## ملخص المشروع
إضافة نظام مهام فرعية (Sub-tasks / Checklist) داخل كل تذكرة دعم، بحيث يمكن تحديد مهمة واحدة أو مهام متعددة لكل تذكرة، مع تتبع حالة الإنجاز والملاحظات لكل مهمة، وعرضها في البوابات الثلاث (لوحة التحكم، بوابة الموظف، بوابة العميل).

---

## الجزء الأول: قاعدة البيانات

### جدول جديد: `ticket_tasks`

```text
ticket_tasks
├── id (uuid, PK)
├── ticket_id (uuid, FK → support_tickets.id, ON DELETE CASCADE)
├── title (text, NOT NULL) — عنوان المهمة
├── is_completed (boolean, DEFAULT false)
├── completed_by (uuid, FK → staff_members.id, nullable)
├── completed_by_name (text, nullable)
├── completed_at (timestamptz, nullable)
├── note (text, nullable) — ملاحظة الموظف المنجز
├── sort_order (integer, DEFAULT 0)
├── created_by (uuid, nullable) — من أنشأ المهمة
├── created_at (timestamptz, DEFAULT now())
├── updated_at (timestamptz, DEFAULT now())
```

### عمود جديد في `support_tickets`:
- `task_mode` (text, DEFAULT 'none') — القيم: `'none'` | `'single'` | `'multiple'`

### سياسات RLS:
- **SELECT**: المسؤولون والمحررون يرون الكل، الموظفون يرون مهام تذاكرهم، العملاء يرون مهام تذاكر منظمتهم
- **INSERT/UPDATE/DELETE**: المسؤولون والمحررون + الموظف المسند إليه التذكرة

### Realtime:
- تفعيل `ticket_tasks` في `supabase_realtime` للتحديث اللحظي

### Trigger:
- `update_updated_at_column` على `ticket_tasks` لتحديث `updated_at` تلقائياً

---

## الجزء الثاني: التغييرات في الكود

### 1. مكون مهام التذكرة المشترك (جديد)
**ملف**: `src/components/tickets/TicketTasksManager.tsx`

مكون قابل لإعادة الاستخدام في البوابات الثلاث يعرض:
- قائمة المهام مع Checkbox لكل مهمة
- شريط تقدم بصري (Progress Bar) يوضح نسبة الإنجاز
- زر إضافة مهمة جديدة (للمسؤول والموظف فقط)
- حقل ملاحظة اختياري عند تحديد المهمة كمنجزة
- اسم الموظف المنجز وتاريخ الإنجاز
- إمكانية حذف مهمة (للمسؤول فقط)
- ترتيب المهام بالسحب والإفلات (اختياري، باستخدام dnd-kit الموجود)

**الخصائص (Props)**:
```text
ticketId: string
mode: 'admin' | 'staff' | 'client'  // يتحكم بالصلاحيات المعروضة
taskMode: 'none' | 'single' | 'multiple'
onTaskModeChange?: (mode) => void  // فقط في admin
```

**سلوك العرض حسب البوابة**:
- **Admin**: إضافة/تعديل/حذف مهام + تغيير نوع المهام + إنجاز
- **Staff**: إنجاز المهام + إضافة ملاحظات
- **Client**: عرض فقط (قراءة) مع شريط التقدم

### 2. تعديل مودال إنشاء التذكرة
**ملف**: `src/components/admin/CreateTicketModal.tsx`

في الخطوة الثانية (تفاصيل التذكرة):
- إضافة حقل "نوع المهام" بثلاث خيارات:
  - بدون مهام (none)
  - مهمة واحدة (single)
  - مهام متعددة (multiple)
- عند اختيار "مهمة واحدة": يظهر حقل نصي لإدخال عنوان المهمة
- عند اختيار "مهام متعددة": يظهر حقل إدخال ديناميكي لإضافة عدة مهام مع زر "+"
- في خطوة المراجعة: عرض المهام المضافة
- عند الإرسال: إدراج التذكرة ثم إدراج المهام في `ticket_tasks`

### 3. تعديل لوحة التحكم الرئيسية (Admin)
**ملف**: `src/pages/admin/AdminTicketsPage.tsx`

- في واجهة عرض التذكرة (View Dialog): إضافة مكون `TicketTasksManager` بوضع `admin`
- عرض مؤشر تقدم المهام في قائمة التذاكر (badge صغير يوضح مثلاً "3/5 مهام")

### 4. تعديل بوابة الموظف
**ملف**: `src/pages/staff/StaffTickets.tsx`

- في واجهة عرض التذكرة: إضافة `TicketTasksManager` بوضع `staff`
- الموظف يمكنه إنجاز المهام وإضافة ملاحظات

### 5. تعديل بوابة العميل
**ملف**: `src/pages/portal/PortalTicketDetail.tsx`

- إضافة `TicketTasksManager` بوضع `client` (عرض فقط)
- عرض شريط التقدم + قائمة المهام مع حالاتها

### 6. تعديل تاب التذاكر في ملف العميل (CRM)
**ملف**: `src/components/crm/tabs/TicketsTab.tsx`

- عرض مؤشر تقدم المهام بجانب كل تذكرة

---

## الجزء الثالث: تسجيل النشاط

كل عملية على المهام تُسجل في `ticket_activity_log`:
- `task_added`: إضافة مهمة
- `task_completed`: إنجاز مهمة (مع اسم المنجز)
- `task_uncompleted`: إلغاء إنجاز مهمة
- `task_deleted`: حذف مهمة

---

## التصميم المرئي

```text
┌─────────────────────────────────────────┐
│  📋 المهام                    3/5 منجز  │
│  ████████████░░░░░░░  60%               │
│─────────────────────────────────────────│
│  ✅ إعداد بيئة التطوير                  │
│     ↳ أحمد محمد · منذ ساعتين            │
│  ✅ تثبيت الإضافات المطلوبة              │
│     ↳ أحمد محمد · منذ ساعة              │
│     💬 "تم تثبيت جميع الإضافات بنجاح"   │
│  ✅ رفع الملفات                         │
│     ↳ سارة أحمد · منذ 30 دقيقة          │
│  ☐ اختبار الموقع                        │
│  ☐ التسليم النهائي                      │
│                                         │
│  [+ إضافة مهمة]                         │
└─────────────────────────────────────────┘
```

---

## ملخص الملفات المتأثرة

| الملف | الإجراء |
|---|---|
| Migration SQL | إنشاء جدول `ticket_tasks` + عمود `task_mode` + RLS + Realtime |
| `src/components/tickets/TicketTasksManager.tsx` | **إنشاء** — مكون مشترك |
| `src/components/admin/CreateTicketModal.tsx` | **تعديل** — إضافة حقل نوع المهام وإدخال المهام |
| `src/pages/admin/AdminTicketsPage.tsx` | **تعديل** — عرض المهام داخل تفاصيل التذكرة |
| `src/pages/staff/StaffTickets.tsx` | **تعديل** — عرض وإنجاز المهام |
| `src/pages/portal/PortalTicketDetail.tsx` | **تعديل** — عرض المهام للعميل |
| `src/components/crm/tabs/TicketsTab.tsx` | **تعديل** — مؤشر تقدم |

