-- Add organization_id column to support_tickets table
ALTER TABLE public.support_tickets 
ADD COLUMN organization_id uuid REFERENCES public.client_organizations(id);

-- Create index for better query performance
CREATE INDEX idx_support_tickets_organization_id ON public.support_tickets(organization_id);

-- Update RLS policy for clients to see their organization's tickets
CREATE POLICY "Clients can view their organization tickets" 
ON public.support_tickets 
FOR SELECT 
USING (
  organization_id IS NOT NULL 
  AND organization_id = public.get_client_organization(auth.uid())
);