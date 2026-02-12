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

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API Key
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "مفتاح API مطلوب" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify API Key
    const tokenHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(apiKey)
    );
    const tokenHashHex = Array.from(new Uint8Array(tokenHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

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

    // Update token usage
    await supabase
      .from('website_api_tokens')
      .update({ 
        last_used_at: new Date().toISOString(),
        usage_count: tokenData.usage_count + 1 
      })
      .eq('id', tokenData.id);

    // Parse request body
    const body: DemoRequestPayload = await req.json();

    // Validate required fields
    if (!body.organization_name || !body.contact_name || !body.email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "الحقول المطلوبة: اسم الجهة، اسم الشخص، البريد الإلكتروني" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format - simple and reliable regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: "البريد الإلكتروني غير صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client info
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
    const userAgent = req.headers.get("user-agent") || "";

    // Check for existing lead by email (deduplication)
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
      // Existing lead found - add activity instead of creating new
      leadId = existingLead.id;

      // Check for active opportunity
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
        // Add activity to existing opportunity
        await supabase.from('crm_opportunity_activities').insert({
          opportunity_id: existingOpportunity.id,
          activity_type: 'website_request',
          title: 'طلب عرض توضيحي جديد من الموقع',
          description: `تم استلام طلب عرض توضيحي جديد من الموقع. نوع الاهتمام: ${interestTypeLabels[body.interest_type || ''] || 'غير محدد'}`,
          metadata: {
            form_type: 'demo_request',
            interest_type: body.interest_type,
            notes: body.notes
          }
        });
      }
    } else {
      // Create new lead
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
          estimated_value: body.interest_type === 'custom_platform' ? 50000 : 
                          body.interest_type === 'consulting' ? 10000 : 5000
        })
        .select('id')
        .single();

      if (leadError) {
        console.error('Error creating lead:', leadError);
        throw new Error('فشل في إنشاء العميل المحتمل');
      }

      leadId = newLead.id;
    }

    // Create form submission record
    const { data: submission, error: submissionError } = await supabase
      .from('website_form_submissions')
      .insert({
        form_type: 'demo_request',
        status: 'new',
        organization_name: body.organization_name,
        contact_name: body.contact_name,
        email: body.email.toLowerCase().trim(),
        phone: body.phone,
        city: body.city,
        interest_type: body.interest_type,
        organization_size: body.organization_size,
        notes: body.notes,
        source: 'website',
        source_page: body.source_page,
        utm_source: body.utm_source,
        utm_campaign: body.utm_campaign,
        utm_medium: body.utm_medium,
        ip_address: ip,
        user_agent: userAgent,
        lead_id: leadId,
        opportunity_id: opportunityId
      })
      .select('id, submission_number')
      .single();

    if (submissionError) {
      console.error('Error creating submission:', submissionError);
      throw new Error('فشل في حفظ الطلب');
    }

    // Create notification for sales team
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
        metadata: {
          submission_id: submission.id,
          submission_number: submission.submission_number,
          lead_id: leadId,
          is_new_lead: isNewLead
        }
      }));

      await supabase.from('user_notifications').insert(notifications);
    }

    // Send confirmation email to customer
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Webyan <noreply@webyan.sa>",
            to: [body.email],
            subject: "تم استلام طلب العرض التوضيحي - ويبيان",
            html: `
              <!DOCTYPE html>
              <html dir="rtl" lang="ar">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ويبيان</h1>
                      <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 14px;">حلول رقمية للقطاع غير الربحي</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">مرحباً ${body.contact_name}،</h2>
                      <p style="color: #475569; line-height: 1.8; margin: 0 0 20px 0;">
                        شكراً لاهتمامكم بخدمات ويبيان. تم استلام طلب العرض التوضيحي الخاص بكم وسيقوم فريقنا بالتواصل معكم في أقرب وقت.
                      </p>
                      
                      <table width="100%" style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <tr>
                          <td>
                            <p style="color: #64748b; margin: 0 0 8px 0; font-size: 12px;">رقم الطلب</p>
                            <p style="color: #0ea5e9; margin: 0; font-size: 18px; font-weight: bold;">${submission.submission_number}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <table width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0;">
                        <tr>
                          <td style="padding: 15px; border-bottom: 1px solid #e2e8f0;">
                            <strong style="color: #1e293b;">الجهة:</strong>
                            <span style="color: #475569;">${body.organization_name}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 15px; border-bottom: 1px solid #e2e8f0;">
                            <strong style="color: #1e293b;">نوع الاهتمام:</strong>
                            <span style="color: #475569;">${interestTypeLabels[body.interest_type || ''] || 'غير محدد'}</span>
                          </td>
                        </tr>
                        ${body.city ? `
                        <tr>
                          <td style="padding: 15px;">
                            <strong style="color: #1e293b;">المدينة:</strong>
                            <span style="color: #475569;">${body.city}</span>
                          </td>
                        </tr>
                        ` : ''}
                      </table>
                      
                      <table width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin: 20px 0;" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="color: #1e293b; font-weight: bold; margin: 0 0 12px 0; font-size: 14px;">📞 تواصل معنا</p>
                            <table cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td style="padding: 6px 0;">
                                  <span style="color: #475569; font-size: 14px;">✉️ البريد الإلكتروني: </span>
                                  <a href="mailto:hala@webyan.sa" style="color: #0ea5e9; text-decoration: none; font-size: 14px;">hala@webyan.sa</a>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0;">
                                  <span style="color: #475569; font-size: 14px;">📱 الجوال: </span>
                                  <a href="tel:+966538553400" style="color: #0ea5e9; text-decoration: none; font-size: 14px;" dir="ltr">+966 53 855 3400</a>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0;">
                                  <span style="color: #475569; font-size: 14px;">💬 واتساب: </span>
                                  <a href="https://wa.me/966538553400" style="color: #0ea5e9; text-decoration: none; font-size: 14px;" dir="ltr">+966 53 855 3400</a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                        © ${new Date().getFullYear()} ويبيان - جميع الحقوق محفوظة
                      </p>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `
          })
        });

        if (!emailResponse.ok) {
          console.error('Failed to send confirmation email:', await emailResponse.text());
        }
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the request if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "تم استلام طلبك بنجاح وسنتواصل معك قريباً",
        data: {
          submission_number: submission.submission_number,
          is_new_lead: isNewLead
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error processing demo request:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "حدث خطأ غير متوقع" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
