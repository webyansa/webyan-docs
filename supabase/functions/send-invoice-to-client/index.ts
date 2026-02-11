import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/smtp-sender.ts";
import { COLORS, createEmailWrapper, createHeader, createFooter, createButton } from "../_shared/email-base.ts";

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

    const { quote_id } = await req.json();
    if (!quote_id) throw new Error("quote_id is required");

    // Get quote with account details
    const { data: quote, error: quoteError } = await supabase
      .from('crm_quotes')
      .select(`
        id, quote_number, title, total_amount,
        account:client_organizations!crm_quotes_account_id_fkey(
          id, name, contact_email, primary_contact_email, primary_contact_name
        )
      `)
      .eq('id', quote_id)
      .single();

    if (quoteError || !quote) throw new Error("عرض السعر غير موجود");

    const org = quote.account as any;
    if (!org) throw new Error("بيانات العميل غير موجودة");

    const clientEmail = org.primary_contact_email || org.contact_email;
    const clientName = org.primary_contact_name || org.name;

    if (!clientEmail) throw new Error("بريد العميل غير متوفر");

    // Build thank-you email
    const emailHtml = createEmailWrapper(`
      ${createHeader('🎉', 'شكراً لتعاملكم معنا', 'تم إصدار فاتورتكم بنجاح', COLORS.success)}
      <tr>
        <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-bottom:20px;">
                <p style="margin:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                  مرحباً <strong style="color:${COLORS.primary};">${clientName}</strong>،
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:25px;">
                <p style="margin:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                  نود إعلامكم بأنه تم إصدار الفاتورة الخاصة بكم بنجاح. نشكركم على ثقتكم بنا ونتطلع لخدمتكم دائماً.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:25px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.infoBg}" style="background-color:${COLORS.infoBg};border-radius:10px;border-right:4px solid ${COLORS.primary};">
                  <tr>
                    <td style="padding:25px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="padding-bottom:12px;">
                            <p style="margin:0;font-size:13px;color:${COLORS.textMuted};font-family:Arial,sans-serif;">رقم عرض السعر</p>
                            <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${COLORS.primary};font-family:monospace;">${quote.quote_number}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:12px 0;border-top:1px solid ${COLORS.bgGray};">
                            <p style="margin:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                              <strong>الموضوع:</strong> ${quote.title}
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top:12px;border-top:1px solid ${COLORS.bgGray};">
                            <p style="margin:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                              <strong>المبلغ الإجمالي:</strong> <span style="font-size:18px;font-weight:700;color:${COLORS.success};">${(quote.total_amount || 0).toLocaleString()} ر.س</span>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.successBg}" style="background-color:${COLORS.successBg};padding:20px;border-radius:8px;border-right:4px solid ${COLORS.success};">
                  <tr>
                    <td>
                      <p style="margin:0;font-size:15px;line-height:1.7;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                        ✅ <strong>تم استلام الدفع وإصدار الفاتورة بنجاح.</strong><br/>
                        شكراً لتعاونكم وثقتكم بخدماتنا.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="${COLORS.bgGray}" style="background-color:${COLORS.bgGray};padding:16px;border-radius:8px;">
                <p style="margin:0;font-size:13px;color:${COLORS.textMuted};text-align:center;font-family:Arial,sans-serif;">
                  لأي استفسارات، لا تتردد بالتواصل معنا على support@webyan.sa
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${createFooter()}
    `);

    const emailResult = await sendEmail({
      to: clientEmail,
      subject: `✅ فاتورتكم جاهزة – ${org.name} – عرض سعر ${quote.quote_number}`,
      html: emailHtml,
      emailType: 'invoice_sent_to_client',
    });

    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      throw new Error('فشل إرسال البريد الإلكتروني: ' + (emailResult.error || 'خطأ غير معروف'));
    }

    console.log(`Thank-you email sent to ${clientEmail} via ${emailResult.method}`);

    return new Response(
      JSON.stringify({ success: true, message: "تم إرسال الفاتورة للعميل بنجاح" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-invoice-to-client:", error);
    return new Response(
      JSON.stringify({ error: error.message || "حدث خطأ" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
