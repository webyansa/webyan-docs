
-- Create client_api_keys table
CREATE TABLE public.client_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'المفتاح الرئيسي',
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  allowed_domains TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_api_keys ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage API keys"
  ON public.client_api_keys
  FOR ALL
  USING (public.is_admin(auth.uid()) OR public.is_admin_or_editor(auth.uid()));

-- Allow edge functions (service role) to read and update usage
CREATE POLICY "Service role full access"
  ON public.client_api_keys
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast API key lookups
CREATE INDEX idx_client_api_keys_api_key ON public.client_api_keys(api_key);
CREATE INDEX idx_client_api_keys_org ON public.client_api_keys(organization_id);

-- Trigger for updated_at
CREATE TRIGGER update_client_api_keys_updated_at
  BEFORE UPDATE ON public.client_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
