

# خطة: إرفاق PDF بالبريد + إصلاح رابط تأكيد الفاتورة

## المشكلة الجذرية

1. **رابط تأكيد الفاتورة لا يعمل**: الرابط يشير إلى `webyan.sa/invoice-confirm/...` لكن هذا الموقع لا يحتوي على صفحة التأكيد. التطبيق منشور على `webyan-guide-hub.lovable.app`
2. **ملف PDF لا يصل كمرفق**: حالياً يُرسل رابط تحميل فقط، والمحاسب يريد الملف جاهزاً في البريد مباشرة

---

## الحل

### 1. إرفاق ملف PDF مباشرة بالبريد الإلكتروني

**الملف:** `supabase/functions/_shared/smtp-sender.ts`

- توسيع واجهة `EmailParams` لدعم المرفقات:
```typescript
interface EmailAttachment {
  filename: string;
  content: Uint8Array; // binary data
  contentType: string;
}
interface EmailParams {
  // ... الحقول الحالية
  attachments?: EmailAttachment[];
}
```

- تحديث `sendViaResend` لإرسال المرفقات عبر Resend API (يدعمها أصلاً بصيغة base64)
- تحديث `sendViaStartTLS` و `sendViaSSL` لبناء رسالة MIME multipart تتضمن المرفقات

**الملف:** `supabase/functions/send-invoice-request/index.ts`

- عند توفر `quote_pdf_url`: جلب ملف PDF من التخزين (fetch) وتحويله إلى `Uint8Array`
- إرفاقه بالبريد كمرفق باسم ملف مثل `عرض-سعر-QT-2026-0001.pdf`
- الإبقاء على رابط التحميل في البريد كخيار إضافي

### 2. إصلاح رابط تأكيد الفاتورة

**الملف:** `src/components/crm/modals/InvoiceRequestModal.tsx`

- إرسال `window.location.origin` (عنوان التطبيق الحالي) مع طلب الفاتورة كمعامل `app_base_url`

**الملف:** `supabase/functions/send-invoice-request/index.ts`

- استخدام `app_base_url` المُرسل من العميل لبناء رابط التأكيد بدلاً من `public_base_url` (الذي يشير إلى webyan.sa)
- الرابط سيصبح: `https://webyan-guide-hub.lovable.app/invoice-confirm/{requestId}`

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التعديل |
|---|---|
| `supabase/functions/_shared/smtp-sender.ts` | دعم المرفقات في SMTP و Resend |
| `supabase/functions/send-invoice-request/index.ts` | جلب PDF وإرفاقه + إصلاح رابط التأكيد |
| `src/components/crm/modals/InvoiceRequestModal.tsx` | إرسال `app_base_url` مع الطلب |

### النشر

- إعادة نشر: `send-invoice-request`
- (smtp-sender مشترك يُستخدم تلقائياً)

### تدفق العمل بعد الإصلاح

```text
1. الموظف يطلب إصدار فاتورة
2. النظام ينشئ PDF ويرفعه للتخزين
3. النظام يجلب PDF من التخزين ويرفقه بالبريد
4. المحاسب يستلم البريد مع ملف PDF مرفق + زر تأكيد يعمل
5. المحاسب يضغط زر التأكيد -> يفتح صفحة التأكيد على الرابط الصحيح
```

