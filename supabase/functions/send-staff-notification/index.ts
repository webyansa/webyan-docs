import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { 
  alertTemplate,
  staffTicketAssignedTemplate,
  staffNewReplyTemplate,
  escalationAlertTemplate,
  staffPasswordResetTemplate,
  staffMeetingNotificationTemplate
} from "../_shared/email-templates.ts";
import { sendEmail, getBaseUrl } from "../_shared/smtp-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffNotificationRequest {
  type: 'ticket_assigned' | 'meeting_assigned' | 'new_reply' | 'escalation_alert' | 'resend_welcome';
  staff_email: string;
  staff_name: string;
  job_title?: string;
  data?: {
    ticket_number?: string;
    ticket_subject?: string;
    meeting_subject?: string;
    meeting_date?: string;
    meeting_time?: string;
    organization_name?: string;
    admin_note?: string;
    reply_from?: string;
    reply_message?: string;
    escalation_reason?: string;
    hours_waiting?: number;
    client_name?: string;
    priority?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, staff_email, staff_name, data }: StaffNotificationRequest = await req.json();

    if (!staff_email) {
      return new Response(JSON.stringify({ error: "Staff email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending ${type} notification to staff ${staff_email}`);

    let template: { subject: string; html: string };
    
    // Get base URL from settings
    const staffPortalUrl = await getBaseUrl();

    switch (type) {
      case 'resend_welcome':
        template = staffPasswordResetTemplate({
          staffName: staff_name,
          resetUrl: `${staffPortalUrl}/support/login`,
          expiryTime: 'غير محدد - استخدم نسيت كلمة المرور'
        });
        template.subject = `🔑 تذكير ببيانات الدخول - نظام ويبيان`;
        break;

      case 'ticket_assigned':
        template = staffTicketAssignedTemplate({
          staffName: staff_name,
          ticketNumber: data?.ticket_number || '',
          subject: data?.ticket_subject || '',
          priority: data?.priority || 'عادية',
          clientName: data?.client_name || data?.organization_name || 'العميل',
          adminNote: data?.admin_note,
          dashboardUrl: `${staffPortalUrl}/staff/tickets`
        });
        break;

      case 'meeting_assigned':
        template = staffMeetingNotificationTemplate({
          staffName: staff_name,
          meetingSubject: data?.meeting_subject || '',
          meetingDate: data?.meeting_date || '',
          meetingTime: data?.meeting_time || '',
          clientName: data?.client_name || 'العميل',
          organizationName: data?.organization_name || '',
          dashboardUrl: `${staffPortalUrl}/staff/meetings`
        });
        break;

      case 'new_reply':
        template = staffNewReplyTemplate({
          staffName: staff_name,
          ticketNumber: data?.ticket_number || '',
          subject: data?.ticket_subject || '',
          clientName: data?.reply_from || 'العميل',
          replyPreview: data?.reply_message || '',
          dashboardUrl: `${staffPortalUrl}/staff/tickets`
        });
        break;

      case 'escalation_alert':
        template = escalationAlertTemplate({
          staffName: staff_name,
          ticketNumber: data?.ticket_number || '',
          subject: data?.ticket_subject || '',
          hoursWaiting: data?.hours_waiting || 24,
          clientName: data?.client_name || 'العميل',
          dashboardUrl: `${staffPortalUrl}/staff/tickets`
        });
        break;

      default:
        template = alertTemplate({
          name: staff_name,
          title: 'إشعار من نظام ويبيان',
          message: 'لديك إشعار جديد. يرجى مراجعة لوحة التحكم للمزيد من التفاصيل.',
          actionUrl: `${staffPortalUrl}/staff`,
          actionText: 'فتح لوحة التحكم'
        });
    }

    const result = await sendEmail({
      to: staff_email,
      subject: template.subject,
      html: template.html,
      from: "نظام ويبيان <support@webyan.net>",
    });

    console.log(`Staff notification sent via ${result.method}:`, result);

    return new Response(JSON.stringify({ success: result.success, method: result.method }), {
      status: result.success ? 200 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-staff-notification:", error);
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
