import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HIGH_PRIORITY_CATEGORIES = ["facts", "faq", "policies", "support", "ai_guidelines"];
const LOW_PRIORITY_CATEGORIES = ["marketing", "nonprofit_sector"];

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function determinePriority(category: string, sectionTitle: string): string {
  const lowerTitle = sectionTitle.toLowerCase();
  if (HIGH_PRIORITY_CATEGORIES.includes(category)) return "high";
  if (["do_not_say", "important", "critical", "warning"].some(k => lowerTitle.includes(k))) return "high";
  if (LOW_PRIORITY_CATEGORIES.includes(category)) return "low";
  return "medium";
}

interface Section {
  title: string;
  level: number;
  content: string;
  path: string;
}

function parseMarkdownSections(content: string): Section[] {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  const pathStack: { level: number; title: string }[] = [];
  let introLines: string[] = [];

  for (const line of lines) {
    // Robust heading regex: handles trailing spaces, tabs, etc.
    const headingMatch = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (headingMatch) {
      // Push any intro content collected before first heading
      if (!currentSection && introLines.length > 0) {
        const introContent = introLines.join("\n").trim();
        if (introContent) {
          sections.push({
            title: "مقدمة",
            level: 0,
            content: introContent,
            path: "مقدمة",
          });
        }
        introLines = [];
      }

      // Save previous section
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection);
      }

      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      // Update path stack — remove entries at same or deeper level
      while (pathStack.length > 0 && pathStack[pathStack.length - 1].level >= level) {
        pathStack.pop();
      }
      pathStack.push({ level, title });

      currentSection = {
        title,
        level,
        content: "",
        path: pathStack.map(p => p.title).join(" > "),
      };
    } else if (currentSection) {
      currentSection.content += line + "\n";
    } else {
      // Content before any heading
      introLines.push(line);
    }
  }

  // Push remaining intro if no headings were found at all
  if (!currentSection && introLines.length > 0) {
    const introContent = introLines.join("\n").trim();
    if (introContent) {
      sections.push({
        title: "مقدمة",
        level: 0,
        content: introContent,
        path: "مقدمة",
      });
    }
  }

  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection);
  }

  return sections;
}

