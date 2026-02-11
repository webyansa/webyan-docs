
-- Add new payment detail columns to crm_quotes
ALTER TABLE public.crm_quotes ADD COLUMN IF NOT EXISTS payment_bank_name text;
ALTER TABLE public.crm_quotes ADD COLUMN IF NOT EXISTS payment_date date;
ALTER TABLE public.crm_quotes ADD COLUMN IF NOT EXISTS payment_notes text;
