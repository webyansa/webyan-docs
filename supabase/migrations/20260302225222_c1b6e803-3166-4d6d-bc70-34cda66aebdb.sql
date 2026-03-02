
-- Create AI generations audit table
CREATE TABLE public.ai_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.content_calendar(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  prompt_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

-- Admin/editor can view all
CREATE POLICY "Admin/editor can manage ai_generations"
ON public.ai_generations
FOR ALL
TO authenticated
USING (public.is_admin_or_editor(auth.uid()))
WITH CHECK (public.is_admin_or_editor(auth.uid()));

-- Staff can view own
CREATE POLICY "Staff can view own ai_generations"
ON public.ai_generations
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Staff can insert own ai_generations"
ON public.ai_generations
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND user_id = auth.uid());
