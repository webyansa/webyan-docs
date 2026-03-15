
-- AI Copilot Sessions
CREATE TABLE public.ai_copilot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'جلسة جديدة',
  mode text NOT NULL DEFAULT 'ask',
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_copilot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own copilot sessions"
ON public.ai_copilot_sessions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- AI Copilot Messages
CREATE TABLE public.ai_copilot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_copilot_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  sources_json jsonb,
  retrieval_json jsonb,
  model_used text,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_copilot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own copilot messages"
ON public.ai_copilot_messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ai_copilot_sessions s
    WHERE s.id = ai_copilot_messages.session_id AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_copilot_sessions s
    WHERE s.id = ai_copilot_messages.session_id AND s.user_id = auth.uid()
  )
);

-- AI Copilot Actions
CREATE TABLE public.ai_copilot_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_copilot_sessions(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  input_json jsonb,
  output_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_copilot_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own copilot actions"
ON public.ai_copilot_actions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ai_copilot_sessions s
    WHERE s.id = ai_copilot_actions.session_id AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_copilot_sessions s
    WHERE s.id = ai_copilot_actions.session_id AND s.user_id = auth.uid()
  )
);

-- Auto-update updated_at on sessions
CREATE TRIGGER update_ai_copilot_sessions_updated_at
  BEFORE UPDATE ON public.ai_copilot_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
