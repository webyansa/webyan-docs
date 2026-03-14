

# Grounded Chat Validation & Model Selection

## Overview
Create a new dedicated validation page that extends the existing grounded chat test with a fixed 6-model selection, a Validation Engine layer, Quick Test Cases, and a separate `grounded_chat_validations` log table.

## What Already Exists
- `GroundedChatTestPage.tsx` — full RAG test page with retrieval, prompt builder, OpenRouter integration, debug, history
- `grounded-chat-test` edge function — complete pipeline (query rewrite → embedding → vector search → keyword search → reranking → grounding check → OpenRouter call → save)
- `grounded_chat_tests` DB table

## What's New

### 1. Database Migration
**New table: `grounded_chat_validations`**
Same structure as `grounded_chat_tests` plus validation-specific fields:
- `validation_status text` (pass / warning / failed)
- `validation_notes jsonb` (array of check results)
- All existing fields: question, model, top_k, category_filter, final_answer, sources_json, prompt_sent, response_status, latency_ms, token_usage, confidence_score, is_grounded, debug_info, created_at

RLS: admin only via `is_admin(auth.uid())`

### 2. Edge Function Update: `grounded-chat-test`
Add two new actions:

**`validate`** — Same pipeline as `test` but adds post-generation validation:
- Check 1: Were chunks retrieved before generation?
- Check 2: Sufficient chunk count (>= 2)?
- Check 3: Confidence score above threshold?
- Check 4: Answer references source content (keyword overlap check)?
- Check 5: Hallucination indicators (mentions things not in chunks)?
- Produces `validation_status`: pass (all checks pass), warning (some checks fail), failed (critical checks fail)
- Saves to `grounded_chat_validations` table

**`validation-history`** — Fetch from `grounded_chat_validations`

**`validation-get`** — Get single validation record

### 3. Frontend: New `GroundedChatValidationPage.tsx`
Route: `/admin/grounded-chat-validation`

**Fixed Model Dropdown** (no fetch needed):
```
Production Models:
  - openai/gpt-4o-mini [Recommended]
  - openai/gpt-4o [Premium]
  - anthropic/claude-sonnet-4.5 [Premium]

Free Test Models:
  - openai/gpt-oss-20b:free [Free]
  - google/gemma-3-27b-it:free [Free]
  - meta-llama/llama-3.3-70b-instruct:free [Free]
```
Default: `openai/gpt-4o-mini`

**Controls**: Question textarea, model dropdown, top_k (3/5/10), category filter, Debug Mode toggle, "تشغيل الاختبار" button

**Quick Test Cases** section with 5 preset buttons that auto-fill the question field

**Results (4 sections)**:
- A) Final Answer
- B) Sources Used (title, file, category, section_path, similarity, preview, View Full)
- C) Retrieval Summary (chunks count, category, top_k, retrieval time, total time, model)
- D) Validation Result — new section showing each validation check with pass/fail icons and overall Pass/Warning/Failed status

**Debug Panel** (when toggled): original question, embedding status, rewritten query, full chunks, full prompt, model, endpoint, status code, raw response, token usage, total latency

**Validation History** tab: table with question, model, status, time, sources count, View Details

### 4. Routing & Navigation
- Add route `/admin/grounded-chat-validation` → `GroundedChatValidationPage`
- Add sidebar item "التحقق من المحادثة" in AdminSidebar under AI/System module

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `grounded_chat_validations` table + RLS |
| `supabase/functions/grounded-chat-test/index.ts` | Add `validate`, `validation-history`, `validation-get` actions with validation engine |
| `src/pages/admin/GroundedChatValidationPage.tsx` | New page with fixed models, validation UI, quick tests, debug, history |
| `src/App.tsx` | Add route |
| `src/components/admin/AdminSidebar.tsx` | Add nav item |

