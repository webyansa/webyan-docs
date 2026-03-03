import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_LIMITS: Record<string, number> = {
  X: 280,
  LinkedIn: 1200,
  Instagram: 2200,
  WhatsApp: 1000,
};

const BANNED_WORDS = ["الأفضل", "مضمون 100%", "حل سحري", "خرافي"];

const SYSTEM_PROMPT = `أنت مساعد تسويق رسمي لمنصة ويبيان (Webyan) — منصة سعودية متخصصة في بناء المواقع والمنصات الرقمية للقطاع غير الربحي (جمعيات، مؤسسات، كيانات أهلية).

**تعليمات صارمة:**
1. استخدم أداة file_search دائمًا قبل الإجابة للبحث في ملفات المعرفة المتاحة.
2. ممنوع اختراع مزايا أو أرقام غير موجودة في ملفات المعرفة.
3. التزم بقالب الإخراج JSON المحدد بدقة.
4. الكلمات الممنوعة: "الأفضل"، "مضمون 100%"، "حل سحري"، "خرافي" — لا تستخدمها أبداً.
5. ركّز على: الحوكمة، الشفافية، إبراز الأثر، بناء المواقع والمنصات.
6. النبرة يجب أن تتوافق مع المطلوب (رسمي / تنفيذي / سعودي أبيض).

**قالب الإخراج المطلوب (JSON فقط):**
{
  "title": "عنوان المحتوى",
  "design_copy": {
    "headline": "العنوان الرئيسي للتصميم",
    "subheadline": "العنوان الفرعي",
    "cta_text": "نص زر الدعوة للإجراء"
  },
  "post_copy": {
    "primary_text": "نص المنشور الكامل",
    "hashtags": ["#هاشتاق1", "#هاشتاق2"],
    "links": ["https://webyan.sa"]
  },
  "meta": {
    "platform": "X",
    "tone": "رسمي",
    "compliance": {
      "within_char_limit": true,
      "used_file_search": true,
      "no_banned_words": true
    }
  }
}`;

const MONTHLY_PLAN_SYSTEM_PROMPT = `أنت مساعد تسويق رسمي لمنصة ويبيان (Webyan) — منصة سعودية متخصصة في بناء المواقع والمنصات الرقمية للقطاع غير الربحي.

**مهمتك:** إنشاء خطة محتوى شهرية متكاملة بناءً على التوجيه المُقدم.

**تعليمات صارمة:**
1. استخدم أداة file_search دائمًا للبحث في ملفات المعرفة.
2. ممنوع اختراع مزايا أو أرقام.
3. الكلمات الممنوعة: "الأفضل"، "مضمون 100%"، "حل سحري"، "خرافي".
4. وزّع المنشورات بشكل ذكي على أيام الفترة المحددة (تجنب يوم الجمعة فقط، السبت مسموح).
5. نوّع بين المنصات (X, LinkedIn, Instagram, WhatsApp) والنبرات.
6. كل منشور يجب أن يكون مختلفاً ويخدم هدفاً واضحاً.
7. اجعل الأوقات مناسبة لكل منصة (X: 10am-1pm, LinkedIn: 8am-10am, Instagram: 7pm-9pm, WhatsApp: 9am-12pm).

**قالب الإخراج المطلوب (JSON فقط):**
{
  "plan_title": "عنوان الخطة",
  "plan_description": "وصف مختصر للخطة",
  "posts": [
    {
      "title": "عنوان المنشور",
      "platform": "X",
      "tone": "رسمي",
      "content_type": "tweet",
      "publish_date": "2026-03-15",
      "publish_time": "10:00",
      "channels": ["X"],
      "design_copy": {
        "headline": "العنوان الرئيسي",
        "subheadline": "العنوان الفرعي",
        "cta_text": "نص الزر"
      },
      "post_copy": {
        "primary_text": "نص المنشور الكامل",
        "hashtags": ["#هاشتاق1"],
        "links": ["https://webyan.sa"]
      }
    }
  ]
}`;