function splitLongSection(content: string, maxTokens: number = 800, minTokens: number = 100): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];
  if (estimateTokens(trimmed) <= maxTokens) return [trimmed];

  // Try splitting by double newlines first (paragraphs)
  let parts = trimmed.split(/\n\n+/).filter(p => p.trim());

  // If only 1 part, try single newlines
  if (parts.length <= 1) {
    parts = trimmed.split(/\n/).filter(p => p.trim());
  }

  // If still 1 part, split by sentences (Arabic period، English period, question/exclamation)
  if (parts.length <= 1) {
    parts = trimmed.split(/(?<=[.،؟!?\n])\s+/).filter(p => p.trim());
  }

  // If still 1 part (no natural breaks), force split by character count
  if (parts.length <= 1) {
    const targetLen = maxTokens * 4; // rough chars per maxTokens
    const forcedParts: string[] = [];
    let remaining = trimmed;
    while (remaining.length > targetLen) {
      // Try to find a space near the target length
      let splitIdx = remaining.lastIndexOf(" ", targetLen);
      if (splitIdx < targetLen * 0.5) splitIdx = targetLen;
      forcedParts.push(remaining.substring(0, splitIdx).trim());
      remaining = remaining.substring(splitIdx).trim();
    }
    if (remaining.trim()) forcedParts.push(remaining.trim());
    return forcedParts.length > 0 ? forcedParts : [trimmed];
  }

  // Group parts into chunks of ~300-800 tokens
  const chunks: string[] = [];
  let currentChunk = "";

  for (const part of parts) {
    const combined = currentChunk ? currentChunk + "\n\n" + part : part;
    const combinedTokens = estimateTokens(combined);

    if (combinedTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = part;
    } else {
      currentChunk = combined;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Merge tiny trailing chunks (< minTokens) with previous chunk
  if (chunks.length > 1) {
    const lastChunk = chunks[chunks.length - 1];
    if (estimateTokens(lastChunk) < minTokens) {
      chunks[chunks.length - 2] += "\n\n" + chunks.pop()!;
    }
  }

  return chunks.length > 0 ? chunks : [trimmed];
}

function parseTextSections(content: string): Section[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const paragraphs = normalized.split(/\n\n+/).filter(p => p.trim());
  const sections: Section[] = [];
  let currentGroup: string[] = [];
  let groupIndex = 0;

  for (const para of paragraphs) {
    currentGroup.push(para);
    const groupText = currentGroup.join("\n\n");
    if (estimateTokens(groupText) >= 300) {
      groupIndex++;
      sections.push({
        title: `قسم ${groupIndex}`,
        level: 1,
        content: groupText,
        path: `قسم ${groupIndex}`,
      });
      currentGroup = [];
    }
  }

  if (currentGroup.length > 0) {
    groupIndex++;
    sections.push({
      title: `قسم ${groupIndex}`,
      level: 1,
      content: currentGroup.join("\n\n"),
      path: `قسم ${groupIndex}`,
    });
  }

  return sections;
}

interface ChunkData {
  title: string;
  section_path: string;
  content: string;
  token_estimate: number;
  char_count: number;
  priority: string;
  metadata_json: Record<string, unknown>;
  chunk_index: number;
}

interface ChunkResult {
  chunks: ChunkData[];
  sections_found: number;
  splitting_method: string;
}

function generateChunks(
  content: string,
  fileType: string,
  category: string,
  fileName: string,
): ChunkResult {
  let sections: Section[];
  let splittingMethod: string;

  if (fileType === "md") {
    sections = parseMarkdownSections(content);
    // Check if we actually found real headings or just an intro
    const hasRealHeadings = sections.some(s => s.level > 0);
    if (!hasRealHeadings && sections.length <= 1) {
      // No markdown headers found — fall back to text splitting
      sections = parseTextSections(content);
      splittingMethod = "text_fallback";
    } else {
      splittingMethod = "markdown_headers";
    }
  } else {
    sections = parseTextSections(content);
    splittingMethod = "text_paragraphs";
  }

  const sectionsFound = sections.length;
  const chunks: ChunkData[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const tokens = estimateTokens(section.content);
    const priority = determinePriority(category, section.title);

    if (tokens <= 800) {
      const trimmedContent = section.content.trim();
      if (!trimmedContent) continue;
      chunks.push({
        title: section.title,
        section_path: section.path,
        content: trimmedContent,
        token_estimate: estimateTokens(trimmedContent),
        char_count: trimmedContent.length,
        priority,
        chunk_index: chunkIndex++,
        metadata_json: {
          source_file: fileName,
          category,
          section_path: section.path,
          title: section.title,
          priority,
          chunk_index: chunkIndex - 1,
          file_type: fileType,
          splitting_method: splittingMethod,
        },
      });
    } else {
      const subChunks = splitLongSection(section.content, 800, 100);
      for (let i = 0; i < subChunks.length; i++) {
        const subTitle = subChunks.length > 1
          ? `${section.title} (${i + 1}/${subChunks.length})`
          : section.title;
        const t = estimateTokens(subChunks[i]);
        chunks.push({
          title: subTitle,
          section_path: section.path,
          content: subChunks[i],
          token_estimate: t,
          char_count: subChunks[i].length,
          priority,
          chunk_index: chunkIndex++,
          metadata_json: {
            source_file: fileName,
            category,
            section_path: section.path,
            title: subTitle,
            priority,
            chunk_index: chunkIndex - 1,
            file_type: fileType,
            splitting_method: splittingMethod,
          },
        });
      }
    }
  }

  return { chunks, sections_found: sectionsFound, splitting_method: splittingMethod };
}

Deno.serve(async (req) => {
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

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { action } = body;

    // ===== UPLOAD =====
    if (action === "upload") {
      const { title, file_name, file_type, category, content_raw } = body;
      const { data, error } = await supabase.from("knowledge_documents").insert({
        title: title || file_name,
        original_file_name: file_name,
        file_type: file_type || "md",
        category: category || "general",
        source: "upload",
        content_raw,
        processing_status: "pending",
      }).select().single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, document: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== GENERATE CHUNKS =====
    if (action === "generate-chunks") {
      const { document_id } = body;
      const { data: doc, error: docErr } = await supabase
        .from("knowledge_documents")
        .select("*")
        .eq("id", document_id)
        .single();
      if (docErr || !doc) throw docErr || new Error("Document not found");

      const { data: job } = await supabase.from("knowledge_chunk_jobs").insert({
        document_id,
        job_type: "chunking",
        status: "running",
        started_at: new Date().toISOString(),
      }).select().single();

      await supabase.from("knowledge_documents")
        .update({ processing_status: "processing" })
        .eq("id", document_id);

      try {
        const result = generateChunks(
          doc.content_raw,
          doc.file_type,
          doc.category,
          doc.original_file_name,
        );

        const chunkRows = result.chunks.map(c => ({
          document_id,
          chunk_index: c.chunk_index,
          title: c.title,
          section_path: c.section_path,
          category: doc.category,
          content: c.content,
          token_estimate: c.token_estimate,
          char_count: c.char_count,
          priority: c.priority,
          is_embedded: false,
          embedding_status: "pending",
          metadata_json: c.metadata_json,
        }));

        if (chunkRows.length > 0) {
          const { error: insertErr } = await supabase.from("knowledge_chunks").insert(chunkRows);
          if (insertErr) throw insertErr;
        }

        const logMsg = `تم إنشاء ${chunkRows.length} chunk من ${result.sections_found} قسم | طريقة: ${result.splitting_method} | ملف: ${doc.original_file_name}`;

        await supabase.from("knowledge_chunk_jobs").update({
          status: "completed",
          chunks_created: chunkRows.length,
          finished_at: new Date().toISOString(),
          logs: logMsg,
        }).eq("id", job!.id);

        await supabase.from("knowledge_documents")
          .update({ processing_status: "completed" })
          .eq("id", document_id);

        return new Response(JSON.stringify({
          success: true,
          chunks_created: chunkRows.length,
          sections_found: result.sections_found,
          splitting_method: result.splitting_method,
          job_id: job!.id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (chunkErr) {
        await supabase.from("knowledge_chunk_jobs").update({
          status: "failed",
          finished_at: new Date().toISOString(),
          logs: `خطأ: ${(chunkErr as Error).message}`,
        }).eq("id", job!.id);

        await supabase.from("knowledge_documents")
          .update({ processing_status: "failed", processing_notes: (chunkErr as Error).message })
          .eq("id", document_id);

        throw chunkErr;
      }
    }

    // ===== REPROCESS =====
    if (action === "reprocess") {
      const { document_id } = body;

      await supabase.from("knowledge_chunks").delete().eq("document_id", document_id);

      const { data: job } = await supabase.from("knowledge_chunk_jobs").insert({
        document_id,
        job_type: "rechunking",
        status: "running",
        started_at: new Date().toISOString(),
      }).select().single();

      const { data: doc } = await supabase.from("knowledge_documents")
        .select("*").eq("id", document_id).single();
      if (!doc) throw new Error("Document not found");

      await supabase.from("knowledge_documents")
        .update({ processing_status: "processing" })
        .eq("id", document_id);

      try {
        const result = generateChunks(doc.content_raw, doc.file_type, doc.category, doc.original_file_name);
        const chunkRows = result.chunks.map(c => ({
          document_id,
          chunk_index: c.chunk_index,
          title: c.title,
          section_path: c.section_path,
          category: doc.category,
          content: c.content,
          token_estimate: c.token_estimate,
          char_count: c.char_count,
          priority: c.priority,
          is_embedded: false,
          embedding_status: "pending",
          metadata_json: c.metadata_json,
        }));

        if (chunkRows.length > 0) {
          await supabase.from("knowledge_chunks").insert(chunkRows);
        }

        const logMsg = `إعادة معالجة: ${chunkRows.length} chunk من ${result.sections_found} قسم | طريقة: ${result.splitting_method}`;

        await supabase.from("knowledge_chunk_jobs").update({
          status: "completed",
          chunks_created: chunkRows.length,
          finished_at: new Date().toISOString(),
          logs: logMsg,
        }).eq("id", job!.id);

        await supabase.from("knowledge_documents")
          .update({ processing_status: "completed" })
          .eq("id", document_id);

        return new Response(JSON.stringify({
          success: true,
          chunks_created: chunkRows.length,
          sections_found: result.sections_found,
          splitting_method: result.splitting_method,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        await supabase.from("knowledge_chunk_jobs").update({
          status: "failed",
          finished_at: new Date().toISOString(),
          logs: `خطأ: ${(err as Error).message}`,
        }).eq("id", job!.id);

        await supabase.from("knowledge_documents")
          .update({ processing_status: "failed" })
          .eq("id", document_id);

        throw err;
      }
    }

    // ===== UPDATE CHUNK =====
    if (action === "update-chunk") {
      const { chunk_id, updates } = body;
      const allowed = ["title", "content", "priority", "section_path", "category"];
      const cleanUpdates: Record<string, unknown> = {};
      for (const k of allowed) {
        if (updates[k] !== undefined) cleanUpdates[k] = updates[k];
      }
      if (cleanUpdates.content) {
        cleanUpdates.char_count = (cleanUpdates.content as string).length;
        cleanUpdates.token_estimate = estimateTokens(cleanUpdates.content as string);
      }

      const { data, error } = await supabase.from("knowledge_chunks")
        .update(cleanUpdates).eq("id", chunk_id).select().single();
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, chunk: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== DELETE CHUNK =====
    if (action === "delete-chunk") {
      const { chunk_id } = body;
      const { error } = await supabase.from("knowledge_chunks").delete().eq("id", chunk_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== DELETE DOCUMENT =====
    if (action === "delete-document") {
      const { document_id } = body;
      const { error } = await supabase.from("knowledge_documents").delete().eq("id", document_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== UPDATE DOCUMENT =====
    if (action === "update-document") {
      const { document_id, updates } = body;
      const allowed = ["category", "title"];
      const cleanUpdates: Record<string, unknown> = {};
      for (const k of allowed) {
        if (updates[k] !== undefined) cleanUpdates[k] = updates[k];
      }
      const { data, error } = await supabase.from("knowledge_documents")
        .update(cleanUpdates).eq("id", document_id).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, document: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== EMBEDDING STATS =====
    if (action === "embedding-stats") {
      const { count: total } = await supabase.from("knowledge_chunks").select("id", { count: "exact", head: true });
      const { count: embedded } = await supabase.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("embedding_status", "embedded");
      const { count: failed } = await supabase.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("embedding_status", "failed");
      const { count: pending } = await supabase.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("embedding_status", "pending");

      return new Response(JSON.stringify({
        total: total || 0,
        embedded: embedded || 0,
        failed: failed || 0,
        pending: pending || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== GENERATE EMBEDDINGS =====
    if (action === "generate-embeddings" || action === "retry-failed-embeddings") {
      // Get OpenAI API key from system_settings
      const { data: settingData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "ai_openai_api_key")
        .single();

      const apiKey = settingData?.value;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "مفتاح OpenAI API غير مُعد في إعدادات النظام" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch chunks to embed
      let query = supabase.from("knowledge_chunks").select("id, content, title, section_path, category, priority, chunk_index, document_id, metadata_json");
      if (action === "retry-failed-embeddings") {
        query = query.eq("embedding_status", "failed");
      } else {
        query = query.in("embedding_status", ["pending", "failed"]);
      }
      const { data: chunksToEmbed, error: fetchErr } = await query.limit(50);
      if (fetchErr) throw fetchErr;

      if (!chunksToEmbed || chunksToEmbed.length === 0) {
        return new Response(JSON.stringify({ success: true, embedded_count: 0, failed_count: 0, message: "لا توجد chunks تحتاج تضمين" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get document file names for metadata
      const docIds = [...new Set(chunksToEmbed.map(c => c.document_id))];
      const { data: docs } = await supabase.from("knowledge_documents").select("id, original_file_name").in("id", docIds);
      const docMap = new Map((docs || []).map(d => [d.id, d.original_file_name]));

      let embeddedCount = 0;
      let failedCount = 0;
      const BATCH_SIZE = 20;

      for (let i = 0; i < chunksToEmbed.length; i += BATCH_SIZE) {
        const batch = chunksToEmbed.slice(i, i + BATCH_SIZE);

        // Mark as processing
        await supabase.from("knowledge_chunks")
          .update({ embedding_status: "processing" })
          .in("id", batch.map(c => c.id));

        try {
          const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "text-embedding-3-small",
              input: batch.map(c => c.content),
            }),
          });

          if (!embResponse.ok) {
            const errText = await embResponse.text();
            console.error("OpenAI embeddings error:", embResponse.status, errText);
            // Mark batch as failed
            await supabase.from("knowledge_chunks")
              .update({ embedding_status: "failed" })
              .in("id", batch.map(c => c.id));
            failedCount += batch.length;
            continue;
          }

          const embData = await embResponse.json();
          const embeddings = embData.data;

          // Update each chunk with its embedding
          for (let j = 0; j < batch.length; j++) {
            const chunk = batch[j];
            const embVector = embeddings[j]?.embedding;

            if (!embVector) {
              await supabase.from("knowledge_chunks")
                .update({ embedding_status: "failed" })
                .eq("id", chunk.id);
              failedCount++;
              continue;
            }

            // Build metadata_json for vector
            const metadataJson = {
              ...(chunk.metadata_json as Record<string, unknown> || {}),
              chunk_id: chunk.id,
              document_id: chunk.document_id,
              source_file: docMap.get(chunk.document_id) || "",
              title: chunk.title,
              category: chunk.category,
              section_path: chunk.section_path,
              priority: chunk.priority,
              chunk_index: chunk.chunk_index,
            };

            const vectorStr = `[${embVector.join(",")}]`;

            const { error: updateErr } = await supabase.from("knowledge_chunks")
              .update({
                embedding: vectorStr,
                is_embedded: true,
                embedding_status: "embedded",
                embedding_model: "text-embedding-3-small",
                embedded_at: new Date().toISOString(),
                metadata_json: metadataJson,
              })
              .eq("id", chunk.id);

            if (updateErr) {
              console.error("Error updating chunk embedding:", updateErr);
              await supabase.from("knowledge_chunks")
                .update({ embedding_status: "failed" })
                .eq("id", chunk.id);
              failedCount++;
            } else {
              embeddedCount++;
            }
          }
        } catch (batchErr) {
          console.error("Batch embedding error:", batchErr);
          await supabase.from("knowledge_chunks")
            .update({ embedding_status: "failed" })
            .in("id", batch.map(c => c.id));
          failedCount += batch.length;
        }
      }

      // Log the job
      await supabase.from("knowledge_chunk_jobs").insert({
        document_id: chunksToEmbed[0].document_id,
        job_type: "embedding",
        status: failedCount === chunksToEmbed.length ? "failed" : "completed",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        chunks_created: embeddedCount,
        logs: `تضمين: ${embeddedCount} ناجح، ${failedCount} فاشل من ${chunksToEmbed.length} chunk`,
      });

      return new Response(JSON.stringify({
        success: true,
        embedded_count: embeddedCount,
        failed_count: failedCount,
        total_processed: chunksToEmbed.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== RETRIEVAL TEST (v2 with hybrid + reranking) =====
    if (action === "retrieval-test") {
      const { question, category: filterCategory, top_k = 5, search_mode = "hybrid_rerank" } = body;

      if (!question) {
        return new Response(JSON.stringify({ error: "السؤال مطلوب" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const timings: Record<string, number> = {};
      const totalStart = Date.now();

      // Get OpenAI API key
      const { data: settingData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "ai_openai_api_key")
        .single();
      const apiKey = settingData?.value;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "مفتاح OpenAI API غير مُعد في إعدادات النظام" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===== STAGE 1: Query Understanding & Rewriting =====
      const stage1Start = Date.now();
      
      // Heuristic rules for category boosting
      const CATEGORY_BOOST_RULES = [
        { keywords: ['سعر','أسعار','اشتراك','خطة','خطط','باقة','باقات','pricing','price','plan','subscription','تكلفة','رسوم'], boost_categories: ['pricing','plans','faq','facts'] },
        { keywords: ['دعم','مشكلة','مساعدة','تذكرة','help','support','issue','تواصل'], boost_categories: ['support','faq'] },
        { keywords: ['سياسة','شروط','أحكام','policy','terms','استرجاع','إلغاء'], boost_categories: ['policies'] },
        { keywords: ['ممنوع','صياغة','لا تقل','أسلوب','كتابة','style','tone','نبرة'], boost_categories: ['do_not_say','writing_style','ai_guidelines'] },
        { keywords: ['موقع','تصميم','قالب','تطوير','برمجة','website','design'], boost_categories: ['product','modules','architecture'] },
      ];

      // Detect intent from heuristics
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

      // Extract keywords heuristically (Arabic + English)
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

      let rewrittenQuery = question;
      let subQueries: string[] = [];
      let keywordsAr: string[] = [];
      let keywordsEn: string[] = [];
      let detectedIntent = detectIntentHeuristic(question);
      let queryRewriteUsedAI = false;

      // Try AI-based query rewriting for hybrid_rerank mode
      if (search_mode === "hybrid_rerank") {
        try {
          const rewriteResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `You are a search query optimizer for an Arabic knowledge base about "Webyan" (ويبيان) platform.
Given a user question, return ONLY valid JSON (no markdown):
{
  "rewritten_query": "optimized version of the question",
  "sub_queries": ["sub-query 1", "sub-query 2"],
  "keywords_ar": ["كلمة1", "كلمة2"],
  "keywords_en": ["keyword1", "keyword2"],
  "detected_intent": "pricing|support|policies|style|general"
}
Rules:
- Generate 2-4 sub-queries that cover different aspects of the question
- Extract important Arabic AND English keywords
- Detect the primary intent category
- Always include the platform name variants: ويبيان, Webyan
- For pricing questions, include: خطة, باقة, سعر, Basic, Plus, Pro`
                },
                { role: "user", content: question }
              ],
              temperature: 0.3,
              max_tokens: 500,
            }),
          });

          if (rewriteResponse.ok) {
            const rewriteData = await rewriteResponse.json();
            const content = rewriteData.choices?.[0]?.message?.content || "";
            try {
              const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
              rewrittenQuery = parsed.rewritten_query || question;
              subQueries = parsed.sub_queries || [];
              keywordsAr = parsed.keywords_ar || [];
              keywordsEn = parsed.keywords_en || [];
              detectedIntent = parsed.detected_intent || detectedIntent;
              queryRewriteUsedAI = true;
            } catch { /* fallback to heuristic */ }
          }
        } catch (e) {
          console.error("Query rewrite failed, using heuristic:", e);
        }
      }

      // Heuristic fallback
      if (!queryRewriteUsedAI) {
        const extracted = extractKeywordsHeuristic(question);
        keywordsAr = extracted.ar;
        keywordsEn = extracted.en;
      }

      const allKeywords = [...keywordsAr, ...keywordsEn];
      timings.query_rewrite = Date.now() - stage1Start;

      // ===== STAGE 2: Multi-Query Vector Search =====
      const stage2Start = Date.now();
      const queriesToEmbed = [question];
      if (search_mode !== "vector_only" && subQueries.length > 0) {
        queriesToEmbed.push(...subQueries.slice(0, 3));
      }

      // Generate embeddings for all queries
      const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "text-embedding-3-small", input: queriesToEmbed }),
      });

      if (!embResponse.ok) {
        const errText = await embResponse.text();
        console.error("OpenAI embeddings error:", embResponse.status, errText);
        return new Response(JSON.stringify({ error: "فشل في توليد embedding للسؤال" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const embData = await embResponse.json();
      const embeddings = embData.data;

      // Run vector search for each query embedding
      const vectorCandidatesMap = new Map<string, any>();
      const fetchCount = search_mode === "vector_only" ? top_k : 15;

      for (let qi = 0; qi < embeddings.length; qi++) {
        const queryEmbedding = embeddings[qi]?.embedding;
        if (!queryEmbedding) continue;

        const vectorStr = `[${queryEmbedding.join(",")}]`;
        const { data: matches } = await supabase.rpc("match_knowledge_chunks", {
          query_embedding: vectorStr,
          match_threshold: 0.2,
          match_count: fetchCount,
          filter_category: filterCategory || null,
        });

        for (const m of (matches || [])) {
          const existing = vectorCandidatesMap.get(m.id);
          if (!existing || m.similarity > existing.similarity) {
            vectorCandidatesMap.set(m.id, m);
          }
        }
      }

      let candidates = Array.from(vectorCandidatesMap.values());
      timings.vector_search = Date.now() - stage2Start;

      // ===== STAGE 3: Keyword/Lexical Search (Hybrid) =====
      let keywordResultsMap = new Map<string, { keyword_matches: number; matched_keywords: string[] }>();

      if (search_mode !== "vector_only" && allKeywords.length > 0) {
        const stage3Start = Date.now();
        const { data: kwResults } = await supabase.rpc("keyword_search_knowledge_chunks", {
          search_keywords: allKeywords,
          max_results: 20,
          filter_category: filterCategory || null,
        });

        for (const kr of (kwResults || [])) {
          keywordResultsMap.set(kr.id, { keyword_matches: kr.keyword_matches, matched_keywords: kr.matched_keywords });
        }

        // Add keyword-only results that weren't in vector results
        if (kwResults) {
          for (const kr of kwResults) {
            if (!vectorCandidatesMap.has(kr.id)) {
              // Fetch the chunk data
              const { data: chunkData } = await supabase
                .from("knowledge_chunks")
                .select("id, document_id, chunk_index, title, section_path, category, content, token_estimate, priority, metadata_json")
                .eq("id", kr.id)
                .single();
              if (chunkData) {
                candidates.push({ ...chunkData, similarity: 0.15 }); // low baseline similarity for keyword-only
              }
            }
          }
        }
        timings.keyword_search = Date.now() - stage3Start;
      }

      // ===== STAGE 4: Metadata Boosting =====
      const stage4Start = Date.now();
      
      // Determine which categories to boost
      const boostedCategories = new Set<string>();
      const lowerQuestion = question.toLowerCase();
      for (const rule of CATEGORY_BOOST_RULES) {
        if (rule.keywords.some(k => lowerQuestion.includes(k))) {
          rule.boost_categories.forEach(c => boostedCategories.add(c));
        }
      }

      // Apply boosting to each candidate
      const scoredCandidates = candidates.map(c => {
        let metadataBoost = 1.0;
        const reasons: string[] = [];

        // Category boost
        if (boostedCategories.has(c.category)) {
          metadataBoost *= 1.3;
          reasons.push(`تطابق تصنيف: ${c.category}`);
        }

        // Priority boost
        if (c.priority === 'high') { metadataBoost *= 1.15; reasons.push('أولوية عالية'); }
        else if (c.priority === 'low') { metadataBoost *= 0.9; }

        // Title keyword match boost
        const titleLower = (c.title || '').toLowerCase();
        const titleMatches = allKeywords.filter(k => titleLower.includes(k.toLowerCase()));
        if (titleMatches.length > 0) {
          metadataBoost *= 1.1;
          reasons.push('تطابق في العنوان');
        }

        // Keyword score (0-1)
        const kwData = keywordResultsMap.get(c.id);
        const keywordScore = kwData
          ? Math.min(kwData.keyword_matches / Math.max(allKeywords.length, 1), 1)
          : 0;
        if (kwData && kwData.keyword_matches > 0) {
          reasons.push(`تطابق ${kwData.keyword_matches} كلمة مفتاحية`);
        }

        // Similarity reason
        if (c.similarity >= 0.7) reasons.push('تشابه دلالي عالي جداً');
        else if (c.similarity >= 0.5) reasons.push('تشابه دلالي عالي');
        else if (c.similarity >= 0.3) reasons.push('تشابه دلالي متوسط');

        // Final score
        const normalizedBoost = Math.min(metadataBoost - 1, 0.5); // cap boost contribution
        let finalScore: number;
        if (search_mode === "vector_only") {
          finalScore = c.similarity;
        } else if (search_mode === "hybrid") {
          finalScore = (c.similarity * 0.65) + (keywordScore * 0.35);
        } else {
          // hybrid_rerank
          finalScore = (c.similarity * 0.55) + (keywordScore * 0.25) + (normalizedBoost * 0.20);
        }

        return {
          ...c,
          similarity_score: Math.round(c.similarity * 1000) / 1000,
          keyword_score: Math.round(keywordScore * 1000) / 1000,
          metadata_boost: Math.round(metadataBoost * 1000) / 1000,
          final_score: Math.round(finalScore * 1000) / 1000,
          ranking_reasons: reasons,
          matched_keywords: kwData?.matched_keywords || [],
        };
      });

      timings.metadata_boosting = Date.now() - stage4Start;

      // ===== STAGE 5: Reranking =====
      const stage5Start = Date.now();
      const candidatesBeforeRerank = scoredCandidates.length;

      // Sort by final_score
      scoredCandidates.sort((a, b) => b.final_score - a.final_score);

      // Take top_k
      const finalResults = scoredCandidates.slice(0, top_k);

      // Compute confidence
      const topScores = finalResults.slice(0, 3).map(r => r.final_score);
      const confidence = topScores.length > 0 ? topScores.reduce((a, b) => a + b, 0) / topScores.length : 0;

      timings.reranking = Date.now() - stage5Start;
      timings.total = Date.now() - totalStart;

      // Get document names
      const matchDocIds = [...new Set(finalResults.map((m: any) => m.document_id))];
      let docNames: Record<string, string> = {};
      if (matchDocIds.length > 0) {
        const { data: matchDocs } = await supabase.from("knowledge_documents").select("id, title, original_file_name").in("id", matchDocIds);
        docNames = Object.fromEntries((matchDocs || []).map(d => [d.id, d.original_file_name || d.title]));
      }

      const results = finalResults.map((m: any) => ({
        id: m.id,
        title: m.title,
        section_path: m.section_path,
        category: m.category,
        content: m.content,
        token_estimate: m.token_estimate,
        priority: m.priority,
        similarity_score: m.similarity_score,
        keyword_score: m.keyword_score,
        metadata_boost: m.metadata_boost,
        final_score: m.final_score,
        ranking_reasons: m.ranking_reasons,
        matched_keywords: m.matched_keywords,
        source_file: docNames[m.document_id] || "",
        metadata_json: m.metadata_json,
      }));

      // ===== STAGE 6: Logging =====
      try {
        await supabase.from("knowledge_retrieval_logs").insert({
          original_query: question,
          rewritten_queries: { rewritten: rewrittenQuery, sub_queries: subQueries, keywords_ar: keywordsAr, keywords_en: keywordsEn },
          detected_intent: detectedIntent,
          search_mode,
          candidates_count: candidatesBeforeRerank,
          final_results_count: finalResults.length,
          confidence_score: Math.round(confidence * 1000) / 1000,
          timing_ms: timings,
          results_summary: results.map(r => ({ id: r.id, title: r.title, final_score: r.final_score, category: r.category })),
        });
      } catch (logErr) {
        console.error("Failed to log retrieval:", logErr);
      }

      return new Response(JSON.stringify({
        success: true,
        results,
        question,
        search_mode,
        debug: {
          original_query: question,
          rewritten_query: rewrittenQuery,
          sub_queries: subQueries,
          keywords_ar: keywordsAr,
          keywords_en: keywordsEn,
          detected_intent: detectedIntent,
          query_rewrite_used_ai: queryRewriteUsedAI,
          boosted_categories: Array.from(boostedCategories),
          candidates_before_rerank: candidatesBeforeRerank,
          final_results_count: finalResults.length,
          confidence,
          timing_ms: timings,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== RETRIEVAL LOGS =====
    if (action === "retrieval-logs") {
      const { data: logs, error: logsErr } = await supabase
        .from("knowledge_retrieval_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (logsErr) throw logsErr;
      return new Response(JSON.stringify({ success: true, logs: logs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action: " + action }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
