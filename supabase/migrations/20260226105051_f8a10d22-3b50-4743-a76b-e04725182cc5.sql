
-- Add task_mode column to support_tickets
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS task_mode text NOT NULL DEFAULT 'none';

-- Create ticket_tasks table
CREATE TABLE public.ticket_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_by uuid REFERENCES public.staff_members(id),
  completed_by_name text,
  completed_at timestamptz,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: admins/editors see all, staff see their assigned tickets' tasks, clients see their org tickets' tasks
CREATE POLICY "Admins and editors can view all ticket tasks"
ON public.ticket_tasks FOR SELECT
TO authenticated
USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view their ticket tasks"
ON public.ticket_tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    JOIN public.staff_members sm ON sm.id = st.assigned_to
    WHERE st.id = ticket_id AND sm.user_id = auth.uid()
  )
);

CREATE POLICY "Clients can view their org ticket tasks"
ON public.ticket_tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_id
    AND st.organization_id = public.get_client_organization(auth.uid())
  )
);

-- INSERT: admins/editors + assigned staff
CREATE POLICY "Admins and editors can insert ticket tasks"
ON public.ticket_tasks FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can insert tasks on their tickets"
ON public.ticket_tasks FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    JOIN public.staff_members sm ON sm.id = st.assigned_to
    WHERE st.id = ticket_id AND sm.user_id = auth.uid()
  )
);

-- UPDATE: admins/editors + assigned staff
CREATE POLICY "Admins and editors can update ticket tasks"
ON public.ticket_tasks FOR UPDATE
TO authenticated
USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can update tasks on their tickets"
ON public.ticket_tasks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    JOIN public.staff_members sm ON sm.id = st.assigned_to
    WHERE st.id = ticket_id AND sm.user_id = auth.uid()
  )
);

-- DELETE: admins/editors only
CREATE POLICY "Admins and editors can delete ticket tasks"
ON public.ticket_tasks FOR DELETE
TO authenticated
USING (public.is_admin_or_editor(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_ticket_tasks_updated_at
  BEFORE UPDATE ON public.ticket_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_tasks;
