-- Allow both authenticated users and guests to create tickets
DROP POLICY IF EXISTS "Anyone can create tickets with validation" ON public.support_tickets;

-- Simpler policy that allows:
-- 1. Authenticated users with matching user_id
-- 2. Guest submissions (handled via edge function with service role)
CREATE POLICY "Authenticated users can create tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);