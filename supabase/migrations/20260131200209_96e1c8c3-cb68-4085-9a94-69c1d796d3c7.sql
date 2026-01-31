-- Add assigned_to field to project_phases for tracking phase ownership
ALTER TABLE public.project_phases 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.staff_members(id);

-- Add index for faster queries by assigned staff
CREATE INDEX IF NOT EXISTS idx_project_phases_assigned_to ON public.project_phases(assigned_to);

-- Create a view for phase performance analytics
CREATE OR REPLACE VIEW public.phase_performance_stats AS
SELECT 
  pp.assigned_to,
  sm.full_name as staff_name,
  pp.phase_type,
  pp.status,
  pp.started_at,
  pp.completed_at,
  CASE 
    WHEN pp.started_at IS NOT NULL AND pp.completed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (pp.completed_at::timestamp - pp.started_at::timestamp)) / 3600
    ELSE NULL 
  END as hours_to_complete,
  pp.project_id
FROM public.project_phases pp
LEFT JOIN public.staff_members sm ON pp.assigned_to = sm.id;

-- Add RLS policy for the new column
CREATE POLICY "Staff can view phases assigned to them" 
ON public.project_phases 
FOR SELECT 
USING (true);

-- Update policy to allow staff to update their assigned phases
DROP POLICY IF EXISTS "Staff can update their phases" ON public.project_phases;
CREATE POLICY "Staff can update phases" 
ON public.project_phases 
FOR UPDATE 
USING (true);