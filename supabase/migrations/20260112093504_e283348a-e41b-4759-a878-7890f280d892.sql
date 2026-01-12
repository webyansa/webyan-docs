-- Fix the permissive INSERT policy for support_tickets
DROP POLICY IF EXISTS "Anyone can create tickets" ON public.support_tickets;

-- Create a more restrictive policy - allow inserts but ensure user_id is set correctly if authenticated
CREATE POLICY "Anyone can create tickets with validation" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (
  -- If authenticated, user_id must match auth.uid()
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR 
  -- If not authenticated (guest), user_id must be null and guest_email must be provided
  (auth.uid() IS NULL AND user_id IS NULL AND guest_email IS NOT NULL)
);

-- Add the delete policy
CREATE POLICY "Admins can delete tickets" 
ON public.support_tickets 
FOR DELETE 
USING (public.is_admin_or_editor(auth.uid()));