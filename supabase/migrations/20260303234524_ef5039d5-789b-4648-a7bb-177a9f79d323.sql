
-- 1. Add marketing permission to staff_members
ALTER TABLE public.staff_members 
  ADD COLUMN IF NOT EXISTS can_manage_marketing BOOLEAN NOT NULL DEFAULT false;

-- 2. Add designer_id and publisher_id to content_calendar
ALTER TABLE public.content_calendar 
  ADD COLUMN IF NOT EXISTS designer_id UUID REFERENCES public.staff_members(id),
  ADD COLUMN IF NOT EXISTS publisher_id UUID REFERENCES public.staff_members(id);
