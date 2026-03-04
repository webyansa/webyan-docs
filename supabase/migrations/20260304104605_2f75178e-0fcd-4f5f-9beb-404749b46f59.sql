
ALTER TABLE public.content_calendar ADD COLUMN IF NOT EXISTS metrics jsonb DEFAULT '{}';
ALTER TABLE public.marketing_plan_campaigns ADD COLUMN IF NOT EXISTS kpi_targets jsonb DEFAULT '{}';
ALTER TABLE public.marketing_plans ADD COLUMN IF NOT EXISTS kpi_targets jsonb DEFAULT '{}';
