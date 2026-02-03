-- 1. إضافة أعمدة جهة الاتصال المخولة
ALTER TABLE client_organizations ADD COLUMN IF NOT EXISTS primary_contact_name text;
ALTER TABLE client_organizations ADD COLUMN IF NOT EXISTS primary_contact_email text;
ALTER TABLE client_organizations ADD COLUMN IF NOT EXISTS primary_contact_phone text;
ALTER TABLE client_organizations ADD COLUMN IF NOT EXISTS use_org_contact_info boolean DEFAULT false;

-- 2. إعادة تسمية جدول الملاحظات وإضافة عمود النوع
ALTER TABLE subscription_notes RENAME TO customer_notes;

-- 3. إضافة عمود نوع الملاحظة
ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS note_type text DEFAULT 'subscription';

-- 4. إنشاء index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_customer_notes_type ON customer_notes(organization_id, note_type);

-- 5. تحديث سياسات RLS للجدول المُعاد تسميته
DROP POLICY IF EXISTS "Staff can view subscription notes" ON customer_notes;
DROP POLICY IF EXISTS "Staff can insert subscription notes" ON customer_notes;
DROP POLICY IF EXISTS "Staff can delete subscription notes" ON customer_notes;

CREATE POLICY "Staff can view customer notes" 
ON customer_notes FOR SELECT 
USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Staff can insert customer notes" 
ON customer_notes FOR INSERT 
WITH CHECK (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Staff can delete customer notes" 
ON customer_notes FOR DELETE 
USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));