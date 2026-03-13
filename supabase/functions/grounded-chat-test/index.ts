
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Category boost rules (same as retrieval pipeline) ───
const CATEGORY_BOOST_RULES = [
  { keywords: ['سعر','أسعار','اشتراك','خطة','خطط','باقة','باقات','pricing','price','plan','subscription','تكلفة','رسوم'], boost_categories: ['pricing','plans','faq','facts'] },
  { keywords: ['دعم','مشكلة','مساعدة','تذكرة','help','support','issue','تواصل'], boost_categories: ['support','faq'] },
  { keywords: ['سياسة','شروط','أحكام','policy','terms','استرجاع','إلغاء'], boost_categories: ['policies'] },
  { keywords: ['ممنوع','صياغة','لا تقل','أسلوب','كتابة','style','tone','نبرة'], boost_categories: ['do_not_say','writing_style','ai_guidelines'] },
  { keywords: ['موقع','تصميم','قالب','تطوير','برمجة','website','design'], boost_categories: ['product','modules','architecture'] },
];

function detectIntentHeuristic(q: string): string {
  const lower = q.toLowerCase();
  for (const rule of CATEGORY_BOOST_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      if (rule.boost_categories.includes('pricing')) return 'pricing';
      if (rule.boost_categories.includes('support')) return 'support';
      if (rule.boost_categories.includes('policies')) return 'policies';
      if (rule.boost_categories.includes('do_not_say')) return 'style';
    }
  }
  return 'general';
}

