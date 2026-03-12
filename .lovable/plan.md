

# Embeddings Pipeline + Vector DB Sync + Retrieval Test

## Approach

Use **pgvector** (Supabase's built-in vector extension) to store embeddings directly in the `knowledge_chunks` table, and **OpenAI's `text-embedding-3-small`** model (using the existing `ai_openai_api_key` from `system_settings`) to generate embeddings. No external Vector DB needed.

## 1. Database Migration

- Enable `vector` extension (pgvector)
- Add `embedded_at timestamptz` column to `knowledge_chunks`
- Add `embedding vector(1536)` column to `knowledge_chunks` (1536 = text-embedding-3-small dimension)
- Create a `match_knowledge_chunks` database function for similarity search:
  - Takes query embedding vector, match threshold, match count, optional category filter
  - Returns chunks ordered by cosine similarity
- Create an index on the embedding column for fast search (ivfflat or hnsw)

## 2. Edge Function Updates (`process-knowledge-chunks`)

Add 4 new actions:

**`generate-embeddings`**:
- Fetch chunks where `is_embedded = false` or `embedding_status IN ('pending', 'failed')`
- Batch them (up to 20 at a time to respect API limits)
- Call OpenAI embeddings API with `text-embedding-3-small`
- For each chunk: store the vector in the `embedding` column, set `is_embedded = true`, `embedding_status = 'embedded'`, `embedding_model = 'text-embedding-3-small'`, `embedded_at = now()`
- On failure per chunk: set `embedding_status = 'failed'`
- Return stats: `embedded_count`, `failed_count`

**`retry-failed-embeddings`**:
- Same as above but only targets `embedding_status = 'failed'`

**`embedding-stats`**:
- Return counts: pending, embedded, failed, total

**`retrieval-test`**:
- Take user question text, optional category filter, top_k (3/5/10)
- Generate embedding for the question via OpenAI
- Call `match_knowledge_chunks` RPC
- Return matched chunks with similarity scores

Uses OpenAI API key from `system_settings.ai_openai_api_key` (same pattern as `assistant-chat` function).

## 3. Frontend: Two New Tabs

### Tab: "التضمين / Vector Sync"
- Stats cards: pending count, embedded count, failed count
- Buttons: "Generate Embeddings", "Retry Failed", "Sync All"
- Progress indicator during processing
- Status badges: pending (outline), processing (secondary), embedded (green default), failed (destructive)

### Tab: "اختبار الاسترجاع" (Retrieval Test)
- Question input field
- Category filter (optional, from CATEGORIES list)
- top_k selector (3 / 5 / 10)
- Search button
- Results list showing: title, source_file, category, section_path, similarity score (percentage), content preview, "View Full" button

## 4. Tab Layout Change

Update TabsList from `grid-cols-4` to `grid-cols-6` to accommodate 2 new tabs:
- المستندات | استعراض Chunks | العمليات | السجلات | **التضمين** | **اختبار الاسترجاع**

## Files to Create/Modify

| File | Action |
|------|--------|
| New migration SQL | Add pgvector extension, `embedding` + `embedded_at` columns, `match_knowledge_chunks` function |
| `supabase/functions/process-knowledge-chunks/index.ts` | Add 4 new actions |
| `src/pages/admin/KnowledgeChunkingPage.tsx` | Add 2 new tab components + update tab layout |

## Dependencies

- OpenAI API key must be configured in `system_settings` (key: `ai_openai_api_key`) — same key already used by `assistant-chat` function
- No new npm packages or external services needed

