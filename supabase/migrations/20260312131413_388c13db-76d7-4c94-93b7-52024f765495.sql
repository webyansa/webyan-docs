
-- ===== Knowledge Documents =====
CREATE TABLE public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  original_file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'md',
  category text NOT NULL DEFAULT 'general',
  source text NOT NULL DEFAULT 'upload',
  content_raw text NOT NULL DEFAULT '',
  processing_status text NOT NULL DEFAULT 'pending',
  processing_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/editor full access on knowledge_documents"
  ON public.knowledge_documents FOR ALL
  TO authenticated
  USING (public.is_admin_or_editor(auth.uid()))
  WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE TRIGGER update_knowledge_documents_updated_at
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Knowledge Chunks =====
CREATE TABLE public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT '',
  section_path text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  content text NOT NULL DEFAULT '',
  token_estimate int NOT NULL DEFAULT 0,
  char_count int NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'medium',
  is_embedded boolean NOT NULL DEFAULT false,
  embedding_status text NOT NULL DEFAULT 'pending',
  embedding_model text,
  vector_id text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/editor full access on knowledge_chunks"
  ON public.knowledge_chunks FOR ALL
  TO authenticated
  USING (public.is_admin_or_editor(auth.uid()))
  WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE TRIGGER update_knowledge_chunks_updated_at
  BEFORE UPDATE ON public.knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_knowledge_chunks_document_id ON public.knowledge_chunks(document_id);

-- ===== Knowledge Chunk Jobs =====
CREATE TABLE public.knowledge_chunk_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  job_type text NOT NULL DEFAULT 'chunking',
  status text NOT NULL DEFAULT 'pending',
  chunks_created int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  logs text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_chunk_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/editor full access on knowledge_chunk_jobs"
  ON public.knowledge_chunk_jobs FOR ALL
  TO authenticated
  USING (public.is_admin_or_editor(auth.uid()))
  WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE INDEX idx_knowledge_chunk_jobs_document_id ON public.knowledge_chunk_jobs(document_id);

-- ===== Storage Bucket =====
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-files', 'knowledge-files', false);

CREATE POLICY "Admin/editor access knowledge-files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'knowledge-files' AND public.is_admin_or_editor(auth.uid()))
  WITH CHECK (bucket_id = 'knowledge-files' AND public.is_admin_or_editor(auth.uid()));
