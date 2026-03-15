import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APPROVED_MODELS = [
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "anthropic/claude-sonnet-4.5",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-oss-20b:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

const FALLBACK_MODEL = "openai/gpt-4o-mini";
const MAX_RETRIES = 2;
const RETRYABLE_STATUS_CODES = [500, 502, 503, 504, 408];

// ─── System Prompts ───
const SYSTEM_PROMPTS: Record<string, string> = {
  ask: `أنت مساعد رسمي لمنصة ويبيان.
أجب فقط بناءً على المعرفة المسترجعة أدناه.
إذا لم تكن المعلومات الموجودة في المراجع كافية للإجابة، فاذكر بوضوح أن المعلومات غير كافية.
لا تخترع مزايا أو أسعار أو سياسات أو بيانات غير موجودة.
لا تستخدم أي معرفة خارج المراجع المسترجعة.

عند الإجابة:
- استخدم المعلومات من المراجع المرفقة فقط
- إذا وجدت الإجابة في المراجع، قدمها بشكل واضح ومنظم
- أشر إلى رقم المرجع عند الاقتباس [مرجع X]
- إذا كانت المعلومات جزئية، اذكر ما تعرفه وأوضح ما ينقص`,

  support: `أنت مساعد دعم فني احترافي لمنصة ويبيان.
اكتب ردًا واضحًا ومهنيًا وودودًا، مع الالتزام بسياسات ويبيان ونبرة العلامة.
لا تقدم وعودًا غير مؤكدة. لا تخترع ميزات أو أسعار.
استخدم المعرفة المسترجعة أدناه لصياغة الرد.
إذا لم تكن المعلومات كافية، اذكر ذلك وقدم رداً عاماً احترافياً.

عند كتابة الرد:
- ابدأ بالترحيب المناسب
- اشرح الحل أو المعلومة بوضوح
- اختم بعرض المزيد من المساعدة
- التزم بالنبرة المطلوبة (ودي/رسمي/مختصر)`,

  analyze: `أنت محلل تذاكر دعم لمنصة ويبيان.
حلل التذكرة المقدمة واستخرج:
1. **ملخص المشكلة**: وصف مختصر وواضح
2. **نوع المشكلة**: (تقني / استفسار / شكوى / طلب ميزة / أخرى)
3. **درجة الأولوية**: (عاجلة / عالية / متوسطة / منخفضة) مع التبرير
4. **المطلوب من الفريق**: الإجراءات المطلوبة داخلياً
5. **المطلوب من العميل**: ما يحتاج العميل لفعله
6. **اقتراح الرد الأولي**: رد مختصر مقترح
7. **الخطوة التالية**: ما يجب فعله بعد ذلك

استخدم المعرفة المسترجعة لتقديم تحليل دقيق مبني على سياسات ويبيان.`,

  suggest: `أنت مساعد تشغيل داخلي لمنصة ويبيان.
بناءً على الحالة الحالية والمعرفة المسترجعة، اقترح الإجراءات المناسبة التالية.

عند الاقتراح:
- رتب الاقتراحات حسب الأولوية
- قدم سبب كل اقتراح
- اذكر المخاطر المحتملة إن وجدت
- لا تقترح إجراءات خارج صلاحيات المنصة
- كن عملياً ومحدداً`,
};

// ─── Category boost ───
const CATEGORY_BOOST_RULES = [
  { keywords: ['سعر','أسعار','اشتراك','خطة','خطط','باقة','باقات','تكلفة','رسوم'], boost_categories: ['pricing','plans','faq','facts'] },
  { keywords: ['دعم','مشكلة','مساعدة','تذكرة','تواصل'], boost_categories: ['support','faq'] },
  { keywords: ['سياسة','شروط','أحكام','استرجاع','إلغاء'], boost_categories: ['policies'] },
  { keywords: ['ممنوع','صياغة','لا تقل','أسلوب','كتابة','نبرة'], boost_categories: ['do_not_say','writing_style','ai_guidelines'] },
  { keywords: ['موقع','تصميم','قالب','تطوير','برمجة'], boost_categories: ['product','modules','architecture'] },
];

function extractKeywordsHeuristic(q: string): string[] {
  const stopWords = ['ماهي','ما','هي','هو','هل','كيف','لماذا','أين','متى','في','من','إلى','على','عن','مع','هذا','هذه','تلك','ذلك','التي','الذي','كل','أي','أو','و','ان','لا','لم','لن','قد','منصة','لمنصة','ويبيان'];
  return q.replace(/[؟?!.,،؛:]/g, '').split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w.toLowerCase()));
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok || !RETRYABLE_STATUS_CODES.includes(response.status)) return response;
      if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      else return response;
    } catch (e) {
      if ((e as Error).name === "AbortError" && attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Request failed after retries");
}

// ─── RAG Pipeline ───
async function runRAGPipeline(
  adminClient: any,
  openaiKey: string,
  question: string,
  top_k: number,
  category_filter?: string,
) {
  // Embedding
  const allKeywords = extractKeywordsHeuristic(question);
  const embResp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: [question] }),
  });
  if (!embResp.ok) throw new Error("فشل في توليد embedding");
  const embData = await embResp.json();
  const embedding = embData.data[0]?.embedding;
  if (!embedding) throw new Error("No embedding returned");

  // Vector search
  const { data: vectorResults } = await adminClient.rpc("match_knowledge_chunks", {
    query_embedding: `[${embedding.join(",")}]`,
    match_threshold: 0.2,
    match_count: 15,
    filter_category: category_filter || null,
  });
  const vectorMap = new Map<string, any>();
  for (const m of (vectorResults || [])) vectorMap.set(m.id, m);

  // Keyword search
  const kwMap = new Map<string, { keyword_matches: number; matched_keywords: string[] }>();
  if (allKeywords.length > 0) {
    const { data: kwResults } = await adminClient.rpc("keyword_search_knowledge_chunks", {
      search_keywords: allKeywords, max_results: 20, filter_category: category_filter || null,
    });
    for (const kr of (kwResults || [])) {
      kwMap.set(kr.id, { keyword_matches: kr.keyword_matches, matched_keywords: kr.matched_keywords });
      if (!vectorMap.has(kr.id)) {
        const { data: cd } = await adminClient.from("knowledge_chunks")
          .select("id, document_id, chunk_index, title, section_path, category, content, token_estimate, priority, metadata_json")
          .eq("id", kr.id).single();
        if (cd) vectorMap.set(cd.id, { ...cd, similarity: 0.15 });
      }
    }
  }

  // Scoring
  const boostedCategories = new Set<string>();
  const lowerQ = question.toLowerCase();
  for (const rule of CATEGORY_BOOST_RULES) {
    if (rule.keywords.some(k => lowerQ.includes(k))) {
      rule.boost_categories.forEach(c => boostedCategories.add(c));
    }
  }

  const candidates = Array.from(vectorMap.values());
  const scored = candidates.map(c => {
    let metaBoost = 1.0;
    if (boostedCategories.has(c.category)) metaBoost *= 1.3;
    if (c.priority === 'high') metaBoost *= 1.15;
    const kwData = kwMap.get(c.id);
    const kwScore = kwData ? Math.min(kwData.keyword_matches / Math.max(allKeywords.length, 1), 1) : 0;
    const normBoost = Math.min(metaBoost - 1, 0.5);
    const finalScore = (c.similarity * 0.55) + (kwScore * 0.25) + (normBoost * 0.20);
    return {
      ...c,
      similarity_score: Math.round(c.similarity * 1000) / 1000,
      keyword_score: Math.round(kwScore * 1000) / 1000,
      final_score: Math.round(finalScore * 1000) / 1000,
      matched_keywords: kwData?.matched_keywords || [],
    };
  });

  scored.sort((a, b) => b.final_score - a.final_score);
  const topChunks = scored.slice(0, top_k);
  const topScores = topChunks.slice(0, 3).map(r => r.final_score);
  const confidence = topScores.length > 0 ? topScores.reduce((a, b) => a + b, 0) / topScores.length : 0;

  // Get doc names
  const docIds = [...new Set(topChunks.map(m => m.document_id))];
  let docNames: Record<string, string> = {};
  if (docIds.length > 0) {
    const { data: docs } = await adminClient.from("knowledge_documents").select("id, title, original_file_name").in("id", docIds);
    docNames = Object.fromEntries((docs || []).map((d: any) => [d.id, d.original_file_name || d.title]));
  }

  const sources = topChunks.map(m => ({
    id: m.id, title: m.title, section_path: m.section_path, category: m.category,
    content: m.content, token_estimate: m.token_estimate, priority: m.priority,
    similarity_score: m.similarity_score, final_score: m.final_score,
    matched_keywords: m.matched_keywords,
    source_file: docNames[m.document_id] || "",
  }));

  return { sources, confidence, isGrounded: topChunks.length > 0 && confidence >= 0.3 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Verify user is staff or admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userType } = await adminClient.rpc("get_user_type", { _user_id: userId });
    const ut = userType?.[0];
    if (!ut || !['admin', 'staff', 'editor'].includes(ut.user_type)) {
      return new Response(JSON.stringify({ error: "غير مصرح - للموظفين والمسؤولين فقط" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      action, // ask | support | analyze | suggest
      message,
      session_id,
      model,
      // Support-specific
      client_message,
      tone,
      request_type,
      // Ticket-specific
      ticket_title,
      ticket_description,
      ticket_messages,
      // Suggest-specific
      context_description,
      // History for multi-turn
      conversation_history,
    } = body;

    if (!action || !['ask', 'support', 'analyze', 'suggest'].includes(action)) {
      return new Response(JSON.stringify({ error: "action مطلوب: ask, support, analyze, suggest" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine the question for retrieval
    let retrievalQuestion = message || "";
    if (action === "support") {
      retrievalQuestion = client_message || message || "";
    } else if (action === "analyze") {
      retrievalQuestion = `${ticket_title || ""} ${ticket_description || ""}`.trim();
    } else if (action === "suggest") {
      retrievalQuestion = context_description || message || "";
    }

    if (!retrievalQuestion.trim()) {
      return new Response(JSON.stringify({ error: "الرجاء إدخال نص السؤال أو الطلب" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OpenAI key for embeddings
    const { data: openaiSetting } = await adminClient
      .from("system_settings").select("value").eq("key", "ai_openai_api_key").single();
    const openaiKey = openaiSetting?.value;
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "مفتاح OpenAI غير مُهيأ (مطلوب للـ embeddings)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OpenRouter provider
    const { data: provider } = await adminClient
      .from("ai_providers").select("*").eq("provider_name", "OpenRouter").single();
    if (!provider || !provider.enabled) {
      return new Response(JSON.stringify({ error: "مزود OpenRouter غير مفعّل" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!provider.api_key_encrypted) {
      return new Response(JSON.stringify({ error: "مفتاح API لمزود OpenRouter غير موجود" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Select model
    let selectedModel = model || FALLBACK_MODEL;
    if (!APPROVED_MODELS.includes(selectedModel)) {
      selectedModel = FALLBACK_MODEL;
    }

    const startTime = Date.now();

    // Run RAG pipeline
    const { sources, confidence, isGrounded } = await runRAGPipeline(
      adminClient, openaiKey, retrievalQuestion, 5,
    );

    if (sources.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "لم يتم العثور على معلومات كافية في قاعدة المعرفة للإجابة على هذا السؤال.",
        sources: [],
        debug: { chunks_count: 0, confidence: 0, model: selectedModel },
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context from sources
    const chunksContext = sources.map((s: any, i: number) =>
      `[مرجع ${i + 1}] العنوان: ${s.title}\nالتصنيف: ${s.category}\nالمسار: ${s.section_path}\nالمصدر: ${s.source_file}\n---\n${s.content}`
    ).join("\n\n");

    // Build system prompt based on action
    let systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS.ask;
    systemPrompt += `\n\nالمعرفة المسترجعة:\n${chunksContext}`;

    // Build user message based on action
    let userMessage = message || "";
    if (action === "support") {
      userMessage = `رسالة العميل:\n${client_message || ""}\n\nالنبرة المطلوبة: ${tone || "ودي"}\nنوع الطلب: ${request_type || "عام"}\n\n${message ? `ملاحظات إضافية: ${message}` : ""}`;
    } else if (action === "analyze") {
      const msgs = ticket_messages ? `\n\nالرسائل السابقة:\n${ticket_messages}` : "";
      userMessage = `عنوان التذكرة: ${ticket_title || ""}\n\nوصف العميل:\n${ticket_description || ""}${msgs}`;
    } else if (action === "suggest") {
      userMessage = `وصف الحالة الحالية:\n${context_description || message || ""}`;
    }

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history for multi-turn
    if (conversation_history && Array.isArray(conversation_history)) {
      for (const msg of conversation_history.slice(-10)) {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: userMessage });

    // Check prompt size
    const promptSize = estimateTokens(messages.map(m => m.content).join(" "));
    if (promptSize > 15000) {
      return new Response(JSON.stringify({
        success: false,
        error: "حجم الطلب كبير جداً. يرجى تقليل النص.",
        debug: { prompt_size: promptSize },
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log pre-request
    console.log(`[ai-copilot] action=${action} model=${selectedModel} chunks=${sources.length} prompt_tokens~${promptSize}`);

    // Call OpenRouter (streaming)
    const baseUrl = (provider.base_url || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
    const endpoint = `${baseUrl}/chat/completions`;

    const orResponse = await fetchWithRetry(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.api_key_encrypted}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        stream: true,
      }),
    });

    if (!orResponse.ok) {
      const errorText = await orResponse.text();
      console.error(`[ai-copilot] OpenRouter error ${orResponse.status}:`, errorText.slice(0, 500));
      return new Response(JSON.stringify({
        success: false,
        error: `خطأ من المزود (${orResponse.status}): ${errorText.slice(0, 200)}`,
        sources,
        debug: { model: selectedModel, status: orResponse.status, chunks_count: sources.length, confidence },
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latencyMs = Date.now() - startTime;

    // Create/update session and save messages in background
    const sessionPromise = (async () => {
      try {
        let sid = session_id;
        if (!sid) {
          const titleText = (retrievalQuestion || "جلسة جديدة").slice(0, 80);
          const { data: newSession } = await adminClient.from("ai_copilot_sessions").insert({
            user_id: userId, title: titleText, mode: action, model_used: selectedModel,
          }).select("id").single();
          sid = newSession?.id;
        } else {
          await adminClient.from("ai_copilot_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sid);
        }

        if (sid) {
          // Save user message
          await adminClient.from("ai_copilot_messages").insert({
            session_id: sid, role: "user", content: userMessage, model_used: selectedModel,
          });
        }
        return sid;
      } catch (e) {
        console.error("[ai-copilot] session save error:", e);
        return null;
      }
    })();

    // Stream response with metadata header
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "text/event-stream");
    headers.set("X-Copilot-Sources", encodeURIComponent(JSON.stringify(sources)));
    headers.set("X-Copilot-Confidence", String(Math.round(confidence * 100)));
    headers.set("X-Copilot-Model", selectedModel);
    headers.set("X-Copilot-Latency", String(latencyMs));
    headers.set("X-Copilot-Grounded", String(isGrounded));
    headers.set("X-Copilot-Chunks", String(sources.length));
    headers.set("X-Copilot-Prompt-Size", String(promptSize));

    // We need to intercept the stream to save the assistant message
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = orResponse.body!.getReader();
    const decoder = new TextDecoder();
    let fullAnswer = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Extract content for saving
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ") && line.trim() !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullAnswer += content;
              } catch {}
            }
          }
          await writer.write(value);
        }
      } catch (e) {
        console.error("[ai-copilot] stream error:", e);
      } finally {
        await writer.close();
        // Save assistant message
        const sid = await sessionPromise;
        if (sid && fullAnswer) {
          try {
            await adminClient.from("ai_copilot_messages").insert({
              session_id: sid,
              role: "assistant",
              content: fullAnswer,
              sources_json: sources,
              retrieval_json: { confidence, chunks_count: sources.length, prompt_size: promptSize },
              model_used: selectedModel,
              latency_ms: latencyMs,
            });
          } catch (e) {
            console.error("[ai-copilot] save assistant msg error:", e);
          }
        }
      }
    })();

    // Add session_id to response headers if created
    sessionPromise.then(sid => {
      if (sid) {
        // Can't modify headers after response is sent, but we encode session in a special SSE event
      }
    });

    return new Response(readable, { headers });
  } catch (e) {
    console.error("[ai-copilot] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
