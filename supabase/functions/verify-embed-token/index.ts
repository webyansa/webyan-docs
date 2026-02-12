import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-embed-origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { token, apiKey } = await req.json();
    const origin = req.headers.get('x-embed-origin') || req.headers.get('origin') || '';
    
    // Determine which key to use
    const key = apiKey || token;

    if (!key) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Token or API Key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if it's a new-style API key (starts with wbyn_)
    if (key.startsWith('wbyn_')) {
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('client_api_keys')
        .select(`
          *,
          organization:client_organizations(id, name, logo_url, contact_email)
        `)
        .eq('api_key', key)
        .eq('is_active', true)
        .single();

      if (apiKeyError || !apiKeyData) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Invalid or inactive API Key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check allowed domains
      if (apiKeyData.allowed_domains && apiKeyData.allowed_domains.length > 0) {
        const originDomain = origin.replace(/^https?:\/\//, '').split('/')[0];
        const isAllowed = apiKeyData.allowed_domains.some((domain: string) => {
          if (domain.startsWith('*.')) {
            const baseDomain = domain.slice(2);
            return originDomain === baseDomain || originDomain.endsWith('.' + baseDomain);
          }
          return domain === originDomain || domain === origin;
        });

        if (!isAllowed) {
          return new Response(
            JSON.stringify({ valid: false, error: 'Origin not allowed' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Update usage stats
      await supabase
        .from('client_api_keys')
        .update({
          usage_count: (apiKeyData.usage_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', apiKeyData.id);

      // Fetch primary contact info
      let contactName = '';
      let contactEmail = '';
      const { data: primaryContact } = await supabase
        .from('client_accounts')
        .select('full_name, email')
        .eq('organization_id', apiKeyData.organization_id)
        .eq('is_primary_contact', true)
        .eq('is_active', true)
        .maybeSingle();

      if (primaryContact) {
        contactName = primaryContact.full_name || '';
        contactEmail = primaryContact.email || '';
      } else {
        const { data: anyContact } = await supabase
          .from('client_accounts')
          .select('full_name, email')
          .eq('organization_id', apiKeyData.organization_id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (anyContact) {
          contactName = anyContact.full_name || '';
          contactEmail = anyContact.email || '';
        }
      }

      return new Response(
        JSON.stringify({
          valid: true,
          organization: apiKeyData.organization,
          apiKeyId: apiKeyData.id,
          organizationId: apiKeyData.organization_id,
          contactName,
          contactEmail: contactEmail || apiKeyData.organization?.contact_email || ''
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Legacy token flow (embed_tokens table)
    const { data: embedToken, error } = await supabase
      .from('embed_tokens')
      .select(`
        *,
        organization:client_organizations(id, name, logo_url, contact_email)
      `)
      .eq('token', key)
      .eq('is_active', true)
      .single();

    if (error || !embedToken) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or inactive token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (embedToken.expires_at && new Date(embedToken.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Token has expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check allowed domains
    if (embedToken.allowed_domains && embedToken.allowed_domains.length > 0) {
      const originDomain = origin.replace(/^https?:\/\//, '').split('/')[0];
      const isAllowed = embedToken.allowed_domains.some((domain: string) => {
        if (domain.startsWith('*.')) {
          const baseDomain = domain.slice(2);
          return originDomain === baseDomain || originDomain.endsWith('.' + baseDomain);
        }
        return domain === originDomain || domain === origin;
      });

      if (!isAllowed) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Origin not allowed' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update usage stats
    await supabase
      .from('embed_tokens')
      .update({
        usage_count: (embedToken.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', embedToken.id);

    return new Response(
      JSON.stringify({
        valid: true,
        organization: embedToken.organization,
        tokenId: embedToken.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying embed token:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
