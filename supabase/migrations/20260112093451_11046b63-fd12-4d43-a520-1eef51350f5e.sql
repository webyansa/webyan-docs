-- Drop the existing delete policy and recreate
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.support_tickets;