function buildUserPrompt(input: any): string {
  const parts: string[] = [];
  parts.push(`المنصة المستهدفة: ${input.platform}`);
  parts.push(`نبرة المحتوى: ${input.tone}`);
  parts.push(`نوع المحتوى: ${input.content_type || "Post"}`);
  if (input.campaign?.name) parts.push(`اسم الحملة: ${input.campaign.name}`);
  if (input.campaign?.objective) parts.push(`هدف الحملة: ${input.campaign.objective}`);
  parts.push(`الجمهور المستهدف: ${input.audience || "جمعيات أهلية وكيانات غير ربحية"}`);
  parts.push(`الرسالة الرئيسية: ${input.key_message || "بناء مواقع ومنصات رقمية"}`);
  parts.push(`دعوة للإجراء (CTA): ${input.cta || "تعرف أكثر"}`);
  parts.push(`رابط الهبوط: ${input.landing_url || "https://webyan.sa"}`);
  if (input.demos?.plus) parts.push(`رابط Plus: ${input.demos.plus}`);
  if (input.demos?.basic) parts.push(`رابط Basic: ${input.demos.basic}`);
  parts.push(`فكرة المحتوى: ${input.idea}`);

  const charLimit = PLATFORM_LIMITS[input.platform] || 280;
  parts.push(`\nقواعد المنصة:`);
  parts.push(`- الحد الأقصى لنص primary_text: ${charLimit} حرف (بدون احتساب الروابط والهاشتاقات)`);
  parts.push(`- أقصى عدد هاشتاقات: ${input.constraints?.max_hashtags || 3}`);
  parts.push(`- الكلمات الممنوعة: ${BANNED_WORDS.join("، ")}`);

  parts.push(`\nأعد الإخراج بصيغة JSON فقط وفق القالب المحدد في تعليمات النظام.`);
  return parts.join("\n");
}

function buildMonthlyPlanPrompt(input: any): string {
  const parts: string[] = [];
  parts.push(`التوجيه / الهدف الرئيسي: ${input.directive}`);
  if (input.start_date && input.end_date) {
    parts.push(`الفترة المستهدفة: من ${input.start_date} إلى ${input.end_date}`);
  } else {
    parts.push(`الشهر المستهدف: ${input.target_month || "الشهر الحالي"}`);
  }
  parts.push(`عدد المنشورات المطلوب: ${input.post_count || 12}`);
  parts.push(`الجمهور المستهدف: ${input.audience || "جمعيات أهلية وكيانات غير ربحية"}`);
  if (input.platforms?.length) parts.push(`المنصات: ${input.platforms.join("، ")}`);
  else parts.push(`المنصات: X، LinkedIn، Instagram، WhatsApp`);
  if (input.landing_url) parts.push(`رابط الهبوط: ${input.landing_url}`);
  parts.push(`\nقواعد مهمة:`);
  parts.push(`- وزّع المنشورات على أيام الفترة المحددة بشكل متوازن (2-3 منشورات أسبوعياً)`);
  parts.push(`- نوّع بين المنصات والنبرات`);
  parts.push(`- content_type: tweet لـ X، article لـ LinkedIn، design لـ Instagram، message لـ WhatsApp`);
  parts.push(`- تجنب يوم الجمعة فقط (السبت مسموح)`);
  parts.push(`- الكلمات الممنوعة: ${BANNED_WORDS.join("، ")}`);
  parts.push(`\nأعد الإخراج بصيغة JSON فقط وفق القالب المحدد في تعليمات النظام.`);
  return parts.join("\n");
}

