-- إصلاح سياسات RLS لجداول التسعير
-- حذف السياسات القديمة وإنشاء سياسات أكثر دقة

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "pricing_plans_staff_write" ON public.pricing_plans;
DROP POLICY IF EXISTS "pricing_services_staff_write" ON public.pricing_services;
DROP POLICY IF EXISTS "pricing_custom_solutions_staff_write" ON public.pricing_custom_solutions;

-- سياسات الإدخال للموظفين
CREATE POLICY "pricing_plans_insert" ON public.pricing_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "pricing_plans_update" ON public.pricing_plans
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "pricing_plans_delete" ON public.pricing_plans
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- سياسات الخدمات
CREATE POLICY "pricing_services_insert" ON public.pricing_services
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "pricing_services_update" ON public.pricing_services
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "pricing_services_delete" ON public.pricing_services
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- سياسات الحلول المخصصة
CREATE POLICY "pricing_custom_solutions_insert" ON public.pricing_custom_solutions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "pricing_custom_solutions_update" ON public.pricing_custom_solutions
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "pricing_custom_solutions_delete" ON public.pricing_custom_solutions
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));