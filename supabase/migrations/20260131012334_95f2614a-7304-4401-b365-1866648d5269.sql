-- =====================================================
-- Pricing System Tables
-- =====================================================

-- جدول الخطط والأسعار
CREATE TABLE public.pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  description text,
  plan_type text DEFAULT 'subscription',
  monthly_price numeric NOT NULL DEFAULT 0,
  yearly_price numeric NOT NULL DEFAULT 0,
  yearly_discount integer DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول الخدمات الإضافية
CREATE TABLE public.pricing_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  service_type text DEFAULT 'one_time', -- one_time, recurring
  price numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'مرة واحدة', -- مرة واحدة، شهري، سنوي
  category text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول الحلول المخصصة
CREATE TABLE public.pricing_custom_solutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  base_price numeric DEFAULT 0,
  price_note text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تحديث جدول عروض الأسعار بإضافة حقول جديدة
ALTER TABLE public.crm_quotes
ADD COLUMN IF NOT EXISTS quote_type text DEFAULT 'subscription', -- subscription, custom_platform, services_only
ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly', -- monthly, yearly
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.pricing_plans(id);

-- إنشاء الفهارس
CREATE INDEX idx_pricing_plans_active ON public.pricing_plans(is_active);
CREATE INDEX idx_pricing_services_active ON public.pricing_services(is_active);
CREATE INDEX idx_pricing_custom_solutions_active ON public.pricing_custom_solutions(is_active);
CREATE INDEX idx_crm_quotes_type ON public.crm_quotes(quote_type);

-- تفعيل RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_custom_solutions ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة للجميع (الخطط والخدمات عامة)
CREATE POLICY "pricing_plans_read_all" ON public.pricing_plans
  FOR SELECT USING (true);

CREATE POLICY "pricing_services_read_all" ON public.pricing_services
  FOR SELECT USING (true);

CREATE POLICY "pricing_custom_solutions_read_all" ON public.pricing_custom_solutions
  FOR SELECT USING (true);

-- سياسات الكتابة للموظفين فقط
CREATE POLICY "pricing_plans_staff_write" ON public.pricing_plans
  FOR ALL USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "pricing_services_staff_write" ON public.pricing_services
  FOR ALL USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "pricing_custom_solutions_staff_write" ON public.pricing_custom_solutions
  FOR ALL USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

-- إدخال بيانات تجريبية للخطط
INSERT INTO public.pricing_plans (name, name_en, description, monthly_price, yearly_price, yearly_discount, features, sort_order) VALUES
('الخطة الأساسية', 'Basic Plan', 'مناسبة للمؤسسات الصغيرة', 500, 5000, 17, '["5 مستخدمين", "دعم فني أساسي", "تقارير شهرية"]'::jsonb, 1),
('الخطة الاحترافية', 'Professional Plan', 'مناسبة للمؤسسات المتوسطة', 1000, 10000, 17, '["20 مستخدم", "دعم فني متقدم", "تقارير أسبوعية", "API كامل"]'::jsonb, 2),
('الخطة المؤسسية', 'Enterprise Plan', 'مناسبة للمؤسسات الكبيرة', 2500, 25000, 17, '["مستخدمين غير محدود", "دعم فني VIP", "تقارير مخصصة", "مدير حساب مخصص"]'::jsonb, 3);

-- إدخال بيانات تجريبية للخدمات
INSERT INTO public.pricing_services (name, description, service_type, price, unit, category, sort_order) VALUES
('تدريب الفريق', 'تدريب شامل للفريق على استخدام المنصة', 'one_time', 500, 'مرة واحدة', 'تدريب', 1),
('تخصيص الهوية البصرية', 'تخصيص الألوان والشعار حسب هوية العميل', 'one_time', 1000, 'مرة واحدة', 'تخصيص', 2),
('ترحيل البيانات', 'نقل البيانات من النظام القديم', 'one_time', 1500, 'مرة واحدة', 'تقنية', 3),
('دعم فني متقدم', 'دعم فني على مدار الساعة', 'recurring', 200, 'شهري', 'دعم', 4),
('تقارير مخصصة', 'إعداد تقارير مخصصة حسب الطلب', 'one_time', 800, 'مرة واحدة', 'تقارير', 5);

-- إدخال بيانات تجريبية للحلول المخصصة
INSERT INTO public.pricing_custom_solutions (name, description, base_price, price_note, sort_order) VALUES
('منصة تعليمية مخصصة', 'تطوير منصة تعليمية متكاملة', 50000, 'السعر يبدأ من ويعتمد على المتطلبات', 1),
('نظام إدارة موارد بشرية', 'نظام HR متكامل', 75000, 'يشمل التحليلات والتقارير', 2),
('بوابة عملاء متكاملة', 'بوابة خدمة ذاتية للعملاء', 35000, 'قابل للتخصيص حسب الاحتياج', 3);