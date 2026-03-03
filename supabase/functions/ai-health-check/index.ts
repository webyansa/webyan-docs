import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RETRIEVAL_KEYWORDS = ["بناء المواقع", "المنصات", "غير الربحي", "الحوكمة", "الشفافية", "الأثر", "جمعيات", "ويبيان"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Get settings
    const keys = ["ai_mode", "ai_openai_api_key", "ai_vector_store_id", "ai_assistant_id", "ai_temperature", "ai_top_p"];
    const { data } = await supabaseAdmin.from("system_settings").select("key, value").in("key", keys);
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { map[r.key] = r.value; });

    const apiKey = map.ai_openai_api_key || "";
    const vectorStoreId = map.ai_vector_store_id || "";
    const mode = map.ai_mode || "responses";

    const checks = {
      api_reachable: { pass: false, detail: "" },
      vector_store_reachable: { pass: false, detail: "" },
      retrieval_used: { pass: false, detail: "" },
      sample_response: "",
    };

    if (!apiKey) {
      checks.api_reachable.detail = "مفتاح OpenAI API غير مُعدّ";
      return new Response(JSON.stringify(checks), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test API reachability with a health check question
    try {
      const body: any = {
        model: "gpt-4.1",
        temperature: 0.3,
        input: [
          { role: "system", content: "أنت مساعد تسويق لمنصة ويبيان. استخدم file_search للبحث في ملفات المعرفة قبل الإجابة." },
          { role: "user", content: "عرّف ويبيان اعتمادًا على ملفات المعرفة فقط. ما هي المنصة وما قطاعها المستهدف؟" },
        ],
      };

      if (vectorStoreId) {
        body.tools = [{ type: "file_search" }];
        body.tool_resources = { file_search: { vector_store_ids: [vectorStoreId] } };
      }

      const resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        checks.api_reachable.pass = true;
        checks.api_reachable.detail = "API متاح ويستجيب";

        const responseData = await resp.json();

        // Extract text and check for file_search usage
        let outputText = "";
        let usedFileSearch = false;

        if (responseData.output) {
          for (const item of responseData.output) {
            if (item.type === "file_search_call") {
              usedFileSearch = true;
            }
            if (item.type === "message" && item.content) {
              for (const c of item.content) {
                if (c.type === "output_text" || c.type === "text") {
                  outputText = c.text || "";
                }
              }
            }
          }
        }

        checks.sample_response = outputText.substring(0, 500);

        // Vector store check
        if (vectorStoreId) {
          if (usedFileSearch) {
            checks.vector_store_reachable.pass = true;
            checks.vector_store_reachable.detail = "Vector Store متصل وتم استخدام file_search";
          } else {
            checks.vector_store_reachable.detail = "Vector Store مُعدّ لكن لم يتم استدعاء file_search";
          }
        } else {
          checks.vector_store_reachable.detail = "Vector Store ID غير مُعدّ";
        }

        // Retrieval keyword check
        const matchedKeywords = RETRIEVAL_KEYWORDS.filter(k => outputText.includes(k));
        if (matchedKeywords.length >= 2) {
          checks.retrieval_used.pass = true;
          checks.retrieval_used.detail = `تم التعرف على ${matchedKeywords.length} كلمات مفتاحية: ${matchedKeywords.join("، ")}`;
        } else {
          checks.retrieval_used.detail = `تم العثور على ${matchedKeywords.length} كلمة مفتاحية فقط من ${RETRIEVAL_KEYWORDS.length}`;
        }
      } else {
        const errText = await resp.text();
        checks.api_reachable.detail = `خطأ ${resp.status}: ${errText.substring(0, 200)}`;
      }
    } catch (apiErr) {
      checks.api_reachable.detail = `خطأ اتصال: ${apiErr instanceof Error ? apiErr.message : "unknown"}`;
    }

    return new Response(JSON.stringify(checks), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-health-check error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
