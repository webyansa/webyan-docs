-- =====================================================
-- نظام تشغيل وتنفيذ المشاريع - Project Operations System
-- =====================================================

-- 1. جدول توثيق العقود (Contract Documentation)
CREATE TABLE public.contract_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.crm_quotes(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing', 'signed')),
  signed_date DATE,
  notes TEXT,
  contract_type TEXT,
  created_by UUID REFERENCES public.staff_members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. جدول مراحل المشروع (Project Phases)
CREATE TABLE public.project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.crm_implementations(id) ON DELETE CASCADE,
  phase_type TEXT NOT NULL CHECK (phase_type IN ('kickoff', 'setup', 'content', 'review', 'delivery', 'closure')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.staff_members(id),
  notes TEXT,
  phase_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. جدول فريق المشروع (Project Team Members)
CREATE TABLE public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.crm_implementations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('implementer', 'csm', 'project_manager')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES public.staff_members(id),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(project_id, staff_id, role)
);

-- 4. جدول السبرنتات (Project Sprints)
CREATE TABLE public.project_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.crm_implementations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  goals TEXT,
  created_by UUID REFERENCES public.staff_members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. جدول مهام السبرنت (Sprint Tasks)
CREATE TABLE public.sprint_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.project_sprints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  assigned_to UUID REFERENCES public.staff_members(id),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. جدول تاريخ مشاريع الموظفين (Staff Project History)
CREATE TABLE public.staff_project_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.crm_implementations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  performance_notes TEXT,
  UNIQUE(staff_id, project_id, role)
);

-- 7. تحديث جدول crm_implementations بالأعمدة الجديدة
ALTER TABLE public.crm_implementations
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.crm_quotes(id),
ADD COLUMN IF NOT EXISTS contract_doc_id UUID REFERENCES public.contract_documentation(id),
ADD COLUMN IF NOT EXISTS received_date DATE,
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS current_phase_id UUID,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.contract_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_project_history ENABLE ROW LEVEL SECURITY;

-- Contract Documentation Policies
CREATE POLICY "Admins can manage contract documentation"
ON public.contract_documentation FOR ALL
USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view contract documentation"
ON public.contract_documentation FOR SELECT
USING (public.is_staff(auth.uid()));

-- Project Phases Policies
CREATE POLICY "Admins can manage project phases"
ON public.project_phases FOR ALL
USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view project phases"
ON public.project_phases FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update assigned project phases"
ON public.project_phases FOR UPDATE
USING (
  public.is_staff(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.project_team_members ptm
    JOIN public.staff_members sm ON sm.id = ptm.staff_id
    WHERE ptm.project_id = project_phases.project_id
    AND sm.user_id = auth.uid()
    AND ptm.is_active = true
  )
);

-- Project Team Members Policies
CREATE POLICY "Admins can manage project team"
ON public.project_team_members FOR ALL
USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view project team"
ON public.project_team_members FOR SELECT
USING (public.is_staff(auth.uid()));

-- Project Sprints Policies
CREATE POLICY "Admins can manage sprints"
ON public.project_sprints FOR ALL
USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view sprints"
ON public.project_sprints FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE POLICY "Team members can manage sprints"
ON public.project_sprints FOR ALL
USING (
  public.is_staff(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.project_team_members ptm
    JOIN public.staff_members sm ON sm.id = ptm.staff_id
    WHERE ptm.project_id = project_sprints.project_id
    AND sm.user_id = auth.uid()
    AND ptm.is_active = true
  )
);

-- Sprint Tasks Policies
CREATE POLICY "Admins can manage sprint tasks"
ON public.sprint_tasks FOR ALL
USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view sprint tasks"
ON public.sprint_tasks FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE POLICY "Team members can manage sprint tasks"
ON public.sprint_tasks FOR ALL
USING (
  public.is_staff(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.project_sprints ps
    JOIN public.project_team_members ptm ON ptm.project_id = ps.project_id
    JOIN public.staff_members sm ON sm.id = ptm.staff_id
    WHERE ps.id = sprint_tasks.sprint_id
    AND sm.user_id = auth.uid()
    AND ptm.is_active = true
  )
);

-- Staff Project History Policies
CREATE POLICY "Admins can manage staff project history"
ON public.staff_project_history FOR ALL
USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view their own project history"
ON public.staff_project_history FOR SELECT
USING (
  public.is_staff(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.staff_members sm
    WHERE sm.id = staff_project_history.staff_id
    AND sm.user_id = auth.uid()
  )
);

-- =====================================================
-- Triggers and Functions
-- =====================================================

-- Function to create default project phases
CREATE OR REPLACE FUNCTION public.create_default_project_phases()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_phases (project_id, phase_type, phase_order)
  VALUES
    (NEW.id, 'kickoff', 1),
    (NEW.id, 'setup', 2),
    (NEW.id, 'content', 3),
    (NEW.id, 'review', 4),
    (NEW.id, 'delivery', 5),
    (NEW.id, 'closure', 6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create phases when project is created
CREATE TRIGGER create_project_phases_trigger
AFTER INSERT ON public.crm_implementations
FOR EACH ROW
EXECUTE FUNCTION public.create_default_project_phases();

-- Function to record staff project history when team member is assigned
CREATE OR REPLACE FUNCTION public.record_staff_project_assignment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_project_history (staff_id, project_id, role, joined_at)
  VALUES (NEW.staff_id, NEW.project_id, NEW.role, NEW.assigned_at)
  ON CONFLICT (staff_id, project_id, role) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for staff assignment history
CREATE TRIGGER record_staff_assignment_trigger
AFTER INSERT ON public.project_team_members
FOR EACH ROW
EXECUTE FUNCTION public.record_staff_project_assignment();

-- Function to mark staff history as completed when project is completed
CREATE OR REPLACE FUNCTION public.complete_staff_project_history()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.staff_project_history
    SET completed_at = now()
    WHERE project_id = NEW.id AND completed_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for completing staff history
CREATE TRIGGER complete_staff_history_trigger
AFTER UPDATE ON public.crm_implementations
FOR EACH ROW
EXECUTE FUNCTION public.complete_staff_project_history();

-- Function to log project creation to client timeline
CREATE OR REPLACE FUNCTION public.log_project_to_timeline()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.client_timeline (
    organization_id, event_type, title, description,
    reference_type, reference_id, performed_by
  )
  VALUES (
    NEW.account_id,
    'project_created',
    'إنشاء مشروع جديد',
    'تم إنشاء مشروع "' || NEW.project_name || '"',
    'project',
    NEW.id,
    NEW.project_manager_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to log project creation
CREATE TRIGGER log_project_creation_trigger
AFTER INSERT ON public.crm_implementations
FOR EACH ROW
EXECUTE FUNCTION public.log_project_to_timeline();

-- Update updated_at triggers
CREATE TRIGGER update_contract_documentation_updated_at
BEFORE UPDATE ON public.contract_documentation
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_sprints_updated_at
BEFORE UPDATE ON public.project_sprints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();