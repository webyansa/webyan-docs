
CREATE TABLE public.ai_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  module text NOT NULL DEFAULT 'marketing',
  platform text,
  tone text,
  content_type text,
  request_payload jsonb DEFAULT '{}'::jsonb,
  response_payload jsonb DEFAULT '{}'::jsonb,
  used_file_search boolean DEFAULT false,
  model_used text,
  mode_used text,
  latency_ms integer,
  status text NOT NULL DEFAULT 'success',
  error_message text
);

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ai_generation_logs"
  ON public.ai_generation_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role can insert ai_generation_logs"
  ON public.ai_generation_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX idx_ai_generation_logs_created_at ON public.ai_generation_logs(created_at DESC);
CREATE INDEX idx_ai_generation_logs_status ON public.ai_generation_logs(status);
