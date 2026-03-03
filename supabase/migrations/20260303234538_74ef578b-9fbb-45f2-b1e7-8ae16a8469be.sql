
-- Drop and recreate get_staff_permissions with new return type
DROP FUNCTION IF EXISTS public.get_staff_permissions(uuid);

CREATE FUNCTION public.get_staff_permissions(_user_id uuid)
 RETURNS TABLE(staff_id uuid, can_reply_tickets boolean, can_manage_content boolean, can_attend_meetings boolean, can_manage_marketing boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
    SELECT id, can_reply_tickets, can_manage_content, can_attend_meetings, can_manage_marketing
    FROM public.staff_members
    WHERE user_id = _user_id
    AND is_active = true
    LIMIT 1
$$;

-- RLS policies for marketing staff
CREATE POLICY "Marketing staff can view assigned content"
  ON public.content_calendar FOR SELECT TO authenticated
  USING (
    designer_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid())
    OR publisher_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid())
    OR public.is_admin_or_editor(auth.uid())
  );

CREATE POLICY "Marketing staff can update assigned content"
  ON public.content_calendar FOR UPDATE TO authenticated
  USING (
    designer_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid())
    OR publisher_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid())
    OR public.is_admin_or_editor(auth.uid())
  );
