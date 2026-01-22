import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

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
    const { smtp_host, smtp_port, smtp_username, smtp_password, smtp_sender_email, smtp_sender_name, smtp_encryption } = smtp_settings;
    
    if (!smtp_host || !smtp_username || !smtp_password) {
      return new Response(
        JSON.stringify({ success: false, message: "إعدادات SMTP غير مكتملة" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Attempting SMTP connection to ${smtp_host}:${smtp_port} with encryption: ${smtp_encryption}`);

    const client = new SmtpClient();
    const port = parseInt(smtp_port, 10);

    try {
      // Connect based on encryption type
      if (smtp_encryption === 'ssl' || port === 465) {
        await client.connectTLS({
          hostname: smtp_host,
          port: port,
          username: smtp_username,
          password: smtp_password,
        });
      } else if (smtp_encryption === 'tls' || port === 587) {
        await client.connect({
          hostname: smtp_host,
          port: port,
          username: smtp_username,
          password: smtp_password,
        });
      } else {
        // No encryption
        await client.connect({
          hostname: smtp_host,
          port: port,
          username: smtp_username,
          password: smtp_password,
        });
      }

      console.log("SMTP connected successfully");

      // Send test email
      await client.send({
        from: `${smtp_sender_name} <${smtp_sender_email}>`,
        to: to_email,
        subject: "✅ رسالة اختبار SMTP من نظام ويبيان",
        content: "text/html",
        html: `
          <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">✅ رسالة اختبار SMTP ناجحة</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">
                مرحباً،
              </p>
              <p style="color: #4b5563; line-height: 1.8;">
                هذه رسالة اختبار من نظام ويبيان. إذا وصلتك هذه الرسالة، فهذا يعني أن إعدادات SMTP المخصص تعمل بشكل صحيح.
              </p>
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <p style="margin: 0; color: #065f46; font-weight: 500;">
                  ✓ تم إرسال الرسالة باستخدام: SMTP المخصص
                </p>
                <p style="margin: 5px 0 0 0; color: #047857; font-size: 14px;">
                  السيرفر: ${smtp_host}:${smtp_port}
                </p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">
                تم الإرسال في: ${new Date().toLocaleString('ar-SA')}
              </p>
            </div>
          </div>
        `,
      });

      console.log("Email sent successfully");

      await client.close();

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `تم إرسال رسالة الاختبار بنجاح عبر SMTP المخصص (${smtp_host}:${smtp_port})`
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } catch (smtpError: unknown) {
      console.error("SMTP Error:", smtpError);
      
      try {
        await client.close();
      } catch {
        // Ignore close errors
      }

      const errorMessage = smtpError instanceof Error ? smtpError.message : String(smtpError);
      
      // Provide helpful error messages
      let userMessage = `فشل الاتصال بـ SMTP: ${errorMessage}`;
      
      if (errorMessage.includes("Connection refused") || errorMessage.includes("connect")) {
        userMessage = `فشل الاتصال بالسيرفر ${smtp_host}:${smtp_port}. تأكد من صحة اسم السيرفر والمنفذ.`;
      } else if (errorMessage.includes("authentication") || errorMessage.includes("AUTH") || errorMessage.includes("535")) {
        userMessage = `فشل المصادقة. تأكد من صحة اسم المستخدم وكلمة المرور.`;
      } else if (errorMessage.includes("certificate") || errorMessage.includes("SSL") || errorMessage.includes("TLS")) {
        userMessage = `خطأ في شهادة SSL/TLS. جرب تغيير نوع التشفير (SSL بدلاً من TLS أو العكس).`;
      } else if (errorMessage.includes("timeout")) {
        userMessage = `انتهت مهلة الاتصال. تأكد من أن المنفذ ${smtp_port} مفتوح ولا يوجد جدار حماية يمنع الاتصال.`;
      }

      return new Response(
        JSON.stringify({ success: false, message: userMessage }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
