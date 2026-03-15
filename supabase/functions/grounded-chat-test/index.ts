
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Approved models list ───
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

// Retryable status codes
const RETRYABLE_STATUS_CODES = [500, 502, 503, 504, 408];
const MAX_RETRIES = 2;
const MAX_PROMPT_TOKENS_ESTIMATE = 15000;

type StageFailed = "openrouter_request" | "retrieval" | "prompt_builder" | "validation";

// ─── Error types ───
type ErrorType =
  | "api_key_missing"
  | "invalid_api_key"
  | "model_not_found"
  | "provider_unavailable"
  | "rate_limit"
  | "timeout"
  | "malformed_request"
  | "empty_retrieval"
  | "prompt_too_large"
  | "provider_error"
  | "internal_error"
  | "model_not_approved";

function classifyError(statusCode: number): ErrorType {
  if (statusCode === 401 || statusCode === 403) return "invalid_api_key";
  if (statusCode === 404) return "model_not_found";
  if (statusCode === 429) return "rate_limit";
  if (statusCode === 408) return "timeout";
  if (statusCode === 400 || statusCode === 422) return "malformed_request";
  if (statusCode >= 500) return "provider_unavailable";
  return "provider_error";
}

function arabicErrorMessage(errorType: ErrorType): string {
  const messages: Record<ErrorType, string> = {
    api_key_missing: "المفتاح غير صالح أو غير موجود.",
    invalid_api_key: "المفتاح غير صالح أو غير موجود.",
    model_not_found: "النموذج المحدد غير متاح حاليًا.",
    provider_unavailable: "تعذر الاتصال بمزود OpenRouter.",
    rate_limit: "تم تجاوز الحد المسموح من الطلبات. حاول لاحقاً.",
    timeout: "المزود استغرق وقتًا أطول من المتوقع.",
    malformed_request: "حدث خطأ أثناء بناء الطلب.",
    empty_retrieval: "لم يتم العثور على معلومات كافية في قاعدة المعرفة.",
    prompt_too_large: "حجم الطلب يتجاوز الحد المسموح.",
    provider_error: "فشل المزود في معالجة الطلب.",
    internal_error: "حدث خطأ داخلي أثناء تنفيذ الاختبار.",
    model_not_approved: "النموذج المحدد غير موجود ضمن القائمة المعتمدة.",
  };
  return messages[errorType] || "فشل تنفيذ الطلب التشخيصي.";
}

function arabicSuggestion(errorType: ErrorType): string {
  const suggestions: Record<ErrorType, string> = {
    api_key_missing: "تحقق من API key في إعدادات المزودات.",
    invalid_api_key: "تحقق من صحة API key أو أعد إدخاله.",
    model_not_found: "اختر نموذجًا آخر من القائمة المعتمدة.",
    provider_unavailable: "حاول مرة أخرى بعد قليل أو استخدم نموذج احتياطي.",
    rate_limit: "انتظر دقيقة ثم حاول مرة أخرى.",
    timeout: "جرّب تقليل top_k أو اختر نموذجًا أسرع.",
    malformed_request: "تحقق من إعدادات الاختبار وأعد المحاولة.",
    empty_retrieval: "تأكد من وجود محتوى في قاعدة المعرفة.",
    prompt_too_large: "قلل top_k لتقليل حجم الـ prompt.",
    provider_error: "تحقق من تفاصيل المزود في Technical Error Details.",
    internal_error: "أعد المحاولة ثم راجع Technical Error Details.",
    model_not_approved: "اختر نموذجًا من القائمة المعتمدة.",
  };
  return suggestions[errorType] || "";
}

function buildErrorResponse(
  errorType: ErrorType,
  statusCode: number,
  providerMessage: string,
  model: string,
  debug: Record<string, any> = {},
  stageFailed: StageFailed = "validation",
  debugNotes: string[] = [],
) {
  const technicalDetails = {
    stage_failed: stageFailed,
    selected_model: model || null,
    retrieval_succeeded: (debug.retrieved_chunks_count ?? 0) > 0,
    retrieved_chunks_count: debug.retrieved_chunks_count ?? 0,
    prompt_size_estimate: debug.prompt_size_estimate ?? 0,
    status_code: statusCode,
    provider_error: providerMessage || null,
    raw_error_snippet: (debug.response_body_snippet || providerMessage || "").slice(0, 500),
    provider_used: debug.provider_name || "OpenRouter",
    endpoint: debug.endpoint || null,
  };

  return {
    success: false,
    error_type: errorType,
    message: arabicErrorMessage(errorType),
    suggestion: arabicSuggestion(errorType),
    stage_failed: stageFailed,
    status_code: statusCode,
    provider_message: providerMessage,
    model_used: model,
    timestamp: new Date().toISOString(),
    debug_notes: debugNotes,
    technical_details: technicalDetails,
    debug,
  };
}

// ─── Category boost rules ───
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

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for mixed Arabic/English
  return Math.ceil(text.length / 3);
}

const GROUNDED_SYSTEM_PROMPT = `أنت مساعد رسمي لمنصة ويبيان.
أجب فقط بناءً على المعرفة المسترجعة أدناه.
إذا لم تكن المعلومات الموجودة في المراجع كافية للإجابة، فاذكر بوضوح أن المعلومات غير كافية.
لا تخترع مزايا أو أسعار أو سياسات أو بيانات غير موجودة.
لا تستخدم أي معرفة خارج المراجع المسترجعة.

عند الإجابة:
- استخدم المعلومات من المراجع المرفقة فقط
- إذا وجدت الإجابة في المراجع، قدمها بشكل واضح ومنظم
- أشر إلى رقم المرجع عند الاقتباس [مرجع X]
- إذا كانت المعلومات جزئية، اذكر ما تعرفه وأوضح ما ينقص`;

