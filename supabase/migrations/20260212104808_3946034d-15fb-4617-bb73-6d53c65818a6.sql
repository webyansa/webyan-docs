
-- Drop the overly permissive service role policy
DROP POLICY "Service role full access" ON public.client_api_keys;

-- Drop the admin policy and recreate properly
DROP POLICY "Admins can manage API keys" ON public.client_api_keys;

-- Admin management policy
CREATE POLICY "Admins can manage API keys"
  ON public.client_api_keys
  FOR ALL
  USING (public.is_admin_or_editor(auth.uid()));

-- Allow anon/public to SELECT active keys (for embed verification)
CREATE POLICY "Anyone can verify active API keys"
  ON public.client_api_keys
  FOR SELECT
  USING (is_active = true);
