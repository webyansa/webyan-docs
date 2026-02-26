-- Fix Staff RLS policies on ticket_tasks: use assigned_to_staff instead of assigned_to

-- Drop broken policies
DROP POLICY IF EXISTS "Staff can view their ticket tasks" ON public.ticket_tasks;
DROP POLICY IF EXISTS "Staff can update tasks on their tickets" ON public.ticket_tasks;
DROP POLICY IF EXISTS "Staff can insert tasks on their tickets" ON public.ticket_tasks;

-- Recreate with correct column name
CREATE POLICY "Staff can view their ticket tasks"
ON public.ticket_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM support_tickets st
    JOIN staff_members sm ON sm.id = st.assigned_to_staff
    WHERE st.id = ticket_tasks.ticket_id AND sm.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can update tasks on their tickets"
ON public.ticket_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM support_tickets st
    JOIN staff_members sm ON sm.id = st.assigned_to_staff
    WHERE st.id = ticket_tasks.ticket_id AND sm.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can insert tasks on their tickets"
ON public.ticket_tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets st
    JOIN staff_members sm ON sm.id = st.assigned_to_staff
    WHERE st.id = ticket_tasks.ticket_id AND sm.user_id = auth.uid()
  )
);
