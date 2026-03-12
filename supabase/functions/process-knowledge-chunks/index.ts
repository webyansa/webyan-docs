import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  "product", "architecture", "modules", "ai_guidelines", "writing_style",
  "pricing", "faq", "policies", "support", "marketing", "nonprofit_sector", "facts", "general",
];

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
  const lines = content.split("\n");
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  const pathStack: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection);
      }
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      // Update path stack
      while (pathStack.length >= level) pathStack.pop();
      pathStack.push(title);

      currentSection = {
        title,
        level,
        content: "",
        path: pathStack.join(" > "),
      };
    } else if (currentSection) {
      currentSection.content += line + "\n";
    } else {
      // Content before first heading
      if (line.trim()) {
        if (!currentSection) {
          currentSection = { title: "مقدمة", level: 0, content: "", path: "مقدمة" };
        }
        currentSection.content += line + "\n";
      }
    }
  }

  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection);
  }

  return sections;
}

function splitLongSection(section: Section, maxTokens: number = 800): string[] {
  const paragraphs = section.content.split(/\n\n+/).filter(p => p.trim());
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    const combined = currentChunk ? currentChunk + "\n\n" + para : para;
    if (estimateTokens(combined) > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk = combined;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [section.content.trim()];
}

function parseTextSections(content: string): Section[] {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
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

function generateChunks(
  content: string,
  fileType: string,
  category: string,
  fileName: string,
): ChunkData[] {
  const sections = fileType === "md" ? parseMarkdownSections(content) : parseTextSections(content);
  const chunks: ChunkData[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const tokens = estimateTokens(section.content);
    const priority = determinePriority(category, section.title);

    if (tokens <= 800) {
      chunks.push({
        title: section.title,
        section_path: section.path,
        content: section.content.trim(),
        token_estimate: tokens,
        char_count: section.content.trim().length,
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
        },
      });
    } else {
      const subChunks = splitLongSection(section, 800);
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
          },
        });
      }
    }
  }

  return chunks;
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

    // Use service role for DB operations
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

      // Create job
      const { data: job } = await supabase.from("knowledge_chunk_jobs").insert({
        document_id,
        job_type: "chunking",
        status: "running",
        started_at: new Date().toISOString(),
      }).select().single();

      // Update doc status
      await supabase.from("knowledge_documents")
        .update({ processing_status: "processing" })
        .eq("id", document_id);

      try {
        const chunks = generateChunks(
          doc.content_raw,
          doc.file_type,
          doc.category,
          doc.original_file_name,
        );

        // Insert chunks
        const chunkRows = chunks.map(c => ({
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

        // Update job
        await supabase.from("knowledge_chunk_jobs").update({
          status: "completed",
          chunks_created: chunkRows.length,
          finished_at: new Date().toISOString(),
          logs: `تم إنشاء ${chunkRows.length} chunk بنجاح من الملف ${doc.original_file_name}`,
        }).eq("id", job!.id);

        // Update doc
        await supabase.from("knowledge_documents")
          .update({ processing_status: "completed" })
          .eq("id", document_id);

        return new Response(JSON.stringify({
          success: true,
          chunks_created: chunkRows.length,
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

      // Delete existing chunks
      await supabase.from("knowledge_chunks").delete().eq("document_id", document_id);

      // Create rechunking job
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
        const chunks = generateChunks(doc.content_raw, doc.file_type, doc.category, doc.original_file_name);
        const chunkRows = chunks.map(c => ({
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

        await supabase.from("knowledge_chunk_jobs").update({
          status: "completed",
          chunks_created: chunkRows.length,
          finished_at: new Date().toISOString(),
          logs: `إعادة معالجة: تم إنشاء ${chunkRows.length} chunk`,
        }).eq("id", job!.id);

        await supabase.from("knowledge_documents")
          .update({ processing_status: "completed" })
          .eq("id", document_id);

        return new Response(JSON.stringify({ success: true, chunks_created: chunkRows.length }), {
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

    // ===== UPDATE DOCUMENT CATEGORY =====
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
