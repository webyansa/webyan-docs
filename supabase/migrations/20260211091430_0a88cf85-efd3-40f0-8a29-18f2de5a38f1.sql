
-- 1. إضافة أعمدة حالة الدفع والفاتورة لعروض الأسعار
ALTER TABLE crm_quotes 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS invoice_status text DEFAULT 'not_requested';

-- 2. إضافة حقل المنطقة لبيانات العميل
ALTER TABLE client_organizations 
ADD COLUMN IF NOT EXISTS region text;

-- 3. إضافة حقول تأكيد الفاتورة في invoice_requests
ALTER TABLE invoice_requests 
ADD COLUMN IF NOT EXISTS invoice_file_url text,
ADD COLUMN IF NOT EXISTS confirmed_by_name text,
ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;
