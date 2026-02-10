
-- 1. Create project_templates table for storing reusable project workflow templates
CREATE TABLE public.project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  project_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read templates
CREATE POLICY "Staff can view templates"
  ON public.project_templates FOR SELECT
  USING (true);

-- 2. Update phase_type CHECK constraint to support new custom platform phases
ALTER TABLE public.project_phases DROP CONSTRAINT IF EXISTS project_phases_phase_type_check;
ALTER TABLE public.project_phases ADD CONSTRAINT project_phases_phase_type_check
  CHECK (phase_type = ANY (ARRAY[
    -- Legacy / subscription phases
    'kickoff', 'setup', 'content', 'review', 'delivery', 'closure',
    'requirements', 'development', 'internal_review', 'client_review', 'launch',
    'trial_setup', 'initial_content', 'trial_inspection', 'client_approval',
    'production_setup', 'production_upload', 'final_review',
    -- Custom platform phases
    'analysis_requirements', 'ux_ui_design', 'design_approval',
    'dev_build', 'testing_qa', 'content_entry', 'production_launch', 'handover_closure'
  ]));

-- 3. Update phase status CHECK to support 'blocked'
ALTER TABLE public.project_phases DROP CONSTRAINT IF EXISTS project_phases_status_check;
ALTER TABLE public.project_phases ADD CONSTRAINT project_phases_status_check
  CHECK (status = ANY (ARRAY['pending', 'in_progress', 'completed', 'blocked']));

-- 4. Add template_id to crm_implementations
ALTER TABLE public.crm_implementations
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.project_templates(id);

-- 5. Insert default templates

-- Subscription template (Webyan)
INSERT INTO public.project_templates (name, name_en, description, project_type, is_default, phases) VALUES
(
  'اشتراك منصة ويبيان',
  'Webyan Subscription',
  'قالب تنفيذ مشاريع اشتراكات منصة ويبيان بـ 10 مراحل',
  'subscription',
  true,
  '[
    {"phase_type": "requirements", "label": "استلام المتطلبات", "order": 1, "role": "csm"},
    {"phase_type": "trial_setup", "label": "تجهيز البيئة التجريبية", "order": 2, "role": "implementer"},
    {"phase_type": "initial_content", "label": "إدخال المحتوى الأولي", "order": 3, "role": "implementer"},
    {"phase_type": "trial_inspection", "label": "فحص الموقع التجريبي", "order": 4, "role": "implementer"},
    {"phase_type": "client_approval", "label": "إرسال للعميل للتعميد", "order": 5, "role": "csm"},
    {"phase_type": "production_setup", "label": "تجهيز البيئة الرسمية", "order": 6, "role": "implementer"},
    {"phase_type": "production_upload", "label": "رفع الموقع على الاستضافة", "order": 7, "role": "implementer"},
    {"phase_type": "final_review", "label": "المراجعة النهائية", "order": 8, "role": "implementer"},
    {"phase_type": "launch", "label": "الإطلاق", "order": 9, "role": "implementer"},
    {"phase_type": "closure", "label": "التسليم والإغلاق", "order": 10, "role": "csm"}
  ]'::jsonb
),
-- Custom Platform template
(
  'منصة رقمية مخصصة',
  'Custom Digital Platform',
  'قالب تنفيذ مشاريع المنصات الرقمية المخصصة بـ 8 مراحل احترافية',
  'custom_platform',
  true,
  '[
    {"phase_type": "analysis_requirements", "label": "التحليل وجمع المتطلبات", "order": 1, "role": "csm", "instructions": "تحليل متطلبات العميل بشكل تفصيلي وإعداد وثيقة نطاق العمل"},
    {"phase_type": "ux_ui_design", "label": "تصميم تجربة المستخدم وواجهات الاستخدام", "order": 2, "role": "implementer", "instructions": "تصميم واجهات المستخدم وتجربة الاستخدام بناءً على المتطلبات المعتمدة"},
    {"phase_type": "design_approval", "label": "اعتماد التصاميم من العميل", "order": 3, "role": "csm", "instructions": "عرض التصاميم على العميل للحصول على الموافقة النهائية قبل بدء التطوير"},
    {"phase_type": "dev_build", "label": "التطوير والبرمجة", "order": 4, "role": "implementer", "instructions": "تنفيذ البرمجة والتطوير وفق التصاميم المعتمدة مع دعم السبرنتات", "supports_sprints": true},
    {"phase_type": "testing_qa", "label": "الاختبار والفحص", "order": 5, "role": "implementer", "instructions": "اختبار شامل للمنصة وضمان الجودة والأداء"},
    {"phase_type": "content_entry", "label": "إدخال المحتوى", "order": 6, "role": "implementer", "instructions": "إدخال المحتوى النهائي والبيانات الفعلية"},
    {"phase_type": "production_launch", "label": "الإطلاق على البيئة الرسمية", "order": 7, "role": "implementer", "instructions": "نشر المنصة على بيئة الإنتاج وتفعيل النطاق الرسمي"},
    {"phase_type": "handover_closure", "label": "التسليم وإغلاق المشروع", "order": 8, "role": "csm", "instructions": "تسليم المشروع للعميل مع التوثيق الكامل وبيانات الوصول"}
  ]'::jsonb
),
-- Website template
(
  'موقع إلكتروني مخصص',
  'Custom Website',
  'قالب تنفيذ مشاريع المواقع الإلكترونية المخصصة',
  'custom_platform',
  false,
  '[
    {"phase_type": "analysis_requirements", "label": "التحليل وجمع المتطلبات", "order": 1, "role": "csm"},
    {"phase_type": "ux_ui_design", "label": "التصميم", "order": 2, "role": "implementer"},
    {"phase_type": "design_approval", "label": "اعتماد التصاميم", "order": 3, "role": "csm"},
    {"phase_type": "dev_build", "label": "التطوير والبرمجة", "order": 4, "role": "implementer", "supports_sprints": true},
    {"phase_type": "testing_qa", "label": "الاختبار", "order": 5, "role": "implementer"},
    {"phase_type": "content_entry", "label": "إدخال المحتوى", "order": 6, "role": "implementer"},
    {"phase_type": "production_launch", "label": "الإطلاق", "order": 7, "role": "implementer"},
    {"phase_type": "handover_closure", "label": "التسليم والإغلاق", "order": 8, "role": "csm"}
  ]'::jsonb
),
-- Internal System template
(
  'نظام داخلي',
  'Internal System',
  'قالب تنفيذ مشاريع الأنظمة الداخلية',
  'custom_platform',
  false,
  '[
    {"phase_type": "analysis_requirements", "label": "التحليل وجمع المتطلبات", "order": 1, "role": "csm"},
    {"phase_type": "ux_ui_design", "label": "التصميم", "order": 2, "role": "implementer"},
    {"phase_type": "design_approval", "label": "اعتماد التصاميم", "order": 3, "role": "csm"},
    {"phase_type": "dev_build", "label": "التطوير والبرمجة", "order": 4, "role": "implementer", "supports_sprints": true},
    {"phase_type": "testing_qa", "label": "الاختبار", "order": 5, "role": "implementer"},
    {"phase_type": "content_entry", "label": "إدخال البيانات", "order": 6, "role": "implementer"},
    {"phase_type": "production_launch", "label": "الإطلاق", "order": 7, "role": "implementer"},
    {"phase_type": "handover_closure", "label": "التسليم والإغلاق", "order": 8, "role": "csm"}
  ]'::jsonb
);

-- 6. Enable realtime for project_templates
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_templates;
