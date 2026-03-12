

# Fix Knowledge Chunking Engine

## Problem
The `parseMarkdownSections` function in the edge function has a logic bug: content before the first heading creates a "مقدمة" section, but more critically, the function likely fails to split properly when files use Windows line endings (`\r\n`) or when headings have specific formatting. Additionally, the engine doesn't return chunking statistics to the UI.

## Changes

### 1. Edge Function (`supabase/functions/process-knowledge-chunks/index.ts`)

**Fix `parseMarkdownSections`:**
- Normalize line endings (`\r\n` → `\n`) before processing
- Make the heading regex more robust to handle edge cases (trailing spaces, etc.)
- Ensure content before first heading goes into an intro section properly

**Improve `splitLongSection`:**
- When a section has no double-newline paragraph breaks, fall back to splitting by single newlines or by sentence boundaries
- Add minimum chunk size check — don't create chunks under ~100 tokens unless it's the only content

**Improve `generateChunks`:**
- If the entire file produces 0 sections from headings, fall back to text-based splitting (paragraph-based)
- Return detailed stats: `sections_found`, `chunks_created`, `splitting_method` ("markdown_headers" or "text_fallback")

**Update response format for `generate-chunks` and `reprocess`:**
- Include `sections_found`, `splitting_method` in the response JSON and in job logs

### 2. Frontend (`src/pages/admin/KnowledgeChunkingPage.tsx`)

**Documents Tab enhancements:**
- Show chunking stats after generate/reprocess (sections discovered, chunks created, splitting method) via toast
- Add a dedicated "Re-chunk" button (same as reprocess but more prominent/labeled differently)

**Chunks Explorer enhancements:**
- Add document name column to chunks table (already has `knowledge_documents.title` in the query)
- Ensure chunk rows show: document name, section title, chunk index, content preview, token estimate

### Files to modify:
1. `supabase/functions/process-knowledge-chunks/index.ts` — fix chunking logic
2. `src/pages/admin/KnowledgeChunkingPage.tsx` — UI stats display

