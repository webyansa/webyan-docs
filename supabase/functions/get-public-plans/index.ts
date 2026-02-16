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

    // Fetch active public plans
    const { data: plans, error: plansError } = await supabase
      .from('pricing_plans')
      .select('id, name, name_en, description, yearly_price, monthly_price, yearly_discount, features, comparison_features, optional_addons, display_badge, sort_order')
      .eq('is_active', true)
      .eq('is_public', true)
      .order('sort_order');

    if (plansError) throw plansError;

    // Fetch VAT rate
    const { data: vatSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'vat_rate')
      .single();

    return new Response(
      JSON.stringify({
        plans: plans || [],
        vat_rate: parseFloat(vatSetting?.value || '15'),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching plans:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في جلب الباقات' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
