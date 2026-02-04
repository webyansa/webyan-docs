
-- Drop the old restrictive constraint
ALTER TABLE project_phases DROP CONSTRAINT IF EXISTS project_phases_phase_type_check;

-- Add new constraint that includes all phase types (legacy and new workflow)
ALTER TABLE project_phases ADD CONSTRAINT project_phases_phase_type_check 
CHECK (phase_type = ANY (ARRAY[
  -- Legacy phases
  'kickoff'::text, 
  'setup'::text, 
  'content'::text, 
  'review'::text, 
  'delivery'::text, 
  'closure'::text,
  -- New 8-phase workflow
  'requirements'::text,
  'development'::text,
  'internal_review'::text,
  'client_review'::text,
  'launch'::text,
  -- New 10-phase Webyan subscription workflow
  'trial_setup'::text,
  'initial_content'::text,
  'trial_inspection'::text,
  'client_approval'::text,
  'production_setup'::text,
  'production_upload'::text,
  'final_review'::text
]));
