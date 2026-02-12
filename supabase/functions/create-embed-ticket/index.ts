import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-embed-origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmbedTicketRequest {
  token?: string;
  apiKey?: string;
  subject: string;
  description: string;
  category?: string;
  priority?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  screenshotUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: EmbedTicketRequest = await req.json();
    const origin = req.headers.get('x-embed-origin') || req.headers.get('origin') || '';
    const sourceDomain = origin.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];

    const key = body.apiKey || body.token;

    if (!key || !body.subject || !body.description) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let organizationId: string;
    let organizationName: string;
    let contactEmail: string | null = null;
    let websiteUrl: string | null = null;
    let tokenName = '';

    // New API Key flow
    if (key.startsWith('wbyn_')) {
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('client_api_keys')
        .select(`
          *,
          organization:client_organizations(id, name, contact_email, contact_phone, website_url, logo_url)
        `)
        .eq('api_key', key)
        .eq('is_active', true)
        .single();

      if (apiKeyError || !apiKeyData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or inactive API Key', code: 'INVALID_KEY' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check allowed domains
      if (apiKeyData.allowed_domains && apiKeyData.allowed_domains.length > 0) {
        const isAllowed = apiKeyData.allowed_domains.some((domain: string) => {
          if (domain.startsWith('*.')) {
            const baseDomain = domain.slice(2);
            return sourceDomain === baseDomain || sourceDomain.endsWith('.' + baseDomain);
          }
          return domain === sourceDomain || domain === origin;
        });
        if (!isAllowed) {
          return new Response(
            JSON.stringify({ success: false, error: 'Origin not allowed', code: 'DOMAIN_NOT_ALLOWED' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      organizationId = apiKeyData.organization_id;
      organizationName = apiKeyData.organization?.name || 'غير معروف';
      contactEmail = apiKeyData.organization?.contact_email || null;
      websiteUrl = apiKeyData.organization?.website_url || null;
      tokenName = apiKeyData.name;

      // Update usage
      await supabase
        .from('client_api_keys')
        .update({
          usage_count: (apiKeyData.usage_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', apiKeyData.id);
    } else {
      // Legacy embed_tokens flow
      const { data: embedToken, error: tokenError } = await supabase
        .from('embed_tokens')
        .select(`
          *,
          organization:client_organizations(id, name, contact_email, contact_phone, website_url, logo_url)
        `)
        .eq('token', key)
        .eq('is_active', true)
        .single();

      if (tokenError || !embedToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or inactive token', code: 'INVALID_TOKEN' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (embedToken.expires_at && new Date(embedToken.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token has expired', code: 'TOKEN_EXPIRED' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (embedToken.allowed_domains && embedToken.allowed_domains.length > 0) {
        const isAllowed = embedToken.allowed_domains.some((domain: string) => {
          if (domain.startsWith('*.')) {
            const baseDomain = domain.slice(2);
            return sourceDomain === baseDomain || sourceDomain.endsWith('.' + baseDomain);
          }
          return domain === sourceDomain || domain === origin;
        });
        if (!isAllowed) {
          return new Response(
            JSON.stringify({ success: false, error: 'Origin not allowed', code: 'DOMAIN_NOT_ALLOWED' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      organizationId = embedToken.organization_id;
      organizationName = embedToken.organization?.name || 'غير معروف';
      contactEmail = embedToken.organization?.contact_email || null;
      websiteUrl = embedToken.organization?.website_url || null;
      tokenName = embedToken.name;

      await supabase
        .from('embed_tokens')
        .update({
          usage_count: (embedToken.usage_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', embedToken.id);
    }

    const ticketNumber = 'EMB-' + Math.floor(100000 + Math.random() * 900000);

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        ticket_number: ticketNumber,
        subject: body.subject.slice(0, 200),
        description: body.description.slice(0, 5000),
        category: body.category || 'technical',
        priority: body.priority || 'medium',
        organization_id: organizationId,
        guest_name: body.contactName?.slice(0, 100) || organizationName || 'عميل مضمن',
        guest_email: body.contactEmail?.slice(0, 255) || contactEmail || null,
        website_url: body.websiteUrl?.slice(0, 500) || websiteUrl || null,
        screenshot_url: body.screenshotUrl || null,
        source: 'embed',
        source_domain: sourceDomain || null,
        status: 'open',
        admin_note: `📥 تذكرة من نموذج مضمن\nالعميل: ${organizationName}\nالنطاق: ${sourceDomain || 'غير محدد'}\nالمفتاح: ${tokenName}${body.screenshotUrl ? '\n📎 يوجد صورة مرفقة' : ''}`
      })
      .select()
      .single();

    if (ticketError) {
      console.error('Error creating ticket:', ticketError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create ticket' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticketNumber: ticket.ticket_number,
        ticketId: ticket.id,
        organizationName,
        message: 'تم إنشاء التذكرة بنجاح'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-embed-ticket:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