// ─── Shared RAG pipeline ───
async function runRAGPipeline(
  adminClient: any,
  openaiKey: string,
  question: string,
  model: string | undefined,
  top_k: number,
  category_filter: string | undefined,
  search_mode: string,
) {
  const totalStart = Date.now();
  const timings: Record<string, number> = {};

  // ── Query Rewriting ──
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

  // ── Vector Search ──
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
    throw new Error("فشل في توليد embedding للسؤال");
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

  // ── Keyword Search ──
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

  // ── Scoring & Reranking ──
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
    docNames = Object.fromEntries((docs || []).map((d: any) => [d.id, d.original_file_name || d.title]));
  }

  const sources = topChunks.map(m => ({
    id: m.id, title: m.title, section_path: m.section_path, category: m.category,
    content: m.content, token_estimate: m.token_estimate, priority: m.priority,
    similarity_score: m.similarity_score, keyword_score: m.keyword_score,
    metadata_boost: m.metadata_boost, final_score: m.final_score,
    ranking_reasons: m.ranking_reasons, matched_keywords: m.matched_keywords,
    source_file: docNames[m.document_id] || "",
  }));

  const isGrounded = topChunks.length > 0 && confidence >= 0.3;

  // Build prompt
  const chunksContext = sources.map((s: any, i: number) => {
    return `[مرجع ${i + 1}] العنوان: ${s.title}\nالتصنيف: ${s.category}\nالمسار: ${s.section_path}\nالمصدر: ${s.source_file}\n---\n${s.content}`;
  }).join("\n\n");

  const systemPrompt = `${GROUNDED_SYSTEM_PROMPT}\n\nالمعرفة المسترجعة:\n${chunksContext}`;
  const fullPrompt = `${systemPrompt}\n\nسؤال المستخدم:\n${question}`;

  return {
    sources, confidence, isGrounded, topChunks, candidates,
    timings, rewrittenQuery, subQueries, keywordsAr, keywordsEn,
    detectedIntent, queryRewriteUsedAI, allKeywords,
    boostedCategories: Array.from(boostedCategories),
    systemPrompt, fullPrompt, totalStart,
  };
}

// ─── Validation Engine ───
function runValidationChecks(
  sources: any[],
  confidence: number,
  isGrounded: boolean,
  finalAnswer: string,
  responseStatus: string,
): { validation_status: string; validation_notes: any[] } {
  const checks: any[] = [];

  const chunksRetrieved = sources.length > 0;
  checks.push({
    check: 'chunks_retrieved', label: 'هل تم استرجاع أجزاء من قاعدة المعرفة؟',
    passed: chunksRetrieved, detail: chunksRetrieved ? `تم استرجاع ${sources.length} أجزاء` : 'لم يتم العثور على أي أجزاء', critical: true,
  });

  const sufficientChunks = sources.length >= 2;
  checks.push({
    check: 'sufficient_chunks', label: 'هل عدد الأجزاء المسترجعة كافٍ (≥2)؟',
    passed: sufficientChunks, detail: `عدد الأجزاء: ${sources.length}`, critical: false,
  });

  const confidenceOk = confidence >= 0.3;
  checks.push({
    check: 'confidence_threshold', label: 'هل نسبة الثقة في الاسترجاع كافية (≥0.3)؟',
    passed: confidenceOk, detail: `نسبة الثقة: ${Math.round(confidence * 100)}%`, critical: true,
  });

  const answerLower = (finalAnswer || '').toLowerCase();
  const sourceKeywords = sources.flatMap((s: any) => {
    const words = (s.title || '').split(/\s+/).filter((w: string) => w.length > 2);
    return words.slice(0, 5);
  });
  const matchedSourceKeywords = sourceKeywords.filter((kw: string) => answerLower.includes(kw.toLowerCase()));
  const answerRefsSource = matchedSourceKeywords.length >= Math.min(2, sourceKeywords.length);
  checks.push({
    check: 'answer_references_sources', label: 'هل الإجابة تحتوي على معلومات مرتبطة بالمصادر؟',
    passed: answerRefsSource,
    detail: answerRefsSource ? `تطابق ${matchedSourceKeywords.length} كلمات مفتاحية من المصادر` : 'لم يتم العثور على تطابق كافٍ بين الإجابة والمصادر',
    critical: false,
  });

  const hallucinationPhrases = ['بحسب معرفتي', 'أعتقد أن', 'من المحتمل', 'ربما يكون', 'لست متأكداً لكن', 'بشكل عام', 'عادةً ما', 'في العادة'];
  const hasHallucination = hallucinationPhrases.some(p => answerLower.includes(p));
  const mentionsRefs = answerLower.includes('مرجع') || answerLower.includes('[مرجع');
  const insufficientAnswer = answerLower.includes('غير كافية') || answerLower.includes('لا تتوفر');

  checks.push({
    check: 'no_hallucination', label: 'هل الإجابة خالية من مؤشرات الهلوسة؟',
    passed: !hasHallucination,
    detail: hasHallucination ? 'تم اكتشاف عبارات قد تشير إلى هلوسة' : 'لم يتم اكتشاف مؤشرات هلوسة',
    critical: true,
  });

  checks.push({
    check: 'follows_instructions', label: 'هل التزمت الإجابة بالتعليمات (عدم اختراع معلومات)؟',
    passed: mentionsRefs || insufficientAnswer || (!hasHallucination && answerRefsSource),
    detail: mentionsRefs ? 'الإجابة تشير إلى المراجع' : insufficientAnswer ? 'الإجابة تذكر عدم كفاية المعلومات' : 'تقييم تلقائي',
    critical: false,
  });

  const responseOk = responseStatus === 'success';
  checks.push({
    check: 'response_success', label: 'هل تم الحصول على رد ناجح من النموذج؟',
    passed: responseOk, detail: responseOk ? 'الرد ناجح' : `حالة الرد: ${responseStatus}`, critical: true,
  });

  const criticalFails = checks.filter((c: any) => c.critical && !c.passed);
  const nonCriticalFails = checks.filter((c: any) => !c.critical && !c.passed);

  let validation_status: string;
  if (criticalFails.length > 0) validation_status = 'failed';
  else if (nonCriticalFails.length > 0) validation_status = 'warning';
  else validation_status = 'pass';

  return { validation_status, validation_notes: checks };
}

// ─── Fetch with retry ───
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES,
): Promise<{ response: Response; retriesUsed: number }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok || !RETRYABLE_STATUS_CODES.includes(response.status)) {
        return { response, retriesUsed: attempt };
      }

      if (attempt < retries) {
        console.log(`[grounded-chat-test] retry ${attempt + 1}/${retries} بسبب status ${response.status}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      return { response, retriesUsed: attempt };
    } catch (e) {
      const isTimeout = (e as Error).name === "AbortError";
      if (isTimeout && attempt < retries) {
        console.log(`[grounded-chat-test] timeout retry ${attempt + 1}/${retries}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      if (isTimeout) {
        throw new Error("OpenRouter request timeout");
      }

      throw e;
    }
  }

  throw new Error("OpenRouter request failed after retries");
}

