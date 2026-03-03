

# خطة تطوير نظام التسويق داخل بوابة الموظف

## ملخص
إضافة صلاحية `can_manage_marketing` للموظفين، وإضافة حقلي `designer_id` و `publisher_id` لجدول `content_calendar`، وتحديث حالات المنشور، وبناء صفحة مهام التسويق في بوابة الموظف.

---

## المهام

### 1. Database Migration

```sql
-- إضافة صلاحية التسويق
ALTER TABLE public.staff_members 
  ADD COLUMN can_manage_marketing BOOLEAN NOT NULL DEFAULT false;

-- إضافة حقلي الإسناد
ALTER TABLE public.content_calendar 
  ADD COLUMN designer_id UUID REFERENCES public.staff_members(id),
  ADD COLUMN publisher_id UUID REFERENCES public.staff_members(id);

-- تحديث حالات المنشور (إزالة القيد القديم إن وجد وإضافة الجديد)
-- الحالات: draft, waiting_design, in_design, design_done, ready, published

-- RLS: السماح للموظف التسويقي بقراءة وتحديث المنشورات المسندة إليه
CREATE POLICY "Marketing staff can view assigned content"
  ON public.content_calendar FOR SELECT TO authenticated
  USING (
    designer_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid())
    OR publisher_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid())
    OR public.is_admin_or_editor(auth.uid())
  );

CREATE POLICY "Marketing staff can update assigned content"
  ON public.content_calendar FOR UPDATE TO authenticated
  USING (
    designer_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid())
    OR publisher_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid())
  );
```

تحديث `get_staff_permissions` RPC لإرجاع `can_manage_marketing`.

### 2. تحديث useStaffAuth Hook

- إضافة `canManageMarketing: boolean` في `StaffPermissions` interface
- تمريرها من نتيجة RPC

### 3. تحديث StaffLayout (Sidebar)

- إضافة nav item: "إدارة التسويق" → `/support/marketing` بصلاحية `canManageMarketing`
- عرض شارة "التسويق الإلكتروني" في قسم صلاحياتي

### 4. تحديث StaffPage (إدارة الموظفين - Admin)

- إضافة `can_manage_marketing` كـ Switch في نموذج إنشاء/تعديل الموظف
- إضافة شارة "التسويق" في جدول الموظفين
- تحديث `getPermissionsForStaffRole` ليشمل الصلاحية

### 5. تحديث ContentCalendarPage (Admin)

- إضافة قسم "إسناد التنفيذ" في نموذج المحتوى:
  - Dropdown "مسؤول التصميم" (موظفون بصلاحية `can_manage_marketing`)
  - Dropdown "مسؤول النشر" (موظفون بصلاحية `can_manage_marketing`)
- تحديث `statusLabels` و `statusColors` للحالات الجديدة:
  - `draft` → مسودة
  - `waiting_design` → بانتظار التصميم  
  - `in_design` → قيد التصميم
  - `design_done` → تم التصميم
  - `ready` → جاهز للنشر
  - `published` → تم النشر
- تحديث Kanban columns

### 6. صفحة StaffMarketing (بوابة الموظف) — جديدة

`src/pages/staff/StaffMarketing.tsx`

- 3 بطاقات إحصائية: قيد التنفيذ، بانتظار النشر، تم النشر
- تبويب "مهام التصميم": المنشورات حيث `designer_id = staffId`
  - أزرار تغيير الحالة: بانتظار التصميم → قيد التصميم → تم التصميم
  - حقل رابط التصميم (الموجود مسبقاً `design_file_url`)
- تبويب "مهام النشر": المنشورات حيث `publisher_id = staffId` والحالة `design_done`+
  - زر تغيير الحالة إلى "تم النشر"
- **القيود المطبقة:**
  - لا يمكن "تم النشر" إلا من حالة "تم التصميم" أو "جاهز للنشر"
  - لا يمكن بدء التصميم بدون تعيين مسؤول تصميم

### 7. Routes

إضافة في `App.tsx`:
```
<Route path="marketing" element={<StaffMarketing />} />
```

---

## الملفات المتأثرة

| الملف | الإجراء |
|---|---|
| DB Migration | أعمدة جديدة + RLS + تحديث RPC |
| `src/hooks/useStaffAuth.tsx` | إضافة `canManageMarketing` |
| `src/pages/staff/StaffLayout.tsx` | رابط التسويق + شارة الصلاحية |
| `src/pages/staff/StaffMarketing.tsx` | **إنشاء جديد** |
| `src/pages/admin/StaffPage.tsx` | Switch صلاحية التسويق |
| `src/pages/admin/marketing/ContentCalendarPage.tsx` | حقول الإسناد + حالات جديدة |
| `src/App.tsx` | Route جديد |