function extractKeywordsHeuristic(q: string): { ar: string[]; en: string[] } {
  const stopWords = ['ماهي','ما','هي','هو','هل','كيف','لماذا','أين','متى','في','من','إلى','على','عن','مع','هذا','هذه','تلك','ذلك','التي','الذي','كل','أي','أو','و','ان','لا','لم','لن','قد','بأن','وهل','كم','منصة','لمنصة','ويبيان','webyan'];
  const words = q.replace(/[؟?!.,،؛:]/g, '').split(/\s+/).filter(w => w.length > 1);
  const ar: string[] = [];
  const en: string[] = [];
  for (const w of words) {
    const lower = w.toLowerCase();
    if (stopWords.includes(lower)) continue;
    if (/^[a-zA-Z]+$/.test(w)) en.push(lower);
    else ar.push(w);
  }
  return { ar, en };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("No auth header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify admin using getUser
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) {
      console.error("Not admin:", userId);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ─── GROUNDED CHAT TEST ───
    if (action === "test") {
      const { question, model, top_k = 5, category_filter, search_mode = "hybrid_rerank" } = body;
      if (!question) {
        return new Response(JSON.stringify({ error: "السؤال مطلوب" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const totalStart = Date.now();
      const timings: Record<string, number> = {};

      // ── Step 1: Get OpenAI key for embeddings ──
      const { data: settingData } = await adminClient
        .from("system_settings").select("value").eq("key", "ai_openai_api_key").single();
      const openaiKey = settingData?.value;
      if (!openaiKey) {
        return new Response(JSON.stringify({ error: "مفتاح OpenAI API غير مُعد في إعدادات النظام (مطلوب للـ embeddings)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Step 2: Query Rewriting ──
      const stage1Start = Date.now();
      let rewrittenQuery = question;
      let subQueries: string[] = [];
      let keywordsAr: string[] = [];
      let keywordsEn: string[] = [];
      let detectedIntent = detectIntentHeuristic(question);
      let queryRewriteUsedAI = false;

      if (search_mode === "hybrid_rerank") {
        try {
          const rewriteResp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `You are a search query optimizer for an Arabic knowledge base about "Webyan" (ويبيان) platform.
Given a user question, return ONLY valid JSON (no markdown):
{
  "rewritten_query": "optimized version",
  "sub_queries": ["sub1", "sub2"],
  "keywords_ar": ["كلمة1"],
  "keywords_en": ["keyword1"],
  "detected_intent": "pricing|support|policies|style|general"
}`
                },
                { role: "user", content: question }
              ],
              temperature: 0.3, max_tokens: 500,
            }),
          });
          if (rewriteResp.ok) {
            const rd = await rewriteResp.json();
            const content = rd.choices?.[0]?.message?.content || "";
            try {
              const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
              rewrittenQuery = parsed.rewritten_query || question;
              subQueries = parsed.sub_queries || [];
              keywordsAr = parsed.keywords_ar || [];
              keywordsEn = parsed.keywords_en || [];
              detectedIntent = parsed.detected_intent || detectedIntent;
              queryRewriteUsedAI = true;
            } catch { /* fallback */ }
          }
        } catch { /* fallback */ }
      }

      if (!queryRewriteUsedAI) {
        const extracted = extractKeywordsHeuristic(question);
        keywordsAr = extracted.ar;
        keywordsEn = extracted.en;
      }
      const allKeywords = [...keywordsAr, ...keywordsEn];
      timings.query_rewrite = Date.now() - stage1Start;

      // ── Step 3: Vector Search ──
      const stage2Start = Date.now();
      const queriesToEmbed = [question];
      if (search_mode !== "vector_only" && subQueries.length > 0) {
        queriesToEmbed.push(...subQueries.slice(0, 3));
      }

      const embResp = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "text-embedding-3-small", input: queriesToEmbed }),
      });
      if (!embResp.ok) {
        return new Response(JSON.stringify({ error: "فشل في توليد embedding للسؤال" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const embData = await embResp.json();
      const embeddings = embData.data;

      const vectorMap = new Map<string, any>();
      const fetchCount = search_mode === "vector_only" ? top_k : 15;
      for (let qi = 0; qi < embeddings.length; qi++) {
        const qe = embeddings[qi]?.embedding;
        if (!qe) continue;
        const { data: matches } = await adminClient.rpc("match_knowledge_chunks", {
          query_embedding: `[${qe.join(",")}]`,
          match_threshold: 0.2,
          match_count: fetchCount,
          filter_category: category_filter || null,
        });
        for (const m of (matches || [])) {
          const existing = vectorMap.get(m.id);
          if (!existing || m.similarity > existing.similarity) vectorMap.set(m.id, m);
        }
      }
      let candidates = Array.from(vectorMap.values());
      timings.vector_search = Date.now() - stage2Start;

      // ── Step 4: Keyword Search ──
      const kwMap = new Map<string, { keyword_matches: number; matched_keywords: string[] }>();
      if (search_mode !== "vector_only" && allKeywords.length > 0) {
        const stage3Start = Date.now();
        const { data: kwResults } = await adminClient.rpc("keyword_search_knowledge_chunks", {
          search_keywords: allKeywords, max_results: 20, filter_category: category_filter || null,
        });
        for (const kr of (kwResults || [])) {
          kwMap.set(kr.id, { keyword_matches: kr.keyword_matches, matched_keywords: kr.matched_keywords });
        }
        if (kwResults) {
          for (const kr of kwResults) {
            if (!vectorMap.has(kr.id)) {
              const { data: cd } = await adminClient.from("knowledge_chunks")
                .select("id, document_id, chunk_index, title, section_path, category, content, token_estimate, priority, metadata_json")
                .eq("id", kr.id).single();
              if (cd) candidates.push({ ...cd, similarity: 0.15 });
            }
          }
        }
        timings.keyword_search = Date.now() - stage3Start;
      }

      // ── Step 5: Scoring & Reranking ──
      const boostedCategories = new Set<string>();
      const lowerQ = question.toLowerCase();
      for (const rule of CATEGORY_BOOST_RULES) {
        if (rule.keywords.some(k => lowerQ.includes(k))) {
          rule.boost_categories.forEach(c => boostedCategories.add(c));
        }
      }

      const scored = candidates.map(c => {
        let metaBoost = 1.0;
        const reasons: string[] = [];
        if (boostedCategories.has(c.category)) { metaBoost *= 1.3; reasons.push(`تطابق تصنيف: ${c.category}`); }
        if (c.priority === 'high') { metaBoost *= 1.15; reasons.push('أولوية عالية'); }
        else if (c.priority === 'low') { metaBoost *= 0.9; }
        const titleLower = (c.title || '').toLowerCase();
        if (allKeywords.some(k => titleLower.includes(k.toLowerCase()))) { metaBoost *= 1.1; reasons.push('تطابق في العنوان'); }

        const kwData = kwMap.get(c.id);
        const kwScore = kwData ? Math.min(kwData.keyword_matches / Math.max(allKeywords.length, 1), 1) : 0;
        const normBoost = Math.min(metaBoost - 1, 0.5);
        let finalScore: number;
        if (search_mode === "vector_only") finalScore = c.similarity;
        else if (search_mode === "hybrid") finalScore = (c.similarity * 0.65) + (kwScore * 0.35);
        else finalScore = (c.similarity * 0.55) + (kwScore * 0.25) + (normBoost * 0.20);

        return {
          ...c,
          similarity_score: Math.round(c.similarity * 1000) / 1000,
          keyword_score: Math.round(kwScore * 1000) / 1000,
          metadata_boost: Math.round(metaBoost * 1000) / 1000,
          final_score: Math.round(finalScore * 1000) / 1000,
          ranking_reasons: reasons,
          matched_keywords: kwData?.matched_keywords || [],
        };
      });

      scored.sort((a, b) => b.final_score - a.final_score);
      const topChunks = scored.slice(0, top_k);

      const topScores = topChunks.slice(0, 3).map(r => r.final_score);
      const confidence = topScores.length > 0 ? topScores.reduce((a, b) => a + b, 0) / topScores.length : 0;
      timings.retrieval_total = Date.now() - stage2Start;

      // Get document names
      const docIds = [...new Set(topChunks.map(m => m.document_id))];
      let docNames: Record<string, string> = {};
      if (docIds.length > 0) {
        const { data: docs } = await adminClient.from("knowledge_documents").select("id, title, original_file_name").in("id", docIds);
        docNames = Object.fromEntries((docs || []).map(d => [d.id, d.original_file_name || d.title]));
      }

      const sources = topChunks.map(m => ({
        id: m.id, title: m.title, section_path: m.section_path, category: m.category,
        content: m.content, token_estimate: m.token_estimate, priority: m.priority,
        similarity_score: m.similarity_score, keyword_score: m.keyword_score,
        metadata_boost: m.metadata_boost, final_score: m.final_score,
        ranking_reasons: m.ranking_reasons, matched_keywords: m.matched_keywords,
        source_file: docNames[m.document_id] || "",
      }));

      // ── Step 6: Grounding Check ──
      const isGrounded = topChunks.length > 0 && confidence >= 0.3;
      if (!isGrounded) {
        const testRecord = {
          question, rewritten_query: rewrittenQuery, model: model || null,
          top_k, category_filter: category_filter || null, search_mode,
          final_answer: "لم يتم العثور على معلومات كافية للإجابة من قاعدة المعرفة الحالية.",
          sources_json: sources, prompt_sent: null, response_status: "no_grounding",
          latency_ms: Date.now() - totalStart, confidence_score: confidence,
          is_grounded: false,
          debug_info: { timings, rewritten_query: rewrittenQuery, sub_queries: subQueries, keywords_ar: keywordsAr, keywords_en: keywordsEn, detected_intent: detectedIntent, query_rewrite_used_ai: queryRewriteUsedAI, candidates_count: candidates.length },
        };
        await adminClient.from("grounded_chat_tests").insert(testRecord);

        return new Response(JSON.stringify({
          success: true, is_grounded: false,
          final_answer: testRecord.final_answer,
          sources, confidence, latency_ms: testRecord.latency_ms,
          debug: testRecord.debug_info,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── Step 7: Build Grounded Prompt ──
      const chunksContext = sources.map((s, i) => {
        return `[مرجع ${i + 1}] العنوان: ${s.title}\nالتصنيف: ${s.category}\nالمسار: ${s.section_path}\nالمصدر: ${s.source_file}\n---\n${s.content}`;
      }).join("\n\n");

      const systemPrompt = `أنت مساعد رسمي لمنصة ويبيان. أجب فقط بناءً على المعرفة المسترجعة أدناه. إذا لم تكن المعلومات الموجودة في المراجع كافية للإجابة، فاذكر بوضوح أن المعلومات غير كافية. لا تخترع مزايا أو أسعار أو سياسات أو بيانات غير موجودة.

عند الإجابة:
- استخدم المعلومات من المراجع المرفقة فقط
- إذا وجدت الإجابة في المراجع، قدمها بشكل واضح ومنظم
- أشر إلى رقم المرجع عند الاقتباس [مرجع X]
- إذا كانت المعلومات جزئية، اذكر ما تعرفه وأوضح ما ينقص

المعرفة المسترجعة:
${chunksContext}`;

      const fullPrompt = `${systemPrompt}\n\nسؤال المستخدم:\n${question}`;

      // ── Step 8: Get OpenRouter provider ──
      const { data: provider } = await adminClient
        .from("ai_providers").select("*").eq("provider_name", "OpenRouter").single();

      if (!provider?.api_key_encrypted || !provider.enabled) {
        return new Response(JSON.stringify({ error: "مزود OpenRouter غير مفعّل أو لم يتم حفظ مفتاح API" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const selectedModel = model || provider.default_model || "openai/gpt-4o";

      // ── Step 9: Call OpenRouter ──
      const genStart = Date.now();
      let finalAnswer = "";
      let responseStatus = "error";
      let statusCode = 0;
      let rawResponseSnippet = "";
      let tokenUsage: any = null;

      try {
        const genResp = await fetch(`${provider.base_url}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.api_key_encrypted}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: question },
            ],
            max_tokens: 1500,
            temperature: 0.3,
          }),
        });

        statusCode = genResp.status;
        const text = await genResp.text();
        rawResponseSnippet = text.slice(0, 500);

        if (genResp.ok) {
          const parsed = JSON.parse(text);
          finalAnswer = parsed.choices?.[0]?.message?.content || "";
          tokenUsage = parsed.usage || null;
          responseStatus = "success";
        } else {
          finalAnswer = `خطأ من OpenRouter: ${statusCode}`;
          responseStatus = "error";
        }
      } catch (e) {
        finalAnswer = `خطأ في الاتصال: ${(e as Error).message}`;
        responseStatus = "error";
      }

      timings.generation = Date.now() - genStart;
      timings.total = Date.now() - totalStart;

      // ── Step 10: Save to DB ──
      const debugInfoRecord = {
        timings, rewritten_query: rewrittenQuery, sub_queries: subQueries,
        keywords_ar: keywordsAr, keywords_en: keywordsEn,
        detected_intent: detectedIntent, query_rewrite_used_ai: queryRewriteUsedAI,
        candidates_count: candidates.length, model_used: selectedModel,
        status_code: statusCode, raw_response_snippet: rawResponseSnippet,
        token_usage: tokenUsage,
        boosted_categories: Array.from(boostedCategories),
      };

      const testRecord = {
        question, rewritten_query: rewrittenQuery, model: selectedModel,
        top_k, category_filter: category_filter || null, search_mode,
        final_answer: finalAnswer, sources_json: sources, prompt_sent: fullPrompt,
        response_status: responseStatus, latency_ms: timings.total,
        token_usage: tokenUsage, confidence_score: Math.round(confidence * 1000) / 1000,
        is_grounded: true, debug_info: debugInfoRecord,
      };

      await adminClient.from("grounded_chat_tests").insert(testRecord);

      return new Response(JSON.stringify({
        success: true, is_grounded: true,
        final_answer: finalAnswer, sources, confidence,
        model: selectedModel, latency_ms: timings.total, token_usage: tokenUsage,
        response_status: responseStatus, debug: debugInfoRecord,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── GET HISTORY ───
    if (action === "history") {
      const { data, error } = await adminClient
        .from("grounded_chat_tests")
        .select("id, question, model, response_status, latency_ms, is_grounded, confidence_score, sources_json, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, tests: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET SINGLE TEST ───
    if (action === "get") {
      const { test_id } = body;
      const { data, error } = await adminClient
        .from("grounded_chat_tests").select("*").eq("id", test_id).single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, test: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
