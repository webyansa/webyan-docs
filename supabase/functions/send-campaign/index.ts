import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, getSmtpSettings, getBaseUrl } from "../_shared/smtp-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id, test_email, test_org_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get campaign
    const { data: campaign, error: campErr } = await supabase
      .from("marketing_campaigns")
      .select("*, marketing_email_templates(*)")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const template = campaign.marketing_email_templates;
    if (!template) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test send mode
    if (test_email && test_org_id) {
      const { data: org } = await supabase
        .from("client_organizations")
        .select("*")
        .eq("id", test_org_id)
        .single();

      if (!org) {
        return new Response(JSON.stringify({ error: "Organization not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const html = replaceVariables(template.html_body, org, campaign_id, supabaseUrl);
      const subject = replaceVariablesInText(template.subject, org);

      await sendEmail({ to: test_email, subject, html, emailType: "marketing_test" });

      return new Response(JSON.stringify({ success: true, message: "Test email sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Full campaign send
    // Update campaign status
    await supabase
      .from("marketing_campaigns")
      .update({ status: "sending", started_at: new Date().toISOString() })
      .eq("id", campaign_id);

    // Log audit
    await supabase.from("campaign_audit_log").insert({
      campaign_id,
      action: "campaign_started",
      performed_by: null,
      details: { started_at: new Date().toISOString() },
    });

    // Get recipients
    const { data: recipients } = await supabase
      .from("campaign_recipients")
      .select("id, organization_id")
      .eq("campaign_id", campaign_id)
      .eq("email_status", "pending");

    if (!recipients || recipients.length === 0) {
      await supabase
        .from("marketing_campaigns")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", campaign_id);

      return new Response(JSON.stringify({ success: true, message: "No recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unsubscribed orgs
    const { data: unsubscribed } = await supabase
      .from("marketing_unsubscribes")
      .select("organization_id");
    const unsubSet = new Set((unsubscribed || []).map((u: any) => u.organization_id));

    // Get all org IDs
    const orgIds = recipients.map((r: any) => r.organization_id).filter((id: string) => !unsubSet.has(id));

    // Fetch org data
    const { data: orgs } = await supabase
      .from("client_organizations")
      .select("id, name, contact_email, subscription_plan, subscription_status, subscription_end_date, city, primary_contact_name, primary_contact_email")
      .in("id", orgIds);

    const orgMap = new Map((orgs || []).map((o: any) => [o.id, o]));

    const batchSize = campaign.batch_size || 50;
    const batchDelay = campaign.batch_delay_ms || 2000;
    let sentCount = 0;
    let successCount = 0;
    let failedCount = 0;

    // Process in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      for (const recipient of batch) {
        const org = orgMap.get(recipient.organization_id);
        if (!org || unsubSet.has(recipient.organization_id)) {
          // Skip unsubscribed or missing orgs
          await supabase
            .from("campaign_recipients")
            .update({ email_status: "failed", error_message: unsubSet.has(recipient.organization_id) ? "Unsubscribed" : "Org not found", sent_at: new Date().toISOString() })
            .eq("id", recipient.id);
          failedCount++;
          continue;
        }

        const toEmail = org.contact_email;
        if (!toEmail) {
          await supabase
            .from("campaign_recipients")
            .update({ email_status: "failed", error_message: "No email", sent_at: new Date().toISOString() })
            .eq("id", recipient.id);
          failedCount++;
          continue;
        }

        try {
          const html = replaceVariables(template.html_body, org, campaign_id, supabaseUrl);
          const subject = replaceVariablesInText(template.subject, org);

          // Add tracking pixel and unsubscribe link
          const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email-event?type=open&cid=${campaign_id}&oid=${org.id}" width="1" height="1" style="display:none;" />`;
          const unsubLink = `${supabaseUrl}/functions/v1/unsubscribe-marketing?oid=${org.id}`;
          const unsubFooter = `<div style="text-align:center;padding:20px;font-size:12px;color:#999;font-family:Arial,sans-serif;"><a href="${unsubLink}" style="color:#999;">إلغاء الاشتراك من القائمة البريدية</a></div>`;

          const finalHtml = html + trackingPixel + unsubFooter;

          await sendEmail({ to: toEmail, subject, html: finalHtml, emailType: "marketing_campaign" });

          await supabase
            .from("campaign_recipients")
            .update({ email_status: "sent", sent_at: new Date().toISOString() })
            .eq("id", recipient.id);

          successCount++;
        } catch (err) {
          console.error(`Failed to send to ${toEmail}:`, err);
          await supabase
            .from("campaign_recipients")
            .update({ email_status: "failed", error_message: String(err), sent_at: new Date().toISOString() })
            .eq("id", recipient.id);
          failedCount++;
        }

        sentCount++;
      }

      // Update counts
      await supabase
        .from("marketing_campaigns")
        .update({ sent_count: sentCount, success_count: successCount, failed_count: failedCount })
        .eq("id", campaign_id);

      // Delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise((r) => setTimeout(r, batchDelay));
      }
    }

    // Mark completed
    await supabase
      .from("marketing_campaigns")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        sent_count: sentCount,
        success_count: successCount,
        failed_count: failedCount,
      })
      .eq("id", campaign_id);

    await supabase.from("campaign_audit_log").insert({
      campaign_id,
      action: "campaign_completed",
      details: { sent_count: sentCount, success_count: successCount, failed_count: failedCount },
    });

    return new Response(
      JSON.stringify({ success: true, sent_count: sentCount, success_count: successCount, failed_count: failedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send campaign error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function replaceVariablesInText(text: string, org: any): string {
  const now = new Date();
  const endDate = org.subscription_end_date ? new Date(org.subscription_end_date) : null;
  const remainingDays = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return text
    .replace(/\{\{OrganizationName\}\}/g, org.name || "")
    .replace(/\{\{PlanName\}\}/g, org.subscription_plan || "")
    .replace(/\{\{SubscriptionStatus\}\}/g, org.subscription_status || "")
    .replace(/\{\{SubscriptionEndDate\}\}/g, org.subscription_end_date || "")
    .replace(/\{\{RemainingDays\}\}/g, String(remainingDays))
    .replace(/\{\{City\}\}/g, org.city || "")
    .replace(/\{\{ContactName\}\}/g, org.primary_contact_name || org.name || "")
    .replace(/\{\{ContactEmail\}\}/g, org.contact_email || "")
    .replace(/\{\{LoginUrl\}\}/g, "https://docs.webyan.sa/portal/login");
}

function replaceVariables(html: string, org: any, campaignId: string, supabaseUrl: string): string {
  const unsubUrl = `${supabaseUrl}/functions/v1/unsubscribe-marketing?oid=${org.id}`;
  let result = replaceVariablesInText(html, org);
  result = result.replace(/\{\{UnsubscribeUrl\}\}/g, unsubUrl);
  return result;
}