function validateMessages(messages: Array<{ role: string; content: string }>): { valid: boolean; reason?: string } {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, reason: "messages array is empty" };
  }

  for (const msg of messages) {
    if (!msg || typeof msg.role !== "string" || typeof msg.content !== "string") {
      return { valid: false, reason: "message item is malformed" };
    }
    if (!msg.content.trim()) {
      return { valid: false, reason: "message content is empty" };
    }
  }

  return { valid: true };
}

function extractProviderMessage(rawText: string): string {
  if (!rawText) return "";
  try {
    const parsed = JSON.parse(rawText);
    return (
      parsed?.error?.message ||
      parsed?.message ||
      parsed?.detail ||
      rawText.slice(0, 500)
    );
  } catch {
    return rawText.slice(0, 500);
  }
}

function shouldUseFallback(errorType?: ErrorType): boolean {
  if (!errorType) return false;
  return ["model_not_found", "provider_unavailable", "timeout", "provider_error"].includes(errorType);
}

type OpenRouterCallResult = {
  finalAnswer: string;
  responseStatus: "success" | "error";
  statusCode: number;
  rawResponseSnippet: string;
  tokenUsage: any;
  modelUsed: string;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  errorType?: ErrorType;
  providerMessage?: string;
  retryCount: number;
  latencyMs: number;
  requestPayloadSummary: Record<string, any>;
  providerName: string;
  baseUrl: string;
  hasApiKey: boolean;
  endpoint: string;
  errorMessage?: string;
};

