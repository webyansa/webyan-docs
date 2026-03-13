
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function maskApiKey(key: string | null): string {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return key.slice(0, 6) + "****" + key.slice(-4);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Use service role for DB operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ─── SAVE ───
    if (action === "save") {
      const { provider_name, api_key, base_url, default_model, enabled } = body;
      if (!provider_name) {
        return new Response(JSON.stringify({ error: "provider_name required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const upsertData: Record<string, unknown> = {
        provider_name,
        base_url: base_url || "https://openrouter.ai/api/v1",
        default_model: default_model || null,
        enabled: enabled ?? false,
        updated_at: new Date().toISOString(),
      };

      // Only update api_key if provided (not empty)
      if (api_key && api_key.trim()) {
        upsertData.api_key_encrypted = api_key.trim();
      }

      const { data, error } = await adminClient
        .from("ai_providers")
        .upsert(upsertData, { onConflict: "provider_name" })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          provider: { ...data, api_key_encrypted: maskApiKey(data.api_key_encrypted) },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── GET STATUS ───
    if (action === "get-status") {
      const { provider_name } = body;
      const { data, error } = await adminClient
        .from("ai_providers")
        .select("*")
        .eq("provider_name", provider_name || "OpenRouter")
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!data) {
        return new Response(
          JSON.stringify({ provider: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          provider: { ...data, api_key_encrypted: maskApiKey(data.api_key_encrypted) },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── TEST CONNECTION ───
    if (action === "test-connection") {
      const { provider_name } = body;
      const { data: provider } = await adminClient
        .from("ai_providers")
        .select("*")
        .eq("provider_name", provider_name || "OpenRouter")
        .single();

      if (!provider?.api_key_encrypted) {
        return new Response(
          JSON.stringify({ error: "لم يتم حفظ مفتاح API بعد" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const startTime = Date.now();
      let testResult = "";
      let newStatus = "error";
      let statusCode = 0;

      try {
        const res = await fetch(`${provider.base_url}/models`, {
          headers: { Authorization: `Bearer ${provider.api_key_encrypted}` },
        });
        statusCode = res.status;
        const text = await res.text();

        if (res.ok) {
          newStatus = "active";
          testResult = "Connection successful";
        } else {
          testResult = `Error ${res.status}: ${text.slice(0, 200)}`;
        }
      } catch (e) {
        testResult = `Network error: ${e.message}`;
      }

      const latency = Date.now() - startTime;

      await adminClient
        .from("ai_providers")
        .update({
          status: newStatus,
          last_tested_at: new Date().toISOString(),
          last_test_result: testResult,
          last_test_latency_ms: latency,
          updated_at: new Date().toISOString(),
        })
        .eq("id", provider.id);

      return new Response(
        JSON.stringify({
          success: newStatus === "active",
          status: newStatus,
          result: testResult,
          latency_ms: latency,
          status_code: statusCode,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── FETCH MODELS ───
    if (action === "fetch-models") {
      const { provider_name } = body;
      const { data: provider } = await adminClient
        .from("ai_providers")
        .select("*")
        .eq("provider_name", provider_name || "OpenRouter")
        .single();

      if (!provider?.api_key_encrypted) {
        return new Response(
          JSON.stringify({ error: "لم يتم حفظ مفتاح API بعد" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const res = await fetch(`${provider.base_url}/models`, {
          headers: { Authorization: `Bearer ${provider.api_key_encrypted}` },
        });

        if (!res.ok) {
          const text = await res.text();
          return new Response(
            JSON.stringify({ error: `Error ${res.status}: ${text.slice(0, 200)}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const json = await res.json();
        const models = (json.data || []).map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          context_length: m.context_length,
          pricing: m.pricing,
        }));

        // Cache models
        await adminClient
          .from("ai_providers")
          .update({
            models_cache: { models, fetched_at: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          })
          .eq("id", provider.id);

        return new Response(
          JSON.stringify({ success: true, models, count: models.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ error: e.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── TEST GENERATION ───
    if (action === "test-generation") {
      const { provider_name } = body;
      const { data: provider } = await adminClient
        .from("ai_providers")
        .select("*")
        .eq("provider_name", provider_name || "OpenRouter")
        .single();

      if (!provider?.api_key_encrypted) {
        return new Response(
          JSON.stringify({ error: "لم يتم حفظ مفتاح API بعد" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const model = provider.default_model || "openai/gpt-3.5-turbo";
      const startTime = Date.now();
      let statusCode = 0;
      let responseSnippet = "";

      try {
        const res = await fetch(`${provider.base_url}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.api_key_encrypted}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              { role: "user", content: "اكتب كلمة ناجح فقط" },
            ],
            max_tokens: 50,
          }),
        });

        statusCode = res.status;
        const text = await res.text();
        responseSnippet = text.slice(0, 500);
        const latency = Date.now() - startTime;

        if (res.ok) {
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }
          const content = parsed?.choices?.[0]?.message?.content || "";

          await adminClient
            .from("ai_providers")
            .update({
              status: "active",
              last_tested_at: new Date().toISOString(),
              last_test_result: `Generation OK: "${content.slice(0, 100)}"`,
              last_test_latency_ms: latency,
              updated_at: new Date().toISOString(),
            })
            .eq("id", provider.id);

          return new Response(
            JSON.stringify({
              success: true,
              content,
              model,
              latency_ms: latency,
              status_code: statusCode,
              response_snippet: responseSnippet,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          await adminClient
            .from("ai_providers")
            .update({
              status: "error",
              last_tested_at: new Date().toISOString(),
              last_test_result: `Error ${statusCode}: ${text.slice(0, 200)}`,
              last_test_latency_ms: latency,
              updated_at: new Date().toISOString(),
            })
            .eq("id", provider.id);

          return new Response(
            JSON.stringify({
              success: false,
              error: `Error ${statusCode}`,
              model,
              latency_ms: latency,
              status_code: statusCode,
              response_snippet: responseSnippet,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        const latency = Date.now() - startTime;
        return new Response(
          JSON.stringify({
            success: false,
            error: e.message,
            model,
            latency_ms: latency,
            status_code: 0,
            response_snippet: "",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
