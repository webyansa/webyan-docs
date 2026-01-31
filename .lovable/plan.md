
# إصلاح عدم ظهور عروض الأسعار في صفحة "عروض الأسعار"

## المشكلة
عند إنشاء عرض سعر من صفحة الفرص (Kanban)، يتم حفظ العرض في قاعدة البيانات بشكل صحيح (تأكدت من وجود 3 عروض)، لكن صفحة "عروض الأسعار" لا تعرضها.

## السبب الجذري
خطأ في صياغة استعلام Supabase PostgREST في ملف `QuotesPage.tsx`. الاستعلام الحالي يستخدم:
```javascript
account:account_id (id, name),
opportunity:opportunity_id (id, name, ...)
```

هذه الصياغة خاطئة! Supabase يتطلب تحديد اسم قيد المفتاح الأجنبي (FK constraint) بشكل صريح عند استخدام alias مع جداول مختلفة.

## الصياغة الصحيحة
```javascript
account:client_organizations!crm_quotes_account_id_fkey(id, name),
opportunity:crm_opportunities!crm_quotes_opportunity_id_fkey(id, name, ...)
```

## الملفات المطلوب تعديلها

### 1. `src/pages/admin/crm/QuotesPage.tsx`
تعديل استعلام الجلب ليستخدم صياغة FK الصحيحة:

**من:**
```typescript
.select(`
  id, quote_number, title, quote_type, billing_cycle,
  subtotal, total_amount, status, valid_until, sent_at, created_at,
  account:account_id (id, name),
  opportunity:opportunity_id (id, name, stage, expected_value, account_id)
`)
```

**إلى:**
```typescript
.select(`
  id, quote_number, title, quote_type, billing_cycle,
  subtotal, total_amount, status, valid_until, sent_at, created_at,
  account:client_organizations!crm_quotes_account_id_fkey(id, name),
  opportunity:crm_opportunities!crm_quotes_opportunity_id_fkey(id, name, stage, expected_value, account_id)
`)
```

### 2. `src/pages/admin/crm/QuoteDetailsPage.tsx`
نفس الإصلاح لاستعلام جلب تفاصيل العرض:

**من:**
```typescript
.select(`*, account:account_id (*), opportunity:opportunity_id (*)...`)
```

**إلى:**
```typescript
.select(`*,
  account:client_organizations!crm_quotes_account_id_fkey(*),
  opportunity:crm_opportunities!crm_quotes_opportunity_id_fkey(*)...`)
```

### 3. تحسينات إضافية للترابط

**إضافة إعادة تحميل البيانات (Refresh) بعد إنشاء العرض:**

في `DealsPage.tsx` - عند نجاح إنشاء العرض، يجب إبطال كاش React Query لصفحة عروض الأسعار:

```typescript
import { useQueryClient } from '@tanstack/react-query';

// عند نجاح إنشاء العرض
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['crm-quotes'] });
```

**إضافة رابط مباشر للعرض بعد الإنشاء:**

عند إنشاء عرض سعر من الفرصة، إظهار toast مع رابط لفتح العرض مباشرة:
```typescript
toast.success(
  <div>
    <span>تم إنشاء عرض السعر بنجاح</span>
    <Button onClick={() => navigate(`/admin/crm/quotes/${quote.id}`)}>
      فتح العرض
    </Button>
  </div>
);
```

## ترتيب التنفيذ

1. إصلاح استعلام `QuotesPage.tsx` (FK syntax)
2. إصلاح استعلام `QuoteDetailsPage.tsx` (FK syntax)
3. إضافة invalidateQueries في `AdvancedQuoteModal.tsx`
4. إضافة رابط مباشر للعرض في toast بعد الإنشاء

## النتيجة المتوقعة

- عروض الأسعار تظهر فوراً في صفحة "عروض الأسعار" بعد إنشائها
- يمكن فتح تفاصيل العرض مباشرة بعد الإنشاء
- تحديث تلقائي للبيانات عبر React Query cache invalidation
- ترابط كامل بين الفرص وعروض الأسعار
