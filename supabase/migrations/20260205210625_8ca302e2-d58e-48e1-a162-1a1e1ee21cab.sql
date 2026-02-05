-- إنشاء جدول طلبات إصدار الفواتير
CREATE TABLE public.invoice_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.crm_quotes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'processing', 'issued')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by UUID REFERENCES public.staff_members(id),
  external_invoice_no TEXT,
  issued_at TIMESTAMPTZ,
  resend_reason TEXT,
  notes_for_accounts TEXT,
  expected_payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إنشاء فهرس لمنع تكرار الطلب لنفس العرض (إلا إذا تم الإصدار)
CREATE UNIQUE INDEX idx_invoice_requests_quote_active 
ON public.invoice_requests(quote_id) 
WHERE status != 'issued';

-- فهرس للبحث السريع
CREATE INDEX idx_invoice_requests_organization ON public.invoice_requests(organization_id);
CREATE INDEX idx_invoice_requests_status ON public.invoice_requests(status);

-- دالة توليد رقم طلب الفاتورة
CREATE OR REPLACE FUNCTION public.generate_invoice_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    year_str := to_char(CURRENT_DATE, 'YYYY');
    SELECT COALESCE(MAX(
      NULLIF(regexp_replace(request_number, '^INV-REQ-' || year_str || '-', ''), '')::integer
    ), 0) + 1
    INTO seq_num
    FROM public.invoice_requests
    WHERE request_number LIKE 'INV-REQ-' || year_str || '-%';
    
    NEW.request_number := 'INV-REQ-' || year_str || '-' || LPAD(seq_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger لتوليد الرقم تلقائياً
CREATE TRIGGER trigger_generate_invoice_request_number
BEFORE INSERT ON public.invoice_requests
FOR EACH ROW
EXECUTE FUNCTION public.generate_invoice_request_number();

-- Trigger لتحديث updated_at
CREATE TRIGGER trigger_update_invoice_requests_updated_at
BEFORE UPDATE ON public.invoice_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- تفعيل RLS
ALTER TABLE public.invoice_requests ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للموظفين
CREATE POLICY "Staff can view invoice requests"
ON public.invoice_requests
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()) OR public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can create invoice requests"
ON public.invoice_requests
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()) OR public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can update invoice requests"
ON public.invoice_requests
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()) OR public.is_admin_or_editor(auth.uid()));

-- إضافة إعداد بريد الحسابات في system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES ('accounts_email', '', 'بريد مسؤول الحسابات لاستلام طلبات إصدار الفواتير')
ON CONFLICT (key) DO NOTHING;

-- تسجيل إنشاء طلب الفاتورة في timeline
CREATE OR REPLACE FUNCTION public.log_invoice_request_to_timeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_number TEXT;
  v_staff_name TEXT;
BEGIN
  SELECT quote_number INTO v_quote_number FROM public.crm_quotes WHERE id = NEW.quote_id;
  SELECT full_name INTO v_staff_name FROM public.staff_members WHERE id = NEW.sent_by;
  
  INSERT INTO public.client_timeline (
    organization_id, event_type, title, description,
    reference_type, reference_id, performed_by, performed_by_name
  ) VALUES (
    NEW.organization_id,
    'invoice_request_sent',
    'طلب إصدار فاتورة',
    'تم إرسال طلب إصدار فاتورة لعرض السعر رقم ' || v_quote_number,
    'invoice_request',
    NEW.id,
    NEW.sent_by,
    v_staff_name
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_invoice_request_timeline
AFTER INSERT ON public.invoice_requests
FOR EACH ROW
EXECUTE FUNCTION public.log_invoice_request_to_timeline();