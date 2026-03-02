import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const platformTemplates: Record<string, string> = {
  x: "اكتب تغريدة قصيرة قوية (أقصى 280 حرف) مع سطرين جذابين + CTA واضح + 3-5 هاشتاقات مناسبة.",
  linkedin: "اكتب منشور LinkedIn احترافي مقسم لفقرات: Hook جذاب في السطر الأول، ثم قيمة مضافة، ثم CTA. أضف 3-5 هاشتاقات مهنية.",
  instagram: "اكتب Caption لإنستغرام بأسلوب بسيط وجذاب مع Emojis مناسبة + CTA + 10-15 هاشتاق.",
  website: "اكتب محتوى ويب احترافي مع عنوان جذاب وفقرات منظمة + CTA واضح.",
};

const toneMap: Record<string, string> = {
  formal: "رسمي واحترافي",
  friendly: "ودود وقريب من القارئ",
  strong: "تسويقي قوي ومقنع",
  educational: "تعليمي ومعلوماتي",
};

function buildPrompt(input: {
  platform: string;
  tone: string;
  language: string;
  idea_description: string;
  product_name?: string;
  audience?: string;
  value_prop?: string;
  landing_url?: string;
  refine_field?: string;
  previous_result?: any;
}) {
  const lang = input.language === "en" ? "English" : "العربية";
  const platformGuide = platformTemplates[input.platform] || platformTemplates.x;
  const toneName = toneMap[input.tone] || toneMap.formal;

  const systemPrompt = `أنت خبير تسويق رقمي متخصص في قطاع الجمعيات والمنظمات غير الربحية في السعودية.
مهمتك توليد محتوى تسويقي احترافي.

قواعد مهمة:
- لا تكتب أرقام أو وعود غير مؤكدة
- لا تكتب محتوى حساس أو مخالف
- ركّز على قطاع الجمعيات في السعودية ونبرة احترافية
- اللغة المطلوبة: ${lang}
- النبرة: ${toneName}
- المنصة: ${input.platform}
- ${platformGuide}`;

  let userPrompt = `فكرة المحتوى: ${input.idea_description}`;
  if (input.product_name) userPrompt += `\nاسم المنتج/الخدمة: ${input.product_name}`;
  if (input.audience) userPrompt += `\nالجمهور المستهدف: ${input.audience}`;
  if (input.value_prop) userPrompt += `\nالميزة الرئيسية: ${input.value_prop}`;
  if (input.landing_url) userPrompt += `\nرابط صفحة الهبوط: ${input.landing_url}`;

  if (input.refine_field && input.previous_result) {
    userPrompt += `\n\nالمحتوى السابق الذي تم توليده:\n${JSON.stringify(input.previous_result, null, 2)}\n\nأعد توليد حقل "${input.refine_field}" فقط بجودة أفضل وإبداع أكثر، مع الحفاظ على باقي الحقول كما هي.`;
  }

  return { systemPrompt, userPrompt };
}

const toolDef = {
  type: "function" as const,
  function: {
    name: "generate_marketing_content",
    description: "Generate structured marketing content",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "عنوان المنشور" },
        post_text: { type: "string", description: "نص المنشور الكامل" },
        design_text: { type: "string", description: "النص الذي سيظهر داخل التصميم (عناوين، شعارات، نصوص رئيسية في الصورة)" },
        design_brief: { type: "string", description: "وصف/أفكار التصميم للمصمم" },
        cta: { type: "string", description: "دعوة للإجراء (CTA)" },
        hashtags: { type: "array", items: { type: "string" }, description: "قائمة الهاشتاقات" },
      },
      required: ["title", "post_text", "design_text", "design_brief", "cta", "hashtags"],
      additionalProperties: false,
    },
  },
};

async function getAISettings(supabaseAdmin: any) {
  const keys = ['ai_default_provider', 'ai_openai_api_key', 'ai_gemini_api_key', 'ai_default_model_openai', 'ai_default_model_gemini'];
  const { data } = await supabaseAdmin.from('system_settings').select('key, value').in('key', keys);
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.key] = r.value; });
  return {
    defaultProvider: map.ai_default_provider || 'lovable',
    openaiKey: map.ai_openai_api_key || '',
    geminiKey: map.ai_gemini_api_key || '',
    openaiModel: map.ai_default_model_openai || 'gpt-4o',
    geminiModel: map.ai_default_model_gemini || 'gemini-2.5-flash',
  };
}

async function callLovableAI(systemPrompt: string, userPrompt: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      tools: [toolDef],
      tool_choice: { type: "function", function: { name: "generate_marketing_content" } },
    }),
  });
  return resp;
}

async function callOpenAI(systemPrompt: string, userPrompt: string, apiKey: string, model: string) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      tools: [toolDef],
      tool_choice: { type: "function", function: { name: "generate_marketing_content" } },
    }),
  });
  return resp;
}

async function callGemini(systemPrompt: string, userPrompt: string, apiKey: string, model: string) {
  // Use Gemini via OpenAI-compatible endpoint
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      tools: [toolDef],
      tool_choice: { type: "function", function: { name: "generate_marketing_content" } },
    }),
  });
  return resp;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { provider: requestedProvider, platform, tone, language, idea_description, product_name, audience, value_prop, landing_url, refine_field, previous_result } = body;

    if (!idea_description) {
      return new Response(JSON.stringify({ error: "وصف فكرة المحتوى مطلوب" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get AI settings from DB
    const aiSettings = await getAISettings(supabaseAdmin);
    const provider = requestedProvider || aiSettings.defaultProvider || 'lovable';

    const { systemPrompt, userPrompt } = buildPrompt({
      platform: platform || "x", tone: tone || "formal", language: language || "ar",
      idea_description, product_name, audience, value_prop, landing_url, refine_field, previous_result,
    });

    let aiResponse: Response;

    if (provider === 'openai') {
      if (!aiSettings.openaiKey) {
        return new Response(JSON.stringify({ error: "مفتاح OpenAI غير مُعدّ. يرجى إضافته من الإعدادات." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      aiResponse = await callOpenAI(systemPrompt, userPrompt, aiSettings.openaiKey, aiSettings.openaiModel);
    } else if (provider === 'gemini') {
      if (!aiSettings.geminiKey) {
        return new Response(JSON.stringify({ error: "مفتاح Gemini غير مُعدّ. يرجى إضافته من الإعدادات." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      aiResponse = await callGemini(systemPrompt, userPrompt, aiSettings.geminiKey, aiSettings.geminiModel);
    } else {
      // Default: Lovable AI
      aiResponse = await callLovableAI(systemPrompt, userPrompt);
    }

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error(`AI error [${provider}]:`, status, errText);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الاستخدام، يرجى المحاولة لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للذكاء الاصطناعي" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 401) {
        return new Response(JSON.stringify({ error: `مفتاح API غير صالح لـ ${provider}. تحقق من الإعدادات.` }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "فشل الاتصال بنموذج الذكاء الاصطناعي" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let result: any;

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      try { result = JSON.parse(content); } catch {
        result = { title: "", post_text: content, design_text: "", design_brief: "", cta: "", hashtags: [] };
      }
    }

    // Save to audit log
    try {
      let userId: string | null = null;
      if (authHeader) {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
        const { data: { user } } = await userClient.auth.getUser();
        userId = user?.id || null;
      }

      await supabaseAdmin.from("ai_generations").insert({
        user_id: userId,
        provider,
        prompt_inputs: { platform, tone, language, idea_description, product_name, audience, value_prop, landing_url, refine_field },
        result,
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-marketing-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
