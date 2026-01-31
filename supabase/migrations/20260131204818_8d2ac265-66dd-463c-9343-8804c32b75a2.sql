-- =====================================================
-- Workflow Templates for Configurable Project Phases
-- =====================================================

-- 1. Create workflow_templates table
CREATE TABLE public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type TEXT NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create workflow_phases table
CREATE TABLE public.workflow_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  phase_key TEXT NOT NULL,
  phase_name TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  instructions TEXT,
  suggested_role TEXT CHECK (suggested_role IN ('implementer', 'csm', 'project_manager')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workflow_id, phase_order)
);

-- 3. Enable RLS on both tables
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_phases ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for workflow_templates (read-only for authenticated users)
CREATE POLICY "Authenticated users can view workflow templates"
ON public.workflow_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage workflow templates"
ON public.workflow_templates FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM staff_members WHERE user_id = auth.uid())
);

-- 5. RLS Policies for workflow_phases
CREATE POLICY "Authenticated users can view workflow phases"
ON public.workflow_phases FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage workflow phases"
ON public.workflow_phases FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM staff_members WHERE user_id = auth.uid())
);

-- 6. Insert default workflow for webyan_subscription
INSERT INTO public.workflow_templates (project_type, name, is_default) 
VALUES ('webyan_subscription', 'مسار اشتراك ويبيان', true);

-- 7. Insert phases for the webyan_subscription workflow
INSERT INTO public.workflow_phases (workflow_id, phase_key, phase_name, phase_order, instructions, suggested_role)
SELECT 
  wt.id,
  phase_data.phase_key,
  phase_data.phase_name,
  phase_data.phase_order,
  phase_data.instructions,
  phase_data.suggested_role
FROM workflow_templates wt
CROSS JOIN (
  VALUES 
    ('requirements', 'استلام المتطلبات', 1, 'جمع وتوثيق متطلبات العميل والباقة المختارة', 'csm'),
    ('trial_setup', 'تجهيز البيئة التجريبية', 2, 'تجهيز نطاق تجريبي ضمن ويبيان، نسخ الباقة، وتطبيق هوية العميل', 'implementer'),
    ('initial_content', 'إدخال المحتوى الأولي', 3, 'إدخال محتوى افتراضي أو حقيقي لكامل الموقع ليطلع العميل على الشكل النهائي', 'implementer'),
    ('trial_inspection', 'فحص الموقع التجريبي', 4, 'التأكد من عمل الموقع بالكامل في لوحة التحكم والموقع الخارجي', 'implementer'),
    ('client_approval', 'إرسال للعميل للتعميد', 5, 'إرسال رسالة بريد رسمية توضح جاهزية الموقع على النطاق التجريبي', 'csm'),
    ('production_setup', 'تجهيز البيئة الرسمية', 6, 'تجهيز استضافة ودومين رسمي للعميل وربط الاستضافة بالدومين', 'implementer'),
    ('production_upload', 'رفع الموقع على الاستضافة', 7, 'رفع الموقع على الاستضافة الرسمية وتكوين البيئة', 'implementer'),
    ('final_review', 'المراجعة وإدخال المحتوى النهائي', 8, 'فحص الموقع بشكل نهائي والتأكد من عدم وجود أخطاء وإدخال المحتوى النهائي', 'implementer'),
    ('launch', 'الإطلاق', 9, 'نشر النطاق وتفعيله بشكل رسمي', 'implementer'),
    ('closure', 'التسليم والإغلاق', 10, 'إرسال رسالة رسمية للعميل ببيانات الموقع، تسجيل بداية وانتهاء الاشتراك', 'csm')
) AS phase_data(phase_key, phase_name, phase_order, instructions, suggested_role)
WHERE wt.project_type = 'webyan_subscription' AND wt.is_default = true;

-- 8. Add instructions column to project_phases table
ALTER TABLE public.project_phases 
ADD COLUMN IF NOT EXISTS instructions TEXT;

-- 9. Update the trigger function to use workflow templates
CREATE OR REPLACE FUNCTION public.create_default_project_phases()
RETURNS TRIGGER AS $$
DECLARE
  template_id UUID;
BEGIN
  -- Find the workflow template for this project type
  SELECT wt.id INTO template_id 
  FROM workflow_templates wt 
  WHERE wt.project_type = NEW.project_type AND wt.is_default = true
  LIMIT 1;
  
  -- If a template found, create phases from it
  IF template_id IS NOT NULL THEN
    INSERT INTO project_phases (project_id, phase_type, phase_order, instructions)
    SELECT 
      NEW.id, 
      wp.phase_key, 
      wp.phase_order,
      wp.instructions
    FROM workflow_phases wp
    WHERE wp.workflow_id = template_id
    ORDER BY wp.phase_order;
  ELSE
    -- Fallback to legacy 8-phase workflow
    INSERT INTO project_phases (project_id, phase_type, phase_order) VALUES
      (NEW.id, 'requirements', 1),
      (NEW.id, 'setup', 2),
      (NEW.id, 'development', 3),
      (NEW.id, 'content', 4),
      (NEW.id, 'internal_review', 5),
      (NEW.id, 'client_review', 6),
      (NEW.id, 'launch', 7),
      (NEW.id, 'closure', 8);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;