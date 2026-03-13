
-- Create keyword search function for hybrid retrieval
CREATE OR REPLACE FUNCTION public.keyword_search_knowledge_chunks(
  search_keywords text[],
  max_results int DEFAULT 20,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (id uuid, keyword_matches int, matched_keywords text[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  kw text;
BEGIN
  RETURN QUERY
  WITH chunk_matches AS (
    SELECT
      kc.id,
      array_agg(DISTINCT keyword) FILTER (WHERE kc.content ILIKE '%' || keyword || '%' OR kc.title ILIKE '%' || keyword || '%') AS matches
    FROM public.knowledge_chunks kc
    CROSS JOIN unnest(search_keywords) AS keyword
    WHERE kc.is_embedded = true
      AND kc.embedding IS NOT NULL
      AND (filter_category IS NULL OR kc.category = filter_category)
      AND (kc.content ILIKE '%' || keyword || '%' OR kc.title ILIKE '%' || keyword || '%')
    GROUP BY kc.id
  )
  SELECT
    cm.id,
    coalesce(array_length(cm.matches, 1), 0)::int AS keyword_matches,
    coalesce(cm.matches, ARRAY[]::text[]) AS matched_keywords
  FROM chunk_matches cm
  ORDER BY array_length(cm.matches, 1) DESC NULLS LAST
  LIMIT max_results;
END;
$$;

-- Create knowledge retrieval logs table
CREATE TABLE IF NOT EXISTS public.knowledge_retrieval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_query text NOT NULL,
  rewritten_queries jsonb DEFAULT '[]'::jsonb,
  detected_intent text,
  search_mode text NOT NULL DEFAULT 'hybrid_rerank',
  candidates_count int DEFAULT 0,
  final_results_count int DEFAULT 0,
  confidence_score float DEFAULT 0,
  timing_ms jsonb DEFAULT '{}'::jsonb,
  results_summary jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_retrieval_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin/editor only
CREATE POLICY "Admin/editor can read retrieval logs"
  ON public.knowledge_retrieval_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin/editor can insert retrieval logs"
  ON public.knowledge_retrieval_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_editor(auth.uid()));
