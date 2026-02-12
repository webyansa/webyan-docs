
# نظام الاشعارات المركزي الاحترافي للوحة التحكم

## الوضع الحالي

النظام الحالي يعمل بطريقتين منفصلتين:
- **اشعارات لحظية (Toast):** تظهر كرسائل مؤقتة عبر `useStaffNotifications` ثم تختفي -- لا يتم حفظها
- **اشعارات ثابتة (Bell):** تستخدم جدول `user_notifications` لكنها محدودة بإشعارات المقالات والتذاكر للعملاء فقط

**المشكلة:** لا يوجد مركز اشعارات ثابت ومستمر للادارة يغطي جميع الاحداث

---

## الحل المقترح

بناء نظام اشعارات مركزي متكامل يشمل:

1. **جدول جديد `admin_notifications`** لحفظ جميع الاشعارات بشكل دائم
2. **Hook جديد `useAdminNotifications`** لادارة الاشعارات مع صوت وربط فوري
3. **مكون `AdminNotificationDropdown`** في الهيدر مع قائمة منسدلة احترافية
4. **ربط تلقائي** -- كل حدث في النظام يولد اشعار محفوظ + صوت + رابط مباشر

---

## انواع الاشعارات المدعومة

| النوع | المصدر | الرابط عند الضغط |
|-------|--------|-----------------|
| تذكرة جديدة | `support_tickets` INSERT | صفحة التذكرة |
| رد على تذكرة | `ticket_replies` INSERT | صفحة التذكرة |
| انجاز تذكرة | `support_tickets` UPDATE (status=closed) | صفحة التذكرة |
| طلب اجتماع | `meeting_requests` INSERT | صفحة الاجتماعات |
| اتمام اجتماع | `meeting_requests` UPDATE (status=completed) | صفحة الاجتماعات |
| طلب عرض توضيحي | `website_form_submissions` INSERT | صفحة طلبات الموقع |
| فتح محادثة | `conversations` INSERT | صندوق الوارد |
| تحديث مشروع | `project_activity_log` INSERT | صفحة المشروع |
| مرحلة منجزة | `project_activity_log` (phase_completed) | صفحة المشروع |
| تاكيد فاتورة | `invoice_requests` UPDATE (status=issued) | صفحة عروض الاسعار |

---

## التفاصيل التقنية

### 1. جدول قاعدة البيانات `admin_notifications`

```text
admin_notifications
--------------------
id              UUID (PK)
type            TEXT (نوع الاشعار)
title           TEXT (عنوان الاشعار)
message         TEXT (وصف مختصر)
link            TEXT (رابط المصدر)
metadata        JSONB (بيانات اضافية)
is_read         BOOLEAN (default: false)
created_at      TIMESTAMPTZ
```

- تفعيل Realtime على الجدول
- سياسات RLS: القراءة والتعديل للادارة والمحررين فقط

### 2. Hook: `useAdminNotifications.ts`

- جلب الاشعارات من `admin_notifications` مرتبة بالاحدث
- اشتراك Realtime لاستقبال الاشعارات الجديدة فوريا
- تشغيل صوت تنبيه عند وصول اشعار جديد
- دوال: `markAsRead`, `markAllAsRead`, `deleteNotification`

### 3. مكون `AdminNotificationDropdown.tsx`

- ايقونة الجرس مع عداد الاشعارات غير المقروءة
- قائمة منسدلة تعرض الاشعارات مع ايقونات ملونة حسب النوع
- الضغط على اي اشعار ينقل المستخدم الى مصدر الاشعار مباشرة
- زر "قراءة الكل" وزر حذف لكل اشعار

### 4. تحديث `useStaffNotifications.tsx`

- عند اكتشاف اي حدث جديد عبر Realtime، يتم:
  - عرض Toast لحظي (كما هو حاليا)
  - حفظ الاشعار في جدول `admin_notifications` ليظهر في القائمة المنسدلة

### 5. اضافة اشعارات جديدة

- اشتراك في `support_tickets` UPDATE لاكتشاف اغلاق التذاكر
- اشتراك في `meeting_requests` UPDATE لاكتشاف اتمام الاجتماعات
- اشتراك في `invoice_requests` UPDATE لاكتشاف تاكيد الفواتير

### 6. تحديث `AdminLayout.tsx`

- اضافة `AdminNotificationDropdown` في الهيدر بجانب اشعارات المحادثات
- تفعيل `useStaffNotifications` داخل AdminLayout لضمان عمل الاشعارات

### الملفات المتاثرة

- **جديد:** `src/hooks/useAdminNotifications.ts`
- **جديد:** `src/components/layout/AdminNotificationDropdown.tsx`
- **تعديل:** `src/hooks/useStaffNotifications.tsx` (اضافة حفظ في الجدول + اشتراكات جديدة)
- **تعديل:** `src/pages/admin/AdminLayout.tsx` (اضافة المكون في الهيدر)
- **قاعدة بيانات:** انشاء جدول `admin_notifications` + RLS + Realtime
