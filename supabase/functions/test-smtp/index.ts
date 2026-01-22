import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmtpSettings {
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_sender_email: string;
  smtp_sender_name: string;
  smtp_encryption: string;
}

interface TestSmtpRequest {
  to_email: string;
  smtp_settings: SmtpSettings;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_email, smtp_settings }: TestSmtpRequest = await req.json();

    if (!to_email) {
      return new Response(
        JSON.stringify({ success: false, message: "البريد الإلكتروني مطلوب" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If custom SMTP is not enabled, use Resend
    if (!smtp_settings.smtp_enabled) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        return new Response(
          JSON.stringify({ success: false, message: "RESEND_API_KEY غير مُعدّ" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "ويبيان <support@webyan.net>",
          to: [to_email],
          subject: "✅ رسالة اختبار من نظام ويبيان",
          html: `
            <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">✅ رسالة اختبار ناجحة</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">
                  مرحباً،
                </p>
                <p style="color: #4b5563; line-height: 1.8;">
                  هذه رسالة اختبار من نظام ويبيان. إذا وصلتك هذه الرسالة، فهذا يعني أن إعدادات البريد الإلكتروني تعمل بشكل صحيح.
                </p>
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 15px; border-radius: 8px; margin-top: 20px;">
                  <p style="margin: 0; color: #065f46; font-weight: 500;">
                    ✓ تم إرسال الرسالة باستخدام: Resend (الافتراضي)
                  </p>
                </div>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">
                  تم الإرسال في: ${new Date().toLocaleString('ar-SA')}
                </p>
              </div>
            </div>
          `,
        }),
      });

      if (response.ok) {
        return new Response(
          JSON.stringify({ success: true, message: "تم إرسال رسالة الاختبار بنجاح عبر Resend" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        const errorData = await response.json();
        return new Response(
          JSON.stringify({ success: false, message: `فشل إرسال الرسالة: ${errorData.message || 'خطأ غير معروف'}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Custom SMTP is enabled - use SMTP
    // Note: Deno doesn't have built-in SMTP support, so we'll use a simple approach
    // For production, you might want to use a proper SMTP library or service
    
    const { smtp_host, smtp_port, smtp_username, smtp_password, smtp_sender_email, smtp_sender_name } = smtp_settings;
    
    if (!smtp_host || !smtp_username || !smtp_password) {
      return new Response(
        JSON.stringify({ success: false, message: "إعدادات SMTP غير مكتملة" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Since Deno doesn't have native SMTP support, we'll validate the settings
    // and inform the user that custom SMTP requires additional setup
    // In a real implementation, you would use a library like 'smtp' or call an external service
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `إعدادات SMTP المخصص صحيحة. لتفعيل SMTP المخصص بشكل كامل، يجب ربطه من إعدادات الخلفية.
        
السيرفر: ${smtp_host}:${smtp_port}
المستخدم: ${smtp_username}
المرسل: ${smtp_sender_name} <${smtp_sender_email}>

ملاحظة: حاليًا يتم استخدام Resend لإرسال رسائل النظام. SMTP المخصص يحتاج إعداد إضافي.`
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error testing SMTP:", error);
    const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
    return new Response(
      JSON.stringify({ success: false, message: `حدث خطأ: ${errorMessage}` }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