async function callOpenRouter(
  provider: any,
  selectedModel: string,
  messages: Array<{ role: string; content: string }>,
  enableFallback: boolean,
  diagnostics: {
    questionLength: number;
    retrievedChunksCount: number;
    totalContextCharacters: number;
    promptSizeEstimate: number;
    topK: number;
    categoryFilter: string | null;
  },
): Promise<OpenRouterCallResult> {
  const providerName = "OpenRouter";
  const baseUrl = (provider?.base_url || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/chat/completions`;
  const hasApiKey = !!provider?.api_key_encrypted;

  const messageValidation = validateMessages(messages);
  if (!messageValidation.valid) {
    return {
      finalAnswer: "",
      responseStatus: "error",
      statusCode: 400,
      rawResponseSnippet: messageValidation.reason || "Invalid messages",
      tokenUsage: null,
      modelUsed: selectedModel,
      fallbackUsed: false,
      fallbackReason: null,
      errorType: "malformed_request",
      providerMessage: messageValidation.reason || "messages malformed",
      retryCount: 0,
      latencyMs: 0,
      requestPayloadSummary: {},
      providerName,
      baseUrl,
      hasApiKey,
      endpoint,
      errorMessage: "messages malformed",
    };
  }

  const executeRequest = async (modelToUse: string): Promise<OpenRouterCallResult> => {
    const requestBody = {
      model: modelToUse,
      messages,
      max_tokens: 1500,
      temperature: 0.3,
    };

    const promptPreview = `${messages.map((m) => m.content).join("\n\n")}`.slice(0, 500);

    const requestPayloadSummary = {
      model: modelToUse,
      number_of_messages: messages.length,
      prompt_preview: promptPreview,
      chunk_count: diagnostics.retrievedChunksCount,
      top_k: diagnostics.topK,
      category_filter: diagnostics.categoryFilter,
      temperature: 0.3,
      max_tokens: 1500,
    };

    console.log("[grounded-chat-test][openrouter:pre-request]", JSON.stringify({
      selected_model: modelToUse,
      provider_name: providerName,
      base_url: baseUrl,
      has_api_key: hasApiKey,
      question_length: diagnostics.questionLength,
      retrieved_chunks_count: diagnostics.retrievedChunksCount,
      total_context_characters: diagnostics.totalContextCharacters,
      prompt_size_estimate: diagnostics.promptSizeEstimate,
      request_payload_summary: requestPayloadSummary,
    }));

    if (!hasApiKey) {
      return {
        finalAnswer: "",
        responseStatus: "error",
        statusCode: 400,
        rawResponseSnippet: "OpenRouter API key missing",
        tokenUsage: null,
        modelUsed: modelToUse,
        fallbackUsed: false,
        fallbackReason: null,
        errorType: "api_key_missing",
        providerMessage: "OpenRouter API key missing",
        retryCount: 0,
        latencyMs: 0,
        requestPayloadSummary,
        providerName,
        baseUrl,
        hasApiKey,
        endpoint,
        errorMessage: "OpenRouter API key missing",
      };
    }

    const startedAt = Date.now();

    try {
      const { response, retriesUsed } = await fetchWithRetry(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.api_key_encrypted}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const rawText = await response.text();
      const latencyMs = Date.now() - startedAt;
      const responseBodySnippet = rawText.slice(0, 500);

      console.log("[grounded-chat-test][openrouter:post-response]", JSON.stringify({
        selected_model: modelToUse,
        response_status: response.status,
        response_body_snippet: responseBodySnippet,
        latency_ms: latencyMs,
        retries_used: retriesUsed,
      }));

      if (response.ok) {
        const parsed = JSON.parse(rawText);
        return {
          finalAnswer: parsed?.choices?.[0]?.message?.content || "",
          responseStatus: "success",
          statusCode: response.status,
          rawResponseSnippet: responseBodySnippet,
          tokenUsage: parsed?.usage || null,
          modelUsed: modelToUse,
          fallbackUsed: false,
          fallbackReason: null,
          retryCount: retriesUsed,
          latencyMs,
          requestPayloadSummary,
          providerName,
          baseUrl,
          hasApiKey,
          endpoint,
        };
      }

      const errorType = classifyError(response.status);
      const providerMessage = extractProviderMessage(rawText);

      return {
        finalAnswer: "",
        responseStatus: "error",
        statusCode: response.status,
        rawResponseSnippet: responseBodySnippet,
        tokenUsage: null,
        modelUsed: modelToUse,
        fallbackUsed: false,
        fallbackReason: null,
        errorType,
        providerMessage,
        retryCount: retriesUsed,
        latencyMs,
        requestPayloadSummary,
        providerName,
        baseUrl,
        hasApiKey,
        endpoint,
        errorMessage: providerMessage,
      };
    } catch (e) {
      const latencyMs = Date.now() - startedAt;
      const providerMessage = (e as Error)?.message || "OpenRouter request failed";
      const timeoutError = providerMessage.toLowerCase().includes("timeout");
      return {
        finalAnswer: "",
        responseStatus: "error",
        statusCode: timeoutError ? 408 : 500,
        rawResponseSnippet: providerMessage.slice(0, 500),
        tokenUsage: null,
        modelUsed: modelToUse,
        fallbackUsed: false,
        fallbackReason: null,
        errorType: timeoutError ? "timeout" : "provider_unavailable",
        providerMessage,
        retryCount: MAX_RETRIES,
        latencyMs,
        requestPayloadSummary,
        providerName,
        baseUrl,
        hasApiKey,
        endpoint,
        errorMessage: providerMessage,
      };
    }
  };

  let primaryResult = await executeRequest(selectedModel);
  if (primaryResult.responseStatus === "success") {
    return primaryResult;
  }

  if (
    enableFallback &&
    selectedModel !== FALLBACK_MODEL &&
    shouldUseFallback(primaryResult.errorType)
  ) {
    const fallbackResult = await executeRequest(FALLBACK_MODEL);
    return {
      ...fallbackResult,
      modelUsed: fallbackResult.modelUsed,
      fallbackUsed: true,
      fallbackReason: `primary_failed:${primaryResult.errorType || "provider_error"}`,
      providerMessage: fallbackResult.providerMessage || primaryResult.providerMessage,
      errorMessage: fallbackResult.errorMessage || primaryResult.errorMessage,
    };
  }

  return primaryResult;
}

// ─── Log error ───
async function logError(
  adminClient: any,
  question: string,
  model: string,
  errorType: string,
  errorMessage: string,
  providerResponse: string,
  statusCode: number,
  promptSize: number,
  chunksCount: number,
  latencyMs: number,
  fallbackUsed: boolean,
  fallbackModel: string | null,
  debugInfo: any,
) {
  try {
    await adminClient.from("grounded_chat_error_logs").insert({
      question,
      model_used: model,
      provider: "OpenRouter",
      error_type: errorType,
      error_message: errorMessage,
      provider_response: providerResponse?.slice(0, 1000),
      status_code: statusCode,
      prompt_size: promptSize,
      retrieved_chunks_count: chunksCount,
      latency_ms: latencyMs,
      fallback_used: fallbackUsed,
      fallback_model: fallbackModel,
      debug_info: debugInfo,
    });
  } catch (e) {
    console.error("Failed to log error:", e);
  }
}

function routeActionFromPath(pathname: string, method: string): string | null {
  const normalized = pathname.split("/grounded-chat-test")[1] || "/";
  if (method === "GET" && normalized === "/api/ai/providers/openrouter/health-check") return "health-check";
  if (method === "POST" && normalized === "/api/knowledge/grounded-chat/test") return "validate";
  if (method === "POST" && normalized === "/api/ai/providers/openrouter/debug-test") return "openrouter-debug-test";
  if (method === "POST" && normalized === "/api/knowledge/grounded-chat/debug-run") return "debug-run";
  if (method === "POST" && normalized === "/api/knowledge/grounded-chat/retry-last") return "retry-last";
  return null;
}

async function readJsonBody(req: Request): Promise<Record<string, any>> {
  if (req.method === "GET") return {};
  try {
    return await req.json();
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify(buildErrorResponse("internal_error", 401, "No auth header", "")), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify(buildErrorResponse("internal_error", 401, "Unauthorized", "")), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify(buildErrorResponse("internal_error", 403, "Forbidden", "")), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const body = await readJsonBody(req);
    const action = body.action || routeActionFromPath(url.pathname, req.method);

    // ═══════════════════════════════════════
    // HEALTH CHECK
    // ═══════════════════════════════════════
    if (action === "health-check") {
      const checkedAt = new Date().toISOString();
      const checks: Record<string, any> = {
        openai_key: false,
        openrouter_provider: false,
        openrouter_reachable: false,
        suggested_model: FALLBACK_MODEL,
        checked_at: checkedAt,
      };

      const { data: oaiSetting } = await adminClient
        .from("system_settings").select("value").eq("key", "ai_openai_api_key").single();
      checks.openai_key = !!oaiSetting?.value;

      const { data: provider } = await adminClient
        .from("ai_providers").select("*").eq("provider_name", "OpenRouter").single();

      const baseUrl = (provider?.base_url || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
      checks.openrouter_provider = !!(provider?.api_key_encrypted && provider.enabled);
      checks.provider_status = provider?.status || "unknown";
      checks.default_model = provider?.default_model || FALLBACK_MODEL;
      checks.base_url = baseUrl;

      if (checks.openrouter_provider && provider) {
        try {
          const testResp = await fetch(`${baseUrl}/models`, {
            method: "GET",
            headers: { Authorization: `Bearer ${provider.api_key_encrypted}` },
          });
          checks.openrouter_reachable = testResp.ok;
          checks.openrouter_status_code = testResp.status;
        } catch (e) {
          checks.openrouter_reachable = false;
          checks.openrouter_error = (e as Error).message;
        }
      }

      const allOk = checks.openai_key && checks.openrouter_provider && checks.openrouter_reachable;

      return new Response(JSON.stringify({
        success: true,
        healthy: allOk,
        provider: "OpenRouter",
        provider_status: checks.provider_status,
        last_checked: checkedAt,
        suggested_default_model: checks.default_model,
        connection_state: allOk ? "connected" : "degraded",
        checks,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ═══════════════════════════════════════
    // OPENROUTER DEBUG TEST (without retrieval)
    // ═══════════════════════════════════════
    if (action === "openrouter-debug-test") {
      const { data: provider } = await adminClient
        .from("ai_providers").select("*").eq("provider_name", "OpenRouter").single();

      if (!provider?.api_key_encrypted || !provider.enabled) {
        return new Response(JSON.stringify(buildErrorResponse(
          "api_key_missing",
          400,
          "OpenRouter provider key is missing or disabled",
          FALLBACK_MODEL,
          {
            provider_name: "OpenRouter",
            has_api_key: !!provider?.api_key_encrypted,
            endpoint: `${provider?.base_url || "https://openrouter.ai/api/v1"}/chat/completions`,
          },
          "validation",
          ["تعذر تنفيذ اختبار الاتصال المباشر بسبب إعدادات المزود."],
        )), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const systemPrompt = "You are a helpful assistant.";
      const userPrompt = "قل كلمة ناجح فقط";
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];

      const promptSizeEstimate = estimateTokens(`${systemPrompt}\n${userPrompt}`);
      const diagnostics = {
        questionLength: userPrompt.length,
        retrievedChunksCount: 0,
        totalContextCharacters: systemPrompt.length,
        promptSizeEstimate,
        topK: 0,
        categoryFilter: null,
      };

      const result = await callOpenRouter(provider, FALLBACK_MODEL, messages, false, diagnostics);

      if (result.responseStatus === "error") {
        await logError(
          adminClient,
          userPrompt,
          result.modelUsed,
          result.errorType || "provider_error",
          arabicErrorMessage(result.errorType || "provider_error"),
          result.providerMessage || result.rawResponseSnippet,
          result.statusCode,
          promptSizeEstimate,
          0,
          result.latencyMs,
          false,
          null,
          {
            stage_failed: "openrouter_request",
            selected_model: result.modelUsed,
            provider_name: result.providerName,
            base_url: result.baseUrl,
            has_api_key: result.hasApiKey,
            question_length: userPrompt.length,
            retrieved_chunks_count: 0,
            total_context_characters: systemPrompt.length,
            prompt_size_estimate: promptSizeEstimate,
            request_payload_summary: result.requestPayloadSummary,
            response_status: result.statusCode,
            response_body_snippet: result.rawResponseSnippet,
            error_message: result.errorMessage || result.providerMessage,
            latency_ms: result.latencyMs,
            endpoint: result.endpoint,
          },
        );

        return new Response(JSON.stringify(buildErrorResponse(
          result.errorType || "provider_error",
          result.statusCode || 500,
          result.providerMessage || result.rawResponseSnippet,
          result.modelUsed,
          {
            provider_name: result.providerName,
            endpoint: result.endpoint,
            response_body_snippet: result.rawResponseSnippet,
            status_code: result.statusCode,
            prompt_size_estimate: promptSizeEstimate,
            retrieved_chunks_count: 0,
          },
          "openrouter_request",
          ["فشل اختبار OpenRouter المباشر بدون retrieval."],
        )), {
          status: result.statusCode || 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "OpenRouter يعمل بشكل سليم في الاختبار المباشر.",
        stage_failed: null,
        selected_model: result.modelUsed,
        retrieved_chunks_count: 0,
        prompt_size_estimate: promptSizeEstimate,
        response_status: result.statusCode,
        provider_error: null,
        debug_notes: ["تم تنفيذ اختبار اتصال مباشر بدون retrieval بنجاح."],
        technical_details: {
          stage_failed: null,
          selected_model: result.modelUsed,
          retrieval_succeeded: true,
          retrieved_chunks_count: 0,
          prompt_size_estimate: promptSizeEstimate,
          status_code: result.statusCode,
          provider_error: null,
          raw_error_snippet: null,
          provider_used: result.providerName,
          endpoint: result.endpoint,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════
    // DEBUG RUN (full diagnostic)
    // ═══════════════════════════════════════
    if (action === "debug-run") {
      const { question, model, top_k = 5, category_filter, search_mode = "hybrid_rerank" } = body;
      const debugNotes: string[] = [];

      if (!question || typeof question !== "string" || !question.trim()) {
        return new Response(JSON.stringify(buildErrorResponse(
          "malformed_request",
          400,
          "question is required",
          model || "",
          { retrieved_chunks_count: 0, prompt_size_estimate: 0 },
          "validation",
          ["فشل التحقق المسبق: السؤال مطلوب."],
        )), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!model || typeof model !== "string" || !model.trim()) {
        return new Response(JSON.stringify(buildErrorResponse(
          "malformed_request",
          400,
          "model is required",
          "",
          { retrieved_chunks_count: 0, prompt_size_estimate: 0 },
          "validation",
          ["فشل التحقق المسبق: model فارغ."],
        )), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!APPROVED_MODELS.includes(model)) {
        return new Response(JSON.stringify(buildErrorResponse(
          "model_not_approved",
          400,
          `model '${model}' is not approved`,
          model,
          { retrieved_chunks_count: 0, prompt_size_estimate: 0 },
          "validation",
          ["النموذج خارج القائمة المعتمدة."],
        )), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: openAISetting } = await adminClient
        .from("system_settings").select("value").eq("key", "ai_openai_api_key").single();
      const openaiKey = openAISetting?.value;
      if (!openaiKey) {
        return new Response(JSON.stringify(buildErrorResponse(
          "api_key_missing",
          400,
          "OpenAI key missing for retrieval embeddings",
          model,
          { retrieved_chunks_count: 0, prompt_size_estimate: 0 },
          "validation",
          ["لا يمكن اختبار retrieval بدون مفتاح embeddings."],
        )), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: provider } = await adminClient
        .from("ai_providers").select("*").eq("provider_name", "OpenRouter").single();
      if (!provider?.api_key_encrypted || !provider.enabled) {
        return new Response(JSON.stringify(buildErrorResponse(
          "api_key_missing",
          400,
          "OpenRouter key missing or provider disabled",
          model,
          { retrieved_chunks_count: 0, prompt_size_estimate: 0, provider_name: "OpenRouter" },
          "validation",
          ["فشل التحقق المسبق: OpenRouter غير جاهز."],
        )), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let pipeline: any;
      try {
        pipeline = await runRAGPipeline(adminClient, openaiKey, question, model, top_k, category_filter, search_mode);
      } catch (e) {
        const errorText = (e as Error).message || "Retrieval pipeline failed";
        return new Response(JSON.stringify({
          success: false,
          stage_failed: "retrieval",
          selected_model: model,
          retrieved_chunks_count: 0,
          prompt_size_estimate: 0,
          response_status: 500,
          provider_error: errorText,
          debug_notes: ["فشل تنفيذ retrieval pipeline."],
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const retrievedChunksCount = pipeline.sources.length;
      const totalContextCharacters = pipeline.sources.reduce((sum: number, s: any) => sum + ((s?.content || "").length), 0);

      if (retrievedChunksCount === 0) {
        return new Response(JSON.stringify({
          success: false,
          stage_failed: "retrieval",
          selected_model: model,
          retrieved_chunks_count: 0,
          prompt_size_estimate: 0,
          response_status: 422,
          provider_error: "retrieval returned empty chunks",
          debug_notes: ["تم تنفيذ retrieval لكن لم يتم العثور على أي chunks."],
        }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const promptSizeEstimate = estimateTokens(pipeline.fullPrompt || "");
      if (promptSizeEstimate > MAX_PROMPT_TOKENS_ESTIMATE) {
        return new Response(JSON.stringify({
          success: false,
          stage_failed: "prompt_builder",
          selected_model: model,
          retrieved_chunks_count: retrievedChunksCount,
          prompt_size_estimate: promptSizeEstimate,
          response_status: 400,
          provider_error: `prompt too large (${promptSizeEstimate})`,
          debug_notes: ["تم إيقاف التنفيذ قبل OpenRouter بسبب حجم prompt كبير."],
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const messages = [
        { role: "system", content: pipeline.systemPrompt },
        { role: "user", content: question },
      ];
      const messagesValidation = validateMessages(messages);
      if (!messagesValidation.valid) {
        return new Response(JSON.stringify({
          success: false,
          stage_failed: "prompt_builder",
          selected_model: model,
          retrieved_chunks_count: retrievedChunksCount,
          prompt_size_estimate: promptSizeEstimate,
          response_status: 400,
          provider_error: messagesValidation.reason,
          debug_notes: ["فشل بناء messages قبل OpenRouter."],
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let modelForDiagnostics = model;
      if (modelForDiagnostics.includes(":free")) {
        modelForDiagnostics = FALLBACK_MODEL;
        debugNotes.push("تم استخدام نموذج بديل لأغراض التشخيص.");
      }

      const callResult = await callOpenRouter(
        provider,
        modelForDiagnostics,
        messages,
        true,
        {
          questionLength: question.length,
          retrievedChunksCount,
          totalContextCharacters,
          promptSizeEstimate,
          topK: top_k,
          categoryFilter: category_filter || null,
        },
      );

      if (callResult.responseStatus === "error") {
        await logError(
          adminClient,
          question,
          callResult.modelUsed,
          callResult.errorType || "provider_error",
          arabicErrorMessage(callResult.errorType || "provider_error"),
          callResult.providerMessage || callResult.rawResponseSnippet,
          callResult.statusCode,
          promptSizeEstimate,
          retrievedChunksCount,
          callResult.latencyMs,
          callResult.fallbackUsed,
          callResult.fallbackUsed ? FALLBACK_MODEL : null,
          {
            stage_failed: "openrouter_request",
            selected_model: callResult.modelUsed,
            provider_name: callResult.providerName,
            base_url: callResult.baseUrl,
            has_api_key: callResult.hasApiKey,
            question_length: question.length,
            retrieved_chunks_count: retrievedChunksCount,
            total_context_characters: totalContextCharacters,
            prompt_size_estimate: promptSizeEstimate,
            request_payload_summary: callResult.requestPayloadSummary,
            response_status: callResult.statusCode,
            response_body_snippet: callResult.rawResponseSnippet,
            error_message: callResult.errorMessage || callResult.providerMessage,
            latency_ms: callResult.latencyMs,
            endpoint: callResult.endpoint,
          },
        );

        return new Response(JSON.stringify({
          success: false,
          stage_failed: "openrouter_request",
          selected_model: callResult.modelUsed,
          retrieved_chunks_count: retrievedChunksCount,
          prompt_size_estimate: promptSizeEstimate,
          response_status: callResult.statusCode,
          provider_error: callResult.providerMessage || callResult.rawResponseSnippet,
          debug_notes: [
            ...debugNotes,
            callResult.fallbackUsed ? "تم استخدام نموذج بديل لأغراض التشخيص." : "",
            `OpenRouter failed with ${callResult.errorType || "provider_error"}`,
          ].filter(Boolean),
          technical_details: {
            stage_failed: "openrouter_request",
            selected_model: callResult.modelUsed,
            retrieval_succeeded: true,
            retrieved_chunks_count: retrievedChunksCount,
            prompt_size_estimate: promptSizeEstimate,
            status_code: callResult.statusCode,
            provider_error: callResult.providerMessage || null,
            raw_error_snippet: callResult.rawResponseSnippet,
            provider_used: callResult.providerName,
            endpoint: callResult.endpoint,
          },
        }), {
          status: callResult.statusCode || 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        stage_failed: null,
        selected_model: callResult.modelUsed,
        retrieved_chunks_count: retrievedChunksCount,
        prompt_size_estimate: promptSizeEstimate,
        response_status: callResult.statusCode,
        provider_error: null,
        debug_notes: [
          ...debugNotes,
          callResult.fallbackUsed ? "تم استخدام نموذج بديل لأغراض التشخيص." : "",
          "تم تنفيذ المراحل retrieval + prompt builder + OpenRouter بنجاح.",
        ].filter(Boolean),
        technical_details: {
          stage_failed: null,
          selected_model: callResult.modelUsed,
          retrieval_succeeded: true,
          retrieved_chunks_count: retrievedChunksCount,
          prompt_size_estimate: promptSizeEstimate,
          status_code: callResult.statusCode,
          provider_error: null,
          raw_error_snippet: null,
          provider_used: callResult.providerName,
          endpoint: callResult.endpoint,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════
    // RETRY LAST FAILED DEBUG
    // ═══════════════════════════════════════
    if (action === "retry-last") {
      const { data } = await adminClient
        .from("grounded_chat_error_logs")
        .select("question, model_used")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return new Response(JSON.stringify({ success: true, retry_payload: data || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════
    // LAST ERROR
    // ═══════════════════════════════════════
    if (action === "last-error") {
      const { data } = await adminClient
        .from("grounded_chat_error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return new Response(JSON.stringify({ success: true, error_log: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════
    // LAST SUCCESS
    // ═══════════════════════════════════════
    if (action === "last-success") {
      const { data } = await adminClient
        .from("grounded_chat_validations")
        .select("id, question, model, validation_status, latency_ms, confidence_score, created_at")
        .eq("response_status", "success")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return new Response(JSON.stringify({ success: true, last_success: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════
    // VALIDATE (main action)
    // ═══════════════════════════════════════
    if (action === "validate") {
      const { question, model, top_k = 5, category_filter, search_mode = "hybrid_rerank", enable_fallback = true } = body;

      // Pre-call validations
      if (!question || typeof question !== "string" || question.trim().length === 0) {
        return new Response(JSON.stringify(buildErrorResponse("malformed_request", 400, "السؤال مطلوب", "")), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check model is approved
      const selectedModel = model || FALLBACK_MODEL;
      if (!APPROVED_MODELS.includes(selectedModel)) {
        return new Response(JSON.stringify(buildErrorResponse("model_not_approved", 400, `النموذج ${selectedModel} غير معتمد`, selectedModel)), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check OpenAI key (needed for embeddings)
      const { data: settingData } = await adminClient
        .from("system_settings").select("value").eq("key", "ai_openai_api_key").single();
      const openaiKey = settingData?.value;
      if (!openaiKey) {
        return new Response(JSON.stringify(buildErrorResponse("api_key_missing", 400, "مفتاح OpenAI مطلوب للـ embeddings", selectedModel)), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check OpenRouter provider
      const { data: provider } = await adminClient
        .from("ai_providers").select("*").eq("provider_name", "OpenRouter").single();
      if (!provider?.api_key_encrypted) {
        return new Response(JSON.stringify(buildErrorResponse("api_key_missing", 400, "مفتاح OpenRouter غير موجود", selectedModel)), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!provider.enabled) {
        return new Response(JSON.stringify(buildErrorResponse("provider_unavailable", 400, "مزود OpenRouter معطل", selectedModel)), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Run RAG pipeline
      let pipeline;
      try {
        pipeline = await runRAGPipeline(adminClient, openaiKey, question, selectedModel, top_k, category_filter, search_mode);
      } catch (e) {
        const errMsg = (e as Error).message;
        await logError(adminClient, question, selectedModel, "internal_error", errMsg, "", 0, 0, 0, 0, false, null, {});
        return new Response(JSON.stringify(buildErrorResponse("internal_error", 500, errMsg, selectedModel)), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check retrieval result
      if (pipeline.sources.length === 0) {
        const latency = Date.now() - pipeline.totalStart;
        await logError(adminClient, question, selectedModel, "empty_retrieval", "لا توجد أجزاء مسترجعة", "", 0, 0, 0, latency, false, null, { timings: pipeline.timings });

        // Still save validation record
        const { validation_status, validation_notes } = runValidationChecks(
          pipeline.sources, pipeline.confidence, false,
          "لم يتم العثور على معلومات كافية في قاعدة المعرفة.", "no_grounding"
        );

        const validationRecord = {
          question, rewritten_query: pipeline.rewrittenQuery, model: selectedModel,
          top_k, category_filter: category_filter || null, search_mode,
          final_answer: "لم يتم العثور على معلومات كافية في قاعدة المعرفة.",
          sources_json: [], prompt_sent: null, response_status: "no_grounding",
          latency_ms: latency, confidence_score: pipeline.confidence,
          is_grounded: false, debug_info: { timings: pipeline.timings },
          validation_status, validation_notes,
        };
        await adminClient.from("grounded_chat_validations").insert(validationRecord);

        return new Response(JSON.stringify({
          success: true, is_grounded: false,
          final_answer: validationRecord.final_answer,
          sources: [], confidence: pipeline.confidence, model: selectedModel,
          latency_ms: latency, response_status: "no_grounding",
          debug: validationRecord.debug_info,
          validation_status, validation_notes,
          error_type: "empty_retrieval",
          message: arabicErrorMessage("empty_retrieval"),
          suggestion: arabicSuggestion("empty_retrieval"),
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check prompt size
      const promptSize = estimateTokens(pipeline.fullPrompt);
      if (promptSize > MAX_PROMPT_TOKENS_ESTIMATE) {
        return new Response(JSON.stringify(buildErrorResponse("prompt_too_large", 400, `حجم الـ prompt: ~${promptSize} tokens`, selectedModel, {
          prompt_size: promptSize, max_allowed: MAX_PROMPT_TOKENS_ESTIMATE,
        })), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let finalAnswer = "";
      let responseStatus = "no_grounding";
      let statusCode = 0;
      let rawResponseSnippet = "";
      let tokenUsage: any = null;
      let modelUsed = selectedModel;
      let fallbackUsed = false;
      let errorType: ErrorType | undefined;
      let providerMessage = "";

      if (!pipeline.isGrounded) {
        finalAnswer = "لم يتم العثور على معلومات كافية داخل قاعدة المعرفة الحالية.";
      } else {
        // Call OpenRouter with retry + fallback
        const genStart = Date.now();
        const result = await callOpenRouter(provider, selectedModel, pipeline.systemPrompt, question, enable_fallback);

        finalAnswer = result.finalAnswer;
        responseStatus = result.responseStatus;
        statusCode = result.statusCode;
        rawResponseSnippet = result.rawResponseSnippet;
        tokenUsage = result.tokenUsage;
        modelUsed = result.modelUsed;
        fallbackUsed = result.fallbackUsed;
        errorType = result.errorType;
        providerMessage = result.providerMessage || "";

        pipeline.timings.generation = Date.now() - genStart;

        // Log error if failed
        if (responseStatus === "error" && errorType) {
          await logError(
            adminClient, question, modelUsed, errorType,
            arabicErrorMessage(errorType), providerMessage, statusCode,
            promptSize, pipeline.sources.length,
            Date.now() - pipeline.totalStart, fallbackUsed,
            fallbackUsed ? FALLBACK_MODEL : null,
            { timings: pipeline.timings, model_requested: selectedModel },
          );
        }
      }

      pipeline.timings.total = Date.now() - pipeline.totalStart;

      // Run validation engine
      const { validation_status, validation_notes } = runValidationChecks(
        pipeline.sources, pipeline.confidence, pipeline.isGrounded, finalAnswer, responseStatus
      );

      const debugInfoRecord = {
        timings: pipeline.timings, rewritten_query: pipeline.rewrittenQuery, sub_queries: pipeline.subQueries,
        keywords_ar: pipeline.keywordsAr, keywords_en: pipeline.keywordsEn,
        detected_intent: pipeline.detectedIntent, query_rewrite_used_ai: pipeline.queryRewriteUsedAI,
        candidates_count: pipeline.candidates.length, model_used: modelUsed,
        model_requested: selectedModel, fallback_used: fallbackUsed,
        status_code: statusCode, raw_response_snippet: rawResponseSnippet,
        token_usage: tokenUsage, boosted_categories: pipeline.boostedCategories,
        prompt_size_estimate: promptSize, retrieved_chunks_count: pipeline.sources.length,
        provider: "OpenRouter", endpoint: `${provider.base_url}/chat/completions`,
        error_type: errorType || null, provider_message: providerMessage || null,
      };

      // Save to grounded_chat_validations
      const validationRecord = {
        question, rewritten_query: pipeline.rewrittenQuery, model: modelUsed,
        top_k, category_filter: category_filter || null, search_mode,
        final_answer: finalAnswer, sources_json: pipeline.sources, prompt_sent: pipeline.fullPrompt,
        response_status: responseStatus, latency_ms: pipeline.timings.total,
        token_usage: tokenUsage, confidence_score: Math.round(pipeline.confidence * 1000) / 1000,
        is_grounded: pipeline.isGrounded, debug_info: debugInfoRecord,
        validation_status, validation_notes,
      };
      await adminClient.from("grounded_chat_validations").insert(validationRecord);

      const responseBody: any = {
        success: true, is_grounded: pipeline.isGrounded,
        final_answer: finalAnswer, sources: pipeline.sources, confidence: pipeline.confidence,
        model: modelUsed, latency_ms: pipeline.timings.total, token_usage: tokenUsage,
        response_status: responseStatus, debug: debugInfoRecord,
        validation_status, validation_notes,
      };

      // Add fallback message
      if (fallbackUsed && responseStatus === "success") {
        responseBody.fallback_message = "تم استخدام نموذج احتياطي بسبب تعذر استخدام النموذج المحدد.";
      }

      // Add error info when failed
      if (responseStatus === "error" && errorType) {
        responseBody.error_type = errorType;
        responseBody.message = arabicErrorMessage(errorType);
        responseBody.suggestion = arabicSuggestion(errorType);
      }

      return new Response(JSON.stringify(responseBody), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════
    // TEST (legacy)
    // ═══════════════════════════════════════
    if (action === "test") {
      const { question, model, top_k = 5, category_filter, search_mode = "hybrid_rerank" } = body;
      if (!question) {
        return new Response(JSON.stringify({ error: "السؤال مطلوب" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: settingData } = await adminClient
        .from("system_settings").select("value").eq("key", "ai_openai_api_key").single();
      const openaiKey = settingData?.value;
      if (!openaiKey) {
        return new Response(JSON.stringify(buildErrorResponse("api_key_missing", 400, "مفتاح OpenAI غير موجود", model || "")), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pipeline = await runRAGPipeline(adminClient, openaiKey, question, model, top_k, category_filter, search_mode);

      if (!pipeline.isGrounded) {
        const testRecord = {
          question, rewritten_query: pipeline.rewrittenQuery, model: model || null,
          top_k, category_filter: category_filter || null, search_mode,
          final_answer: "لم يتم العثور على معلومات كافية للإجابة من قاعدة المعرفة الحالية.",
          sources_json: pipeline.sources, prompt_sent: null, response_status: "no_grounding",
          latency_ms: Date.now() - pipeline.totalStart, confidence_score: pipeline.confidence,
          is_grounded: false,
          debug_info: { timings: pipeline.timings, rewritten_query: pipeline.rewrittenQuery, sub_queries: pipeline.subQueries, keywords_ar: pipeline.keywordsAr, keywords_en: pipeline.keywordsEn, detected_intent: pipeline.detectedIntent, query_rewrite_used_ai: pipeline.queryRewriteUsedAI, candidates_count: pipeline.candidates.length },
        };
        await adminClient.from("grounded_chat_tests").insert(testRecord);
        return new Response(JSON.stringify({
          success: true, is_grounded: false,
          final_answer: testRecord.final_answer,
          sources: pipeline.sources, confidence: pipeline.confidence, latency_ms: testRecord.latency_ms,
          debug: testRecord.debug_info,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: provider } = await adminClient
        .from("ai_providers").select("*").eq("provider_name", "OpenRouter").single();
      if (!provider?.api_key_encrypted || !provider.enabled) {
        return new Response(JSON.stringify(buildErrorResponse("api_key_missing", 400, "مزود OpenRouter غير مفعّل", model || "")), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const selectedModel = model || provider.default_model || "openai/gpt-4o";
      const genStart = Date.now();
      const result = await callOpenRouter(provider, selectedModel, pipeline.systemPrompt, question, true);

      pipeline.timings.generation = Date.now() - genStart;
      pipeline.timings.total = Date.now() - pipeline.totalStart;

      const debugInfoRecord = {
        timings: pipeline.timings, rewritten_query: pipeline.rewrittenQuery, sub_queries: pipeline.subQueries,
        keywords_ar: pipeline.keywordsAr, keywords_en: pipeline.keywordsEn,
        detected_intent: pipeline.detectedIntent, query_rewrite_used_ai: pipeline.queryRewriteUsedAI,
        candidates_count: pipeline.candidates.length, model_used: result.modelUsed,
        status_code: result.statusCode, raw_response_snippet: result.rawResponseSnippet,
        token_usage: result.tokenUsage, boosted_categories: pipeline.boostedCategories,
        fallback_used: result.fallbackUsed,
      };

      const testRecord = {
        question, rewritten_query: pipeline.rewrittenQuery, model: result.modelUsed,
        top_k, category_filter: category_filter || null, search_mode,
        final_answer: result.finalAnswer || `خطأ: ${result.providerMessage || "unknown"}`,
        sources_json: pipeline.sources, prompt_sent: pipeline.fullPrompt,
        response_status: result.responseStatus, latency_ms: pipeline.timings.total,
        token_usage: result.tokenUsage, confidence_score: Math.round(pipeline.confidence * 1000) / 1000,
        is_grounded: true, debug_info: debugInfoRecord,
      };
      await adminClient.from("grounded_chat_tests").insert(testRecord);

      return new Response(JSON.stringify({
        success: true, is_grounded: true,
        final_answer: testRecord.final_answer, sources: pipeline.sources, confidence: pipeline.confidence,
        model: result.modelUsed, latency_ms: pipeline.timings.total, token_usage: result.tokenUsage,
        response_status: result.responseStatus, debug: debugInfoRecord,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── VALIDATION HISTORY ───
    if (action === "validation-history") {
      const { data, error } = await adminClient
        .from("grounded_chat_validations")
        .select("id, question, model, response_status, latency_ms, is_grounded, confidence_score, sources_json, validation_status, validation_notes, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, validations: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET SINGLE VALIDATION ───
    if (action === "validation-get") {
      const { validation_id } = body;
      const { data, error } = await adminClient
        .from("grounded_chat_validations").select("*").eq("id", validation_id).single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, validation: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── HISTORY (legacy) ───
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

    // ─── ERROR LOGS ───
    if (action === "error-logs") {
      const { data, error } = await adminClient
        .from("grounded_chat_error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, logs: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify(buildErrorResponse(
      "internal_error", 500, (e as Error).message || "Internal error", ""
    )), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
