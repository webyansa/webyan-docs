
INSERT INTO pricing_services (name, description, service_type, price, unit, category, is_active, sort_order)
VALUES
  ('استضافة سنوية', 'استضافة سحابية عالية الأداء', 'recurring_annual', 1500, 'سنوي', 'استضافة', true, 100),
  ('تجديد دومين', 'تجديد اسم النطاق سنوياً', 'recurring_annual', 150, 'سنوي', 'دومين', true, 101),
  ('دعم فني سنوي', 'دعم فني وصيانة دورية', 'recurring_annual', 2000, 'سنوي', 'دعم', true, 102),
  ('صيانة وتحديثات', 'تحديثات أمنية وصيانة دورية', 'recurring_annual', 1200, 'سنوي', 'صيانة', true, 103);
