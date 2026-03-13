
CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  api_key_encrypted text,
  base_url text,
  default_model text,
  enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'inactive',
  last_tested_at timestamptz,
  last_test_result text,
  last_test_latency_ms int,
  models_cache jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on ai_providers"
  ON public.ai_providers
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE UNIQUE INDEX ai_providers_provider_name_idx ON public.ai_providers (provider_name);
