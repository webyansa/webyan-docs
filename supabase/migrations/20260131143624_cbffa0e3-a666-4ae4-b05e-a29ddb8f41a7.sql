-- Insert company quote settings
INSERT INTO system_settings (key, value, description) VALUES
  ('quote_company_name_ar', 'شركة رنين للتقنية', 'اسم الشركة بالعربية لعروض الأسعار'),
  ('quote_company_name_en', 'Raneen Technology Co.', 'اسم الشركة بالإنجليزية لعروض الأسعار'),
  ('quote_company_email', 'info@raneen.sa', 'البريد الإلكتروني للشركة'),
  ('quote_company_phone', '+966 50 123 4567', 'رقم الهاتف للشركة'),
  ('quote_company_address', 'طريق الملك فهد', 'عنوان الشركة'),
  ('quote_company_city', 'الرياض', 'مدينة الشركة'),
  ('quote_company_tax_number', '300000000000003', 'الرقم الضريبي'),
  ('quote_company_cr_number', '1010000000', 'رقم السجل التجاري'),
  ('quote_company_website', 'https://raneen.sa', 'موقع الشركة الإلكتروني'),
  ('quote_default_validity_days', '30', 'عدد أيام صلاحية العرض افتراضياً'),
  ('quote_default_terms', 'يسري هذا العرض لمدة 30 يوماً من تاريخ الإصدار. الأسعار شاملة ضريبة القيمة المضافة 15%. يتم الدفع خلال 15 يوماً من تاريخ الفاتورة.', 'الشروط والأحكام الافتراضية')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = now();