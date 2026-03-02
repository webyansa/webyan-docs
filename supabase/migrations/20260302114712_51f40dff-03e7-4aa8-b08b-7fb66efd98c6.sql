
-- Create discounts table
CREATE TABLE public.discounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text,
  requires_code boolean NOT NULL DEFAULT false,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  scope_type text NOT NULL DEFAULT 'full_quote',
  scope_ids jsonb DEFAULT '[]'::jsonb,
  max_total_usage integer,
  max_per_client integer,
  current_usage integer NOT NULL DEFAULT 0,
  internal_notes text,
  created_by uuid REFERENCES public.staff_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create discount_usage_log table
CREATE TABLE public.discount_usage_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_id uuid NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.crm_quotes(id) ON DELETE CASCADE,
  applied_by uuid REFERENCES public.staff_members(id),
  applied_at timestamptz NOT NULL DEFAULT now(),
  discount_value_applied numeric NOT NULL DEFAULT 0
);

-- Add discount columns to crm_quotes
ALTER TABLE public.crm_quotes
  ADD COLUMN IF NOT EXISTS discount_source text,
  ADD COLUMN IF NOT EXISTS discount_id uuid REFERENCES public.discounts(id),
  ADD COLUMN IF NOT EXISTS discount_name text;

-- Enable RLS
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for discounts - admin and editor only
CREATE POLICY "Admin and editor can view discounts"
  ON public.discounts FOR SELECT
  TO authenticated
  USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin and editor can insert discounts"
  ON public.discounts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin and editor can update discounts"
  ON public.discounts FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin and editor can delete discounts"
  ON public.discounts FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS policies for discount_usage_log
CREATE POLICY "Admin and editor can view discount usage"
  ON public.discount_usage_log FOR SELECT
  TO authenticated
  USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin and editor can insert discount usage"
  ON public.discount_usage_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_editor(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_discounts_updated_at
  BEFORE UPDATE ON public.discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
