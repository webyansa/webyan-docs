-- Create website API tokens table for secure form submissions
CREATE TABLE public.website_api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  domain TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0
);

-- Create website form submissions table
CREATE TABLE public.website_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_number TEXT NOT NULL UNIQUE,
  form_type TEXT NOT NULL DEFAULT 'demo_request',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'not_qualified', 'converted')),
  
  -- Form data
  organization_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  interest_type TEXT CHECK (interest_type IN ('webyan_subscription', 'custom_platform', 'consulting')),
  organization_size TEXT CHECK (organization_size IN ('small', 'medium', 'large')),
  notes TEXT,
  
  -- Tracking data
  source TEXT DEFAULT 'website',
  source_page TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Linked records
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
  
  -- Assignment
  assigned_to UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  contacted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.website_api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for API tokens (admin only)
CREATE POLICY "Admins can manage API tokens"
ON public.website_api_tokens
FOR ALL
USING (public.is_admin(auth.uid()));

-- RLS policies for form submissions (admin and staff)
CREATE POLICY "Staff can view form submissions"
ON public.website_form_submissions
FOR SELECT
USING (
  public.is_admin(auth.uid()) OR 
  public.is_admin_or_editor(auth.uid()) OR 
  public.is_staff(auth.uid())
);

CREATE POLICY "Staff can update form submissions"
ON public.website_form_submissions
FOR UPDATE
USING (
  public.is_admin(auth.uid()) OR 
  public.is_admin_or_editor(auth.uid()) OR 
  public.is_staff(auth.uid())
);

CREATE POLICY "System can insert form submissions"
ON public.website_form_submissions
FOR INSERT
WITH CHECK (true);

-- Generate submission number function
CREATE OR REPLACE FUNCTION public.generate_submission_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  year_str := to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(submission_number, '^WEB-' || year_str || '-', ''), '')::integer
  ), 0) + 1
  INTO seq_num
  FROM public.website_form_submissions
  WHERE submission_number LIKE 'WEB-' || year_str || '-%';
  
  NEW.submission_number := 'WEB-' || year_str || '-' || LPAD(seq_num::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for submission number
CREATE TRIGGER generate_submission_number_trigger
BEFORE INSERT ON public.website_form_submissions
FOR EACH ROW
WHEN (NEW.submission_number IS NULL)
EXECUTE FUNCTION public.generate_submission_number();

-- Update timestamp trigger
CREATE TRIGGER update_website_form_submissions_updated_at
BEFORE UPDATE ON public.website_form_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_website_submissions_email ON public.website_form_submissions(email);
CREATE INDEX idx_website_submissions_status ON public.website_form_submissions(status);
CREATE INDEX idx_website_submissions_form_type ON public.website_form_submissions(form_type);
CREATE INDEX idx_website_submissions_created_at ON public.website_form_submissions(created_at DESC);
CREATE INDEX idx_website_submissions_lead_id ON public.website_form_submissions(lead_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_form_submissions;

-- Insert default API token for the main website (token will be generated in edge function)
-- The actual token value will be: webyan_demo_2024_secure_token
INSERT INTO public.website_api_tokens (name, token_hash, domain)
VALUES (
  'الموقع الرسمي لويبيان',
  encode(sha256('webyan_demo_2024_secure_token'::bytea), 'hex'),
  'webyan.net'
);