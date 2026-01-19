import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  ticketCreatedTemplate, 
  ticketReplyTemplate, 
  ticketResolvedTemplate,
  alertTemplate 
} from "../_shared/email-templates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketNotificationRequest {
  email: string;
  ticketNumber: string;
  subject: string;
  type: 'created' | 'reply' | 'resolved' | 'status_update' | 'new_ticket_admin';
  message?: string;
  newStatus?: string;
  siteUrl?: string;
  adminEmail?: string;
  customerName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, ticketNumber, subject, type, message, newStatus, siteUrl, adminEmail, customerName }: TicketNotificationRequest = await req.json();

    if (!email) {
      console.log("No email provided, skipping notification");
      return new Response(JSON.stringify({ message: "No email provided" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending ${type} notification for ticket ${ticketNumber} to ${email}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value');

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const companyName = settingsMap['company_name'] || 'ويبيان';
    const responseTime = settingsMap['support_response_time'] || '48 ساعة';
    
    // Base URLs for Webyan - always use production URLs
    const baseUrl = 'https://webyan-guide-hub.lovable.app';
    const docsUrl = 'https://docs.webyan.net';
    const clientName = customerName || 'عزيزنا العميل';

    let template: { subject: string; html: string };

    switch (type) {
      case 'created':
        template = ticketCreatedTemplate({
          name: clientName,
          ticketNumber,
          subject,
          responseTime,
          trackUrl: `${baseUrl}/portal/tickets`
        });
        break;

      case 'reply':
        template = ticketReplyTemplate({
          name: clientName,
          ticketNumber,
          subject,
          replyText: message || 'تم الرد على تذكرتك',
          trackUrl: `${baseUrl}/portal/tickets`
        });
        break;

      case 'resolved':
        template = ticketResolvedTemplate({
          name: clientName,
          ticketNumber,
          subject,
          resolution: message,
          feedbackUrl: `${baseUrl}/portal/tickets`
        });
        break;

      case 'status_update':
        const statusLabels: Record<string, string> = {
          open: 'مفتوحة',
          in_progress: 'قيد المعالجة',
          resolved: 'تم الحل',
          closed: 'مغلقة'
        };
        template = alertTemplate({
          name: clientName,
          title: `تحديث على تذكرتك #${ticketNumber}`,
          message: `تم تحديث حالة تذكرتك "${subject}" إلى: ${statusLabels[newStatus || ''] || newStatus}`,
          actionUrl: `${baseUrl}/portal/tickets`,
          actionText: 'متابعة التذكرة'
        });
        break;

      case 'new_ticket_admin':
        template = alertTemplate({
          name: 'مسؤول النظام',
          title: `تذكرة دعم جديدة #${ticketNumber}`,
          message: `تم استلام تذكرة دعم جديدة من ${clientName}. الموضوع: ${subject}. يرجى مراجعتها والتعامل معها.`,
          actionUrl: `${baseUrl}/admin/tickets`,
          actionText: 'عرض التذكرة'
        });
        break;

      default:
        template = {
          subject: `تحديث على تذكرتك #${ticketNumber}`,
          html: `<p>تم تحديث تذكرتك رقم ${ticketNumber}</p>`
        };
    }

    const emailResponse = await resend.emails.send({
      from: `${companyName} <support@webyan.net>`,
      to: [email],
      subject: template.subject,
      html: template.html,
    });

    console.log("Email sent successfully:", emailResponse);

    if (type === 'created' && adminEmail) {
      const adminTemplate = alertTemplate({
        name: 'مسؤول النظام',
        title: `تذكرة دعم جديدة #${ticketNumber}`,
        message: `تم استلام تذكرة دعم جديدة من ${clientName}. الموضوع: ${subject}. يرجى مراجعتها وتوجيهها للموظف المناسب.`,
        actionUrl: `${baseUrl}/admin/tickets`,
        actionText: 'عرض التذكرة'
      });

      await resend.emails.send({
        from: `${companyName} <support@webyan.net>`,
        to: [adminEmail],
        subject: adminTemplate.subject,
        html: adminTemplate.html,
      });
    }

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-ticket-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
