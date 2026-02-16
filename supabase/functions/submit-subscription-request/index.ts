import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      plan_id, selected_addons = [], organization_name, contact_name,
      phone, email, entity_type, entity_category, region, address,
      page_source, utm_source, utm_campaign, utm_medium,
    } = body;

    // Validate required fields
    if (!plan_id || !organization_name?.trim() || !contact_name?.trim() || !email?.trim()) {
      return new Response(
        JSON.stringify({ error: 'جميع الحقول المطلوبة يجب أن تكون مملوءة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch plan and validate
    const { data: plan, error: planError } = await supabase
      .from('pricing_plans')
      .select('id, name, yearly_price, optional_addons, is_active, is_public')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'الباقة غير موجودة' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!plan.is_active || !plan.is_public) {
      return new Response(
        JSON.stringify({ error: 'الباقة غير متاحة حالياً' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side price calculation
    let totalAmount = plan.yearly_price;
    const validatedAddons: any[] = [];
    const planAddons = (plan.optional_addons as any[]) || [];

    for (const addon of selected_addons) {
      const found = planAddons.find((a: any) => a.id === addon.id || a.name === addon.name);
      if (found) {
        validatedAddons.push({ id: found.id, name: found.name, price: found.price });
        totalAmount += found.price;
      }
    }

    // Rate limiting: check for recent requests from same email
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentRequests } = await supabase
      .from('website_subscription_requests')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .gte('created_at', fiveMinutesAgo);

    if (recentRequests && recentRequests.length >= 3) {
      return new Response(
        JSON.stringify({ error: 'تم تجاوز الحد المسموح. الرجاء المحاولة لاحقاً' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create subscription request
    const { data: request, error: insertError } = await supabase
      .from('website_subscription_requests')
      .insert({
        plan_id: plan.id,
        plan_name: plan.name,
        plan_price: plan.yearly_price,
        selected_addons: validatedAddons,
        total_amount: totalAmount,
        organization_name: organization_name.trim(),
        contact_name: contact_name.trim(),
        phone: phone?.trim() || null,
        email: email.trim().toLowerCase(),
        entity_type: entity_type || null,
        entity_category: entity_category || null,
        region: region || null,
        address: address?.trim() || null,
        source: 'website',
        page_source: page_source || null,
        utm_source: utm_source || null,
        utm_campaign: utm_campaign || null,
        utm_medium: utm_medium || null,
      })
      .select('id, request_number')
      .single();

    if (insertError) throw insertError;

    // Create timeline entry
    await supabase
      .from('website_subscription_request_timeline')
      .insert({
        request_id: request.id,
        action: 'created',
        new_value: 'new',
        details: { plan_name: plan.name, total_amount: totalAmount },
      });

    // Send admin notification
    await supabase
      .from('admin_notifications')
      .insert({
        title: `طلب اشتراك جديد: ${organization_name.trim()}`,
        message: `طلب اشتراك في باقة ${plan.name} بقيمة ${totalAmount} ر.س`,
        type: 'subscription_request',
        link: `/admin/subscription-requests/${request.id}`,
      });

    return new Response(
      JSON.stringify({
        success: true,
        request_number: request.request_number,
        request_id: request.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error submitting subscription request:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في إرسال الطلب. الرجاء المحاولة لاحقاً' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