async function getAISettings(supabaseAdmin: any) {
  const keys = [
    "ai_mode",
    "ai_openai_api_key",
    "ai_vector_store_id",
    "ai_assistant_id",
    "ai_temperature",
    "ai_top_p",
  ];
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("key, value")
    .in("key", keys);
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => {
    map[r.key] = r.value;
  });
  return {
    mode: map.ai_mode || "responses",
    apiKey: map.ai_openai_api_key || "",
    vectorStoreId: map.ai_vector_store_id || "",
    assistantId: map.ai_assistant_id || "",
    temperature: parseFloat(map.ai_temperature || "0.5"),
    topP: parseFloat(map.ai_top_p || "0.9"),
  };
}

function normalizeResult(result: any): any {
  // Normalize flat responses into expected nested schema
  if (!result.post_copy && (result.primary_text || result.content)) {
    return {
      title: result.title || result.headline || "",
      design_copy: {
        headline: result.headline || "",
        subheadline: result.subheadline || "",
        cta_text: result.CTA || result.cta_text || result.cta || "",
      },
      post_copy: {
        primary_text: result.primary_text || result.content || "",
        hashtags: result.hashtags || [],
        links: result.links || [result.landing_page, result.landing_url].filter(Boolean),
      },
      meta: result.meta || {},
    };
  }
  return result;
}

