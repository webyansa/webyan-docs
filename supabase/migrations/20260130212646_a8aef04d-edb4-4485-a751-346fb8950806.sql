-- =============================================
-- CRM Phase 1: Database Schema Updates
-- =============================================

-- 1. Create customer_type enum
CREATE TYPE public.customer_type AS ENUM (
  'subscription',      -- عملاء اشتراكات ويبيان
  'custom_platform',   -- عملاء منصات مخصصة
  'services'           -- عملاء خدمات/مشاريع
);

-- 2. Create customer_lifecycle_stage enum
CREATE TYPE public.customer_lifecycle_stage AS ENUM (
  'prospect',          -- عميل محتمل
  'negotiating',       -- قيد التعاقد
  'onboarding',        -- قيد التنفيذ
  'active',            -- نشط
  'suspended',         -- موقوف
  'churned'            -- منتهي الاشتراك
);

-- 3. Add new columns to client_organizations
ALTER TABLE public.client_organizations
ADD COLUMN IF NOT EXISTS customer_type public.customer_type DEFAULT 'subscription',
ADD COLUMN IF NOT EXISTS lifecycle_stage public.customer_lifecycle_stage DEFAULT 'active',
ADD COLUMN IF NOT EXISTS auto_renewal boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS internal_notes text,
ADD COLUMN IF NOT EXISTS assigned_account_manager uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS customer_value decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz;

-- 4. Create client_timeline table for unified activity log
CREATE TABLE public.client_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  reference_type text,
  reference_id uuid,
  performed_by uuid,
  performed_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Create indexes for performance
CREATE INDEX idx_client_timeline_org_id ON public.client_timeline(organization_id);
CREATE INDEX idx_client_timeline_created_at ON public.client_timeline(created_at DESC);
CREATE INDEX idx_client_timeline_event_type ON public.client_timeline(event_type);
CREATE INDEX idx_client_organizations_lifecycle ON public.client_organizations(lifecycle_stage);
CREATE INDEX idx_client_organizations_customer_type ON public.client_organizations(customer_type);

-- 6. Enable RLS on client_timeline
ALTER TABLE public.client_timeline ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for client_timeline
CREATE POLICY "Admins can manage all timeline entries"
ON public.client_timeline
FOR ALL
USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view timeline for their assigned clients"
ON public.client_timeline
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff_members sm
    JOIN public.client_organizations co ON co.assigned_account_manager = sm.id
    WHERE sm.user_id = auth.uid()
    AND co.id = client_timeline.organization_id
    AND sm.is_active = true
  )
);

-- 8. Function to log timeline events automatically
CREATE OR REPLACE FUNCTION public.log_client_timeline_event(
  p_organization_id uuid,
  p_event_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_performed_by uuid DEFAULT NULL,
  p_performed_by_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timeline_id uuid;
BEGIN
  INSERT INTO public.client_timeline (
    organization_id, event_type, title, description,
    metadata, reference_type, reference_id,
    performed_by, performed_by_name
  ) VALUES (
    p_organization_id, p_event_type, p_title, p_description,
    p_metadata, p_reference_type, p_reference_id,
    p_performed_by, p_performed_by_name
  )
  RETURNING id INTO v_timeline_id;
  
  -- Update last_interaction_at on the organization
  UPDATE public.client_organizations
  SET last_interaction_at = now()
  WHERE id = p_organization_id;
  
  RETURN v_timeline_id;
END;
$$;

-- 9. Trigger to log lifecycle stage changes
CREATE OR REPLACE FUNCTION public.log_lifecycle_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.lifecycle_stage IS DISTINCT FROM NEW.lifecycle_stage THEN
    PERFORM public.log_client_timeline_event(
      NEW.id,
      'stage_changed',
      'تغيير مرحلة العميل',
      'تم تغيير مرحلة العميل من ' || OLD.lifecycle_stage::text || ' إلى ' || NEW.lifecycle_stage::text,
      jsonb_build_object('old_stage', OLD.lifecycle_stage, 'new_stage', NEW.lifecycle_stage),
      'organization',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_lifecycle_stage_change
AFTER UPDATE OF lifecycle_stage ON public.client_organizations
FOR EACH ROW
EXECUTE FUNCTION public.log_lifecycle_stage_change();

-- 10. Trigger to log new client creation
CREATE OR REPLACE FUNCTION public.log_client_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_client_timeline_event(
    NEW.id,
    'created',
    'تم إنشاء ملف العميل',
    'تم إنشاء ملف العميل: ' || NEW.name,
    jsonb_build_object('customer_type', NEW.customer_type, 'lifecycle_stage', NEW.lifecycle_stage),
    'organization',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_client_created
AFTER INSERT ON public.client_organizations
FOR EACH ROW
EXECUTE FUNCTION public.log_client_created();