import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  alertTemplate, 
  infoTemplate, 
  ticketReplyTemplate,
  meetingConfirmedTemplate,
  passwordResetTemplate
} from "../_shared/email-templates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, staff_email, staff_name, job_title, data }: StaffNotificationRequest = await req.json();

    if (!staff_email) {
      return new Response(JSON.stringify({ error: "Staff email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending ${type} notification to staff ${staff_email}`);

    let template: { subject: string; html: string };
    const baseUrl = 'https://webyan-guide-hub.lovable.app';

    switch (type) {
      case 'resend_welcome':
        template = passwordResetTemplate({
          name: staff_name,
          resetUrl: `${baseUrl}/support/login`,
          expiryTime: 'غير محدد - استخدم نسيت كلمة المرور'
        });
        // Override subject for welcome resend
        template.subject = `🔑 تذكير ببيانات الدخول - نظام ويبيان`;
        break;

      case 'ticket_assigned':
        template = alertTemplate({
          name: staff_name,
          title: `تذكرة جديدة موجهة إليك: ${data?.ticket_number}`,
          message: `تم توجيه تذكرة دعم جديدة إليك.\n\n📌 رقم التذكرة: ${data?.ticket_number}\n📋 الموضوع: ${data?.ticket_subject}${data?.organization_name ? `\n🏢 المؤسسة: ${data?.organization_name}` : ''}${data?.admin_note ? `\n\n📝 ملاحظة: ${data?.admin_note}` : ''}`,
          actionUrl: `${baseUrl}/staff/tickets`,
          actionText: 'فتح لوحة التذاكر'
        });
        break;

      case 'meeting_assigned':
        template = meetingConfirmedTemplate({
          name: staff_name,
          meetingSubject: data?.meeting_subject || '',
          meetingDate: data?.meeting_date || '',
          meetingTime: data?.meeting_time || '',
          staffName: data?.organization_name || 'العميل',
          viewUrl: `${baseUrl}/staff/meetings`
        });
        // Override subject for staff meeting
        template.subject = `📅 اجتماع جديد موجه إليك: ${data?.meeting_subject}`;
        break;

      case 'new_reply':
        template = ticketReplyTemplate({
          name: staff_name,
          ticketNumber: data?.ticket_number || '',
          subject: data?.ticket_subject || '',
          replyMessage: data?.reply_message || '',
          replierName: data?.reply_from || 'العميل',
          viewUrl: `${baseUrl}/staff/tickets`
        });
        break;

      case 'escalation_alert':
        template = alertTemplate({
          name: staff_name,
          title: `🚨 تذكرة مصعدة: ${data?.ticket_number}`,
          message: `تم تصعيد التذكرة التالية لعدم الرد عليها في الوقت المحدد.\n\n📌 رقم التذكرة: ${data?.ticket_number}\n📋 الموضوع: ${data?.ticket_subject}${data?.escalation_reason ? `\n⚠️ السبب: ${data?.escalation_reason}` : ''}\n\nيرجى التعامل معها بأقصى سرعة.`,
          actionUrl: `${baseUrl}/staff/tickets`,
          actionText: 'معالجة التذكرة الآن'
        });
        break;

      default:
        template = infoTemplate({
          name: staff_name,
          title: 'إشعار من نظام ويبيان',
          content: '<p>لديك إشعار جديد. يرجى مراجعة لوحة التحكم للمزيد من التفاصيل.</p>',
          actionUrl: `${baseUrl}/staff`,
          actionText: 'فتح لوحة التحكم'
        });
    }

    const emailResponse = await resend.emails.send({
      from: "نظام ويبيان <support@webyan.net>",
      to: [staff_email],
      subject: template.subject,
      html: template.html,
    });

    console.log("Staff notification sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
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
