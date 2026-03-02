
-- Marketing Plans table
CREATE TABLE public.marketing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  objective TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget NUMERIC,
  responsible_id UUID REFERENCES public.staff_members(id),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing Plan Campaigns table
CREATE TABLE public.marketing_plan_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.marketing_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'awareness' CHECK (campaign_type IN ('sales', 'awareness', 'launch', 'engagement')),
  target_audience TEXT,
  key_message TEXT,
  target_kpi TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content Calendar table
CREATE TABLE public.content_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.marketing_plan_campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'design' CHECK (content_type IN ('design', 'video', 'article', 'ad', 'tweet')),
  publish_date DATE,
  publish_time TIME,
  post_text TEXT,
  hashtags TEXT,
  cta TEXT,
  design_file_url TEXT,
  design_notes TEXT,
  design_status TEXT DEFAULT 'draft' CHECK (design_status IN ('draft', 'in_progress', 'ready', 'approved')),
  channels TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'waiting_design', 'waiting_approval', 'ready', 'published')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_plan_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin/editor
CREATE POLICY "Admin/Editor can manage marketing plans" ON public.marketing_plans
  FOR ALL USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin/Editor can manage plan campaigns" ON public.marketing_plan_campaigns
  FOR ALL USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin/Editor can manage content calendar" ON public.content_calendar
  FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_marketing_plans_updated_at
  BEFORE UPDATE ON public.marketing_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_plan_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_plan_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_calendar_updated_at
  BEFORE UPDATE ON public.content_calendar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
