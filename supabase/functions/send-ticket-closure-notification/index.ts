import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketClosureRequest {
  ticketId: string;
  closedBy: string;
  closureMessage?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { ticketId, closedBy, closureMessage }: TicketClosureRequest = await req.json();

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select(`
        *,
        organization:client_organizations!support_tickets_organization_id_fkey (
          id,
          name,
          contact_email
        )
      `)
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error("Ticket not found");
    }

    // Get staff member who closed it
    const { data: staffMember } = await supabase
      .from("staff_members")
      .select("full_name")
      .eq("id", closedBy)
      .single();

    const staffName = staffMember?.full_name || "فريق الدعم";

    // Add a system reply to the ticket indicating closure
    const closureReplyMessage = closureMessage || 
      `تم إغلاق التذكرة بواسطة ${staffName}. نشكرك على تواصلك معنا ونتمنى أن تكون المشكلة قد تم حلها بشكل مرضٍ. إذا كان لديك أي استفسارات إضافية، لا تتردد في إنشاء تذكرة جديدة.`;

    await supabase
      .from("ticket_replies")
      .insert({
        ticket_id: ticketId,
        message: closureReplyMessage,
        is_staff_reply: true,
        user_id: null // System message
      });

    // Create notification for client accounts
    const { data: clientAccounts } = await supabase
      .from("client_accounts")
      .select("user_id, full_name, email")
      .eq("organization_id", ticket.organization_id);

    if (clientAccounts && clientAccounts.length > 0) {
      // Create in-app notifications
      const notifications = clientAccounts
        .filter(ca => ca.user_id)
        .map(ca => ({
          user_id: ca.user_id,
          title: `تم إغلاق التذكرة: ${ticket.subject}`,
          message: `تم إغلاق التذكرة رقم ${ticket.ticket_number} بواسطة فريق الدعم. نشكرك على تواصلك معنا.`,
          type: "ticket_closed"
        }));

      if (notifications.length > 0) {
        await supabase.from("user_notifications").insert(notifications);
      }

      // Send email notification if Resend is configured
      if (resendApiKey) {
        const orgEmail = ticket.organization?.contact_email;
        const clientEmails = clientAccounts
          .filter(ca => ca.email)
          .map(ca => ca.email);

        const allEmails = orgEmail 
          ? [orgEmail, ...clientEmails.filter(e => e !== orgEmail)]
          : clientEmails;

        const uniqueEmails = [...new Set(allEmails)];

        for (const email of uniqueEmails) {
          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "Webyan Support <support@webyan.net>",
                to: [email],
                subject: `تم إغلاق التذكرة: ${ticket.ticket_number}`,
                html: `
                  <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 24px;">تم إغلاق التذكرة ✓</h1>
                    </div>
                    <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                      <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">
                        مرحباً،
                      </p>
                      <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">
                        نود إعلامك بأنه تم إغلاق التذكرة التالية:
                      </p>
                      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <p style="margin: 0 0 10px; color: #64748b;">رقم التذكرة:</p>
                        <p style="margin: 0 0 20px; font-weight: bold; color: #0ea5e9; font-size: 18px;">${ticket.ticket_number}</p>
                        <p style="margin: 0 0 10px; color: #64748b;">الموضوع:</p>
                        <p style="margin: 0; font-weight: bold; color: #1e293b;">${ticket.subject}</p>
                      </div>
                      <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">
                        نشكرك على تواصلك معنا ونتمنى أن تكون المشكلة قد تم حلها بشكل مرضٍ. إذا كان لديك أي استفسارات إضافية، لا تتردد في إنشاء تذكرة جديدة.
                      </p>
                      <a href="https://webyan-guide-hub.lovable.app/portal/tickets" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
                        عرض التذاكر
                      </a>
                      <p style="color: #94a3b8; font-size: 14px; margin-top: 30px; text-align: center;">
                        مع تحيات فريق دعم ويبيان
                      </p>
                    </div>
                  </div>
                `,
              }),
            });

            if (!res.ok) {
              console.error("Email send error:", await res.text());
            }
          } catch (emailError) {
            console.error("Error sending email to", email, emailError);
          }
        }
      }
    }

    // Log the activity
    await supabase.from("ticket_activity_log").insert({
      ticket_id: ticketId,
      action_type: "status_change",
      old_value: ticket.status,
      new_value: "closed",
      performed_by: closedBy,
      performed_by_name: staffName,
      is_staff_action: true,
      note: "تم إغلاق التذكرة"
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
