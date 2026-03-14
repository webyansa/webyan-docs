
CREATE TABLE public.grounded_chat_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  rewritten_query text,
  model text,
  top_k integer DEFAULT 5,
  category_filter text,
  search_mode text DEFAULT 'hybrid_rerank',
  final_answer text,
  sources_json jsonb,
  prompt_sent text,
  response_status text,
  latency_ms integer,
  token_usage jsonb,
  confidence_score numeric,
  is_grounded boolean DEFAULT false,
  debug_info jsonb,
  validation_status text DEFAULT 'pending',
  validation_notes jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.grounded_chat_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage validations"
ON public.grounded_chat_validations
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
