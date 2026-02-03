-- 1. إضافة أعمدة جديدة لجدول client_organizations
ALTER TABLE public.client_organizations 
ADD COLUMN IF NOT EXISTS subscription_value numeric,
ADD COLUMN IF NOT EXISTS domain_expiration_date date;

-- 2. إنشاء جدول ملاحظات الاشتراك
CREATE TABLE IF NOT EXISTS public.subscription_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid REFERENCES public.staff_members(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. تفعيل RLS على جدول الملاحظات
ALTER TABLE public.subscription_notes ENABLE ROW LEVEL SECURITY;

-- 4. سياسات RLS للملاحظات
CREATE POLICY "Staff can view subscription notes"
ON public.subscription_notes
FOR SELECT
USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Staff can insert subscription notes"
ON public.subscription_notes
FOR INSERT
WITH CHECK (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Staff can delete subscription notes"
ON public.subscription_notes
FOR DELETE
USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

-- 5. إنشاء Trigger لربط إغلاق المشروع ببدء الاشتراك
CREATE OR REPLACE FUNCTION public.activate_subscription_on_project_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- عند تغيير حالة المشروع إلى completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.client_organizations
    SET 
      subscription_start_date = COALESCE(subscription_start_date, now()),
      subscription_status = 'active',
      updated_at = now()
    WHERE id = NEW.account_id;
    
    -- تسجيل في timeline
    PERFORM public.log_client_timeline_event(
      NEW.account_id,
      'subscription_activated',
      'تفعيل الاشتراك',
      'تم تفعيل اشتراك العميل تلقائياً بعد اكتمال المشروع "' || NEW.project_name || '"',
      jsonb_build_object('project_id', NEW.id, 'project_name', NEW.project_name),
      'implementation',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 6. ربط الـ Trigger بجدول crm_implementations
DROP TRIGGER IF EXISTS trigger_activate_subscription_on_completion ON public.crm_implementations;
CREATE TRIGGER trigger_activate_subscription_on_completion
AFTER UPDATE ON public.crm_implementations
FOR EACH ROW
EXECUTE FUNCTION public.activate_subscription_on_project_completion();

-- 7. إنشاء index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_subscription_notes_organization 
ON public.subscription_notes(organization_id);

CREATE INDEX IF NOT EXISTS idx_subscription_notes_created_at 
ON public.subscription_notes(created_at DESC);