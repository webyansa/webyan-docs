import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  ticketReplyTemplate, 
  ticketResolvedTemplate, 
  meetingConfirmedTemplate, 
  meetingCancelledTemplate,
  subscriptionTemplate,
  alertTemplate
} from "../_shared/email-templates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'ticket_reply' | 'ticket_status' | 'meeting_confirmed' | 'meeting_cancelled' | 'meeting_completed' | 'subscription_approved' | 'subscription_rejected';
  client_email: string;
  client_name: string;
  data: {
    ticket_number?: string;
    ticket_subject?: string;
    new_status?: string;
    reply_message?: string;
    meeting_subject?: string;
    meeting_date?: string;
    meeting_time?: string;
    meeting_link?: string;
    staff_name?: string;
    subscription_plan?: string;
    admin_response?: string;
    outcome?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, client_email, client_name, data }: NotificationRequest = await req.json();

    if (!client_email) {
      return new Response(JSON.stringify({ error: "Client email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending ${type} notification to ${client_email}`);

    let template: { subject: string; html: string };
    
    // Base URLs for Webyan
    const baseUrl = 'https://webyan-guide-hub.lovable.app';
    const docsUrl = 'https://docs.webyan.net';

    switch (type) {
      case 'ticket_reply':
        template = ticketReplyTemplate({
          name: client_name,
          ticketNumber: data.ticket_number || '',
          subject: data.ticket_subject || '',
          replyText: data.reply_message || '',
          trackUrl: `${baseUrl}/portal/tickets`
        });
        break;

      case 'ticket_status':
        template = ticketResolvedTemplate({
          name: client_name,
          ticketNumber: data.ticket_number || '',
          subject: data.ticket_subject || '',
          feedbackUrl: `${baseUrl}/portal/tickets`
        });
        break;

      case 'meeting_confirmed':
        template = meetingConfirmedTemplate({
          name: client_name,
          meetingSubject: data.meeting_subject || '',
          meetingDate: data.meeting_date || '',
          meetingTime: data.meeting_time || '',
          meetingDuration: '30 دقيقة',
          meetingLink: data.meeting_link,
          staffName: data.staff_name || 'فريق ويبيان'
        });
        break;

      case 'meeting_cancelled':
        template = meetingCancelledTemplate({
          name: client_name,
          meetingSubject: data.meeting_subject || '',
          meetingDate: data.meeting_date || '',
          cancellationReason: data.admin_response
        });
        break;

      case 'meeting_completed':
        template = alertTemplate({
          name: client_name,
          title: `تم إكمال الاجتماع: ${data.meeting_subject}`,
          message: `تم إكمال اجتماعك وتسجيل التقرير بنجاح. ${data.outcome ? `النتيجة: ${data.outcome}` : ''} نقدر تعاونك معنا!`,
          actionUrl: `${baseUrl}/portal/meetings`,
          actionText: 'تقييم الاجتماع'
        });
        break;

      case 'subscription_approved':
        template = subscriptionTemplate({
          name: client_name,
          planName: data.subscription_plan || '',
          status: 'active',
          actionUrl: `${baseUrl}/portal/subscription`
        });
        break;

      case 'subscription_rejected':
        template = subscriptionTemplate({
          name: client_name,
          planName: data.subscription_plan || '',
          status: 'cancelled',
          actionUrl: `${baseUrl}/portal/subscription`
        });
        break;

      default:
        template = alertTemplate({
          name: client_name,
          title: 'إشعار من ويبيان',
          message: 'لديك إشعار جديد. يرجى مراجعة حسابك للمزيد من التفاصيل.',
          actionUrl: `${baseUrl}/portal`,
          actionText: 'الذهاب للبوابة'
        });
    }

    const emailResponse = await resend.emails.send({
      from: "ويبيان <support@webyan.net>",
      to: [client_email],
      subject: template.subject,
      html: template.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-client-notification:", error);
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
