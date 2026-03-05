
ALTER TABLE public.marketing_plan_campaigns 
  ADD COLUMN campaign_types text[] DEFAULT '{}'::text[];

UPDATE public.marketing_plan_campaigns 
  SET campaign_types = CASE 
    WHEN campaign_type IS NOT NULL AND campaign_type != '' THEN ARRAY[campaign_type]
    ELSE '{}'::text[]
  END;
