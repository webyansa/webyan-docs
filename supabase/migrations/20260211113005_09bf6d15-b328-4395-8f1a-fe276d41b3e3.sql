
-- إضافة أعمدة المراحل المالية لجدول crm_quotes
ALTER TABLE public.crm_quotes
  ADD COLUMN IF NOT EXISTS client_approved boolean DEFAULT null,
  ADD COLUMN IF NOT EXISTS client_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_rejection_reason text,
  ADD COLUMN IF NOT EXISTS payment_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_transfer_number text,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_sent_to_client boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_sent_to_client_at timestamptz;
