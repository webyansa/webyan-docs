import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, model, messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine API endpoint and key based on provider
    let apiUrl: string;
    let apiKey: string;
    let requestBody: any;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Helper to get setting from DB
    async function getSetting(key: string): Promise<string | null> {
      const { data } = await supabaseClient
        .from("system_settings")
        .select("value")
        .eq("key", key)
        .single();
      return data?.value || null;
    }

    if (provider === "openai") {
      const key = await getSetting("ai_openai_api_key");
      if (!key) {
        return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      apiUrl = "https://api.openai.com/v1/chat/completions";
      apiKey = key;
      requestBody = {
        model: model || "gpt-4o",
        messages, // Raw - no system prompt injected
        stream: true,
      };
    } else if (provider === "gemini") {
      const key = await getSetting("ai_gemini_api_key");
      if (!key) {
        return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Use OpenAI-compatible endpoint for Gemini
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      apiKey = key;
      requestBody = {
        model: model || "gemini-2.5-flash",
        messages,
        stream: true,
      };
    } else if (provider === "lovable") {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) {
        return new Response(JSON.stringify({ error: "Lovable AI key not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiKey = key;
      requestBody = {
        model: model || "google/gemini-2.5-flash",
        messages,
        stream: true,
      };
    } else {
      return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startTime = Date.now();

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${provider} API error:`, response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please check your billing." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `${provider} error: ${errorText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add response time header
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "text/event-stream");
    headers.set("X-Response-Start-Ms", startTime.toString());

    return new Response(response.body, { headers });
  } catch (e) {
    console.error("raw-chat-test error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
