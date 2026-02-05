import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  quote_id: string;
  notes_for_accounts?: string;
  expected_payment_method?: string;
  sent_by?: string;
  is_resend?: boolean;
  resend_reason?: string;
}

const COLORS = {
  primary: '#1e40af',
  primaryDark: '#1e3a8a',
  success: '#059669',
  textDark: '#1f2937',
  textBody: '#374151',
  textMuted: '#6b7280',
  bgWhite: '#ffffff',
  bgLight: '#f9fafb',
  bgGray: '#f3f4f6',
  infoBg: '#f0f9ff',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { quote_id, notes_for_accounts, expected_payment_method, sent_by, is_resend, resend_reason } = body;

    if (!quote_id) {
      throw new Error("quote_id is required");
    }

    // Get accounts email from settings
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'accounts_email')
      .single();

    const accountsEmail = settingsData?.value;
    if (!accountsEmail) {
      throw new Error("لم يتم تعيين بريد مسؤول الحسابات في الإعدادات");
    }

    // Get quote with full details
    const { data: quote, error: quoteError } = await supabase
      .from('crm_quotes')
      .select(`
        id, quote_number, title, created_at, subtotal, 
        discount_value, discount_type, tax_rate, tax_amount, total_amount, items, document_url,
        plan:pricing_plans!crm_quotes_plan_id_fkey(name),
        account:client_organizations!crm_quotes_account_id_fkey(
          id, name, registration_number, tax_number,
          primary_contact_name, primary_contact_email, primary_contact_phone,
          contact_email, contact_phone,
          city, district, street_name, building_number, postal_code, secondary_number
        )
      `)
      .eq('id', quote_id)
      .single();

    if (quoteError || !quote) {
      throw new Error("عرض السعر غير موجود");
    }

    const org = quote.account as any;
    if (!org) {
      throw new Error("بيانات العميل غير موجودة");
    }

    // Check for existing non-issued request (if not resend)
    if (!is_resend) {
      const { data: existingRequest } = await supabase
        .from('invoice_requests')
        .select('id')
        .eq('quote_id', quote_id)
        .neq('status', 'issued')
        .maybeSingle();

      if (existingRequest) {
        throw new Error("يوجد طلب فاتورة سابق لهذا العرض. استخدم خيار إعادة الإرسال");
      }
    }

    // If resend, update existing or create new
    let requestNumber: string;
    
    if (is_resend) {
      // Delete old pending request
      await supabase
        .from('invoice_requests')
        .delete()
        .eq('quote_id', quote_id)
        .neq('status', 'issued');
    }

    // Create new invoice request
    const { data: newRequest, error: insertError } = await supabase
      .from('invoice_requests')
      .insert({
        quote_id,
        organization_id: org.id,
        status: 'sent',
        sent_by,
        notes_for_accounts,
        expected_payment_method,
        resend_reason: is_resend ? resend_reason : null,
      })
      .select('request_number')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error("فشل في إنشاء طلب الفاتورة");
    }

    requestNumber = newRequest.request_number;

    // Calculate financial values
    const subtotal = quote.subtotal || 0;
    const discountValue = quote.discount_value || 0;
    const discountType = quote.discount_type || 'fixed';
    const discountAmount = discountType === 'percentage' 
      ? (subtotal * discountValue / 100) 
      : discountValue;
    const afterDiscount = subtotal - discountAmount;
    const taxRate = quote.tax_rate || 15;
    const taxAmount = quote.tax_amount || (afterDiscount * taxRate / 100);
    const totalAmount = quote.total_amount || (afterDiscount + taxAmount);

    // Get base URL
    const { data: baseUrlSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'public_base_url')
      .single();
    
    const baseUrl = baseUrlSetting?.value || 'https://docs.webyan.net';
    const quoteUrl = `${baseUrl}/admin/crm/quotes/${quote_id}`;

    // Build invoice description
    const planName = (quote.plan as any)?.name;
    let description = quote.title;
    if (planName) description += ` | خطة: ${planName}`;

    // Format payment method
    const paymentMethodLabels: Record<string, string> = {
      bank_transfer: 'تحويل بنكي',
      cash: 'نقدي',
      check: 'شيك',
      credit_card: 'بطاقة ائتمان',
    };

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bgLight};">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.bgLight}">
    <tr>
      <td align="center" style="padding:30px 10px;">
        <table width="650" cellpadding="0" cellspacing="0" bgcolor="${COLORS.bgWhite}" style="max-width:650px;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td align="center" bgcolor="${COLORS.primary}" style="padding:30px;background-color:${COLORS.primary};">
              <h1 style="margin:0;font-size:24px;color:#ffffff;font-family:Arial,sans-serif;">🧾 طلب إصدار فاتورة</h1>
              <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.9);font-family:Arial,sans-serif;">
                عرض سعر رقم: ${quote.quote_number}
              </p>
            </td>
          </tr>

          <!-- Client Info -->
          <tr>
            <td style="padding:25px 30px 15px;">
              <h2 style="margin:0 0 15px;font-size:16px;color:${COLORS.primary};font-family:Arial,sans-serif;border-bottom:2px solid ${COLORS.primary};padding-bottom:8px;">
                📋 بيانات العميل
              </h2>
              <table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;font-family:Arial,sans-serif;">
                <tr>
                  <td style="color:${COLORS.textMuted};width:35%;">اسم الجهة:</td>
                  <td style="color:${COLORS.textDark};font-weight:bold;">${org.name}</td>
                </tr>
                <tr>
                  <td style="color:${COLORS.textMuted};">رقم السجل التجاري:</td>
                  <td style="color:${COLORS.textDark};">${org.registration_number || '-'}</td>
                </tr>
                <tr>
                  <td style="color:${COLORS.textMuted};">الرقم الضريبي:</td>
                  <td style="color:${COLORS.textDark};">${org.tax_number || '-'}</td>
                </tr>
                <tr>
                  <td style="color:${COLORS.textMuted};">جهة الاتصال:</td>
                  <td style="color:${COLORS.textDark};">${org.primary_contact_name || '-'}</td>
                </tr>
                <tr>
                  <td style="color:${COLORS.textMuted};">البريد الإلكتروني:</td>
                  <td style="color:${COLORS.textDark};">${org.primary_contact_email || org.contact_email}</td>
                </tr>
                <tr>
                  <td style="color:${COLORS.textMuted};">رقم الجوال:</td>
                  <td style="color:${COLORS.textDark};">${org.primary_contact_phone || org.contact_phone || '-'}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- National Address -->
          <tr>
            <td style="padding:15px 30px;">
              <h2 style="margin:0 0 15px;font-size:16px;color:${COLORS.primary};font-family:Arial,sans-serif;border-bottom:2px solid ${COLORS.primary};padding-bottom:8px;">
                📍 العنوان الوطني
              </h2>
              <table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;font-family:Arial,sans-serif;">
                <tr>
                  <td style="color:${COLORS.textMuted};width:35%;">المدينة:</td>
                  <td style="color:${COLORS.textDark};">${org.city || '-'}</td>
                </tr>
                <tr>
                  <td style="color:${COLORS.textMuted};">الحي:</td>
                  <td style="color:${COLORS.textDark};">${org.district || '-'}</td>
                </tr>
                <tr>
                  <td style="color:${COLORS.textMuted};">الشارع:</td>
                  <td style="color:${COLORS.textDark};">${org.street_name || '-'}</td>
                </tr>
                <tr>
                  <td style="color:${COLORS.textMuted};">رقم المبنى:</td>
                  <td style="color:${COLORS.textDark};">${org.building_number || '-'}</td>
                </tr>
                <tr>
                  <td style="color:${COLORS.textMuted};">الرمز البريدي:</td>
                  <td style="color:${COLORS.textDark};">${org.postal_code || '-'}</td>
                </tr>
                <tr>
                  <td style="color:${COLORS.textMuted};">الرقم الإضافي:</td>
                  <td style="color:${COLORS.textDark};">${org.secondary_number || '-'}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Invoice Details -->
          <tr>
            <td style="padding:15px 30px;">
              <h2 style="margin:0 0 15px;font-size:16px;color:${COLORS.primary};font-family:Arial,sans-serif;border-bottom:2px solid ${COLORS.primary};padding-bottom:8px;">
                💰 تفاصيل الفاتورة
              </h2>
              <table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;font-family:Arial,sans-serif;">
                <tr>
                  <td style="color:${COLORS.textMuted};width:35%;">رقم عرض السعر:</td>
                  <td style="color:${COLORS.textDark};font-weight:bold;">${quote.quote_number}</td>
                </tr>
                <tr>
                  <td style="color:${COLORS.textMuted};">تاريخ العرض:</td>
                  <td style="color:${COLORS.textDark};">${new Date(quote.created_at).toLocaleDateString('ar-SA')}</td>
                </tr>
                <tr>
                  <td style="color:${COLORS.textMuted};">الوصف:</td>
                  <td style="color:${COLORS.textDark};">${description}</td>
                </tr>
              </table>
              
              <!-- Financial Summary -->
              <table width="100%" cellpadding="12" cellspacing="0" style="font-size:14px;font-family:Arial,sans-serif;margin-top:15px;background-color:${COLORS.bgGray};border-radius:8px;">
                <tr>
                  <td style="color:${COLORS.textMuted};">المبلغ قبل الضريبة:</td>
                  <td style="color:${COLORS.textDark};text-align:left;">${subtotal.toLocaleString()} ر.س</td>
                </tr>
                ${discountAmount > 0 ? `
                <tr>
                  <td style="color:#dc2626;">الخصم ${discountType === 'percentage' ? `(${discountValue}%)` : ''}:</td>
                  <td style="color:#dc2626;text-align:left;">- ${discountAmount.toLocaleString()} ر.س</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="color:${COLORS.textMuted};">ضريبة القيمة المضافة (${taxRate}%):</td>
                  <td style="color:${COLORS.textDark};text-align:left;">${taxAmount.toLocaleString()} ر.س</td>
                </tr>
                <tr style="border-top:2px solid #d1d5db;">
                  <td style="color:${COLORS.textDark};font-weight:bold;font-size:16px;">الإجمالي المطلوب:</td>
                  <td style="color:${COLORS.primary};font-weight:bold;font-size:18px;text-align:left;">${totalAmount.toLocaleString()} ر.س</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Additional Notes -->
          ${(expected_payment_method || notes_for_accounts) ? `
          <tr>
            <td style="padding:15px 30px;">
              <h2 style="margin:0 0 15px;font-size:16px;color:${COLORS.primary};font-family:Arial,sans-serif;border-bottom:2px solid ${COLORS.primary};padding-bottom:8px;">
                📝 ملاحظات إضافية
              </h2>
              <table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;font-family:Arial,sans-serif;">
                ${expected_payment_method ? `
                <tr>
                  <td style="color:${COLORS.textMuted};width:35%;">طريقة السداد المتوقعة:</td>
                  <td style="color:${COLORS.textDark};">${paymentMethodLabels[expected_payment_method] || expected_payment_method}</td>
                </tr>
                ` : ''}
                ${notes_for_accounts ? `
                <tr>
                  <td style="color:${COLORS.textMuted};vertical-align:top;">ملاحظات:</td>
                  <td style="color:${COLORS.textDark};">${notes_for_accounts}</td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Resend Reason -->
          ${is_resend && resend_reason ? `
          <tr>
            <td style="padding:15px 30px;">
              <table width="100%" cellpadding="15" cellspacing="0" style="background-color:#fef3c7;border-radius:8px;border-right:4px solid #f59e0b;">
                <tr>
                  <td>
                    <p style="margin:0 0 5px;font-size:13px;color:#92400e;font-weight:bold;font-family:Arial,sans-serif;">⚠️ سبب إعادة الإرسال:</p>
                    <p style="margin:0;font-size:14px;color:#78350f;font-family:Arial,sans-serif;">${resend_reason}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Actions -->
          <tr>
            <td align="center" style="padding:25px 30px;">
              <a href="${quoteUrl}" target="_blank" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:bold;color:#ffffff;background-color:${COLORS.primary};text-decoration:none;border-radius:8px;font-family:Arial,sans-serif;">
                🔗 فتح عرض السعر في النظام
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" bgcolor="${COLORS.primaryDark}" style="padding:25px;background-color:${COLORS.primaryDark};">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.8);font-family:Arial,sans-serif;">
                رقم طلب الفاتورة: <strong>${requestNumber}</strong>
              </p>
              <p style="margin:10px 0 0;font-size:12px;color:rgba(255,255,255,0.6);font-family:Arial,sans-serif;">
                هذا بريد آلي من نظام ويبيان
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email via Resend
    if (resendApiKey) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Webyan <support@webyan.net>",
          to: [accountsEmail],
          subject: `طلب إصدار فاتورة – ${org.name} – عرض سعر ${quote.quote_number}`,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error("Resend error:", errorText);
        // Don't throw - the request was created, just email failed
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        request_number: requestNumber,
        message: "تم إرسال طلب الفاتورة بنجاح" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-invoice-request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "حدث خطأ غير متوقع" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
