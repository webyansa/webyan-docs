// Simple email test function using Resend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TestRequest {
  test_email?: string;
  to_email?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: TestRequest = await req.json();
    const toEmail = body.test_email || body.to_email;

    if (!toEmail) {
      return new Response(
        JSON.stringify({ success: false, message: "البريد الإلكتروني مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, message: "RESEND_API_KEY غير مُعدّ في النظام" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending test email to: ${toEmail}`);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Webyan Support <support@webyan.sa>",
        to: [toEmail],
        reply_to: "support@webyan.sa",
        subject: "✅ رسالة اختبار من نظام ويبيان",
        html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f3f4f6">
<tr><td align="center" style="padding:40px 20px;">
<table width="550" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:550px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
<tr><td align="center" style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:40px 30px;">
<h1 style="margin:0;font-size:28px;color:#ffffff;font-family:Arial,sans-serif;">✅ اختبار ناجح!</h1>
<p style="margin:12px 0 0;font-size:16px;color:rgba(255,255,255,0.9);font-family:Arial,sans-serif;">إعدادات البريد تعمل بشكل صحيح</p>
</td></tr>
<tr><td style="padding:35px 30px;">
<p style="font-size:17px;color:#1f2937;margin:0 0 20px;font-family:Arial,sans-serif;line-height:1.8;">مرحباً 👋</p>
<p style="font-size:15px;color:#4b5563;margin:0 0 25px;font-family:Arial,sans-serif;line-height:1.9;">هذه رسالة اختبار من نظام <strong>ويبيان</strong>. إذا وصلتك هذه الرسالة، فهذا يعني أن إعدادات البريد الإلكتروني تعمل بشكل صحيح.</p>
<table width="100%" cellpadding="16" cellspacing="0" bgcolor="#ecfdf5" style="border-radius:12px;border:1px solid #a7f3d0;">
<tr><td>
<p style="margin:0;font-size:14px;color:#065f46;font-family:Arial,sans-serif;"><strong>✓ الحالة:</strong> تم الإرسال بنجاح</p>
<p style="margin:8px 0 0;font-size:14px;color:#047857;font-family:Arial,sans-serif;"><strong>📧 المُرسل:</strong> support@webyan.sa</p>
<p style="margin:8px 0 0;font-size:14px;color:#047857;font-family:Arial,sans-serif;"><strong>🔧 الطريقة:</strong> Resend API</p>
<p style="margin:8px 0 0;font-size:14px;color:#047857;font-family:Arial,sans-serif;"><strong>🌐 النطاق:</strong> webyan.sa</p>
</td></tr>
</table>
</td></tr>
<tr><td align="center" bgcolor="#1e3a8a" style="padding:25px;">
<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.9);font-family:Arial,sans-serif;">فريق دعم ويبيان</p>
<p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.6);font-family:Arial,sans-serif;">تم الإرسال في: ${new Date().toLocaleString('ar-SA')}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
        `,
      }),
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log("Test email sent successfully:", responseData);
      return new Response(
        JSON.stringify({
          success: true,
          message: "تم إرسال رسالة الاختبار بنجاح! تحقق من صندوق الوارد.",
          email_id: responseData.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("Resend API error:", responseData);
      return new Response(
        JSON.stringify({
          success: false,
          message: `فشل إرسال الرسالة: ${responseData.message || "خطأ غير معروف"}`,
          error: responseData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in test-smtp:", error);
    const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
