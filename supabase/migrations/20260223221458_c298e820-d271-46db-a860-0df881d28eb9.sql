-- Allow admins/editors to create tickets on behalf of clients
CREATE POLICY "Admins can create tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_editor(auth.uid()));