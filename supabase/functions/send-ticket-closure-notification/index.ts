import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { ticketResolvedTemplate } from "../_shared/email-templates.ts";

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

    const { data: staffMember } = await supabase
      .from("staff_members")
      .select("full_name")
      .eq("id", closedBy)
      .single();

    const staffName = staffMember?.full_name || "فريق الدعم";

    const closureReplyMessage = closureMessage || 
      `تم إغلاق التذكرة بواسطة ${staffName}. نشكرك على تواصلك معنا ونتمنى أن تكون المشكلة قد تم حلها بشكل مرضٍ.`;

    await supabase
      .from("ticket_replies")
      .insert({
        ticket_id: ticketId,
        message: closureReplyMessage,
        is_staff_reply: true,
        user_id: null
      });

    const { data: clientAccounts } = await supabase
      .from("client_accounts")
      .select("user_id, full_name, email")
      .eq("organization_id", ticket.organization_id);

    if (clientAccounts && clientAccounts.length > 0) {
      const notifications = clientAccounts
        .filter(ca => ca.user_id)
        .map(ca => ({
          user_id: ca.user_id,
          title: `تم إغلاق التذكرة: ${ticket.subject}`,
          message: `تم إغلاق التذكرة رقم ${ticket.ticket_number} بواسطة فريق الدعم.`,
          type: "ticket_closed"
        }));

      if (notifications.length > 0) {
        await supabase.from("user_notifications").insert(notifications);
      }

      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        
        const orgEmail = ticket.organization?.contact_email;
        const clientEmails = clientAccounts
          .filter(ca => ca.email)
          .map(ca => ca.email);

        const allEmails = orgEmail 
          ? [orgEmail, ...clientEmails.filter(e => e !== orgEmail)]
          : clientEmails;

        const uniqueEmails = [...new Set(allEmails)];
        const clientName = clientAccounts[0]?.full_name || ticket.organization?.name || 'عزيزنا العميل';

        // Base URLs for Webyan
        const baseUrl = 'https://webyan-guide-hub.lovable.app';

        const template = ticketResolvedTemplate({
          name: clientName,
          ticketNumber: ticket.ticket_number,
          subject: ticket.subject,
          resolution: closureReplyMessage,
          feedbackUrl: `${baseUrl}/portal/tickets`
        });

        for (const email of uniqueEmails) {
          try {
            await resend.emails.send({
              from: "Webyan Support <support@webyan.net>",
              to: [email],
              subject: template.subject,
              html: template.html,
            });
          } catch (emailError) {
            console.error("Error sending email to", email, emailError);
          }
        }
      }
    }

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
