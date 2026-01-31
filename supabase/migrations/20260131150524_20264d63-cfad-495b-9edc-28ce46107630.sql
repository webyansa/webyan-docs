-- Add new quote settings for signature and visibility toggles
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES 
  ('quote_company_signature_url', '', 'رابط توقيع الشركة', now()),
  ('quote_show_stamp', 'true', 'عرض الختم في عروض الأسعار', now()),
  ('quote_show_signature', 'true', 'عرض التوقيع في عروض الأسعار', now())
ON CONFLICT (key) DO NOTHING;