
-- =============================================
-- نظام الحملات التسويقية البريدية
-- =============================================

-- 1. Enums
CREATE TYPE public.campaign_goal AS ENUM ('renewal', 'incentive', 'education', 'upgrade', 'alert');
CREATE TYPE public.campaign_audience_type AS ENUM ('segment', 'manual');
CREATE TYPE public.campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'completed', 'paused', 'cancelled');
CREATE TYPE public.email_send_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');
CREATE TYPE public.engagement_event_type AS ENUM ('open', 'click', 'bounce', 'unsubscribe');

-- 2. marketing_email_templates
CREATE TABLE public.marketing_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'general',
  variables_used JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/editor full access on templates" ON public.marketing_email_templates FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- 3. marketing_campaigns
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  goal public.campaign_goal NOT NULL DEFAULT 'renewal',
  template_id UUID REFERENCES public.marketing_email_templates(id) ON DELETE SET NULL,
  audience_type public.campaign_audience_type NOT NULL DEFAULT 'segment',
  audience_filters JSONB DEFAULT '{}'::jsonb,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  batch_size INTEGER NOT NULL DEFAULT 50,
  batch_delay_ms INTEGER NOT NULL DEFAULT 2000,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/editor full access on campaigns" ON public.marketing_campaigns FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- 4. campaign_recipients
CREATE TABLE public.campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  email_status public.email_send_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  open_count INTEGER NOT NULL DEFAULT 0,
  last_opened_at TIMESTAMPTZ,
  click_count INTEGER NOT NULL DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, organization_id)
);

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/editor full access on recipients" ON public.campaign_recipients FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- Enable realtime for recipients
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_recipients;

-- 5. email_engagement_events
CREATE TABLE public.email_engagement_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  event_type public.engagement_event_type NOT NULL,
  link_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_engagement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/editor full access on engagement" ON public.email_engagement_events FOR ALL USING (public.is_admin_or_editor(auth.uid()));
-- Allow public insert for tracking pixel/link clicks
CREATE POLICY "Public can insert engagement events" ON public.email_engagement_events FOR INSERT WITH CHECK (true);

-- 6. marketing_unsubscribes
CREATE TABLE public.marketing_unsubscribes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_unsubscribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/editor full access on unsubscribes" ON public.marketing_unsubscribes FOR ALL USING (public.is_admin_or_editor(auth.uid()));
-- Allow public insert for unsubscribe action
CREATE POLICY "Public can insert unsubscribe" ON public.marketing_unsubscribes FOR INSERT WITH CHECK (true);

-- 7. campaign_audit_log
CREATE TABLE public.campaign_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/editor full access on audit log" ON public.campaign_audit_log FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- 8. campaign_links
CREATE TABLE public.campaign_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  tracking_code TEXT NOT NULL UNIQUE,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/editor full access on links" ON public.campaign_links FOR ALL USING (public.is_admin_or_editor(auth.uid()));
-- Allow public select for link redirect
CREATE POLICY "Public can read links" ON public.campaign_links FOR SELECT USING (true);
-- Allow public update for click count
CREATE POLICY "Public can update link clicks" ON public.campaign_links FOR UPDATE USING (true);

-- Indexes
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_org ON public.campaign_recipients(organization_id);
CREATE INDEX idx_engagement_events_campaign ON public.email_engagement_events(campaign_id);
CREATE INDEX idx_engagement_events_org ON public.email_engagement_events(organization_id);
CREATE INDEX idx_campaign_links_code ON public.campaign_links(tracking_code);
CREATE INDEX idx_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX idx_audit_log_campaign ON public.campaign_audit_log(campaign_id);

-- Updated_at trigger for templates and campaigns
CREATE TRIGGER update_marketing_templates_updated_at
  BEFORE UPDATE ON public.marketing_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
