
CREATE TABLE public.grounded_chat_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT,
  model_used TEXT,
  provider TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT,
  provider_response TEXT,
  status_code INTEGER,
  prompt_size INTEGER,
  retrieved_chunks_count INTEGER,
  latency_ms INTEGER,
  fallback_used BOOLEAN DEFAULT false,
  fallback_model TEXT,
  debug_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grounded_chat_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage error logs"
ON public.grounded_chat_error_logs
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
