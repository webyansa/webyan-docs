
-- Add VAT rate to system settings
INSERT INTO system_settings (key, value, description)
VALUES ('vat_rate', '15', 'نسبة ضريبة القيمة المضافة')
ON CONFLICT (key) DO NOTHING;

-- Add tax_inclusive flag to quotes
ALTER TABLE crm_quotes ADD COLUMN IF NOT EXISTS tax_inclusive boolean DEFAULT false;
