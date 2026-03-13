

# OpenRouter Provider Integration

## Overview
Add a dedicated OpenRouter AI provider management page with full backend integration: save settings, test connection, fetch models, and test generation — all through a secure edge function.

## 1. Database Migration

**New table: `ai_providers`**
- `id uuid PK`, `provider_name text`, `api_key_encrypted text`, `base_url text`, `default_model text`, `enabled boolean default false`, `status text default 'inactive'`, `last_tested_at timestamptz`, `last_test_result text`, `last_test_latency_ms int`, `models_cache jsonb`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`
- RLS: admin only (using `is_admin(auth.uid())`)
- `api_key_encrypted` stored as-is in DB but **never returned to frontend in full** — the edge function masks it

## 2. Edge Function: `manage-ai-providers/index.ts`

Single edge function with actions:

| Action | Description |
|--------|------------|
| `save` | Upsert provider row (api_key, base_url, default_model, enabled) |
| `get-status` | Return provider info with masked API key (`sk-or-...****xxxx`) |
| `test-connection` | `GET https://openrouter.ai/api/v1/models` with auth header → update status |
| `fetch-models` | Same endpoint, parse & cache model list in `models_cache` jsonb |
| `test-generation` | `POST /chat/completions` with simple prompt, measure latency, update status |

All OpenRouter calls happen server-side only. API key read from `ai_providers` table using service role.

## 3. Frontend: New Page `AIProvidersPage.tsx`

Route: `/admin/ai-providers`

**Layout:**
- Provider card for OpenRouter with:
  - API Key input (masked after save)
  - Base URL input (default: `https://openrouter.ai/api/v1`)
  - Model dropdown (populated from fetch-models)
  - Enable/disable switch
  - Status badge (inactive / active / error)
  - Last tested time + latency
  - 4 action buttons: Save, Test Connection, Fetch Models, Test Generation
- Debug panel (collapsible): shows last endpoint called, status code, response snippet, error

## 4. Routing & Navigation

- Add route `/admin/ai-providers` → `AIProvidersPage` in `App.tsx`
- Add sidebar item "مزودي AI" in the "النظام" module in `AdminSidebar.tsx`

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `ai_providers` table + RLS |
| `supabase/functions/manage-ai-providers/index.ts` | New edge function |
| `src/pages/admin/AIProvidersPage.tsx` | New page |
| `src/App.tsx` | Add route |
| `src/components/admin/AdminSidebar.tsx` | Add nav item |
| `supabase/config.toml` | Add function config |

