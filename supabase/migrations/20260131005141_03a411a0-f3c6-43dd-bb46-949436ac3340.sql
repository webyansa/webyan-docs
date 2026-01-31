-- إنشاء جدول أنشطة الفرص
CREATE TABLE IF NOT EXISTS public.crm_opportunity_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  
  -- نوع النشاط: note, meeting_scheduled, meeting_report, quote_sent, stage_change, rejection, call, email, created
  activity_type text NOT NULL,
  
  -- تفاصيل النشاط
  title text NOT NULL,
  description text,
  
  -- بيانات إضافية حسب نوع النشاط (JSON)
  metadata jsonb DEFAULT '{}',
  
  -- من قام بالنشاط
  performed_by uuid REFERENCES staff_members(id),
  performed_by_name text,
  
  -- الوقت
  created_at timestamptz DEFAULT now()
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_opportunity_activities_opp ON crm_opportunity_activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_activities_type ON crm_opportunity_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_opportunity_activities_created ON crm_opportunity_activities(created_at DESC);

-- إضافة حقل document_url لجدول crm_quotes إذا لم يكن موجوداً
ALTER TABLE crm_quotes ADD COLUMN IF NOT EXISTS document_url text;

-- تفعيل RLS
ALTER TABLE crm_opportunity_activities ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للأنشطة
CREATE POLICY "Staff can view opportunity activities" ON crm_opportunity_activities
FOR SELECT USING (
  EXISTS (SELECT 1 FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Staff can insert opportunity activities" ON crm_opportunity_activities
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Staff can update opportunity activities" ON crm_opportunity_activities
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Admin can delete opportunity activities" ON crm_opportunity_activities
FOR DELETE USING (public.is_admin(auth.uid()));