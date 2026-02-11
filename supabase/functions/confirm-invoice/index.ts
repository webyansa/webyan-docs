import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, getSmtpSettings } from "../_shared/smtp-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { request_id, external_invoice_no, confirmed_by_name, invoice_file_url } = await req.json();

    if (!request_id || !external_invoice_no || !confirmed_by_name) {
      throw new Error("جميع الحقول المطلوبة يجب ملؤها");
    }

    // Find the invoice request
    const { data: invoiceRequest, error: fetchError } = await supabase
      .from('invoice_requests')
      .select('id, quote_id, organization_id, request_number, status')
      .eq('id', request_id)
      .single();

    if (fetchError || !invoiceRequest) {
      throw new Error("طلب الفاتورة غير موجود");
    }

    if (invoiceRequest.status === 'issued') {
      throw new Error("تم تأكيد هذا الطلب مسبقاً");
    }

    // Update invoice request
    const { error: updateError } = await supabase
      .from('invoice_requests')
      .update({
        status: 'issued',
        external_invoice_no,
        confirmed_by_name,
        confirmed_at: new Date().toISOString(),
        invoice_file_url: invoice_file_url || null,
        issued_at: new Date().toISOString(),
      })
      .eq('id', request_id);

    if (updateError) {
      console.error('Update invoice_requests error:', updateError);
      throw new Error("فشل تحديث طلب الفاتورة");
    }

    // Update quote invoice_status
    if (invoiceRequest.quote_id) {
      await supabase
        .from('crm_quotes')
        .update({ invoice_status: 'issued' } as any)
        .eq('id', invoiceRequest.quote_id);
    }

    // Log to timeline
    if (invoiceRequest.organization_id) {
      await supabase.from('client_timeline').insert({
        organization_id: invoiceRequest.organization_id,
        event_type: 'invoice_issued',
        title: 'تم إصدار الفاتورة',
        description: `تم تأكيد إصدار الفاتورة رقم ${external_invoice_no} بواسطة ${confirmed_by_name}`,
        reference_type: 'invoice_request',
        reference_id: request_id,
        performed_by_name: confirmed_by_name,
      });
    }

    // Get organization name for email
    let orgName = '';
    if (invoiceRequest.organization_id) {
      const { data: org } = await supabase
        .from('client_organizations')
        .select('name')
        .eq('id', invoiceRequest.organization_id)
        .single();
      orgName = org?.name || '';
    }

    // Send confirmation email to Webyan
    const settings = await getSmtpSettings();
    const webyanEmail = settings.support_email || 'support@webyan.sa';

    await sendEmail({
      to: webyanEmail,
      subject: `✅ تم إصدار فاتورة – ${orgName} – طلب ${invoiceRequest.request_number}`,
      html: `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f9fafb">
<tr><td align="center" style="padding:30px 10px;">
<table width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:600px;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
<tr><td align="center" bgcolor="#16a34a" style="padding:25px;">
<h1 style="margin:0;font-size:22px;color:#ffffff;font-family:Arial,sans-serif;">✅ تأكيد إصدار فاتورة</h1>
</td></tr>
<tr><td style="padding:25px 30px;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;">
<tr><td style="color:#6b7280;width:40%;">العميل:</td><td style="color:#1f2937;font-weight:bold;">${orgName}</td></tr>
<tr><td style="color:#6b7280;">رقم طلب الفاتورة:</td><td style="color:#1f2937;">${invoiceRequest.request_number}</td></tr>
<tr><td style="color:#6b7280;">رقم الفاتورة:</td><td style="color:#1f2937;font-weight:bold;">${external_invoice_no}</td></tr>
<tr><td style="color:#6b7280;">المحاسب:</td><td style="color:#1f2937;">${confirmed_by_name}</td></tr>
${invoice_file_url ? `<tr><td style="color:#6b7280;">ملف الفاتورة:</td><td><a href="${invoice_file_url}" style="color:#1e40af;">تحميل الملف</a></td></tr>` : ''}
</table>
</td></tr>
<tr><td align="center" bgcolor="#1e3a8a" style="padding:20px;">
<p style="margin:0;font-size:12px;color:rgba(255,255,255,0.7);font-family:Arial,sans-serif;">هذا بريد آلي من نظام ويبيان</p>
</td></tr>
</table></td></tr></table></body></html>`,
      emailType: 'invoice_confirmed',
    });

    return new Response(
      JSON.stringify({ success: true, message: "تم تأكيد إصدار الفاتورة بنجاح" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in confirm-invoice:", error);
    return new Response(
      JSON.stringify({ error: error.message || "حدث خطأ غير متوقع" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
