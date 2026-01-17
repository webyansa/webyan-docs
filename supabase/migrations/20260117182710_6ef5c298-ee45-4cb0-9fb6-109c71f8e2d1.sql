-- Create comprehensive user type detection function
CREATE OR REPLACE FUNCTION public.get_user_type(_user_id uuid)
RETURNS TABLE(
  user_type text,
  role_name text,
  staff_id uuid,
  client_id uuid,
  organization_id uuid,
  display_name text,
  can_reply_tickets boolean,
  can_manage_content boolean,
  can_attend_meetings boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_staff_id uuid;
  v_client_id uuid;
  v_org_id uuid;
  v_name text;
  v_can_reply boolean;
  v_can_manage boolean;
  v_can_attend boolean;
BEGIN
  -- Check user roles table first (admin, editor, support_agent, viewer)
  SELECT ur.role::text INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  ORDER BY 
    CASE ur.role::text
      WHEN 'admin' THEN 1 
      WHEN 'editor' THEN 2 
      WHEN 'support_agent' THEN 3
      ELSE 4 
    END
  LIMIT 1;
  
  -- Check if user is staff member
  SELECT sm.id, sm.full_name, sm.can_reply_tickets, sm.can_manage_content, sm.can_attend_meetings
  INTO v_staff_id, v_name, v_can_reply, v_can_manage, v_can_attend
  FROM public.staff_members sm
  WHERE sm.user_id = _user_id AND sm.is_active = true
  LIMIT 1;
  
  -- If not staff, check if user is client
  IF v_staff_id IS NULL THEN
    SELECT ca.id, ca.organization_id, ca.full_name
    INTO v_client_id, v_org_id, v_name
    FROM public.client_accounts ca
    WHERE ca.user_id = _user_id AND ca.is_active = true
    LIMIT 1;
  END IF;
  
  -- Determine user type based on priority: admin > editor > support_agent > staff > client > viewer
  IF v_role = 'admin' THEN
    RETURN QUERY SELECT 
      'admin'::text, v_role, v_staff_id, v_client_id, v_org_id, 
      COALESCE(v_name, '')::text, COALESCE(v_can_reply, false), COALESCE(v_can_manage, false), COALESCE(v_can_attend, false);
  ELSIF v_role = 'editor' THEN
    RETURN QUERY SELECT 
      'editor'::text, v_role, v_staff_id, v_client_id, v_org_id, 
      COALESCE(v_name, '')::text, COALESCE(v_can_reply, false), COALESCE(v_can_manage, false), COALESCE(v_can_attend, false);
  ELSIF v_role = 'support_agent' OR v_staff_id IS NOT NULL THEN
    RETURN QUERY SELECT 
      'staff'::text, COALESCE(v_role, 'staff')::text, v_staff_id, v_client_id, v_org_id, 
      COALESCE(v_name, '')::text, COALESCE(v_can_reply, false), COALESCE(v_can_manage, false), COALESCE(v_can_attend, false);
  ELSIF v_client_id IS NOT NULL THEN
    RETURN QUERY SELECT 
      'client'::text, 'client'::text, v_staff_id, v_client_id, v_org_id, 
      COALESCE(v_name, '')::text, false, false, false;
  ELSE
    RETURN QUERY SELECT 
      'visitor'::text, COALESCE(v_role, 'viewer')::text, NULL::uuid, NULL::uuid, NULL::uuid, 
      ''::text, false, false, false;
  END IF;
END;
$$;

-- Create a helper function to check if user is a support agent
CREATE OR REPLACE FUNCTION public.is_support_agent(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'support_agent'
  )
$$;