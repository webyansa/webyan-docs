-- Fix RLS policy for ticket_replies to allow staff members to insert replies
DROP POLICY IF EXISTS "Users can add replies to their tickets" ON public.ticket_replies;

CREATE POLICY "Users can add replies to their tickets"
ON public.ticket_replies
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets
    WHERE support_tickets.id = ticket_replies.ticket_id
    AND (
      support_tickets.user_id = auth.uid()
      OR is_admin_or_editor(auth.uid())
      OR EXISTS (
        SELECT 1 FROM staff_members
        WHERE staff_members.user_id = auth.uid()
        AND staff_members.id = support_tickets.assigned_to_staff
        AND staff_members.is_active = true
      )
    )
  )
);

-- Also fix SELECT policy so staff can see replies
DROP POLICY IF EXISTS "Users can view replies on their tickets" ON public.ticket_replies;

CREATE POLICY "Users can view replies on their tickets"
ON public.ticket_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM support_tickets
    WHERE support_tickets.id = ticket_replies.ticket_id
    AND (
      support_tickets.user_id = auth.uid()
      OR is_admin_or_editor(auth.uid())
      OR EXISTS (
        SELECT 1 FROM staff_members
        WHERE staff_members.user_id = auth.uid()
        AND staff_members.id = support_tickets.assigned_to_staff
        AND staff_members.is_active = true
      )
    )
  )
);