async function callResponsesAPI(
  settings: any,
  systemPrompt: string,
  userPrompt: string
): Promise<{ result: any; usedFileSearch: boolean; rawResponse: any }> {
  const body: any = {
    model: "gpt-4.1",
    temperature: settings.temperature,
    top_p: settings.topP,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    text: { format: { type: "json_object" } },
  };

  // Add file_search tool if vector store configured
  if (settings.vectorStoreId) {
    body.tools = [{ type: "file_search", vector_store_ids: [settings.vectorStoreId] }];
  }

  console.log("Calling OpenAI Responses API...");

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI Responses API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();

  // Extract output text
  let outputText = "";
  let usedFileSearch = false;

  if (data.output) {
    for (const item of data.output) {
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

  console.log("OpenAI response received, output length:", outputText.length);

  let result: any;
  try {
    result = JSON.parse(outputText);
  } catch {
    result = { title: "", design_copy: {}, post_copy: { primary_text: outputText, hashtags: [], links: [] }, meta: {} };
  }

  result = normalizeResult(result);

  return { result, usedFileSearch, rawResponse: data };
}

async function callAssistantsAPI(
  settings: any,
  userPrompt: string
): Promise<{ result: any; usedFileSearch: boolean; rawResponse: any }> {
  if (!settings.assistantId) {
    throw new Error("Assistant ID غير محدد في الإعدادات");
  }

  const headers = {
    Authorization: `Bearer ${settings.apiKey}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "assistants=v2",
  };

  // 1. Create thread
  const threadResp = await fetch("https://api.openai.com/v1/threads", {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  if (!threadResp.ok) throw new Error(`Failed to create thread: ${await threadResp.text()}`);
  const thread = await threadResp.json();

  // 2. Add message
  const msgResp = await fetch(
    `https://api.openai.com/v1/threads/${thread.id}/messages`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ role: "user", content: userPrompt }),
    }
  );
  if (!msgResp.ok) throw new Error(`Failed to add message: ${await msgResp.text()}`);

  // 3. Create run
  const runResp = await fetch(
    `https://api.openai.com/v1/threads/${thread.id}/runs`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        assistant_id: settings.assistantId,
        response_format: { type: "json_object" },
      }),
    }
  );
  if (!runResp.ok) throw new Error(`Failed to create run: ${await runResp.text()}`);
  let run = await runResp.json();

  // 4. Poll for completion
  let attempts = 0;
  while (run.status !== "completed" && run.status !== "failed" && attempts < 60) {
    await new Promise((r) => setTimeout(r, 1000));
    const pollResp = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
      { headers }
    );
    run = await pollResp.json();
    attempts++;
  }

  if (run.status === "failed") {
    throw new Error(`Assistant run failed: ${run.last_error?.message || "unknown"}`);
  }

  // 5. Get run steps to check tool usage
  let usedFileSearch = false;
  const stepsResp = await fetch(
    `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}/steps`,
    { headers }
  );
  if (stepsResp.ok) {
    const steps = await stepsResp.json();
    for (const step of steps.data || []) {
      if (step.type === "tool_calls") {
        for (const tc of step.step_details?.tool_calls || []) {
          if (tc.type === "file_search") usedFileSearch = true;
        }
      }
    }
  }

  // 6. Get messages
  const msgsResp = await fetch(
    `https://api.openai.com/v1/threads/${thread.id}/messages?order=desc&limit=1`,
    { headers }
  );
  const msgs = await msgsResp.json();
  const assistantMsg = msgs.data?.[0];
  let outputText = "";
  if (assistantMsg?.content) {
    for (const c of assistantMsg.content) {
      if (c.type === "text") outputText = c.text?.value || "";
    }
  }

  let result: any;
  try {
    result = JSON.parse(outputText);
  } catch {
    result = { title: "", design_copy: {}, post_copy: { primary_text: outputText, hashtags: [], links: [] }, meta: {} };
  }

  result = normalizeResult(result);

  return { result, usedFileSearch, rawResponse: { run, thread_id: thread.id } };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    
    // Check if this is a monthly plan request
    if (body.action === "monthly_plan") {
      return await handleMonthlyPlan(req, body, supabaseAdmin, supabaseUrl, startTime);
    }

    const {
      platform,
      tone,
      content_type,
      campaign,
      audience,
      key_message,
      cta,
      landing_url,
      demos,
      constraints,
      idea,
    } = body;

    if (!idea) {
      return new Response(
        JSON.stringify({ error: "وصف فكرة المحتوى مطلوب (idea)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get AI settings from DB
    const settings = await getAISettings(supabaseAdmin);

    if (!settings.apiKey) {
      return new Response(
        JSON.stringify({
          error: "مفتاح OpenAI API غير مُعدّ. يرجى إضافته من إعدادات الذكاء الاصطناعي.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userPrompt = buildUserPrompt({
      platform: platform || "X",
      tone: tone || "رسمي",
      content_type,
      campaign,
      audience,
      key_message,
      cta,
      landing_url,
      demos,
      constraints,
      idea,
    });

    let result: any;
    let usedFileSearch = false;
    let modelUsed: string;

    if (settings.mode === "assistants") {
      modelUsed = "gpt-4-0125-preview";
      const resp = await callAssistantsAPI(settings, userPrompt);
      result = resp.result;
      usedFileSearch = resp.usedFileSearch;
    } else {
      modelUsed = "gpt-4.1";
      const resp = await callResponsesAPI(settings, SYSTEM_PROMPT, userPrompt);
      result = resp.result;
      usedFileSearch = resp.usedFileSearch;
    }

    // Validate compliance
    const primaryText = result?.post_copy?.primary_text || "";
    const charLimit = PLATFORM_LIMITS[platform || "X"] || 280;
    const withinCharLimit = primaryText.length <= charLimit;
    const noBannedWords = !BANNED_WORDS.some((w) => primaryText.includes(w));

    // Enrich meta compliance
    if (!result.meta) result.meta = {};
    if (!result.meta.compliance) result.meta.compliance = {};
    result.meta.platform = platform || "X";
    result.meta.tone = tone || "رسمي";
    result.meta.compliance.within_char_limit = withinCharLimit;
    result.meta.compliance.used_file_search = usedFileSearch;
    result.meta.compliance.no_banned_words = noBannedWords;

    const latencyMs = Date.now() - startTime;

    // Log to ai_generation_logs
    try {
      let userId: string | null = null;
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        userId = user?.id || null;
      }

      await supabaseAdmin.from("ai_generation_logs").insert({
        user_id: userId,
        module: "marketing",
        platform: platform || "X",
        tone: tone || "رسمي",
        content_type: content_type || "Post",
        request_payload: body,
        response_payload: result,
        used_file_search: usedFileSearch,
        model_used: modelUsed,
        mode_used: settings.mode,
        latency_ms: latencyMs,
        status: "success",
      });
    } catch (logErr) {
      console.error("Audit log error:", logErr);
    }

    console.log("Returning result with keys:", Object.keys(result));
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const latencyMs = Date.now() - startTime;
    console.error("ai-generate-content error:", e);

    // Try to log error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
      await supabaseAdmin.from("ai_generation_logs").insert({
        module: "marketing",
        status: "fail",
        error_message: e instanceof Error ? e.message : "Unknown error",
        latency_ms: latencyMs,
      });
    } catch {}

    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "خطأ غير متوقع",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleMonthlyPlan(
  req: Request,
  body: any,
  supabaseAdmin: any,
  supabaseUrl: string,
  startTime: number
) {
  const { directive, target_month, start_date, end_date, post_count, audience, platforms, landing_url, campaign_id } = body;

  if (!directive) {
    return new Response(
      JSON.stringify({ error: "التوجيه الرئيسي مطلوب (directive)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const settings = await getAISettings(supabaseAdmin);
  if (!settings.apiKey) {
    return new Response(
      JSON.stringify({ error: "مفتاح OpenAI API غير مُعدّ." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userPrompt = buildMonthlyPlanPrompt({
    directive,
    target_month,
    start_date,
    end_date,
    post_count: post_count || 12,
    audience,
    platforms,
    landing_url,
  });

  let result: any;
  let usedFileSearch = false;
  const modelUsed = "gpt-4.1";

  const resp = await callResponsesAPI(settings, MONTHLY_PLAN_SYSTEM_PROMPT, userPrompt);
  result = resp.result;
  usedFileSearch = resp.usedFileSearch;

  // Normalize posts
  const posts = result.posts || result.plan || [];
  for (let i = 0; i < posts.length; i++) {
    posts[i] = normalizeResult(posts[i]);
  }

  // Save posts to content_calendar if requested
  const savedPosts: any[] = [];
  if (body.auto_save !== false && posts.length > 0) {
    for (const post of posts) {
      const payload = {
        campaign_id: campaign_id || null,
        title: post.title || `منشور ${savedPosts.length + 1}`,
        content_type: post.content_type || "design",
        publish_date: post.publish_date || null,
        publish_time: post.publish_time || null,
        post_text: post.post_copy?.primary_text || post.primary_text || null,
        hashtags: (post.post_copy?.hashtags || post.hashtags || []).join(" "),
        cta: post.design_copy?.cta_text || post.cta_text || null,
        design_text: [post.design_copy?.headline, post.design_copy?.subheadline].filter(Boolean).join("\n") || null,
        design_notes: post.design_copy?.cta_text ? `CTA: ${post.design_copy.cta_text}` : null,
        channels: post.channels || [post.platform || "X"],
        status: "draft",
        design_status: "draft",
      };

      const { data: saved, error } = await supabaseAdmin
        .from("content_calendar")
        .insert(payload)
        .select("id")
        .single();

      if (!error && saved) {
        savedPosts.push({ ...payload, id: saved.id });
      }
    }
  }

  const latencyMs = Date.now() - startTime;

  // Log
  try {
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || null;
    }

    await supabaseAdmin.from("ai_generation_logs").insert({
      user_id: userId,
      module: "marketing_monthly_plan",
      content_type: "monthly_plan",
      request_payload: body,
      response_payload: { plan_title: result.plan_title, post_count: posts.length },
      used_file_search: usedFileSearch,
      model_used: modelUsed,
      mode_used: "responses",
      latency_ms: latencyMs,
      status: "success",
    });
  } catch (logErr) {
    console.error("Audit log error:", logErr);
  }

  return new Response(
    JSON.stringify({
      plan_title: result.plan_title || "خطة محتوى شهرية",
      plan_description: result.plan_description || "",
      posts_count: posts.length,
      saved_count: savedPosts.length,
      posts: posts,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
