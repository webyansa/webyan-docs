import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { welcomeTemplate } from "../_shared/email-templates.ts";
import { sendEmail, getBaseUrl } from "../_shared/smtp-sender.ts";

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

    // Get base URL from settings
    const baseUrl = await getBaseUrl();

    const template = welcomeTemplate({
      name: name || 'عزيزنا',
      loginUrl: `${baseUrl}/portal/login`
    });

    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`Welcome email sent via ${result.method}:`, result);

    return new Response(JSON.stringify({ success: result.success, method: result.method }), {
      status: result.success ? 200 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error sending welcome email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
