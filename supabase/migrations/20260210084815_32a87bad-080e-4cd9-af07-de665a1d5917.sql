
-- =====================================================
-- 1. Stage Definitions (Stages Library)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.stage_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  default_order INT NOT NULL DEFAULT 0,
  estimated_days INT,
  stage_category TEXT NOT NULL DEFAULT 'general'
    CHECK (stage_category IN ('general', 'subscription', 'custom_platform', 'service')),
  icon_name TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stage_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stage_definitions"
  ON public.stage_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage stage_definitions"
  ON public.stage_definitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 2. Template Stages (link templates to stage definitions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.template_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  stage_definition_id UUID NOT NULL REFERENCES public.stage_definitions(id) ON DELETE CASCADE,
  stage_order INT NOT NULL DEFAULT 0,
  estimated_days INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.template_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read template_stages"
  ON public.template_stages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage template_stages"
  ON public.template_stages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. Add service execution fields to crm_implementations
-- =====================================================
ALTER TABLE public.crm_implementations
  ADD COLUMN IF NOT EXISTS service_status TEXT DEFAULT 'pending'
    CHECK (service_status IN ('pending', 'in_progress', 'completed')),
  ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS service_started_by UUID REFERENCES public.staff_members(id),
  ADD COLUMN IF NOT EXISTS service_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS service_completed_by UUID REFERENCES public.staff_members(id);

-- =====================================================
-- 4. Service execution notes table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_service_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.crm_implementations(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES public.staff_members(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_service_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read project_service_notes"
  ON public.project_service_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert project_service_notes"
  ON public.project_service_notes FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================
-- 5. Update project_phases: add stage_definition_id reference
-- =====================================================
ALTER TABLE public.project_phases
  ADD COLUMN IF NOT EXISTS stage_definition_id UUID REFERENCES public.stage_definitions(id),
  ADD COLUMN IF NOT EXISTS phase_name TEXT,
  ADD COLUMN IF NOT EXISTS phase_description TEXT;

-- =====================================================
-- 6. Seed default stage definitions for custom platform
-- =====================================================
INSERT INTO public.stage_definitions (name, name_en, description, default_order, stage_category, icon_name, color) VALUES
  ('التحليل وجمع المتطلبات', 'Analysis & Requirements', 'تحليل متطلبات العميل بشكل تفصيلي وإعداد وثيقة نطاق العمل', 1, 'custom_platform', 'ClipboardList', 'text-blue-600'),
  ('تصميم تجربة المستخدم وواجهات الاستخدام', 'UX/UI Design', 'تصميم واجهات المستخدم وتجربة الاستخدام بناءً على المتطلبات المعتمدة', 2, 'custom_platform', 'Palette', 'text-purple-600'),
  ('اعتماد التصاميم من العميل', 'Design Approval', 'عرض التصاميم على العميل للحصول على الموافقة النهائية قبل بدء التطوير', 3, 'custom_platform', 'UserCheck', 'text-orange-600'),
  ('التطوير والبرمجة', 'Development & Build', 'تنفيذ البرمجة والتطوير وفق التصاميم المعتمدة', 4, 'custom_platform', 'Code2', 'text-violet-600'),
  ('الاختبار والفحص', 'Testing & QA', 'اختبار شامل للمنصة وضمان الجودة والأداء', 5, 'custom_platform', 'ShieldCheck', 'text-amber-600'),
  ('إدخال المحتوى', 'Content Entry', 'إدخال المحتوى النهائي والبيانات الفعلية', 6, 'custom_platform', 'BookOpen', 'text-indigo-600'),
  ('الإطلاق على البيئة الرسمية', 'Production Launch', 'نشر المنصة على بيئة الإنتاج وتفعيل النطاق الرسمي', 7, 'custom_platform', 'Radio', 'text-teal-600'),
  ('التسليم وإغلاق المشروع', 'Handover & Closure', 'تسليم المشروع للعميل مع التوثيق الكامل وبيانات الوصول', 8, 'custom_platform', 'CheckCircle2', 'text-green-600');

-- Seed default stage definitions for subscription
INSERT INTO public.stage_definitions (name, name_en, description, default_order, stage_category, icon_name, color) VALUES
  ('استلام المتطلبات', 'Requirements', 'جمع وتوثيق متطلبات العميل والباقة المختارة', 1, 'subscription', 'ClipboardList', 'text-blue-600'),
  ('تجهيز البيئة التجريبية', 'Trial Setup', 'تجهيز نطاق تجريبي وتطبيق هوية العميل', 2, 'subscription', 'TestTube', 'text-indigo-600'),
  ('إدخال المحتوى الأولي', 'Initial Content', 'إدخال محتوى افتراضي أو حقيقي لكامل الموقع', 3, 'subscription', 'Upload', 'text-purple-600'),
  ('فحص الموقع التجريبي', 'Trial Inspection', 'التأكد من عمل الموقع بالكامل', 4, 'subscription', 'Eye', 'text-amber-600'),
  ('إرسال للعميل للتعميد', 'Client Approval', 'إرسال رسالة بريد رسمية بجاهزية الموقع', 5, 'subscription', 'Send', 'text-orange-600'),
  ('تجهيز البيئة الرسمية', 'Production Setup', 'تجهيز استضافة ودومين رسمي', 6, 'subscription', 'Server', 'text-cyan-600'),
  ('رفع الموقع على الاستضافة', 'Production Upload', 'رفع الموقع على الاستضافة الرسمية', 7, 'subscription', 'HardDrive', 'text-blue-600'),
  ('المراجعة النهائية', 'Final Review', 'فحص نهائي وإدخال المحتوى النهائي', 8, 'subscription', 'FileCheck', 'text-violet-600'),
  ('الإطلاق', 'Launch', 'نشر النطاق وتفعيله بشكل رسمي', 9, 'subscription', 'Zap', 'text-teal-600'),
  ('التسليم والإغلاق', 'Closure', 'إرسال رسالة رسمية للعميل ببيانات الموقع', 10, 'subscription', 'CheckCircle2', 'text-green-600');

-- Enable realtime for project_service_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_service_notes;
