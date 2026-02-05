import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/smtp-sender.ts";
import { quoteEmailTemplate } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendQuoteRequest {
  quoteId: string;
  recipientEmail: string;
  recipientName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { quoteId, recipientEmail, recipientName }: SendQuoteRequest = await req.json();

    if (!quoteId || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch quote details
    const { data: quote, error: quoteError } = await supabase
      .from("crm_quotes")
      .select(`
        *,
        account:account_id (name, contact_email),
        opportunity:opportunity_id (name)
      `)
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      console.error("Quote fetch error:", quoteError);
      return new Response(
        JSON.stringify({ error: "Quote not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch staff name
    let staffName = "فريق المبيعات";
    if (quote.created_by) {
      const { data: staffData } = await supabase
        .from("staff_members")
        .select("full_name")
        .eq("id", quote.created_by)
        .single();
      if (staffData?.full_name) {
        staffName = staffData.full_name;
      }
    }

    // Get public base URL from settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "public_base_url")
      .single();
    
    const baseUrl = settings?.value || "https://docs.webyan.sa";

    // Format currency
    const formatCurrency = (amount: number) => {
      return `${amount.toLocaleString("ar-SA")} ر.س`;
    };

    // Format date
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    // Prepare email template
    const emailData = {
      clientName: recipientName || quote.account?.name || "العميل الكريم",
      quoteNumber: quote.quote_number,
      quoteTitle: quote.title,
      totalAmount: formatCurrency(quote.total_amount),
      validUntil: quote.valid_until ? formatDate(quote.valid_until) : "غير محدد",
      viewUrl: `${baseUrl}/admin/crm/quotes/${quoteId}`,
      staffName: staffName,
    };

    const emailTemplate = quoteEmailTemplate(emailData);

    // Send email
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      emailType: "quote",
    });

    if (!emailResult.success) {
      console.error("Email send error:", emailResult.error);
      
      // Log failed email
      await supabase.from("email_logs").insert({
        recipient_email: recipientEmail,
        subject: emailTemplate.subject,
        status: "failed",
        error_message: emailResult.error,
        method: emailResult.method || "unknown",
        email_type: "quote",
        metadata: { quoteId, quoteNumber: quote.quote_number },
      });

      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResult.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update quote status to sent
    await supabase
      .from("crm_quotes")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    // Add to client timeline
    if (quote.account_id) {
      await supabase.from("client_timeline").insert({
        organization_id: quote.account_id,
        event_type: "quote_sent",
        title: `إرسال عرض سعر #${quote.quote_number}`,
        description: `تم إرسال عرض السعر "${quote.title}" إلى ${recipientEmail}`,
        performed_by_name: staffName,
        metadata: { quoteId, quoteNumber: quote.quote_number, totalAmount: quote.total_amount },
      });
    }

    console.log(`Quote ${quote.quote_number} sent successfully to ${recipientEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: "Quote sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-quote-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

Deno.serve(handler);
