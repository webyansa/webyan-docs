
CREATE TABLE public.grounded_chat_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  rewritten_query text,
  model text,
  top_k int DEFAULT 5,
  category_filter text,
  search_mode text DEFAULT 'hybrid_rerank',
  final_answer text,
  sources_json jsonb,
  prompt_sent text,
  response_status text DEFAULT 'pending',
  latency_ms int,
  token_usage jsonb,
  confidence_score float,
  is_grounded boolean DEFAULT false,
  debug_info jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.grounded_chat_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on grounded_chat_tests"
  ON public.grounded_chat_tests
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
