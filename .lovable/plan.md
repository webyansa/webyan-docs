

# Grounded Chat Test — Implementation Plan

## Overview
A new admin page and backend action that chains: **Retrieval → Prompt Builder → OpenRouter → Answer + Sources + Debug**. This validates the full RAG pipeline end-to-end before production use.

## 1. Database Migration

**New table: `grounded_chat_tests`**
- `id uuid PK`, `question text`, `rewritten_query text`, `model text`, `top_k int`, `category_filter text`, `search_mode text`, `final_answer text`, `sources_json jsonb`, `prompt_sent text`, `response_status text`, `latency_ms int`, `token_usage jsonb`, `confidence_score float`, `is_grounded boolean`, `debug_info jsonb`, `created_at timestamptz default now()`
- RLS: admin only via `is_admin(auth.uid())`

## 2. Edge Function: New `grounded-chat-test` Action

Add a new action inside `manage-ai-providers/index.ts` (since it already has OpenRouter credentials access) or create a small new edge function. Given the complexity, **add to `manage-ai-providers`** with action `grounded-chat`.

### Pipeline (all server-side):

1. **Retrieval**: Call `process-knowledge-chunks` internally (or replicate the retrieval-test-v2 logic directly) using the existing hybrid pipeline — embed the question via OpenAI, run `match_knowledge_chunks` RPC, apply keyword search + reranking
2. **Grounding Check**: If top chunks have confidence < threshold or zero results → return "insufficient knowledge" without calling OpenRouter
3. **Prompt Builder** (backend only):
   - System: strict grounding instruction (Arabic)
   - Retrieved chunks formatted with titles, categories, content
   - User question appended
4. **OpenRouter Call**: Read `api_key_encrypted` + `base_url` from `ai_providers` table, send `POST /chat/completions` with chosen model
5. **Save to `grounded_chat_tests`** table
6. **Return**: answer, sources, debug info, latency, token usage

## 3. Frontend: New Page `GroundedChatTestPage.tsx`

Route: `/admin/grounded-chat-test`

**Controls:**
- Question textarea
- Model dropdown (from OpenRouter cached models)
- top_k selector (3/5/10)
- Category filter (optional)
- Debug Mode toggle
- "اسأل المساعد" button

**Results display (3 sections):**

**A) Final Answer** — formatted response card

**B) Sources Used** — list of chunks with title, source_file, category, similarity, section_path, content preview, View Full button

**C) Retrieval Summary** — chunks count, model, latency, grounded status

**Debug Panel** (when toggle on): original question, rewritten query, full prompt sent, model, status code, raw response, token usage, latency breakdown

**History Tab:** table of past tests with question, model, time, status, sources count, View Details button

## 4. Routing & Navigation

- Add route `/admin/grounded-chat-test` in `App.tsx`
- Add sidebar item "اختبار المحادثة" in AdminSidebar under the AI/System module

## 5. Anti-Hallucination Rules

- If no chunks retrieved or all similarity scores < 0.3: return fixed message "لم يتم العثور على معلومات كافية" without calling OpenRouter
- System prompt strictly instructs: answer only from provided references, state clearly when info is insufficient
- `is_grounded` flag stored in DB based on whether chunks were found

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | `grounded_chat_tests` table + RLS |
| `supabase/functions/manage-ai-providers/index.ts` | Add `grounded-chat` action with retrieval + prompt builder + OpenRouter call |
| `src/pages/admin/GroundedChatTestPage.tsx` | New page with chat test UI, results, debug, history |
| `src/App.tsx` | Add route + import |
| `src/components/admin/AdminSidebar.tsx` | Add nav item |

