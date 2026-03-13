

# Retrieval Quality Optimization

## Overview
Add a multi-layer retrieval optimization pipeline to the existing knowledge chunking system: Query Rewriting, Hybrid Search, Metadata Boosting, Reranking, and a debug-friendly UI.

## 1. Edge Function: New `retrieval-test-v2` Action

Replace/extend the current `retrieval-test` action in `process-knowledge-chunks/index.ts` with a full pipeline:

### Pipeline Stages

**Stage 1: Query Understanding & Rewriting**
- Use OpenAI (gpt-4o-mini, cheap & fast) to rewrite the query:
  - Extract keywords (Arabic + English)
  - Generate 2-3 sub-queries for compound questions
  - Detect intent category (pricing, support, policies, style, general)
- Heuristic fallback if no API key or to save cost: regex-based keyword extraction + category detection from keyword lists

**Stage 2: Multi-Query Vector Search**
- Generate embeddings for: original query + each sub-query
- Run `match_knowledge_chunks` RPC for each embedding with `match_count = 15` and `match_threshold = 0.2` (lower threshold to cast wider net)
- Merge results, deduplicate by chunk ID, keep highest similarity per chunk

**Stage 3: Keyword/Lexical Search (Hybrid)**
- New DB function `keyword_search_knowledge_chunks`: uses `to_tsvector('simple', content) @@ plainto_tsquery('simple', keyword)` or simple `ILIKE` for Arabic
- Run keyword search using extracted keywords
- Assign a `keyword_score` (0-1) based on number of keyword matches found in content

**Stage 4: Metadata Boosting**
- Heuristic rules applied as score multipliers:
  - Question contains سعر/أسعار/اشتراك/خطة/pricing → boost `pricing`, `plans`, `faq`, `facts` categories by 1.3x
  - Question contains دعم/مشكلة/مساعدة → boost `support`, `faq` by 1.3x
  - Question contains سياسة/شروط → boost `policies` by 1.3x
  - Question contains ممنوع/صياغة/لا تقل → boost `do_not_say`, `writing_style` by 1.3x
  - Priority `high` → 1.15x, `medium` → 1.0x, `low` → 0.9x
  - Title contains query keywords → 1.1x

**Stage 5: Final Score Computation & Reranking**
```
final_score = (similarity * 0.55) + (keyword_score * 0.25) + (metadata_boost * 0.20)
```
- Sort by `final_score` descending
- Return top_k results with all score breakdowns
- Compute overall `confidence`: avg of top 3 final_scores

**Stage 6: Logging**
- Insert a record into a new `knowledge_retrieval_logs` table with: original_query, rewritten_queries, search_mode, candidates_before_rerank, final_results, timing per stage

### Search Mode Support
The action accepts a `search_mode` parameter:
- `vector_only` — skip keyword search, skip reranking, just vector similarity (current behavior)
- `hybrid` — vector + keyword, no reranking
- `hybrid_rerank` — full pipeline (default)

## 2. Database Migration

**New DB function: `keyword_search_knowledge_chunks`**
```sql
CREATE OR REPLACE FUNCTION keyword_search_knowledge_chunks(
  search_keywords text[],
  max_results int DEFAULT 20,
  filter_category text DEFAULT NULL
) RETURNS TABLE (id uuid, keyword_matches int, matched_keywords text[])
```
- For each keyword, check `content ILIKE '%' || keyword || '%'` (simple but effective for Arabic)
- Return chunks with match count

**New table: `knowledge_retrieval_logs`**
- id, original_query, rewritten_queries (jsonb), detected_intent (text), search_mode, candidates_count, final_results_count, confidence_score, timing_ms (jsonb), results_summary (jsonb), created_at
- RLS: admin/editor only

## 3. Frontend: Enhanced Retrieval Test Tab

**Search Controls — add:**
- Search Mode selector: "Vector فقط" / "Hybrid" / "Hybrid + Reranking"
- All existing controls remain (question, category filter, top_k)

**Results Debug Panel (shown after search):**
- Query Analysis card: original question, rewritten query, detected intent, extracted keywords, applied category boosts
- Stats row: candidates before rerank, final results count, confidence score, total time
- Per-result card shows:
  - title, source_file, category badge, section_path
  - 3 score bars: similarity_score, keyword_score, final_score
  - priority badge
  - ranking reason tags (e.g., "تطابق تصنيف التسعير", "تطابق كلمة مفتاحية", "تشابه دلالي عالي")
  - content preview + View Full button

**New sub-tab or section: Retrieval Logs**
- Table showing recent retrieval tests with query, mode, confidence, results count, timestamp
- Click to expand full debug details

## 4. Files to Create/Modify

| File | Action |
|------|--------|
| New migration SQL | `keyword_search_knowledge_chunks` function + `knowledge_retrieval_logs` table + RLS |
| `supabase/functions/process-knowledge-chunks/index.ts` | Add query rewriting, hybrid search, boosting, reranking logic in new `retrieval-test` handler |
| `src/pages/admin/KnowledgeChunkingPage.tsx` | Enhanced RetrievalTestTab with mode selector, debug panels, score breakdowns, logs |

## 5. Heuristic Rules (Hardcoded)

```typescript
const CATEGORY_BOOST_RULES = [
  { keywords: ['سعر','أسعار','اشتراك','خطة','خطط','باقة','باقات','pricing','price','plan','subscription'], boost_categories: ['pricing','faq','facts'] },
  { keywords: ['دعم','مشكلة','مساعدة','تذكرة','help','support','issue'], boost_categories: ['support','faq'] },
  { keywords: ['سياسة','شروط','أحكام','policy','terms'], boost_categories: ['policies'] },
  { keywords: ['ممنوع','صياغة','لا تقل','أسلوب','كتابة','style','tone'], boost_categories: ['do_not_say','writing_style','ai_guidelines'] },
];
```

## 6. Query Rewriting Strategy

Use OpenAI chat completion (gpt-4o-mini) with a system prompt:
```
You are a search query optimizer for an Arabic knowledge base about "Webyan" platform.
Given a user question, return JSON:
{
  "rewritten_query": "optimized version",
  "sub_queries": ["query1", "query2"],
  "keywords_ar": ["كلمة1", "كلمة2"],
  "keywords_en": ["keyword1"],
  "detected_intent": "pricing|support|policies|style|general"
}
```

If the API call fails or is too slow, fall back to regex-based keyword extraction.

