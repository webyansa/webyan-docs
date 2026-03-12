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

    // ===== RETRIEVAL TEST =====
    if (action === "retrieval-test") {
      const { question, category: filterCategory, top_k = 5 } = body;

      if (!question) {
        return new Response(JSON.stringify({ error: "السؤال مطلوب" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get OpenAI API key
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

      // Generate embedding for the question
      const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: [question],
        }),
      });

      if (!embResponse.ok) {
        const errText = await embResponse.text();
        console.error("OpenAI embeddings error:", embResponse.status, errText);
        return new Response(JSON.stringify({ error: "فشل في توليد embedding للسؤال" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const embData = await embResponse.json();
      const queryEmbedding = embData.data[0]?.embedding;

      if (!queryEmbedding) {
        return new Response(JSON.stringify({ error: "فشل في الحصول على vector" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Call the match function
      const vectorStr = `[${queryEmbedding.join(",")}]`;
      const { data: matches, error: matchErr } = await supabase.rpc("match_knowledge_chunks", {
        query_embedding: vectorStr,
        match_threshold: 0.3,
        match_count: top_k,
        filter_category: filterCategory || null,
      });

      if (matchErr) {
        console.error("Match error:", matchErr);
        throw matchErr;
      }

      // Get document names for results
      const matchDocIds = [...new Set((matches || []).map((m: any) => m.document_id))];
      let docNames: Record<string, string> = {};
      if (matchDocIds.length > 0) {
        const { data: matchDocs } = await supabase.from("knowledge_documents").select("id, title, original_file_name").in("id", matchDocIds);
        docNames = Object.fromEntries((matchDocs || []).map(d => [d.id, d.original_file_name || d.title]));
      }

      const results = (matches || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        section_path: m.section_path,
        category: m.category,
        content: m.content,
        token_estimate: m.token_estimate,
        priority: m.priority,
        similarity: Math.round(m.similarity * 100) / 100,
        source_file: docNames[m.document_id] || "",
        metadata_json: m.metadata_json,
      }));

      return new Response(JSON.stringify({ success: true, results, question }), {
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
