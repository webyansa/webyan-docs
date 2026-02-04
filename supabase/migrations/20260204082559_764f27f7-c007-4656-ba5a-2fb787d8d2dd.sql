-- إضافة حقول العنوان الوطني السعودي لجدول المؤسسات
ALTER TABLE public.client_organizations 
ADD COLUMN IF NOT EXISTS tax_number text,
ADD COLUMN IF NOT EXISTS street_name text,
ADD COLUMN IF NOT EXISTS building_number text,
ADD COLUMN IF NOT EXISTS secondary_number text,
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS postal_code text;

-- إضافة تعليقات توضيحية للأعمدة
COMMENT ON COLUMN public.client_organizations.tax_number IS 'الرقم الضريبي للمؤسسة';
COMMENT ON COLUMN public.client_organizations.street_name IS 'اسم الشارع في العنوان الوطني';
COMMENT ON COLUMN public.client_organizations.building_number IS 'رقم المبنى في العنوان الوطني';
COMMENT ON COLUMN public.client_organizations.secondary_number IS 'الرقم الفرعي في العنوان الوطني';
COMMENT ON COLUMN public.client_organizations.district IS 'الحي في العنوان الوطني';
COMMENT ON COLUMN public.client_organizations.postal_code IS 'الرمز البريدي';