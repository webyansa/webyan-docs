

# خطة تحسين عرض وتعديل التذاكر في لوحة التحكم وبوابة الموظف

## المشاكل المكتشفة

1. **TicketTasksManager يستخدم `useAuth` فقط** — في بوابة الموظف يُستخدم `useStaffAuth` وليس `useAuth`، لذا `user` يعود `null` من `useAuth` ← `getStaffInfo` لا تعمل ← المهام لا تظهر بسبب فشل الاستعلام
2. **Admin View Dialog لا يعرض المهام دائماً** — الشرط في السطر 1123 يشترط `task_mode !== 'none'` مما يمنع عرض المهام عند عدم تحديد نوع المهام
3. **Admin View Dialog لا يعرض معلومات العميل والموقع** — لا يوجد عرض للمنظمة أو رابط الموقع
4. **Edit Dialog** — يعمل تقنياً لكن ينقصه التصميم الاحترافي

---

## التغييرات المطلوبة

### 1. إصلاح `TicketTasksManager.tsx` — دعم auth مزدوج
- إضافة prop اختياري `staffUser` لتمرير بيانات المستخدم من بوابة الموظف
- تعديل `getStaffInfo` للاستفادة من `staffUser` عندما يكون `useAuth().user` فارغاً
- إزالة شرط `taskMode === 'none'` للعرض — عرض المكون دائماً مع رسالة "لا توجد مهام" إذا كانت فارغة

### 2. تحسين `StaffTickets.tsx` — تمرير بيانات المستخدم
- تمرير `user` من `useStaffAuth` إلى `TicketTasksManager` عبر prop جديد `staffUser`
- تحسين تصميم Dialog التذكرة بعرض أوضح للعميل والموقع والمهام

### 3. تحسين `AdminTicketsPage.tsx`
- **View Dialog**: إضافة معلومات المنظمة/العميل والموقع + عرض المهام دائماً (إزالة شرط `task_mode !== 'none'`)
- **Edit Dialog**: تحسين التصميم مع عرض أفضل ومعلومات أكثر
- جلب `task_mode` ضمن استعلام التذاكر لضمان توفره

### 4. تحسينات التصميم المشتركة
- Admin View: إضافة بطاقة معلومات العميل (اسم المنظمة + رابط الموقع)
- تصميم أكثر تنظيماً مع أقسام واضحة (معلومات → مهام → محادثة → رد)
- Admin Edit: تصميم أكثر احترافية مع عرض الحالة الحالية

---

## الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/components/tickets/TicketTasksManager.tsx` | إضافة `staffUser` prop + إصلاح auth |
| `src/pages/staff/StaffTickets.tsx` | تمرير `staffUser` + تحسين التصميم |
| `src/pages/admin/AdminTicketsPage.tsx` | إصلاح View/Edit dialogs + عرض المهام دائماً |

