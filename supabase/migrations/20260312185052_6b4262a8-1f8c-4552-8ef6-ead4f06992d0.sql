
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add embedding and embedded_at columns to knowledge_chunks
ALTER TABLE public.knowledge_chunks 
  ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536),
  ADD COLUMN IF NOT EXISTS embedded_at timestamptz;

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx 
  ON public.knowledge_chunks 
  USING ivfflat (embedding extensions.vector_cosine_ops) 
  WITH (lists = 100);

-- Create match function for similarity search
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding extensions.vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_index int,
  title text,
  section_path text,
  category text,
  content text,
  token_estimate int,
  priority text,
  metadata_json jsonb,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.chunk_index,
    kc.title,
    kc.section_path,
    kc.category,
    kc.content,
    kc.token_estimate,
    kc.priority,
    kc.metadata_json,
    (1 - (kc.embedding OPERATOR(extensions.<=>) query_embedding))::float AS similarity
  FROM public.knowledge_chunks kc
  WHERE kc.is_embedded = true
    AND kc.embedding IS NOT NULL
    AND (filter_category IS NULL OR kc.category = filter_category)
    AND (1 - (kc.embedding OPERATOR(extensions.<=>) query_embedding)) > match_threshold
  ORDER BY kc.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT match_count;
END;
$$;
