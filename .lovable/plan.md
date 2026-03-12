

# Knowledge Chunking Manager - Implementation Plan

## Overview
Add a full-featured Knowledge Chunking Manager under AI Settings in the admin panel. This includes 3 database tables, 1 storage bucket, 1 edge function for chunking logic, and 1 new admin page with 4 tabbed sections.

## 1. Database Migration

Create 3 tables with RLS policies (admin-only access):

**`knowledge_documents`** - stores uploaded knowledge files with raw content, category, processing status.

**`knowledge_chunks`** - stores individual chunks with document FK, content, token estimates, priority, embedding-ready fields (`is_embedded`, `embedding_status`, `embedding_model`, `vector_id`), and `metadata_json`.

**`knowledge_chunk_jobs`** - tracks chunking/rechunking jobs with status, logs, timing.

All tables get `updated_at` triggers and RLS policies restricted to admin/editor roles via `is_admin_or_editor()`.

Storage bucket: `knowledge-files` (public: false) for uploaded files.

## 2. Edge Function: `process-knowledge-chunks`

Single edge function handling all API operations via action-based routing:

- **`upload`** - receives file content (read client-side for .md/.txt), stores raw content in `knowledge_documents`
- **`generate-chunks`** - the core chunking engine:
  - **Markdown**: splits by heading hierarchy (# ## ###), each section becomes a chunk. Long sections (>800 tokens) get sub-divided by paragraphs
  - **Text**: splits by double-newline paragraphs, groups into 300-800 token chunks
  - Token estimation: `Math.ceil(text.length / 4)` (rough approximation)
  - Priority auto-assignment: `high` for categories like facts/faq/policies/support, `medium` for general, `low` for marketing
  - Generates `metadata_json` per chunk with source_file, category, section_path, title, priority, chunk_index, file_type
  - Creates a job record in `knowledge_chunk_jobs` with timing and logs
- **`reprocess`** - deletes existing chunks for a document, re-runs generate-chunks
- **`update-chunk`** - update a single chunk's content/title/priority
- **`delete-chunk`** - delete a single chunk
- **`list-documents`**, **`list-chunks`**, **`list-jobs`** - query endpoints with filtering

Uses `SUPABASE_SERVICE_ROLE_KEY` for DB access. JWT validation via `getClaims()`.

## 3. Admin Page: `KnowledgeChunkingPage.tsx`

Route: `/admin/knowledge-chunking`

**4 tabs using existing Tabs component:**

### Tab 1: Documents
- Table listing all documents with title, file_type, category, status, chunk count, actions
- Upload dialog: file picker (.md, .txt) + title + category selector (12 predefined categories)
- File content read client-side, sent to edge function
- Actions per document: View Raw Content (dialog), Generate Chunks, Reprocess, Delete
- Category shown as editable select

### Tab 2: Chunks Explorer  
- Filterable table: document, category, priority, embedding_status
- Columns: title, section_path, content preview (truncated), token_estimate, char_count, priority badge, embedding_status badge
- Actions: View Full (dialog), Edit (inline dialog), Delete

### Tab 3: Chunking Jobs
- Table: document name, job_type, status, chunks_created, started_at, finished_at, duration
- Expandable logs view
- Re-run button

### Tab 4: Processing Logs
- Aggregated view from jobs table, filtered/sorted by time
- Shows errors and warnings prominently

## 4. Sidebar & Routing Integration

**AdminSidebar.tsx**: Add to the `system` module:
```
{ title: 'تقسيم المعرفة', href: '/admin/knowledge-chunking', icon: Sparkles, permission: 'canManageSystemSettings' }
```

**App.tsx**: Add route:
```
<Route path="knowledge-chunking" element={<KnowledgeChunkingPage />} />
```

## 5. Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/xxx.sql` | Create 3 tables + RLS + storage bucket |
| `supabase/functions/process-knowledge-chunks/index.ts` | Edge function with chunking engine |
| `supabase/config.toml` | Add `verify_jwt = false` for new function |
| `src/pages/admin/KnowledgeChunkingPage.tsx` | Main page with 4 tabs |
| `src/components/admin/AdminSidebar.tsx` | Add nav item |
| `src/App.tsx` | Add route + import |

## 6. Chunking Algorithm Detail

```text
Input: Markdown document
  │
  ├─ Split by heading regex /^(#{1,3})\s+(.+)$/m
  │
  ├─ For each section:
  │   ├─ Estimate tokens (chars / 4)
  │   ├─ If tokens <= 800 → single chunk
  │   ├─ If tokens > 800 → split by paragraphs, group into ~500 token chunks
  │   ├─ Assign section_path from heading hierarchy
  │   ├─ Auto-assign priority based on category
  │   └─ Build metadata_json
  │
  └─ Insert all chunks + create job record
```

