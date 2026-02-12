import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DemoRequestPayload {
  organization_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  city?: string;
  interest_type?: 'webyan_subscription' | 'custom_platform' | 'consulting';
  organization_size?: 'small' | 'medium' | 'large';
  notes?: string;
  source_page?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
}

const interestTypeLabels: Record<string, string> = {
  'webyan_subscription': 'اشتراك ويبيان',
  'custom_platform': 'منصة مخصصة',
  'consulting': 'استشارة/تحول رقمي'
};

const orgSizeLabels: Record<string, string> = {
  'small': 'صغيرة (أقل من 10 موظفين)',
  'medium': 'متوسطة (10-50 موظف)',
  'large': 'كبيرة (أكثر من 50 موظف)'
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "مفتاح API مطلوب" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tokenHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey));
    const tokenHashHex = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: tokenData, error: tokenError } = await supabase
      .from('website_api_tokens')
      .select('id, name, is_active, usage_count')
      .eq('token_hash', tokenHashHex)
      .single();

    if (tokenError || !tokenData || !tokenData.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: "مفتاح API غير صالح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from('website_api_tokens').update({ 
      last_used_at: new Date().toISOString(),
      usage_count: tokenData.usage_count + 1 
    }).eq('id', tokenData.id);

    const body: DemoRequestPayload = await req.json();

    if (!body.organization_name || !body.contact_name || !body.email) {
      return new Response(
        JSON.stringify({ success: false, error: "الحقول المطلوبة: اسم الجهة، اسم الشخص، البريد الإلكتروني" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: "البريد الإلكتروني غير صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
    const userAgent = req.headers.get("user-agent") || "";

    // Check for existing lead
    const { data: existingLead } = await supabase
      .from('crm_leads')
      .select('id, company_name, stage, converted_to_account_id')
      .eq('contact_email', body.email.toLowerCase().trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let leadId: string | null = null;
    let opportunityId: string | null = null;
    let isNewLead = false;

    if (existingLead && !existingLead.converted_to_account_id) {
      leadId = existingLead.id;
      const { data: existingOpportunity } = await supabase
        .from('crm_opportunities')
        .select('id, stage, status')
        .eq('account_id', existingLead.converted_to_account_id)
        .in('status', ['active', 'open'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingOpportunity) {
        opportunityId = existingOpportunity.id;
        await supabase.from('crm_opportunity_activities').insert({
          opportunity_id: existingOpportunity.id,
          activity_type: 'website_request',
          title: 'طلب عرض توضيحي جديد من الموقع',
          description: `تم استلام طلب عرض توضيحي جديد. نوع الاهتمام: ${interestTypeLabels[body.interest_type || ''] || 'غير محدد'}`,
          metadata: { form_type: 'demo_request', interest_type: body.interest_type, notes: body.notes }
        });
      }
    } else {
      isNewLead = true;
      const { data: newLead, error: leadError } = await supabase
        .from('crm_leads')
        .insert({
          company_name: body.organization_name,
          contact_name: body.contact_name,
          contact_email: body.email.toLowerCase().trim(),
          contact_phone: body.phone,
          lead_source: 'website',
          source_details: 'طلب عرض توضيحي من الموقع الرسمي',
          lead_type: body.interest_type || 'webyan_subscription',
          stage: 'new',
          notes: body.notes,
          utm_source: body.utm_source,
          utm_campaign: body.utm_campaign,
          tags: ['demo_request', 'website'],
          estimated_value: body.interest_type === 'custom_platform' ? 50000 : body.interest_type === 'consulting' ? 10000 : 5000
        })
        .select('id')
        .single();

      if (leadError) {
        console.error('Error creating lead:', leadError);
        throw new Error('فشل في إنشاء العميل المحتمل');
      }
      leadId = newLead.id;
    }

    // Create form submission
    const { data: submission, error: submissionError } = await supabase
      .from('website_form_submissions')
      .insert({
        form_type: 'demo_request', status: 'new',
        organization_name: body.organization_name, contact_name: body.contact_name,
        email: body.email.toLowerCase().trim(), phone: body.phone, city: body.city,
        interest_type: body.interest_type, organization_size: body.organization_size,
        notes: body.notes, source: 'website', source_page: body.source_page,
        utm_source: body.utm_source, utm_campaign: body.utm_campaign, utm_medium: body.utm_medium,
        ip_address: ip, user_agent: userAgent, lead_id: leadId, opportunity_id: opportunityId
      })
      .select('id, submission_number')
      .single();

    if (submissionError) {
      console.error('Error creating submission:', submissionError);
      throw new Error('فشل في حفظ الطلب');
    }

    // Create in-app notifications
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'editor']);

    if (adminUsers && adminUsers.length > 0) {
      const notifications = adminUsers.map(user => ({
        user_id: user.user_id,
        title: `طلب عرض توضيحي جديد - ${body.organization_name}`,
        message: `تم استلام طلب عرض توضيحي جديد من ${body.contact_name} - ${interestTypeLabels[body.interest_type || ''] || 'غير محدد'}`,
        type: 'website_request',
        metadata: { submission_id: submission.id, submission_number: submission.submission_number, lead_id: leadId, is_new_lead: isNewLead }
      }));
      await supabase.from('user_notifications').insert(notifications);
    }

    // Get admin email from system settings
    let adminEmail: string | null = null;
    try {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'accounts_email')
        .single();
      if (settingsData?.value) adminEmail = settingsData.value;
    } catch (e) {
      console.error('Error fetching admin email:', e);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Send emails in parallel
    const emailPromises: Promise<void>[] = [];

    // 1) Confirmation email to customer
    if (resendApiKey) {
      // 1) Confirmation email to customer
      emailPromises.push((async () => {
        try {
          console.log('Sending customer confirmation email to:', body.email);
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Webyan Support <support@webyan.sa>",
              reply_to: "support@webyan.sa",
              to: [body.email],
              subject: "تم استلام طلب العرض التوضيحي - ويبيان",
              html: buildCustomerEmail(body, submission.submission_number)
            })
          });
          const resText = await res.text();
          if (!res.ok) {
            console.error('Customer email failed:', resText);
          } else {
            console.log('Customer email sent successfully:', resText);
            // Log to email_logs
            await supabase.from('email_logs').insert({
              recipient_email: body.email,
              subject: "تم استلام طلب العرض التوضيحي - ويبيان",
              email_type: 'demo_request_confirmation',
              status: 'success',
              method: 'resend'
            });
          }
        } catch (e) { console.error('Customer email error:', e); }
      })());

      // 2) Admin notification email
      if (adminEmail) {
        console.log('Sending admin notification email to:', adminEmail);
        emailPromises.push((async () => {
          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: "Webyan Support <support@webyan.sa>",
                reply_to: body.email,
                to: [adminEmail],
                subject: `🔔 طلب عرض توضيحي جديد - ${body.organization_name}`,
                html: buildAdminEmail(body, submission.submission_number, isNewLead)
              })
            });
            const resText = await res.text();
            if (!res.ok) {
              console.error('Admin email failed:', resText);
            } else {
              console.log('Admin email sent successfully:', resText);
              await supabase.from('email_logs').insert({
                recipient_email: adminEmail,
                subject: `🔔 طلب عرض توضيحي جديد - ${body.organization_name}`,
                email_type: 'demo_request_admin_notification',
                status: 'success',
                method: 'resend'
              });
            }
          } catch (e) { console.error('Admin email error:', e); }
        })());
      } else {
        console.warn('No admin email found in system_settings');
      }
    }

    await Promise.allSettled(emailPromises);

    return new Response(
      JSON.stringify({
        success: true,
        message: "تم استلام طلبك بنجاح وسنتواصل معك قريباً",
        data: { submission_number: submission.submission_number, is_new_lead: isNewLead }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing demo request:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildCustomerEmail(body: DemoRequestPayload, submissionNumber: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
  <tr><td style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ويبيان</h1>
    <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 14px;">حلول رقمية للقطاع غير الربحي</p>
  </td></tr>
  <tr><td style="padding: 35px 30px;">
    <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">مرحباً ${body.contact_name}،</h2>
    <p style="color: #475569; line-height: 1.8; margin: 0 0 20px 0;">شكراً لاهتمامكم بخدمات ويبيان. تم استلام طلب العرض التوضيحي وسيتواصل معكم فريقنا قريباً.</p>
    <table width="100%" style="background-color: #f0f9ff; border-radius: 10px; margin: 20px 0;" cellpadding="0" cellspacing="0">
      <tr><td style="padding: 16px 20px;">
        <p style="color: #64748b; margin: 0 0 4px 0; font-size: 12px;">رقم الطلب</p>
        <p style="color: #0284c7; margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">${submissionNumber}</p>
      </td></tr>
    </table>
    <table width="100%" style="border: 1px solid #e2e8f0; border-radius: 10px; margin: 20px 0; border-collapse: separate; overflow: hidden;" cellpadding="0" cellspacing="0">
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; background: #f8fafc;"><strong style="color: #374151;">الجهة:</strong> <span style="color: #475569;">${body.organization_name}</span></td></tr>
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;"><strong style="color: #374151;">نوع الاهتمام:</strong> <span style="color: #475569;">${interestTypeLabels[body.interest_type || ''] || 'غير محدد'}</span></td></tr>
      ${body.city ? `<tr><td style="padding: 12px 16px;"><strong style="color: #374151;">المنطقة:</strong> <span style="color: #475569;">${body.city}</span></td></tr>` : ''}
    </table>
    <table width="100%" style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin: 24px 0;" cellpadding="0" cellspacing="0">
      <tr><td style="padding: 20px;">
        <p style="color: #1e293b; font-weight: 600; margin: 0 0 14px 0; font-size: 14px;">للتواصل معنا</p>
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr><td style="padding: 5px 0;"><table cellpadding="0" cellspacing="0"><tr>
            <td style="width: 28px; text-align: center;"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2709.png" width="16" height="16" alt="email" style="vertical-align: middle;" /></td>
            <td style="padding-right: 6px; color: #64748b; font-size: 13px;">البريد:</td>
            <td><a href="mailto:hala@webyan.sa" style="color: #0284c7; text-decoration: none; font-size: 13px;">hala@webyan.sa</a></td>
          </tr></table></td></tr>
          <tr><td style="padding: 5px 0;"><table cellpadding="0" cellspacing="0"><tr>
            <td style="width: 28px; text-align: center;"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4f1.png" width="16" height="16" alt="phone" style="vertical-align: middle;" /></td>
            <td style="padding-right: 6px; color: #64748b; font-size: 13px;">الجوال:</td>
            <td><a href="tel:+966538553400" style="color: #0284c7; text-decoration: none; font-size: 13px;" dir="ltr">+966 53 855 3400</a></td>
          </tr></table></td></tr>
          <tr><td style="padding: 5px 0;"><table cellpadding="0" cellspacing="0"><tr>
            <td style="width: 28px; text-align: center;"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4ac.png" width="16" height="16" alt="whatsapp" style="vertical-align: middle;" /></td>
            <td style="padding-right: 6px; color: #64748b; font-size: 13px;">واتساب:</td>
            <td><a href="https://wa.me/966538553400" style="color: #0284c7; text-decoration: none; font-size: 13px;" dir="ltr">+966 53 855 3400</a></td>
          </tr></table></td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background-color: #f8fafc; padding: 16px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
    <p style="color: #94a3b8; margin: 0; font-size: 11px;">&copy; ${new Date().getFullYear()} ويبيان - جميع الحقوق محفوظة</p>
  </td></tr>
</table>
</body></html>`;
}

function buildAdminEmail(body: DemoRequestPayload, submissionNumber: string, isNewLead: boolean): string {
  const dateStr = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const leadBadge = isNewLead 
    ? '<span style="display:inline-block;background:#dcfce7;color:#166534;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">⭐ عميل محتمل جديد</span>'
    : '<span style="display:inline-block;background:#dbeafe;color:#1e40af;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">🔄 عميل محتمل موجود</span>';

  const infoRows = [
    { label: 'اسم الجهة', value: body.organization_name, icon: '🏢' },
    { label: 'الشخص المسؤول', value: body.contact_name, icon: '👤' },
    { label: 'البريد الإلكتروني', value: `<a href="mailto:${body.email}" style="color:#0284c7;text-decoration:none;">${body.email}</a>`, icon: '✉️' },
    { label: 'رقم الجوال', value: body.phone ? `<a href="tel:${body.phone}" style="color:#0284c7;text-decoration:none;" dir="ltr">${body.phone}</a>` : '<span style="color:#94a3b8;">لم يُحدد</span>', icon: '📱' },
    { label: 'واتساب', value: body.phone ? `<a href="https://wa.me/${body.phone.replace(/[^0-9+]/g,'').replace('+','')}" style="color:#0284c7;text-decoration:none;" dir="ltr">${body.phone}</a>` : '<span style="color:#94a3b8;">لم يُحدد</span>', icon: '💬' },
    { label: 'المنطقة', value: body.city || '<span style="color:#94a3b8;">لم تُحدد</span>', icon: '📍' },
    { label: 'نوع الاهتمام', value: interestTypeLabels[body.interest_type || ''] || 'غير محدد', icon: '🎯' },
    { label: 'حجم الجهة', value: body.organization_size ? orgSizeLabels[body.organization_size] || body.organization_size : '<span style="color:#94a3b8;">لم يُحدد</span>', icon: '📊' },
  ];

  const dataRows = infoRows.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;white-space:nowrap;width:140px;vertical-align:top;">
        <span style="margin-left:6px;">${r.icon}</span> ${r.label}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;font-weight:500;">
        ${r.value}
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;background-color:#f1f5f9;margin:0;padding:24px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0ea5e9 0%,#0369a1 100%);padding:28px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">طلب عرض توضيحي جديد</h1>
        <p style="color:#bae6fd;margin:8px 0 0 0;font-size:13px;">وصلك طلب جديد عبر الموقع الإلكتروني الرسمي لويبيان</p>
      </td>
      <td style="text-align:left;vertical-align:top;">
        <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 14px;text-align:center;">
          <p style="color:#e0f2fe;margin:0;font-size:10px;">رقم الطلب</p>
          <p style="color:#fff;margin:4px 0 0 0;font-size:16px;font-weight:700;letter-spacing:1px;">${submissionNumber}</p>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Status Badge -->
  <tr><td style="padding:20px 30px 0 30px;">
    <table cellpadding="0" cellspacing="0"><tr><td>${leadBadge}</td><td style="padding-right:10px;color:#94a3b8;font-size:12px;">${dateStr}</td></tr></table>
  </td></tr>

  <!-- Client Data -->
  <tr><td style="padding:20px 30px 28px 30px;">
    <p style="color:#334155;font-size:15px;font-weight:600;margin:0 0 14px 0;border-right:3px solid #0ea5e9;padding-right:10px;">بيانات العميل</p>
    <table width="100%" style="border:1px solid #e2e8f0;border-radius:12px;border-collapse:separate;overflow:hidden;" cellpadding="0" cellspacing="0">
      ${dataRows}
    </table>
    ${body.notes ? `
    <div style="margin-top:20px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 18px;">
      <p style="color:#92400e;font-weight:600;margin:0 0 8px 0;font-size:13px;">📝 ملاحظات العميل:</p>
      <p style="color:#78350f;margin:0;font-size:13px;line-height:1.8;">${body.notes}</p>
    </div>` : ''}

    <!-- Quick Actions -->
    <div style="margin-top:24px;background:#f0f9ff;border-radius:12px;padding:16px 18px;border:1px solid #bae6fd;">
      <p style="color:#0369a1;font-weight:600;margin:0 0 10px 0;font-size:13px;">⚡ إجراءات سريعة</p>
      <table cellpadding="0" cellspacing="0"><tr>
        ${body.phone ? `<td style="padding-left:8px;"><a href="https://wa.me/${body.phone.replace(/[^0-9+]/g,'').replace('+','')}" style="display:inline-block;background:#25d366;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;">💬 واتساب</a></td>` : ''}
        <td style="padding-left:8px;"><a href="mailto:${body.email}" style="display:inline-block;background:#0284c7;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;">✉️ إرسال بريد</a></td>
        ${body.phone ? `<td style="padding-left:8px;"><a href="tel:${body.phone}" style="display:inline-block;background:#6366f1;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;">📞 اتصال</a></td>` : ''}
      </tr></table>
    </div>

    ${body.source_page ? `<p style="color:#94a3b8;font-size:11px;margin:16px 0 0 0;">📄 الصفحة المصدر: <span dir="ltr" style="color:#64748b;">${body.source_page}</span></p>` : ''}
    ${body.utm_source ? `<p style="color:#94a3b8;font-size:11px;margin:4px 0 0 0;">📊 UTM: ${body.utm_source}${body.utm_campaign ? ' | ' + body.utm_campaign : ''}</p>` : ''}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background-color:#f8fafc;padding:16px 30px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="color:#94a3b8;margin:0;font-size:11px;">رسالة آلية من نظام ويبيان • ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</body></html>`;
}
