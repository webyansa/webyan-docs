import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${email}`);

    const emailResponse = await resend.emails.send({
      from: "ويبيان <onboarding@resend.dev>",
      to: [email],
      subject: "مرحباً بك في ويبيان! 🎉",
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 20px; color: #1f2937; margin-bottom: 20px; }
            .message { color: #6b7280; line-height: 1.8; margin-bottom: 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
            .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 14px; }
            .features { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .feature { display: flex; align-items: center; margin: 10px 0; }
            .feature-icon { width: 24px; height: 24px; background: #6366f1; border-radius: 50%; margin-left: 12px; display: flex; align-items: center; justify-content: center; color: white; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>مرحباً بك في ويبيان! 🎉</h1>
            </div>
            <div class="content">
              <p class="greeting">أهلاً ${name || 'عزيزنا'}،</p>
              <p class="message">
                يسعدنا انضمامك إلى منصة ويبيان! نحن هنا لمساعدتك في رحلتك مع التوثيق والتعلم.
              </p>
              <div class="features">
                <div class="feature">
                  <span class="feature-icon">✓</span>
                  <span>استعرض أدلة المستخدم الشاملة</span>
                </div>
                <div class="feature">
                  <span class="feature-icon">✓</span>
                  <span>تابع حالة تذاكر الدعم الفني</span>
                </div>
                <div class="feature">
                  <span class="feature-icon">✓</span>
                  <span>احصل على إشعارات بالمقالات الجديدة</span>
                </div>
              </div>
              <p class="message">
                إذا كان لديك أي أسئلة، لا تتردد في فتح تذكرة دعم من خلال حسابك.
              </p>
              <div style="text-align: center;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}" class="button">ابدأ الاستكشاف</a>
              </div>
            </div>
            <div class="footer">
              <p>فريق دعم ويبيان</p>
              <p>© 2024 ويبيان - جميع الحقوق محفوظة</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
