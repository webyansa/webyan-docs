import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  ticketReplyTemplate, 
  ticketResolvedTemplate, 
  meetingConfirmedTemplate, 
  meetingCancelledTemplate,
  subscriptionTemplate,
  infoTemplate
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
    const baseUrl = 'https://webyan-guide-hub.lovable.app';

    switch (type) {
      case 'ticket_reply':
        template = ticketReplyTemplate({
          name: client_name,
          ticketNumber: data.ticket_number || '',
          subject: data.ticket_subject || '',
          replyMessage: data.reply_message || '',
          replierName: 'فريق الدعم الفني',
          viewUrl: `${baseUrl}/portal/tickets`
        });
        break;

      case 'ticket_status':
        const statusLabels: Record<string, string> = {
          open: 'مفتوحة',
          in_progress: 'قيد المعالجة',
          resolved: 'تم الحل',
          closed: 'مغلقة'
        };
        if (data.new_status === 'resolved' || data.new_status === 'closed') {
          template = ticketResolvedTemplate({
            name: client_name,
            ticketNumber: data.ticket_number || '',
            subject: data.ticket_subject || '',
            viewUrl: `${baseUrl}/portal/tickets`
          });
        } else {
          template = infoTemplate({
            name: client_name,
            title: `تحديث حالة التذكرة ${data.ticket_number}`,
            content: `<p>تم تحديث حالة تذكرتك "<strong>${data.ticket_subject}</strong>" إلى: <strong>${statusLabels[data.new_status || ''] || data.new_status}</strong></p>`,
            actionUrl: `${baseUrl}/portal/tickets`,
            actionText: 'عرض التذكرة'
          });
        }
        break;

      case 'meeting_confirmed':
        template = meetingConfirmedTemplate({
          name: client_name,
          meetingSubject: data.meeting_subject || '',
          meetingDate: data.meeting_date || '',
          meetingTime: data.meeting_time || '',
          meetingLink: data.meeting_link,
          staffName: data.staff_name || 'فريق ويبيان',
          viewUrl: `${baseUrl}/portal/meetings`
        });
        break;

      case 'meeting_cancelled':
        template = meetingCancelledTemplate({
          name: client_name,
          meetingSubject: data.meeting_subject || '',
          reason: data.admin_response,
          newMeetingUrl: `${baseUrl}/portal/meetings/new`
        });
        break;

      case 'meeting_completed':
        template = infoTemplate({
          name: client_name,
          title: `تم إكمال الاجتماع: ${data.meeting_subject}`,
          content: `
            <p>تم إكمال اجتماعك وتسجيل التقرير بنجاح.</p>
            ${data.outcome ? `<p><strong>النتيجة:</strong> ${data.outcome}</p>` : ''}
            <p>نقدر تعاونك معنا ونتطلع لخدمتك دائماً!</p>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #92400e;">⭐ شاركنا رأيك وقيّم الاجتماع لتحسين خدماتنا</p>
            </div>
          `,
          actionUrl: `${baseUrl}/portal/meetings`,
          actionText: 'تقييم الاجتماع'
        });
        break;

      case 'subscription_approved':
        template = subscriptionTemplate({
          name: client_name,
          planName: data.subscription_plan || '',
          status: 'approved',
          adminMessage: data.admin_response,
          viewUrl: `${baseUrl}/portal/subscription`
        });
        break;

      case 'subscription_rejected':
        template = subscriptionTemplate({
          name: client_name,
          planName: data.subscription_plan || '',
          status: 'rejected',
          adminMessage: data.admin_response,
          viewUrl: `${baseUrl}/portal/subscription`
        });
        break;

      default:
        template = infoTemplate({
          name: client_name,
          title: 'إشعار من ويبيان',
          content: '<p>لديك إشعار جديد. يرجى مراجعة حسابك للمزيد من التفاصيل.</p>',
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
