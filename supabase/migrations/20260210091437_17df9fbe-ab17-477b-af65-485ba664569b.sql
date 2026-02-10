-- Add budget column to projects
ALTER TABLE public.crm_implementations ADD COLUMN IF NOT EXISTS budget numeric DEFAULT NULL;

-- Clean up orphan phases for service_execution projects (they shouldn't have phases)
DELETE FROM project_phases 
WHERE project_id IN (
  SELECT id FROM crm_implementations WHERE project_type = 'service_execution'
);

-- Update phase_type CHECK constraint to support all phase types including custom ones
-- First drop existing constraint if any
ALTER TABLE project_phases DROP CONSTRAINT IF EXISTS project_phases_phase_type_check;

-- Add flexible constraint that allows template-based phase types
-- We use a more permissive approach since phases come from stage_definitions now
ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS stage_definition_id uuid REFERENCES stage_definitions(id);
