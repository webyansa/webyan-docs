import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("oid");

  if (!orgId) {
    return new Response(renderPage("خطأ", "رابط غير صالح"), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check if already unsubscribed
    const { data: existing } = await supabase
      .from("marketing_unsubscribes")
      .select("id")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (existing) {
      return new Response(renderPage("تم بالفعل", "لقد تم إلغاء اشتراكك مسبقاً من القائمة البريدية."), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Add to unsubscribe list
    await supabase.from("marketing_unsubscribes").insert({
      organization_id: orgId,
      reason: "User clicked unsubscribe link",
    });

    // Log engagement event if we can find a recent campaign
    const { data: recentRecipient } = await supabase
      .from("campaign_recipients")
      .select("campaign_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentRecipient) {
      await supabase.from("email_engagement_events").insert({
        campaign_id: recentRecipient.campaign_id,
        organization_id: orgId,
        event_type: "unsubscribe",
      });
    }

    return new Response(
      renderPage("تم إلغاء الاشتراك", "تم إلغاء اشتراكك بنجاح من القائمة البريدية لويبيان. لن تتلقى رسائل تسويقية بعد الآن."),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new Response(renderPage("خطأ", "حدث خطأ أثناء إلغاء الاشتراك. يرجى المحاولة مرة أخرى."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

function renderPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - ويبيان</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; border-radius: 16px; padding: 48px; max-width: 480px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    h1 { color: #263c84; font-size: 24px; margin-bottom: 16px; }
    p { color: #6b7280; font-size: 16px; line-height: 1.6; }
    .logo { font-size: 28px; font-weight: 700; color: #263c84; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">ويبيان</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
