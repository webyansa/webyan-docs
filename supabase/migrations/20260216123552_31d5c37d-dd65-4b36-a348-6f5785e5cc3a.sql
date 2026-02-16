
-- Add new columns to pricing_plans
ALTER TABLE public.pricing_plans 
  ADD COLUMN IF NOT EXISTS comparison_features jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS optional_addons jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS display_badge text,
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- Public SELECT policy for active public plans
CREATE POLICY "Public can view active public plans"
  ON public.pricing_plans FOR SELECT
  USING (is_active = true AND is_public = true);

-- Create website_subscription_requests table
CREATE TABLE public.website_subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text UNIQUE,
  plan_id uuid REFERENCES public.pricing_plans(id),
  plan_name text,
  plan_price numeric DEFAULT 0,
  selected_addons jsonb DEFAULT '[]'::jsonb,
  total_amount numeric DEFAULT 0,
  organization_name text NOT NULL,
  contact_name text NOT NULL,
  phone text,
  email text NOT NULL,
  entity_type text,
  entity_category text,
  region text,
  address text,
  status text DEFAULT 'new',
  source text DEFAULT 'website',
  page_source text,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  assigned_to uuid REFERENCES public.staff_members(id),
  assigned_at timestamptz,
  converted_organization_id uuid REFERENCES public.client_organizations(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-generate request_number
CREATE OR REPLACE FUNCTION public.generate_web_sub_request_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    year_str := to_char(CURRENT_DATE, 'YYYY');
    SELECT COALESCE(MAX(
      NULLIF(regexp_replace(request_number, '^SUB-' || year_str || '-', ''), '')::integer
    ), 0) + 1
    INTO seq_num
    FROM public.website_subscription_requests
    WHERE request_number LIKE 'SUB-' || year_str || '-%';
    NEW.request_number := 'SUB-' || year_str || '-' || LPAD(seq_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_web_sub_request_number
  BEFORE INSERT ON public.website_subscription_requests
  FOR EACH ROW EXECUTE FUNCTION public.generate_web_sub_request_number();

CREATE TRIGGER update_web_sub_requests_updated_at
  BEFORE UPDATE ON public.website_subscription_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.website_subscription_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/editor can manage website_subscription_requests"
  ON public.website_subscription_requests FOR ALL
  USING (public.is_admin_or_editor(auth.uid()));

-- Create timeline table
CREATE TABLE public.website_subscription_request_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.website_subscription_requests(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid,
  old_value text,
  new_value text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.website_subscription_request_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/editor can manage web_sub_timeline"
  ON public.website_subscription_request_timeline FOR ALL
  USING (public.is_admin_or_editor(auth.uid()));
