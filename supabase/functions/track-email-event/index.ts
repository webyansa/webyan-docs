import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // open or click
  const campaignId = url.searchParams.get("cid");
  const orgId = url.searchParams.get("oid");
  const linkCode = url.searchParams.get("lc");

  if (!campaignId || !orgId) {
    return new Response("Missing params", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    if (type === "open") {
      // Record open event
      await supabase.from("email_engagement_events").insert({
        campaign_id: campaignId,
        organization_id: orgId,
        event_type: "open",
        ip_address: ip,
        user_agent: userAgent,
      });

      // Update recipient open count
      await supabase.rpc("increment_open_count", {
        p_campaign_id: campaignId,
        p_org_id: orgId,
      }).catch(() => {
        // Fallback if RPC doesn't exist
        supabase
          .from("campaign_recipients")
          .update({ 
            open_count: 1, // Will be incremented manually
            last_opened_at: new Date().toISOString() 
          })
          .eq("campaign_id", campaignId)
          .eq("organization_id", orgId);
      });

      // Return 1x1 transparent pixel
      const pixel = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
        0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
        0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
        0x01, 0x00, 0x3b,
      ]);
      return new Response(pixel, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    if (type === "click" && linkCode) {
      // Get original URL
      const { data: link } = await supabase
        .from("campaign_links")
        .select("original_url, click_count")
        .eq("tracking_code", linkCode)
        .single();

      if (!link) {
        return new Response("Link not found", { status: 404 });
      }

      // Record click event
      await supabase.from("email_engagement_events").insert({
        campaign_id: campaignId,
        organization_id: orgId,
        event_type: "click",
        link_url: link.original_url,
        ip_address: ip,
        user_agent: userAgent,
      });

      // Update link click count
      await supabase
        .from("campaign_links")
        .update({ click_count: (link.click_count || 0) + 1 })
        .eq("tracking_code", linkCode);

      // Update recipient click count
      await supabase
        .from("campaign_recipients")
        .update({ last_clicked_at: new Date().toISOString() })
        .eq("campaign_id", campaignId)
        .eq("organization_id", orgId);

      // Redirect to original URL
      return new Response(null, {
        status: 302,
        headers: { Location: link.original_url },
      });
    }

    return new Response("Invalid event type", { status: 400 });
  } catch (error) {
    console.error("Track event error:", error);
    // Still return pixel/redirect even on error
    if (type === "open") {
      const pixel = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
        0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
        0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
        0x01, 0x00, 0x3b,
      ]);
      return new Response(pixel, { headers: { "Content-Type": "image/gif" } });
    }
    return new Response("Error", { status: 500 });
  }
});
