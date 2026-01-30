-- ===========================================
-- Phase 2 CRM: Invoices and Payments Tables
-- ===========================================

-- Invoices table
CREATE TABLE public.client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL DEFAULT '',
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'SAR',
  status text DEFAULT 'pending',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  paid_at timestamptz,
  description text,
  items jsonb DEFAULT '[]',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE public.client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.client_invoices(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  payment_method text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_number text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Auto-generate invoice number trigger function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_str text;
  seq_num integer;
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    year_str := to_char(CURRENT_DATE, 'YYYY');
    SELECT COALESCE(MAX(
      NULLIF(regexp_replace(invoice_number, '^INV-' || year_str || '-', ''), '')::integer
    ), 0) + 1
    INTO seq_num
    FROM public.client_invoices
    WHERE invoice_number LIKE 'INV-' || year_str || '-%';
    
    NEW.invoice_number := 'INV-' || year_str || '-' || LPAD(seq_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_invoice_number
BEFORE INSERT ON public.client_invoices
FOR EACH ROW
EXECUTE FUNCTION public.generate_invoice_number();

-- Timeline trigger for invoices
CREATE OR REPLACE FUNCTION public.log_invoice_to_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_timeline (organization_id, event_type, title, description, reference_type, reference_id, performed_by)
  VALUES (
    NEW.organization_id,
    'invoice_sent',
    'إنشاء فاتورة جديدة',
    'فاتورة رقم ' || NEW.invoice_number || ' بمبلغ ' || NEW.amount || ' ' || NEW.currency,
    'invoice',
    NEW.id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoice_timeline_trigger
AFTER INSERT ON public.client_invoices
FOR EACH ROW EXECUTE FUNCTION public.log_invoice_to_timeline();

-- Timeline trigger for payments
CREATE OR REPLACE FUNCTION public.log_payment_to_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_number text;
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT invoice_number INTO inv_number FROM public.client_invoices WHERE id = NEW.invoice_id;
  END IF;
  
  INSERT INTO public.client_timeline (organization_id, event_type, title, description, reference_type, reference_id, performed_by)
  VALUES (
    NEW.organization_id,
    'payment_received',
    'استلام دفعة',
    'دفعة بمبلغ ' || NEW.amount || COALESCE(' للفاتورة ' || inv_number, ''),
    'payment',
    NEW.id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_timeline_trigger
AFTER INSERT ON public.client_payments
FOR EACH ROW EXECUTE FUNCTION public.log_payment_to_timeline();

-- Enable RLS
ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Admins can manage all invoices"
ON public.client_invoices FOR ALL
USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Clients can view their organization invoices"
ON public.client_invoices FOR SELECT
USING (organization_id = get_client_organization(auth.uid()));

-- RLS Policies for payments
CREATE POLICY "Admins can manage all payments"
ON public.client_payments FOR ALL
USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Clients can view their organization payments"
ON public.client_payments FOR SELECT
USING (organization_id = get_client_organization(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_client_invoices_org ON public.client_invoices(organization_id);
CREATE INDEX idx_client_invoices_status ON public.client_invoices(status);
CREATE INDEX idx_client_payments_org ON public.client_payments(organization_id);
CREATE INDEX idx_client_payments_invoice ON public.client_payments(invoice_id);

-- updated_at trigger for invoices
CREATE TRIGGER update_client_invoices_updated_at
BEFORE UPDATE ON public.client_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();