-- Add delivery package fields to crm_implementations
ALTER TABLE crm_implementations
ADD COLUMN IF NOT EXISTS site_url TEXT,
ADD COLUMN IF NOT EXISTS admin_url TEXT,
ADD COLUMN IF NOT EXISTS admin_username TEXT,
ADD COLUMN IF NOT EXISTS admin_password_encrypted TEXT,
ADD COLUMN IF NOT EXISTS hosting_provider TEXT,
ADD COLUMN IF NOT EXISTS server_ip TEXT,
ADD COLUMN IF NOT EXISTS server_url TEXT,
ADD COLUMN IF NOT EXISTS server_username TEXT,
ADD COLUMN IF NOT EXISTS server_password_encrypted TEXT,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS hosting_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivery_completed_by UUID REFERENCES staff_members(id),
ADD COLUMN IF NOT EXISTS hold_reason TEXT,
ADD COLUMN IF NOT EXISTS hold_started_at TIMESTAMP WITH TIME ZONE;

-- Add completion notes to project_phases
ALTER TABLE project_phases
ADD COLUMN IF NOT EXISTS completion_notes TEXT,
ADD COLUMN IF NOT EXISTS completed_by_name TEXT;

-- Create project_activity_log table for detailed tracking
CREATE TABLE IF NOT EXISTS public.project_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crm_implementations(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- phase_started, phase_completed, status_changed, note_added, team_assigned, delivery_updated
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  performed_by UUID REFERENCES staff_members(id),
  performed_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_activity_log
ALTER TABLE project_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_activity_log
CREATE POLICY "Staff can view project activity"
  ON project_activity_log FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    public.is_staff(auth.uid())
  );

CREATE POLICY "Staff can insert project activity"
  ON project_activity_log FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid()) OR
    public.is_staff(auth.uid())
  );

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_activity_log_project_id ON project_activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_log_created_at ON project_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_implementations_implementer_id ON crm_implementations(implementer_id);
CREATE INDEX IF NOT EXISTS idx_crm_implementations_csm_id ON crm_implementations(csm_id);